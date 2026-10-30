# HUMAN_EVALUATION_INSTRUCTIONS

## Purpose
To check whether the automatic judge's 0–4 accuracy scores agree with human judgement, as promised in the proposal ("automatic and blinded human scoring"). Human scores are entered only by the raters; no script or AI fills them in.

## Sample
60 answers from the formal experiment (repeat 1 only), 5 from each model × condition stratum, drawn with a fixed seed by `code/tools/human_eval.py export`. All three raters (Wenyu Wu, Dongyang Chen, Mengshuai Feng) score **the same 60 answers**, each in their own random order.

## Blinding
The rater sheet shows: item ID, question, reference answer, required points, major errors, and the answer (citation markers removed). It does **not** show the model, condition, repeat or the automatic score. The answer key (`*_ANSWER_KEY_do_not_share.csv`) must not be opened by raters before all sheets are returned.

## How to score
Open your own file `data/eval/human_blind_scoring/rater_<YourName>.xlsx`, sheet `scoring`, and enter a whole number 0–4 in column G for every row:

| Score | Definition |
|---|---|
| 4 | Core answer (diagnosis or main fact) correct; advice complete and correct |
| 3 | Core answer correct; main advice correct, only secondary details missing |
| 2 | Core answer correct, but advice sparse or generic |
| 1 | Core answer uncertain or only partly correct, but some useful correct information |
| 0 | Wrong core answer, any listed major error, or no useful content |

Rules: work alone and do not discuss items until all sheets are returned; correct advice that differs from the reference but serves the same purpose counts; overseas spray products or timings presented as New Zealand advice are a major error for New Zealand questions; citations are neither rewarded nor penalised; leave a cell empty if you cannot decide and explain in column H; note total minutes in the first comment cell.

Estimated time: 60–90 minutes per rater.

## After scoring
Save and close the file and return it to the same folder. Then run:

```
python code/tools/human_eval.py import --name test_exp2
python code/tools/human_eval.py agreement --name test_exp2
```

Reported: exact agreement, within-one agreement, quadratic-weighted Cohen's kappa and confusion matrix for every rater pair and for each rater vs the judge, and the mean human–judge difference.

## Optional faithfulness spot-check
One rater checks 20 randomly selected claim labels from `test_exp2_faith.jsonl` against the evidence (supported / unsupported / contradicted / unassessable) and records agreement. Not required for the accuracy calibration.
