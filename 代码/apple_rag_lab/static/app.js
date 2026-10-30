"use strict";
const $ = id => document.getElementById(id);
let state, busy = false;
const names = {non_rag:"无 RAG",standard:"标准 RAG",efficient:"精简 RAG",headers_only:"仅精简标题"};
const answerModels=()=>state.config.profiles.filter(p=>p.adapter!=="demo"&&p.role!=="judge"&&!/judge/i.test(p.id));
function el(tag, text, cls) { const e=document.createElement(tag); if(text!==undefined)e.textContent=text; if(cls)e.className=cls; return e; }
/* ───────────────────────── Language (中文 / English) ─────────────────────────
   The interface is written in Chinese. In English mode every UI text node and title/placeholder/aria-label
   is translated on insertion; model answers, questions and source titles are never touched. */
const LANG=(()=>{try{return localStorage.getItem("apple-rag-lang")==="en"?"en":"zh";}catch{return "zh";}})();
const MODE_EN={"无 RAG":"No RAG","标准 RAG":"Standard RAG","精简 RAG":"Token-efficient RAG","仅精简标题":"Headers-only"};
const I18N={...MODE_EN,
"果知 · 苹果病虫害问答":"Apple Pest & Disease Q&A","果知":"Apple Q&A","新建对话":"New chat","实验对比":"Experiments","知识库":"Knowledge base","API 设置":"API settings",
"本地运行 · 研究原型":"Running locally · research prototype","正在连接知识库…":"Connecting to the knowledge base…","新对话":"New chat","正在读取模型…":"Loading models…",
"检索与回答设置":"Retrieval and answer settings","最大输出 token":"Max output tokens","压缩预算（估计 token）":"Compression budget (estimated tokens)","回到底部":"Back to bottom",
"你的问题":"Your question","AI 生成的内容可能有误，请核实重要信息 · 每个问题独立回答，不带入上文":"AI-generated answers may contain errors; check important information · each question is answered independently, without earlier turns",
"回答依据":"Evidence","留意资料的适用地区：":"Check where the sources apply: ","美国来源的管理措施需要结合当地规定判断；物种状态记录不能替代防治指南。":"Management advice from US sources must be checked against local rules; species-status records are not control guidance.",
"批量对比实验":"Batch comparison","参与比较的 API":"Models to compare","回答条件":"Conditions","无 RAG · 模型已有知识":"No RAG · model knowledge only","标准 RAG · 完整检索片段":"Standard RAG · full retrieved passages","精简 RAG · 筛选与压缩证据":"Token-efficient RAG · filtered and compacted evidence",
"测试问题（每行一道）":"Test questions (one per line)","压缩证据预算（估计 token）":"Evidence budget (estimated tokens)","重复次数":"Repeats",
"每次请求独立发送，运行顺序随机；两种 RAG 条件使用同一批检索结果，所有条件使用相同输出上限。用量以服务商返回为准，结果写入 data/logs。":"Each request is sent independently in random order; both RAG conditions use the same retrieved passages and all conditions the same output limit. Usage is as reported by the provider; results are written to data/logs.",
"运行所选条件":"Run selected conditions","回答与实验记录":"Answers and run records","导出完整 JSON":"Export full JSON","导出 CSV":"Export CSV",
"准确性需依据参考答案人工评分。引用编号检查只检查范围，不代表事实或引用正确。":"Accuracy must be scored against reference answers. The citation check only tests the number range, not whether facts or citations are correct.",
"运行后，每个模型、每种条件的结果会显示在这里。":"After a run, the result of each model and condition appears here.","当前知识库":"Current knowledge base","资料片段":"chunks","正在读取…":"Loading…","共享知识库":"Shared knowledge base",
"工作知识库包含已导入的网页正文与本地 PDF 文献，回答可按来源和页码追溯。":"The working knowledge base contains imported web articles and local PDF documents; answers can be traced to the source and page.",
"本地 PDF 文献":"Local PDF documents","搜索本地文献":"Search local documents","搜索网页来源":"Search web sources","导入 / 更新 PDF 文献":"Import / update PDFs",
"读取项目根目录的 data/pdf 文件夹；逐页提取，重复导入会更新 PDF 正文并保留网页资料。原始 PDF 保持原样。明确无关或预览文档保存到资料库，暂不用于问答；提取完成不等于人工审核完成。":"Reads the data/pdf folder page by page; re-importing updates PDF text and keeps web content. Original PDFs are unchanged. Irrelevant or preview documents are stored but not used for Q&A; extraction is not the same as review.",
"网页导入只替换网页语料，保留已导入 PDF 正文，并使旧向量索引失效；原始采集文件保持原样。此版本自动解析 HTML 的 main 区域；PDF 在上方单独导入；特殊页面、表格和自动提取的正文仍需审核。":"Web import replaces only the web part of the corpus, keeps PDF text and invalidates the old vector index; archived files are unchanged. The main region of each HTML page is parsed; PDFs are imported above; special pages, tables and extracted text still need review.",
"用勾选来源更新网页语料":"Update web corpus from selected sources","调用 Embedding API 构建索引":"Build index with the embedding model",
"构建索引将把工作语料发送给配置的 embedding 服务并产生相应用量。标准 RAG 和压缩 RAG 共用这一索引。":"Building the index sends the corpus to the configured embedding service. Standard and token-efficient RAG share this index.",
"或导入已审核的 chunk JSON":"Or import reviewed chunk JSON","导入 JSON 并替换工作语料":"Import JSON and replace the corpus",
"格式示例与操作说明见项目 README。日志写入项目 data/logs 文件夹，片段数据库位于 data/chunks，保留实际提示词、来源元数据和 API 响应。":"See the project README for the format. Logs are written to data/logs and the chunk database is in data/chunks, including prompts, source metadata and API responses.",
"模型 API 配置":"Model API configuration","选择模型，填写模型 ID 和 API Key 后保存。若已用 setx 设置环境变量，Key 会自动加载，这里无需填写。Key 只保存在当前程序内存中，不写入任何文件。":"Choose a model, enter its model ID and API key, and save. Keys set with setx as environment variables are loaded automatically. Keys are kept only in memory and never written to a file.",
"选择要配置的模型":"Model to configure","模型 ID":"Model ID","API Key（留空保留现有 Key）":"API key (leave empty to keep the current key)","高级设置":"Advanced settings","显示名称":"Display name","Key 环境变量名称":"Key environment variable",
"输出限制参数":"Output limit parameter","思考强度 reasoning_effort（none = 关闭思考）":"Reasoning effort (none = thinking off)","不发送":"not sent","none（关闭）":"none (off)","发送 temperature 参数（模型支持时启用）":"Send temperature (if the model supports it)",
"保存":"Save","类型":"Type","本地 sentence-transformers":"Local sentence-transformers","远程兼容 API":"Remote compatible API","查询前缀（本地 BGE 用）":"Query prefix (local BGE)","Base URL（远程用）":"Base URL (remote)","Embedding 模型 ID":"Embedding model ID","保存 Embedding 配置":"Save embedding settings",
"侧边栏":"Sidebar","收起侧边栏":"Collapse sidebar","历史会话":"Chat history","其他页面":"Other pages","打开侧边栏":"Open sidebar","回答模型":"Answer model","切换深色模式":"Switch to dark mode","切换浅色模式":"Switch to light mode",
"询问苹果病虫害的症状、发生条件或管理措施…":"Ask about symptoms, conditions or management of apple pests and diseases…","回答方式":"Answer mode","只用模型已有知识":"Model knowledge only","检索完整资料片段":"Retrieve full passages","筛选与压缩检索证据":"Filter and compact the evidence",
"发送":"Send","发送（Enter）":"Send (Enter)","关闭":"Close","标题、文件名或病虫害专题":"Title, file name or topic",
"请求失败":"Request failed","向量索引未构建":"vector index not built","向量索引已就绪":"vector index ready","向量索引未就绪":"vector index not ready","向量检索可用":"vector search available","语料已冻结，不能修改":"The corpus is frozen and cannot be changed",
"尚未配置模型":"model not configured","密钥已加载，留空保留现有密钥":"Key loaded; leave empty to keep it","尚未加载密钥，请在此填写":"No key loaded; enter it here",
"当前服务已加载此 API 的密钥；输入框不回显密钥。实际连通性以问答调用结果为准。":"A key for this API is loaded (not shown). Connectivity is confirmed by the first answer.",
"当前服务尚未加载此 API 的密钥。请填写并保存，或在启动服务前设置对应环境变量。":"No key for this API is loaded. Enter and save one, or set the environment variable before starting.",
"已收录":"in corpus","未收录":"not in corpus","离线演示 / 非真实 LLM":"Offline demo / not a real LLM","API 结果":"API result","失败":"Failed",
"运行中，请等待 API 返回…":"Running, waiting for the API…","正在依次运行所选组合；每次请求均使用独立上下文。":"Running the selected combinations; every request has its own context.",
"API 配置已保存。Key 不写入磁盘。":"API settings saved. Keys are not written to disk.","Embedding 配置已保存；配置变化后需要重建索引。":"Embedding settings saved; rebuild the index after a change.",
"正在调用 Embedding API 构建共享索引…":"Building the shared index…","请先选择 chunk JSON 文件。":"Choose a chunk JSON file first.","打开本地 PDF ↗":"Open local PDF ↗","正在逐页提取本地 PDF 并更新知识库，请等待完成…":"Extracting local PDFs page by page and updating the knowledge base…",
"苹果黑星病有哪些症状？":"What are the symptoms of apple scab?","识别叶片和果实上的病斑":"Spots on leaves and fruit","苹果蠹蛾的危害特征":"Signs of codling moth damage","火疫病的发生条件":"Conditions for fire blight",
"苹果有哪些常见病虫害？":"What are the common pests and diseases of apples?","病害与虫害概览":"Overview of diseases and pests",
"浏览器存储空间不足，对话记录暂未保存。":"Browser storage is full; chats were not saved.","服务未返回回答记录。":"The server returned no answer record.","模型":"Model","未知错误":"Unknown error","复制":"Copy","已复制":"Copied",
"无法解析服务商域名，请检查网络、DNS 或代理设置后重试。":"The provider's domain could not be resolved; check the network, DNS or proxy and try again.",
"当前网络可能在拦截 HTTPS，请换一个网络（如手机热点）再试。":"This network may be intercepting HTTPS; try another network (e.g. a phone hotspot).",
"模型或网络响应过慢，可以稍后重试或换一个模型。":"The model or network is too slow; try again later or use another model.",
"请检查检索与回答设置，按提示的范围调整后再提交。":"Check the retrieval and answer settings and keep them within the allowed range.",
"服务商拒绝了请求（403），请检查账户权限、模型可用性或网络访问条件。":"The provider refused the request (403); check account permissions, model availability or network access.",
"已达到服务商请求或 token 限额；请等待额度恢复后重试，或切换另一模型。":"The provider's request or token limit was reached; wait and retry, or use another model.",
"服务商暂时不可用或网关超时；稍后重试，或切换另一个已配置模型。":"The provider is temporarily unavailable or timed out; retry later or use another model.",
"服务商未接受密钥（401），请在 API 设置中检查密钥。":"The provider rejected the key (401); check it in API settings.","无法连接本地服务，请确认程序仍在运行。":"Cannot reach the local server; make sure the program is still running.",
"请检查 API 设置与连接，或切换模型后重新提问。":"Check the API settings and connection, or ask again with another model.","浏览器未允许复制，请直接选中文字复制。":"The browser blocked copying; select the text and copy it.",
"从一个问题，了解你的苹果。":"Ask a question about your apple trees.","询问病虫害症状、发生条件与管理措施；RAG 回答会标出所依据的资料。":"Ask about symptoms, conditions and management; RAG answers cite the passages they are based on.",
"编辑后重新发送":"Edit and resend","请等待当前回答完成或先停止生成。":"Wait for the current answer or stop it first.","取消":"Cancel","离线演示 · 非真实模型回答":"Offline demo · not a real model answer",
"正在等待模型回答…":"Waiting for the model…","正在检索资料并等待模型回答…":"Retrieving evidence and waiting for the model…","本次未能获取回答":"No answer was returned","重试":"Retry",
"已停止生成。请求如果已发到本地服务，模型调用仍会完成并写入实验日志。":"Stopped. If the request had reached the local server, the model call still completes and is logged.","已停止生成。":"Stopped.","显示完整回答":"Show full answer",
"API 未返回可显示的回答。请在设置中提高最大输出 token 或切换模型后重试。":"The API returned no text. Increase max output tokens in the settings or try another model.",
"回答达到了输出上限，可能未完整生成。可在设置中提高最大输出 token 后重新生成。":"The answer reached the output limit and may be incomplete. Increase max output tokens and regenerate.",
"重新生成（使用当前设置）":"Regenerate (current settings)","有帮助（仅保存在本机）":"Helpful (saved on this computer only)","没有帮助（仅保存在本机）":"Not helpful (saved on this computer only)","下载本条完整记录（JSON）":"Download the full record (JSON)",
"打开原始来源 ↗":"Open original source ↗","来源地址不可用":"Source address unavailable","未命名资料":"Untitled source","查看实际证据":"Show evidence text","还没有对话":"No chats yet","今天":"Today","7 天内":"Previous 7 days","更早":"Earlier",
"重命名":"Rename","删除":"Delete","停止生成":"Stop generating","请先在 API 设置中配置模型":"Configure a model in API settings first",
"向量检索（bge-small）+ 本地重排序；两种 RAG 条件使用同一批检索结果。":"Vector search (bge-small) + local reranking; both RAG conditions use the same retrieved passages.","向量索引未就绪，RAG 条件暂不可用。":"The vector index is not ready; RAG conditions are unavailable.",
"本地服务连接失败":"Cannot connect to the local server","只支持向量检索（dense）。":"Only dense (vector) retrieval is supported.","尚未构建 embedding 索引。":"The embedding index has not been built.","请填写具体模型 ID。":"Enter a model ID.",
"切换到英文":"Switch to English","切换到中文":"切换到中文"};
const STATUS_EN={"向量索引已就绪":"vector index ready","向量索引未构建":"vector index not built","向量检索可用":"vector search available","向量索引未就绪":"vector index not ready"};
const I18N_RULES=[
[/^版本 (\S+) · (\S+)$/,(_,v,s)=>`Version ${v} · ${STATUS_EN[s]||s}`],
[/^(\d+) 个片段 · (\S+)$/,(_,n,s)=>`${n} chunks · ${STATUS_EN[s]||s}`],
[/^已登记 (\d+) 份 PDF，其中 (\d+) 份用于问答；同时保留已导入的网页资料。请结合来源、页码和原文核对。$/,(_,a,b)=>`${a} PDFs registered, ${b} used for Q&A, together with the imported web articles. Check answers against the source, page and original text.`],
[/^冻结版本 (\S+)（(.+?)）(.*)$/,(_,h,d,rest)=>`Frozen version ${h} (${d})`+rest.replace(" · 向量索引已就绪"," · vector index ready").replace(" · 向量索引未就绪"," · vector index not ready").replace(" · ⚠ 当前语料与冻结记录不一致"," · ⚠ the corpus differs from the freeze record")],
[/^语料已于 (\S+) 冻结（(.*?)）：.*$/,(_,d,v)=>`The corpus was frozen on ${d} (${v}): importing, replacing the corpus, changing the embedding model and rebuilding the index are disabled. Q&A and experiments work as usual.`],
[/^以下参数已按正式实验固定，不在页面中修改：接口 (.+?)；思考 (.+?)；temperature (.+?)；输出上限参数 (.+?)。Embedding：(本地 )?(.+?)(（语料已冻结）)?。$/,(_,u,th,t,o,loc,m,fz)=>{const v=x=>({"关闭":"off","不发送":"not sent"})[x]||x;return `Fixed to the formal-experiment settings and not editable here: endpoint ${u}; thinking ${v(th)}; temperature ${v(t)}; output limit parameter ${o}. Embedding: ${loc?"local ":""}${m}${fz?" (corpus frozen)":""}.`;}],
[/^实验完成：(\d+) 条结果；随机种子 (\d+)。日志已保存。$/,"Done: $1 results; random seed $2. Logs saved."],
[/^(.+) · (无 RAG|标准 RAG|精简 RAG|仅精简标题) · 第 (\d+) 次$/,(_,p,m,r)=>`${p} · ${MODE_EN[m]} · run ${r}`],
[/^(.+) · (无 RAG|标准 RAG|精简 RAG|仅精简标题)$/,(_,p,m)=>`${p} · ${MODE_EN[m]}`],
[/^耗时 ([\d.]+) s$/,"Time $1 s"],[/^输入 (\S+) token$/,"Input $1 tokens"],[/^输出 (\S+) token$/,"Output $1 tokens"],[/^总用量 (\S+)$/,"Total $1"],
[/^证据估计 (\d+) → (\d+) token$/,"Evidence est. $1 → $2 tokens"],[/^模型 (\S+)$/,"Model $1"],
[/^超出证据范围的引用：(.+)$/,"Citations outside the evidence: $1"],[/^查看 (\d+) 条实际证据与来源$/,"Show $1 evidence passages and sources"],
[/^(\d+) 份已登记 · (\d+) 份用于问答 · (\S+) 页$/,"$1 registered · $2 used for Q&A · $3 pages"],[/^(.+) · (\d+) 页$/,"$1 · $2 pages"],
[/^请求超时（(\d+) 秒）未返回。$/,"No response within $1 s (timeout)."],[/^查看来源 (\d+)$/,"Show source $1"],
[/^存在超出证据范围的引用编号：(.+)。请核对原文。$/,"Citation numbers outside the evidence: $1. Check the original text."],[/^来源 (\d+)$/,"Sources $1"],
[/^([\d.]+) s · 输入 (\S+) \/ 输出 (\S+) token$/,"$1 s · input $2 / output $3 tokens"],[/^(\d+) 条$/,(_,n)=>n==="1"?"1 item":`${n} items`],
[/^\[(\d+)\] 未命名资料$/,"[$1] Untitled source"],[/^第 (\d+) 页$/,"Page $1"],[/^日期 (.+)$/,"Date $1"],
[/^删除对话"([\s\S]*)"？\n只删除浏览器中的记录，项目实验日志不受影响。$/,'Delete the chat "$1"?\nOnly the browser copy is deleted; experiment logs are not affected.'],
[/^无法连接本地服务：([\s\S]*)$/,"Cannot connect to the local server: $1"],
[/^API HTTP (\d+)；请检查地址、模型、Key 和参数设置。(.*)$/,"API HTTP $1; check the URL, model, key and parameters.$2"],
[/^无法安全连接 (\S+)：证书不受信任[\s\S]*$/,"Cannot connect securely to $1: the certificate is not trusted (this network may be intercepting HTTPS). Try another network; do not disable certificate checks."],
[/^无法连接 (\S+)：([\s\S]*)$/,"Cannot connect to $1: $2"]];
const I18N_SUBS=[["尚未配置模型","model not configured"],[" · 需要配置"," · needs configuration"]];
function trText(s){
  const m=String(s).match(/^(\s*)([\s\S]*?)(\s*)$/),core=m[2];
  if(!core||!/[㐀-鿿]/.test(core))return s;
  let out=I18N[core];
  if(out===undefined)for(const [re,f] of I18N_RULES){const mm=core.match(re);if(mm){out=typeof f==="function"?f(...mm):core.replace(re,f);break;}}
  if(out===undefined&&core.includes(" · ")){const parts=core.split(" · ").map(trText).join(" · ");if(parts!==core)out=parts;}
  if(out===undefined){let t=core;for(const [a,b] of I18N_SUBS)t=t.split(a).join(b);if(t!==core)out=t;}
  return out===undefined?s:m[1]+out+m[3];
}
const L=s=>LANG==="en"?trText(s):s;
// Never translate model output, user text or source content.
const I18N_SKIP=".md,.bubble,.question,.answer,.evidence,.chat-open,.edit-box,textarea,script,style,.source-card details div";
function trAttrs(e){for(const a of ["title","placeholder","aria-label"]){const v=e.getAttribute(a);if(v){const t=trText(v);if(t!==v)e.setAttribute(a,t);}}}
function trTree(root){
  if(root.nodeType===3){const p=root.parentElement;if(p&&!p.closest(I18N_SKIP)){const t=trText(root.data);if(t!==root.data)root.data=t;}return;}
  if(root.nodeType!==1||root.closest(I18N_SKIP))return;
  trAttrs(root);
  const w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeType===1&&n.matches(I18N_SKIP)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  for(let n=w.nextNode();n;n=w.nextNode()){if(n.nodeType===3){const t=trText(n.data);if(t!==n.data)n.data=t;}else trAttrs(n);}
}
if(LANG==="en"){
  document.documentElement.lang="en";document.title=trText(document.title);trTree(document.body);document.querySelectorAll("textarea").forEach(trAttrs);
  new MutationObserver(ms=>{for(const m of ms){if(m.type==="childList")m.addedNodes.forEach(trTree);else if(m.type==="characterData")trTree(m.target);else if(m.target.nodeType===1&&!m.target.closest(I18N_SKIP))trAttrs(m.target);}})
    .observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["title","placeholder","aria-label"]});
}
$("lang-toggle").textContent=LANG==="en"?"中":"EN";
$("lang-toggle").title=LANG==="en"?"切换到中文":"Switch to English";
$("lang-toggle").onclick=()=>{try{localStorage.setItem("apple-rag-lang",LANG==="en"?"zh":"en");}catch{}location.reload();};

