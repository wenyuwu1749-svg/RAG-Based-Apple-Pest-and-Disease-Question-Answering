"""Automatic faithfulness and citation-quality evaluation of RAG answers (auxiliary integrity metrics).

python 代码/tools/faithfulness_eval.py run --name test_v9 [--repeats 1]
python 代码/tools/faithfulness_eval.py summary --name test_v9

Only RAG conditions are evaluated (standard, efficient, headers_only); non-RAG answers received no
evidence. The judge sees exactly the evidence block that was sent to the answering model (taken
from the saved prompt) and the answer WITH its citation markers, but not the model name or the
condition label. It splits the answer into factual claims and labels each claim:
  supported     - stated or directly implied by the supplied evidence
  unsupported   - not found in the supplied evidence (may still be true)
  contradicted  - conflicts with the supplied evidence
  unassessable  - opinion, generic advice or not checkable against evidence
For each claim it also lists the citation numbers attached to it and whether those cited passages
support it. Citation validity (does [n] exist among the passages?) is computed by code, not by the
judge. This is an automatic evaluation; a human spot-check is described in HUMAN_EVALUATION_INSTRUCTIONS.md.
Writes data/logs/<name>_faith.jsonl (resumable) and <name>_faith_summary.csv.
"""
import argparse
import csv
import json
import random
import re
import statistics
import sys
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '代码' / 'apple_rag_lab'))
import server  # noqa: E402

LOGS = ROOT / 'data' / 'logs'
FAITH_VERSION = 'faith-v1'
RAG_MODES = ('standard', 'efficient', 'headers_only')
LABELS = ('supported', 'unsupported', 'contradicted', 'unassessable')
RUBRIC = """You check whether an answer is supported by the evidence passages that were given to its author.
Use ONLY the evidence below; do not use your own knowledge to decide support.

1. Split the answer into its distinct factual claims (max 15; merge trivial repeats).
2. Label each claim:
   "supported": stated in or directly implied by the evidence;
   "unsupported": not found in the evidence (it may still be true in general);
   "contradicted": conflicts with the evidence;
   "unassessable": generic advice, opinion or a statement about missing information that cannot be checked.
3. For each claim list the citation numbers attached to it in the answer (e.g. [2] -> 2), and set
   "citation_supports" to true if at least one cited passage supports the claim, false if the cited
   passages do not support it, or null if the claim has no citation.
4. Set "dated_or_limited" to true when the supporting evidence is explicitly historical, overseas,
   laboratory/glasshouse or otherwise limited and the answer does not mention that limitation.

Reply with JSON only:
{"claims": [{"claim": "<short>", "label": "supported|unsupported|contradicted|unassessable",
 "cited": [<numbers>], "citation_supports": true|false|null, "dated_or_limited": true|false}, ...]}"""


def evidence_block(record):
    user = record['messages'][1]['content']
    return user.split('\n\nQuestion:\n')[0].removeprefix('Evidence:\n')


def parse(text):
    m = re.search(r'\{.*\}', text or '', re.S)
    claims = json.loads(m.group(0))['claims']
    out = []
    for c in claims[:15]:
        label = str(c.get('label', '')).lower()
        if label not in LABELS:
            raise ValueError(f'bad label {label!r}')
        out.append({'claim': str(c.get('claim', ''))[:300], 'label': label,
                    'cited': [int(x) for x in c.get('cited') or [] if str(x).isdigit()],
                    'citation_supports': c.get('citation_supports') if isinstance(c.get('citation_supports'), bool) else None,
                    'dated_or_limited': bool(c.get('dated_or_limited'))})
    if not out:
        raise ValueError('no claims')
    return out


def load_done(path):
    done = {}
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            r = json.loads(line)
            done[r['task_id']] = r
    return done


