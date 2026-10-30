"use strict";
const $ = id => document.getElementById(id);
let state, busy = false;
const names = {non_rag:"No RAG",standard:"Standard RAG",efficient:"Token-efficient RAG",headers_only:"Headers-only"};
const answerModels=()=>state.config.profiles.filter(p=>p.adapter!=="demo"&&p.role!=="judge"&&!/judge/i.test(p.id));
function el(tag, text, cls) { const e=document.createElement(tag); if(text!==undefined)e.textContent=text; if(cls)e.className=cls; return e; }
let noticeTimer;
function notice(text,error=false){clearTimeout(noticeTimer);$("notice").hidden=!text;$("notice").textContent=text;$("notice").className=error?"error":"";if(text&&!error)noticeTimer=setTimeout(()=>{$("notice").hidden=true;},6000);}
async function api(path,body,signal){const r=await fetch(path,body===undefined?{signal}:{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body),signal});const data=await r.json();if(!r.ok)throw new Error(data.error||"Request failed");return data;}
async function action(fn){if(busy)return;busy=true;document.querySelectorAll("button").forEach(b=>b.disabled=true);try{await fn();}catch(e){notice(e.message,true);}finally{busy=false;document.querySelectorAll("button").forEach(b=>b.disabled=false);if(state)applyFreeze();updateComposer();}}
async function refresh(){state=await api("/api/state");$("summary").textContent=`Version ${state.corpus_hash.slice(0,12)} · ${state.dense_index_ready?"vector index ready":"vector index not built"}`;$("corpus-count").replaceChildren(document.createTextNode(state.chunks),el("small","chunks"));$("sidebar-state").textContent=`${state.chunks} chunks · ${state.dense_index_ready?"vector search available":"vector index not ready"}`;renderProfiles();renderSources();renderPDFDocuments();fillProfile();refreshQAModels();const pdfs=state.pdf_documents||[];const enabled=pdfs.filter(d=>d.qa_enabled);$("library-description").textContent=pdfs.length?`${pdfs.length} PDFs registered, ${enabled.length} used for Q&A, together with the imported web articles. Check answers against the source, page and original text.`:"The starter sample covers Apple Scab, Fire Blight and Codling Moth. Documents in the data/pdf folder can be imported to extend the knowledge base.";const e=state.config.embedding;$("e-adapter").value=e.adapter||"remote";$("e-prefix").value=e.query_prefix||"";$("e-url").value=e.base_url||"";$("e-model").value=e.model;$("e-env").value=e.key_env;applyFreeze();updateComposer();}
function applyFreeze(){const f=state.freeze;document.querySelectorAll("[data-edit-corpus]").forEach(x=>{x.hidden=!!f;});for(const id of ["import-pdfs","import-sources","build-index","import-json"]){const b=$(id);if(b){b.disabled=!!f;b.title=f?"The corpus is frozen and cannot be changed":"";}}const save=$("embedding-form").querySelector('button[type="submit"]');if(save)save.disabled=!!f;if(f){$("summary").textContent=`Frozen version ${f.corpus_hash.slice(0,12)} (${f.frozen_at.slice(0,10)})${f.matches_current_corpus?" · vector index "+(state.dense_index_ready?"ready":"not ready"):" · ⚠ the corpus differs from the freeze record"}`;$("library-description").textContent=`The corpus was frozen on ${f.frozen_at.slice(0,10)} (${f.version||""}): importing, replacing the corpus, changing the embedding model and rebuilding the index are disabled. Q&A and experiments work as usual.`;}}
function renderProfiles(){const previous=[...document.querySelectorAll("input[name=profile]:checked")].map(x=>x.value);const current=$("profile-editor").value;$("profiles").replaceChildren();$("profile-editor").replaceChildren();const shown=answerModels();for(const p of state.config.profiles){const l=el("label"),input=el("input");input.type="checkbox";input.name="profile";input.value=p.id;input.checked=previous.length?previous.includes(p.id):p===shown.find(x=>x.model&&x.key_available);l.append(input,document.createTextNode(` ${p.name}${p.adapter==="demo"?"":` · ${p.model||"model not configured"}`}`));if(shown.includes(p))$("profiles").append(l);if(p.adapter!=="demo"){const o=el("option",p.name);o.value=p.id;$("profile-editor").append(o);}}if(current)$("profile-editor").value=current;}
function fillProfile(){const p=state.config.profiles.find(p=>p.id===$("profile-editor").value);if(!p)return;$("p-name").value=p.name;$("p-model").value=p.model;$("p-url").value=p.base_url;$("p-env").value=p.key_env;$("p-output").value=p.output_parameter||"max_tokens";$("p-send-temp").checked=!!p.send_temperature;$("p-temp").value=p.temperature||0;$("p-effort").value=p.reasoning_effort||"";$("p-key").value="";$("p-key").placeholder=p.key_available?"Key loaded; leave empty to keep it":"No key loaded; enter it here";let status=$("profile-key-status");if(!status){status=el("p",undefined,"hint");status.id="profile-key-status";status.setAttribute("role","status");$("profile-form").before(status);}status.textContent=p.key_available?"A key for this API is loaded (not shown). Connectivity is confirmed by the first answer.":"No key for this API is loaded. Enter and save one, or set the environment variable before starting.";const e=state.config.embedding;$("fixed-settings").textContent=`Fixed to the formal-experiment settings and not editable here: endpoint ${p.base_url||"—"}; thinking ${p.reasoning_effort==="none"?"off":p.reasoning_effort||"not sent"}; temperature ${p.send_temperature?p.temperature||0:"not sent"}; output limit parameter ${p.output_parameter||"max_tokens"}. Embedding: ${e.adapter==="local"?"local ":""}${e.model}${state.freeze?" (corpus frozen)":""}.`;}
function renderSources(){
  const selected=new Set([...$("source-list").querySelectorAll("input:checked")].map(x=>x.value));
  const reviewRequired=state.sources.some(s=>s.web_review_status);
  if(!$("source-list").children.length){const reviewed=state.sources.filter(s=>s.web_review_status==="approved"&&s.qa_enabled);(reviewed.length?reviewed.map(s=>s.source_id):["S001","S002","S006"]).forEach(x=>selected.add(x));}
  const search=$("source-search").value.toLowerCase();$("source-list").replaceChildren();
  for(const s of state.sources){
    if((reviewRequired&&s.web_review_status!=="approved")||s.qa_enabled===false||!["core","support","local_management","identification"].includes(s.role)||!s.local_file?.endsWith(".html")||!s.download_status?.startsWith("downloaded"))continue;
    const frozen=!!state.freeze,l=el(frozen?"div":"label",undefined,frozen?"source-row":undefined),c=el("input");c.type="checkbox";c.value=s.source_id;c.checked=selected.has(s.source_id);
    if(frozen){l.append(el("span",`${s.source_id} · ${s.title}`));if(Array.isArray(state.corpus_source_ids)){const inCorpus=state.corpus_source_ids.includes(s.source_id);l.append(el("span",inCorpus?"in corpus":"not in corpus","badge"+(inCorpus?" in-corpus":"")));}}else l.append(c,document.createTextNode(` ${s.source_id} · ${s.title}`));
    l.append(el("small",[s.organization,s.region].filter(Boolean).join(" · ")));
    l.hidden=!`${s.source_id} ${s.title} ${s.organization}`.toLowerCase().includes(search);$("source-list").append(l);
  }
}
function displayResults(data){$("result-list").replaceChildren();notice(`Done: ${data.results.length} results; random seed ${data.randomization_seed}. Logs saved.`);for(const r of data.results){const card=el("article",undefined,"result"),head=el("div",undefined,"result-title");head.append(el("span",`${r.profile.name} · ${names[r.mode]} · run ${r.repeat}`),el("span",r.is_demo?"Offline demo / not a real LLM":r.status==="success"?"API result":"Failed","badge"));card.append(head,el("div",r.question,"question"));const u=r.usage||{},metrics=el("div",undefined,"metrics");for(const text of [`Time ${r.end_to_end_seconds.toFixed(3)} s`,`Input ${u.prompt_tokens??"—"} tokens`,`Output ${u.completion_tokens??"—"} tokens`,`Total ${u.total_tokens??"—"}`,`Model ${r.response_metadata?.model||r.profile.model}`])metrics.append(el("span",text));card.append(metrics,r.status==="success"?renderMarkdown(r.answer,{evidence:0}):el("div",r.error,"answer"));if(r.invalid_citation_ids?.length)card.append(el("p",`Citations outside the evidence: ${r.invalid_citation_ids.join(", ")}`,"hint"));const d=el("details"),s=el("summary",`Show ${r.evidence?.length||0} evidence passages and sources`);d.append(s);for(const [i,e] of (r.evidence||[]).entries()){const box=el("div",undefined,"evidence");box.append(el("strong",`[${i+1}] ${e.metadata.title} · ${e.metadata.section||""}`),el("div",`${e.metadata.organization||""} · ${e.metadata.region||""}`));try{const url=new URL(e.metadata.url,location.origin);if(url.pathname==="/api/pdf"&&e.metadata.page)url.hash=`page=${e.metadata.page}`;if(["http:","https:"].includes(url.protocol)){const a=el("a",url.href);a.href=url.href;a.target="_blank";a.rel="noopener noreferrer";box.append(a);}}catch{}box.append(el("div",e.text));d.append(box);}card.append(d);$("result-list").append(card);}}
$("profile-editor").addEventListener("change",fillProfile);
$("source-search").addEventListener("input",renderSources);
$("run").onclick=()=>action(async()=>{const body={questions:$("questions").value.split("\n").map(x=>x.trim()).filter(Boolean),profile_ids:[...document.querySelectorAll("input[name=profile]:checked")].map(x=>x.value),modes:[...document.querySelectorAll("input[name=mode]:checked")].map(x=>x.value),retrieval:$("retrieval").value,top_k:Number($("top-k").value),budget:Number($("budget").value),max_output:Number($("max-output").value),repeats:Number($("repeats").value)};$("run-status").textContent="Running, waiting for the API…";notice("Running the selected combinations; every request has its own context.");try{displayResults(await api("/api/run",body));$("results").scrollIntoView({behavior:"smooth"});}finally{$("run-status").textContent="";}});
$("profile-form").onsubmit=event=>{event.preventDefault();action(async()=>{const profile={id:$("profile-editor").value,adapter:state.config.profiles.find(p=>p.id===$("profile-editor").value)?.adapter||"chat",name:$("p-name").value,model:$("p-model").value.trim(),base_url:$("p-url").value.trim(),key_env:$("p-env").value.trim(),output_parameter:$("p-output").value,send_temperature:$("p-send-temp").checked,temperature:Number($("p-temp").value),reasoning_effort:$("p-effort").value};await api("/api/config",{profile,api_key:$("p-key").value.trim()});$("p-key").value="";await refresh();notice("API settings saved. Keys are not written to disk.");});};
$("embedding-form").onsubmit=event=>{event.preventDefault();action(async()=>{await api("/api/config",{embedding:{adapter:$("e-adapter").value,query_prefix:$("e-prefix").value,base_url:$("e-url").value.trim(),model:$("e-model").value.trim(),key_env:$("e-env").value.trim()},api_key:$("e-key").value.trim()});$("e-key").value="";await refresh();notice("Embedding settings saved; rebuild the index after a change.");});};
$("import-sources").onclick=()=>action(async()=>{const r=await api("/api/import",{source_ids:[...$("source-list").querySelectorAll("input:checked")].map(x=>x.value)});await refresh();notice(`Imported ${r.sources} web sources; PDF text kept; the working corpus has ${r.chunks} chunks. Check the text quality and rebuild the vector index.`);});
$("build-index").onclick=()=>action(async()=>{notice("Building the shared index…");const r=await api("/api/build-index",{});await refresh();notice(`Index built in ${r.build_seconds.toFixed(2)} s. Build usage saved separately.`);});
$("import-json").onclick=()=>action(async()=>{const file=$("json-file").files[0];if(!file)throw new Error("Choose a chunk JSON file first.");const parsed=JSON.parse(await file.text());const r=await api("/api/import-json",{chunks:Array.isArray(parsed)?parsed:parsed.chunks});await refresh();notice(`Imported ${r.chunks} chunks; rebuild the vector index.`);});
function renderPDFDocuments(){const docs=state.pdf_documents||[];const report=state.pdf_import_report;$("pdf-summary").textContent=docs.length?`${docs.length} registered · ${docs.filter(d=>d.qa_enabled).length} used for Q&A · ${report?.pages??"—"} pages`:"No local PDFs imported yet";const query=$("pdf-search").value.toLowerCase();$("pdf-list").replaceChildren();for(const doc of docs){if(!`${doc.title} ${doc.filename} ${(doc.topics||[]).join(" ")}`.toLowerCase().includes(query))continue;const card=el("article",undefined,"pdf-document");card.append(el("strong",doc.title),el("p",`${doc.filename} · ${doc.page_count} pages`,"hint"),el("p",doc.scope_note,"hint"));const url=new URL(doc.local_url,location.origin);if(url.origin===location.origin&&url.pathname==="/api/pdf"){const link=el("a","Open local PDF ↗");link.href=url.href;link.target="_blank";link.rel="noopener noreferrer";card.append(link);}$("pdf-list").append(card);}}
$("pdf-search").oninput=()=>{if(state)renderPDFDocuments();};
$("import-pdfs").onclick=()=>action(async()=>{notice("Extracting local PDFs page by page and updating the knowledge base…");const report=await api("/api/import-pdfs",{});await refresh();notice(`PDF import finished: ${report.documents} registered, ${report.qa_documents} used for Q&A; the working corpus has ${report.working_chunks} chunks. See the document list for details and exclusion reasons.`);});