let noticeTimer;
function notice(text,error=false){clearTimeout(noticeTimer);$("notice").hidden=!text;$("notice").textContent=text;$("notice").className=error?"error":"";if(text&&!error)noticeTimer=setTimeout(()=>{$("notice").hidden=true;},6000);}
async function api(path,body,signal){const r=await fetch(path,body===undefined?{signal}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal});const data=await r.json();if(!r.ok)throw new Error(data.error||"请求失败");return data;}
async function action(fn){if(busy)return;busy=true;document.querySelectorAll("button").forEach(b=>b.disabled=true);try{await fn();}catch(e){notice(e.message,true);}finally{busy=false;document.querySelectorAll("button").forEach(b=>b.disabled=false);if(state)applyFreeze();updateComposer();}}
async function refresh(){state=await api("/api/state");$("summary").textContent=`版本 ${state.corpus_hash.slice(0,12)} · ${state.dense_index_ready?"向量索引已就绪":"向量索引未构建"}`;$("corpus-count").replaceChildren(document.createTextNode(state.chunks),el("small","资料片段"));$("sidebar-state").textContent=`${state.chunks} 个片段 · ${state.dense_index_ready?"向量检索可用":"向量索引未就绪"}`;renderProfiles();renderSources();renderPDFDocuments();fillProfile();refreshQAModels();const pdfs=state.pdf_documents||[];const enabled=pdfs.filter(d=>d.qa_enabled);$("library-description").textContent=pdfs.length?`已登记 ${pdfs.length} 份 PDF，其中 ${enabled.length} 份用于问答；同时保留已导入的网页资料。请结合来源、页码和原文核对。`:"起始样本覆盖 Apple Scab、Fire Blight 和 Codling Moth。可导入 data/pdf 文件夹中的文献扩充知识库。";const e=state.config.embedding;$("e-adapter").value=e.adapter||"remote";$("e-prefix").value=e.query_prefix||"";$("e-url").value=e.base_url||"";$("e-model").value=e.model;$("e-env").value=e.key_env;applyFreeze();updateComposer();}
function applyFreeze(){const f=state.freeze;document.querySelectorAll("[data-edit-corpus]").forEach(x=>{x.hidden=!!f;});for(const id of ["import-pdfs","import-sources","build-index","import-json"]){const b=$(id);if(b){b.disabled=!!f;b.title=f?"语料已冻结，不能修改":"";}}const save=$("embedding-form").querySelector('button[type="submit"]');if(save)save.disabled=!!f;if(f){$("summary").textContent=`冻结版本 ${f.corpus_hash.slice(0,12)}（${f.frozen_at.slice(0,10)}）${f.matches_current_corpus?" · 向量索引"+(state.dense_index_ready?"已就绪":"未就绪"):" · ⚠ 当前语料与冻结记录不一致"}`;$("library-description").textContent=`语料已于 ${f.frozen_at.slice(0,10)} 冻结（${f.version||""}）：导入、替换语料、修改 Embedding 和重建索引已停用。问答与实验对比照常使用。`;}}
function renderProfiles(){const previous=[...document.querySelectorAll("input[name=profile]:checked")].map(x=>x.value);const current=$("profile-editor").value;$("profiles").replaceChildren();$("profile-editor").replaceChildren();const shown=answerModels();for(const p of state.config.profiles){const l=el("label"),input=el("input");input.type="checkbox";input.name="profile";input.value=p.id;input.checked=previous.length?previous.includes(p.id):p===shown.find(x=>x.model&&x.key_available);l.append(input,document.createTextNode(` ${p.name}${p.adapter==="demo"?"":` · ${p.model||"尚未配置模型"}`}`));if(shown.includes(p))$("profiles").append(l);if(p.adapter!=="demo"){const o=el("option",p.name);o.value=p.id;$("profile-editor").append(o);}}if(current)$("profile-editor").value=current;}
function fillProfile(){const p=state.config.profiles.find(p=>p.id===$("profile-editor").value);if(!p)return;$("p-name").value=p.name;$("p-model").value=p.model;$("p-url").value=p.base_url;$("p-env").value=p.key_env;$("p-output").value=p.output_parameter||"max_tokens";$("p-send-temp").checked=!!p.send_temperature;$("p-temp").value=p.temperature||0;$("p-effort").value=p.reasoning_effort||"";$("p-key").value="";$("p-key").placeholder=p.key_available?"密钥已加载，留空保留现有密钥":"尚未加载密钥，请在此填写";let status=$("profile-key-status");if(!status){status=el("p",undefined,"hint");status.id="profile-key-status";status.setAttribute("role","status");$("profile-form").before(status);}status.textContent=p.key_available?"当前服务已加载此 API 的密钥；输入框不回显密钥。实际连通性以问答调用结果为准。":"当前服务尚未加载此 API 的密钥。请填写并保存，或在启动服务前设置对应环境变量。";const e=state.config.embedding;$("fixed-settings").textContent=`以下参数已按正式实验固定，不在页面中修改：接口 ${p.base_url||"—"}；思考 ${p.reasoning_effort==="none"?"关闭":p.reasoning_effort||"不发送"}；temperature ${p.send_temperature?p.temperature||0:"不发送"}；输出上限参数 ${p.output_parameter||"max_tokens"}。Embedding：${e.adapter==="local"?"本地 ":""}${e.model}${state.freeze?"（语料已冻结）":""}。`;}
function renderSources(){
  const selected=new Set([...$("source-list").querySelectorAll("input:checked")].map(x=>x.value));
  const reviewRequired=state.sources.some(s=>s.web_review_status);
  if(!$("source-list").children.length){const reviewed=state.sources.filter(s=>s.web_review_status==="approved"&&s.qa_enabled);(reviewed.length?reviewed.map(s=>s.source_id):["S001","S002","S006"]).forEach(x=>selected.add(x));}
  const search=$("source-search").value.toLowerCase();$("source-list").replaceChildren();
  for(const s of state.sources){
    if((reviewRequired&&s.web_review_status!=="approved")||s.qa_enabled===false||!["core","support","local_management","identification"].includes(s.role)||!s.local_file?.endsWith(".html")||!s.download_status?.startsWith("downloaded"))continue;
    const frozen=!!state.freeze,l=el(frozen?"div":"label",undefined,frozen?"source-row":undefined),c=el("input");c.type="checkbox";c.value=s.source_id;c.checked=selected.has(s.source_id);
    if(frozen){l.append(el("span",`${s.source_id} · ${s.title}`));if(Array.isArray(state.corpus_source_ids)){const inCorpus=state.corpus_source_ids.includes(s.source_id);l.append(el("span",inCorpus?"已收录":"未收录","badge"+(inCorpus?" in-corpus":"")));}}else l.append(c,document.createTextNode(` ${s.source_id} · ${s.title}`));
    l.append(el("small",[s.organization,s.region].filter(Boolean).join(" · ")));
    l.hidden=!`${s.source_id} ${s.title} ${s.organization}`.toLowerCase().includes(search);$("source-list").append(l);
  }
}
function displayResults(data){$("result-list").replaceChildren();notice(`实验完成：${data.results.length} 条结果；随机种子 ${data.randomization_seed}。日志已保存。`);for(const r of data.results){const card=el("article",undefined,"result"),head=el("div",undefined,"result-title");head.append(el("span",`${r.profile.name} · ${names[r.mode]} · 第 ${r.repeat} 次`),el("span",r.is_demo?"离线演示 / 非真实 LLM":r.status==="success"?"API 结果":"失败","badge"));card.append(head,el("div",r.question,"question"));const u=r.usage||{},metrics=el("div",undefined,"metrics");for(const text of [`耗时 ${r.end_to_end_seconds.toFixed(3)} s`,`输入 ${u.prompt_tokens??"—"} token`,`输出 ${u.completion_tokens??"—"} token`,`总用量 ${u.total_tokens??"—"}`,`模型 ${r.response_metadata?.model||r.profile.model}`])metrics.append(el("span",text));card.append(metrics,r.status==="success"?renderMarkdown(r.answer,{evidence:0}):el("div",r.error,"answer"));if(r.invalid_citation_ids?.length)card.append(el("p",`超出证据范围的引用：${r.invalid_citation_ids.join(", ")}`,"hint"));const d=el("details"),s=el("summary",`查看 ${r.evidence?.length||0} 条实际证据与来源`);d.append(s);for(const [i,e] of (r.evidence||[]).entries()){const box=el("div",undefined,"evidence");box.append(el("strong",`[${i+1}] ${e.metadata.title} · ${e.metadata.section||""}`),el("div",`${e.metadata.organization||""} · ${e.metadata.region||""}`));try{const url=new URL(e.metadata.url,location.origin);if(url.pathname==="/api/pdf"&&e.metadata.page)url.hash=`page=${e.metadata.page}`;if(["http:","https:"].includes(url.protocol)){const a=el("a",url.href);a.href=url.href;a.target="_blank";a.rel="noopener noreferrer";box.append(a);}}catch{}box.append(el("div",e.text));d.append(box);}card.append(d);$("result-list").append(card);}}
$("profile-editor").addEventListener("change",fillProfile);
$("source-search").addEventListener("input",renderSources);
$("run").onclick=()=>action(async()=>{const body={questions:$("questions").value.split("\n").map(x=>x.trim()).filter(Boolean),profile_ids:[...document.querySelectorAll("input[name=profile]:checked")].map(x=>x.value),modes:[...document.querySelectorAll("input[name=mode]:checked")].map(x=>x.value),retrieval:$("retrieval").value,top_k:Number($("top-k").value),budget:Number($("budget").value),max_output:Number($("max-output").value),repeats:Number($("repeats").value)};$("run-status").textContent="运行中，请等待 API 返回…";notice("正在依次运行所选组合；每次请求均使用独立上下文。");try{displayResults(await api("/api/run",body));$("results").scrollIntoView({behavior:"smooth"});}finally{$("run-status").textContent="";}});
$("profile-form").onsubmit=event=>{event.preventDefault();action(async()=>{const profile={id:$("profile-editor").value,adapter:state.config.profiles.find(p=>p.id===$("profile-editor").value)?.adapter||"chat",name:$("p-name").value,model:$("p-model").value.trim(),base_url:$("p-url").value.trim(),key_env:$("p-env").value.trim(),output_parameter:$("p-output").value,send_temperature:$("p-send-temp").checked,temperature:Number($("p-temp").value),reasoning_effort:$("p-effort").value};await api("/api/config",{profile,api_key:$("p-key").value.trim()});$("p-key").value="";await refresh();notice("API 配置已保存。Key 不写入磁盘。");});};
$("embedding-form").onsubmit=event=>{event.preventDefault();action(async()=>{await api("/api/config",{embedding:{adapter:$("e-adapter").value,query_prefix:$("e-prefix").value,base_url:$("e-url").value.trim(),model:$("e-model").value.trim(),key_env:$("e-env").value.trim()},api_key:$("e-key").value.trim()});$("e-key").value="";await refresh();notice("Embedding 配置已保存；配置变化后需要重建索引。");});};
$("import-sources").onclick=()=>action(async()=>{const r=await api("/api/import",{source_ids:[...$("source-list").querySelectorAll("input:checked")].map(x=>x.value)});await refresh();notice(`已导入 ${r.sources} 个网页来源，PDF 正文保留；工作库共 ${r.chunks} 个片段。请检查正文质量并重建向量索引。`);});
$("build-index").onclick=()=>action(async()=>{notice("正在调用 Embedding API 构建共享索引…");const r=await api("/api/build-index",{});await refresh();notice(`索引构建完成，耗时 ${r.build_seconds.toFixed(2)} 秒。构建用量已另行保存。`);});
$("import-json").onclick=()=>action(async()=>{const file=$("json-file").files[0];if(!file)throw new Error("请先选择 chunk JSON 文件。");const parsed=JSON.parse(await file.text());const r=await api("/api/import-json",{chunks:Array.isArray(parsed)?parsed:parsed.chunks});await refresh();notice(`已导入 ${r.chunks} 个片段，请重建向量索引。`);});
function renderPDFDocuments(){const docs=state.pdf_documents||[];const report=state.pdf_import_report;$("pdf-summary").textContent=docs.length?`${docs.length} 份已登记 · ${docs.filter(d=>d.qa_enabled).length} 份用于问答 · ${report?.pages??"—"} 页`:"尚未导入本地 PDF";const query=$("pdf-search").value.toLowerCase();$("pdf-list").replaceChildren();for(const doc of docs){if(!`${doc.title} ${doc.filename} ${(doc.topics||[]).join(" ")}`.toLowerCase().includes(query))continue;const card=el("article",undefined,"pdf-document");card.append(el("strong",doc.title),el("p",`${doc.filename} · ${doc.page_count} 页`,"hint"),el("p",doc.scope_note,"hint"));const url=new URL(doc.local_url,location.origin);if(url.origin===location.origin&&url.pathname==="/api/pdf"){const link=el("a","打开本地 PDF ↗");link.href=url.href;link.target="_blank";link.rel="noopener noreferrer";card.append(link);}$("pdf-list").append(card);}}
$("pdf-search").oninput=()=>{if(state)renderPDFDocuments();};
$("import-pdfs").onclick=()=>action(async()=>{notice("正在逐页提取本地 PDF 并更新知识库，请等待完成…");const report=await api("/api/import-pdfs",{});await refresh();notice(`PDF 导入完成：${report.documents} 份已登记、${report.qa_documents} 份用于问答，工作库共 ${report.working_chunks} 个片段。详情与排除原因见文献列表。`);});

