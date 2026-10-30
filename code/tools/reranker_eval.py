"""Offline evaluation of a local cross-encoder reranker on the DEVELOPMENT set (no API calls).

python code/tools/reranker_eval.py --bank data/eval/dev_questions.xlsx --pool 10 20 30

Baseline: dense cosine Top-6. Reranked: dense Top-N pool -> cross-encoder score on (question,
title | section | passage) -> Top-6. Same-source management expansion is applied afterwards in both
arms, exactly as in the pipeline. Reports hit@6, recall@6, MRR, gold coverage after expansion and the
added reranking time per question. Writes data/logs/reranker_eval_<split>.csv.
Decision rule (fixed before running): adopt the reranker only if it improves dev recall@6 and MRR
without reducing gold coverage after expansion, at < 1 s added latency per question.
"""
import argparse
import csv
import statistics
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'code' / 'apple_rag_lab'))
sys.path.insert(0, str(ROOT / 'code' / 'tools'))
import server  # noqa: E402
import question_bank as qb  # noqa: E402

MODEL_DIR = ROOT / 'model' / 'ms-marco-MiniLM-L6-v2'


def passage_text(x):
    m = x['metadata']
    return f"{m.get('title', '')} | {m.get('section', '')}\n{x['text']}"


def metrics(ids, gold):
    ranks = [i for i, c in enumerate(ids, 1) if c in gold]
    return {'hit': int(bool(ranks)), 'recall': len(gold & set(ids)) / len(gold), 'rr': 1 / ranks[0] if ranks else 0.0}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--bank', required=True)
    ap.add_argument('--pool', type=int, nargs='+', default=[20])
    args = ap.parse_args()
    from sentence_transformers import CrossEncoder
    ce = CrossEncoder(str(MODEL_DIR), device='cpu')
    rows_q = [r for r in qb.read_rows(ROOT / args.bank) if qb.split_list(r['chunk_ids'])]
    split = rows_q[0]['split']
    chunks = server.corpus()
    server.warm_up()
    ce.predict([('warm up', 'warm up')])
    out = []
    for r in rows_q:
        q, gold = r['question_en'], set(qb.split_list(r['chunk_ids']))
        base, _ = server.retrieve(q, chunks, 'dense', 6)
        bm = metrics([x['id'] for x in base], gold)
        bexp = server.expand_management(q, base, chunks)
        row = {'question_id': r['question_id'], 'n_gold': len(gold), 'base_hit': bm['hit'], 'base_recall': round(bm['recall'], 3),
               'base_rr': round(bm['rr'], 3), 'base_cov_after_expansion': round(len(gold & {x['id'] for x in bexp}) / len(gold), 3)}
        for n in args.pool:
            pool, _ = server.retrieve(q, chunks, 'dense', n)
            t = time.perf_counter()
            scores = ce.predict([(q, passage_text(x)) for x in pool])
            dt = time.perf_counter() - t
            top = [x for _, x in sorted(zip(scores, pool), key=lambda p: -p[0])][:6]
            m = metrics([x['id'] for x in top], gold)
            exp = server.expand_management(q, top, chunks)
            row.update({f'rr{n}_hit': m['hit'], f'rr{n}_recall': round(m['recall'], 3), f'rr{n}_rr': round(m['rr'], 3),
                        f'rr{n}_cov_after_expansion': round(len(gold & {x['id'] for x in exp}) / len(gold), 3), f'rr{n}_seconds': round(dt, 3)})
        out.append(row)
    path = ROOT / 'data' / 'logs' / f'reranker_eval_{split}.csv'
    with path.open('w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
    mean = lambda k: statistics.mean(x[k] for x in out)
    print(f'{split}: {len(out)} questions with gold evidence; model {MODEL_DIR.name}')
    print(f"baseline  hit@6 {sum(x['base_hit'] for x in out)}  recall@6 {mean('base_recall'):.3f}  MRR {mean('base_rr'):.3f}  cov+exp {mean('base_cov_after_expansion'):.3f}")
    for n in args.pool:
        print(f"rerank{n:<3} hit@6 {sum(x[f'rr{n}_hit'] for x in out)}  recall@6 {mean(f'rr{n}_recall'):.3f}  MRR {mean(f'rr{n}_rr'):.3f}  "
              f"cov+exp {mean(f'rr{n}_cov_after_expansion'):.3f}  median rerank time {statistics.median(x[f'rr{n}_seconds'] for x in out):.3f}s")
    print('Saved', path.relative_to(ROOT))


if __name__ == '__main__':
    main()
