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


## 2026-10-20 去除"注明出处"类评分要求（对无 RAG 公平）

无 RAG 条件没有资料可引用，凡要求"注明出处 / 依据资料说明"的要点会系统性偏向 RAG。以下修改只保留内容本身，
"资料中没有某信息"改为"不把未经证实的具体内容当作定论、承认不确定"。题目、答案性质和其他要点未改。
评委说明同步加入"不因引用或来源名称加分或扣分"（judge-v3-content-only）。

| 题号 | 字段 | 修改前 | 修改后 |
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

## 2026-10-20 项目组人工评审（已完成）

评审人：Wenyu Wu（T001、T018、T038、T043、T048 及 15 题）、Dongyang Chen（15 题）、Mengshuai Feng（15 题），分工见 `评审分工/分工表.md`，原始评审表见 `已评审/`。方法：对照引用原文逐句核查参考答案、必答要点与重大错误，填写六项检查与评审结果。

结果：50 题中 38 题"通过"，12 题"修改后通过"，0 题拒绝。修改意见均为补充适用范围与限定条件；按意见只在参考答案末尾补充说明，未改动必答要点与重大错误（避免改变评分标准）。题库 status 改为 frozen，reviewer 改为实际评审人。

| 题号 | 评审人 | 评审意见（摘要） | 处理 |
|---|---|---|---|
| T022 | Dongyang Chen | 基温、biofix、模型适用条件；不把美国时序当普适处方 | 基温与 biofix 原已写明；补充"数值来自美国项目，以当地模型与标签为准"（v2） |
| T026 | Wenyu Wu | 耐涝性受排水、接穗、当地试验影响 | 补充说明（v2） |
| T027 | Dongyang Chen | 布设密度依产品标签与地域 | 补充说明（v2） |
| T028 | Mengshuai Feng | 时机与药剂依当地标签、风险模型、抗性管理 | 补充说明（v2） |
| T032 | Mengshuai Feng | 网具结论限于研究条件；核查语料有无安装资料 | 参考答案已限定；语料中未检索到安装或逐种效果资料，未修改 |
| T033 | Wenyu Wu | 登记与抗性因地区而异；不说所有单位点药剂失效 | 补充说明（v2） |
| T037 | Wenyu Wu | 核对 300 mm、工具消毒、病枝处理是否出自 NZ 原文 | 已核对 S279:web:6（新西兰）原文均有，未修改 |
| T039 | Dongyang Chen | 寄生率限定于 Appleby 1994–96 试验 | 年份原已写明；补充"不保证每个果园达到"（v2） |
| T040 | Dongyang Chen | 区分已知信息与缺少 NZ 药剂证据；核查语料 | 核查发现语料有 NZPPS 2024 卷叶蛾抗药性管理指南（S261，未列具体药剂）：补入参考答案与引用片段（v2） |
| T041 | Mengshuai Feng | 14 个果园为特定时期证据，交配干扰不是无条件替代 | 补充说明（v2） |
| T044 | Wenyu Wu | 1996 试验限定，小苏打效果小 | 补充"非广泛推荐"（v2） |
| T045 | Mengshuai Feng | 明确目标种类、地区、诱捕器；不给阈值 | 原已写明无阈值；补充"各研究对象与地区不同"（v2） |
