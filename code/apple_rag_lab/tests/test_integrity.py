"""Integrity checks against the real frozen corpus and saved experiment logs (read-only)."""
import json
import re
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server  # noqa: E402

LOGS = server.DATA / 'logs'
REQUIRED = ('source_id', 'title', 'url', 'region')


@unittest.skipUnless(server.DB_FILE.exists(), 'corpus database not present')
class CorpusIntegrityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.chunks = server.corpus()
        cls.by_id = {x['id']: x for x in cls.chunks}

    def test_chunk_ids_unique_and_count(self):
        self.assertEqual(len(self.by_id), len(self.chunks))
        self.assertEqual(len(self.chunks), 2044)

    def test_every_chunk_maps_to_a_source_with_locator(self):
        for x in self.chunks:
            m = x['metadata']
            for field in REQUIRED:
                self.assertTrue(m.get(field), f'{x["id"]} missing {field}')
            self.assertEqual(x['id'].split(':')[0], m['source_id'])
            self.assertTrue(m.get('section') or m.get('page') or m.get('page_number') or ':p' in x['id'], f'{x["id"]} has no locator')

    def test_frozen_corpus_hash(self):
        freeze = server.freeze_record()
        if freeze:
            self.assertEqual(server.corpus_hash(self.chunks), freeze['corpus_hash'])


@unittest.skipUnless((LOGS / 'test_final_results.jsonl').exists(), 'historical test log not present')
class CitationMappingTests(unittest.TestCase):
    def test_citations_point_to_supplied_evidence_that_exists_in_corpus(self):
        ids = {x['id'] for x in server.corpus()}
        checked = 0
        for line in (LOGS / 'test_final_results.jsonl').read_text(encoding='utf-8').splitlines():
            r = json.loads(line)
            if r.get('status') != 'success' or r['mode'] == 'non_rag':
                continue
            for n in (int(v) for v in re.findall(r'\[(\d+)\]', r['answer'])):
                self.assertTrue(1 <= n <= len(r['evidence']), f"{r['task_id']} cites [{n}] of {len(r['evidence'])}")
                self.assertIn(r['evidence'][n - 1]['id'], ids)
                checked += 1
        self.assertGreater(checked, 0)


if __name__ == '__main__':
    unittest.main()
