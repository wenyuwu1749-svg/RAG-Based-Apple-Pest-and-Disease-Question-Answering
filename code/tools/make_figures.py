"""Regenerate all report figures from saved experiment logs (formal experiment by default).

python code/tools/make_figures.py --name test_exp2
Writes PNG figures and the source data of each figure (CSV) to data/figure_data/.
Every number is read from data/logs; nothing is typed in by hand except the corpus region counts,
which come from the data-processing chapter (Table 3.2, verified corpus).
"""
import argparse
import collections
import csv
import json
import os
import statistics as st
from pathlib import Path

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt  # noqa: E402
from matplotlib.patches import FancyBboxPatch, Patch  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
LOGS = ROOT / 'data' / 'logs'
OUT = ROOT / 'data' / 'figure_data'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 9, 'axes.spines.top': False, 'axes.spines.right': False})
CONDS = ['non_rag', 'standard', 'headers_only', 'efficient']
COL = {'non_rag': '#9aa5b1', 'standard': '#2f6db5', 'headers_only': '#7fb3d5', 'efficient': '#e08a2c'}
LAB = {'non_rag': 'No RAG', 'standard': 'Standard RAG', 'headers_only': 'Headers-only', 'efficient': 'Token-efficient RAG'}
MODELS = ['claude', 'gemini', 'deepseek']
MOD = {'claude': 'Claude Haiku 5.5', 'gemini': 'Gemini 3.6 Flash', 'deepseek': 'DeepSeek Flash'}
W = 0.2


def r0(v):
    return str(int(v + 0.5)) if v >= 0 else str(-int(-v + 0.5))


def save_csv(name, rows):
    with (OUT / name).open('w', newline='', encoding='utf-8-sig') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)


def svc(r):
    x = r.get('retries') or {}
    return r['end_to_end_seconds'] - x.get('retry_wait_seconds', 0) - x.get('failed_attempt_seconds', 0)


def box(ax, x, y, w, h, t, fc, fs=6.3):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle='round,pad=0.4', fc=fc, ec='#444', lw=0.8))
    ax.text(x + w / 2, y + h / 2, t, ha='center', va='center', fontsize=fs)


def arr(ax, x1, y1, x2, y2):
    ax.annotate('', (x2, y2), (x1, y1), arrowprops=dict(arrowstyle='->', lw=0.9, color='#444'))


def pipeline():
    fig, ax = plt.subplots(figsize=(7.4, 3.6)); ax.axis('off'); ax.set_xlim(0, 100); ax.set_ylim(0, 50)
    box(ax, 0.5, 22, 9, 8, 'Farmer\nquestion', '#f2f2f2')
    box(ax, 13, 38, 15, 7, 'Prompt only\n(no evidence)', COL['non_rag'] + '55')
    box(ax, 13, 22, 13, 8, 'Query\nembedding\n(bge-small)', '#dde8f5')
    box(ax, 29.5, 22, 13, 8, 'Exact cosine\nsearch,\nTop-10 pool', '#dde8f5')
    box(ax, 46, 22, 13, 8, 'Cross-encoder\nreranker,\nTop-6', '#dde8f5')
    box(ax, 62.5, 22, 13, 8, 'Same-source\nmanagement\nexpansion', '#dde8f5')
    box(ax, 80, 37, 19.5, 7, 'Standard RAG\n(full headers)', COL['standard'] + '66')
    box(ax, 80, 26.5, 19.5, 7, 'Headers-only\n(compact headers)', COL['headers_only'] + '66')
    box(ax, 80, 11, 19.5, 12, 'Token-efficient RAG\ncompact headers,\nnear-duplicate removal,\nrelevance margin 0.05', COL['efficient'] + '66')
    box(ax, 6, 2, 70, 5, 'All conditions: same LLM, same caution instructions, max 1,024 output tokens, 3 requests', '#f2f2f2')
    arr(ax, 10, 26, 13, 41); arr(ax, 10, 26, 13, 26); arr(ax, 26.5, 26, 29.5, 26); arr(ax, 43, 26, 46, 26); arr(ax, 59.5, 26, 62.5, 26)
    arr(ax, 76, 27, 80, 40); arr(ax, 76, 26, 80, 30); arr(ax, 76, 25, 80, 17)
    fig.savefig(OUT / 'fig_pipeline.png', dpi=200, bbox_inches='tight'); plt.close()


