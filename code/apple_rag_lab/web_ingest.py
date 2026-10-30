"""Offline HTML article extraction with source sections and table semantics."""
import hashlib
import html
import json
import re
from html.parser import HTMLParser
from pathlib import Path

VERSION = 'html-article-v1'
VOID = set('area base br col embed hr img input link meta param source track wbr'.split())
IGNORE = set('script style noscript nav header footer aside form button iframe svg'.split())

class Node:
    def __init__(self, tag='', attrs=None, parent=None, value=''):
        self.tag, self.attrs, self.parent, self.value = tag, dict(attrs or []), parent, value
        self.children = []
    def nodes(self):
        yield self
        for c in self.children:
            yield from c.nodes()
    def text(self):
        if not self.tag:
            return self.value
        return ' '.join(c.text() for c in self.children if c.tag not in IGNORE)

class Tree(HTMLParser):
    def __init__(self, markup):
        super().__init__(convert_charrefs=True)
        self.root=Node('document'); self.stack=[self.root]
        self.feed(markup)
    def handle_starttag(self, tag, attrs):
        n=Node(tag,attrs,self.stack[-1]); self.stack[-1].children.append(n)
        if tag not in VOID: self.stack.append(n)
    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag,attrs)
        if tag not in VOID: self.handle_endtag(tag)
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,0,-1):
            if self.stack[i].tag==tag:
                self.stack=self.stack[:i]; break
    def handle_data(self, data):
        self.stack[-1].children.append(Node(parent=self.stack[-1],value=data))

def norm(text):
    return re.sub(r'\s+', ' ', html.unescape(text)).strip()

def excluded(node):
    if node.tag in IGNORE: return True
    if 'teReo' in node.attrs.get('v-if','') or node.attrs.get('lang')=='mi': return True
    ids=node.attrs.get('id','')+' '+node.attrs.get('class','')
    return bool(re.search(r'(^|[ ._-])(breadcrumb|pagination|social|share|related|sidebar|menu|cookie|comment|newsletter|author)([ ._-]|$)',ids,re.I))

def root_for(tree):
    nodes=list(tree.root.nodes())
    choices=[
        lambda n: set(('product','attribute','description')).issubset(n.attrs.get('class','').split()),
        lambda n: 'mce-content-body' in n.attrs.get('class','').split(),
        lambda n: 'entry-content' in n.attrs.get('class','').split(),
        lambda n: 'fl-post-content' in n.attrs.get('class','').split(),
        lambda n: n.attrs.get('itemprop')=='articleBody',
        lambda n: n.tag=='article',
        lambda n: n.tag=='main',
        lambda n: n.attrs.get('id') in ('main-content','mainContent','content-main','content','contentarea'),
        lambda n: n.tag=='body']
    for predicate in choices:
        candidates=[n for n in nodes if predicate(n) and len(norm(n.text()))>30]
        if candidates: return max(candidates,key=lambda n:len(norm(n.text())))
    return tree.root

