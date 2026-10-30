# Corpus audit report · 2026-10-13

This round carried out the audit and updated the working database. The research scope follows the confirmed plan: biological pests and diseases of apple during growth, fruiting and postharvest storage and transport; New Zealand is the main application region and overseas evidence is labelled with its region; management measures are included, while regulations and species status are not QA or evaluation topics.

**Level of completion: review of sources, region and date, inclusion scope, extraction and traceability. No independent fact check by agricultural experts has been done, so this is not a final expert gold-standard corpus.**

## 1. Scope and results

| Item | Before audit | After audit |
|---|---:|---:|
| Original PDF files / pages | 65 / 1123 | 65 / 1123, all kept |
| PDFs with a retrievable scope | 65 | 52 |
| PDF chunks | 2122 | 199 |
| HTML articles in the corpus | 199 | 198 used for QA, 1 background only |
| HTML chunks | 1901 | 1845 |
| Total retrievable chunks | 4023 | 2044 |

This round did not re-admit removed index pages, historical background pages or MPI species-status records. The overall source register still contains historical discovery and exclusion entries; they are not part of the current QA corpus.

34 early PDFs received their first explicit scope review in this round: 21 were admitted with a defined scope and 13 were background only, out of scope or pending re-checking. The other 31 kept their earlier scope review, and their PDF file hashes, page-text hashes and extraction ranges were verified again.

Of the 21 PDFs with a newly defined scope, 19 research papers or reviews keep mainly checked abstract excerpts and 2 technical manuals keep specified sections. The rest of their text is not used for QA in this round, which does not mean that it is useless or wrong; passages not checked yet can be added in a later review. The large drop in the number of chunks comes mainly from this narrower scope.

The 199 HTML articles keep their earlier source and cleaning review; in this round the original and cleaned-block hashes were verified for each source, and 148 blocks in 64 articles were cleaned (disabled or trimmed precisely). This is not a new sentence-by-sentence expert check of every article.

## 2. Findings and actions in this round

- Algorithm papers (image classification, IoT/YOLO and similar) were removed from QA evidence and kept as literature background. Papers on bitter pit and other physiological disorders are outside the defined scope of biological pests and diseases.
- Mixed tomato–apple studies were limited to their apple evidence; tomato treatment effects must not be used as apple management. Material with unclear treatment relationships in the abstract or conflicting species names was held back.
- The 1993 multi-fruit manual has OCR, number and mixed-host problems and was moved to historical reference; New Zealand and reviewed WSU topic pages continue to provide the corresponding evidence.
- For the Canadian *Crop Profile for Apple in Canada, 2022*, the version date is the sixth edition of 2023 as stated in the source; the Minnesota manual is explicitly Minnesota Department of Agriculture, 2007, separated from guesses based on organisation or file name. Online publication date, journal year and study year are kept separately.
- Laboratory, detached fruit/leaf, seedling pot, observational, review and technical-guide evidence are labelled separately; laboratory effects or correlations must not be written up as proven New Zealand orchard control.
- One German parasitoid paper has a name conflict between Trichogramma and Trichomma in the abstract and keywords; the conflicting sentences were excluded and the source was not "corrected". For another trial, only the qualitative principle of netting mesh size was kept; the exact sizes await a methods check.
- S111 (honey bee biology) was moved to background; the apple-specific supporting table on bee effects is kept. S230 keeps only the clear description of apple damage; nectarine content and thresholds without established apple applicability were removed. Distribution and status content was removed from S202.
- Web copyright notices, regulatory text, repeated site footers and text redirecting to other guides were removed; where they shared a block with article text, only the locatable navigation text was cut and the adjacent article text was kept.
- The 290 previously approved table rows were compared one by one, including column names, values and footnotes, and are unchanged. Label or regional restrictions in necessary footnotes are kept as context for the values, not as regulatory QA material; table meaning was not broken to remove regulatory words.
- Short negations and conditions are kept, for example that powdery mildew "does not require leaf wetness" and the conditions of resistance testing, so that cleaning does not remove key limitations.

## 3. 13 PDFs not used for QA for now

