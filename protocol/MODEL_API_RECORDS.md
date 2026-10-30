# Model and API records

Values as reported in the final report (Section 6.2, Table 7, Section 7.9). The exact request of every call, the model name
returned by the provider, token usage, finish reason and retry information are stored per call in
`data/experiments/formal/test_exp2_results_public.jsonl` and `data/experiments/preliminary/test_final_results_public.jsonl`.

## Models

| Role | Model (API identifier) | Provider | Price per 1M tokens (input / output) | Settings |
|---|---|---|---|---|
| Tested | claude-haiku-5-5 | Anthropic | US$0.10 / 0.50 | thinking disabled; provider default sampling |
| Tested | gemini-3.6-flash | Google | US$0.30 / 2.50 | reasoning_effort none; provider default sampling |
| Tested | deepseek-flash | DeepSeek | US$0.30 / 1.20 | thinking off; provider default sampling |
| Judge | gpt-5.4-mini-2026-03-17 | OpenAI | US$0.75 / 4.50 | low reasoning |

- Prices are list prices at the time of the experiment (October 2026).
- Hidden reasoning was switched off for the three tested models and checked before each run (`hidden_reasoning_tokens` in the logs).
- Temperature and top-p were not sent. Claude Haiku 5.5 rejects non-default temperature.
- `gemini-3.5-flash` requests were routed by Google to `gemini-3.6-flash`, so the explicit `gemini-3.6-flash` identifier was used.
  Routing record: https://ai.google.dev/gemini-api/docs/deprecations

## Local models

| Use | Model | Revision / source |
|---|---|---|
| Embeddings | BAAI/bge-small-en-v1.5 (384 dimensions) | https://huggingface.co/BAAI/bge-small-en-v1.5 |
| Reranker | cross-encoder/ms-marco-MiniLM-L6-v2 | revision 233902d25c440f23af6f7d6e94d2946bac0bee0a, https://huggingface.co/cross-encoder/ms-marco-MiniLM-L6-v2 |

## Cost of the formal experiment (list prices)

| Item | Cost |
|---|---|
| 1,800 answers | US$1.50 (Claude US$0.33, DeepSeek US$0.53, Gemini US$0.64) |
| Accuracy scoring | US$3.87 |
| Faithfulness evaluation | US$4.93 |
| **Total** | **US$10.29** |

## API keys

Keys are read from environment variables (`ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `OPENAI_API_KEY`; see `data/config/config.json`)
or entered on the settings page and kept in memory only. No key is stored in this repository or in any log.
