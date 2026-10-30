import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server  # noqa: E402


def chunk(cid, score, text, section='Symptoms'):
    return {'id': cid, 'score': score, 'text': text,
            'metadata': {'title': 'Guide', 'section': section, 'region': 'US', 'source_id': cid.split(':')[0],
                         'url': 'https://example.org/guide'}}


class FakeCrossEncoder:
    """Test double: ranks passages by how often the word 'scab' appears."""
    def predict(self, pairs):
        return [p[1].lower().count('scab') for p in pairs]


class V9Tests(unittest.TestCase):
    def setUp(self):
        self._saved = server.LOCAL_MODELS.get('reranker')
        server.LOCAL_MODELS['reranker'] = FakeCrossEncoder()

    def tearDown(self):
        if self._saved is None:
            server.LOCAL_MODELS.pop('reranker', None)
        else:
            server.LOCAL_MODELS['reranker'] = self._saved

    def test_rerank_orders_by_cross_encoder_and_keeps_cosine_score(self):
        pool = [chunk('A:web:1', 0.9, 'leaf spots'), chunk('B:web:1', 0.8, 'scab scab'), chunk('C:web:1', 0.7, 'scab')]
        out = server.rerank('scab?', pool, 2)
        self.assertEqual([x['id'] for x in out], ['B:web:1', 'C:web:1'])
        self.assertEqual(out[0]['score'], 0.8)  # cosine kept for the efficient margin
        self.assertEqual(out[0]['dense_rank'], 2)

    def test_caution_is_identical_in_all_conditions(self):
        caution = 'Pesticide products, rates and timings are not current recommendations'
        ev = [chunk('A:web:1', 0.9, 'scab')]
        for mode in ('non_rag', 'standard', 'efficient', 'headers_only'):
            system = server.prompts('What is this?', mode, [] if mode == 'non_rag' else ev)[0]['content']
            self.assertIn(caution, system, mode)

    def test_headers_only_keeps_every_candidate_with_compact_headers(self):
        ev = [chunk('A:web:1', 0.9, 'scab'), chunk('B:web:1', 0.1, 'unrelated')]
        user = server.prompts('What is this?', 'headers_only', ev)[1]['content']
        self.assertIn('[2]', user)          # nothing removed
        self.assertNotIn('URL:', user)      # compact header
        self.assertIn(server.SHARED_LIMIT_SUMMARY, server.prompts('q', 'headers_only', ev)[0]['content'])

    def test_modes_and_prompt_version(self):
        self.assertIn('headers_only', server.MODES)
        self.assertTrue(server.PROMPT_VERSION.startswith('v9'))


class TlsErrorTests(unittest.TestCase):
    def test_untrusted_certificate_gives_clear_message_and_no_bypass(self):
        import ssl
        from unittest import mock
        from urllib.error import URLError
        err = URLError(ssl.SSLCertVerificationError('certificate verify failed'))
        with mock.patch.object(server, 'urlopen', side_effect=err):
            with self.assertRaises(ValueError) as cm:
                server.api_post('https://api.example.com', 'chat/completions', {}, 'k')
        self.assertIn('证书不受信任', str(cm.exception))
        self.assertNotIn('Bearer', str(cm.exception))  # credentials never echoed


if __name__ == '__main__':
    unittest.main()
