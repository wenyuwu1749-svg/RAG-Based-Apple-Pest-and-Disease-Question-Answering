"""Deterministic terminology mapping for the English apple corpus.

Chinese questions are mapped to English retrieval terms through a glossary of apple pest and disease terms.
This is a glossary, not a general translator. No extra model/API call is made.
Chinese terms are written as \\uXXXX escapes; Python strings and the re module both read them as the characters.
"""
import re

TOPICS = {
    '\u5047\u82f9\u679c\u8839\u86fe': 'false codling moth', '\u5047\u8839\u86fe': 'false codling moth',
    '\u82f9\u679c\u9ed1\u661f\u75c5': 'apple scab', '\u82f9\u679c\u75ae\u75c2\u75c5': 'apple scab', '\u9ed1\u661f\u75c5': 'apple scab',
    '\u75ae\u75c2\u75c5': 'apple scab', '\u706b\u75ab\u75c5': 'fire blight', '\u767d\u7c89\u75c5': 'powdery mildew',
    '\u6b27\u6d32\u6e83\u75a1\u75c5': 'european canker', '\u6b27\u6d32\u764c\u75c5': 'european canker',
    '\u75ab\u9709\u6839\u8150\u75c5': 'phytophthora', '\u75ab\u9709\u51a0\u8150\u75c5': 'phytophthora',
    '\u82f9\u679c\u70ad\u75bd\u75c5': 'apple anthracnose', '\u70ad\u75bd\u75c5': 'anthracnose',
    '\u82e6\u8150\u75c5': 'bitter rot', '\u9ed1\u8150\u75c5': 'black rot', '\u8910\u8150\u75c5': 'brown rot',
    '\u767d\u8150\u75c5': 'white rot', '\u7070\u9709\u75c5': 'gray mold', '\u9752\u9709\u75c5': 'blue mold',
    '\u725b\u773c\u8150\u70c2\u75c5': "bull's eye rot", '\u725b\u773c\u8150\u75c5': "bull's eye rot",
    '\u82f9\u679c\u82b1\u53f6\u75c5': 'apple mosaic', '\u82b1\u53f6\u75c5': 'mosaic',
    '\u82f9\u679c\u9508\u75c5': 'cedar apple rust', '\u7164\u6c61\u75c5': 'sooty blotch', '\u8747\u7caa\u75c5': 'flyspeck',
    '\u8910\u6591\u75c5': 'marssonina blotch', '\u6bdb\u9709\u8150\u70c2\u75c5': 'mucor rot',
    '\u82f9\u679c\u8839\u86fe': 'codling moth', '\u8839\u86fe': 'codling moth',
    '\u6d45\u8910\u82f9\u679c\u86fe': 'light brown apple moth', '\u82f9\u679c\u5b9e\u8747': 'apple maggot',
    '\u82f9\u679c\u7ef5\u869c': 'woolly apple aphid', '\u7ef5\u869c': 'woolly apple aphid',
    '\u82f9\u679c\u7eff\u869c': 'green apple aphid', '\u7eff\u869c': 'green apple aphid',
    '\u6b27\u6d32\u7ea2\u87a8': 'european red mite', '\u7ea2\u8718\u86db': 'mite',
    '\u4e8c\u6591\u53f6\u87a8': 'twospotted spider mite', '\u5377\u53f6\u86fe': 'leafroller',
    '\u8910\u6591\u877d': 'brown marmorated stink bug', '\u5723\u4f55\u585e\u86a7': 'san jose scale',
    '\u4ecb\u58f3\u866b': 'scale', '\u94dc\u8272\u91d1\u9f9f\u5b50': 'bronze beetle',
}
TERMS = {
    '\u75c5\u866b\u5bb3': 'diseases pests disease pest', '\u75c5\u5bb3': 'diseases disease',
    '\u866b\u5bb3': 'pests pest', '\u5bb3\u866b': 'pests pest', '\u82f9\u679c': 'apple apples',
    '\u869c\u866b': 'aphid aphids', '\u87a8\u866b': 'mite mites',
    '\u75c7\u72b6': 'symptoms signs', '\u8bc6\u522b': 'identification symptoms damage',
    '\u5371\u5bb3': 'damage', '\u9632\u6cbb': 'management control prevention',
    '\u7ba1\u7406': 'management', '\u9884\u9632': 'prevention control', '\u6cbb\u7597': 'treatment management',
    '\u76d1\u6d4b': 'monitoring', '\u53d1\u751f\u6761\u4ef6': 'conditions weather infection',
    '\u53d1\u751f\u539f\u56e0': 'causes infection', '\u6e7f\u5ea6': 'humidity', '\u6e29\u5ea6': 'temperature',
    '\u53f6\u7247': 'leaves leaf', '\u53f6\u5b50': 'leaves leaf', '\u679c\u5b9e': 'fruit fruits',
    '\u6811\u5e72': 'trunk', '\u53d1\u9ec4': 'yellowing', '\u6591\u70b9': 'spots',
    '\u65b0\u897f\u5170': 'new zealand', '\u52a0\u5dde': 'california', '\u7f8e\u56fd': 'united states',
    '\u519c\u836f': 'pesticide', '\u6740\u83cc\u5242': 'fungicide', '\u6297\u836f\u6027': 'resistance',
}


