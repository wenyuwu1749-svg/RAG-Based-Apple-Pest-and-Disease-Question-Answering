"""Question bank template builder, validator and JSON exporter.

python code/tools/question_bank.py template   # create data/eval/question_bank_template.xlsx
python code/tools/question_bank.py check FILE.xlsx [--export]
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
EVAL = PROJECT / 'data' / 'eval' / 'questions'

SPLITS = ['dev', 'test']
QUESTION_TYPES = ['symptoms_identification', 'conditions_risk', 'monitoring_sampling', 'management_strategy', 'postharvest', 'boundary_insufficient']
ANSWERABILITY = ['answerable', 'partial', 'unanswerable']
STAGES = ['growth', 'bloom', 'fruit', 'harvest', 'storage_transport', 'multiple']
STATUS = ['draft', 'reviewed', 'frozen', 'rejected']
# Planned counts from the team experiment plan of 13 October 2026
# Test-set quota by question style (2026-10-16 decision); style is the first word of notes.
TEST_QUOTA = {"Farmer's voice": 35, "With region or environment context": 10, "Rare topic": 5}
DEV_TOTAL = 20

# (key, header, width, required, note)
COLUMNS = [
    ('question_id', 'question_id', 12, True, 'D001–D020 development set; T001–T060 test set; unique and never reused'),
    ('split', 'split', 8, True, 'dev / test'),
    ('topic_id', 'topic_id', 9, True, 'Scope table identifier T01–T46, see the "Topics" sheet'),
    ('question_type', 'question_type', 22, True, 'See the "Options" sheet'),
    ('region', 'region', 22, True, 'Region of the evidence, e.g. United States - Pacific Northwest / New Zealand'),
    ('stage', 'stage', 14, True, 'Growth or postharvest stage'),
    ('answerability', 'answerability', 13, True, 'answerable / partial / unanswerable (within the corpus)'),
    ('question_en', 'question_en', 50, True, 'Question in English; state region or source context; no answer hints'),
    ('reference_answer_en', 'reference_answer_en', 60, True, 'Reference answer written only from the cited passages'),
    ('required_points', 'required_points', 50, True, '3–5 required points separated by |; basis for the 0–4 score'),
    ('major_errors', 'major_errors', 40, True, 'Cases counted as major errors, separated by |'),
    ('acceptable_partial', 'acceptable_partial', 40, False, 'Boundary questions: answerable part / part to decline / reason'),
    ('source_ids', 'source_ids', 18, True, 'e.g. S001|S036'),
    ('chunk_ids', 'chunk_ids', 30, True, 'e.g. S001:web:3|S001:web:4 (several equivalent chunks allowed)'),
    ('location', 'location', 24, True, 'PDF page or web section, e.g. p.12 / Symptoms and Signs'),
    ('author', 'author', 12, True, 'Question author'),
    ('reviewer', 'reviewer', 12, True, 'Reviewer; must differ from the author'),
    ('status', 'status', 10, True, 'draft / reviewed / frozen / rejected'),
    ('version', 'version', 8, True, 'Starts at 1; add 1 after each change'),
    ('notes', 'notes', 30, False, 'Disputes, regional transfer, source conflicts, etc.'),
]
LIST_FIELDS = {'split': SPLITS, 'question_type': QUESTION_TYPES, 'answerability': ANSWERABILITY, 'stage': STAGES, 'status': STATUS}

EXAMPLES = [
    {'question_id': 'D001', 'split': 'dev', 'topic_id': 'T01', 'question_type': 'symptoms_identification', 'region': 'United States - California', 'stage': 'growth',
     'answerability': 'answerable', 'question_en': 'According to UC IPM guidance for California, what symptoms does apple scab produce on leaves and fruit?',
     'reference_answer_en': '[Example, rewrite from the source] Leaf lesions ... ; fruit lesions ...', 'required_points': '[Example] leaf lesion appearance|fruit lesion appearance|later cracking/deformation',
     'major_errors': 'describes another disease (e.g. powdery mildew) as scab|states symptoms only on roots', 'acceptable_partial': '', 'source_ids': 'S001',
     'chunk_ids': 'S001:web:1', 'location': 'Symptoms and Signs', 'author': 'Name', 'reviewer': 'Name2', 'status': 'draft', 'version': 1, 'notes': 'Example row, delete before use'},
    {'question_id': 'D002', 'split': 'dev', 'topic_id': 'T38', 'question_type': 'boundary_insufficient', 'region': 'New Zealand', 'stage': 'fruit',
     'answerability': 'partial', 'question_en': 'What spray timing is recommended for bronze beetle control in New Zealand apple orchards?',
     'reference_answer_en': '[Example] The corpus describes identification, life cycle and fruit damage (S202) but provides no reviewed NZ spray timing.',
     'required_points': '[Example] states what the evidence does cover|states that spray timing is not supported|does not invent a timing',
     'major_errors': 'gives a specific spray date or product as an NZ recommendation', 'acceptable_partial': 'Answerable: identification and damage; decline: spray timing; reason: no NZ management text',
     'source_ids': 'S202', 'chunk_ids': 'S202:web:1|S202:web:2', 'location': 'Identification; Overview', 'author': 'Name', 'reviewer': 'Name2', 'status': 'draft', 'version': 1, 'notes': 'Example row, delete before use'},
]


def scope_topics():
    data = json.loads(SCOPE.read_text(encoding='utf-8'))
    return [(t['id'], t['topic'], t.get('decision', ''), ', '.join(t.get('admitted_source_ids', []))) for t in data['topics']]


def build_template(path):
    wb = Workbook()
    guide = wb.active
    guide.title = 'Instructions'
    lines = ['Apple pest and disease RAG question bank template (one question per row, fill in the "questions" sheet)', '',
             '1. Locate the facts in the source first, then write the question and reference answer; never use a model answer as the reference answer.',
             '2. Each question has 3–5 required points; the 0–4 score is given against these points.',
             '3. chunk_ids are database chunk IDs (see the evidence cards in the Q&A page or web_chunks_reviewed.json); the check command verifies that they exist.',
             '4. Keep the development and test sets apart by topic and question type; never put a rewritten version of the same question in both.',
             '5. Another member must review each reference answer; after review set status to reviewed. Before freezing run: python code/tools/question_bank.py check FILE.xlsx --export',
             '6. The tested system receives only question_en; reference answers and scoring criteria never enter the prompt.',
             '7. Delete example rows D001 and D002 before use.', '', 'Planned quota (test set, 50 questions, by style):']
    lines += [f'   {k}: {v}' for k, v in TEST_QUOTA.items()] + ["(Write the style at the start of notes: " + " / ".join(TEST_QUOTA) + ")"]
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

    opts = wb.create_sheet('Options')
    for col, (field, values) in enumerate(LIST_FIELDS.items(), 1):
        opts.cell(1, col, field).font = Font(bold=True)
        for r, v in enumerate(values, 2):
            opts.cell(r, col, v)
        letter = opts.cell(1, col).column_letter
        target = next(i for i, c in enumerate(COLUMNS, 1) if c[0] == field)
        dv = DataValidation(type='list', formula1=f"='Options'!${letter}$2:${letter}${len(values)+1}", allow_blank=True)
        ws.add_data_validation(dv)
        dv.add(f'{ws.cell(3, target).column_letter}3:{ws.cell(3, target).column_letter}500')

    topics = wb.create_sheet('Topics')
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
        qid = str(row['question_id']) or '(no ID)'
        for key, _, _, required, _ in COLUMNS:
            if required and str(row[key]).strip() == '' and not (key in ('chunk_ids', 'location', 'source_ids') and row['answerability'] == 'unanswerable'):
                errors.append(f'{qid}: missing {key}')
        if qid in seen:
            errors.append(f'{qid}: duplicate question_id')
        seen.add(qid)
        for field, values in LIST_FIELDS.items():
            if row[field] and row[field] not in values:
                errors.append(f'{qid}: {field}={row[field]} is not an allowed option')
        if row['topic_id'] and row['topic_id'] not in topic_ids:
            errors.append(f'{qid}: topic_id {row["topic_id"]} is not in the scope table')
        if row['split'] == 'dev' and not qid.startswith('D') or row['split'] == 'test' and not qid.startswith('T'):
            warnings.append(f'{qid}: ID prefix does not match split')
        points = split_list(row['required_points'])
        if points and not 3 <= len(points) <= 5:
            warnings.append(f'{qid}: {len(points)} required points (3–5 recommended)')
        for cid in split_list(row['chunk_ids']):
            if cid not in chunk_ids:
                errors.append(f'{qid}: chunk_id not found {cid}')
        for sid in split_list(row['source_ids']):
            if sid not in source_ids:
                errors.append(f'{qid}: source_id not in the current corpus {sid}')
        if row['author'] and row['author'] == row['reviewer']:
            errors.append(f'{qid}: reviewer is the same as the author')
        if row['status'] not in ('reviewed', 'frozen', 'rejected'):
            warnings.append(f'{qid}: not yet reviewed (status={row["status"]})')
        if '[Example' in str(row['reference_answer_en']):
            warnings.append(f'{qid}: still an example row')
    # Near-duplicate questions across splits leak tuning information into the test set.
    words = {str(r['question_id']): set(str(r['question_en']).lower().split()) for r in rows}
    for a in rows:
        for b in rows:
            if a['split'] == 'dev' and b['split'] == 'test':
                wa, wb_ = words[str(a['question_id'])], words[str(b['question_id'])]
                if wa and len(wa & wb_) / len(wa | wb_) > .7:
                    warnings.append(f'{a["question_id"]} and {b["question_id"]} are worded very similarly; possible leakage between sets')
    active = [r for r in rows if r['status'] != 'rejected']
    style = lambda r: next((k for k in TEST_QUOTA if str(r['notes']).startswith(k)), 'style not marked')
    test = Counter(style(r) for r in active if r['split'] == 'test')
    print(f'Questions {len(rows)} (active {len(active)}): dev {sum(r["split"] == "dev" for r in active)}/{DEV_TOTAL}, test {sum(test.values())}/{sum(TEST_QUOTA.values())}')
    for k, v in TEST_QUOTA.items():
        print(f'  test {k:<26}{test.get(k, 0):>3}/{v}')
    print(f'  topics covered: {len({r["topic_id"] for r in active})}')
    for label, items in (('Errors', errors), ('Warnings', warnings)):
        print(f'{label}: {len(items)}')
        for x in items[:200]:
            print('  -', x)
    if export:
        if errors:
            print('Errors found; nothing exported.')
            return 1
        for r in active:
            for key in ('required_points', 'major_errors', 'source_ids', 'chunk_ids'):
                r[key] = split_list(r[key])
        body = json.dumps(active, ensure_ascii=False, indent=2, sort_keys=True)
        out = Path(path).with_suffix('.json')
        out.write_text(body, encoding='utf-8')
        print(f'Exported {out}, SHA-256 {hashlib.sha256(body.encode()).hexdigest()}')
    return 1 if errors else 0


if __name__ == '__main__':
    if len(sys.argv) >= 2 and sys.argv[1] == 'template':
        print(build_template(EVAL / 'question_bank_template.xlsx'))
    elif len(sys.argv) >= 3 and sys.argv[1] == 'check':
        sys.exit(check(sys.argv[2], '--export' in sys.argv))
    else:
        print(__doc__)
