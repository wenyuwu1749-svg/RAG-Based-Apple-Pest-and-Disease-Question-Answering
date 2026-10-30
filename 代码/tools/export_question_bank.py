"""Export the development and test question banks into one workbook (sheet 1 notes, sheet 2 dev, sheet 3 test).

python 代码/tools/export_question_bank.py
Reads data/eval/dev_questions.xlsx and test_questions.xlsx (unchanged) and writes data/eval/G6_QA题库.xlsx.
"""
import collections
import hashlib
import sys
from pathlib import Path

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / '代码' / 'tools'))
import question_bank as qb  # noqa: E402

OUT = ROOT / 'data' / 'eval' / 'G6_QA题库.xlsx'
FIELDS = [('question_id', '题号', 9), ('question_type', '问题类型', 18), ('answerability', '可答性', 12), ('style', '题目风格', 12),
          ('topic_id', '专题', 7), ('region', '地区', 18), ('stage', '阶段', 12), ('question_en', '问题', 50),
          ('reference_answer_en', '参考答案', 70), ('required_points', '必答要点', 50), ('major_errors', '重大错误', 40),
          ('acceptable_partial', '可答 / 应拒答部分', 35), ('source_ids', '来源编号', 18), ('chunk_ids', '引用片段', 30),
          ('location', '原文位置', 30), ('reviewer', '评审人', 14), ('status', '状态', 9)]
STYLE = {'农户口吻': '农户口吻', '附带地区': '附带地区/环境', '偏僻专题': '冷门专题'}


def style_of(r):
    note = str(r.get('notes') or '')
    return next((v for k, v in STYLE.items() if note.startswith(k)), '')


def sheet(wb, title, rows):
    ws = wb.create_sheet(title)
    head_fill = PatternFill('solid', fgColor='DDEBF7')
    for c, (_, h, w) in enumerate(FIELDS, 1):
        cell = ws.cell(1, c, h)
        cell.font, cell.fill = Font(bold=True), head_fill
        cell.alignment = Alignment(wrap_text=True, vertical='center')
        ws.column_dimensions[cell.column_letter].width = w
    for i, r in enumerate(rows, 2):
        for c, (key, _, _) in enumerate(FIELDS, 1):
            v = style_of(r) if key == 'style' else r.get(key, '')
            if key in ('required_points', 'major_errors'):
                v = '\n'.join('• ' + p for p in qb.split_list(v))
            elif key in ('source_ids', 'chunk_ids'):
                v = '\n'.join(qb.split_list(v))
            ws.cell(i, c, v).alignment = Alignment(wrap_text=True, vertical='top')
    ws.freeze_panes = 'B2'
    ws.auto_filter.ref = ws.dimensions


def main():
    dev = qb.read_rows(ROOT / 'data' / 'eval' / 'dev_questions.xlsx')
    test = qb.read_rows(ROOT / 'data' / 'eval' / 'test_questions.xlsx')
    wb = Workbook()
    ws = wb.active
    ws.title = '说明'
    ws.column_dimensions['A'].width = 24
    ws.column_dimensions['B'].width = 100

    def count(rows, f):
        return '；'.join(f'{k} {v}' for k, v in collections.Counter(f(r) for r in rows).most_common())

    lines = [
        ('G6 苹果病虫害 RAG 问答题库', None),
        ('', None),
        ('用途', '评价通用大语言模型在无 RAG、标准 RAG、高效 token RAG（及 headers-only 消融）条件下回答苹果病虫害问题的准确度。'),
        ('工作表', '“开发集”（20 题）用于调整系统、选择评委和参数；“测试集”（50 题）只用于回答研究问题（预实验与正式实验使用同一套测试题）。'),
        ('题目风格', '以农户口吻描述症状、不点明病因，不加多余条件；参考答案列出最可能原因、易混淆问题及区分方法，以及来源支持的防治建议。'),
        ('开发集构成', f'{len(dev)} 题；可答性：{count(dev, lambda r: r["answerability"])}；风格：{count(dev, style_of)}'),
        ('测试集构成', f'{len(test)} 题；可答性：{count(test, lambda r: r["answerability"])}；风格：{count(test, style_of)}'),
        ('测试集题型', count(test, lambda r: r['question_type'])),
        ('', None),
        ('字段说明', None),
        ('题号', 'D 开头为开发集，T 开头为测试集'),
        ('问题类型', 'symptoms_identification 症状识别；management_strategy 防治；conditions_risk 发生条件与风险；monitoring_sampling 监测与取样；postharvest 采后；boundary_insufficient 边界题（证据不足）'),
        ('可答性', 'answerable 可答；partial 部分可答；unanswerable 语料中无法回答（正确做法是说明局限，不编造）'),
        ('专题', '研究范围表 T01–T46 的编号'),
        ('参考答案', '只依据所引原文写成的标准答案（英文）'),
        ('必答要点', '3–5 个完整回答必须包含的要点，评分依据'),
        ('重大错误', '出现即判 0 分的错误，例如误诊、把海外施药建议当作新西兰建议'),
        ('可答 / 应拒答部分', '部分可答和不可答题中，哪些可以回答、哪些应说明证据不足及理由'),
        ('来源编号 / 引用片段', '冻结语料 corpus-v1-20261014 中的来源和片段编号，可在数据库中追溯原文'),
        ('评审人 / 状态', '三位组员人工评审；测试集状态 frozen（已冻结），开发集 reviewed'),
        ('', None),
        ('数据来源', '本表由 代码/tools/export_question_bank.py 从 data/eval/dev_questions.xlsx 与 test_questions.xlsx 导出，内容未作任何修改。'),
        ('源文件 SHA-256', f"dev {hashlib.sha256((ROOT / 'data/eval/dev_questions.xlsx').read_bytes()).hexdigest()[:16]}…；test {hashlib.sha256((ROOT / 'data/eval/test_questions.xlsx').read_bytes()).hexdigest()[:16]}…"),
        ('修改记录', '见 data/eval/dev_review_log.md 与 test_review_log.md'),
    ]
    for i, (k, v) in enumerate(lines, 1):
        a = ws.cell(i, 1, k)
        if v is None:
            a.font = Font(bold=True, size=14 if i == 1 else 11)
        else:
            a.font = Font(bold=True)
            ws.cell(i, 2, v).alignment = Alignment(wrap_text=True, vertical='top')
    sheet(wb, '开发集', dev)
    sheet(wb, '测试集', test)
    wb.save(OUT)
    print('wrote', OUT.relative_to(ROOT), f'(dev {len(dev)}, test {len(test)})')


if __name__ == '__main__':
    main()
