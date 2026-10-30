"""Score experiment answers against the question bank with an LLM judge (per-point grading).

python code/tools/judge_answers.py run --name dev_final3 --bank data/eval/questions/dev_questions.xlsx
python code/tools/judge_answers.py summary --name dev_final3

Reads data/logs/<name>_answers.csv (from run_experiment.py summary) and writes
data/logs/<name>_judged.jsonl (one line per answer; resumable) and <name>_scores.csv.

Metrics per answer:
  score           primary: overall 0-4 from the judge, guided by the per-point verdicts
  coverage        supporting detail: share of required points covered (full 1 / partial 0.5 / missing 0)
  major_error     any listed major error committed
  contradictions  claims that contradict the reference (count)

The judge sees only the question, the reference material and the answer — never the
model name or condition. Citation markers like [1] are removed so RAG answers are not
recognisable by their format alone. The judge must not be one of the tested models.
"""
import argparse
import csv
import hashlib
import json
import random
import re
import sys
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'code' / 'apple_rag_lab'))
sys.path.insert(0, str(ROOT / 'code' / 'tools'))
import server  # noqa: E402
import question_bank as qb  # noqa: E402

JUDGE_VERSION = 'judge-v5-nz-applicability'  # v4 scores of the historical runs are kept unchanged
RUBRIC = """You are grading an answer to an apple pest and disease question from a grower.
Use the reference material below as the standard for what a good answer contains.

Work in this order:
1. For EACH required point, decide: "full" (stated correctly), "partial" (mentioned but incomplete,
   vague or slightly inaccurate) or "missing" (absent or wrong).
   EQUIVALENT ADVICE COUNTS: if the answer gives different advice that serves the same purpose and is
   correct and specific (for example another region's correct spray timing, a different valid monitoring
   method, or another accepted control measure for the same problem), grade that point "full" or "partial"
   as if it matched. Mark "missing" only when the answer offers nothing correct for that purpose.
   Equivalent advice must suit the question's region: if the question is about New Zealand, overseas
   spray products, rates or timings count only if the answer clearly presents them as overseas guidance
   to be checked locally; presenting them as New Zealand advice is a major error.
2. List the numbers of any listed MAJOR ERRORS the answer commits.
3. List specific claims in the answer that CONTRADICT the reference material (short quotes, max 5).
   Do not list claims that are merely extra, equivalent or absent from the reference.
4. Give an overall score 0-4. The core answer is the diagnosis or main fact the grower asked about
   (for a partly answerable or unanswerable question: handling the limits appropriately).
   4 = core answer correct; advice complete and correct.
   3 = core answer correct; the main advice correct, only secondary details missing.
   2 = core answer correct, but advice sparse or generic.
   1 = core answer uncertain or only partly correct, but some useful correct information.
   0 = wrong core answer, any major error, or no useful content.

For an unanswerable or partly answerable question, appropriately stating the limits of the
available information counts as a required point; confidently inventing specifics is a major error.
Extra correct detail is neither rewarded nor penalised. Ignore writing style, length and formatting.
Do NOT reward or penalise citations, source names or mentions of "the evidence": grade the content only.
Where the reference describes what "the evidence" or "the corpus" lacks, the matching requirement is that
the answer does not present unsupported specifics as established and acknowledges uncertainty.

Reply with JSON only, no other text:
{"points": [{"n": 1, "verdict": "full|partial|missing"}, ...],
 "major_errors": [<numbers>], "contradictions": ["<claim>", ...],
 "score": <0-4>, "reason": "<one sentence>"}"""
CREDIT = {'full': 1.0, 'partial': 0.5, 'missing': 0.0}


def paths(name, tag=''):
    logs = server.DATA / 'logs'
    suffix = f'_{tag}' if tag else ''
    return {'answers': logs / f'{name}_answers.csv', 'judged': logs / f'{name}_judged{suffix}.jsonl',
            'scores': logs / f'{name}_scores{suffix}.csv'}


def split_list(text):
    return [p.strip() for p in (text or '').split('|') if p.strip()]


def strip_citations(text):
    return re.sub(r'\s*\[(\d+(\s*[,\-–]\s*\d+)*)\]', '', text or '')


def judge_messages(q, answer):
    points, errors = split_list(q.get('required_points')), split_list(q.get('major_errors'))
    ref = (f"QUESTION:\n{q['question_en']}\n\nANSWERABILITY: {q.get('answerability')}\n\n"
           f"REFERENCE ANSWER:\n{q['reference_answer_en']}\n\nREQUIRED POINTS:\n"
           + '\n'.join(f'{i}. {p}' for i, p in enumerate(points, 1))
           + '\n\nMAJOR ERRORS:\n' + ('\n'.join(f'{i}. {e}' for i, e in enumerate(errors, 1)) or '(none listed)'))
    if q.get('acceptable_partial'):
        ref += f"\n\nPARTLY ANSWERABLE NOTE:\n{q['acceptable_partial']}"
    messages = [{'role': 'system', 'content': RUBRIC},
                {'role': 'user', 'content': ref + f'\n\nANSWER TO GRADE:\n{strip_citations(answer)}'}]
    return messages, len(points), len(errors)


