# AUDIT_REPORT — G6 Apple RAG system (stage 1, 2026-10-21)

Scope: code under `code/`, data under `data/`, the submitted proposal, the report draft at that time, and the Massey report guide. No system code was modified during this audit. No API call was made. A baseline backup with a SHA-256 manifest was created (108 files; not included in this repository).

## 1. Verification of the report's historical claims

| Claim in report | Evidence checked | Result |
|---|---|---|
| 250 sources, 2,044 chunks (199 PDF + 1,845 web) | `data/chunks/corpus.sqlite3`, `data/reports/corpus_verification.json`, freeze record | Verified (corpus hash 412c2b17…, freeze corpus-v1-20261014) |
| 20 dev / 50 test questions | `data/eval/questions/dev_questions.xlsx`, `test_questions.xlsx` (validator: 0 errors) | Verified; T043 has no gold chunk (unanswerable by design) |
| 3 LLMs × 3 conditions, 450 test answers | `data/experiments/preliminary/test_final_plan.json` (450 tasks), `test_final_results.jsonl` (450 records, 450 success, 0 duplicate task IDs) | Verified |
| 450 judged answers | `test_final_judged.jsonl` (450 with score) | Verified |
| Dev runs | `dev_final3` (180/180, judged 180 Haiku + 120 GPT), `dev_v8` (180/180, judged 180) | Verified |
| Repeats | All plans have `repeats = 1` | Report correctly states one call per item |
| Citations valid | 294/300 test RAG answers contain [n]; 0 invalid IDs (`invalid_citation_ids`) | Format-valid only; content support never evaluated |

## 2. Module-by-module review

| # | Module | Exists? | Location | Correct? | Proposal-consistent? | Issue / fairness note | Fix needed? | Affects old results? |
|---|---|---|---|---|---|---|---|---|
| 1 | Data collection & cleaning | Yes | `web_ingest.py`, `pdf_ingest.py`, `server.py:SourceHTML`, registers | Verified by `verify_corpus.py` | Yes | AI-assisted screening (disclosed) | No | No |
| 2 | Chunking | Yes | `server.py:section_chunks` (≤300 words), table rows kept whole | Yes | "semantic chunking" → section/sentence packing (acceptable wording) | — | No | No |
| 3 | Metadata | Yes | chunk `metadata` JSON | Yes; 321 chunks no date (documented) | Yes | — | No | No |
| 4 | Embedding | Yes | `server.py:embed`, `local_model` (bge-small-en-v1.5, query prefix only on queries) | Yes | Yes | Embedding time not timed separately from search | P2 timing split | No (new runs only) |
| 5 | Vector retrieval | Yes | `retrieve`, `dense_scores` (exact cosine, NumPy) | Yes | Yes | — | No | No |
| 6 | Top-K | Yes | `top_k=6` | Yes | Yes | — | No | No |
| 7 | Management expansion | Yes | `expand_management` | Works; regex intent detection | Not in proposal (added) | Applies to B and C equally (fair) | Document as design addition | No |
| 8 | **Reranking** | **No** | — | — | **Proposal commits to evidence reranking** | Cosine order + relevance margin is not a reranker | **P0**: implement & evaluate on dev, or record justified deviation | Yes — B/C must be re-run if adopted |
| 9 | Standard RAG | Yes | `run_one` mode `standard` | Yes | Yes | Prompt forbids model knowledge ("Use only supplied evidence") | P1 see §3.1 | Interpretation |
| 10 | Token-efficient RAG | Yes | `efficient_context`, `evidence_text(compact=True)` | Works as coded | Partly: proposal says rerank + deduplicate + **compress** + **evidence budget** + **concise answer structure** | Budget never binds; no compression; no answer-length control | P0 (deviation record) / P3 | — |
| 11 | Context compression | **No** (removed in v6 after dev showed loss) | — | — | Deviation | Lossless design chosen deliberately; must be documented as a change | P0 documentation | No |
| 12 | Prompt construction | Yes | `prompts()` | Works | "Shared grounding prompt" | **Caution instructions (dates, regions, pesticide limits) given only to RAG conditions** → A vs B/C differ in more than evidence | P1 | Yes for new runs |
| 13 | LLM API integration | Yes | `generate`, `generate_anthropic`, retry | Yes | Yes | Sampling: temperature not sent for tested models (provider defaults; Claude Haiku 5.5 rejects non-default) | P2 document | No |
| 14 | Citation generation | Partly | prompt asks [n]; `invalid_citation_ids` | ID range only | Proposal: citations + evidence display | No check that cited passage supports claim | P0 (citation quality eval missing) | No (eval only) |
| 15 | Accuracy evaluation | Yes | `judge_answers.py` (GPT-5.4-mini, judge-v4) | Blind to model/condition; citations stripped | Automatic: yes; **blinded human: missing** | No explicit NZ-applicability rule in rubric | P0 human; P2 rubric | New rubric would need full re-score |
| 16 | Latency logging | Yes | `run_one` `perf_counter` (monotonic) | Yes | e2e wall-clock | Stages: retrieval (=embed+search+expansion), optimisation, generation; prompt build not timed; e2e includes retry waits (service time subtracts them) | P2 finer stages | No |
| 17 | Token accounting | Yes | `usage_summary` native fields | Yes; hidden reasoning detected | Yes | Within-model comparison enforced in report | No | No |
| 18 | Batch experiment | Yes | `run_experiment.py` (plan hashes, resume, retry) | Yes | Yes | Repeats supported but only 1 used | P0 repeats | New runs |
| 19 | Bootstrap analysis | Yes | `analyze_results.py` | **Pooled CI resamples 150 (model, question) units independently, ignoring that the 3 models share questions → pooled CIs too narrow** | Yes | Per-model CIs correct | **P1 fix** | Recompute only (no API) |
| 20 | Reproducibility & freeze | Yes | `freeze_corpus.py`, `verify_corpus.py`, plan hashes | Yes | Yes | Not a git repo; plan hashes server.py only (not judge/rubric file) | P2 | No |

