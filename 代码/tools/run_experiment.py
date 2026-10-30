"""Batch experiment runner for the three-condition comparison (no RAG / standard RAG / token-efficient RAG).

Typical use (from the project root):
  python 代码/tools/run_experiment.py plan    --name dev_pilot --bank data/eval/dev_questions.xlsx --models gemini deepseek
  python 代码/tools/run_experiment.py run     --name dev_pilot
  python 代码/tools/run_experiment.py status  --name dev_pilot
  python 代码/tools/run_experiment.py summary --name dev_pilot

plan     freezes the protocol (question bank hash, corpus hash, model settings, retrieval settings,
         prompt version, code hash, random seed) and a shuffled task list into data/logs/<name>_plan.json.
run      executes pending tasks in plan order; safe to stop with Ctrl+C and run again (resumes).
         Provider overload errors are retried inside each task; tasks that still fail can be rerun
         with --retry-errors (each attempt is kept). Keys come from environment variables only.
status   shows progress.
summary  writes <name>_summary.csv (per model x condition) and <name>_answers.csv (for scoring).
"""
import argparse
import csv
import hashlib
import json
import os
import random
import statistics
import sys
import time
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '代码' / 'apple_rag_lab'))
sys.path.insert(0, str(Path(__file__).resolve().parent))
import server  # noqa: E402
import question_bank as qb  # noqa: E402

MODES = server.MODES
# Minimum seconds between two requests to the same provider (free tiers are rate limited).
DEFAULT_INTERVALS = {'gemini': 4.5, 'deepseek': 0.5, 'openai': 0.5, 'claude': 1.0}


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def paths(name):
    logs = server.DATA / 'logs'
    return {'plan': logs / f'{name}_plan.json', 'results': logs / f'{name}_results.jsonl',
            'summary': logs / f'{name}_summary.csv', 'answers': logs / f'{name}_answers.csv'}


def load_results(path):
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding='utf-8').splitlines() if line.strip()]


def latest_by_task(results):
    latest = {}
    for r in results:
        latest[r['task_id']] = r
    return latest


def cmd_plan(args):
    p = paths(args.name)
    if p['plan'].exists():
        raise SystemExit(f'Plan already exists: {p["plan"]} (choose another --name; plans are never overwritten).')
    bank = Path(args.bank).resolve()
    rows = [r for r in qb.read_rows(bank) if r['status'] != 'rejected']
    if args.questions:
        rows = [r for r in rows if r['question_id'] in set(args.questions)]
    if not rows:
        raise SystemExit('No questions selected.')
    profiles = {x['id']: x for x in server.config()['profiles']}
    missing = [m for m in args.models if m not in profiles or not profiles[m].get('model')]
    if missing:
        raise SystemExit(f'Unknown or unconfigured model profiles: {missing}')
    chunks = server.corpus()
    state = server.dense_state()
    if args.retrieval == 'dense' and (not state or state['corpus_hash'] != server.corpus_hash(chunks)):
        raise SystemExit('Dense index missing or stale.')
    freeze = server.freeze_record()
    seed = args.seed if args.seed is not None else random.SystemRandom().randrange(2 ** 31)
    tasks = [{'task_id': f"{r['question_id']}|{m}|{mode}|r{k}", 'question_id': r['question_id'], 'model': m, 'mode': mode, 'repeat': k}
             for r in rows for m in args.models for mode in args.modes for k in range(1, args.repeats + 1)]
    random.Random(seed).shuffle(tasks)  # interleave models, conditions and repeats
    plan = {
        'name': args.name, 'created_at_utc': datetime.now(timezone.utc).isoformat(), 'seed': seed,
        'question_bank': {'path': str(bank.relative_to(ROOT)), 'sha256': sha(bank), 'question_ids': [r['question_id'] for r in rows]},
        'questions': {r['question_id']: {'question_en': r['question_en'], 'split': r['split'], 'question_type': r['question_type'],
                                         'topic_id': r['topic_id'], 'answerability': r['answerability'], 'style': str(r['notes']).split(' ')[0]} for r in rows},
        'models': {m: profiles[m] for m in args.models},  # snapshot used for every task; keys are never stored
        'modes': list(args.modes), 'repeats': args.repeats,
        'settings': {'retrieval': args.retrieval, 'top_k': args.top_k, 'budget': args.budget, 'relevance_margin': args.relevance_margin, 'management_expansion': not args.no_management_expansion, 'max_output': args.max_output, 'answer_language': 'en',
                     'reranker': not args.no_reranker, 'rerank_pool': args.rerank_pool},
        'reranker': None if args.no_reranker else {'model': server.RERANK_MODEL, 'revision': server.RERANK_REVISION,
                                                   'weights_sha256': sha(server.RERANK_DIR / 'model.safetensors')},
        'tool_sha256': {f: sha(ROOT / '代码' / 'tools' / f) for f in ('run_experiment.py', 'judge_answers.py', 'analyze_results_v2.py')},
        'corpus_hash': server.corpus_hash(chunks), 'corpus_freeze_version': (freeze or {}).get('version'),
        'embedding': {'model': server.config()['embedding'].get('model'), 'fingerprint': (state or {}).get('embedding_fingerprint')},
        'prompt_version': server.PROMPT_VERSION, 'server_code_sha256': sha(Path(server.__file__)),
        'retry_policy': {'transient_http': list(server.TRANSIENT_HTTP), 'waits_seconds': list(server.RETRY_WAITS)},
        'tasks': tasks,
    }
    server.write_json(p['plan'], plan)
    print(f"Plan {args.name}: {len(rows)} questions x {len(args.models)} models x {len(args.modes)} conditions x {args.repeats} repeats = {len(tasks)} tasks")
    print(f"Saved {p['plan'].relative_to(ROOT)} (seed {seed})")