/* ───────────────────────── Chat ─────────────────────────
   Each question is sent on its own (one question, one model, one condition), exactly like one cell of
   the experiment; earlier turns are never sent as context. Sessions live only in this browser. */
const CHAT_KEY="apple-rag-chats-v1", OLD_HISTORY_KEY="apple-rag-qa-history-v1", THEME_KEY="apple-rag-theme", SIDEBAR_KEY="apple-rag-sidebar";
const REQUEST_TIMEOUT_MS=180000;
const EXAMPLES=[
  ["苹果黑星病有哪些症状？","识别叶片和果实上的病斑"],
  ["How can codling moth damage be identified in apples?","苹果蠹蛾的危害特征"],
  ["What conditions favor fire blight in apples?","火疫病的发生条件"],
  ["苹果有哪些常见病虫害？","病害与虫害概览"]];
const ICON={
  copy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h8"/>',
  check:'<path d="M5 12l5 5 9-10"/>',
  retry:'<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  up:'<path d="M7 11v9H4v-9zM7 11l4-7a2 2 0 0 1 3 2l-1 4h6a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.8 20H7"/>',
  down:'<path d="M7 13V4H4v9zM7 13l4 7a2 2 0 0 0 3-2l-1-4h6a2 2 0 0 0 2-2.3l-1.2-6A2 2 0 0 0 17.8 4H7"/>',
  edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  trash:'<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  doc:'<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  download:'<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  send:'<path d="M12 19V5M6 11l6-6 6 6"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:'<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>'};
