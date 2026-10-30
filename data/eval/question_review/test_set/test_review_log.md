# Test question bank evidence-check log (2026-10-16)

Reviewer: Claude evidence check (same model as drafter). Number check against cited chunks + sentence-by-sentence reading. Final human check by the team is still required.

| Question | Result | Finding |
|---|---|---|
| T001 | edited | missing citation: added S001:web:26 for green-tip timing |
| T002 | confirmed |  |
| T003 | edited | missing citation: added S251:web:2 for hand-lens check |
| T004 | confirmed |  |
| T005 | confirmed |  |
| T006 | confirmed |  |
| T007 | confirmed |  |
| T008 | confirmed |  |
| T009 | confirmed |  |
| T010 | confirmed |  |
| T011 | confirmed |  |
| T012 | confirmed |  |
| T013 | confirmed |  |
| T014 | confirmed |  |
| T015 | confirmed |  |
| T016 | edited | missing citation: added S072:web:2 (fiddle-string) and S072:web:5 (fungicides with pruning) |
| T017 | confirmed |  |
| T018 | edited | missing citation: added S073:web:5 (nematode-free trees) and S073:web:18 (fumigation) |
| T019 | confirmed |  |
| T020 | confirmed |  |
| T021 | confirmed |  |
| T022 | confirmed |  |
| T023 | confirmed |  |
| T024 | confirmed |  |
| T025 | confirmed |  |
| T026 | confirmed |  |
| T027 | confirmed |  |
| T028 | edited | wording: Maryblyt was attributed to Washington; reworded model attribution |
| T029 | confirmed |  |
| T030 | confirmed |  |
| T031 | confirmed |  |
| T032 | confirmed |  |
| T033 | confirmed |  |
| T034 | confirmed |  |
| T035 | confirmed |  |
| T036 | confirmed |  |
| T037 | confirmed |  |
| T038 | confirmed |  |
| T039 | confirmed |  |
| T040 | confirmed |  |
| T041 | confirmed |  |
| T042 | confirmed |  |
| T043 | confirmed |  |
| T044 | confirmed |  |
| T045 | confirmed |  |
| T046 | confirmed |  |
| T047 | confirmed |  |
| T048 | confirmed |  |
| T049 | confirmed |  |
| T050 | confirmed |  |

Summary: 50 reviewed; 5 edited before review sign-off (citation completeness / wording); 0 rejected.


## 2026-10-20 Removal of "cite the source" requirements from scoring (fairness to no RAG)

The no-RAG condition has no material to cite, so required points asking to "cite the source / state according to the material" systematically favour RAG. The changes below keep only the content itself;
"the material does not contain X" was changed to "does not present unverified specifics as established and acknowledges uncertainty". Questions, the nature of the answers and other points were not changed.
The judge instructions were updated at the same time with "no credit or penalty for citations or source names" (judge-v3-content-only).