def overview_kind(question):
    lower = question.lower()
    has_both = '\u75c5\u866b\u5bb3' in question or ('disease' in lower and 'pest' in lower)
    disease = has_both or '\u75c5\u5bb3' in question or 'disease' in lower
    pest = has_both or '\u866b\u5bb3' in question or '\u5bb3\u866b' in question or 'pest' in lower
    listing = bool(re.search(r'\u6709\u54ea\u4e9b|\u6709\u4ec0\u4e48|\u4ec0\u4e48\u75c5\u866b\u5bb3|\u5217\u4e3e|\u5217\u51fa|\u5e38\u89c1|\u4e3b\u8981|\b(list|common|which|what)\b', lower))
    specific = any(term in question for term in TOPICS) or any(term in lower for term in TOPICS.values())
    management = bool(re.search(r'\u5982\u4f55|\u600e\u4e48|\u9632\u6cbb|\u7ba1\u7406|\u9884\u9632|\b(manag|control|prevent|treat|symptom)', lower))
    if listing and (disease or pest) and not specific and not management:
        return 'both' if disease and pest else 'disease' if disease else 'pest'
    return None


def normalize_query(question):
    chinese = bool(re.search(r'[\u3400-\u9fff]', question))
    query = question
    matched, anchors = [], []
    if chinese:
        # Longest expressions first, so a compound pest name is not split into generic parts.
        for term, english in sorted({**TOPICS, **TERMS}.items(), key=lambda pair: -len(pair[0])):
            if term in query:
                query = query.replace(term, ' ' + english + ' ')
                matched.append({'term': term, 'english': english})
                if term in TOPICS:
                    anchors.append(english)
        # Residual Chinese is kept for dense models, while lexical search uses
        # the recognized English terms. Unrecognized named pests/diseases must
        # not silently retrieve a different condition based only on "apple".
    unknown_topics = re.findall(r'[\u3400-\u9fff]{1,12}(?:\u75c5|\u86fe|\u869c|\u87a8|\u5b9e\u8747|\u7532\u866b)', query) if chinese else []
    kind = overview_kind(question)
    if kind:
        query += ' apple apples overview description symptoms'
        query += ' diseases disease' if kind == 'disease' else ' pests pest' if kind == 'pest' else ' diseases disease pests pest'
    query = re.sub(r'\s+', ' ', query).strip()
    return {'original': question, 'query': query, 'strategy': 'zh-glossary-v1' if chinese else 'original',
            'matched_terms': matched, 'topic_anchors': list(dict.fromkeys(anchors)),
            'unmapped_topics': unknown_topics, 'overview': kind}


def topic_label(chunk):
    topic = chunk['metadata'].get('topic') or chunk['metadata']['title']
    return str(topic)


def topic_category(chunk):
    topic = topic_label(chunk).lower()
    if 'physiological' in topic or 'bitter pit' in topic:
        return 'physiological'
    if re.search(r'scab|blight|rot|rust|mildew|canker|mosaic|blotch|anthracnose|replant|mold|flyspeck', topic):
        return 'disease'
    return 'pest' if re.search(r'moth|aphid|maggot|mite|leafroller|scale|stink bug|miner|drosophila|pest', topic) else 'other'


def diversify_overview(ranked, top_k, kind):
    groups = {}
    for chunk in ranked:
        if topic_category(chunk) not in ('disease', 'pest'):
            continue
        if kind != 'both' and topic_category(chunk) != kind:
            continue
        groups.setdefault(topic_label(chunk).lower(), []).append(chunk)
    # Prefer identification/description passages; take one passage per topic
    # before a second so a broad question is not dominated by one long manual.
    for passages in groups.values():
        passages.sort(key=lambda x: (
            -int(x['metadata'].get('role') == 'core'),
            -int(bool(re.search(r'symptom|description|damage|identification', x['metadata'].get('section', '').lower()))),
            -x['score'], x['id']))
    if kind == 'both':
        diseases = [name for name in groups if topic_category(groups[name][0]) == 'disease']
        pests = [name for name in groups if topic_category(groups[name][0]) == 'pest']
        order = []
        while diseases or pests:
            for category in (diseases, pests):
                if category:
                    order.append(category.pop(0))
        groups = {name: groups[name] for name in order}
    result = []
    while groups and len(result) < top_k:
        for topic in list(groups):
            result.append(groups[topic].pop(0))
            if not groups[topic]:
                del groups[topic]
            if len(result) >= top_k:
                break
    return result