function svg(name){const s=document.createElementNS("http://www.w3.org/2000/svg","svg");s.setAttribute("viewBox","0 0 24 24");s.setAttribute("aria-hidden","true");s.innerHTML=ICON[name];return s;}
function iconButton(name,label,onclick,cls){const b=el("button",undefined,"icon-btn"+(cls?" "+cls:""));b.type="button";b.title=label;b.setAttribute("aria-label",label);b.append(svg(name));b.onclick=onclick;return b;}
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);

let sessions=[], currentId=null, gen=null, stick=true;
// gen = {sid, mid, controller, timer, timeout, timedOut} while one answer is being fetched or typed.

function slimRecord(r){return {id:r.id,question:r.question,profile:{id:r.profile?.id,name:r.profile?.name,model:r.profile?.model},mode:r.mode,settings:r.settings,status:r.status,answer:r.answer,error:r.error,is_demo:r.is_demo,evidence:r.evidence,usage:r.usage,response_metadata:r.response_metadata,end_to_end_seconds:r.end_to_end_seconds,context_estimated_tokens:r.context_estimated_tokens,invalid_citation_ids:r.invalid_citation_ids,date_utc:r.date_utc,corpus_hash:r.corpus_hash,query_normalization:r.query_normalization};}
function loadSessions(){
  try{const saved=JSON.parse(localStorage.getItem(CHAT_KEY)||"null");if(Array.isArray(saved))sessions=saved.filter(s=>s&&s.id&&Array.isArray(s.messages));}catch{}
  if(sessions.length)return;
  // One-time import of the earlier single-answer history: each old answer becomes its own session.
  try{const old=JSON.parse(localStorage.getItem(OLD_HISTORY_KEY)||"[]");if(Array.isArray(old))for(const r of old){if(!r||typeof r.question!=="string"||!r.profile)continue;const t=Date.parse(r.date_utc)||Date.now();sessions.push({id:"s-"+(r.id||uid()),title:r.question.slice(0,40),createdAt:t,updatedAt:t,messages:[{id:uid(),role:"user",text:r.question},{id:uid(),role:"assistant",status:r.status==="success"?"done":"error",error:r.error,record:r,request:{profile_id:r.profile.id,mode:r.mode}}]});}}catch{}
  if(sessions.length)saveSessions();
  try{localStorage.removeItem(OLD_HISTORY_KEY);}catch{}
}
function saveSessions(){
  const keep=sessions=sessions.slice().sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,60);
  for(;;){try{localStorage.setItem(CHAT_KEY,JSON.stringify(keep));return;}catch{
    const victim=keep.map((s,i)=>i).reverse().find(i=>keep[i].id!==currentId);
    if(victim===undefined||keep.length<=1){notice("浏览器存储空间不足，对话记录暂未保存。",true);return;}
    keep.splice(victim,1);}}
}
const current=()=>sessions.find(s=>s.id===currentId);

