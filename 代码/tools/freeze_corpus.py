"""Freeze the corpus for the formal experiments.

python 代码/tools/freeze_corpus.py --version corpus-v1-20261014
Writes data/registers/corpus_freeze.json (the freeze switch read by the app) and a
read-only copy of the database. While the manifest exists the app refuses to import,
replace the corpus, change the embedding configuration or rebuild the index.
To unfreeze, rename or remove data/registers/corpus_freeze.json and record why.
"""
import argparse
import hashlib
import json
import os
import shutil
import stat
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '代码' / 'apple_rag_lab'))
import server  # noqa: E402

FROZEN_FOLDERS = ('pdf', 'web_raw', 'web_cleaned', 'registers')


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def file_hashes():
    manifest = server.DATA / 'registers' / 'corpus_freeze.json'
    return {str(p.relative_to(server.DATA)).replace('\\', '/'): sha(p)
            for folder in FROZEN_FOLDERS for p in sorted((server.DATA / folder).iterdir())
            if p.is_file() and p != manifest}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--version', required=True)
    args = parser.parse_args()
    target = server.DATA / 'registers' / 'corpus_freeze.json'
    if target.exists():
        raise SystemExit('Corpus is already frozen: ' + str(target))
    chunks = server.corpus()
    state = server.dense_state()
    profile = server.config()['embedding']
    if not state or state['corpus_hash'] != server.corpus_hash(chunks) or state['embedding_fingerprint'] != server.digest(profile):
        raise SystemExit('Dense index is missing or stale; rebuild it before freezing.')
    stamp = datetime.now(timezone.utc)
    copy = server.DB_FILE.with_name(f'corpus_frozen_{args.version}.sqlite3')
    shutil.copy2(server.DB_FILE, copy)
    os.chmod(copy, stat.S_IREAD)  # read-only reference copy
    record = {
        'version': args.version,
        'frozen_at': stamp.isoformat(),
        'corpus_hash': server.corpus_hash(chunks),
        'database': 'chunks/corpus.sqlite3',
        'database_sha256': sha(server.DB_FILE),
        'frozen_copy': f'chunks/{copy.name}',
        'counts': {
            'chunks': len(chunks),
            'pdf_chunks': sum(x['metadata'].get('source_type') == 'pdf' for x in chunks),
            'html_chunks': sum(x['metadata'].get('source_type') != 'pdf' for x in chunks),
            'sources': len({x['metadata'].get('source_id') for x in chunks}),
        },
        'dense_index': {
            'adapter': profile.get('adapter'), 'model': profile.get('model'), 'query_prefix': profile.get('query_prefix', ''),
            'dimension': state.get('dimension'), 'vectors': len(state['vectors']),
            'embedding_fingerprint': state['embedding_fingerprint'], 'built_at': state['date_utc'],
        },
        'files': file_hashes(),
        'unfreeze': 'Rename or remove this file and record the reason; any corpus change requires re-verification and a new version.',
    }
    server.write_json(target, record)
    print(json.dumps({k: v for k, v in record.items() if k != 'files'}, ensure_ascii=False, indent=2))
    print(f"{len(record['files'])} files hashed")


if __name__ == '__main__':
    main()