| File | Decision | Reason |
|---|---|---|
| 1-s2.0-S0045653521021652-main.pdf | Background only | Orchard fertilisation and soil bacterial communities; no pest or disease control effect established, so soil amendment is not used as control evidence. |
| 1-s2.0-S0048357526001422-main.pdf | Background only | n-Docosane efficacy was validated mainly in tomato; mentioning apple in the title does not establish an apple management protocol. |
| 1-s2.0-S0168169922004100-main.pdf | Background only | Image-detection system study; algorithm performance is not evidence for pest and disease management. |
| 1-s2.0-S2590123025048935-main.pdf | Background only | IoT/YOLO system performance study; kept as literature background, not used as an established orchard control protocol. |
| 1-s2.0-S2772375525003739-main.pdf | Background only | Image-classification / feature-selection study; kept as literature background. |
| 1-s2.0-S2772502225004718-main.pdf | Out of scope | Bitter pit is a physiological disorder and the paper is a hyperspectral detection study; outside the defined scope of biological pests and diseases. |
| EBSCO-FullText-08_08_2026 (2).pdf | Background only | AFD-Net image-classification study; not used as control guidance. |
| EBSCO-FullText-08_08_2026 (3).pdf | Out of scope | Classification study of physiological disorders; outside the defined scope of biological pests and diseases. |
| fpls-16-1654826.pdf | Content conflict, pending check | Mixed tomato/apple study; in the apple part of the abstract the wording on foliar spray versus root drench is unclear, so values cannot be reliably linked to treatments. Needs item-by-item checking against the text and figures; excluded for now, and tomato parameters must not be substituted. |
| s10924-026-03827-1.pdf | Content conflict, pending check | The abstract equates green apple aphid with Myzus persicae while the text uses Aphis pomi, and small glasshouse tests are described as field trials. The conflicts in species and evidence stage need re-checking. |
| s43538-026-00783-1.pdf | Background only | Indian multi-crop review of invasive species and biosecurity; regulations, species status and most non-apple content are out of scope, and the apple passages were not verified separately. |
| USDA_APHIS_False_Codling_Moth_Pest_Card.pdf | Out of scope | 2012 USDA quarantine awareness card; the text does not establish apple as a host; must not be mistaken for Cydia pomonella or apple management material. |
| WSU_Orchard_Pest_Management_1993.pdf | Historical reference, extraction pending check | Published 1993, second printing 1999; 269 pages covering many fruit trees, OCR text with damaged numbers and other hosts. Kept as historical reference; reviewed WSU topic web pages are used for QA text instead. |

All of these original files remain in `data/pdf`, and the page texts of all 1,123 pages remain in `pdf_pages`. No original material was deleted; only the scope used for QA changed.

## 4. Verification and open items

- The database integrity check passed; all current chunks match the prepared review results; the hashes of all 264 original files and the 1,123 page texts are unchanged.
- All 65 PDFs were re-extracted and their review scopes verified; the original and cleaned hashes of the 199 HTML articles passed, and the regenerated web chunks match the stored text.
- Two representative dry runs with the existing PDF importer: the excluded image paper still produces 0 QA chunks and the Canadian manual produces only reviewed chunks. The database was not changed again.
- Lexical retrieval (used at that stage) found material for 6 questions on symptoms, damage, monitoring, postharvest and management; this is only a retrieval connectivity check, no LLM was called, it is not an accuracy evaluation, and it does not show that New Zealand-first retrieval works.
- 34 active sources have no reliable publication or update date (1 PDF, 33 HTML) and are explicitly kept as unknown. Where the source has only a literal update label, no full date was guessed. See the verification JSON.
- Laboratory evidence without an established study site or local applicability keeps this limitation; the field-trial region must not be inferred from the authors' affiliation.
- There are still 5 groups of identical short texts: repeated biology, condition or table explanations under different topics or sources; each keeps its own provenance and they are not deleted across topics just because the wording is identical. De-duplication in retrieval and compression is verified separately.
- Not yet done at this stage: configuring embeddings, building the vector index, region priority or scope constraints, freezing the formal question bank and scoring; this round changed no program or API configuration and made no model calls.
- Priority for manual review: key facts, doses and units, table rows and local management applicability behind the formal evaluation questions; local strategies that cannot be verified are kept as insufficient-evidence or decline tests and are not replaced by overseas advice.

## 5. Locations and later imports

- Working database: `data/chunks/corpus.sqlite3`; the results of this round are in effect. Refresh the page if it still shows the old counts.
- Separate research candidate snapshot: `data/chunks/reviewed/corpus_reviewed_candidate_20261013.sqlite3`, with a `.manifest.json` beside it holding the version, counts and hashes. This snapshot is not yet the frozen version for the formal experiment.
- PDF text-range manifest: `data/registers/pdf_review_manifest.json`; web cleaning files and the source register: `data/other/Apple_Corpus_Sources/cleaned` (not included in this repository) and `data/registers/source_register.json`.
- Reading copies: `data/chunks/readable/all_pdf_chunks.md` and `web_chunks.md`. They contain only the scope currently allowed for QA; the full originals are stored separately (not included in this repository).
- Per-file register: `data/registers/corpus_audit_register_20261013.json`; machine-readable registers and check results are in this folder.
- The database backup before the changes and backups of all replaced data files are kept locally (not included in this repository). The receipt `corpus_audit_20261013_application_receipt.json` lists the before and after hashes of each file.
- The existing importer reads a scope manifest bound to file hashes. The 13 disabled PDFs stay disabled through an "empty review scope"; the review_outcome in the manifest is the actual review decision, and the compatibility field decision=approved_scoped alone does not mean that a file is approved.
- For an empty scope the existing importer shows the generic message "no extractable text / OCR may be needed", so after a full re-import this message may replace the detailed reason from this round; the files are still correctly disabled, and the exact exclusion reason is in the audit register and manifest. This is a compatibility limitation kept in the current program.
- A new or replaced PDF gets a new hash and does not inherit this review; it must be reviewed before use in the formal experiment. The current upload/import program still extracts unreviewed new files automatically, so newly imported content must not be treated as reviewed.
- This round regenerated some chunk identifiers and texts; historical QA and experiment records correspond to the evidence and corpus version at the time, and old identifiers must not be applied to the new text. The method and formal question bank were frozen after re-running the preliminary experiment.

The review scope was carried out and recorded by an AI agent and does not replace sign-off by the supervisor or domain experts. Later formal accuracy evaluation must use checkable reference answers and scoring criteria.
