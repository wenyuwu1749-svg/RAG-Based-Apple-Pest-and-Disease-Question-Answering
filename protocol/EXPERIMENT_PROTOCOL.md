# EXPERIMENT_PROTOCOL — formal experiment (FROZEN 2026-10-21, git 39d1ef301d95)

Wording: the earlier complete run (450 answers on the same 50 test questions) is called the **preliminary experiment** (EN: preliminary experiment); problems found in it were fixed, and this run is the **formal experiment** (internal code labels v8 / v9). The 24-answer check on two development questions is called the **smoke test**, not a pilot, to avoid confusion.
Approved by the team: R1 reranker placement, decision A1 (headers-only ablation), budget option F1 (faithfulness for standard and efficient RAG, all repeats). Smoke test (2 dev questions, 24 answers, US$0.17) passed with zero failures.

Historical baseline v8 (`dev_final3`, `dev_v8`, `test_final`, judge-v4, `analyze_results.py`) is kept unchanged. v9 writes only new files (`pilot_v9_*`, `test_exp2_*`). This protocol is frozen, with hashes recorded in the plan file, immediately before the formal run, and is not changed after test results are seen.

## Research questions (unchanged from the proposal)
RQ1 accuracy RAG vs non-RAG; RQ2 token-efficient vs standard RAG (tokens, latency, accuracy); RQ3 differences across LLMs and question types.

## Conditions (decision A1)
| Code | Condition | Evidence |
|---|---|---|
| A | non_rag | none |
| B | standard | reranked Top-6 + same-source management expansion, full headers |
| Headers-only | headers_only (ablation) | same passages as B, compact headers, nothing removed |
| C | efficient | same passages as B, compact headers + near-duplicate removal (Jaccard > 0.85) + relevance margin 0.05 on cosine score (expansion passages exempt); budget 4000 estimated tokens as safety cap |

The headers-only condition was added because offline analysis of the v8 **test** contexts showed that the relevance margin removed 8 gold passages that the development set had not revealed. The margin was **not** re-tuned on the test set; the headers-only condition measures the effect directly.

## Changes from the submitted proposal (approved by the team 2026-10-21)
| Proposal | v9 | Reason |
|---|---|---|
| Reranking only in the token-efficient condition | Reranker applied to **both** RAG conditions (decision R1) | B and C then differ only in how the same evidence is presented, so RQ2 is not confounded with better retrieval |
| Evidence compression | Not used; passages are never shortened | Development runs showed sentence compression removed facts |
| Evidence budget | Safety cap only (4,000 estimated tokens), never binding in practice | as above |
| Concise answer structure in the efficient condition | Not used; identical answer instructions and output limit | would be an uncontrolled confounder |
| Faithfulness, citation quality | Evaluated automatically for RAG conditions | proposal integrity measures |
| Blinded human scoring | 60-answer stratified sample scored by all three members | calibration of the automatic judge |

## Frozen settings
| Item | Value |
|---|---|
| Corpus | corpus-v1-20261014, hash 412c2b17… (2,044 chunks) |
| Embedding | BAAI/bge-small-en-v1.5, 384-d, query prefix on queries only, exact cosine |
| Reranker | cross-encoder/ms-marco-MiniLM-L6-v2, revision 233902d25c440f23af6f7d6e94d2946bac0bee0a, local CPU, dense pool 10 → Top-6 (chosen on dev: hit@6 16→18/20, MRR 0.518→0.679, +0.28 s) |
| Prompt | v9-rerank-shared-caution: identical agricultural caution sentence in all conditions; RAG conditions add grounding + citation [n] + "state what is missing" |
| Output limit | 1,024 tokens, identical for all conditions; no answer-length instruction difference between conditions |
| Models | claude-haiku-5-5, gemini-3.6-flash, deepseek-flash; thinking disabled; temperature and top-p are not sent, so each provider's defaults apply (Claude Haiku 5.5 rejects non-default temperature); the request payload is stored with every record |
| Repeats | 3 independent requests per model × condition × question; each stored separately; order shuffled by plan seed |
| Retry | HTTP 429/5xx: waits 5, 15, 30 s; waits and failed attempts logged separately |
| Accuracy judge | gpt-5.4-mini-2026-03-17, low reasoning, judge-v5-nz-applicability (v4 + New Zealand applicability rule); blind to model/condition; citations stripped |
| Faithfulness / citation | faith-v1 (claim-level supported / unsupported / contradicted / unassessable; citation validity by code; citation support by judge), RAG conditions only |
| Statistics | `analyze_results_v2.py`: repeats averaged within model×question×condition; question-level paired bootstrap, 10,000 draws, percentile 95% CI, seed 20261021; pooled = per-question mean over models |

## Timing definitions (time.perf_counter, monotonic)
embedding, search, rerank, expansion, retrieval (= sum of these), optimization (efficient filtering), prompt (prompt construction), generation (successful API attempt only); end_to_end from `run_one` start to record completion; service time = end_to_end − retry waits − failed attempts. Network and provider queueing are inside generation and cannot be separated.

## Runs
| Run | Questions | Calls | Purpose |
|---|---|---|---|
| pilot_v9 | 2 **dev** questions (D001, D016) × 3 models × 4 conditions × 1 | 24 answers + 24 accuracy + ~12 faithfulness | check models, logs, costs; no tuning on test |
| test_exp2 | 50 test × 3 × 4 × 3 | 1,800 answers + 1,800 accuracy + 900 faithfulness (standard, efficient) | formal |

## Human evaluation
Stratified sample of 60 repeat-1 answers from test_exp2 (5 per model × condition stratum), all three members score the same 60 blind (see HUMAN_EVALUATION_INSTRUCTIONS.md). Agreement: exact, within-one, quadratic-weighted Cohen's kappa, confusion matrices, rater vs judge.

## Known limitation of blinding
Citation markers are removed before judging, but RAG answers often contain phrases such as "based on the provided evidence", so the judge (and human raters) may still infer that an answer came from a RAG condition. This cannot be removed without editing answers and is reported as a limitation.

## Stop rules
No parameter change after test_exp2 starts. Failures are retried only with `--retry-errors`; failure records are never deleted. If a model becomes unavailable, the run stops and the user is asked; no silent substitution.