| Question | Field | Before | After |
|---|---|---|---|
| T007 | required_points 3 | threshold-based decision considering predators (attributed, e.g. UC 60% terminals, Penn State 4.2 leaves/shoot) | threshold-based decision considering predators (e.g. UC 60% terminals, Penn State 4.2 leaves/shoot) |
| T008 | required_points 3 | treat only above thresholds considering parasitism (attributed, e.g. more than 5 mines per leaf) | treat only above thresholds considering parasitism (e.g. more than 5 mines per leaf) |
| T009 | required_points 4 | threshold-based nymph treatment (attributed, e.g. 0.5 nymphs/leaf) | threshold-based nymph treatment (e.g. 0.5 nymphs/leaf) |
| T010 | required_points 4 | favoured by hot dry dusty conditions; predators; threshold about 10 mites/leaf (attributed) | favoured by hot dry dusty conditions; predators; threshold about 10 mites/leaf |
| T014 | required_points 4 | too late once visible; remove cedars, resistant cultivars, protective sprays (attributed) | too late once visible; remove cedars, resistant cultivars, protective sprays |
| T018 | required_points 4 | tolerant rootstocks (Geneva) and planting in old grass alleys; other options attributed | tolerant rootstocks (Geneva) and planting in old grass alleys |
| T022 | major_errors 2 | gives thresholds without attributing region | presents one region's threshold as universal |
| T025 | required_points 4 | sample clusters early; codling moth sprays or Bt (attributed) | sample clusters early; codling moth sprays or Bt |
| T026 | required_points 2 | avoid MM 104 and MM 106 (both sources) | avoid MM 104 and MM 106 |
| T026 | required_points 3 | reports source differences (e.g. M 26) with attribution; Geneva most resistant per WSU | notes sources differ on some rootstocks (e.g. M 26); Geneva rootstocks most resistant |
| T027 | required_points 2 | best in large uniform blocks; small/isolated issues (attributed) | best in large uniform blocks; small/isolated issues |
| T028 | required_points 3 | apply shortly before wetting; repeat every 2–3 days, rotate (attributed) | apply shortly before wetting; repeat every 2–3 days, rotate |
| T032 | required_points 2 | attributes it to a Quebec study abstract | presents the mesh finding as limited research evidence, not established practice |
| T032 | required_points 3 | states that practical installation/effectiveness details are not in the evidence | notes practical installation and pest-by-pest effectiveness are uncertain or need further advice |
| T033 | required_points 4 | notes survey results are not in the evidence | notes the resistance status is uncertain and should be monitored, not assumed |
| T035 | required_points 4 | frost protection with sprinklers (attributed) | frost protection with sprinklers |
| T038 | required_points 1 | risk highest during blossom above about 16°C (NZ guidance) | risk is highest during blossom when temperatures exceed about 16°C |
| T038 | required_points 2 | NZ study: most infection events late bloom/after petal fall; secondary blooms at risk | most infection events occur in late bloom/after petal fall; secondary blooms are at risk |
| T039 | required_points 4 | predators also help; mild winters may limit control (attributed) | predators also help; mild winters may limit control |
| T040 | required_points 1 | states that NZ insecticide products/timing are not in the evidence | does not present specific insecticide products or timing as established NZ advice |
| T040 | required_points 2 | reports NZ leafroller mating disruption results (Hawke's Bay, trap catch reduction, fewer sprays) | leafroller mating disruption can cut trap catch and reduce insecticide sprays (NZ Hawke's Bay trials) |
| T040 | major_errors 2 | claims there is no NZ evidence at all | says nothing is known about controlling it in New Zealand |
| T041 | required_points 4 | small/high-pressure orchards less reliable (attributed) | small/high-pressure orchards less reliable |
| T041 | major_errors 2 | says there is no NZ evidence | says it has not been tested in New Zealand |
| T043 | required_points 1 | states that the evidence contains no information on apple mosaic | does not confirm apple mosaic virus from the description alone (suggests testing or expert diagnosis) |
| T043 | required_points 2 | does not confirm or rule out the diagnosis from general knowledge | notes that other causes can produce similar leaf patterns |
| T043 | required_points 3 | does not give management advice as if evidence-supported | does not present management advice as verified New Zealand guidance |
| T043 | major_errors 1 | describes apple mosaic symptoms or management as evidence-based | confirms apple mosaic virus definitively from the description |
| T043 | major_errors 2 | attributes mosaic patterns to another pest without evidence | attributes the patterns to another pest without any caveat |
| T043 | reference_answer_en | (rewritten) | A description of pale mosaic patterns alone cannot confirm apple mosaic virus: several causes can produce similar leaf patterns, and confirmation needs testing or expert diagnosis. The reviewed corpus contains no information on apple mosaic virus, so no evidence-based management can be given; a good answer stays cautious, does not present general advice as verified New Zealand guidance, and suggests local expert diagnosis. |
| T045 | required_points 1 | reports NZ pheromone-trap study for obscure mealybug (also catches parasitoid) | sex-pheromone traps can monitor obscure mealybug (and also catch its parasitoid) |
| T045 | required_points 2 | no formal monitoring scheme or thresholds (WSU) | no formal monitoring scheme or established action thresholds |
| T046 | required_points 4 | orchard infection; crabapple pollinizers as inoculum; fungicides (attributed) | orchard infection; crabapple pollinizers as inoculum; fungicides |
| T047 | required_points 4 | control in first warm period after petal fall (attributed) | control in first warm period after petal fall |
| T048 | required_points 1 | states the evidence has no symptom description to confirm Elsinoe | does not confirm Elsinoe leaf spot from the description alone |
| T048 | required_points 2 | reports NZ glasshouse product results with the 1% potassium carbonate caveat | glasshouse tests: lime sulphur, copper, sulphur and low-rate potassium carbonate reduced disease; 1% potassium carbonate increased severity |
| T049 | required_points 4 | expose crown and upper roots and keep dry (attributed) | expose crown and upper roots and keep dry |

## 2026-10-20 Review by the project team (completed)

Reviewers: Wenyu Wu (T001, T018, T038, T043, T048 and 15 further questions), Dongyang Chen (15 questions), Mengshuai Feng (15 questions); the review workbooks are in `data/eval/question_review/` (test_set and development_set). Method: reference answers, required points and major errors were checked sentence by sentence against the cited passages, and the six checks and the review result were filled in.

Result: of 50 questions, 38 "passed", 12 "passed after modification" and 0 were rejected. All comments asked for added scope and qualifications; following them, notes were added only at the end of the reference answers, without changing required points or major errors (so that the scoring criteria did not change). The question bank status was set to frozen and reviewer to the actual reviewer.

| Question | Reviewer | Comment (summary) | Action |
|---|---|---|---|
| T022 | Dongyang Chen | Base temperature, biofix, model conditions; US timing is not a universal prescription | Base temperature and biofix were already stated; added "values come from US programmes; follow local models and labels" (v2) |
| T026 | Wenyu Wu | Waterlogging tolerance depends on drainage, scion and local trials | Note added (v2) |
| T027 | Dongyang Chen | Dispenser density depends on product label and region | Note added (v2) |
| T028 | Mengshuai Feng | Timing and products depend on local labels, risk models and resistance management | Note added (v2) |
| T032 | Mengshuai Feng | Netting findings are limited to the study conditions; check the corpus for installation material | Reference answer already qualified; no installation or per-species material found in the corpus; not changed |
| T033 | Wenyu Wu | Registration and resistance differ by region; do not say all single-site products have failed | Note added (v2) |
| T037 | Wenyu Wu | Check that 300 mm, tool disinfection and handling of infected wood come from the NZ source | Checked: all are in S279:web:6 (New Zealand); not changed |
| T039 | Dongyang Chen | Limit parasitism rates to the Appleby 1994–96 trial | Years were already stated; added "not guaranteed in every orchard" (v2) |
| T040 | Dongyang Chen | Separate known information from the lack of NZ product evidence; check the corpus | The check found the NZPPS 2024 leafroller resistance management guide in the corpus (S261, no specific products listed); added to the reference answer and cited chunks (v2) |
| T041 | Mengshuai Feng | 14 orchards are evidence from a specific period; mating disruption is not an unconditional replacement | Note added (v2) |
| T044 | Wenyu Wu | Limit to the 1996 trial; small effect of sodium bicarbonate | Added "not a general recommendation" (v2) |
| T045 | Mengshuai Feng | State target species, region and trap; give no threshold | Already stated that there is no threshold; added "study species and regions differ" (v2) |
