import json
import hashlib
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import urlopen

from pypdf import PdfWriter
from pypdf.generic import DictionaryObject, NameObject, DecodedStreamObject

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server as lab
from pdf_ingest import extract_folder, page_passages, topics_for


def write_pdf(path, title, text):
    writer = PdfWriter()
    page = writer.add_blank_page(width=600, height=800)
    font = DictionaryObject({NameObject('/Type'): NameObject('/Font'), NameObject('/Subtype'): NameObject('/Type1'), NameObject('/BaseFont'): NameObject('/Helvetica')})
    page[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/F1'): writer._add_object(font)})})
    stream = DecodedStreamObject()
    stream.set_data(('BT /F1 12 Tf 30 750 Td (' + text.replace('(', '\\(').replace(')', '\\)') + ') Tj ET').encode('ascii'))
    page[NameObject('/Contents')] = writer._add_object(stream)
    writer.add_metadata({'/Title': title})
    with path.open('wb') as output:
        writer.write(output)


class PDFTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent)
        self.root = Path(self.temp.name)
        self.folder = self.root / 'pdfs'
        self.folder.mkdir()
        self.data = self.root / 'data'
        self.data.mkdir()
        self.patches = [patch.object(lab, 'DATA', self.data), patch.object(lab, 'DB_FILE', self.data / 'corpus.sqlite3'), patch.object(lab, 'PDF_ROOT', self.folder)]
        for p in self.patches:
            p.start()
        lab.replace_corpus([{'id': 'web', 'text': 'Verified web passage about apple scab.', 'metadata': {'title': 'Apple Scab', 'url': 'https://example.org'}}])
        write_pdf(self.folder / 'apple.pdf', 'Apple Scab Management Guide', 'Apple scab causes olive spots on leaves. Apple orchard management includes monitoring for apple scab symptoms.')
        write_pdf(self.folder / 'snail.pdf', 'Biological Control of Golden Apple Snail', 'Golden apple snail Pomacea causes rice crop damage. This is a snail study, not an apple tree disease guide.')

    def tearDown(self):
        for p in reversed(self.patches):
            p.stop()
        self.temp.cleanup()

    def test_import_is_page_aware_idempotent_and_excludes_unrelated_docs(self):
        first = lab.import_local_pdfs()
        self.assertEqual(first['documents'], 2)
        self.assertEqual(first['qa_documents'], 1)
        self.assertEqual(first['pages'], 2)
        self.assertIn('web', {x['id'] for x in lab.corpus()})
        enabled = [x for x in lab.corpus() if x['metadata'].get('source_type') == 'pdf']
        self.assertEqual(enabled[0]['metadata']['page'], 1)
        self.assertIn('Apple scab causes olive spots', enabled[0]['text'])
        self.assertFalse(any('Golden apple snail' in x['text'] for x in lab.corpus()))
        self.assertTrue(any('Golden apple snail' in x['text'] for x in lab.corpus(include_disabled=True)))
        self.assertEqual(len(lab.pdf_documents()), 2)
        second = lab.import_local_pdfs()
        self.assertEqual(first['corpus_hash'], second['corpus_hash'])
        self.assertEqual(first['working_chunks'], second['working_chunks'])
        self.assertTrue(Path(first['backup_file']).exists())

    def test_local_pdf_endpoint_serves_known_source_and_rejects_traversal(self):
        lab.import_local_pdfs()
        http = lab.ThreadingHTTPServer(('127.0.0.1', 0), lab.Handler)
        worker = threading.Thread(target=http.serve_forever, daemon=True)
        worker.start()
        base = f'http://127.0.0.1:{http.server_port}'
        try:
            source = lab.pdf_documents()[0]
            with urlopen(base + source['local_url']) as response:
                self.assertEqual(response.headers.get_content_type(), 'application/pdf')
                self.assertTrue(response.read().startswith(b'%PDF'))
            with self.assertRaises(HTTPError) as error:
                urlopen(base + '/api/pdf?source_id=../../server.py')
            self.assertEqual(error.exception.code, 404)
            error.exception.close()
        finally:
            http.shutdown()
            http.server_close()
            worker.join()

    def test_false_codling_moth_remains_distinct_and_bibliography_not_chunked(self):
        self.assertEqual(topics_for('False codling moth Thaumatotibia leucotreta.'), ['False Codling Moth'])
        passages = page_passages('Apple scab symptoms include olive spots on leaves in an apple orchard.\n\nReferences\nApple scab treatment author citation list.')
        self.assertTrue(passages)
        self.assertNotIn('author citation', ' '.join(passages))

    def test_incremental_append_preserves_old_records_and_is_idempotent(self):
        lab.import_local_pdfs()
        with lab.db() as connection:
            before = {table: list(connection.execute('SELECT * FROM ' + table + ' ORDER BY 1'))
                      for table in ('chunks', 'pdf_documents', 'pdf_pages')}
            connection.execute("INSERT INTO state VALUES ('dense', 'old index')")
        write_pdf(self.folder / 'new.pdf', 'Apple Maggot Biology', 'Apple maggot larvae feed inside apples and leave brown trails. Adult apple maggot monitoring uses orchard traps.')
        result = lab.import_local_pdfs(incremental=True)
        self.assertEqual(result['added_documents'], 1)
        self.assertEqual(result['documents'], 3)
        with lab.db() as connection:
            for table, rows in before.items():
                after = list(connection.execute('SELECT * FROM ' + table))
                self.assertTrue(all(row in after for row in rows))
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM state').fetchone()[0], 0)
        self.assertEqual(lab.import_local_pdfs(incremental=True)['added_documents'], 0)
        self.assertEqual(len(lab.pdf_documents()), 3)

    def test_review_ranges_exclude_unapproved_text_and_hash_mismatch_aborts(self):
        from pypdf import PdfReader
        path = self.folder / 'apple.pdf'
        write_pdf(path, 'Apple Scab Management Guide', 'Apple scab causes olive-colored spots on leaves and lesions on young apple fruit. Apple orchard management includes monitoring.')
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        text = PdfReader(path).pages[0].extract_text()
        cutoff = text.index(' Apple orchard')
        review = dict(decision='approved_scoped', title='Apple Scab Reviewed', organization='Test extension',
                      region='Test region', publication_or_update_date=None, date_type='not_established',
                      date_evidence='Not established', study_years=[], role='support', scope_note='Reviewed scope only.',
                      topics=['Apple Scab'], evidence_type='technical_guidance', not_current_pesticide_guidance=True,
                      url='https://example.org/scab', original_source_ids=['S-test'], review_id='test-v1',
                      qa_ranges={'1':[{'start':0,'end':cutoff,'section':'Symptoms'}]},
                      page_text_sha256={'1':hashlib.sha256(text.encode()).hexdigest()})
        result = extract_folder(self.folder, reviews={digest:review}, paths=[path])
        self.assertEqual(result['pages'][0][2], text)
        self.assertNotIn('orchard management', ' '.join(x['text'] for x in result['chunks']))
        self.assertEqual(result['chunks'][0]['metadata']['section'], 'Symptoms')
        with lab.db() as connection:
            before = list(connection.execute('SELECT * FROM chunks'))
        review['page_text_sha256']['1'] = 'wrong-extraction-hash'
        lab.write_json(self.data / 'registers' / 'pdf_review_manifest.json', {'documents':{digest:review}})
        with self.assertRaisesRegex(ValueError, '数据库未修改'):
            lab.import_local_pdfs(incremental=True)
        with lab.db() as connection:
            self.assertEqual(before, list(connection.execute('SELECT * FROM chunks')))
            self.assertEqual(connection.execute('SELECT COUNT(*) FROM pdf_documents').fetchone()[0], 0)

    def test_selected_pdf_paths_cannot_escape_root(self):
        with self.assertRaisesRegex(ValueError, '路径'):
            extract_folder(self.folder, paths=[self.root / 'outside.pdf'])
