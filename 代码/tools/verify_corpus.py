"""Read-only corpus verification for the thesis data chapter.

python 代码/tools/verify_corpus.py
Checks stored PDF pages against review hashes, regenerates PDF chunks from stored
page text, compares a fresh pypdf extraction, re-derives every HTML chunk from its archived and cleaned
files, and checks the database and vector index. Writes data/reports/corpus_verification.json.
Never modifies the database and never calls a model API.
"""
import hashlib
import json
import re
import sqlite3
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '代码' / 'apple_rag_lab'))
import server  # noqa: E402
from pdf_ingest import page_passages  # noqa: E402
from pypdf import PdfReader  # noqa: E402
from web_ingest import chunks_for, load_cleaned  # noqa: E402


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def main():
    db_hash_before = sha(server.DB_FILE)
    with sqlite3.connect(server.DB_FILE) as c:
        integrity = c.execute('PRAGMA integrity_check').fetchone()[0]
        docs = {sid: (fn, json.loads(m)) for sid, fn, m in c.execute('SELECT source_id, filename, metadata FROM pdf_documents')}
        pages = {(sid, n): t for sid, n, t in c.execute('SELECT source_id, page_number, text FROM pdf_pages')}
        dense = c.execute("SELECT value FROM state WHERE key='dense'").fetchone()
    chunks = server.corpus()
    stored = {x['id']: x for x in chunks}
    pdf_stored = {k: v for k, v in stored.items() if v['metadata'].get('source_type') == 'pdf'}
    web_stored = {k: v for k, v in stored.items() if v['metadata'].get('source_type') != 'pdf'}

    # PDFs: file hashes; reviewed page text vs review hashes; chunks regenerated from stored page text;
    # and a fresh re-extraction with the installed pypdf, classified by type of difference.
    pdf_hash_ok = sum(sha(server.PDF_ROOT / fn) == m['sha256'] for fn, m in docs.values())
    reviews = server.read_json(server.DATA / 'registers' / 'pdf_review_manifest.json', {}).get('documents', {})
    norm = lambda t: re.sub(r'[\s\-‐]', '', t)
    exact = hyphen_space_only = other_diff = reviewed_pages = reviewed_ok = 0
    regen_pdf = {}
    for sid, (fn, meta) in docs.items():
        review = reviews[meta['sha256']]
        fresh = [p.extract_text() or '' for p in PdfReader(server.PDF_ROOT / fn).pages]
        for n, text in enumerate(fresh, 1):
            stored_text = pages[(sid, n)]
            if text == stored_text:
                exact += 1
            elif norm(text) == norm(stored_text):
                hyphen_space_only += 1
            else:
                other_diff += 1
        for page, ranges in review['qa_ranges'].items():
            stored_text = pages[(sid, int(page))]
            reviewed_pages += 1
            reviewed_ok += hashlib.sha256(stored_text.encode()).hexdigest() == review['page_text_sha256'][page]
            index = 0
            for part in ranges:
                for passage in page_passages(stored_text[part['start']:part['end']]):
                    index += 1
                    regen_pdf[f'{sid}:p{page}:c{index}'] = passage
    pdf_chunk_ok = sum(regen_pdf.get(k) == v['text'] for k, v in pdf_stored.items())

    # HTML: archived/cleaned hashes and chunk regeneration.
    reg = server.read_json(server.SOURCE_ROOT / 'registers' / 'source_register.json', [])
    reg = reg if isinstance(reg, list) else reg['sources']
    web_sources = [r for r in reg if (r.get('local_file') or '').startswith('web_raw/')]
    web_ok, regen_web = 0, {}
    for r in web_sources:
        article = load_cleaned(r, server.SOURCE_ROOT)  # raises on any hash mismatch
        web_ok += 1
        regen_web.update({x['id']: x['text'] for x in chunks_for(r, article)})
    web_chunk_ok = sum(regen_web.get(k) == v['text'] for k, v in web_stored.items())

    used = {x['metadata'].get('source_id') for x in chunks}
    known = set(docs) | {r['source_id'] for r in web_sources}
    bad_chars = sum(bool(re.search(r'[\x00-\x08\x0b\x0c\x0e-\x1f�]', x['text'])) for x in chunks)
    norm = Counter(re.sub(r'\s+', ' ', x['text'].strip().lower()) for x in chunks)
    state = json.loads(dense[0]) if dense else {}
    result = {
        'checked_at_utc': datetime.now(timezone.utc).isoformat(),
        'sqlite_integrity': integrity,
        'unknown_source_ids': sorted(used - known),
        'pdf_documents': len(docs), 'pdf_file_hash_matches': pdf_hash_ok,
        'pdf_pages_stored': len(pages),
        'pdf_reextraction_exact': exact, 'pdf_reextraction_hyphen_or_whitespace_only': hyphen_space_only, 'pdf_reextraction_other_differences': other_diff,
        'reviewed_pages': reviewed_pages, 'reviewed_pages_matching_review_hash': reviewed_ok,
        'pdf_chunks': len(pdf_stored), 'pdf_chunks_regenerated_matching': pdf_chunk_ok,
        'pdf_pages_contributing_chunks': len({(v['metadata']['source_id'], v['metadata'].get('page')) for v in pdf_stored.values()}),
        'html_sources': len(web_sources), 'html_sources_hash_checks_passed': web_ok,
        'html_chunks': len(web_stored), 'html_chunks_regenerated_matching': web_chunk_ok,
        'total_chunks': len(chunks), 'chunks_with_control_or_replacement_chars': bad_chars,
        'distinct_normalised_chunk_texts': len(norm), 'repeated_text_groups': sum(n > 1 for n in norm.values()),
        'dense_index': {'vectors': len(state.get('vectors', [])), 'dimension': state.get('dimension'), 'model': (state.get('profile') or {}).get('model'),
                        'matches_corpus': state.get('corpus_hash') == server.corpus_hash(chunks)},
        'corpus_hash': server.corpus_hash(chunks),
        'database_sha256': db_hash_before,
        'database_unchanged_by_check': sha(server.DB_FILE) == db_hash_before,
    }
    record = server.freeze_record()
    if record:
        from freeze_corpus import file_hashes
        current = file_hashes()
        result['freeze'] = {
            'version': record['version'], 'frozen_at': record['frozen_at'],
            'corpus_hash_matches': record['corpus_hash'] == result['corpus_hash'],
            'database_sha256_matches': record['database_sha256'] == db_hash_before,
            'frozen_copy_sha256_matches': sha(server.DATA / record['frozen_copy']) == record['database_sha256'],
            'changed_files': sorted(k for k in record['files'] if current.get(k) != record['files'][k]),
            'added_files': sorted(set(current) - set(record['files'])),
        }
    server.write_json(server.DATA / 'reports' / 'corpus_verification.json', result)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