def cmd_run(a):
    profile = next(x for x in server.config()['profiles'] if x['id'] == a.judge)
    records = [json.loads(l) for l in (LOGS / f'{a.name}_results.jsonl').read_text(encoding='utf-8').splitlines()]
    records = [r for r in records if r.get('status') == 'success' and r['mode'] in a.modes and r.get('evidence')
               and (not a.repeats or r['repeat'] <= a.repeats)]
    out_path = LOGS / f'{a.name}_faith.jsonl'
    done = load_done(out_path)
    pending = [r for r in records if r['task_id'] not in done or (a.retry_errors and 'error' in done[r['task_id']])]
    random.Random(a.seed).shuffle(pending)
    if a.limit:
        pending = pending[:a.limit]
    print(f'{len(records)} RAG answers, {len(pending)} to evaluate with {profile["model"]}.')
    last = 0.0
    with out_path.open('a', encoding='utf-8') as f:
        for i, r in enumerate(pending, 1):
            n_passages = len(r['evidence'])
            cites = [int(n) for n in re.findall(r'\[(\d+)\]', r['answer'])]
            rec = {'task_id': r['task_id'], 'question_id': r['question_id'], 'model': r['model'], 'condition': r['mode'],
                   'repeat': r['repeat'], 'faith_version': FAITH_VERSION, 'judge_model': profile['model'],
                   'n_passages': n_passages, 'citations_total': len(cites),
                   'citations_valid': sum(1 for n in cites if 1 <= n <= n_passages),
                   'cited_source_ids': sorted({r['evidence'][n - 1]['metadata'].get('source_id') for n in cites if 1 <= n <= n_passages}),
                   'judged_at': time.strftime('%Y-%m-%dT%H:%M:%S')}
            messages = [{'role': 'system', 'content': RUBRIC},
                        {'role': 'user', 'content': f"EVIDENCE PASSAGES:\n{evidence_block(r)}\n\nQUESTION:\n{r['question']}\n\nANSWER:\n{r['answer']}"}]
            time.sleep(max(0, a.interval - (time.time() - last)))
            last = time.time()
            try:
                for attempt in range(2):
                    text, usage, meta, _raw, _info = server.generate_with_retry(profile, messages, 6000, [])
                    try:
                        rec['claims'] = parse(text)
                        break
                    except (ValueError, KeyError, TypeError, AttributeError) as e:
                        if attempt:
                            raise
                rec['judge_usage'] = server.usage_summary(usage, meta)
                c = rec['claims']
                print(f"[{i}/{len(pending)}] {r['task_id']}: claims {len(c)} supported {sum(x['label'] == 'supported' for x in c)}"
                      f" contradicted {sum(x['label'] == 'contradicted' for x in c)} cites {rec['citations_valid']}/{rec['citations_total']}")
            except Exception as e:
                rec['error'] = str(e)[:200]
                print(f"[{i}/{len(pending)}] {r['task_id']}: ERROR {rec['error']}")
            f.write(json.dumps(rec, ensure_ascii=False) + '\n')
            f.flush()


def cmd_summary(a):
    rows = [r for r in load_done(LOGS / f'{a.name}_faith.jsonl').values() if 'claims' in r]
    groups = defaultdict(list)
    for r in rows:
        groups[(r['model'], r['condition'])].append(r)
        groups[('pooled', r['condition'])].append(r)
    out = []
    for (m, c), rs in sorted(groups.items()):
        def share(label):
            return statistics.mean(sum(x['label'] == label for x in r['claims']) / len(r['claims']) for r in rs)
        assessable = [r for r in rs if any(x['label'] != 'unassessable' for x in r['claims'])]
        faith = statistics.mean(sum(x['label'] == 'supported' for x in r['claims']) / sum(x['label'] != 'unassessable' for x in r['claims'])
                                for r in assessable) if assessable else None
        cited = [x for r in rs for x in r['claims'] if x['citation_supports'] is not None]
        out.append({'model': m, 'condition': c, 'answers': len(rs), 'mean_claims': round(statistics.mean(len(r['claims']) for r in rs), 2),
                    'faithfulness_supported_of_assessable': round(faith, 3) if faith is not None else '',
                    'share_supported': round(share('supported'), 3), 'share_unsupported': round(share('unsupported'), 3),
                    'share_contradicted': round(share('contradicted'), 3), 'answers_with_contradiction': sum(any(x['label'] == 'contradicted' for x in r['claims']) for r in rs),
                    'answers_with_citations': sum(r['citations_total'] > 0 for r in rs),
                    'citation_validity': round(sum(r['citations_valid'] for r in rs) / max(1, sum(r['citations_total'] for r in rs)), 3),
                    'cited_claims_supported_by_citation': round(sum(x['citation_supports'] for x in cited) / len(cited), 3) if cited else '',
                    'claims_missing_limitation': sum(x['dated_or_limited'] for r in rs for x in r['claims'])})
    path = LOGS / f'{a.name}_faith_summary.csv'
    with path.open('w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=list(out[0])); w.writeheader(); w.writerows(out)
    for r in out:
        print(f"{r['model']:<9}{r['condition']:<13}n={r['answers']:<4} faith {r['faithfulness_supported_of_assessable']}  contradicted {r['share_contradicted']}"
              f"  cite valid {r['citation_validity']}  cite supports {r['cited_claims_supported_by_citation']}")
    print('Saved', path.relative_to(ROOT))


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    run = sub.add_parser('run')
    run.add_argument('--name', required=True)
    run.add_argument('--judge', default='gpt_judge')
    run.add_argument('--repeats', type=int, default=0, help='only evaluate repeats <= this number (0 = all)')
    run.add_argument('--interval', type=float, default=1.0)
    run.add_argument('--modes', nargs='+', default=list(RAG_MODES), choices=RAG_MODES)
    run.add_argument('--limit', type=int)
    run.add_argument('--seed', type=int, default=20261021)
    run.add_argument('--retry-errors', action='store_true')
    sub.add_parser('summary').add_argument('--name', required=True)
    a = ap.parse_args()
    {'run': cmd_run, 'summary': cmd_summary}[a.cmd](a)


if __name__ == '__main__':
    main()