## 3. Key findings

### 3.1 Prompt asymmetry between conditions (P1)
Non-RAG: "Use your existing knowledge. State uncertainty." RAG: "Use only supplied evidence … Respect source dates, regions and use limits. Historical pesticide statements … are not current recommendations." The regional and pesticide caution is therefore part of the B/C treatment, not only the evidence. Part of the A→B difference (e.g. fewer major errors) may come from these instructions. The "use only supplied evidence" rule also prevents a strong model from combining its own knowledge with evidence, which is a plausible reason why Gemini scored lower with RAG. Fix for the new version: identical caution sentence in all three conditions; grounding rule kept for B/C (it is the proposal's design) and documented.

### 3.2 Token-efficient RAG removed gold evidence on the test set (P1, report correction)
Offline analysis of the saved test contexts (no API): standard candidates contained gold chunks for 44/49 answerable questions; after token-efficient filtering 43/49. Across questions, the relevance margin removed **8 gold chunks** (42 of 333 candidate chunks removed in total). Mean gold coverage: initial Top-6 0.350 → after expansion 0.367 → after efficient filtering 0.325. On the dev set no gold chunk was lost (0 of 8 removed). The current report sentence "removes … weakly related passages without truncating any passage it keeps" is true, but the Discussion's implication that savings came only from "packaging" is **not fully supported**: part of the saving is real evidence removal. MRR of initial retrieval: 0.589 (test), 0.518 (dev).

### 3.3 Proposal commitments not met (P0)
1. Evidence reranking — not implemented.
2. Context compression / evidence budget / concise answer structure — replaced by a lossless design (decision made on dev data, not documented as a proposal change in the report).
3. Blinded human scoring — not done (report says "planned").
4. Repeated independent requests — 1 request per item.
5. Faithfulness and citation quality as integrity measures — not evaluated. **Note:** on 2026-10-20 the user instructed that only accuracy, speed and tokens be measured; the new task document reinstates faithfulness and citation quality. This reversal needs explicit confirmation (decision D1 in REPAIR_PLAN).

### 3.4 Statistical analysis (P1)
Pooled bootstrap treats 150 model–question pairs as independent; the correct unit is the question (50 clusters, with the three models' differences averaged within a question). Per-model intervals are unaffected. Recomputable without new API calls.

### 3.5 Other
- Judge rubric v4 has no explicit rule that overseas spray timing does not satisfy a New Zealand management point; "equivalent advice counts" could reward region transfer (P2; only change in a new rubric version applied to all new answers).
- One test answer truncated at 1,024 tokens (T022 Claude efficient) — reported.
- Retrieval stage time includes query embedding and expansion; finer timing needed for the proposal's latency decomposition (P2).
- Temperature/top-p not controlled across providers (provider defaults); document; Claude Haiku 5.5 cannot take temperature 0 (P2).

## 4. What can be recomputed vs what needs new runs

| Item | Recompute from existing logs | New API runs required |
|---|---|---|
| Correct pooled bootstrap | ✓ | |
| Retrieval quality (Recall@K, MRR, gold coverage, retention) | ✓ | |
| Offline context ablation S0–S4 (tokens estimated, kept/dropped chunks, gold coverage) | ✓ (native token counts need API) | |
| Citation validity (IDs, mapping to source/section) | ✓ | |
| Human blinded scoring sheet | ✓ (export) | humans |
| Citation support / faithfulness | | judge calls on RAG answers |
| Reranker effect on answers | | B and C re-run |
| Prompt-symmetry fix | | A, B, C re-run |
| Repeated requests | | ×2 or ×3 runs |
