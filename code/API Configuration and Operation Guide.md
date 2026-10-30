# Model API keys, configuration and run guide

The project compares 3 tested models and uses 1 further model as the judge. The configuration is preset in `data/config/config.json`;
you only need to obtain the keys and make them available to the program.

| Role | Profile | Model ID | Interface |
|---|---|---|---|
| Tested | `claude` | `claude-haiku-5-5` | Official Anthropic Python library |
| Tested | `gemini` | `gemini-3.6-flash` | OpenAI-compatible API |
| Tested | `deepseek` | `deepseek-flash` | OpenAI-compatible API |
| Judge | `gpt_judge` | `gpt-5.4-mini-2026-03-17` | OpenAI-compatible API |

"Thinking" is switched off for all three tested models (`reasoning_effort = none`) so that tokens and time are comparable; the judge uses light
reasoning (`low`) so that its point-by-point verdicts agree with its final score. The judge comes from a different company than the tested models.

> Security: an API key is a password. Never post it in a chat or group, and never put it into a file, screenshot or report. The program uses keys
> only in memory or from environment variables and never writes them to logs or configuration.

## 1. Obtain keys

| Platform | Website | Cost | Steps |
|---|---|---|---|
| Anthropic (Claude) | console.anthropic.com | Prepaid credit, minimum about US$5; **do not enable auto-reload** | Sign in → Billing → add credit → API Keys → Create Key → copy only the string starting with `sk-ant-` |
| Google Gemini | aistudio.google.com | The free tier allows about 20 requests per day, which is not enough; billing needs a NZ$10 prepayment, **switch off auto top-up** | Get API key → Set up billing |
| DeepSeek | platform.deepseek.com | Prepaid credit of about CNY 10 | Top up → API Keys → Create |
| OpenAI (judge) | platform.openai.com | Prepaid US$10; set a monthly limit under Limits | Billing → add credit → API keys → Create new secret key |

Prices are those shown in each provider's console. The formal experiment cost US$10.29 at list prices (see `protocol/MODEL_API_RECORDS.md`).

## 2. Set the keys

Open PowerShell and run each line (put only the key itself inside the quotes):

```powershell
setx ANTHROPIC_API_KEY "sk-ant-your-Claude-key"
setx GEMINI_API_KEY "your-Gemini-key"
setx DEEPSEEK_API_KEY "sk-your-DeepSeek-key"
setx OPENAI_API_KEY "sk-your-OpenAI-key"
```

**Close and reopen** PowerShell for the variables to take effect, then run `cls` so that no key appears in a screenshot. Claude also needs the
official library (if Windows blocks pip.exe, use this form):

```powershell
python -m pip install anthropic
```

## 3. Check connectivity

In the project root run:

```bash
python code/tools/check_models.py
```

All four profiles should show `OK`; the tested models should show `no hidden reasoning tokens` and the judge "reasoning tokens (expected …)".
Add `--list gemini` to list the model IDs available to that key.

## 4. Batch experiment and scoring

```bash
python code/tools/run_experiment.py plan --name test_final --bank data/eval/questions/test_questions.xlsx --models claude gemini deepseek
python code/tools/run_experiment.py run --name test_final
python code/tools/run_experiment.py summary --name test_final
python code/tools/judge_answers.py run --name test_final --bank data/eval/questions/test_questions.xlsx
python code/tools/judge_answers.py summary --name test_final
```

- `plan` records the hashes of the question bank, corpus and code and all settings; if the code, question bank or corpus changes afterwards,
  `run` refuses to start (`--allow-changes` is for development only).
- `run` and scoring can be stopped with Ctrl+C and resumed by running the same command; failed tasks are re-run with `--retry-errors`.
- Results are in `data/logs/`: `<name>_summary.csv` (speed and tokens), `<name>_answers.csv` (all answers) and `<name>_scores.csv`
  (judge scores; the `human_*` columns are for manual spot checks).

## 5. Start the Q&A web page

- Double-click `code\apple_rag_lab\Start_Apple_QA.cmd`, or run `python code/apple_rag_lab/launcher.py`.
- The embedding model, index and reranker are loaded first (about 15 seconds), then the page opens. Keep the command window open; Ctrl+C stops it.
- The web page is for demonstration and single questions; the formal experiment uses only the batch scripts above.

## 6. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `API HTTP 401` | Wrong key or not yet active: check that only the key was copied and that the window was reopened after setx |
| `API HTTP 402` / insufficient balance | No credit or credit used up on that platform |
| `API HTTP 404` | Wrong or retired model name: check with `check_models.py --list <profile>` |
| `API HTTP 429 [quota=…PerDay…]` | Daily quota used up (common on free tiers); run again the next day or enable billing |
| `API HTTP 429 [retry-after=…]` | Short-term rate limit; the scoring script waits for the given time and continues |
| Certificate not trusted | The network is intercepting HTTPS (e.g. a campus firewall); use another network and never disable certificate checks |
| Windows blocks `pip.exe` | Use `python -m pip install …`; do not disable system security features |
| Port already in use at start-up | The program is already running: open it in the browser, or use `python launcher.py --port 8767` |
