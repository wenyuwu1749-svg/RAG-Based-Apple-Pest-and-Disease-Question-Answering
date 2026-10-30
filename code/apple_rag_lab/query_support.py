"""Query handling for the English apple corpus: detection of broad overview questions and topic grouping.

No extra model/API call is made.
"""
import re

# English names of specific pests and diseases: a broad "which pests and diseases" question that names one of
# these is treated as a specific question, not as an overview.
TOPIC_NAMES = ('false codling moth', 'apple scab', 'fire blight', 'powdery mildew', 'european canker', 'phytophthora',
               'apple anthracnose', 'anthracnose', 'bitter rot', 'black rot', 'brown rot', 'white rot', 'gray mold', 'blue mold',
               "bull's eye rot", 'apple mosaic', 'mosaic', 'cedar apple rust', 'sooty blotch', 'flyspeck', 'marssonina blotch',
               'mucor rot', 'codling moth', 'light brown apple moth', 'apple maggot', 'woolly apple aphid', 'green apple aphid',
               'european red mite', 'mite', 'twospotted spider mite', 'leafroller', 'brown marmorated stink bug', 'san jose scale',
               'scale', 'bronze beetle')


def overview_kind(question):
    lower = question.lower()
    has_both = 'disease' in lower and 'pest' in lower
    disease = has_both or 'disease' in lower
    pest = has_both or 'pest' in lower
    listing = bool(re.search(r'\b(list|common|which|what)\b', lower))
    specific = any(term in lower for term in TOPIC_NAMES)
    management = bool(re.search(r'\b(manag|control|prevent|treat|symptom)', lower))
    if listing and (disease or pest) and not specific and not management:
        return 'both' if disease and pest else 'disease' if disease else 'pest'
    return None


def normalize_query(question):
    """Add overview terms to broad 'which pests and diseases' questions; other questions are used unchanged."""
    query = question
    kind = overview_kind(question)
    if kind:
        query += ' apple apples overview description symptoms'
        query += ' diseases disease' if kind == 'disease' else ' pests pest' if kind == 'pest' else ' diseases disease pests pest'
    query = re.sub(r'\s+', ' ', query).strip()
    return {'original': question, 'query': query, 'strategy': 'original', 'matched_terms': [], 'topic_anchors': [],
            'unmapped_topics': [], 'overview': kind}


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