def check_protocol(plan, chunks):
    problems = []
    if server.corpus_hash(chunks) != plan['corpus_hash']:
        problems.append('corpus changed since the plan was made')
    if sha(Path(server.__file__)) != plan['server_code_sha256']:
        problems.append('server.py changed since the plan was made')
    bank = ROOT / plan['question_bank']['path']
    if not bank.exists() or sha(bank) != plan['question_bank']['sha256']:
        problems.append('question bank file changed since the plan was made')
    return problems


def cmd_run(args):
    p = paths(args.name)
    plan = json.loads(p['plan'].read_text(encoding='utf-8'))
    chunks = server.corpus()
    problems = check_protocol(plan, chunks)
    if problems and not args.allow_changes:
        raise SystemExit('Protocol check failed: ' + '; '.join(problems) + '. Make a new plan, or use --allow-changes for development only.')
    for m, profile in plan['models'].items():
        if profile['adapter'] != 'demo' and not os.environ.get(profile.get('key_env', '')):
            raise SystemExit(f"No API key for {m}: set {profile.get('key_env')} (setx, then reopen PowerShell).")
    intervals = dict(DEFAULT_INTERVALS, **dict((k, float(v)) for k, v in (x.split('=', 1) for x in args.interval)))
    done = latest_by_task(load_results(p['results']))
    pending = [t for t in plan['tasks'] if t['task_id'] not in done or (args.retry_errors and done[t['task_id']]['status'] != 'success')]
    if args.limit:
        pending = pending[:args.limit]
    print(f"{len(plan['tasks'])} tasks in plan, {len(pending)} to run now. Ctrl+C stops safely; run again to resume.")
    if not pending:
        return
    print('Warming up embedding model ...', flush=True)
    server.warm_up()
    last_call = defaultdict(float)
    attempts = defaultdict(int)
    for r in load_results(p['results']):
        attempts[r['task_id']] += 1
    try:
        for n, task in enumerate(pending, 1):
            profile = plan['models'][task['model']]
            wait = intervals.get(task['model'], 1.0) - (time.monotonic() - last_call[task['model']])
            if wait > 0:
                time.sleep(wait)
            last_call[task['model']] = time.monotonic()
            attempts[task['task_id']] += 1
            q = plan['questions'][task['question_id']]
            extra = dict(task, attempt=attempts[task['task_id']], plan_name=plan['name'], split=q['split'],
                         question_type=q['question_type'], topic_id=q['topic_id'], answerability=q['answerability'], style=q['style'])
            record = server.run_one(q['question_en'], profile, task['mode'], plan['settings'], chunks, plan['name'], task['repeat'],
                                    log_path=p['results'], extra=extra)
            note = f"{record['end_to_end_seconds']:.1f}s in/out {record.get('input_tokens')}/{record.get('output_tokens')}"
            if record['status'] != 'success':
                note = 'ERROR ' + record.get('error', '')[:60]
            elif record.get('truncated'):
                note += ' TRUNCATED'
            print(f"[{n}/{len(pending)}] {task['task_id']}: {note}", flush=True)
    except KeyboardInterrupt:
        print('\nStopped. Completed tasks are saved; run the same command again to resume.')


def cmd_status(args):
    p = paths(args.name)
    plan = json.loads(p['plan'].read_text(encoding='utf-8'))
    done = latest_by_task(load_results(p['results']))
    counts = defaultdict(lambda: defaultdict(int))
    for t in plan['tasks']:
        r = done.get(t['task_id'])
        counts[(t['model'], t['mode'])]['planned'] += 1
        if r:
            counts[(t['model'], t['mode'])][r['status']] += 1
    print(f"{'model':<10}{'condition':<11}{'planned':>8}{'success':>8}{'error':>7}")
    for (m, mode), c in sorted(counts.items()):
        print(f"{m:<10}{mode:<11}{c['planned']:>8}{c['success']:>8}{c['error']:>7}")
    total_done = sum(1 for t in plan['tasks'] if done.get(t['task_id'], {}).get('status') == 'success')
    print(f"Successful tasks: {total_done}/{len(plan['tasks'])}")


def median(values):
    values = [v for v in values if v is not None]
    return round(statistics.median(values), 3) if values else ''


