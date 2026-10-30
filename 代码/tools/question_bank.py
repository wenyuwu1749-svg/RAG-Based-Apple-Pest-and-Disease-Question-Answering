"""Question bank template builder, validator and JSON exporter.

python 代码/tools/question_bank.py template   # create data/eval/question_bank_template.xlsx
python 代码/tools/question_bank.py check FILE.xlsx [--export]
    Validates fields, checks chunk_ids/source_ids against corpus.sqlite3,
    reports dev/test quotas; --export writes FILE.json with a SHA-256 for freezing.
Read-only for the corpus; never calls a model.
"""
import hashlib
import json
import sqlite3
import sys
from collections import Counter
from pathlib import Path

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

PROJECT = Path(__file__).resolve().parents[2]
DB = PROJECT / 'data' / 'chunks' / 'corpus.sqlite3'
SCOPE = PROJECT / 'data' / 'registers' / 'research_scope_v1_20261013.json'
EVAL = PROJECT / 'data' / 'eval'

SPLITS = ['dev', 'test']
QUESTION_TYPES = ['symptoms_identification', 'conditions_risk', 'monitoring_sampling', 'management_strategy', 'postharvest', 'boundary_insufficient']
ANSWERABILITY = ['answerable', 'partial', 'unanswerable']
STAGES = ['growth', 'bloom', 'fruit', 'harvest', 'storage_transport', 'multiple']
STATUS = ['draft', 'reviewed', 'frozen', 'rejected']
# Planned counts from 论文/实验方案/参考论文与10天实验执行方案_20261013.md
# Test-set quota by question style (2026-10-16 decision); style is the first word of notes.
TEST_QUOTA = {'农户口吻': 35, '附带地区/环境': 10, '偏僻专题': 5}
DEV_TOTAL = 20

# (key, header, width, required, note)
COLUMNS = [
    ('question_id', 'question_id', 12, True, 'D001–D020 开发集；T001–T060 测试集，唯一且不复用'),
    ('split', 'split', 8, True, 'dev / test'),
    ('topic_id', 'topic_id', 9, True, '范围表编号 T01–T46，见“专题”页'),
    ('question_type', 'question_type', 22, True, '见“选项”页'),
    ('region', 'region', 22, True, '证据所属地区，如 United States - Pacific Northwest / New Zealand'),
    ('stage', 'stage', 14, True, '生育/采后阶段'),
    ('answerability', 'answerability', 13, True, 'answerable / partial / unanswerable（语料内）'),
    ('question_en', 'question_en', 50, True, '英文问题；写明地区或来源情境，不出现答案线索'),
    ('reference_answer_en', 'reference_answer_en', 60, True, '只依据所引原文写成的参考答案'),
    ('required_points', 'required_points', 50, True, '3–5 个必答要点，用 | 分隔；评分 0–4 依据'),
    ('major_errors', 'major_errors', 40, True, '判为重大错误的情形，用 | 分隔'),
    ('acceptable_partial', 'acceptable_partial', 40, False, '边界题：可答部分 / 应拒答部分 / 理由'),
    ('source_ids', 'source_ids', 18, True, '如 S001|S036'),
    ('chunk_ids', 'chunk_ids', 30, True, '如 S001:web:3|S001:web:4（可用多个等价片段）'),
    ('location', 'location', 24, True, 'PDF 页码或网页章节，如 p.12 / Symptoms and Signs'),
    ('author', 'author', 12, True, '出题人'),
    ('reviewer', 'reviewer', 12, True, '复核人，必须不同于出题人'),
    ('status', 'status', 10, True, 'draft / reviewed / frozen / rejected'),
    ('version', 'version', 8, True, '从 1 开始，修改后加 1'),
    ('notes', 'notes', 30, False, '争议、地区转用、来源冲突等'),
]
LIST_FIELDS = {'split': SPLITS, 'question_type': QUESTION_TYPES, 'answerability': ANSWERABILITY, 'stage': STAGES, 'status': STATUS}

