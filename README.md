# RAG-Based Apple Pest and Disease Question Answering

Supplementary materials for the report *RAG-Based Apple Pest and Disease Question Answering: A Comparative Evaluation of
General-Purpose Large Language Models under No-RAG, Standard RAG and Token-Efficient RAG*
(Massey University, 158.888 Information Technology Research Project, Group G6: Wenyu Wu, Dongyang Chen, Mengshuai Feng, 2026).

This repository provides the materials listed in **Appendix B** of the report. Only core data are included; the sections below follow B.1–B.5.

## Repository layout

```
code/
  apple_rag_lab/                 application: pipeline and HTTP API (server.py), web interface (static/), tests
  tools/                         experiment, judging, faithfulness, human-evaluation, statistics and figure scripts
  API Configuration and Operation Guide.md
data/
  config/                        model and embedding configuration (no keys)
  registers/                     source register, PDF review manifest, corpus freeze record (read by the application)
    screening/                   audit register, New Zealand supplement, research scope
  reports/                       corpus verification (Table 3)
    corpus_audit/                corpus audit report, inventory and verification of 2026-10-13
    html_review/                 web-page review of 2026-10-11
    nz_supplement/               New Zealand supplement report of 2026-10-13
  eval/
    questions/                   20 development and 50 test questions
    prompts/                     exact answer, judge and faithfulness prompts
    question_review/
      test_set/                  review workbook of each member for the test questions, review log
      development_set/           review workbook of each member for the development questions, review log
    human_blind_scoring/         blinded human scoring of 60 answers: three rater workbooks, scores, agreement, blinding key, instructions
  experiments/
    formal/                      formal experiment (test_exp2): plan, per-call log, judge and faithfulness outputs, scores, analyses
    preliminary/                 preliminary experiment (test_final): plan, per-call log, judge outputs, scores, analyses
    development/                 reranker evaluation on the development questions
    figure_data/                 source data of Figures 2 and 4–9
protocol/                        experiment protocol, model and API records, audit of the preliminary experiment
```

> **Language.** The project was carried out with Chinese working labels. For this repository all file names, documents, workbooks,
> registers, logs and code have been translated into English, with three deliberate exceptions:
> (1) the Chinese query glossary in `code/apple_rag_lab/query_support.py` and the Chinese questions in its tests are kept, because the
> application accepts Chinese questions and maps them to English retrieval terms; (2) one model answer in the formal-experiment logs
> (T026, DeepSeek, no RAG) contains Chinese words produced by the model itself and is kept unchanged as raw output;
> (3) in logged commands, the original Chinese name of the code folder was replaced by `code`.
> Because the workbooks and registers were translated, their SHA-256 values differ from the hashes recorded in
> `data/experiments/formal/test_exp2_plan.json` and `data/registers/corpus_freeze.json`, which refer to the original Chinese-labelled files used in the experiments.
> The translation changed labels and notes only; questions, reference answers, required points, scores and all numbers are unchanged.

---

## B.1 Corpus files

Frozen corpus version `corpus-v1-20261014`: 250 sources (52 PDFs, 198 web articles), 2,044 chunks.

| File | Content |
|---|---|
| `data/registers/source_register.json` | Source list: identifier, title, organisation, URL, region, publication/update date and date evidence, role, review status, file hashes |
| `data/registers/corpus_freeze.json` | Frozen corpus manifest: corpus hash, database hash, embedding configuration and SHA-256 hashes of all 654 data files |
| `data/registers/pdf_review_manifest.json` | PDF screening: reviewed page ranges with page-text hashes, scope notes and inclusion decisions |
| `data/registers/screening/corpus_audit_register_20261013.json` | Screening and audit record of every source, including the web text blocks that were disabled or trimmed |
| `data/registers/screening/nz_evidence_update_20261013.json` | New Zealand supplement: admitted and rejected candidates |
| `data/registers/screening/research_scope_v1_20261013.json` | Scope table (46 topics) with inclusion and exclusion decisions |
| `data/reports/` | Corpus audit, web-page review and New Zealand supplement reports; `corpus_verification.json` is Table 3 |

## B.2 Questions and prompts

| File | Content |
|---|---|
| `data/eval/questions/dev_questions.xlsx`, `test_questions.xlsx` | 20 development and 50 test questions with reference answers, required points, major errors, cited sources and chunk ids |
| `data/eval/question_review/test_set/` | Test-question review workbooks of the three members (38 passed, 12 passed after modification, 0 rejected) and the review log |
| `data/eval/question_review/development_set/` | Development-question review workbooks of the three members (17 passed, 3 passed after modification) and the review log |
| `data/eval/prompts/prompts_export.json` | Exact answer prompts (no RAG, RAG, token-efficient addition), judge prompt and faithfulness prompt; prompt version `v9-rerank-shared-caution` |

In the review workbooks the cited and retrieved passage text is replaced by chunk ids and passage headers, because the sources are copyrighted.

## B.3 Settings and logs

