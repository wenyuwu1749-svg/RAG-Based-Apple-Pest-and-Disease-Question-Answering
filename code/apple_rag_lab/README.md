# Apple RAG Lab

Question answering application for apple pests and diseases, including the three-condition comparison of the G6 proposal.
The front end is plain HTML, CSS and JavaScript and the back end is Python; no front-end framework or Node build is needed.
Requires Python 3.11+; PDF import uses pypdf. Install with `python -m pip install -r requirements.txt`.

The project root contains `code/` and `data/`. This program is in `code/apple_rag_lab`. Original PDFs are in `data/pdf`, the chunk database is
`data/chunks/corpus.sqlite3`, archived web pages are in `data/web_raw`, cleaned text in `data/web_cleaned`, registers in `data/registers`,
and configuration, logs, reports and backups in `data/config`, `data/logs`, `data/reports` and `data/backups`.
All data paths are resolved from the location of the code, so no folder has to be chosen at start-up.
(The source documents, cleaned text and corpus database are not included in the public repository; see the root README.)

## Corpus freeze

The corpus is frozen as `corpus-v1-20261014` (`data/registers/corpus_freeze.json`). While it is frozen, importing, replacing the corpus,
changing the embedding model and rebuilding the index are refused; Q&A and experiments work as usual. On start-up the server warms up the
embedding model, index and reranker (about 15 seconds) before any request is timed. The prompt version of the formal experiment is
`v9-rerank-shared-caution`.

## Using the Q&A application

Double-click **Start_Apple_QA.cmd** in this folder; the launcher starts the local server and opens the Q&A page. If a server is already
running, the launcher reuses it so that API keys held in that process are kept. Keep the command window open; press Ctrl+C to stop.
You can also run `python launcher.py`, or `python launcher.py --port 8767` for another port.

1. In the chat page, choose a configured model in the top bar.
2. Choose No RAG, Standard RAG or Token-efficient RAG below the input box. Ask in English or Chinese, or click an example question, and press Enter.
3. Read the answer; click a citation number to open the passage the model received in the evidence drawer, with a link to the original web page or local PDF page.
4. Copy the answer or download the full JSON record of the call. Chats are stored only in this browser. Every call is independent; no chat history is sent to the model.
5. For batch comparisons use the **Experiments** page; the corpus and models are managed on the **Knowledge base** and **API settings** pages.

After the corpus audit of 2026-10-13, 52 of 65 PDFs are admitted with a reviewed scope (199 chunks; 694 pages kept), and 198 web articles provide
1,845 chunks (one more article is background only), giving **2,044 retrievable chunks**. Many research papers contribute only checked abstract
excerpts; the rest of their text can be reviewed later and must not be treated as fully reviewed. The audit report is
`data/reports/corpus_audit/corpus_audit_20261013_report.md`; the PDF scope manifest is `data/registers/pdf_review_manifest.json`.

Chinese questions are mapped to English retrieval terms through a glossary of apple pest and disease terms (`query_support.py`), and the answer
follows the language of the question; this is not general machine translation, so terms outside the glossary should be asked in English.
Retrieval is dense only: local `BAAI/bge-small-en-v1.5` embeddings with exact cosine search, followed by a local cross-encoder reranker
(`cross-encoder/ms-marco-MiniLM-L6-v2`, Top-10 pool reranked to Top-6). There is no New Zealand region filter or priority rule.
Automatically extracted new files are not reviewed; their new hashes must be reviewed before use in an experiment.

Cleaned web articles are kept in `data/web_cleaned` (JSON for the program, Markdown for checking); originals in `data/web_raw`. Of the original
225 HTML pages, 190 are used for QA, 33 (index pages, other crops or insufficient apple evidence) were removed and 2 reports on ongoing projects are
background only. Importing reviewed web pages verifies the original and cleaned-file hashes and refuses excluded or background sources.
A new import replaces the web part and keeps the PDF part. Admitted tables keep column names, superscripts and footnotes, and token-efficient RAG
keeps or drops a row and its notes as a whole. Historical dose tables, REI/PHI tables and tables whose structure cannot be confirmed are not used.
A corpus update clears the old vector index, which must then be rebuilt. Restart the server after a code update.

## The conditions

| Condition | Model input | Implementation |
|---|---|---|
| No RAG | System instructions + question | No retrieval, no knowledge base |
| Standard RAG | System instructions + question + reranked passages in full | Full evidence headers (source, title, section, organisation, region, date, URL, use limitations) |
| Headers-only (ablation) | Same passages with compact headers | Only the header change of token-efficient RAG; every passage kept |
| Token-efficient RAG | Same passages, kept whole, compact format + question | Compact headers (no URL or repeated date evidence; shared use limitations stated once in the system prompt), near-duplicate removal (Jaccard > 0.85), whole passages more than 0.05 below the best cosine similarity removed; 4,000 estimated-token safety cap; text inside a passage is never cut |

