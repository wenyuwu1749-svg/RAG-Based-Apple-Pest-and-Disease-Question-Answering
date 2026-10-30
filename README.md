# RAG-Based Apple Pest and Disease Question Answering

Supplementary materials for the report *RAG-Based Apple Pest and Disease Question Answering: A Comparative Evaluation of
General-Purpose Large Language Models under No-RAG, Standard RAG and Token-Efficient RAG*
(Massey University, 158.888 Information Technology Research Project, Group G6: Wenyu Wu, Dongyang Chen, Mengshuai Feng, 2026).

This repository provides the materials listed in **Appendix B** of the report. The sections below follow B.1–B.5.

---

## B.1 Corpus files

Frozen corpus version `corpus-v1-20261014`: 250 sources (52 PDFs, 198 web articles), 2,044 chunks.

| File | Content |
|---|---|
| `data/registers/source_register.json` | Source list: identifier, title, organisation, URL, region, publication/update date and date evidence, role, review status, file hashes |
| `data/registers/corpus_freeze.json` | Frozen corpus manifest: corpus hash, database hash, embedding configuration and SHA-256 hashes of all 654 data files |
| `data/registers/pdf_review_manifest.json` | PDF screening: reviewed page ranges with page-text hashes, scope notes, inclusion decisions |
| `data/registers/corpus_audit_register_20261013.json` | Screening and audit records per source, including the web text blocks that were disabled or trimmed |
| `data/registers/nz_evidence_update_20261013.json` | New Zealand supplement: admitted and rejected candidates |
| `data/registers/research_scope_v1_20261013.json`, `coverage_register.json`, `病虫害覆盖表.md`, `来源登记表.md` | Scope table (46 topics) and coverage |
| `data/reports/` | Audit, HTML review, NZ supplement and corpus verification reports (`corpus_verification.json` = Table 3) |

## B.2 Questions and prompts

| File | Content |
|---|---|
| `data/eval/G6_QA题库.xlsx` | Complete question bank (sheets: notes, development set, test set) |
| `data/eval/dev_questions.xlsx`, `data/eval/test_questions.xlsx` | 20 development and 50 test questions with reference answers, required points, major errors, cited sources and chunk ids (input files of the scripts) |
| `data/eval/review_records/*.xlsx` | Question review workbooks of each team member (test and development sheets) |
| `data/eval/dev_review_log.md`, `data/eval/test_review_log.md` | Review logs |
| `data/eval/prompts/prompts_export.json` | Exact answer prompts (no RAG, RAG, token-efficient addition), judge prompt and faithfulness prompt; prompt version `v9-rerank-shared-caution` |

## B.3 Settings and logs

| File | Content |
|---|---|
| `protocol/EXPERIMENT_PROTOCOL.md` | Frozen protocol of the formal experiment |
| `data/logs/test_exp2_plan.json` | Frozen plan: questions, models, conditions, repeats, seed, settings, task order, hashes of the corpus, server code, tools and reranker |
| `protocol/MODEL_API_RECORDS.md` | Model identifiers, providers, prices, settings and experiment cost |
| `data/config/config.json` | Application model and embedding configuration (environment-variable names only, no keys) |
| `data/logs/test_exp2_results_public.jsonl` | Per-call log of the formal experiment: 1,800 successful answers and 2 failed attempts that succeeded on retry |
| `data/logs/test_final_results_public.jsonl` | Per-call log of the preliminary experiment: 450 answers |
| `data/logs/*_console.log`, `*_answers.csv` | Run console output and answer tables |
| `protocol/PRELIMINARY_AUDIT_REPORT.md` | Audit of the preliminary experiment (problems in Table 6) |

**Note on the public logs.** Each record keeps every field of the original log: question, condition, model, settings, the system prompt,
answer, provider usage, stage timings, retries, response metadata and the retrieved and supplied passages (chunk id, scores, source title, URL and locator).
Only the passage **text** is replaced by the chunk id, because the source documents are copyrighted. The text can be regenerated from the sources in `source_register.json`.

**Run commands** (Python 3.11+):

```bash
pip install -r 代码/apple_rag_lab/requirements.txt
python 代码/apple_rag_lab/launcher.py --port 8777                         # web application
python 代码/tools/run_experiment.py --help                                 # batch experiment (plan, run, resume)
python 代码/tools/judge_answers.py --help                                  # accuracy judge
python 代码/tools/faithfulness_eval.py --help                              # faithfulness and citation evaluation
python 代码/tools/analyze_results_v2.py --name test_exp2                   # paired, question-clustered bootstrap
python 代码/tools/make_figures.py --name test_exp2                         # figures and their source data
python -m unittest discover -s 代码/apple_rag_lab/tests                    # tests
```