EXAMPLES = [
    {'question_id': 'D001', 'split': 'dev', 'topic_id': 'T01', 'question_type': 'symptoms_identification', 'region': 'United States - California', 'stage': 'growth',
     'answerability': 'answerable', 'question_en': 'According to UC IPM guidance for California, what symptoms does apple scab produce on leaves and fruit?',
     'reference_answer_en': '[示例，需按原文改写] Leaf lesions ... ; fruit lesions ...', 'required_points': '[示例] leaf lesion appearance|fruit lesion appearance|later cracking/deformation',
     'major_errors': 'describes another disease (e.g. powdery mildew) as scab|states symptoms only on roots', 'acceptable_partial': '', 'source_ids': 'S001',
     'chunk_ids': 'S001:web:1', 'location': 'Symptoms and Signs', 'author': 'Name', 'reviewer': 'Name2', 'status': 'draft', 'version': 1, 'notes': '示例行，正式填写前删除'},
    {'question_id': 'D002', 'split': 'dev', 'topic_id': 'T38', 'question_type': 'boundary_insufficient', 'region': 'New Zealand', 'stage': 'fruit',
     'answerability': 'partial', 'question_en': 'What spray timing is recommended for bronze beetle control in New Zealand apple orchards?',
     'reference_answer_en': '[示例] The corpus describes identification, life cycle and fruit damage (S202) but provides no reviewed NZ spray timing.',
     'required_points': '[示例] states what the evidence does cover|states that spray timing is not supported|does not invent a timing',
     'major_errors': 'gives a specific spray date or product as an NZ recommendation', 'acceptable_partial': '可答：识别与危害；应拒答：施药时机；理由：无 NZ 管理正文',
     'source_ids': 'S202', 'chunk_ids': 'S202:web:1|S202:web:2', 'location': 'Identification; Overview', 'author': 'Name', 'reviewer': 'Name2', 'status': 'draft', 'version': 1, 'notes': '示例行，正式填写前删除'},
]


def scope_topics():
    data = json.loads(SCOPE.read_text(encoding='utf-8'))
    return [(t['id'], t['topic'], t.get('decision', ''), ', '.join(t.get('admitted_source_ids', []))) for t in data['topics']]


def build_template(path):
    wb = Workbook()
    guide = wb.active
    guide.title = '说明'
    lines = ['苹果病虫害 RAG 题库模板（每题一行，填写“questions”页）', '',
             '1. 先在原文中定位事实，再写问题和参考答案；不要先问模型再把模型答案当参考答案。',
             '2. 每题 3–5 个必答要点，评分 0–4 分对照这些要点。',
             '3. chunk_ids 填数据库片段 ID（可在问答页证据卡或 web_chunks_reviewed.json 查找）；check 命令会核对其存在。',
             '4. 开发集与测试集按专题和问题类型分开，不要把同一问题改写后放进两组。',
             '5. 参考答案须由另一名成员复核，复核通过后 status 改为 reviewed。冻结前运行：python 代码/tools/question_bank.py check 文件.xlsx --export',
             '6. 被测系统只能收到 question_en；参考答案和评分标准不得进入提示词。',
             '7. 示例行 D001、D002 正式填写前删除。', '', '计划配额（测试集 50 题，按问法）：']
    lines += [f'   {k}: {v}' for k, v in TEST_QUOTA.items()] + ['（问法写在 notes 开头：农户口吻 / 附带地区/环境 / 偏僻专题）']
    for i, line in enumerate(lines, 1):
        guide.cell(i, 1, line)
    guide['A1'].font = Font(bold=True, size=13)
    guide.column_dimensions['A'].width = 110

    ws = wb.create_sheet('questions')
    head_fill = PatternFill('solid', fgColor='DDEBF7')
    for col, (key, header, width, required, note) in enumerate(COLUMNS, 1):
        c = ws.cell(1, col, header + (' *' if required else ''))
        c.font, c.fill = Font(bold=True), head_fill
        ws.cell(2, col, note).font = Font(italic=True, color='808080')
        ws.column_dimensions[c.column_letter].width = width
    for r, row in enumerate(EXAMPLES, 3):
        for col, (key, *_) in enumerate(COLUMNS, 1):
            ws.cell(r, col, row.get(key, '')).alignment = Alignment(wrap_text=True, vertical='top')
    ws.freeze_panes = 'C3'

    opts = wb.create_sheet('选项')
    for col, (field, values) in enumerate(LIST_FIELDS.items(), 1):
        opts.cell(1, col, field).font = Font(bold=True)
        for r, v in enumerate(values, 2):
            opts.cell(r, col, v)
        letter = opts.cell(1, col).column_letter
        target = next(i for i, c in enumerate(COLUMNS, 1) if c[0] == field)
        dv = DataValidation(type='list', formula1=f"='选项'!${letter}$2:${letter}${len(values)+1}", allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(f'{ws.cell(3, target).column_letter}3:{ws.cell(3, target).column_letter}500')

    topics = wb.create_sheet('专题')
    for col, h in enumerate(['topic_id', 'topic', 'decision', 'admitted_source_ids'], 1):
        topics.cell(1, col, h).font = Font(bold=True)
    for r, row in enumerate(scope_topics(), 2):
        for col, v in enumerate(row, 1):
            topics.cell(r, col, v)
    for letter, w in zip('ABCD', (9, 45, 12, 50)):
        topics.column_dimensions[letter].width = w
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)
    return path


def split_list(value):
    return [x.strip() for x in str(value or '').split('|') if x.strip()]