def parse(text, n_points, n_errors):
    m = re.search(r'\{.*\}', text or '', re.S)
    data = json.loads(m.group(0))
    score = int(data['score'])
    if not 0 <= score <= 4:
        raise ValueError('score out of range')
    verdicts = {}
    for x in data.get('points') or []:
        n, v = int(x.get('n', 0)), str(x.get('verdict', '')).lower()
        if 1 <= n <= n_points and v in CREDIT:
            verdicts[n] = v
    if len(verdicts) != n_points:
        raise ValueError(f'judge graded {len(verdicts)} of {n_points} points')
    errors = sorted({int(x) for x in data.get('major_errors') or [] if 1 <= int(x) <= n_errors})
    return {'coverage': round(sum(CREDIT[v] for v in verdicts.values()) / n_points, 4),
            'point_verdicts': [verdicts[n] for n in range(1, n_points + 1)], 'n_points': n_points,
            'score': score, 'major_errors': errors, 'major_error': bool(errors),
            'contradictions': [str(c)[:200] for c in data.get('contradictions') or []][:5],
            'reason': str(data.get('reason', ''))[:400]}


def ask_judge(profile, messages):
    """One judge call; returns (text, usage summary). Claude goes through the Anthropic SDK."""
    if profile['adapter'] != 'anthropic':
        text, usage, meta, _raw, _info = server.generate_with_retry(profile, messages, 4000, [])
        return text, server.usage_summary(usage, meta)
    import anthropic
    client = anthropic.Anthropic(max_retries=5)  # key from ANTHROPIC_API_KEY; SDK retries 429/5xx
    try:
        response = client.messages.create(
            model=profile['model'], max_tokens=2000,
            # grading needs no long reasoning: thinking off keeps cost low and output stable
            thinking={'type': 'disabled'}, output_config={'effort': 'low'},
            system=messages[0]['content'], messages=messages[1:])
    except anthropic.RateLimitError as e:
        raise ValueError(f"API HTTP 429 [retry-after={e.response.headers.get('retry-after', '60')}]") from None
    if response.stop_reason == 'refusal':
        raise ValueError('judge refused')
    text = ''.join(b.text for b in response.content if b.type == 'text')
    u = response.usage
    return text, {'input_tokens': u.input_tokens, 'output_tokens': u.output_tokens,
                  'total_tokens': u.input_tokens + u.output_tokens, 'hidden_reasoning_tokens': None,
                  'cached_input_tokens': u.cache_read_input_tokens, 'truncated': response.stop_reason == 'max_tokens'}


def load_judged(path):
    out = {}
    if path.exists():
        for line in path.read_text(encoding='utf-8').splitlines():
            if line.strip():
                r = json.loads(line)
                out[r['task_id']] = r
    return out