def cmd_summary(args):
    p = paths(args.name)
    plan = json.loads(p['plan'].read_text(encoding='utf-8'))
    results = latest_by_task(load_results(p['results']))
    groups = defaultdict(list)
    for r in results.values():
        groups[(r['model'], r['mode'])].append(r)
    def service_time(r):
        retries = r.get('retries') or {}
        return r['end_to_end_seconds'] - retries.get('retry_wait_seconds', 0) - retries.get('failed_attempt_seconds', 0)

    header = ['model', 'condition', 'tasks', 'success', 'errors', 'truncated', 'median_end_to_end_s', 'median_service_s', 'median_generation_s',
              'median_input_tokens', 'median_output_tokens', 'median_total_tokens', 'total_hidden_reasoning_tokens',
              'tasks_with_cache_hits', 'tasks_retried', 'total_retry_wait_s']
    lines = []
    for (m, mode), rs in sorted(groups.items()):
        ok = [r for r in rs if r['status'] == 'success']
        lines.append([m, mode, len(rs), len(ok), len(rs) - len(ok), sum(bool(r.get('truncated')) for r in ok),
                      median(r['end_to_end_seconds'] for r in ok), median(service_time(r) for r in ok), median(r['stages_seconds'].get('generation') for r in ok),
                      median(r.get('input_tokens') for r in ok), median(r.get('output_tokens') for r in ok), median(r.get('total_tokens') for r in ok),
                      sum(r.get('hidden_reasoning_tokens') or 0 for r in ok), sum(bool(r.get('cached_input_tokens')) for r in ok),
                      sum((r.get('retries') or {}).get('attempts', 1) > 1 for r in ok), round(sum((r.get('retries') or {}).get('retry_wait_seconds', 0) for r in ok), 1)])
    with p['summary'].open('w', newline='', encoding='utf-8-sig') as f:
        csv.writer(f).writerows([header] + lines)
    with p['answers'].open('w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(['task_id', 'question_id', 'model', 'condition', 'repeat', 'status', 'truncated', 'question', 'answer'])
        for t in plan['tasks']:
            r = results.get(t['task_id'])
            if r:
                w.writerow([t['task_id'], t['question_id'], t['model'], t['mode'], t['repeat'], r['status'], r.get('truncated'),
                            plan['questions'][t['question_id']]['question_en'], r.get('answer') or r.get('error', '')])
    print(f"{'model':<10}{'condition':<11}{'ok':>4}{'err':>5}{'trunc':>6}{'e2e s':>8}{'service s':>10}{'in tok':>8}{'out tok':>8}{'hidden':>7}{'cache':>6}{'retried':>8}")
    for row in lines:
        print(f"{row[0]:<10}{row[1]:<11}{row[3]:>4}{row[4]:>5}{row[5]:>6}{row[6]!s:>8}{row[7]!s:>10}{row[9]!s:>8}{row[10]!s:>8}{row[12]:>7}{row[13]:>6}{row[14]:>8}")
    print('e2e = including provider retry waits; service = excluding retry waits and failed attempts.')
    print(f"Saved {p['summary'].relative_to(ROOT)} and {p['answers'].relative_to(ROOT)}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest='command', required=True)
    plan = sub.add_parser('plan')
    plan.add_argument('--name', required=True)
    plan.add_argument('--bank', required=True)
    plan.add_argument('--models', nargs='+', required=True)
    plan.add_argument('--modes', nargs='+', default=list(MODES), choices=MODES)
    plan.add_argument('--repeats', type=int, default=1)
    plan.add_argument('--questions', nargs='*', help='only these question IDs')
    plan.add_argument('--retrieval', default='dense', choices=('dense',))
    plan.add_argument('--top-k', type=int, default=6)
    plan.add_argument('--budget', type=int, default=4000, help='safety cap only; the efficient condition keeps all passages that fit')
    plan.add_argument('--relevance-margin', type=float, default=0.05, help='efficient RAG drops whole passages scoring this far below the best (dense only)')
    plan.add_argument('--max-output', type=int, default=1024)
    plan.add_argument('--no-management-expansion', action='store_true', help='disable same-source management passages (ablation only)')
    plan.add_argument('--no-reranker', action='store_true', help='disable the cross-encoder reranker (historical v8 behaviour)')
    plan.add_argument('--rerank-pool', type=int, default=10)
    plan.add_argument('--seed', type=int)
    run = sub.add_parser('run')
    run.add_argument('--name', required=True)
    run.add_argument('--limit', type=int, help='run at most this many tasks now')
    run.add_argument('--retry-errors', action='store_true', help='rerun tasks whose latest attempt failed')
    run.add_argument('--interval', action='append', default=[], help='seconds between calls to a provider, e.g. gemini=6')
    run.add_argument('--allow-changes', action='store_true', help='development only: run even if corpus/code/bank changed')
    for name in ('status', 'summary'):
        sub.add_parser(name).add_argument('--name', required=True)
    args = parser.parse_args()
    {'plan': cmd_plan, 'run': cmd_run, 'status': cmd_status, 'summary': cmd_summary}[args.command](args)


if __name__ == '__main__':
    main()