Both RAG conditions use the same grounding, citation and insufficient-evidence instructions, and all conditions use the same caution
instructions and output limit. Every request is independent, with no chat history, web tools or model search. Token-efficient RAG calls no
other LLM and never splits passages; an earlier sentence-extraction version removed information from passages and was retired on 2026-10-19.

The vector index is stored in the SQLite `state` table; for a corpus of this size no separate vector database is needed. Changing the corpus
or embedding model invalidates the index.

The evidence budget is estimated as UTF-8 bytes / 3 and includes header overhead; it is not a tokenizer count. Input, output and total tokens
are read only from the provider's `usage`, and the complete response fields are kept, including cached and reasoning tokens. Token counts are
compared only within a model, because providers use different tokenizers.

## Corpus and metadata

Web import reads `data/registers/source_register.json` and the archived HTML without changing the original files. Only downloaded core,
support, local_management and identification pages can be imported; index pages, candidate entries and species-status records are excluded.
The main content is parsed, keeping titles, sections, paragraphs and table rows, and split along complete sentences up to about 300 words;
a single long sentence or table row can exceed this.

**Automatic extraction is not a corpus review.** Sites without a main element may not parse, table rows can lose headers or footnotes, and
scanned pages and images have no OCR. Before import, check the text, key tables, region, date and section locators. Reviewed text can be
imported as JSON (an array or `{"chunks": [...]}`):

```json
[
  {
    "id": "S001:reviewed-1",
    "text": "Verified English source passage, including necessary qualifications.",
    "metadata": {
      "source_id": "S001",
      "title": "Apple Scab",
      "organization": "UC IPM",
      "url": "https://ipm.ucanr.edu/agriculture/apple/apple-scab/",
      "publication_or_update_date": "Record the source date if provided",
      "region": "California, USA",
      "section": "Symptoms and signs",
      "page": null,
      "topic": "apple scab"
    }
  }
]
```

A web update keeps the PDFs; a PDF update keeps the web pages and replaces the PDF data after backing up the database. A JSON import replaces
the whole working corpus. Historical experiments keep the evidence and corpus hash used at the time. The model API and embedding provider can differ.

## Logs and evaluation

`data/config/config.json` holds the configuration without keys; `data/chunks/corpus.sqlite3` holds the working text and vector index;
`data/logs/experiments.jsonl` holds the random seed, execution order, settings and corpus hash of each batch; `data/logs/runs.jsonl` holds the
exact prompt, answer, raw API response, evidence metadata, returned model name, usage, stage timings and failures of every call.

End-to-end time covers retrieval (including query embedding and reranking), evidence filtering and generation; index-building time and usage are
stored separately. Query-embedding usage is recorded separately from generation tokens. Network or provider failures are recorded as errors and
never counted as answers. Each batch is shuffled with a recorded seed so that no condition always runs at the same time; no condition is cached.

The CSV export is a summary; the JSON keeps the details. `accuracy` starts as null; the formal experiment is scored by the scripts in `code/tools`.

## Interface and tests

The server binds to 127.0.0.1 and accepts only local requests. API keys are sent by the local server to the configured provider; the browser
never calls a model directly. Supported are OpenAI-compatible `/chat/completions` and `/embeddings` and the official Anthropic library for Claude.
Provider error bodies are never stored, because they can contain sensitive information.

Run the tests:

```bash
python -m unittest discover -s tests -v
```

The tests use a local mock API to check the interface, usage records, vector index, evidence budget and isolation of the conditions; they do not
verify real providers. Before an experiment, check each selected model with a small run using real keys (`code/tools/check_models.py`).

## Local PDF knowledge base

1. Put documents into `data/pdf` of the project.
2. On **Knowledge base → Local PDF documents**, click **Import / update PDFs**. The original files are not moved or changed.
3. Page texts are stored in the `pdf_pages` table of `data/chunks/corpus.sqlite3`, the document register in `pdf_documents` and QA chunks in `chunks`.
   Chunks record the file SHA-256, title, page, source and review status; unknown organisation, date or region stay unknown.
4. Evidence cards open the local PDF at the cited page. Guide previews and unrelated documents are registered and stored but not used for QA.
5. The import report is written to `data/reports/pdf_import_report.json` and a database backup to `data/backups/`. Multi-column layout, tables,
   doses, regions and years still need checking after automatic extraction.

Every corpus update invalidates the vector index, which must be rebuilt.

## Local embeddings

In `data/config/config.json` the embedding settings are `adapter: local` and `model: BAAI/bge-small-en-v1.5`. Queries get the BGE instruction prefix
`Represent this sentence for searching relevant passages: `, documents do not; vectors are normalised and searched by exact cosine similarity
(NumPy). The model is downloaded from Hugging Face on first use and cached, after which it works offline (`HF_HUB_OFFLINE=1`). On a CPU, indexing
the 2,044 chunks takes about one minute. The index records the corpus hash, configuration fingerprint, dimension and build time, and becomes
invalid when the corpus or configuration changes.
