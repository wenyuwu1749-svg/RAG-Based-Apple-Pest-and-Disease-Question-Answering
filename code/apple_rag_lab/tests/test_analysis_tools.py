import random
import sys
import unittest
from pathlib import Path

TOOLS = Path(__file__).resolve().parents[2] / 'tools'
sys.path.insert(0, str(TOOLS))
import analyze_results_v2 as ar  # noqa: E402
import human_eval as he  # noqa: E402


class KappaTests(unittest.TestCase):
    def test_identical_scores_give_kappa_one(self):
        self.assertAlmostEqual(he.weighted_kappa([0, 1, 2, 3, 4], [0, 1, 2, 3, 4]), 1.0)

    def test_reversed_scores_give_kappa_minus_one(self):
        self.assertAlmostEqual(he.weighted_kappa([0, 1, 2, 3, 4], [4, 3, 2, 1, 0]), -1.0)

    def test_compare_reports_agreement(self):
        r = he.compare('a vs b', [0, 2, 4, 3], [0, 3, 4, 1])
        self.assertEqual(r['exact_agreement'], 0.5)
        self.assertEqual(r['within_one'], 0.75)

    def test_citation_markers_removed(self):
        self.assertEqual(he.strip_citations('Scab [1][2]. Prune [3, 4].'), 'Scab. Prune.')


class ClusteredBootstrapTests(unittest.TestCase):
    def _data(self):
        # 3 models answer the same 4 questions; condition b is always 1 lower than a for every model
        data = {}
        for m in ('m1', 'm2', 'm3'):
            for q in ('q1', 'q2', 'q3', 'q4'):
                data[(m, q, 'a')] = {'score': 3.0}
                data[(m, q, 'b')] = {'score': 2.0}
        return data

    def test_pooled_unit_is_question(self):
        diffs = ar.question_diffs(self._data(), 'score', 'a', 'b', ['m1', 'm2', 'm3'])
        self.assertEqual(len(diffs), 4)  # 4 questions, not 12 model-question pairs
        self.assertTrue(all(v == 1.0 for v in diffs.values()))

    def test_constant_difference_has_zero_width_interval(self):
        lo, hi = ar.bootstrap_mean([1.0] * 4, random.Random(1))
        self.assertEqual((lo, hi), (1.0, 1.0))


if __name__ == '__main__':
    unittest.main()