/* ───────────────────────── Chat ─────────────────────────
   Each question is sent on its own (one question, one model, one condition), exactly like one cell of
   the experiment; earlier turns are never sent as context. Sessions live only in this browser. */
const CHAT_KEY="apple-rag-chats-v1", OLD_HISTORY_KEY="apple-rag-qa-history-v1", THEME_KEY="apple-rag-theme", SIDEBAR_KEY="apple-rag-sidebar";
const REQUEST_TIMEOUT_MS=180000;
const EXAMPLES=[
  ["What are the symptoms of apple scab?","Spots on leaves and fruit"],
  ["How can codling moth damage be identified in apples?","Signs of codling moth damage"],
  ["What conditions favor fire blight in apples?","Conditions for fire blight"],
  ["What are the common pests and diseases of apples?","Overview of diseases and pests"]];
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
    if(victim===undefined||keep.length<=1){notice("Browser storage is full; chats were not saved.",true);return;}
    keep.splice(victim,1);}}
}
const current=()=>sessions.find(s=>s.id===currentId);

/* ── Backend call ──
   Endpoint: POST /api/run with the same body as the experiment page; the server returns the complete record (no streaming).
   The typewriter effect is simulated in the browser. If the server later streams (SSE / chunks), only this function changes:
   read response.body chunk by chunk and call onDelta(text) for each piece; the rest of the interface stays the same.
   Note: stopping only cancels the wait in the browser; a request that reached the local server still completes and is logged. */
