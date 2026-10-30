"""Deterministic terminology mapping for the English apple corpus.

This is a glossary, not a general translator. No extra model/API call is made.
"""
import re

TOPICS = {
    '假苹果蠹蛾': 'false codling moth', '假蠹蛾': 'false codling moth',
    '苹果黑星病': 'apple scab', '苹果疮痂病': 'apple scab', '黑星病': 'apple scab',
    '疮痂病': 'apple scab', '火疫病': 'fire blight', '白粉病': 'powdery mildew',
    '欧洲溃疡病': 'european canker', '欧洲癌病': 'european canker',
    '疫霉根腐病': 'phytophthora', '疫霉冠腐病': 'phytophthora',
    '苹果炭疽病': 'apple anthracnose', '炭疽病': 'anthracnose',
    '苦腐病': 'bitter rot', '黑腐病': 'black rot', '褐腐病': 'brown rot',
    '白腐病': 'white rot', '灰霉病': 'gray mold', '青霉病': 'blue mold',
    '牛眼腐烂病': "bull's eye rot", '牛眼腐病': "bull's eye rot",
    '苹果花叶病': 'apple mosaic', '花叶病': 'mosaic',
    '苹果锈病': 'cedar apple rust', '煤污病': 'sooty blotch', '蝇粪病': 'flyspeck',
    '褐斑病': 'marssonina blotch', '毛霉腐烂病': 'mucor rot',
    '苹果蠹蛾': 'codling moth', '蠹蛾': 'codling moth',
    '浅褐苹果蛾': 'light brown apple moth', '苹果实蝇': 'apple maggot',
    '苹果绵蚜': 'woolly apple aphid', '绵蚜': 'woolly apple aphid',
    '苹果绿蚜': 'green apple aphid', '绿蚜': 'green apple aphid',
    '欧洲红螨': 'european red mite', '红蜘蛛': 'mite',
    '二斑叶螨': 'twospotted spider mite', '卷叶蛾': 'leafroller',
    '褐斑蝽': 'brown marmorated stink bug', '圣何塞蚧': 'san jose scale',
    '介壳虫': 'scale', '铜色金龟子': 'bronze beetle',
}
TERMS = {
    '病虫害': 'diseases pests disease pest', '病害': 'diseases disease',
    '虫害': 'pests pest', '害虫': 'pests pest', '苹果': 'apple apples',
    '蚜虫': 'aphid aphids', '螨虫': 'mite mites',
    '症状': 'symptoms signs', '识别': 'identification symptoms damage',
    '危害': 'damage', '防治': 'management control prevention',
    '管理': 'management', '预防': 'prevention control', '治疗': 'treatment management',
    '监测': 'monitoring', '发生条件': 'conditions weather infection',
    '发生原因': 'causes infection', '湿度': 'humidity', '温度': 'temperature',
    '叶片': 'leaves leaf', '叶子': 'leaves leaf', '果实': 'fruit fruits',
    '树干': 'trunk', '发黄': 'yellowing', '斑点': 'spots',
    '新西兰': 'new zealand', '加州': 'california', '美国': 'united states',
    '农药': 'pesticide', '杀菌剂': 'fungicide', '抗药性': 'resistance',
}


def overview_kind(question):
    lower = question.lower()
    has_both = '病虫害' in question or ('disease' in lower and 'pest' in lower)
    disease = has_both or '病害' in question or 'disease' in lower
    pest = has_both or '虫害' in question or '害虫' in question or 'pest' in lower
    listing = bool(re.search(r'有哪些|有什么|什么病虫害|列举|列出|常见|主要|\b(list|common|which|what)\b', lower))
    specific = any(term in question for term in TOPICS) or any(term in lower for term in TOPICS.values())
    management = bool(re.search(r'如何|怎么|防治|管理|预防|\b(manag|control|prevent|treat|symptom)', lower))
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
    unknown_topics = re.findall(r'[\u3400-\u9fff]{1,12}(?:病|蛾|蚜|螨|实蝇|甲虫)', query) if chinese else []
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