A detailed run guide (Chinese) is in `代码/API配置与运行指南.md`.

## B.4 Scores and figure data

| Report item | Source file(s) |
|---|---|
| Accuracy judge outputs | `data/logs/test_exp2_judged.jsonl` (formal), `data/logs/test_final_judged.jsonl` (preliminary) |
| Faithfulness and citation outputs | `data/logs/test_exp2_faith.jsonl`, `test_exp2_faith_summary.csv` |
| 60-answer blind human scores | `data/eval/human_eval/test_rater_*.xlsx` (three raters), `test_human_scores.csv`, `test_exp2_agreement.csv`, blinding key `test_exp2_ANSWER_KEY_do_not_share.csv`; instructions in `protocol/HUMAN_EVALUATION_INSTRUCTIONS.md` |
| Bootstrap and statistics scripts | `代码/tools/analyze_results_v2.py` (10,000 draws, seed 20261021), `代码/tools/human_eval.py` |
| Table 2 (corpus inventory) | `data/registers/corpus_freeze.json`, `data/reports/corpus_audit_20261013_inventory.json` |
| Table 3 (verification) | `data/reports/corpus_verification.json` |
| Table 4 (reranker) | `data/logs/reranker_eval_dev.csv` |
| Table 5 (question bank) | `data/eval/dev_questions.xlsx`, `test_questions.xlsx` |
| Table 6 (preliminary problems) | `protocol/PRELIMINARY_AUDIT_REPORT.md` |
| Table 7 (models) | `protocol/MODEL_API_RECORDS.md` |
| Table 8 (accuracy scale) | judge prompt in `data/eval/prompts/prompts_export.json` |
| Table 9 (main results) | `data/logs/test_exp2_summary.csv`, `test_exp2_scores.csv` |
| Table 10 (ablation) | `data/logs/test_exp2_analysis_v2.csv`, `test_exp2_ablation.csv`, `test_exp2_ablation_dropped.csv` |
| Table 11 (faithfulness) | `data/logs/test_exp2_faith_summary.csv` |
| Table 12 (question groups) | `data/logs/test_exp2_scores.csv` with question types from `data/eval/test_questions.xlsx` |
| Table 13 (human–judge agreement) | `data/eval/human_eval/test_exp2_agreement.csv` |
| Figure 2 | `data/figure_data/fig_regions_data.csv` |
| Figures 4–7, 9 | `data/figure_data/fig_accuracy_data.csv`, `fig_score_dist_data.csv`, `fig_tokens_data.csv`, `fig_latency_data.csv`, `fig_ablation_data.csv` |
| Figure 8 (paired differences) | `data/logs/test_exp2_analysis_v2.csv` |
| Retrieval quality (Section 7.7) | `data/logs/test_exp2_retrieval.csv` |
| Preliminary experiment | `data/logs/test_final_*` |

## B.5 Code and access

| Item | Location |
|---|---|
| Application (pipeline, HTTP API, web interface, tests) | `代码/apple_rag_lab/` (`server.py`, `query_support.py`, `static/`, `tests/`) |
| Experiment, evaluation and analysis scripts | `代码/tools/` |
| Dependency file | `代码/apple_rag_lab/requirements.txt` |
| Code version | the commit of this repository's `main` branch; the code used in the formal run is identified by the SHA-256 hashes in `data/logs/test_exp2_plan.json` |
| File guide | this README |

### Access conditions

- **Code, questions, scores, logs and analyses** in this repository are provided for academic review and reproduction of the report.
- **Source documents are not redistributed.** The PDFs, archived web pages, cleaned web text and the corpus database
  (`data/pdf/`, `data/web_raw/`, `data/web_cleaned/`, `data/chunks/corpus.sqlite3`) are copyrighted by their publishers.
  Every source is listed with its URL in `data/registers/source_register.json`; files can be checked against the SHA-256 hashes in `corpus_freeze.json`.
  Without the corpus database the application runs, but RAG conditions need the corpus to be rebuilt first.
- **Model weights are not included.** Download them from Hugging Face at the revision given in `protocol/MODEL_API_RECORDS.md`;
  the reranker is expected in `model/ms-marco-MiniLM-L6-v2/`.
- **API keys are not included.** Commercial models require your own keys and incur provider charges.
- The audit records contain short quoted excerpts (e.g. removed navigation text and date statements) kept as evidence of screening decisions.