def table_blocks(node, section, index):
    def cell_text(n):
        if n.tag in IGNORE: return ''
        if not n.tag: return n.value
        text=' '.join(cell_text(c) for c in n.children)
        return '[superscript: '+norm(text)+']' if n.tag=='sup' else text
    rows=[]
    for tr in node.nodes():
        if tr.tag!='tr': continue
        cells=[c for c in tr.children if c.tag in ('td','th')]
        if cells: rows.append((cells,[norm(cell_text(c)) for c in cells]))
    caption=next((norm(n.text()) for n in node.nodes() if n.tag=='caption'), '')
    headers=[]; header_rows=[]; active={}; expanded=[]; data_started=False
    for ri,(cells,values) in enumerate(rows):
        if not any(values): continue
        grid={}; next_active={}
        for ci,(value,remaining) in active.items():
            grid[ci]=value
            if remaining>1: next_active[ci]=(value,remaining-1)
        ci=0
        for cell,value in zip(cells,values):
            while ci in grid: ci+=1
            colspan=max(1,int(cell.attrs.get('colspan','1')))
            rowspan=max(1,int(cell.attrs.get('rowspan','1')))
            for offset in range(colspan):
                grid[ci+offset]=value
                if rowspan>1: next_active[ci+offset]=(value,rowspan-1)
            ci+=colspan
        active=next_active
        row_values=[grid.get(i,'') for i in range(max(grid)+1)] if grid else []
        if all(c.tag=='th' for c in cells) and not data_started: header_rows.append(row_values)
        else:
            data_started=True; expanded.append((ri,cells,row_values))
    width=max((len(r) for r in header_rows),default=0)
    for ci in range(width):
        parts=[]
        for row in header_rows:
            if ci<len(row) and row[ci] and row[ci] not in parts: parts.append(row[ci])
        headers.append(' / '.join(parts))
    blocks=[]
    for ri,cells,values in expanded:
        if not any(values): continue
        if 'table-key' in node.attrs.get('class',''):
            blocks.append({'section':section,'text':' '.join(values),'kind':'table_note','table_index':index})
            continue
        if len(cells)==1 and int(cells[0].attrs.get('colspan','1'))>1:
            blocks.append({'section':section,'text':norm(cell_text(cells[0])),'kind':'table_note','table_index':index})
            continue
        text=' | '.join(f'{headers[i] if i<len(headers) and headers[i] else "Column "+str(i+1)}: {v}' for i,v in enumerate(values))
        context=f'Table {index}'+(f' {caption}' if caption else '')
        if headers: context+='; headers: '+' | '.join(headers)
        blocks.append({'section':section,'text':context+'. '+text,'kind':'table_row','table_index':index,
                       'table_headers':headers,'table_caption':caption,'row_number':ri+1,
                       'table_structure_verified':bool(headers and len(headers)==len(values)),
                       'table_class':node.attrs.get('class',''),
                       'merged_cells':any(c.attrs.get('rowspan','1')!='1' or c.attrs.get('colspan','1')!='1' for c in cells)})
    return blocks

def extract(markup):
    tree=Tree(markup); root=root_for(tree)
    blocks=[]; headings=[]; section='Overview'; table_index=0
    if set(('product','attribute','description')).issubset(root.attrs.get('class','').split()):
        overview=next((n for n in tree.root.nodes() if set(('product','attribute','overview')).issubset(n.attrs.get('class','').split())),None)
        if overview and norm(overview.text()): blocks.append({'section':'Overview','text':norm(overview.text()),'kind':'summary'})
    if 'mce-content-body' in root.attrs.get('class','').split():
        name=next((norm(n.text()) for n in tree.root.nodes() if n.attrs.get('class')=='c-t11-banner__subtitle-1'),'')
        if name: blocks.append({'section':'Identification','text':'Scientific name: '+name,'kind':'definition'})
    skip_section=False
    def visit(n):
        nonlocal section, table_index, skip_section
        if excluded(n): return
        if re.fullmatch('h[1-6]',n.tag) or (n.tag=='p' and len(norm(n.text()))<90 and any(c.tag in ('b','strong') for c in n.children) and norm(n.text()).isupper()):
            text=norm(n.text())
            if text:
                section=text; headings.append(text)
                skip_section=bool(re.search(r'^(References|Literature Cited|Related (Articles|Resources|Content|links|Information)|Further (Reading|Information)|Additional (Resources|Information)|More Information|Important Links|Acknowledg|Authors? and|Contact|Feedback|Subscribe|Search)',text,re.I))
            return
        if skip_section and n.tag in ('p','li','table','figcaption','dt','dd'): return
        if n.tag=='dl':
            label=''
            for child in n.children:
                if excluded(child): continue
                if child.tag=='dt': label=norm(child.text())
                if child.tag=='dd' and label: blocks.append({'section':section,'text':label+': '+norm(child.text()),'kind':'definition'})
            return
        if n.tag=='table':
            table_index+=1; blocks.extend(table_blocks(n,section,table_index)); return
        if n.tag in ('p','li','figcaption','dt','dd'):
            if any(c.tag in ('p','ul','ol','table') for c in n.children):
                for c in n.children: visit(c)
                return
            text=norm(n.text())
            if len(text)>=15:
                letters=len(re.findall('[A-Za-z]',text))
                link_letters=sum(len(re.findall('[A-Za-z]',c.text())) for c in n.nodes() if c.tag=='a')
                if letters and link_letters/letters>.9 and len(text.split())<30: return
                blocks.append({'section':section,'text':text,'kind':n.tag})
            return
        for c in n.children: visit(c)
    visit(root)
    # Dynamic applications sometimes encode the actual body in JSON-LD.
    if not blocks:
        for n in tree.root.nodes():
            if n.tag=='script' and n.attrs.get('type')=='application/ld+json':
                try:
                    payload=json.loads(''.join(c.value for c in n.children))
                    items=payload if isinstance(payload,list) else [payload]
                    for item in items:
                        if isinstance(item,dict) and item.get('articleBody'):
                            text=norm(item['articleBody']); blocks.append({'section':'Overview','text':text,'kind':'structured_article'})
                except (ValueError,TypeError): pass
    seen=set(); unique=[]
    for b in blocks:
        key=(b['section'],b['text'])
        if key not in seen: unique.append(b); seen.add(key)
    title=next((norm(n.text()) for n in tree.root.nodes() if n.tag=='title'),'')
    dates=[]
    for n in tree.root.nodes():
        if n.tag=='time' or n.attrs.get('class')=='product attribute updated-at':
            dates.append({'literal':norm(n.text()),'datetime':n.attrs.get('datetime')})
    for b in unique:
        if re.search(r'(Text Updated:|Treatment Table Updated:|published online|originally published)',b['text'],re.I) or re.match(r'^(Written by|By [A-Z].*(?:WSU|Plant Pathology|USDA)|[Bb]y [A-Z].*revised)',b['text']):
            dates.append({'literal':b['text'],'datetime':None})
    unique=[b for b in unique if not re.match(r'^(Text Updated:|Treatment Table Updated:|originally published \d{4}$|by .{0,150}(originally published|published online))',b['text'],re.I)]
    return {'parser_version':VERSION,'root_tag':root.tag,'root_attrs':root.attrs,'html_title':title,'headings':headings,'visible_dates':dates,
            'blocks':unique,'word_count':sum(len(b['text'].split()) for b in unique),
            'table_count':table_index,'clean_sha256':hashlib.sha256(json.dumps(unique,ensure_ascii=False,sort_keys=True).encode()).hexdigest()}