/* ── Backend call ──
   接口：POST /api/run，请求体与实验对比页相同，后端一次返回完整记录（不是流式）。
   打字机效果在前端模拟。若后端以后改为 SSE / 分块输出，只需改这个函数：
   逐块读取 response.body，并对每段文字调用 onDelta(text)，其余界面代码不用动。
   注意：中止只取消浏览器端的等待；请求已到达本地服务时，模型调用仍会完成并写入日志。 */
async function requestAnswer(body,signal){
  const data=await api("/api/run",body,signal);
  const record=data.results?.[0];
  if(!record)throw new Error("服务未返回回答记录。");
  return record;
}

function readRequest(){return {profile_id:$("qa-model").value,mode:document.querySelector('input[name="qa-mode"]:checked').value,top_k:Number($("qa-top-k").value),budget:Number($("qa-budget").value),max_output:Number($("qa-output").value)};}
function profileName(id){return state?.config.profiles.find(p=>p.id===id)?.name||"模型";}

function submitQuestion(text){
  if(gen||!state)return;
  let s=current();const now=Date.now();
  if(!s){s={id:uid(),title:text.replace(/\s+/g," ").slice(0,40),createdAt:now,updatedAt:now,messages:[]};sessions.unshift(s);currentId=s.id;}
  s.messages.push({id:uid(),role:"user",text});
  const a={id:uid(),role:"assistant",status:"pending",request:readRequest()};
  s.messages.push(a);s.updatedAt=now;saveSessions();
  location.hash="qa";renderThread();renderChatList();stick=true;scrollToBottom();
  runAnswer(s,a,text);
}
async function runAnswer(s,a,question){
  const controller=new AbortController();
  gen={sid:s.id,mid:a.id,controller,timer:null,timedOut:false};
  gen.timeout=setTimeout(()=>{gen.timedOut=true;controller.abort();},REQUEST_TIMEOUT_MS);
  updateComposer();
  const r=a.request;
  const body={questions:[question],profile_ids:[r.profile_id],modes:[r.mode],retrieval:"dense",top_k:r.top_k,budget:r.budget,max_output:r.max_output,repeats:1,answer_language:"auto"};
  try{
    const record=await requestAnswer(body,controller.signal);
    clearTimeout(gen.timeout);
    a.record=slimRecord(record);
    if(record.status!=="success"){a.status="error";a.error=record.error||"未知错误";finish(a);return;}
    a.status="typing";a.shown=0;renderMessage(s,a);typeOut(s,a);
  }catch(e){
    if(e.name==="AbortError"&&!gen?.timedOut){a.status="stopped";}
    else{a.status="error";a.error=e.name==="AbortError"?`请求超时（${REQUEST_TIMEOUT_MS/1000} 秒）未返回。`:e.message;}
    finish(a);
  }
}
// Client-side typewriter over the complete answer; the whole reveal takes at most ~2.5 s.
function typeOut(s,a){
  const full=a.record.answer||"";const step=Math.max(1,Math.ceil(full.length/80));
  gen.timer=setInterval(()=>{a.shown=Math.min(full.length,a.shown+step);updateAssistantBody(s,a);if(a.shown>=full.length){a.status="done";finish(a);}},30);
}
function stopGeneration(){
  if(!gen)return;const s=sessions.find(x=>x.id===gen.sid),a=s?.messages.find(m=>m.id===gen.mid);
  if(!a)return;
  if(a.status==="typing"){a.status="stopped";finish(a);}else gen.controller.abort();
}
function finish(a){
  if(gen&&gen.mid===a.id){clearInterval(gen.timer);clearTimeout(gen.timeout);gen=null;}
  if(a.status==="done")delete a.shown;
  const s=sessions.find(x=>x.messages.includes(a));
  if(s){s.updatedAt=Date.now();renderMessage(s,a);}
  saveSessions();updateComposer();renderChatList();
}
function regenerate(s,a){
  if(gen)return;const idx=s.messages.indexOf(a);const q=s.messages[idx-1];if(!q||q.role!=="user")return;
  const next={id:uid(),role:"assistant",status:"pending",request:readRequest()};
  s.messages=s.messages.slice(0,idx).concat(next);s.updatedAt=Date.now();saveSessions();
  renderThread();stick=true;scrollToBottom();runAnswer(s,next,q.text);
}
function resend(s,m,text){
  if(gen)return;const idx=s.messages.indexOf(m);m.text=text;
  const next={id:uid(),role:"assistant",status:"pending",request:readRequest()};
  s.messages=s.messages.slice(0,idx+1).concat(next);s.updatedAt=Date.now();saveSessions();
  renderThread();stick=true;scrollToBottom();runAnswer(s,next,text);
}

