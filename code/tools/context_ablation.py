"""Offline retrieval-quality evaluation and token-efficient context ablation (no API calls).

python code/tools/context_ablation.py --name dev_v8 --bank data/eval/questions/dev_questions.xlsx
python code/tools/context_ablation.py --name test_final --bank data/eval/questions/test_questions.xlsx

Uses the candidate passages actually saved in <name>_results.jsonl (one efficient-condition record
per question; retrieval is deterministic, so all models share the same candidates) and the gold
chunk_ids of the question bank. Token counts are ESTIMATES from server.estimate_tokens on the exact
evidence text, not provider-native counts; native counts require real API calls.

Variants:
  standard         standard RAG (full headers, all candidates)
  compact_headers  standard + compact headers (= headers-only condition)
  headers_dedup    compact headers + near-duplicate removal (Jaccard > 0.85)
  headers_margin   compact headers + relevance margin 0.05 (expansion passages exempt)
  efficient        full token-efficient RAG (compact headers + dedup + margin) == production efficient_context
Outputs <name>_ablation.csv (per question x variant), <name>_ablation_dropped.csv (every removed
chunk with reason and gold flag) and <name>_retrieval.csv (retrieval metrics).
"""
import argparse
import csv
import json
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'code' / 'apple_rag_lab'))
sys.path.insert(0, str(ROOT / 'code' / 'tools'))
import server  # noqa: E402
import question_bank as qb  # noqa: E402

LOGS = ROOT / 'data' / 'logs'
JACCARD, MARGIN = 0.85, 0.05


def select(candidates, dedup, margin):
    """Reproduces efficient_context step by step and records why each passage was removed."""
    kept, seen, dropped = [], [], []
    top = max((x['score'] for x in candidates if x.get('score') is not None), default=0)
    for x in candidates:
        tokens = set(server.words(x['text']))
        if dedup and any(len(tokens & old) / max(1, len(tokens | old)) > JACCARD for old in seen):
            dropped.append((x, 'near_duplicate'))
            continue
        if margin and kept and x.get('score') is not None and x['score'] < top - MARGIN:
            dropped.append((x, 'relevance_margin'))
            continue
        kept.append(x)
        seen.append(tokens)
    return kept, dropped


VARIANTS = {'standard': (False, False, False), 'compact_headers': (True, False, False), 'headers_dedup': (True, True, False),
            'headers_margin': (True, False, True), 'efficient': (True, True, True)}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--name', required=True)
    ap.add_argument('--bank', required=True)
    args = ap.parse_args()
    gold = {r['question_id']: set(qb.split_list(r['chunk_ids'])) for r in qb.read_rows(ROOT / args.bank)}
    records = {}
    for line in (LOGS / f'{args.name}_results.jsonl').read_text(encoding='utf-8').splitlines():
        r = json.loads(line)
        if r['mode'] == 'efficient' and r.get('candidates') and r['question_id'] not in records:
            records[r['question_id']] = r
    rows, drops, retr = [], [], []
    for qid in sorted(records):
        r, g = records[qid], gold.get(qid, set())
        cands = r['candidates']
        initial = [x for x in cands if not x.get('expansion')]
        ids_init = [x['id'] for x in initial]
        ranks = [i for i, cid in enumerate(ids_init, 1) if cid in g]
        retr.append({'question_id': qid, 'n_gold': len(g), 'gold_in_top6': len(g & set(ids_init)),
                     'recall_at_6': round(len(g & set(ids_init)) / len(g), 3) if g else '',
                     'hit_at_6': int(bool(g & set(ids_init))) if g else '',
                     'reciprocal_rank': round(1 / ranks[0], 3) if ranks else (0 if g else ''),
                     'gold_after_expansion': len(g & {x['id'] for x in cands}),
                     'expansion_added': sum(1 for x in cands if x.get('expansion'))})
        for v, (compact, dedup, margin) in VARIANTS.items():
            kept, dropped = select(cands, dedup, margin) if (dedup or margin) else (list(cands), [])
            text = server.evidence_text(kept, compact=compact)
            kept_ids = {x['id'] for x in kept}
            rows.append({'question_id': qid, 'variant': v, 'candidates': len(cands), 'kept': len(kept), 'dropped': len(dropped),
                         'est_evidence_tokens': server.estimate_tokens(text),
                         'gold_available': len(g & {x['id'] for x in cands}), 'gold_kept': len(g & kept_ids),
                         'gold_dropped': len(g & {x['id'] for x, _ in dropped})})
            if v == 'efficient':
                for x, why in dropped:
                    drops.append({'question_id': qid, 'chunk_id': x['id'], 'reason': why, 'is_gold': int(x['id'] in g),
                                  'score': round(x['score'], 4) if x.get('score') is not None else '',
                                  'top_score': round(max(y['score'] for y in cands if y.get('score') is not None), 4),
                                  'title': x['metadata'].get('title', '')[:80], 'section': x['metadata'].get('section', '')[:60]})
    for fname, data in ((f'{args.name}_ablation.csv', rows), (f'{args.name}_ablation_dropped.csv', drops), (f'{args.name}_retrieval.csv', retr)):
        if data:
            with (LOGS / fname).open('w', newline='', encoding='utf-8-sig') as f:
                w = csv.DictWriter(f, fieldnames=list(data[0])); w.writeheader(); w.writerows(data)
    # summary
    print(f'{args.name}: {len(records)} questions (retrieval is deterministic; one record per question)')
    scored = [x for x in retr if x['n_gold']]
    print(f"Retrieval  hit@6 {sum(x['hit_at_6'] for x in scored)}/{len(scored)}  mean recall@6 {statistics.mean(x['recall_at_6'] for x in scored):.3f}"
          f"  MRR {statistics.mean(x['reciprocal_rank'] for x in scored):.3f}  questions with expansion {sum(1 for x in retr if x['expansion_added'])}")
    base = {x['question_id']: x['est_evidence_tokens'] for x in rows if x['variant'] == 'standard'}
    for v in VARIANTS:
        vr = [x for x in rows if x['variant'] == v]
        save = statistics.mean(1 - x['est_evidence_tokens'] / base[x['question_id']] for x in vr if base[x['question_id']])
        print(f"{v:<16} median est. tokens {statistics.median(x['est_evidence_tokens'] for x in vr):>7.0f}  saving vs standard {100*save:5.1f}%"
              f"  kept {sum(x['kept'] for x in vr)}/{sum(x['candidates'] for x in vr)}  gold kept {sum(x['gold_kept'] for x in vr)}/{sum(x['gold_available'] for x in vr)}"
              f"  questions losing all gold {sum(1 for x in vr if x['gold_available'] and not x['gold_kept'])}")
    print('Dropped by efficient filtering:', {k: sum(1 for d in drops if d['reason'] == k) for k in ('near_duplicate', 'relevance_margin')},
          'gold among dropped:', sum(d['is_gold'] for d in drops))


if __name__ == '__main__':
    main()
