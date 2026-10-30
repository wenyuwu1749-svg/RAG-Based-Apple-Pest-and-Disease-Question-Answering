"""Check each configured model API before running experiments.

python code/tools/check_models.py                 # all providers with a key available
python code/tools/check_models.py --list openai   # also list the model IDs this key can use
python code/tools/check_models.py --ask           # type keys interactively (hidden, not saved)
python code/tools/check_models.py --model gemini=gemini-2.5-flash   # try another model without editing config
python code/tools/check_models.py --effort gemini=none              # try turning thinking off

For each provider: sends one tiny request and reports the model the API actually used,
latency, finish reason, token usage and any hidden reasoning ("thinking") tokens.
Keys are read from environment variables (OPENAI_API_KEY, DEEPSEEK_API_KEY,
GEMINI_API_KEY, GROQ_API_KEY) or typed with --ask; they are never written to disk.
"""
import argparse
import getpass
import json
import os
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'code' / 'apple_rag_lab'))
import server  # noqa: E402


def list_models(profile, key):
    req = Request(profile['base_url'].rstrip('/') + '/models', headers={'Authorization': 'Bearer ' + key, 'User-Agent': 'Apple-RAG-Lab/1.0', 'Accept': 'application/json'})
    with urlopen(req, timeout=30) as response:
        data = json.load(response).get('data', [])
    return sorted(m.get('id', '') for m in data)


def reasoning_tokens(usage):
    # Some providers report thinking explicitly; others (e.g. Gemini's OpenAI-compatible
    # endpoint) only show it as total_tokens exceeding prompt + completion.
    usage = usage or {}
    details = usage.get('completion_tokens_details') or {}
    reported = details.get('reasoning_tokens') or 0
    unexplained = (usage.get('total_tokens') or 0) - (usage.get('prompt_tokens') or 0) - (usage.get('completion_tokens') or 0)
    return max(reported, unexplained, 0)


def check(profile, key, show_list):
    print(f"\n== {profile['name']} ({profile['id']}) — configured model: {profile.get('model') or '(empty)'}")
    if show_list:
        try:
            ids = list_models(profile, key)
            print(f'   {len(ids)} models available to this key:')
            for i in range(0, len(ids), 4):
                print('     ' + '   '.join(ids[i:i + 4]))
        except (HTTPError, URLError, ValueError) as e:
            print(f'   could not list models: {e}')
    if not profile.get('model'):
        print('   -> fill in a model ID (see --list) in the web page "API settings", then run again.')
        return False
    server.SECRETS[profile['id']] = key
    payload_messages = [{'role': 'user', 'content': 'Reply with the single word OK.'}]
    if profile.get('reasoning_effort'):
        print(f"   reasoning_effort = {profile['reasoning_effort']}")
    started = time.perf_counter()
    for attempt in range(3):
        try:
            answer, usage, meta, raw = server.generate(profile, payload_messages, 256, [])
            break
        except Exception as e:
            transient = '503' in str(e) or '429' in str(e)
            if not transient or attempt == 2:
                print(f'   FAILED: {e}' + ('  (server busy / rate limited — try again later or another model)' if transient else ''))
                return False
            print(f'   busy ({e.args[0][:12]}), retrying in 10 s ...')
            time.sleep(10)
            started = time.perf_counter()
    seconds = time.perf_counter() - started
    print(f"   OK in {seconds:.2f}s | API model: {meta.get('model')} | finish: {meta.get('finish_reason')} | answer: {answer.strip()[:40]!r}")
    print(f"   usage: {json.dumps(usage)}")
    hidden = reasoning_tokens(usage)
    if usage is None:
        print('   WARNING: no usage returned — token measurement would be missing for this model.')
    elif hidden and profile.get('reasoning_effort') not in (None, '', 'none'):
        print(f'   {hidden} reasoning tokens (expected: reasoning_effort = {profile["reasoning_effort"]} is set on purpose).')
    elif hidden:
        print(f'   WARNING: {hidden} hidden reasoning ("thinking") tokens — try --effort {profile["id"]}=none (or low), or another model.')
    if meta.get('finish_reason') == 'length' or not answer.strip():
        print('   WARNING: answer empty or cut off by the output limit.')
    if usage is not None and not hidden:
        print('   usage returned; no hidden reasoning tokens reported.')
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--list', nargs='*', default=None, help='list available model IDs for these profile IDs (empty = all)')
    parser.add_argument('--ask', action='store_true', help='type keys interactively instead of environment variables')
    parser.add_argument('--model', action='append', default=[], help='override a model for this check only, e.g. gemini=gemini-2.5-flash')
    parser.add_argument('--effort', action='append', default=[], help='set reasoning_effort for this check only, e.g. gemini=none')
    args = parser.parse_args()
    profiles = [p for p in server.config()['profiles'] if p['adapter'] != 'demo']
    overrides = dict(x.split('=', 1) for x in args.model)
    profiles = [dict(p, model=overrides.get(p['id'], p.get('model'))) for p in profiles]
    efforts = dict(x.split('=', 1) for x in args.effort)
    profiles = [dict(p, reasoning_effort=efforts.get(p['id'], p.get('reasoning_effort'))) for p in profiles]
    ok = 0
    for profile in profiles:
        key = os.environ.get(profile.get('key_env', ''), '')
        if not key and args.ask:
            key = getpass.getpass(f"{profile['name']} API key (Enter to skip): ").strip()
        if not key:
            print(f"\n== {profile['name']}: no key ({profile.get('key_env')} not set) — skipped")
            continue
        show = args.list is not None and (not args.list or profile['id'] in args.list)
        ok += check(profile, key, show)
    print(f'\n{ok} provider(s) passed.')


if __name__ == '__main__':
    main()