/* ── Safe Markdown ──
   Model output is never inserted as HTML: every node is built with createElement/textContent. */
function inline(parent,text,ctx){
  const re=/(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\s][^*\n]*\*|\[\d+(?:\s*[,，]\s*\d+)*\]|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g;
  for(const token of text.split(re)){
    if(!token)continue;
    if(/^\[\d+(?:\s*[,，]\s*\d+)*\]$/.test(token)){
      const nums=token.slice(1,-1).split(/[,，]/).map(n=>Number(n.trim()));
      if(ctx.evidence&&nums.every(n=>n>0&&n<=ctx.evidence)){for(const n of nums){const b=el("button",String(n),"citation");b.type="button";b.title=`查看来源 ${n}`;b.onclick=()=>ctx.cite(n);parent.append(b);}}
      else parent.append(document.createTextNode(token));
    }else if(/^\[[^\]]+\]\(https?:/.test(token)){
      const m=token.match(/^\[([^\]]+)\]\((.+)\)$/);const a=el("a",m[1]);a.href=m[2];a.target="_blank";a.rel="noopener noreferrer";parent.append(a);
    }else if(token.startsWith("`")&&token.endsWith("`")&&token.length>2)parent.append(el("code",token.slice(1,-1)));
    else if((token.startsWith("**")&&token.endsWith("**")||token.startsWith("__")&&token.endsWith("__"))&&token.length>4){const b=el("strong");inline(b,token.slice(2,-2),ctx);parent.append(b);}
    else if(token.startsWith("*")&&token.endsWith("*")&&token.length>2){const i=el("em");inline(i,token.slice(1,-1),ctx);parent.append(i);}
    else parent.append(document.createTextNode(token));
  }
}
const KEYWORDS={js:"const let var function return if else for while of in new class import export from async await try catch throw true false null undefined",py:"def return if elif else for while in import from as class try except raise with lambda True False None and or not pass yield",sh:"if then else fi for do done case esac echo export function in",sql:"select from where and or insert into update delete create table join on group by order limit as"};
const LANG_ALIAS={javascript:"js",ts:"js",typescript:"js",json:"js",python:"py",bash:"sh",shell:"sh",powershell:"sh",ps1:"sh"};
function highlight(code,lang){
  const key=LANG_ALIAS[lang]||lang;const words=KEYWORDS[key];const hashComments=key==="py"||key==="sh"||lang==="yaml"||lang==="r";
  const parts=[hashComments?/#[^\n]*/.source:/\/\/[^\n]*|\/\*[\s\S]*?\*\//.source,/"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/.source,/\b\d+(?:\.\d+)?\b/.source];
  if(words)parts.push(`\\b(?:${words.split(" ").join("|")})\\b`);
  const re=new RegExp(parts.map(p=>`(${p})`).join("|"),key==="sql"?"gi":"g");
  const frag=document.createDocumentFragment();let last=0,m;
  while((m=re.exec(code))){if(m.index>last)frag.append(document.createTextNode(code.slice(last,m.index)));const cls=m[1]?"hl-c":m[2]?"hl-s":m[3]?"hl-n":"hl-k";frag.append(el("span",m[0],cls));last=re.lastIndex;if(!m[0].length)re.lastIndex++;}
  frag.append(document.createTextNode(code.slice(last)));return frag;
}
function codeBlock(code,lang){
  const box=el("div",undefined,"code-block"),head=el("div",undefined,"code-head"),copy=el("button");copy.type="button";copy.append(svg("copy"),document.createTextNode("复制"));
  copy.onclick=()=>copyText(code,copy,true);head.append(el("span",lang||"text"),copy);
  const pre=el("pre"),c=el("code");c.append(highlight(code,(lang||"").toLowerCase()));pre.append(c);box.append(head,pre);return box;
}
function splitRow(line){return line.trim().replace(/^\|/,"").replace(/\|$/,"").split("|").map(x=>x.trim());}
function renderMarkdown(text,ctx){
  const root=el("div",undefined,"md");const lines=String(text||"").replace(/\r\n?/g,"\n").split("\n");let i=0,para=null;
  const listStack=[];// [{indent,list}]
  const closeLists=()=>{listStack.length=0;};
  while(i<lines.length){
    const raw=lines[i],line=raw.trim();
    const fence=line.match(/^```\s*([\w+-]*)/);
    if(fence){const body=[];i++;while(i<lines.length&&!lines[i].trim().startsWith("```")){body.push(lines[i]);i++;}i++;root.append(codeBlock(body.join("\n"),fence[1]));para=null;closeLists();continue;}
    if(!line){para=null;closeLists();i++;continue;}
    const heading=line.match(/^(#{1,6})\s+(.*)$/);
    if(heading){const h=el(heading[1].length<=3?"h3":"h4");inline(h,heading[2],ctx);root.append(h);para=null;closeLists();i++;continue;}
    if(/^(-{3,}|\*{3,}|_{3,})$/.test(line)){root.append(el("hr"));para=null;closeLists();i++;continue;}
    if(line.startsWith(">")){const quoted=[];while(i<lines.length&&lines[i].trim().startsWith(">")){quoted.push(lines[i].trim().replace(/^>\s?/,""));i++;}const q=el("blockquote");q.append(renderMarkdown(quoted.join("\n"),ctx));root.append(q);para=null;closeLists();continue;}
    if(line.includes("|")&&i+1<lines.length&&/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i+1])){
      const table=el("table"),thead=el("thead"),tbody=el("tbody"),hr=el("tr");
      for(const cell of splitRow(line)){const th=el("th");inline(th,cell,ctx);hr.append(th);}thead.append(hr);i+=2;
      while(i<lines.length&&lines[i].includes("|")&&lines[i].trim()){const tr=el("tr");for(const cell of splitRow(lines[i])){const td=el("td");inline(td,cell,ctx);tr.append(td);}tbody.append(tr);i++;}
      table.append(thead,tbody);root.append(table);para=null;closeLists();continue;
    }
    const item=raw.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if(item){
      const indent=item[1].replace(/\t/g,"  ").length,kind=/\d/.test(item[2])?"ol":"ul";
      while(listStack.length&&indent<listStack[listStack.length-1].indent)listStack.pop();
      let top=listStack[listStack.length-1];
      if(!top||indent>top.indent||top.list.tagName.toLowerCase()!==kind){
        const list=el(kind);
        if(top&&indent>top.indent&&top.list.lastElementChild)top.list.lastElementChild.append(list);
        else{if(top&&indent===top.indent)listStack.pop();root.append(list);}
        listStack.push(top={indent,list});
      }
      const li=el("li");inline(li,item[3],ctx);top.list.append(li);para=null;i++;continue;
    }
    if(listStack.length&&/^\s+/.test(raw)){const li=listStack[listStack.length-1].list.lastElementChild;li.append(el("br"));inline(li,line,ctx);i++;continue;}
    closeLists();
    if(!para){para=el("p");root.append(para);}else para.append(el("br"));
    inline(para,line,ctx);i++;
  }
  return root;
}

/* ── Rendering ── */
function errorGuidance(message){const m=message||"";return /getaddrinfo|11001|Name or service not known|nodename nor servname/.test(m)?"无法解析服务商域名，请检查网络、DNS 或代理设置后重试。":/证书不受信任/.test(m)?"当前网络可能在拦截 HTTPS，请换一个网络（如手机热点）再试。":/超时/.test(m)?"模型或网络响应过慢，可以稍后重试或换一个模型。":/参数范围|请选择|请输入/.test(m)?"请检查检索与回答设置，按提示的范围调整后再提交。":/403/.test(m)?"服务商拒绝了请求（403），请检查账户权限、模型可用性或网络访问条件。":/429/.test(m)?"已达到服务商请求或 token 限额；请等待额度恢复后重试，或切换另一模型。":/50[234]/.test(m)?"服务商暂时不可用或网关超时；稍后重试，或切换另一个已配置模型。":/401/.test(m)?"服务商未接受密钥（401），请在 API 设置中检查密钥。":/Failed to fetch|NetworkError/.test(m)?"无法连接本地服务，请确认程序仍在运行。":"请检查 API 设置与连接，或切换模型后重新提问。";}
async function copyText(text,button,labelled){try{await navigator.clipboard.writeText(text);if(button){const old=[...button.childNodes];button.replaceChildren(svg("check"),...(labelled?[document.createTextNode("已复制")]:[]));setTimeout(()=>button.replaceChildren(...old),1200);}}catch{notice("浏览器未允许复制，请直接选中文字复制。",true);}}
function renderWelcome(){
  const box=el("div",undefined,"welcome");const mark=el("div","G","brand-mark");
  box.append(mark,el("h1","从一个问题，了解你的苹果。"),el("p","询问病虫害症状、发生条件与管理措施；RAG 回答会标出所依据的资料。"));
  const grid=el("div",undefined,"examples");
  for(const [q,sub] of EXAMPLES){const b=el("button",undefined,"example");b.type="button";b.append(el("strong",q),el("small",sub));b.onclick=()=>{if(!gen&&state&&$("qa-model").value)submitQuestion(L(q));else{$("qa-question").value=L(q);autosize();updateComposer();$("qa-question").focus();}};grid.append(b);}
  box.append(grid);return box;
}
function renderThread(){
  closeSources();const thread=$("thread");thread.replaceChildren();const s=current();
  if(!s||!s.messages.length)thread.append(renderWelcome());
  else for(const m of s.messages)thread.append(buildMessage(s,m));
  updateTitle();setTimeout(updateStick,0);
}
function renderMessage(s,m){
  if(s.id!==currentId)return;const node=$("thread").querySelector(`[data-id="${m.id}"]`);
  const body=node?.querySelector("[data-body]");
  if(body)fillAssistantBody(s,m,body);else if(node)node.replaceWith(buildMessage(s,m));
  if(stick)scrollToBottom();
}
function buildMessage(s,m){return m.role==="user"?buildUser(s,m):buildAssistant(s,m);}
function buildUser(s,m){
  const box=el("div",undefined,"msg user");box.dataset.id=m.id;
  const bubble=el("div",m.text,"bubble");const actions=el("div",undefined,"msg-actions");
  actions.append(iconButton("copy","复制",e=>copyText(m.text,e.currentTarget)),iconButton("edit","编辑后重新发送",()=>{
    if(gen)return notice("请等待当前回答完成或先停止生成。",true);
    const edit=el("div",undefined,"edit-box"),ta=el("textarea"),row=el("div",undefined,"row"),cancel=el("button","取消"),save=el("button","发送","primary");
    ta.value=m.text;cancel.type=save.type="button";cancel.onclick=()=>box.replaceWith(buildUser(s,m));
    save.onclick=()=>{const t=ta.value.trim();if(t)resend(s,m,t);};
    ta.onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();save.click();}else if(e.key==="Escape")cancel.click();};
    row.append(cancel,save);edit.append(ta,row);box.replaceChildren(edit);ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length);
  }));
  box.append(bubble,actions);return box;
}
function buildAssistant(s,a){
  const box=el("div",undefined,"msg assistant");box.dataset.id=a.id;
  const body=el("div",undefined,"msg-body");body.dataset.body="";
  const r=a.record,mode=r?.mode||a.request?.mode,meta=el("div",undefined,"msg-meta");
  meta.append(document.createTextNode(`${r?.profile?.name||profileName(a.request?.profile_id)} · ${names[mode]||mode}`));
  if(r?.is_demo)meta.append(el("span","离线演示 · 非真实模型回答","badge"));
  box.append(el("div","G","avatar"),body);body.append(meta);
  fillAssistantBody(s,a,body);
  return box;
}
function fillAssistantBody(s,a,body){
  const r=a.record,mode=r?.mode||a.request?.mode,isLast=s.messages[s.messages.length-1]===a;
  while(body.children.length>1)body.lastChild.remove();
  if(a.status==="pending"){const t=el("div",undefined,"thinking"),d=el("span",undefined,"dots");d.append(el("i"),el("i"),el("i"));t.append(d,el("span",mode==="non_rag"?"正在等待模型回答…":"正在检索资料并等待模型回答…"));body.append(t);return;}
  if(a.status==="error"){
    const e=el("div",undefined,"msg-error");e.append(el("strong","本次未能获取回答"),el("p",a.error||"未知错误"),el("p",errorGuidance(a.error)));
    if(isLast){const b=el("button","重试");b.type="button";b.onclick=()=>regenerate(s,a);e.append(b);}
    body.append(e);return;
  }
  if(!r){body.append(el("p","已停止生成。请求如果已发到本地服务，模型调用仍会完成并写入实验日志。","msg-note"));if(isLast)body.append(actionsRow(s,a,isLast));return;}
  const full=r.answer||"",typing=a.status==="typing",shown=typeof a.shown==="number"?full.slice(0,a.shown):full;
  const md=renderMarkdown(shown,{evidence:(r.evidence||[]).length,cite:n=>openSources(r,n)});
  if(typing){const blocks=md.querySelectorAll("p,li,h3,h4,th,td,pre code");(blocks[blocks.length-1]||md).append(el("span",undefined,"caret"));}
  body.append(md);
  if(typing)return;
  if(a.status==="stopped"&&a.shown<full.length){const n=el("p","已停止生成。","msg-note"),b=el("button","显示完整回答");b.type="button";b.onclick=()=>{a.status="done";delete a.shown;saveSessions();renderMessage(s,a);};n.append(b);body.append(n);}
  if(!full.trim())body.append(el("p","API 未返回可显示的回答。请在设置中提高最大输出 token 或切换模型后重试。","msg-note"));
  if(r.response_metadata?.finish_reason==="length")body.append(el("p","回答达到了输出上限，可能未完整生成。可在设置中提高最大输出 token 后重新生成。","msg-note"));
  if(r.invalid_citation_ids?.length)body.append(el("p",`存在超出证据范围的引用编号：${r.invalid_citation_ids.join(", ")}。请核对原文。`,"msg-note"));
  body.append(actionsRow(s,a,isLast));
}
function actionsRow(s,a,isLast){
  const r=a.record,row=el("div",undefined,"msg-actions");
  if(r?.answer)row.append(iconButton("copy","复制",e=>copyText(r.answer,e.currentTarget)));
  if(isLast)row.append(iconButton("retry","重新生成（使用当前设置）",()=>regenerate(s,a)));
  if(r){
    const vote=v=>()=>{a.feedback=a.feedback===v?undefined:v;saveSessions();renderMessage(s,a);};
    row.append(iconButton("up","有帮助（仅保存在本机）",vote("up"),a.feedback==="up"?"on":""),iconButton("down","没有帮助（仅保存在本机）",vote("down"),a.feedback==="down"?"on":""));
    row.append(iconButton("download","下载本条完整记录（JSON）",()=>{const blob=new Blob([JSON.stringify(r,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),link=el("a");link.href=url;link.download=`apple-answer-${r.id}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
    const n=(r.evidence||[]).length;
    if(n){const chip=el("button",undefined,"chip");chip.type="button";chip.append(svg("doc"),document.createTextNode(`来源 ${n}`));chip.onclick=()=>openSources(r);row.append(chip);}
    const u=r.usage||{};row.append(el("span",`${Number(r.end_to_end_seconds||0).toFixed(1)} s · 输入 ${u.prompt_tokens??"—"} / 输出 ${u.completion_tokens??"—"} token`,"msg-stats"));
  }
  return row;
}
function updateAssistantBody(s,a){
  if(s.id!==currentId)return;const body=$("thread").querySelector(`[data-id="${a.id}"] [data-body]`);
  if(body)fillAssistantBody(s,a,body);if(stick)scrollToBottom();
}

/* ── Evidence drawer ── */
function sourceLink(metadata){try{const url=new URL(metadata.url,location.origin);if(url.pathname==="/api/pdf"&&metadata.page)url.hash=`page=${metadata.page}`;if(["http:","https:"].includes(url.protocol)){const a=el("a",metadata.url?.startsWith("/api/pdf")?"打开本地 PDF ↗":"打开原始来源 ↗");a.href=url.href;a.target="_blank";a.rel="noopener noreferrer";return a;}}catch{}return el("span","来源地址不可用","hint");}
function openSources(record,focus){
  const evidence=record.evidence||[];$("evidence-count").textContent=`${evidence.length} 条`;$("qa-sources").replaceChildren();
  for(const [i,e] of evidence.entries()){const m=e.metadata||{},card=el("article",undefined,"source-card");card.id=`qa-source-${i+1}`;
    card.append(el("strong",`[${i+1}] ${m.title||"未命名资料"}`),el("p",[m.organization,m.region].filter(Boolean).join(" · ")),el("p",[m.page?`第 ${m.page} 页`:m.section||m.page_or_section,m.publication_or_update_date?`日期 ${m.publication_or_update_date}`:""].filter(Boolean).join(" · ")),sourceLink(m));
    const details=el("details");details.append(el("summary","查看实际证据"),el("div",e.text));card.append(details);$("qa-sources").append(card);}
  const drawer=$("sources-drawer");drawer.classList.add("open");drawer.setAttribute("aria-hidden","false");
  if(focus){const target=$("qa-source-"+focus);if(target){target.classList.add("source-highlight");target.querySelector("details").open=true;target.scrollIntoView({block:"center"});}}
}
function closeSources(){const d=$("sources-drawer");d.classList.remove("open");d.setAttribute("aria-hidden","true");}
$("close-sources").onclick=closeSources;
$("notice").onclick=()=>{$("notice").hidden=true;};

/* ── Sidebar: sessions grouped by today / previous 7 days / earlier ── */
function renderChatList(){
  const list=$("chat-list");list.replaceChildren();
  if(!sessions.length){list.append(el("p","还没有对话","empty"));return;}
  const startToday=new Date();startToday.setHours(0,0,0,0);const t0=startToday.getTime(),week=t0-6*864e5;
  const groups=[["今天",s=>s.updatedAt>=t0],["7 天内",s=>s.updatedAt<t0&&s.updatedAt>=week],["更早",s=>s.updatedAt<week]];
  const sorted=sessions.slice().sort((a,b)=>b.updatedAt-a.updatedAt);
  for(const [label,test] of groups){const items=sorted.filter(test);if(!items.length)continue;list.append(el("div",label,"group-label"));for(const s of items)list.append(chatItem(s));}
}
function chatItem(s){
  const item=el("div",undefined,"chat-item"+(s.id===currentId?" active":""));item.setAttribute("role","listitem");
  const open=el("button",s.title||"新对话","chat-open");open.type="button";open.title=s.title;
  open.onclick=()=>{currentId=s.id;location.hash="qa";renderThread();renderChatList();closeDrawer();stick=true;scrollToBottom();};
  const actions=el("div",undefined,"chat-item-actions");
  actions.append(iconButton("edit","重命名",()=>{
    const input=el("input",undefined,"chat-rename");input.value=s.title;let done=false;
    const commit=keep=>{if(done)return;done=true;if(keep&&input.value.trim()){s.title=input.value.trim().slice(0,60);saveSessions();}renderChatList();updateTitle();};
    input.onkeydown=e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();commit(true);}else if(e.key==="Escape")commit(false);};
    input.onblur=()=>commit(true);item.replaceChildren(input);input.focus();input.select();
  }),iconButton("trash","删除",()=>{
    if(!confirm(L(`删除对话"${s.title}"？\n只删除浏览器中的记录，项目实验日志不受影响。`)))return;
    if(gen?.sid===s.id)stopGeneration();
    sessions=sessions.filter(x=>x!==s);if(currentId===s.id){currentId=null;renderThread();}saveSessions();renderChatList();
  }));
  item.append(open,actions);return item;
}
function newChat(){currentId=null;location.hash="qa";renderThread();renderChatList();closeDrawer();$("qa-question").focus();}
function updateTitle(){if(location.hash.slice(1)==="qa"||!location.hash)$("view-title").textContent=current()?.title||"新对话";}

/* ── Composer ── */
const ta=$("qa-question");
function autosize(){ta.style.height="auto";const max=parseFloat(getComputedStyle(ta).maxHeight)||220;ta.style.height=Math.min(ta.scrollHeight,max)+"px";ta.style.overflowY=ta.scrollHeight>max?"auto":"hidden";}
function updateComposer(){
  const send=$("send");if(!send)return;
  if(gen){send.disabled=false;send.classList.add("stop");send.replaceChildren(svg("stop"));send.title="停止生成";send.setAttribute("aria-label","停止生成");return;}
  send.classList.remove("stop");send.replaceChildren(svg("send"));send.title="发送（Enter）";send.setAttribute("aria-label","发送");
  send.disabled=!ta.value.trim()||!state||busy||!$("qa-model").value;
}
ta.addEventListener("input",()=>{autosize();updateComposer();});
ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();if(!gen&&!$("send").disabled)$("composer").requestSubmit();}});
$("composer").onsubmit=e=>{e.preventDefault();if(gen){stopGeneration();return;}const text=ta.value.trim();if(!text||$("send").disabled)return;ta.value="";autosize();updateComposer();submitQuestion(text);};
function refreshQAModels(){const previous=$("qa-model").value;$("qa-model").replaceChildren();const profiles=answerModels();for(const p of profiles){const ready=!!(p.model&&p.key_available);const option=el("option",`${p.name}${ready?"":" · 需要配置"}`);option.value=p.id;option.title=p.model||"";option.disabled=!ready;$("qa-model").append(option);}const valid=profiles.find(p=>p.id===previous&&p.model&&p.key_available);const first=profiles.find(p=>p.id==="custom"&&p.model&&p.key_available)||profiles.find(p=>p.model&&p.key_available);if(!first){const o=el("option","请先在 API 设置中配置模型");o.value="";$("qa-model").prepend(o);}$("qa-model").value=valid?.id||first?.id||"";$("retrieval-help").textContent=state.dense_index_ready?"向量检索（bge-small）+ 本地重排序；两种 RAG 条件使用同一批检索结果。":"向量索引未就绪，RAG 条件暂不可用。";updateComposer();}
$("qa-model").onchange=updateComposer;

/* ── Scrolling: follow new content unless the user scrolled up ── */
const messages=$("messages");
function scrollToBottom(){messages.scrollTop=messages.scrollHeight;updateStick();}
function updateStick(){stick=messages.scrollHeight-messages.scrollTop-messages.clientHeight<80;$("to-bottom").hidden=stick||!current()?.messages.length;}
messages.addEventListener("scroll",updateStick);
window.addEventListener("resize",()=>{autosize();updateStick();});
$("to-bottom").onclick=()=>{stick=true;messages.scrollTo({top:messages.scrollHeight,behavior:"smooth"});};

/* ── Layout: sidebar, theme, settings popover, views ── */
const app=$("app"),mobile=matchMedia("(max-width:768px)");
function closeDrawer(){app.classList.remove("drawer-open");$("scrim").hidden=true;}
$("open-sidebar").onclick=()=>{if(mobile.matches){app.classList.add("drawer-open");$("scrim").hidden=false;}else{app.classList.remove("collapsed");try{localStorage.setItem(SIDEBAR_KEY,"open");}catch{}}};
$("collapse-sidebar").onclick=()=>{app.classList.add("collapsed");try{localStorage.setItem(SIDEBAR_KEY,"collapsed");}catch{}};
$("scrim").onclick=closeDrawer;
try{if(localStorage.getItem(SIDEBAR_KEY)==="collapsed")app.classList.add("collapsed");}catch{}
$("new-chat").onclick=newChat;
const darkQuery=matchMedia("(prefers-color-scheme: dark)");
const isDark=()=>document.documentElement.dataset.theme?document.documentElement.dataset.theme==="dark":darkQuery.matches;
function paintThemeIcon(){const b=$("theme-toggle");b.replaceChildren(svg(isDark()?"sun":"moon"));b.title=isDark()?"切换浅色模式":"切换深色模式";b.setAttribute("aria-label",b.title);}
$("theme-toggle").onclick=()=>{const next=isDark()?"light":"dark";document.documentElement.dataset.theme=next;try{localStorage.setItem(THEME_KEY,next);}catch{}paintThemeIcon();};
darkQuery.addEventListener("change",paintThemeIcon);
$("settings-toggle").onclick=e=>{e.stopPropagation();const pop=$("settings-pop");pop.hidden=!pop.hidden;$("settings-toggle").setAttribute("aria-expanded",String(!pop.hidden));};
document.addEventListener("click",e=>{const pop=$("settings-pop");if(!pop.hidden&&!pop.contains(e.target)){pop.hidden=true;$("settings-toggle").setAttribute("aria-expanded","false");}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){$("settings-pop").hidden=true;closeSources();closeDrawer();}});
function switchView(){const selected=location.hash.slice(1);const view=["qa","experiment","configuration","corpus"].includes(selected)?selected:"qa";for(const id of ["qa","experiment","configuration","corpus"])$(id+"-view").hidden=id!==view;document.querySelectorAll("[data-view]").forEach(a=>a.classList.toggle("active",a.dataset.view===view));$("chat-tools").hidden=view!=="qa";$("settings-pop").hidden=true;if(view==="qa"){updateTitle();setTimeout(()=>{autosize();updateStick();},0);}else $("view-title").textContent={experiment:"实验对比",configuration:"API 设置",corpus:"知识库"}[view];closeDrawer();}
document.querySelectorAll(".side-nav a").forEach(a=>a.addEventListener("click",closeDrawer));
window.addEventListener("hashchange",switchView);

loadSessions();paintThemeIcon();switchView();renderChatList();renderThread();autosize();updateComposer();
refresh().catch(e=>{notice(`无法连接本地服务：${e.message}`,true);$("sidebar-state").textContent="本地服务连接失败";});
