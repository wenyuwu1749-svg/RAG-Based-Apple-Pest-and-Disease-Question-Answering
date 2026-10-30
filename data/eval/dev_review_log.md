# Dev question bank review log (2026-10-16)

Reviewer: Claude evidence check (same model as drafter). Method: number check (all numbers in reference answers found in cited chunks) and sentence-by-sentence reading of each reference answer, required points and major errors against the cited chunk text. This is not an independent human review.

| Question | Result | Finding |
|---|---|---|
| D001 | confirmed |  |
| D002 | confirmed |  |
| D003 | missing citation | Claim that rust mites need a hand lens was supported only by an uncited chunk. |
| D004 | beyond source | "with larvae inside" is not stated in S087:9; source says midge larvae feed along leaf margins. |
| D005 | wording | Source mentions galleries, not "beetle holes". |
| D006 | missing key differentiator | S066 states bacterial ooze is never present with blossom blast; "Gala is highly susceptible" overstated the UC IPM wording. |
| D007 | confirmed |  |
| D008 | beyond source | "reduce root infestation" is an inference; S020:6 says the rootstocks were developed to be resistant. |
| D009 | confirmed |  |
| D010 | confirmed |  |
| D011 | confirmed |  |
| D012 | confirmed |  |
| D013 | editing error | WSU sentence was duplicated at the end; the WSU spray recommendation is conditional on the orchard being threatened. |
| D014 | confirmed |  |
| D015 | wording | S074:11 says to position bins to minimise soil contamination of their undersides, not to keep bins off the soil. |
| D016 | beyond source | "checking at night to see the beetles would confirm it" is not in the source. |
| D017 | beyond source | "storage temperature is not the main control" is an inference not stated by any source. |
| D018 | confirmed |  |
| D019 | substantive error | Yellowing and early leaf drop were given as a differentiator, but S174 states apple scab also causes leaves to yellow and drop prematurely. |
| D020 | substantive error | Penn State spray timing (from pink bud) is written for cedar-apple rust; quince rust infection window starts at tight cluster, so it was misattributed. |

Summary: 20 reviewed; 11 edited (2 substantive errors), 9 confirmed unchanged; 0 rejected.


## 2026-10-20 去除"注明出处"类评分要求（对无 RAG 公平）

无 RAG 条件没有资料可引用，凡要求"注明出处 / 依据资料说明"的要点会系统性偏向 RAG。以下修改只保留内容本身，
"资料中没有某信息"改为"不把未经证实的具体内容当作定论、承认不确定"。题目、答案性质和其他要点未改。
评委说明同步加入"不因引用或来源名称加分或扣分"（judge-v3-content-only）。

| 题号 | 字段 | 修改前 | 修改后 |
|---|---|---|---|
| D001 | required_points 4 | spring protective sprays from about tight cluster until shoot growth stops (attributed to source) | spring protective sprays from about tight cluster until shoot growth stops |
| D002 | required_points 4 | mentions fungicide option only as source-attributed support to sanitation | fungicides mentioned only as support to sanitation, not as the main control |
| D003 | major_errors 3 | gives an unattributed threshold presented as universal | presents a threshold as universal without noting it varies by region |
| D006 | required_points 4 | ongoing monitoring/canker removal; avoid excess vigour; blossom sprays timed with risk models (source-attributed) | ongoing monitoring/canker removal; avoid excess vigour; blossom sprays timed with risk models |
| D013 | required_points 4 | other regions' triggers, if mentioned, are attributed (e.g. Penn State 5 flies per sphere) | notes that triggers differ by region (e.g. trap-based triggers such as about 5 flies per red sphere elsewhere) |
| D016 | required_points 2 | states that spray products/timing are not supported by the evidence | does not present specific spray products or timing as established NZ advice (says local confirmation is needed) |
| D016 | required_points 3 | reports NZ soil-cultivation trial evidence (mid-October, top 70 mm, twice, 46–61% damage reduction) | soil cultivation under the trees (around mid-October, top ~70 mm, twice) can reduce fruit damage (NZ trials: 46–61%) |
| D016 | major_errors 2 | states there is no NZ management evidence at all | offers no management option at all |
| D017 | required_points 1 | states that no storage temperature is supported by the evidence | does not give a definite storage temperature as proven to stop bull's eye rot |
| D017 | required_points 2 | infection mostly pre-harvest, appears after 4–5 months cool storage (NZ study) | infection mostly happens in the orchard before harvest; rot appears after months (about 4–5) of cool storage |
| D017 | required_points 3 | orchard prevention measures, attributed to overseas sources | orchard prevention measures (remove cankers, limit canopy wetness, harvest dry, store promptly) |
| D018 | required_points 1 | states that the evidence has no NZ-specific rootstock data | does not claim the rootstock advice is verified for New Zealand (suggests checking locally) |
| D018 | required_points 2 | names source-supported resistant rootstocks (MM.106, MM.111, M.793, Geneva series) with attribution | names resistant rootstocks (MM.106, MM.111, M.793, Geneva series) |
| D018 | major_errors 3 | names rootstocks not in the evidence as resistant | names a rootstock known to be susceptible as resistant |
| D019 | required_points 4 | protective sprays from late bloom/petal fall to mid-June before rain, attributed to Penn State; FRAC 11 ineffective early | protective sprays from late bloom/petal fall to mid-June before rain; FRAC 11 ineffective early |

## 2026-10-20 项目组人工评审（已完成）

评审人：Wenyu Wu（D001、D004、D007、D010、D014、D017、D019）、Dongyang Chen（D002、D006、D008、D011、D015、D018、D020）、Mengshuai Feng（D003、D005、D009、D012、D013、D016）。17 题通过，3 题修改后通过（D013 补充华盛顿触发条件依赖诱捕器与标签；D017 冷藏不能保证防止牛眼腐；D018 砧木资料为海外研究）。开发集已用于调试且结果已产生，为保持与开发结果一致，意见只记录、不修改开发题库；status 记为 reviewed。
