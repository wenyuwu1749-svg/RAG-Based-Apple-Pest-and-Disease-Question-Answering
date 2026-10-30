import hashlib
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import server
from web_ingest import extract, chunks_for, load_cleaned

class WebTests(unittest.TestCase):
    def test_multilevel_headers_rowspan_and_superscript_are_unambiguous(self):
        article=extract('<main><h2>Efficacy</h2><table><tr><th rowspan="2">Product</th><th colspan="2">Scab</th></tr><tr><th>Protectant</th><th>Eradicant</th></tr><tr><td>A</td><td>5<sup>2</sup></td><td>3</td></tr></table></main>')
        row=article['blocks'][0]
        self.assertEqual(row['table_headers'],['Product','Scab / Protectant','Scab / Eradicant'])
        self.assertTrue(row['table_structure_verified'])
        self.assertIn('Scab / Protectant: 5 [superscript: 2]',row['text'])
        self.assertIn('Scab / Eradicant: 3',row['text'])

    def test_article_selection_excludes_author_bio_and_retains_disease_comments(self):
        markup='<body><nav>Navigation links outside article</nav><main><div class="product attribute overview">Apple scab affects apple leaves and developing fruit.</div><div class="product attribute description"><h2>Comments on the Disease</h2><p>The fungus survives in dead leaves during winter and infects young leaves.</p></div><div class="author">Author unrelated laboratory interests and biography.</div></main></body>'
        a=extract(markup);text=' '.join(b['text'] for b in a['blocks'])
        self.assertIn('dead leaves',text);self.assertIn('apple leaves',text)
        self.assertNotIn('biography',text);self.assertNotIn('Navigation',text)

    def test_english_short_identification_facts_are_not_discarded(self):
        a=extract('<body><div class="c-t11-banner__subtitle-1">Eucolaspis brunnea (Fabricius)</div><div class="mce-content-body"><dl><dt>Order</dt><dd>Coleoptera</dd></dl><h2>Size range</h2><p>Small beetle, 5 mm long</p><p v-if="teReo">Maori duplicate description should be excluded from the English corpus.</p><p>Adults damage developing fruit and eat holes in leaves, especially at night.</p></div></body>')
        source={'source_id':'S202','title':'Bronze beetle','url':'https://example.org','web_review_id':'review'}
        text=' '.join(c['text'] for c in chunks_for(source,a))
        self.assertIn('5 mm',text);self.assertIn('Order: Coleoptera',text);self.assertIn('Eucolaspis',text);self.assertNotIn('Maori duplicate',text)

    def test_table_row_kept_whole_or_omitted_as_a_unit(self):
        text='Table 1; headers: Product | Scab. Product: A | Scab: 5. Legend and source notes: Rating: 5 = excellent. Applies to California only.'
        row={'id':'row','text':text,'metadata':{'title':'Apple scab efficacy','url':'https://example.org','section':'Efficacy','block_kind':'table_row'}}
        other={'id':'other','text':'Apple scab overwinters in fallen leaves.','metadata':{'title':'Apple scab','url':'https://example.org/2','section':'Cycle'}}
        self.assertEqual(server.efficient_context('apple scab efficacy',[row,other],5000)[0]['text'],text)
        self.assertEqual([x['id'] for x in server.efficient_context('apple scab efficacy',[other,row],20)],['other'])

    def test_reviewed_import_preserves_pdf_and_refuses_excluded_or_changed_files(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent) as folder:
            root=Path(folder);(root/'raw').mkdir();(root/'cleaned').mkdir()
            raw=root/'raw/S001.html';raw.write_text('<main><p>Apple scab causes dark spots on leaves and fruit.</p></main>',encoding='utf-8')
            a=extract(raw.read_text());a.update(source_id='S001',original_sha256=hashlib.sha256(raw.read_bytes()).hexdigest())
            (root/'cleaned/S001.json').write_text(json.dumps(a),encoding='utf-8')
            source={'source_id':'S001','title':'Apple scab','url':'https://example.org','local_file':'raw/S001.html','cleaned_file':'cleaned/S001.json','sha256':a['original_sha256'],'role':'core','download_status':'downloaded_cleaned_reviewed','web_review_status':'approved','qa_enabled':True}
            excluded=dict(source,source_id='S030',web_review_status='excluded',qa_enabled=False)
            pending=dict(source,source_id='S999');pending.pop('web_review_status');pending.pop('qa_enabled')
            (root/'registers').mkdir();(root/'registers/source_register.json').write_text(json.dumps([source,excluded,pending]),encoding='utf-8')
            pdf={'id':'PDF-one','text':'Reviewed apple PDF content.','metadata':{'source_type':'pdf','title':'PDF','qa_enabled':True,'scope_note':'PDF scope preserved'}}
            with patch.object(server,'DB_FILE',root/'corpus.sqlite3'),patch.object(server,'SOURCE_ROOT',root),patch.object(server,'DATA',root):
                server.replace_corpus([pdf]);first=server.import_sources(['S001']);self.assertEqual(first['preserved_pdf_chunks'],1)
                self.assertIn(pdf,server.corpus());before=server.corpus()
                self.assertTrue(any(c['metadata'].get('source_type')=='html' for c in before))
                with self.assertRaisesRegex(ValueError,'did not pass'):server.import_sources(['S030'])
                with self.assertRaisesRegex(ValueError,'did not pass|Unknown source'):server.import_sources(['S999'])
                self.assertEqual(before,server.corpus())
                raw.write_text('Changed original',encoding='utf-8')
                with self.assertRaisesRegex(ValueError,'archived web page has changed'):server.import_sources(['S001'])
                self.assertEqual(before,server.corpus())
                (root/'cleaned/S001.json').write_text(json.dumps(dict(a,blocks=[])),encoding='utf-8')
                with self.assertRaises(ValueError):load_cleaned(source,root)

if __name__=='__main__':unittest.main()