def dataflow():
    """Figure 1: data collection and processing steps (counts from the verified corpus, Table 2)."""
    steps = [('Collection', '52 PDFs,\n198 web articles', '#f2f2f2'),
             ('Screening', 'apple relevance,\nscope, provenance', '#dde8f5'),
             ('Extraction', 'pypdf; HTML\nboilerplate removed', '#dde8f5'),
             ('Chunking', '≤300 words; table\nrows with headers', '#dde8f5'),
             ('Metadata', 'SQLite; hashes,\nregion, date', '#dde8f5'),
             ('Freeze', 'embedding,\nverification', '#f5d7b3')]
    fig, ax = plt.subplots(figsize=(7.4, 1.5)); ax.axis('off'); ax.set_xlim(-1, 102); ax.set_ylim(0, 20)
    w, gap = 14.6, 2.6
    for i, (title, text, fc) in enumerate(steps):
        x = 0.6 + i * (w + gap)
        ax.add_patch(FancyBboxPatch((x, 2), w, 16, boxstyle='round,pad=0.3', fc=fc, ec='#444', lw=0.8))
        ax.text(x + w / 2, 14.2, title, ha='center', va='center', fontsize=7, fontweight='bold')
        ax.text(x + w / 2, 7.6, text, ha='center', va='center', fontsize=5.6)
        if i:
            arr(ax, x - gap + 0.3, 10, x - 0.3, 10)
    fig.savefig(OUT / 'fig_dataflow.png', dpi=200, bbox_inches='tight'); plt.close()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--name', default='test_exp2')
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    R = [r for r in (json.loads(l) for l in (LOGS / f'{a.name}_results.jsonl').read_text(encoding='utf-8').splitlines()) if r['status'] == 'success']
    J = [j for j in (json.loads(l) for l in (LOGS / f'{a.name}_judged.jsonl').read_text(encoding='utf-8').splitlines()) if 'score' in j]
    pipeline(); dataflow()

    # accuracy: mean over all answers (50 questions x 3 repeats) per model and condition
    sc = collections.defaultdict(list)
    for j in J:
        sc[(j['model'], j['condition'])].append(j['score'])
    rows = [{'model': m, 'condition': c, 'n_answers': len(sc[(m, c)]), 'mean_score': round(st.mean(sc[(m, c)]), 3)} for m in MODELS for c in CONDS]
    save_csv('fig_accuracy_data.csv', rows)
    fig, ax = plt.subplots(figsize=(7.2, 2.9))
    for k, c in enumerate(CONDS):
        xs = [i + (k - 1.5) * W for i in range(3)]; ys = [st.mean(sc[(m, c)]) for m in MODELS]
        ax.bar(xs, ys, W, color=COL[c], label=LAB[c])
        for x, y in zip(xs, ys):
            ax.text(x, y + 0.03, f'{y:.2f}', ha='center', fontsize=6.5)
    ax.set_xticks(range(3), [MOD[m] for m in MODELS]); ax.set_ylim(0, 3.1); ax.set_ylabel('Mean judge score (0–4)')
    ax.legend(frameon=False, ncol=4, loc='upper center', bbox_to_anchor=(0.5, 1.16), fontsize=7)
    fig.tight_layout(); fig.savefig(OUT / 'fig_accuracy.png', dpi=200); plt.close()

    # score distribution
    cols = ['#c0392b', '#e59866', '#f7dc6f', '#7fb3d5', '#1f618d']
    rows = []
    fig, ax = plt.subplots(figsize=(7.2, 2.5))
    for i, c in enumerate(CONDS):
        cnt = collections.Counter(j['score'] for j in J if j['condition'] == c); left = 0
        rows.append({'condition': c, **{f'score_{s}': cnt[s] for s in range(5)}})
        for s in range(5):
            ax.barh(i, cnt[s], left=left, color=cols[s], label=str(s) if i == 0 else None)
            if cnt[s] > 15:
                ax.text(left + cnt[s] / 2, i, str(cnt[s]), ha='center', va='center', fontsize=7)
            left += cnt[s]
    save_csv('fig_score_dist_data.csv', rows)
    ax.set_yticks(range(4), [LAB[c] for c in CONDS]); ax.set_xlabel('Number of answers (450 per condition: 3 models × 50 questions × 3 requests)')
    ax.legend(title='Score', frameon=False, ncol=5, loc='upper center', bbox_to_anchor=(0.5, 1.4), fontsize=7)
    fig.tight_layout(); fig.savefig(OUT / 'fig_score_dist.png', dpi=200); plt.close()

    # tokens (median per answer)
    g = collections.defaultdict(lambda: collections.defaultdict(list))
    for r in R:
        for t in ('input_tokens', 'output_tokens'):
            g[t][(r['model'], r['mode'])].append(r[t])
    rows = [{'model': m, 'condition': c, 'median_input': st.median(g['input_tokens'][(m, c)]), 'median_output': st.median(g['output_tokens'][(m, c)])} for m in MODELS for c in CONDS]
    save_csv('fig_tokens_data.csv', rows)
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 2.9))
    for ax, t, title in ((axs[0], 'input_tokens', 'Median input tokens'), (axs[1], 'output_tokens', 'Median output tokens')):
        ymax = max(st.median(g[t][(m, c)]) for m in MODELS for c in CONDS); ax.set_ylim(0, ymax * 1.14)
        for k, c in enumerate(CONDS):
            xs = [i + (k - 1.5) * W for i in range(3)]; ys = [st.median(g[t][(m, c)]) for m in MODELS]
            ax.bar(xs, ys, W, color=COL[c], label=LAB[c])
            for x, y in zip(xs, ys):
                ax.text(x, y + (ymax * 0.01), r0(y), ha='center', va='bottom', fontsize=5, rotation=90)
        ax.set_xticks(range(3), [MOD[m].split()[0] for m in MODELS]); ax.set_title(title, fontsize=9)
    axs[0].legend(frameon=False, fontsize=6.5)
    fig.tight_layout(); fig.savefig(OUT / 'fig_tokens.png', dpi=200); plt.close()

    # latency boxplot
    gs = collections.defaultdict(list)
    for r in R:
        gs[(r['model'], r['mode'])].append(svc(r))
    rows = [{'model': m, 'condition': c, 'n': len(gs[(m, c)]), 'median_s': round(st.median(gs[(m, c)]), 3),
             'q1_s': round(st.quantiles(gs[(m, c)], n=4)[0], 3), 'q3_s': round(st.quantiles(gs[(m, c)], n=4)[2], 3)} for m in MODELS for c in CONDS]
    save_csv('fig_latency_data.csv', rows)
    fig, ax = plt.subplots(figsize=(7.2, 2.9))
    data, pos, colors = [], [], []
    for i, m in enumerate(MODELS):
        for k, c in enumerate(CONDS):
            data.append(gs[(m, c)]); pos.append(i + (k - 1.5) * W); colors.append(COL[c])
    bp = ax.boxplot(data, positions=pos, widths=W * 0.85, patch_artist=True, showfliers=False)
    for p, c in zip(bp['boxes'], colors):
        p.set_facecolor(c)
    for med in bp['medians']:
        med.set_color('black')
    ax.set_xticks(range(3), [MOD[m] for m in MODELS]); ax.set_ylabel('Service time per answer (s)')
    ax.legend(handles=[Patch(color=COL[c], label=LAB[c]) for c in CONDS], frameon=False, ncol=4, loc='upper center', bbox_to_anchor=(0.5, 1.16), fontsize=7)
    fig.tight_layout(); fig.savefig(OUT / 'fig_latency.png', dpi=200); plt.close()

    # forest plot from the clustered analysis
    A = list(csv.DictReader((LOGS / f'{a.name}_analysis_v2.csv').open(encoding='utf-8-sig')))
    comps = [('standard - non_rag', 'Standard − No RAG'), ('efficient - non_rag', 'Efficient − No RAG'), ('efficient - standard', 'Efficient − Standard'),
             ('headers_only - standard', 'Headers-only − Standard'), ('efficient - headers_only', 'Efficient − Headers-only')]
    fig, axs = plt.subplots(1, 2, figsize=(7.2, 4.6), sharey=True)
    for ax, (met, title) in zip(axs, [('score', 'Accuracy difference (0–4 scale)'), ('seconds', 'Service-time difference (s)')]):
        y = 0; ticks, yy = [], []
        for cp, lab in comps:
            for m in MODELS + ['pooled']:
                r = next(x for x in A if x['metric'] == met and x['comparison'] == cp and x['scope'] == m)
                d, lo, hi = float(r['mean_diff']), float(r['ci95_low']), float(r['ci95_high'])
                ax.errorbar(d, y, xerr=[[d - lo], [hi - d]], fmt='D' if m == 'pooled' else 'o', color='black' if m == 'pooled' else '#777', ms=3.5, capsize=2, lw=0.9)
                ticks.append(f'{lab}: {"Pooled" if m == "pooled" else MOD[m].split()[0]}'); yy.append(y); y += 1
            y += 0.6
        ax.axvline(0, color='#c0392b', lw=0.7, ls='--'); ax.set_title(title, fontsize=8)
    axs[0].set_yticks(yy, ticks, fontsize=6.2); axs[0].invert_yaxis()
    fig.tight_layout(); fig.savefig(OUT / 'fig_forest.png', dpi=200); plt.close()

    # ablation (offline context analysis)
    ab = list(csv.DictReader((LOGS / f'{a.name}_ablation.csv').open(encoding='utf-8-sig')))
    rows = []
    for v in ('standard', 'compact_headers', 'headers_dedup', 'headers_margin', 'efficient'):
        vr = [x for x in ab if x['variant'] == v]
        rows.append({'variant': v, 'median_est_tokens': st.median(int(x['est_evidence_tokens']) for x in vr),
                     'chunks_kept': sum(int(x['kept']) for x in vr), 'chunks_total': sum(int(x['candidates']) for x in vr),
                     'gold_kept': sum(int(x['gold_kept']) for x in vr), 'gold_available': sum(int(x['gold_available']) for x in vr)})
    save_csv('fig_ablation_data.csv', rows)
    labels = ['Standard RAG', 'Compact headers\n(headers-only)', '+ near-duplicate\nremoval', '+ relevance\nmargin', 'Token-efficient\nRAG (all steps)']
    fig, ax1 = plt.subplots(figsize=(7.2, 2.6))
    ax1.bar(range(5), [r['median_est_tokens'] for r in rows], color=['#2f6db5', '#7fb3d5', '#7fb3d5', '#e08a2c', '#e08a2c'])
    for i, r in enumerate(rows):
        ax1.text(i, r['median_est_tokens'], r0(r['median_est_tokens']), ha='center', va='bottom', fontsize=7)
    ax1.set_ylabel('Median evidence tokens\n(estimated)'); ax1.set_xticks(range(5), labels, fontsize=7)
    ax2 = ax1.twinx(); ax2.spines['right'].set_visible(True)
    ax2.plot(range(5), [r['gold_kept'] for r in rows], 'ko-', ms=4); ax2.set_ylabel('Gold passages kept'); ax2.set_ylim(80, 96)
    for i, r in enumerate(rows):
        ax2.annotate(f"{r['gold_kept']}/{r['gold_available']}", (i, r['gold_kept']), xytext=(0, -12), textcoords='offset points', ha='center', fontsize=7,
                     bbox=dict(boxstyle='round,pad=0.15', fc='white', ec='none', alpha=0.85))
    fig.tight_layout(); fig.savefig(OUT / 'fig_ablation.png', dpi=200); plt.close()
    print('figures written to', OUT.relative_to(ROOT))


if __name__ == '__main__':
    main()
