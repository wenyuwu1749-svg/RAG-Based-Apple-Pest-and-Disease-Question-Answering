"""Read local PDF literature into page-aware, auditable corpus records."""
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

TOPIC_PATTERNS = {
    'Apple Scab': r'apple scab|venturia inaequalis',
    'Fire Blight': r'fire blight|erwinia amylovora',
    'Powdery Mildew': r'powdery mildew|podosphaera leucotricha',
    'Codling Moth': r'(?<!false )\bcodling moth\b|cydia pomonella',
    'False Codling Moth': r'false codling moth|thaumatotibia leucotreta',
    'Woolly Apple Aphid': r'woolly apple aphid|eriosoma lanigerum',
    'Green Apple Aphid': r'green apple aphid|aphis pomi',
    'Rosy Apple Aphid': r'rosy apple aphid|dysaphis plantaginea',
    'Apple Maggot': r'apple maggot|rhagoletis pomonella',
    'European Red Mite': r'european red mite|panonychus ulmi',
    'Twospotted Spider Mite': r'twospotted spider mite|tetranychus urticae',
    'Leafrollers': r'leafroller|leaf roller',
    'San Jose Scale': r'san jose scale|quadraspidiotus perniciosus',
    'European Canker': r'european canker|neonectria ditissima',
    'Bitter Rot': r'bitter rot|colletotrichum',
    'Black Rot': r'black rot|frogeye leaf spot',
    'Cedar Apple Rust': r'cedar.apple rust|gymnosporangium',
    'Apple Anthracnose': r'apple anthracnose|neofabraea malicorticis',
    'Sooty Blotch and Flyspeck': r'sooty blotch|flyspeck',
    'Phytophthora Root and Crown Rot': r'phytophthora',
    'Apple Replant Disease': r'apple replant disease',
    'Blue Mold': r'blue mold|penicillium expansum',
    'Gray Mold': r'gr[ae]y mold|botrytis cinerea',
    "Bull's Eye Rot": r"bull[’']?s[ -]eye rot|neofabraea perennans",
    'Mucor Rot': r'mucor rot|mucor piriformis',
    'Speck Rot': r'speck rot|phacidiopycnis washingtonensis',
    'Brown Marmorated Stink Bug': r'brown marmorated stink bug|halyomorpha halys',
    'Apple Leaf Blotch Miner': r'apple leaf blotch miner|leucoptera malifoliella',
    'Spotted-Wing Drosophila': r'spotted.wing drosophila|drosophila suzukii',
    'Bitter Pit (Physiological Disorder)': r'\bbitter pit\b',
}

KNOWN_TITLES = {
    'Canada_AAFC_Apple_Pest_Mgmt_2022.pdf': 'Crop Profile for Apple in Canada, 2022 (Sixth Edition, 2023)',
    'Cornell_2020_Tree_Fruit_Promo.pdf': '2020 Cornell Pest Management Guidelines for Commercial Tree Fruit Production — Preview',
    'Cornell_2024_Tree_Fruit_Preview.pdf': '2024 Cornell Pest Management Guidelines for Commercial Tree Fruit Production — Preview',
    'WSU_Orchard_Pest_Management_1993.pdf': 'Orchard Pest Management: A Resource Book for the Pacific Northwest (1993)',
    '3_IJEP_2022_9_1_Verma_et_al.pdf': 'Apple Scab (Venturia inaequalis Wint) Management Using a Novel Fungicide Combination in the North-Western Himalayas of India',
    'USDA_APHIS_False_Codling_Moth_Pest_Card.pdf': 'USDA APHIS False Codling Moth Pest Card',
}


def topics_for(text):
    counts = {topic: len(re.findall(pattern, text, re.I)) for topic, pattern in TOPIC_PATTERNS.items()}
    return sorted((topic for topic in counts if counts[topic]), key=lambda topic: (-counts[topic], topic))


def classify_document(filename, title, first_text):
    description = (title + '\n' + first_text[:6000]).lower()
    if 'golden apple snail' in description or 'pomacea' in title.lower():
        return False, 'unrelated', '研究对象是福寿螺（golden apple snail），不是苹果树病虫害。'
    if 'peanut' in title.lower() or 'arachis hypogaea' in title.lower():
        return False, 'unrelated', '研究对象是花生，不属于苹果病虫害知识库。'
    if filename.startswith('Cornell_') and ('Promo' in filename or 'Preview' in filename):
        return False, 'preview', '指南的宣传/预览版本：保留全文记录，但不当作完整防治指南检索。'
    if 'drosophila suzukii' in description and 'apple orchard' not in description and 'apple production' not in description:
        return False, 'related_other_fruit', '主要研究其他水果或果园中的斑翅果蝇，待确认与苹果研究范围的关系。'
    if re.search(r'crop profile for apple|ipm manual for minnesota|orchard pest management|usda_aphis', description + ' ' + filename.lower()):
        return True, 'core', '技术资料/手册；逐页提取，具体地区、年份与药剂信息仍需核对。'
    return True, 'support', '研究/补充文献；自动提取完成，尚未逐段人工审核。'