| File | Content |
|---|---|
| `protocol/EXPERIMENT_PROTOCOL.md` | Frozen protocol of the formal experiment |
| `data/experiments/formal/test_exp2_plan.json` | Frozen plan: questions, models, conditions, repeats, seed, settings, task order and hashes of the corpus, server code, tools and reranker |
| `protocol/MODEL_API_RECORDS.md` | Model identifiers, providers, prices, settings and experiment cost |
| `data/config/config.json` | Application model and embedding configuration (environment-variable names only, no keys) |
| `data/experiments/formal/test_exp2_results_public.jsonl` | Per-call log of the formal experiment: 1,800 answers and 2 failed attempts that succeeded on retry |
| `data/experiments/preliminary/test_final_results_public.jsonl` | Per-call log of the preliminary experiment: 450 answers |
| `protocol/PRELIMINARY_AUDIT_REPORT.md` | Audit of the preliminary experiment (problems in Table 6) |

**Public logs.** Each record keeps every field of the original log: question, condition, model, settings, system prompt, answer, provider usage,
stage timings, retries, response metadata and the retrieved and supplied passages (chunk id, scores, source title, URL and locator).
Only the passage **text** is replaced by the chunk id, because the source documents are copyrighted.

**Run commands** (Python 3.11+):

```bash
pip install -r code/apple_rag_lab/requirements.txt
python code/apple_rag_lab/launcher.py --port 8777                         # web application
python code/tools/run_experiment.py --help                                 # batch experiment (plan, run, resume)
python code/tools/judge_answers.py --help                                  # accuracy judge
python code/tools/faithfulness_eval.py --help                              # faithfulness and citation evaluation
python code/tools/analyze_results_v2.py --name test_exp2                   # paired, question-clustered bootstrap
python code/tools/make_figures.py --name test_exp2                         # figures and their source data
python -m unittest discover -s code/apple_rag_lab/tests                    # tests
```

The scripts read and write their working files as `data/logs/<name>_*` (for example `test_exp2_results.jsonl`); to re-run an analysis on the
published results, copy the files of `data/experiments/formal/` into `data/logs/`. A detailed run guide is in `code/API Configuration and Operation Guide.md`.

## B.4 Scores and figure data

| Report item | Source file(s) |
|---|---|
| Accuracy judge outputs | `data/experiments/formal/test_exp2_judged.jsonl`, `data/experiments/preliminary/test_final_judged.jsonl` |
| Faithfulness and citation outputs | `data/experiments/formal/test_exp2_faith.jsonl`, `test_exp2_faith_summary.csv` |
| 60-answer blind human scores | `data/eval/human_blind_scoring/`: rater workbooks `rater_*.xlsx`, `human_scores.csv`, `agreement.csv`, `blinding_key.csv`, instructions |
| Bootstrap and statistics scripts | `code/tools/analyze_results_v2.py` (10,000 draws, seed 20261021), `code/tools/human_eval.py` |
| Table 2 (corpus inventory) | `data/registers/corpus_freeze.json`, `data/reports/corpus_audit/corpus_audit_20261013_inventory.json` |
| Table 3 (verification) | `data/reports/corpus_verification.json` |
| Table 4 (reranker) | `data/experiments/development/reranker_eval_dev.csv` |
| Table 5 (question bank) | `data/eval/questions/dev_questions.xlsx`, `test_questions.xlsx` |
| Table 6 (preliminary problems) | `protocol/PRELIMINARY_AUDIT_REPORT.md` |
| Table 7 (models) | `protocol/MODEL_API_RECORDS.md` |
| Table 8 (accuracy scale) | judge prompt in `data/eval/prompts/prompts_export.json` |
| Table 9 (main results) | `data/experiments/formal/test_exp2_summary.csv`, `test_exp2_scores.csv` |
| Table 10 (ablation) | `data/experiments/formal/test_exp2_analysis_v2.csv`, `test_exp2_ablation.csv`, `test_exp2_ablation_dropped.csv` |
| Table 11 (faithfulness) | `data/experiments/formal/test_exp2_faith_summary.csv` |
| Table 12 (question groups) | `data/experiments/formal/test_exp2_scores.csv` with question types from `data/eval/questions/test_questions.xlsx` |
| Table 13 (human–judge agreement) | `data/eval/human_blind_scoring/agreement.csv` |
| Figure 2 | `data/experiments/figure_data/fig_regions_data.csv` |
| Figures 4–7, 9 | `data/experiments/figure_data/fig_accuracy_data.csv`, `fig_score_dist_data.csv`, `fig_tokens_data.csv`, `fig_latency_data.csv`, `fig_ablation_data.csv` |
| Figure 8 (paired differences) | `data/experiments/formal/test_exp2_analysis_v2.csv` |
| Retrieval quality (Section 7.7) | `data/experiments/formal/test_exp2_retrieval.csv`, `data/experiments/preliminary/test_final_retrieval.csv` |

## B.5 Code and access

| Item | Location |
|---|---|
| Application (pipeline, HTTP API, web interface, tests) | `code/apple_rag_lab/` (`server.py`, `query_support.py`, `static/`, `tests/`) |
| Experiment, evaluation and analysis scripts | `code/tools/` |
| Dependency file | `code/apple_rag_lab/requirements.txt` |
| Code version | the commit of this repository's `main` branch; the code used in the formal run is identified by the SHA-256 hashes in `data/experiments/formal/test_exp2_plan.json` |
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