async function requestAnswer(body,signal){
  const data=await api("/api/run",body,signal);
  const record=data.results?.[0];
  if(!record)throw new Error("The server returned no answer record.");
  return record;
}

function readRequest(){return {profile_id:$("qa-model").value,mode:document.querySelector('input[name="qa-mode"]:checked').value,top_k:Number($("qa-top-k").value),budget:Number($("qa-budget").value),max_output:Number($("qa-output").value)};}
function profileName(id){return state?.config.profiles.find(p=>p.id===id)?.name||"Model";}

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
    if(record.status!=="success"){a.status="error";a.error=record.error||"Unknown error";finish(a);return;}
    a.status="typing";a.shown=0;renderMessage(s,a);typeOut(s,a);
  }catch(e){
    if(e.name==="AbortError"&&!gen?.timedOut){a.status="stopped";}
    else{a.status="error";a.error=e.name==="AbortError"?`No response within ${REQUEST_TIMEOUT_MS/1000} s (timeout).`:e.message;}
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
  const re=/(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\s][^*\n]*\*|\[\d+(?:\s*[,\uFF0C]\s*\d+)*\]|\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))/g;
  for(const token of text.split(re)){
    if(!token)continue;
    if(/^\[\d+(?:\s*[,\uFF0C]\s*\d+)*\]$/.test(token)){
      const nums=token.slice(1,-1).split(/[,\uFF0C]/).map(n=>Number(n.trim()));
      if(ctx.evidence&&nums.every(n=>n>0&&n<=ctx.evidence)){for(const n of nums){const b=el("button",String(n),"citation");b.type="button";b.title=`Show source ${n}`;b.onclick=()=>ctx.cite(n);parent.append(b);}}
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
  const box=el("div",undefined,"code-block"),head=el("div",undefined,"code-head"),copy=el("button");copy.type="button";copy.append(svg("copy"),document.createTextNode("Copy"));
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
function errorGuidance(message){const m=message||"";return /getaddrinfo|11001|Name or service not known|nodename nor servname/.test(m)?"The provider's domain could not be resolved; check the network, DNS or proxy and try again.":/certificate is not trusted/.test(m)?"This network may be intercepting HTTPS; try another network (e.g. a phone hotspot).":/timeout/.test(m)?"The model or network is too slow; try again later or use another model.":/allowed range|choose|enter/.test(m)?"Check the retrieval and answer settings and keep them within the allowed range.":/403/.test(m)?"The provider refused the request (403); check account permissions, model availability or network access.":/429/.test(m)?"The provider's request or token limit was reached; wait and retry, or use another model.":/50[234]/.test(m)?"The provider is temporarily unavailable or timed out; retry later or use another model.":/401/.test(m)?"The provider rejected the key (401); check it in API settings.":/Failed to fetch|NetworkError/.test(m)?"Cannot reach the local server; make sure the program is still running.":"Check the API settings and connection, or ask again with another model.";}
async function copyText(text,button,labelled){try{await navigator.clipboard.writeText(text);if(button){const old=[...button.childNodes];button.replaceChildren(svg("check"),...(labelled?[document.createTextNode("Copied")]:[]));setTimeout(()=>button.replaceChildren(...old),1200);}}catch{notice("The browser blocked copying; select the text and copy it.",true);}}
function renderWelcome(){
  const box=el("div",undefined,"welcome");const mark=el("div","G","brand-mark");
  box.append(mark,el("h1","Ask a question about your apple trees."),el("p","Ask about symptoms, conditions and management; RAG answers cite the passages they are based on."));
  const grid=el("div",undefined,"examples");
  for(const [q,sub] of EXAMPLES){const b=el("button",undefined,"example");b.type="button";b.append(el("strong",q),el("small",sub));b.onclick=()=>{if(!gen&&state&&$("qa-model").value)submitQuestion(q);else{$("qa-question").value=q;autosize();updateComposer();$("qa-question").focus();}};grid.append(b);}
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
  actions.append(iconButton("copy","Copy",e=>copyText(m.text,e.currentTarget)),iconButton("edit","Edit and resend",()=>{
    if(gen)return notice("Wait for the current answer or stop it first.",true);
    const edit=el("div",undefined,"edit-box"),ta=el("textarea"),row=el("div",undefined,"row"),cancel=el("button","Cancel"),save=el("button","Send","primary");
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
  if(r?.is_demo)meta.append(el("span","Offline demo · not a real model answer","badge"));
  box.append(el("div","G","avatar"),body);body.append(meta);
  fillAssistantBody(s,a,body);
  return box;
}
function fillAssistantBody(s,a,body){
  const r=a.record,mode=r?.mode||a.request?.mode,isLast=s.messages[s.messages.length-1]===a;
  while(body.children.length>1)body.lastChild.remove();
  if(a.status==="pending"){const t=el("div",undefined,"thinking"),d=el("span",undefined,"dots");d.append(el("i"),el("i"),el("i"));t.append(d,el("span",mode==="non_rag"?"Waiting for the model…":"Retrieving evidence and waiting for the model…"));body.append(t);return;}
  if(a.status==="error"){
    const e=el("div",undefined,"msg-error");e.append(el("strong","No answer was returned"),el("p",a.error||"Unknown error"),el("p",errorGuidance(a.error)));
    if(isLast){const b=el("button","Retry");b.type="button";b.onclick=()=>regenerate(s,a);e.append(b);}
    body.append(e);return;
  }
  if(!r){body.append(el("p","Stopped. If the request had reached the local server, the model call still completes and is logged.","msg-note"));if(isLast)body.append(actionsRow(s,a,isLast));return;}
  const full=r.answer||"",typing=a.status==="typing",shown=typeof a.shown==="number"?full.slice(0,a.shown):full;
  const md=renderMarkdown(shown,{evidence:(r.evidence||[]).length,cite:n=>openSources(r,n)});
  if(typing){const blocks=md.querySelectorAll("p,li,h3,h4,th,td,pre code");(blocks[blocks.length-1]||md).append(el("span",undefined,"caret"));}
  body.append(md);
  if(typing)return;
  if(a.status==="stopped"&&a.shown<full.length){const n=el("p","Stopped.","msg-note"),b=el("button","Show full answer");b.type="button";b.onclick=()=>{a.status="done";delete a.shown;saveSessions();renderMessage(s,a);};n.append(b);body.append(n);}
  if(!full.trim())body.append(el("p","The API returned no text. Increase max output tokens in the settings or try another model.","msg-note"));
  if(r.response_metadata?.finish_reason==="length")body.append(el("p","The answer reached the output limit and may be incomplete. Increase max output tokens and regenerate.","msg-note"));
  if(r.invalid_citation_ids?.length)body.append(el("p",`Citation numbers outside the evidence: ${r.invalid_citation_ids.join(", ")}. Check the original text.`,"msg-note"));
  body.append(actionsRow(s,a,isLast));
}
function actionsRow(s,a,isLast){
  const r=a.record,row=el("div",undefined,"msg-actions");
  if(r?.answer)row.append(iconButton("copy","Copy",e=>copyText(r.answer,e.currentTarget)));
  if(isLast)row.append(iconButton("retry","Regenerate (current settings)",()=>regenerate(s,a)));
  if(r){
    const vote=v=>()=>{a.feedback=a.feedback===v?undefined:v;saveSessions();renderMessage(s,a);};
    row.append(iconButton("up","Helpful (saved on this computer only)",vote("up"),a.feedback==="up"?"on":""),iconButton("down","Not helpful (saved on this computer only)",vote("down"),a.feedback==="down"?"on":""));
    row.append(iconButton("download","Download the full record (JSON)",()=>{const blob=new Blob([JSON.stringify(r,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),link=el("a");link.href=url;link.download=`apple-answer-${r.id}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}));
    const n=(r.evidence||[]).length;
    if(n){const chip=el("button",undefined,"chip");chip.type="button";chip.append(svg("doc"),document.createTextNode(`Sources ${n}`));chip.onclick=()=>openSources(r);row.append(chip);}
    const u=r.usage||{};row.append(el("span",`${Number(r.end_to_end_seconds||0).toFixed(1)} s · input ${u.prompt_tokens??"—"} / output ${u.completion_tokens??"—"} tokens`,"msg-stats"));
  }
  return row;
}
function updateAssistantBody(s,a){
  if(s.id!==currentId)return;const body=$("thread").querySelector(`[data-id="${a.id}"] [data-body]`);
  if(body)fillAssistantBody(s,a,body);if(stick)scrollToBottom();
}

/* ── Evidence drawer ── */
function sourceLink(metadata){try{const url=new URL(metadata.url,location.origin);if(url.pathname==="/api/pdf"&&metadata.page)url.hash=`page=${metadata.page}`;if(["http:","https:"].includes(url.protocol)){const a=el("a",metadata.url?.startsWith("/api/pdf")?"Open local PDF ↗":"Open original source ↗");a.href=url.href;a.target="_blank";a.rel="noopener noreferrer";return a;}}catch{}return el("span","Source address unavailable","hint");}
function openSources(record,focus){
  const evidence=record.evidence||[];$("evidence-count").textContent=`${evidence.length} ${evidence.length===1?"item":"items"}`;$("qa-sources").replaceChildren();
  for(const [i,e] of evidence.entries()){const m=e.metadata||{},card=el("article",undefined,"source-card");card.id=`qa-source-${i+1}`;
    card.append(el("strong",`[${i+1}] ${m.title||"Untitled source"}`),el("p",[m.organization,m.region].filter(Boolean).join(" · ")),el("p",[m.page?`Page ${m.page}`:m.section||m.page_or_section,m.publication_or_update_date?`Date ${m.publication_or_update_date}`:""].filter(Boolean).join(" · ")),sourceLink(m));
    const details=el("details");details.append(el("summary","Show evidence text"),el("div",e.text));card.append(details);$("qa-sources").append(card);}
  const drawer=$("sources-drawer");drawer.classList.add("open");drawer.setAttribute("aria-hidden","false");
  if(focus){const target=$("qa-source-"+focus);if(target){target.classList.add("source-highlight");target.querySelector("details").open=true;target.scrollIntoView({block:"center"});}}
}
function closeSources(){const d=$("sources-drawer");d.classList.remove("open");d.setAttribute("aria-hidden","true");}
$("close-sources").onclick=closeSources;
$("notice").onclick=()=>{$("notice").hidden=true;};

/* ── Sidebar: sessions grouped by today / previous 7 days / earlier ── */
function renderChatList(){
  const list=$("chat-list");list.replaceChildren();
  if(!sessions.length){list.append(el("p","No chats yet","empty"));return;}
  const startToday=new Date();startToday.setHours(0,0,0,0);const t0=startToday.getTime(),week=t0-6*864e5;
  const groups=[["Today",s=>s.updatedAt>=t0],["Previous 7 days",s=>s.updatedAt<t0&&s.updatedAt>=week],["Earlier",s=>s.updatedAt<week]];
  const sorted=sessions.slice().sort((a,b)=>b.updatedAt-a.updatedAt);
  for(const [label,test] of groups){const items=sorted.filter(test);if(!items.length)continue;list.append(el("div",label,"group-label"));for(const s of items)list.append(chatItem(s));}
}
function chatItem(s){
  const item=el("div",undefined,"chat-item"+(s.id===currentId?" active":""));item.setAttribute("role","listitem");
  const open=el("button",s.title||"New chat","chat-open");open.type="button";open.title=s.title;
  open.onclick=()=>{currentId=s.id;location.hash="qa";renderThread();renderChatList();closeDrawer();stick=true;scrollToBottom();};
  const actions=el("div",undefined,"chat-item-actions");
  actions.append(iconButton("edit","Rename",()=>{
    const input=el("input",undefined,"chat-rename");input.value=s.title;let done=false;
    const commit=keep=>{if(done)return;done=true;if(keep&&input.value.trim()){s.title=input.value.trim().slice(0,60);saveSessions();}renderChatList();updateTitle();};
    input.onkeydown=e=>{if(e.key==="Enter"&&!e.isComposing){e.preventDefault();commit(true);}else if(e.key==="Escape")commit(false);};
    input.onblur=()=>commit(true);item.replaceChildren(input);input.focus();input.select();
  }),iconButton("trash","Delete",()=>{
    if(!confirm(`Delete the chat "${s.title}"?\nOnly the browser copy is deleted; experiment logs are not affected.`))return;
    if(gen?.sid===s.id)stopGeneration();
    sessions=sessions.filter(x=>x!==s);if(currentId===s.id){currentId=null;renderThread();}saveSessions();renderChatList();
  }));
  item.append(open,actions);return item;
}
function newChat(){currentId=null;location.hash="qa";renderThread();renderChatList();closeDrawer();$("qa-question").focus();}
function updateTitle(){if(location.hash.slice(1)==="qa"||!location.hash)$("view-title").textContent=current()?.title||"New chat";}

/* ── Composer ── */
const ta=$("qa-question");
function autosize(){ta.style.height="auto";const max=parseFloat(getComputedStyle(ta).maxHeight)||220;ta.style.height=Math.min(ta.scrollHeight,max)+"px";ta.style.overflowY=ta.scrollHeight>max?"auto":"hidden";}
function updateComposer(){
  const send=$("send");if(!send)return;
  if(gen){send.disabled=false;send.classList.add("stop");send.replaceChildren(svg("stop"));send.title="Stop generating";send.setAttribute("aria-label","Stop generating");return;}
  send.classList.remove("stop");send.replaceChildren(svg("send"));send.title="Send (Enter)";send.setAttribute("aria-label","Send");
  send.disabled=!ta.value.trim()||!state||busy||!$("qa-model").value;
}
ta.addEventListener("input",()=>{autosize();updateComposer();});
ta.addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();if(!gen&&!$("send").disabled)$("composer").requestSubmit();}});
$("composer").onsubmit=e=>{e.preventDefault();if(gen){stopGeneration();return;}const text=ta.value.trim();if(!text||$("send").disabled)return;ta.value="";autosize();updateComposer();submitQuestion(text);};
function refreshQAModels(){const previous=$("qa-model").value;$("qa-model").replaceChildren();const profiles=answerModels();for(const p of profiles){const ready=!!(p.model&&p.key_available);const option=el("option",`${p.name}${ready?"":" · needs configuration"}`);option.value=p.id;option.title=p.model||"";option.disabled=!ready;$("qa-model").append(option);}const valid=profiles.find(p=>p.id===previous&&p.model&&p.key_available);const first=profiles.find(p=>p.id==="custom"&&p.model&&p.key_available)||profiles.find(p=>p.model&&p.key_available);if(!first){const o=el("option","Configure a model in API settings first");o.value="";$("qa-model").prepend(o);}$("qa-model").value=valid?.id||first?.id||"";$("retrieval-help").textContent=state.dense_index_ready?"Vector search (bge-small) + local reranking; both RAG conditions use the same retrieved passages.":"The vector index is not ready; RAG conditions are unavailable.";updateComposer();}
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
function paintThemeIcon(){const b=$("theme-toggle");b.replaceChildren(svg(isDark()?"sun":"moon"));b.title=isDark()?"Switch to light mode":"Switch to dark mode";b.setAttribute("aria-label",b.title);}
$("theme-toggle").onclick=()=>{const next=isDark()?"light":"dark";document.documentElement.dataset.theme=next;try{localStorage.setItem(THEME_KEY,next);}catch{}paintThemeIcon();};
darkQuery.addEventListener("change",paintThemeIcon);
$("settings-toggle").onclick=e=>{e.stopPropagation();const pop=$("settings-pop");pop.hidden=!pop.hidden;$("settings-toggle").setAttribute("aria-expanded",String(!pop.hidden));};
document.addEventListener("click",e=>{const pop=$("settings-pop");if(!pop.hidden&&!pop.contains(e.target)){pop.hidden=true;$("settings-toggle").setAttribute("aria-expanded","false");}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"){$("settings-pop").hidden=true;closeSources();closeDrawer();}});
function switchView(){const selected=location.hash.slice(1);const view=["qa","experiment","configuration","corpus"].includes(selected)?selected:"qa";for(const id of ["qa","experiment","configuration","corpus"])$(id+"-view").hidden=id!==view;document.querySelectorAll("[data-view]").forEach(a=>a.classList.toggle("active",a.dataset.view===view));$("chat-tools").hidden=view!=="qa";$("settings-pop").hidden=true;if(view==="qa"){updateTitle();setTimeout(()=>{autosize();updateStick();},0);}else $("view-title").textContent={experiment:"Experiments",configuration:"API settings",corpus:"Knowledge base"}[view];closeDrawer();}
document.querySelectorAll(".side-nav a").forEach(a=>a.addEventListener("click",closeDrawer));
window.addEventListener("hashchange",switchView);

loadSessions();paintThemeIcon();switchView();renderChatList();renderThread();autosize();updateComposer();
refresh().catch(e=>{notice(`Cannot connect to the local server: ${e.message}`,true);$("sidebar-state").textContent="Cannot connect to the local server";});