def organization_for(filename, first_text):
    if filename.startswith('Canada_AAFC_'):
        return 'Agriculture and Agri-Food Canada'
    if filename.startswith('Cornell_'):
        return 'Cornell University'
    if filename.startswith('Minnesota_'):
        return 'University of Minnesota'
    if filename.startswith('WSU_'):
        return 'Good Fruit Grower / Washington State University contributors'
    if filename.startswith('USDA_APHIS_'):
        return 'USDA APHIS'
    # Do not equate an author affiliation with the issuing organization.
    return 'Publisher / organization not yet verified'


def page_passages(text, max_words=300):
    text = text.replace('\x00', '').replace('\ufb01', 'fi').replace('\ufb02', 'fl')
    text = re.sub(r'(?<=[a-z])-\s*\n\s*(?=[a-z])', '', text)
    # Full raw text stays in pdf_pages. Bibliography-only content is not
    # evidence about symptoms or management; do not retrieve it as such.
    text = re.split(r'(?im)^\s*(?:References|Literature cited|Bibliography)\s*$', text, maxsplit=1)[0]
    paragraphs = re.split(r'\n\s*\n', text)
    passages, current = [], []
    for paragraph in paragraphs:
        paragraph = re.sub(r'\s+', ' ', paragraph).strip()
        if len(paragraph) < 45 or re.fullmatch(r'[\d\s.\-]+', paragraph):
            continue
        sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', paragraph)
        for sentence in sentences:
            if current and len(' '.join(current + [sentence]).split()) > max_words:
                passages.append(' '.join(current))
                current = []
            # Some PDF table rows/long sentences need a hard word bound.
            terms = sentence.split()
            while len(terms) > max_words:
                if current:
                    passages.append(' '.join(current))
                    current = []
                passages.append(' '.join(terms[:max_words]))
                terms = terms[max_words:]
            if terms:
                current.append(' '.join(terms))
    if current:
        passages.append(' '.join(current))
    return passages