def cmd_run(args):
    p = paths(args.name, args.tag)
    profile = next(x for x in server.config()['profiles'] if x['id'] == args.judge)
    bank = {r['question_id']: r for r in qb.read_rows(ROOT / args.bank)}
    answers = list(csv.DictReader(p['answers'].open(encoding='utf-8-sig')))
    if args.models:
        answers = [a for a in answers if a['model'] in args.models]
    if profile.get('vendor', args.judge) in {a['model'] for a in answers}:
        raise SystemExit(f'Judge {args.judge} is also a tested model — choose another judge.')
    done = load_judged(p['judged'])
    pending = [a for a in answers if a['status'] == 'success' and a['answer'].strip()
               and (a['task_id'] not in done or (args.retry_errors and 'error' in done[a['task_id']]))]
    random.Random(args.seed).shuffle(pending)  # mix models/conditions so drift over time is not systematic
    if args.limit:
        pending = pending[:args.limit]
    bank_sha = hashlib.sha256((ROOT / args.bank).read_bytes()).hexdigest()
    print(f'{len(answers)} answers, {len(pending)} to judge with {profile["model"]}. Ctrl+C stops safely; run again to resume.')
    last = 0.0
    with p['judged'].open('a', encoding='utf-8') as out:
        for i, a in enumerate(pending, 1):
            q = bank.get(a['question_id'])
            if not q:
                print(f'[{i}] {a["task_id"]}: question not in bank, skipped')
                continue
            messages, n_points, n_errors = judge_messages(q, a['answer'])
            time.sleep(max(0, args.interval - (time.time() - last)))
            last = time.time()
            rec = {'task_id': a['task_id'], 'question_id': a['question_id'], 'model': a['model'],
                   'condition': a['condition'], 'repeat': a['repeat'], 'judge': profile['id'],
                   'judge_model': profile['model'], 'judge_version': JUDGE_VERSION, 'bank_sha256': bank_sha,
                   'judged_at': time.strftime('%Y-%m-%dT%H:%M:%S')}
            try:
                for attempt in range(2):  # one re-ask if the judge returns malformed JSON
                    text, usage = ask_judge(profile, messages)
                    try:
                        rec.update(parse(text, n_points, n_errors))
                        break
                    except (ValueError, KeyError, TypeError, AttributeError) as e:
                        if attempt:
                            raise
                        print(f'   malformed judge reply ({str(e)[:40]}), asking again')
                        time.sleep(args.interval)
                rec['judge_attempts'] = attempt + 1
                rec['judge_usage'] = usage
                print(f'[{i}/{len(pending)}] {a["task_id"]}: coverage {rec["coverage"]:.2f} score {rec["score"]} '
                      f'contra {len(rec["contradictions"])}  {rec["reason"][:55]}')
            except Exception as e:
                wait = re.search(r'retry-after=(\d+)', str(e))
                if wait and args.wait_limits:
                    # provider token/day window exhausted: wait it out instead of failing every answer
                    seconds = int(wait.group(1)) + 5
                    print(f'[{i}/{len(pending)}] rate limit reached; waiting {seconds} s, then continuing ...', flush=True)
                    time.sleep(seconds)
                    pending.append(a)
                    continue
                rec['error'] = str(e)[:200]
                print(f'[{i}/{len(pending)}] {a["task_id"]}: ERROR {rec["error"]}')
            out.write(json.dumps(rec, ensure_ascii=False) + '\n')
            out.flush()


def cmd_summary(args):
    p = paths(args.name, args.tag)
    judged = [r for r in load_judged(p['judged']).values() if 'coverage' in r]
    answers = {a['task_id']: a for a in csv.DictReader(p['answers'].open(encoding='utf-8-sig'))}
    with p['scores'].open('w', newline='', encoding='utf-8-sig') as f:
        w = csv.writer(f)
        w.writerow(['task_id', 'question_id', 'model', 'condition', 'score', 'coverage', 'major_error', 'contradictions',
                    'point_verdicts', 'reason', 'human_coverage', 'human_score', 'human_note', 'question', 'answer'])
        for r in sorted(judged, key=lambda r: (r['question_id'], r['model'], r['condition'])):
            a = answers.get(r['task_id'], {})
            w.writerow([r['task_id'], r['question_id'], r['model'], r['condition'], r['score'], r['coverage'],
                        r['major_error'], ' | '.join(r['contradictions']), ' '.join(r['point_verdicts']), r['reason'],
                        '', '', '', a.get('question', ''), a.get('answer', '')])
    groups = defaultdict(list)
    for r in judged:
        groups[(r['model'], r['condition'])].append(r)
    mean = lambda xs: sum(xs) / len(xs)
    print(f"{'model':<10}{'condition':<11}{'n':>4}{'score 0-4':>10}{'coverage':>10}{'major err':>11}{'contra/ans':>11}")
    for (m, c), rs in sorted(groups.items()):
        print(f"{m:<10}{c:<11}{len(rs):>4}{mean([r['score'] for r in rs]):>10.2f}{100 * mean([r['coverage'] for r in rs]):>9.0f}%"
              f"{100 * mean([r['major_error'] for r in rs]):>10.0f}%{mean([len(r['contradictions']) for r in rs]):>11.2f}")
    print('score 0-4 = primary metric; coverage = share of required points covered (supporting detail).')
    print(f'Saved {p["scores"].relative_to(ROOT)} (human_* columns left blank for the human check).')


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='cmd', required=True)
    run = sub.add_parser('run')
    run.add_argument('--name', required=True)
    run.add_argument('--bank', required=True)
    run.add_argument('--judge', default='gpt_judge')
    run.add_argument('--interval', type=float, default=2.0, help='seconds between judge calls')
    run.add_argument('--limit', type=int)
    run.add_argument('--seed', type=int, default=20261020)
    run.add_argument('--retry-errors', action='store_true')
    run.add_argument('--no-wait', dest='wait_limits', action='store_false',
                     help='record rate-limit errors instead of waiting for the provider window to reset')
    run.add_argument('--models', nargs='*', help='only judge answers from these tested models')
    run.add_argument('--tag', default='', help='suffix for the judged/scores files, e.g. gpt')
    summ = sub.add_parser('summary')
    summ.add_argument('--name', required=True)
    summ.add_argument('--tag', default='')
    args = parser.parse_args()
    {'run': cmd_run, 'summary': cmd_summary}[args.cmd](args)


if __name__ == '__main__':
    main()