def chunks_for(source, article, max_words=300):
    result=[]; pending=[]; section=None
    def flush():
        nonlocal pending
        if pending:
            result.append({'section':section,'text':' '.join(pending),'kind':'prose'}); pending=[]
    for b in article['blocks']:
        if not b.get('qa_enabled',True): continue
        if b['kind']=='table_row':
            if not b.get('table_structure_verified'): continue
            flush(); result.append(b); continue
        if len(b['text'])<3: continue
        for sentence in re.split(r'(?<=[.!?])\s+(?=[A-Z])',b['text']):
            if pending and (section!=b['section'] or len(' '.join(pending+[sentence]).split())>max_words): flush()
            section=b['section']; pending.append(sentence)
    flush()
    out=[]
    for i,b in enumerate(result):
        meta={k:source.get(k) for k in ('source_id','title','organization','url','region','publication_or_update_date','date_type','access_date','topic','role','sha256')}
        meta.update(source_type='html',section=b['section'],page_or_section=b['section'],parser_version=VERSION,
                    qa_enabled=True,review_id=source.get('web_review_id'),scope_note=source.get('scope_note'),
                    clean_sha256=article['clean_sha256'],block_kind=b['kind'],
                    evidence_type=source.get('evidence_type','technical guidance'),
                    is_current_pesticide_guidance=False)
        meta['date_evidence']=source.get('date_evidence',[])
        for key in ('table_index','table_headers','table_caption','row_number','merged_cells','table_structure_verified','table_notes'):
            if key in b: meta[key]=b[key]
        out.append({'id':f'{source["source_id"]}:web:{i+1}','text':b['text'],'metadata':meta})
    return out

def load_cleaned(source, source_root):
    path=(source_root/source['cleaned_file']).resolve()
    if not path.is_relative_to(source_root.resolve()): raise ValueError('The cleaned file path is outside the source folder.')
    article=json.loads(path.read_text(encoding='utf-8'))
    if article['source_id']!=source['source_id'] or article['original_sha256'].lower()!=source['sha256'].lower():
        raise ValueError('The cleaned file source or original hash does not match.')
    raw=(source_root/source['local_file']).resolve()
    if not raw.is_relative_to(source_root.resolve()) or hashlib.sha256(raw.read_bytes()).hexdigest()!=article['original_sha256'].lower():
        raise ValueError('The archived web page has changed; review it again.')
    calculated=hashlib.sha256(json.dumps(article['blocks'],ensure_ascii=False,sort_keys=True).encode()).hexdigest()
    if calculated!=article['clean_sha256']: raise ValueError('The cleaned text hash does not match.')
    return article