def extract_folder(folder, progress=None, reviews=None, paths=None):
    try:
        from pypdf import PdfReader
    except ImportError:
        raise ValueError('PDF 导入需要 pypdf。请运行 python -m pip install pypdf 后重试。') from None
    folder = Path(folder).resolve()
    files = sorted(folder.rglob('*.pdf') if paths is None else (Path(p).resolve() for p in paths))
    if any(not p.resolve().is_relative_to(folder) or p.suffix.lower() != '.pdf' for p in files):
        raise ValueError('PDF 路径必须位于 data/pdf 内。')
    if not files:
        raise ValueError('data/pdf 文件夹没有 PDF 文件。')
    documents, pages, chunks, report, seen = [], [], [], [], set()
    for number, path in enumerate(files, 1):
        if not path.resolve().is_relative_to(folder):
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        source_id = 'P' + digest[:16]
        if digest in seen:
            report.append({'filename': path.name, 'source_id': source_id, 'status': 'duplicate_file'})
            continue
        seen.add(digest)
        try:
            reader = PdfReader(path)
            if reader.is_encrypted and not reader.decrypt(''):
                raise ValueError('PDF 已加密，无法提取。')
            texts = [page.extract_text() or '' for page in reader.pages]
            first_text = '\n'.join(texts[:2])
            raw_title = str((reader.metadata or {}).get('/Title', '')).strip()
            title = KNOWN_TITLES.get(path.name) or (raw_title if len(raw_title) > 10 and not raw_title.lower().startswith(('microsoft ', 'hp profile')) else path.stem)
            enabled, role, reason = classify_document(path.name, title, first_text)
            doi_match = re.search(r'10\.\d{4,9}/[A-Za-z0-9._;()/:-]+', first_text)
            doi = doi_match[0].rstrip('.,;)') if doi_match else None
            # Prefer an explicit publication/online year, not PDF creation time.
            year_match = re.search(r'(?:©\s*|Copyright\s*|Available online[^\n]*?|Published[^\n]*?)(20\d{2}|199\d)', first_text, re.I)
            date = year_match[1] if year_match else None
            if path.name.startswith('Canada_AAFC_'):
                date = '2023'
            elif path.name.startswith('WSU_'):
                date = '1993'
            elif path.name.startswith('Cornell_'):
                date = path.name.split('_')[1]
            document_topics = topics_for(title + '\n' + first_text)
            metadata = {'source_id': source_id, 'title': title, 'filename': path.name,
                        'organization': organization_for(path.name, first_text),
                        'publication_or_update_date': date, 'doi': doi,
                        'url': 'https://doi.org/' + doi if doi else '/api/pdf?source_id=' + source_id,
                        'local_url': '/api/pdf?source_id=' + source_id, 'source_type': 'pdf',
                        'page_count': len(texts), 'role': role, 'qa_enabled': enabled,
                        'region': 'Study/document region not yet verified',
                        'topics': document_topics, 'topic': document_topics[0] if len(document_topics) == 1 else 'Apple literature',
                        'content_review': 'automatic_extraction_not_manually_reviewed',
                        'sha256': digest, 'scope_note': reason}
            review = (reviews or {}).get(digest)
            if review:
                if review.get('decision') != 'approved_scoped':
                    raise ValueError('文献审核未批准进入问答库。')
                # A review is tied to exact PDF bytes and exact extracted page text.
                # Never silently apply old offsets after extraction changes.
                for number_text, ranges in review['qa_ranges'].items():
                    number_text_int = int(number_text)
                    if not 1 <= number_text_int <= len(texts):
                        raise ValueError('审核页码超出 PDF 范围。')
                    text = texts[number_text_int - 1]
                    expected = review['page_text_sha256'][number_text]
                    if hashlib.sha256(text.encode()).hexdigest() != expected:
                        raise ValueError('PDF 提取结果与审核版本不同，请重新核对页码和正文范围。')
                    for part in ranges:
                        if not 0 <= part['start'] < part['end'] <= len(text):
                            raise ValueError('审核正文范围无效。')
                metadata.update({k: review[k] for k in (
                    'title', 'organization', 'region', 'publication_or_update_date',
                    'date_type', 'date_evidence', 'study_years', 'role', 'scope_note',
                    'topics', 'evidence_type', 'not_current_pesticide_guidance')})
                metadata.update(url=review['url'], qa_enabled=True,
                                original_source_ids=review['original_source_ids'],
                                content_review='source_scope_date_and_extraction_reviewed_not_expert_fact_validation',
                                review_id=review['review_id'],
                                equivalent_web_source_ids=review.get('equivalent_web_source_ids', []),
                                review_fingerprint=hashlib.sha256(json.dumps(review, sort_keys=True).encode()).hexdigest(),
                                qa_pages=sorted(int(p) for p in review['qa_ranges']))
                metadata['topic'] = metadata['topics'][0] if len(metadata['topics']) == 1 else 'Apple literature'
                title, role, enabled = metadata['title'], metadata['role'], True
            blank_pages = []
            for page_number, text in enumerate(texts, 1):
                pages.append((source_id, page_number, text))
                if len(re.sub(r'\s+', '', text)) < 40:
                    blank_pages.append(page_number)
                if review:
                    parts = review['qa_ranges'].get(str(page_number), [])
                    passages = [(passage, part) for part in parts
                                for passage in page_passages(text[part['start']:part['end']])]
                else:
                    passages = [(passage, None) for passage in page_passages(text)]
                for index, (passage, part) in enumerate(passages, 1):
                    passage_topics = topics_for(passage)
                    chunk_metadata = dict(metadata, page=page_number, page_or_section=f'PDF page {page_number}',
                                          section=f'Page {page_number}', topics=passage_topics,
                                          topic=passage_topics[0] if passage_topics else metadata['topic'])
                    if part:
                        chunk_metadata.update(section=part['section'],
                                              page_or_section=f"PDF page {page_number}; {part['section']}",
                                              reviewed_text_range={'start': part['start'], 'end': part['end']})
                    chunks.append({'id': f'{source_id}:p{page_number}:c{index}', 'text': passage, 'metadata': chunk_metadata})
            extracted_count = sum(x['metadata']['source_id'] == source_id for x in chunks)
            if not extracted_count:
                enabled = False
                metadata.update(qa_enabled=False, scope_note='没有可提取正文，可能需要 OCR。')
            metadata['pages_without_text'] = blank_pages
            document = {'source_id': source_id, 'filename': str(path.relative_to(folder)), 'sha256': digest,
                        'metadata': metadata, 'status': 'imported' if enabled else 'stored_excluded_from_qa'}
            documents.append(document)
            report.append(dict(filename=path.name, title=title, source_id=source_id, pages=len(texts),
                               chunks=extracted_count, qa_enabled=enabled, role=role, reason=metadata['scope_note'],
                               pages_without_text=blank_pages, status=document['status']))
        except Exception as exc:
            report.append({'filename': path.name, 'source_id': source_id, 'status': 'error', 'error': str(exc)})
        if progress:
            progress(number, len(files), path.name)
    if not documents:
        raise ValueError('PDF 全部提取失败，知识库未修改。')
    return {'documents': documents, 'pages': pages, 'chunks': chunks,
            'report': {'created_at': datetime.now(timezone.utc).isoformat(), 'folder': str(folder),
                       'files': len(files), 'documents': len(documents), 'pages': len(pages),
                       'qa_documents': sum(d['metadata']['qa_enabled'] for d in documents),
                       'qa_chunks': sum(x['metadata']['qa_enabled'] for x in chunks),
                       'stored_chunks': len(chunks), 'entries': report}}