def read_rows(path):
    ws = load_workbook(path, data_only=True)['questions']
    keys = [c[0] for c in COLUMNS]
    rows = []
    for values in ws.iter_rows(min_row=3, values_only=True):
        if not any(v not in (None, '') for v in values):
            continue
        rows.append({k: ('' if v is None else v) for k, v in zip(keys, values)})
    return rows


def check(path, export=False):
    rows = read_rows(path)
    with sqlite3.connect(DB) as c:
        chunk_ids = {r[0] for r in c.execute('SELECT id FROM chunks')}
        source_ids = {json.loads(r[0]).get('source_id') for r in c.execute('SELECT metadata FROM chunks')}
    topic_ids = {t[0] for t in scope_topics()}
    errors, warnings, seen = [], [], set()
    for row in rows:
        qid = str(row['question_id']) or '(无ID)'
        for key, _, _, required, _ in COLUMNS:
            if required and str(row[key]).strip() == '' and not (key in ('chunk_ids', 'location', 'source_ids') and row['answerability'] == 'unanswerable'):
                errors.append(f'{qid}: 缺少 {key}')
        if qid in seen:
            errors.append(f'{qid}: question_id 重复')
        seen.add(qid)
        for field, values in LIST_FIELDS.items():
            if row[field] and row[field] not in values:
                errors.append(f'{qid}: {field}={row[field]} 不在选项内')
        if row['topic_id'] and row['topic_id'] not in topic_ids:
            errors.append(f'{qid}: topic_id {row["topic_id"]} 不在范围表')
        if row['split'] == 'dev' and not qid.startswith('D') or row['split'] == 'test' and not qid.startswith('T'):
            warnings.append(f'{qid}: 编号前缀与 split 不一致')
        points = split_list(row['required_points'])
        if points and not 3 <= len(points) <= 5:
            warnings.append(f'{qid}: 必答要点 {len(points)} 个（建议 3–5）')
        for cid in split_list(row['chunk_ids']):
            if cid not in chunk_ids:
                errors.append(f'{qid}: chunk_id 不存在 {cid}')
        for sid in split_list(row['source_ids']):
            if sid not in source_ids:
                errors.append(f'{qid}: source_id 不在当前语料 {sid}')
        if row['author'] and row['author'] == row['reviewer']:
            errors.append(f'{qid}: 复核人与出题人相同')
        if row['status'] not in ('reviewed', 'frozen', 'rejected'):
            warnings.append(f'{qid}: 尚未复核（status={row["status"]}）')
        if '[示例' in str(row['reference_answer_en']):
            warnings.append(f'{qid}: 仍为示例行')
    # Near-duplicate questions across splits leak tuning information into the test set.
    words = {str(r['question_id']): set(str(r['question_en']).lower().split()) for r in rows}
    for a in rows:
        for b in rows:
            if a['split'] == 'dev' and b['split'] == 'test':
                wa, wb_ = words[str(a['question_id'])], words[str(b['question_id'])]
                if wa and len(wa & wb_) / len(wa | wb_) > .7:
                    warnings.append(f'{a["question_id"]} 与 {b["question_id"]} 措辞高度相似，可能跨集泄漏')
    active = [r for r in rows if r['status'] != 'rejected']
    style = lambda r: next((k for k in TEST_QUOTA if str(r['notes']).startswith(k)), '未标问法')
    test = Counter(style(r) for r in active if r['split'] == 'test')
    print(f'题目 {len(rows)}（有效 {len(active)}）：dev {sum(r["split"] == "dev" for r in active)}/{DEV_TOTAL}，test {sum(test.values())}/{sum(TEST_QUOTA.values())}')
    for k, v in TEST_QUOTA.items():
        print(f'  test {k:<26}{test.get(k, 0):>3}/{v}')
    print(f'  覆盖专题 {len({r["topic_id"] for r in active})} 个')
    for label, items in (('错误', errors), ('提醒', warnings)):
        print(f'{label} {len(items)} 条')
        for x in items[:200]:
            print('  -', x)
    if export:
        if errors:
            print('存在错误，未导出。')
            return 1
        for r in active:
            for key in ('required_points', 'major_errors', 'source_ids', 'chunk_ids'):
                r[key] = split_list(r[key])
        body = json.dumps(active, ensure_ascii=False, indent=2, sort_keys=True)
        out = Path(path).with_suffix('.json')
        out.write_text(body, encoding='utf-8')
        print(f'已导出 {out}，SHA-256 {hashlib.sha256(body.encode()).hexdigest()}')
    return 1 if errors else 0


if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == 'template':
        print(build_template(EVAL / 'question_bank_template.xlsx'))
    elif len(sys.argv) >= 3 and sys.argv[1] == 'check':
        sys.exit(check(sys.argv[2], '--export' in sys.argv))
    else:
        print(__doc__)
