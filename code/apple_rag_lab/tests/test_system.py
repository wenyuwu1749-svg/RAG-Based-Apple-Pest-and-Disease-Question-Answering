import json
import sys
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from urllib.request import Request, urlopen

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server as lab


class FakeProvider(BaseHTTPRequestHandler):
    calls = []

    def log_message(self, *args):
        pass

    def do_POST(self):
        if self.headers.get('User-Agent') != 'Apple-RAG-Lab/1.0':
            self.send_response(403)
            self.end_headers()
            return
        body = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        self.calls.append((self.path, body, self.headers.get('Authorization')))
        if self.path.endswith('/embeddings'):
            result = {'data': [{'index': i, 'embedding': [1.0, float('scab' in text.lower())]} for i, text in reversed(list(enumerate(body['input'])))], 'usage': {'prompt_tokens': 7, 'total_tokens': 7}}
        elif body['model'] == 'fail-model':
            self.send_response(401)
            self.end_headers()
            self.wfile.write(b'private-key-do-not-log')
            return
        else:
            result = {'id': 'fake-response', 'model': body['model'], 'choices': [{'message': {'content': 'Test answer [1].'}, 'finish_reason': 'stop'}], 'usage': {'prompt_tokens': 31, 'completion_tokens': 8, 'total_tokens': 39}}
        data = json.dumps(result).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def chunk(cid, text):
    return {'id': cid, 'text': text, 'metadata': {'title': 'Apple Scab', 'topic': 'Apple Scab', 'url': 'https://example.org/scab', 'organization': 'Test university', 'section': 'Symptoms', 'region': 'Test region'}}


class SystemTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.provider = ThreadingHTTPServer(('127.0.0.1', 0), FakeProvider)
        cls.thread = threading.Thread(target=cls.provider.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f'http://127.0.0.1:{cls.provider.server_port}/v1'

    @classmethod
    def tearDownClass(cls):
        cls.provider.shutdown()
        cls.provider.server_close()
        cls.thread.join()

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=Path(__file__).resolve().parent)
        self.data_patch = patch.object(lab, 'DATA', Path(self.temp.name))
        self.data_patch.start()
        self.db_patch = patch.object(lab, 'DB_FILE', Path(self.temp.name) / 'corpus.sqlite3')
        self.db_patch.start()
        FakeProvider.calls.clear()
        lab.SECRETS.clear()
        self.chunks = [chunk('one', 'Apple scab causes olive green spots on leaves. Wet weather promotes apple scab infection. ' + 'Orchard sanitation helps reduce infection. '*12), chunk('two', 'Apple scab causes olive green spots on leaves.')]
        lab.replace_corpus(self.chunks)
        cfg = lab.defaults()
        for p in cfg['profiles']:
            if p['adapter'] != 'demo':
                p.update(base_url=self.url, model=p['id'] + '-test-model', key_env='')
        cfg['embedding'] = {'base_url': self.url, 'model': 'embedding-test', 'key_env': ''}
        lab.write_json(lab.DATA / 'config' / 'config.json', cfg)
        lab.build_dense()  # retrieval is dense-only; the fake provider supplies embeddings

    def tearDown(self):
        self.db_patch.stop()
        self.data_patch.stop()
        self.temp.cleanup()

    def test_html_removes_navigation_preserves_section_and_table_row(self):
        p = lab.SourceHTML()
        p.feed('<nav>IGNORE OUTSIDE</nav><main><nav>IGNORE INSIDE</nav><h2>Symptoms</h2><p>Apple scab causes olive green spots on apple leaves.</p><table><tr><th>Product</th><th>Rate</th></tr><tr><td>Example</td><td>See verified source instructions before use.</td></tr></table><script>IGNORE SCRIPT</script></main>')
        self.assertNotIn('IGNORE', str(p.blocks))
        self.assertTrue(any(s == 'Symptoms' and 'olive green' in t for s, t in p.blocks))
        self.assertTrue(any('Example | See verified' in t for _, t in p.blocks))

    def test_efficient_keeps_whole_passages_drops_duplicates_and_respects_budget(self):
        duplicate = dict(self.chunks[0], id='one-copy')
        small = {'id': 'three', 'text': 'Remove leaf litter to reduce apple scab.', 'metadata': dict(self.chunks[1]['metadata'])}
        candidates = [self.chunks[0], duplicate, self.chunks[1], small]
        result = lab.efficient_context('What are apple scab symptoms?', candidates, 10000)
        self.assertEqual([x['id'] for x in result], ['one', 'two', 'three'])  # duplicate copy dropped
        for x in result:  # passages are never cut
            self.assertEqual(x['text'], next(c['text'] for c in candidates if c['id'] == x['id']))
        tight = lab.efficient_context('What are apple scab symptoms?', candidates, 230)
        self.assertEqual(tight[0]['id'], 'one')
        self.assertLessEqual(lab.estimate_tokens(lab.evidence_text(tight, compact=True)), 230)
        self.assertLess(len(tight), 3)  # whole lower-ranked passages dropped to fit the budget
        scored = [dict(c, score=s) for c, s in zip([self.chunks[0], self.chunks[1], small], (0.80, 0.78, 0.70))]
        self.assertEqual([x['id'] for x in lab.efficient_context('q', scored, 10000, relevance_margin=0.05)], ['one', 'two'])

    def test_management_expansion_adds_same_source_management_only_for_action_questions(self):
        meta = lambda section: {'title': 'Apple Scab', 'url': 'https://example.org/s', 'source_id': 'S1', 'section': section}
        corpus = [{'id': 'S1:web:1', 'text': 'Olive spots on leaves.', 'metadata': meta('Symptoms')},
                  {'id': 'S1:web:2', 'text': 'Remove fallen leaves.', 'metadata': meta('Management')},
                  {'id': 'S1:web:3', 'text': 'Product | rate', 'metadata': dict(meta('Treatment table'), block_kind='table_row')},
                  {'id': 'S2:web:1', 'text': 'Mildew control.', 'metadata': dict(meta('Management'), source_id='S2')}]
        hit = [dict(corpus[0], score=0.8)]
        added = lab.expand_management('Olive spots on my apples. What should I do?', hit, corpus)
        self.assertEqual([x['id'] for x in added], ['S1:web:1', 'S1:web:2'])  # same source, prose only
        self.assertIsNone(added[1]['score'])
        self.assertEqual(lab.expand_management('Olive spots on my apples. What is it?', hit, corpus), hit)
        kept = lab.efficient_context('q', added, 10000, relevance_margin=0.05)
        self.assertEqual([x['id'] for x in kept], ['S1:web:1', 'S1:web:2'])  # expansion never dropped by the margin

    def test_compact_evidence_is_shorter_without_losing_text_or_specific_limits(self):
        meta = dict(self.chunks[1]['metadata'], review_id='r', url='https://example.org/long/path',
                    scope_note='Shared clause. Abstract excerpt only.', evidence_type='trial', publication_or_update_date='2020')
        chunk = dict(self.chunks[1], metadata=meta)
        with patch.object(lab, 'generic_limit_sentences', return_value=['Shared clause.']):
            compact = lab.evidence_text([chunk], compact=True)
            prompt = lab.prompts('Apple scab?', 'efficient', [chunk])
        full = lab.evidence_text([chunk])
        self.assertIn(chunk['text'], compact)
        self.assertIn('Abstract excerpt only.', compact)  # chunk-specific limit kept
        self.assertNotIn('Shared clause.', compact)       # shared limit moved to the system prompt
        self.assertIn(lab.SHARED_LIMIT_SUMMARY, prompt[0]['content'])  # shared rules stated once, condensed
        self.assertNotIn('https://example.org', compact)
        self.assertLess(len(compact), len(full))

    def test_no_rag_never_retrieves_or_sends_evidence(self):
        with patch.object(lab, 'retrieve', side_effect=AssertionError('No-RAG called retrieval')):
            result = lab.experiment({'question': 'Apple scab symptoms?', 'profile_ids': ['openai'], 'modes': ['non_rag']})['results'][0]
        self.assertEqual(result['status'], 'success')
        self.assertEqual(result['evidence'], [])
        self.assertNotIn('Evidence:', FakeProvider.calls[-1][1]['messages'][1]['content'])
        self.assertEqual(result['usage']['total_tokens'], 39)

    def test_topic_query_retrieval_and_compression(self):
        found, _ = lab.retrieve('What are apple scab symptoms?', lab.corpus(), 'dense', 6)
        self.assertTrue(found)
        compact = lab.efficient_context('What are apple scab symptoms?', found, 180)
        self.assertTrue(compact)
        self.assertIn('olive green spots', compact[0]['text'])
        self.assertEqual(lab.normalize_query('What are apple scab symptoms?')['query'], 'What are apple scab symptoms?')

    def test_chinese_topic_query_and_compression_use_english_terms(self):
        question = '\u82f9\u679c\u9ed1\u661f\u75c5\u6709\u54ea\u4e9b\u75c7\u72b6\uff1f'
        found, _ = lab.retrieve(question, lab.corpus(), 'dense', 6)
        self.assertTrue(found)
        normalized = lab.normalize_query(question)
        self.assertIn('apple scab', normalized['query'])
        self.assertEqual(normalized['original'], question)

    def test_chinese_overview_question_is_answered_in_chinese(self):
        with patch.object(lab, 'retrieve', side_effect=AssertionError('No-RAG called retrieval')):
            result = lab.experiment({'question': '\u82f9\u679c\u6709\u54ea\u4e9b\u75c5\u866b\u5bb3\uff1f', 'profile_ids': ['openai'], 'modes': ['non_rag'], 'answer_language': 'auto'})['results'][0]
        self.assertEqual(result['status'], 'success')
        self.assertIn('Simplified Chinese', result['messages'][0]['content'])
        self.assertEqual(lab.normalize_query('\u82f9\u679c\u6709\u54ea\u4e9b\u75c5\u866b\u5bb3\uff1f')['overview'], 'both')

    def test_overview_covers_diseases_and_pests_in_both_rag_modes(self):
        samples = self.chunks + [
            {'id': 'fire', 'text': 'Fire blight is an apple disease caused by bacteria. Apple shoots and flowers can wilt.', 'metadata': {'title': 'Fire Blight', 'topic': 'Fire Blight', 'section': 'Symptoms', 'url': 'https://example.org/fire'}},
            {'id': 'moth', 'text': 'Codling moth larvae damage apples and feed inside the apple fruit.', 'metadata': {'title': 'Codling Moth', 'topic': 'Codling Moth', 'section': 'Description of the Pest', 'url': 'https://example.org/moth'}}]
        lab.replace_corpus(samples)
        lab.build_dense()
        output = lab.experiment({'question': 'What are the common diseases and pests of apples?', 'profile_ids': ['openai'], 'modes': ['standard', 'efficient'], 'answer_language': 'auto'})
        for result in output['results']:
            self.assertEqual(result['status'], 'success')
            self.assertEqual({x['metadata']['title'] for x in result['candidates']}, {'Apple Scab', 'Fire Blight', 'Codling Moth'})
            self.assertIn('Answer in English', result['messages'][0]['content'])
            self.assertIn('not an exhaustive list', result['messages'][0]['content'])
            self.assertEqual(result['query_normalization']['overview'], 'both')
        self.assertEqual(output['results'][0]['candidates'], output['results'][1]['candidates'])

    def test_only_dense_retrieval_is_accepted(self):
        with self.assertRaises(ValueError):
            lab.retrieve('apple scab', lab.corpus(), 'lexical', 6)
        with self.assertRaises(ValueError):
            lab.experiment({'question': 'Apple scab?', 'profile_ids': ['openai'], 'modes': ['standard'], 'retrieval': 'lexical'})

    def test_language_defaults_keep_english_experiments_and_no_rag_isolation(self):
        self.assertIn('Answer in English', lab.prompts('apple pests and diseases', 'non_rag', [])[0]['content'])
        with patch.object(lab, 'retrieve', side_effect=AssertionError('No-RAG called retrieval')):
            result = lab.experiment({'question': 'What are the common diseases and pests of apples?', 'profile_ids': ['openai'], 'modes': ['non_rag'], 'answer_language': 'auto'})['results'][0]
        self.assertEqual(result['status'], 'success')
        self.assertIn('Answer in English', result['messages'][0]['content'])
        self.assertEqual(result['evidence'], [])

    def test_multi_model_three_conditions_shared_candidates_and_usage(self):
        output = lab.experiment({'question': 'What are apple scab symptoms?', 'profile_ids': ['openai', 'deepseek'], 'budget': 160})
        self.assertEqual(len(output['results']), 6)
        for profile in ('openai', 'deepseek'):
            rows = {x['mode']: x for x in output['results'] if x['profile']['id'] == profile}
            self.assertTrue(all(x['status'] == 'success' for x in rows.values()))
            self.assertEqual(rows['standard']['candidates'], rows['efficient']['candidates'])
            self.assertEqual(rows['standard']['evidence'], rows['standard']['candidates'])
            # the budget never drops the first passage, so one long passage may exceed it on its own
            self.assertTrue(rows['efficient']['context_estimated_tokens'] <= 160 or len(rows['efficient']['evidence']) == 1)
            self.assertIsNone(rows['standard']['accuracy'])
        manifest = json.loads((lab.DATA / 'logs' / 'experiments.jsonl').read_text())
        self.assertEqual(manifest['randomization_seed'], output['randomization_seed'])
        self.assertEqual(len(manifest['execution_order']), 6)

    def test_dense_embeddings_response_order_and_configuration_invalidation(self):
        index = lab.build_dense()
        self.assertEqual(index['usage'][0]['total_tokens'], 7)
        found, usage = lab.retrieve('apple scab', lab.corpus(), 'dense', 2)
        self.assertEqual(len(found), 2)
        self.assertEqual(usage['total_tokens'], 7)
        cfg = lab.config()
        cfg['embedding']['model'] = 'new-model'
        lab.write_json(lab.DATA / 'config' / 'config.json', cfg)
        with self.assertRaisesRegex(ValueError, 'rebuild the index'):
            lab.retrieve('apple scab', lab.corpus(), 'dense', 2)
        lab.replace_corpus([self.chunks[0]])
        with self.assertRaisesRegex(ValueError, 'has not been built'):
            lab.retrieve('apple scab', lab.corpus(), 'dense', 2)

    def test_local_embedding_prefixes_queries_only_and_never_calls_remote_api(self):
        class FakeModel:
            seen = []
            def encode(self, texts, **kwargs):
                import numpy as np
                self.seen.append(list(texts))
                return np.array([[1.0, float('olive' in t)] for t in texts])
        cfg = lab.config()
        cfg['embedding'] = {'adapter': 'local', 'model': 'local-test', 'query_prefix': 'Q: '}
        lab.write_json(lab.DATA / 'config' / 'config.json', cfg)
        with patch.object(lab, 'local_model', return_value=FakeModel()), patch.object(lab, 'api_post', side_effect=AssertionError('remote call')):
            index = lab.build_dense()
            found, usage = lab.retrieve('olive spots', lab.corpus(), 'dense', 2)
        self.assertEqual(index['dimension'], 2)
        self.assertFalse(any(t.startswith('Q: ') for t in FakeModel.seen[0]))
        self.assertEqual(FakeModel.seen[-1], ['Q: olive spots'])
        self.assertEqual(len(found), 2)
        self.assertEqual(usage['local_model'], 'local-test')

    def test_freeze_manifest_blocks_corpus_and_index_changes_but_not_questions(self):
        lab.build_dense()
        before = lab.corpus()
        lab.write_json(lab.DATA / 'registers' / 'corpus_freeze.json',
                       {'version': 'test', 'frozen_at': '2026-10-14T00:00:00+00:00', 'corpus_hash': lab.corpus_hash(before)})
        for action in (lambda: lab.replace_corpus(self.chunks[:1]), lab.build_dense, lambda: lab.import_sources(['S001']),
                       lambda: lab.import_local_pdfs(), lambda: lab.import_local_pdfs(incremental=True)):
            with self.assertRaisesRegex(ValueError, 'corpus is frozen'):
                action()
        self.assertEqual(before, lab.corpus())
        result = lab.experiment({'question': 'Apple scab symptoms?', 'profile_ids': ['openai'], 'modes': ['standard'], 'retrieval': 'dense'})['results'][0]
        self.assertEqual(result['status'], 'success')

    def test_prompt_shows_readable_date_evidence_and_warm_up(self):
        chunk = dict(self.chunks[1], metadata=dict(self.chunks[1]['metadata'], review_id='r', study_years=[2021, 2022],
                     date_evidence=[{'literal': 'Updated: January 5, 2024', 'datetime': None}]))
        text = lab.evidence_text([chunk])
        self.assertIn('date evidence: Updated: January 5, 2024;', text)
        self.assertIn('study years: 2021, 2022', text)
        self.assertNotIn("{'literal'", text)
        self.assertIsInstance(lab.warm_up(), float)  # index built in setUp

    def test_transient_provider_errors_are_retried_and_waits_recorded(self):
        ok = ('answer', {'total_tokens': 3}, {'model': 'm'}, {})
        waits = []
        with patch.object(lab, 'generate', side_effect=[ValueError('API HTTP 503; x'), ValueError('API HTTP 429; x'), ok]):
            result = lab.generate_with_retry({}, [], 10, [], sleep=waits.append)
        self.assertEqual(result[:4], ok)
        self.assertEqual(result[4]['attempts'], 3)
        self.assertEqual(waits, [5, 15])
        self.assertEqual(result[4]['retry_wait_seconds'], 20)
        with patch.object(lab, 'generate', side_effect=ValueError('API HTTP 401; x')):
            with self.assertRaisesRegex(ValueError, '401'):
                lab.generate_with_retry({}, [], 10, [], sleep=waits.append)
        self.assertEqual(waits, [5, 15])  # non-transient errors are not retried

    def test_api_failure_logged_without_credentials_or_vendor_body(self):
        cfg = lab.config()
        cfg['profiles'][1]['model'] = 'fail-model'
        lab.write_json(lab.DATA / 'config' / 'config.json', cfg)
        lab.SECRETS['openai'] = 'sensitive-test-key'
        r = lab.experiment({'question': 'Apple scab?', 'profile_ids': ['openai'], 'modes': ['non_rag']})['results'][0]
        self.assertEqual(r['status'], 'error')
        self.assertIn('401', r['error'])
        grounded = lab.experiment({'question': 'Apple scab?', 'profile_ids': ['openai'], 'modes': ['standard']})['results'][0]
        self.assertEqual(grounded['status'], 'error')
        self.assertTrue(grounded['evidence'])
        self.assertGreater(grounded['context_estimated_tokens'], 0)
        log = (lab.DATA / 'logs' / 'runs.jsonl').read_text()
        self.assertNotIn('sensitive-test-key', log)
        self.assertNotIn('private-key-do-not-log', log)
        chat = next(c for c in FakeProvider.calls if c[0].endswith('chat/completions'))
        self.assertEqual(chat[2], 'Bearer sensitive-test-key')

    def test_offline_demo_never_fabricates_usage(self):
        r = lab.experiment({'question': 'Apple scab?'})['results']
        self.assertTrue(all(x['is_demo'] and x['usage'] is None for x in r))

    def test_http_config_key_not_persisted_and_exports_available(self):
        http = ThreadingHTTPServer(('127.0.0.1', 0), lab.Handler)
        worker = threading.Thread(target=http.serve_forever, daemon=True)
        worker.start()
        base = f'http://127.0.0.1:{http.server_port}'
        try:
            p = lab.config()['profiles'][1]
            request = Request(base + '/api/config', data=json.dumps({'profile': p, 'api_key': 'memory-only-secret'}).encode(), headers={'Content-Type': 'application/json'}, method='POST')
            with urlopen(request) as response:
                self.assertFalse(json.load(response)['keys_persisted'])
            self.assertNotIn('memory-only-secret', (lab.DATA / 'config' / 'config.json').read_text())
            with urlopen(base + '/api/state') as response:
                state = json.load(response)
            self.assertTrue(state['config']['profiles'][1]['key_available'])
            self.assertNotIn('memory-only-secret', json.dumps(state))
            lab.experiment({'question': 'Apple scab?', 'modes': ['non_rag']})
            with urlopen(base + '/api/export') as response:
                self.assertEqual(len(json.load(response)), 1)
            with urlopen(base + '/api/export.csv') as response:
                self.assertIn('latency_seconds', response.read().decode('utf-8-sig'))
            for path in ('/', '/app.js', '/style.css'):
                with urlopen(base + path) as response:
                    self.assertEqual(response.status, 200)
        finally:
            http.shutdown()
            http.server_close()
            worker.join()


if __name__ == '__main__':
    unittest.main()
