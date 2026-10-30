# Notes on the cleaned HTML data

This round processed the 225 originally registered HTML pages; the original PDFs and MPI species records were not part of the removal.

| Decision | Web pages | Notes |
|---|---:|---|
| Admitted | 190 | Apple topics and supporting IPM material; only text approved for QA and tables with confirmed structure |
| Report background | 2 | S201 ongoing bronze beetle project, S203 ongoing apple scab–microbe interaction project |
| Removed | 33 | 21 index or discovery pages, 12 with insufficient apple evidence or about other crops |

SQLite at this point: 1,857 web chunks + 1,983 PDF chunks = 3,840 chunks. 34 PDF documents with 836 pages registered; the PDF data were compared by hash before and after, and text, page numbers and register entries were unchanged.
data/pdf currently holds 44 files. New PDFs were not imported in this round; copying a file into the folder does not update the database.

Locations:
- Original admitted and background web pages: `data/other/Apple_Corpus_Sources/raw`.
- Cleaned articles: `data/other/Apple_Corpus_Sources/cleaned` (JSON for import by the program; Markdown for manual checking).
- Web chunk export: `data/chunks/web_chunks_reviewed.json`.
- Working database: `data/chunks/corpus.sqlite3`.
- Per-item reasons, removal receipt and retrieval check: `data/other/reports/html_review_20261011`.
- Backups of SQLite and the source register before the update: `data/other/backups`.

Navigation, footers, advertisements, author biographies, reference lists and repeated text were removed. Text keeps its section information; table values keep their column names, superscript markers and necessary footnotes. In token-efficient RAG a table row is kept or dropped as a whole, so that values do not lose their meaning.
Historical dose tables, REI/PHI tables and tables whose columns cannot be confirmed are not used as QA evidence; they are marked as not for QA in the cleaned files, and the complete original text can still be checked. Unknown publication dates are not replaced by download or file modification dates.
The review checks relevance, structure, dates and crop/region scope; it has not been checked sentence by sentence by plant protection experts. US material does not automatically become New Zealand management guidance, and research reports are not treated as validated technology. Discovery links in the historical coverage table are not topic-level evidence; the formal question bank still needs an exact mapping between question, reference answer and evidence.

Use and later updates:
1. Start or restart the QA program and refresh the web page. At this point the new corpus supported the lexical retrieval of that version (later removed; the final system uses dense retrieval only).
2. Web import into the knowledge base uses the reviewed cleaned JSON; background and excluded sources cannot be imported. All reviewed sources are selected by default; importing a changed selection replaces the web part and keeps the PDF part.
3. To update PDFs, use "Import / update PDFs" and then check the extraction results.
4. New HTML pages must first be collected, registered, reviewed and cleaned; index pages and unknown articles must not be admitted in bulk. The prepare step of this review tool was a one-off review of the original 225-page snapshot; do not run prepare again on the submitted corpus.
5. A corpus change invalidates the old vector index; rebuild the index after configuring the embedding model. Cleaning and loading into SQLite do not build the vector index.

Verification: 20 regression tests passed, and local retrieval and the compression budget were checked on 6 Chinese and English questions; no external model was called. The retrieval check is not an accuracy evaluation.

[Per-item review table](<html_review_20261011_results.md>) · [Removal receipt](<html_review_20261011_deletion_receipt.json>) · retrieval check (not included)
