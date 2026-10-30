"""Paired condition comparisons with question-clustered bootstrap (v2).

python 代码/tools/analyze_results_v2.py --name test_final

Differences from analyze_results.py (v1, kept for the historical baseline):
- Pooled comparisons resample QUESTIONS, not (model, question) pairs. For each question the paired
  difference is first averaged over the models (and over repeats, if any), so the three models that
  answered the same question are not treated as independent observations.
- Repeated requests (repeat > 1) are averaged within (model, question, condition) before pairing.
Per-model intervals resample questions as before. 10,000 draws, percentile 95% CI, fixed seed.
Writes data/logs/<name>_analysis_v2.csv; never overwrites the v1 output.
"""
import argparse
import csv
import json
import random
import statistics
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LOGS = ROOT / 'data' / 'logs'
COMPARISONS = [('standard', 'non_rag'), ('efficient', 'non_rag'), ('efficient', 'standard'),
               ('headers_only', 'standard'), ('efficient', 'headers_only')]  # last two: headers-only ablation
METRICS = ('score', 'input_tokens', 'output_tokens', 'total_tokens', 'seconds')
DRAWS, SEED = 10000, 20261021


def service_seconds(r):
    retries = r.get('retries') or {}
    return r['end_to_end_seconds'] - retries.get('retry_wait_seconds', 0) - retries.get('failed_attempt_seconds', 0)


def load(name, judged_suffix=''):
    """{(model, question, condition): {metric: mean over repeats}}"""
    raw = defaultdict(lambda: defaultdict(list))
    task = {}
    for line in (LOGS / f'{name}_results.jsonl').read_text(encoding='utf-8').splitlines():
        r = json.loads(line)
        if r.get('status') != 'success':
            continue
        key = (r['model'], r['question_id'], r['mode'])
        task[r['task_id']] = key
        for m, v in (('input_tokens', r['input_tokens']), ('output_tokens', r['output_tokens']),
                     ('total_tokens', r['total_tokens']), ('seconds', service_seconds(r))):
            if v is not None:
                raw[key][m].append(v)
    judged = LOGS / f'{name}_judged{judged_suffix}.jsonl'
    if judged.exists():
        latest = {}
        for line in judged.read_text(encoding='utf-8').splitlines():
            j = json.loads(line)
            latest[j['task_id']] = j
        for tid, j in latest.items():
            if 'score' in j and tid in task:
                raw[task[tid]]['score'].append(j['score'])
    return {k: {m: statistics.mean(v) for m, v in d.items()} for k, d in raw.items()}


def bootstrap_mean(values, rng):
    n = len(values)
    means = sorted(sum(rng.choice(values) for _ in range(n)) / n for _ in range(DRAWS))
    return means[int(0.025 * DRAWS)], means[int(0.975 * DRAWS) - 1]


def question_diffs(data, metric, a, b, models):
    """{question: mean over models of (a - b)}; questions missing a model are skipped for pooled."""
    per_q = defaultdict(list)
    for m in models:
        for (mm, q, c), d in data.items():
            if mm == m and c == a and metric in d and metric in data.get((m, q, b), {}):
                per_q[q].append(d[metric] - data[(m, q, b)][metric])
    return {q: statistics.mean(v) for q, v in per_q.items() if len(v) == len(models)}


def analyse(data):
    models = sorted({k[0] for k in data})
    rows = []
    for metric in METRICS:
        for a, b in COMPARISONS:
            for scope in models + ['pooled']:
                ms = models if scope == 'pooled' else [scope]
                diffs = question_diffs(data, metric, a, b, ms)
                if not diffs:
                    continue
                qs = sorted(diffs)
                vals = [diffs[q] for q in qs]
                mean_b = statistics.mean(statistics.mean(data[(m, q, b)][metric] for m in ms) for q in qs)
                lo, hi = bootstrap_mean(vals, random.Random(SEED))
                rows.append({'metric': metric, 'comparison': f'{a} - {b}', 'scope': scope, 'n_questions': len(qs),
                             'mean_a': round(mean_b + statistics.mean(vals), 3), 'mean_b': round(mean_b, 3),
                             'mean_diff': round(statistics.mean(vals), 3), 'ci95_low': round(lo, 3), 'ci95_high': round(hi, 3),
                             'relative_change_%': round(100 * statistics.mean(vals) / mean_b, 1) if mean_b else '',
                             'ci_excludes_0': not (lo <= 0 <= hi),
                             'resampling_unit': 'question', 'draws': DRAWS, 'seed': SEED})
    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--name', required=True)
    parser.add_argument('--judged-suffix', default='', help='e.g. _gpt for <name>_judged_gpt.jsonl')
    args = parser.parse_args()
    rows = analyse(load(args.name, args.judged_suffix))
    out = LOGS / f'{args.name}_analysis_v2.csv'
    with out.open('w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)
    for r in rows:
        if r['metric'] in ('score', 'input_tokens', 'seconds'):
            print(f"{r['metric']:<13}{r['comparison']:<22}{r['scope']:<9}n={r['n_questions']:<3}"
                  f"diff {r['mean_diff']:>9} [{r['ci95_low']}, {r['ci95_high']}] {r['relative_change_%']}%{' *' if r['ci_excludes_0'] else ''}")
    print(f'* = 95% CI excludes 0 (question-level bootstrap, {DRAWS} draws, seed {SEED}). Saved {out.relative_to(ROOT)}')


if __name__ == '__main__':
    sys.exit(main())
