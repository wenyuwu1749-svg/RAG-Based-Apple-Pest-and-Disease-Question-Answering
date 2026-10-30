"use strict";
const $ = id => document.getElementById(id);
let state, busy = false;
const names = {non_rag:"No RAG",standard:"Standard RAG",efficient:"Token-efficient RAG",headers_only:"Headers-only"};
const answerModels=()=>state.config.profiles.filter(p=>p.adapter!=="demo"&&p.role!=="judge"&&!/judge/i.test(p.id));
function el(tag, text, cls) { const e=document.createElement(tag); if(text!==undefined)e.textContent=text; if(cls)e.className=cls; return e; }
/* ───────────────────────── Language (English / Chinese) ─────────────────────────
   The interface is written in English. In Chinese mode every interface text node and title/placeholder/aria-label
   is translated on insertion; model answers, questions and source titles are never touched.
   Chinese text is stored as \\uXXXX escapes. */
const LANG=(()=>{try{return localStorage.getItem("apple-rag-lang")==="zh"?"zh":"en";}catch{return "en";}})();
const I18N_ZH={"No RAG": "\u65e0 RAG", "Standard RAG": "\u6807\u51c6 RAG", "Token-efficient RAG": "\u7cbe\u7b80 RAG", "Headers-only": "\u4ec5\u7cbe\u7b80\u6807\u9898", "Apple Pest & Disease Q&A": "\u679c\u77e5 \u00b7 \u82f9\u679c\u75c5\u866b\u5bb3\u95ee\u7b54", "Apple Q&A": "\u679c\u77e5", "New chat": "\u65b0\u5efa\u5bf9\u8bdd", "Experiments": "\u5b9e\u9a8c\u5bf9\u6bd4", "Knowledge base": "\u77e5\u8bc6\u5e93", "API settings": "API \u8bbe\u7f6e", "Running locally \u00b7 research prototype": "\u672c\u5730\u8fd0\u884c \u00b7 \u7814\u7a76\u539f\u578b", "Connecting to the knowledge base\u2026": "\u6b63\u5728\u8fde\u63a5\u77e5\u8bc6\u5e93\u2026", "Loading models\u2026": "\u6b63\u5728\u8bfb\u53d6\u6a21\u578b\u2026", "Retrieval and answer settings": "\u68c0\u7d22\u4e0e\u56de\u7b54\u8bbe\u7f6e", "Max output tokens": "\u6700\u5927\u8f93\u51fa token", "Compression budget (estimated tokens)": "\u538b\u7f29\u9884\u7b97\uff08\u4f30\u8ba1 token\uff09", "Back to bottom": "\u56de\u5230\u5e95\u90e8", "Your question": "\u4f60\u7684\u95ee\u9898", "AI-generated answers may contain errors; check important information \u00b7 each question is answered independently, without earlier turns": "AI \u751f\u6210\u7684\u5185\u5bb9\u53ef\u80fd\u6709\u8bef\uff0c\u8bf7\u6838\u5b9e\u91cd\u8981\u4fe1\u606f \u00b7 \u6bcf\u4e2a\u95ee\u9898\u72ec\u7acb\u56de\u7b54\uff0c\u4e0d\u5e26\u5165\u4e0a\u6587", "Evidence": "\u56de\u7b54\u4f9d\u636e", "Check where the sources apply: ": "\u7559\u610f\u8d44\u6599\u7684\u9002\u7528\u5730\u533a\uff1a", "Management advice from US sources must be checked against local rules; species-status records are not control guidance.": "\u7f8e\u56fd\u6765\u6e90\u7684\u7ba1\u7406\u63aa\u65bd\u9700\u8981\u7ed3\u5408\u5f53\u5730\u89c4\u5b9a\u5224\u65ad\uff1b\u7269\u79cd\u72b6\u6001\u8bb0\u5f55\u4e0d\u80fd\u66ff\u4ee3\u9632\u6cbb\u6307\u5357\u3002", "Batch comparison": "\u6279\u91cf\u5bf9\u6bd4\u5b9e\u9a8c", "Models to compare": "\u53c2\u4e0e\u6bd4\u8f83\u7684 API", "Conditions": "\u56de\u7b54\u6761\u4ef6", "No RAG \u00b7 model knowledge only": "\u65e0 RAG \u00b7 \u6a21\u578b\u5df2\u6709\u77e5\u8bc6", "Standard RAG \u00b7 full retrieved passages": "\u6807\u51c6 RAG \u00b7 \u5b8c\u6574\u68c0\u7d22\u7247\u6bb5", "Token-efficient RAG \u00b7 filtered and compacted evidence": "\u7cbe\u7b80 RAG \u00b7 \u7b5b\u9009\u4e0e\u538b\u7f29\u8bc1\u636e", "Test questions (one per line)": "\u6d4b\u8bd5\u95ee\u9898\uff08\u6bcf\u884c\u4e00\u9053\uff09", "Evidence budget (estimated tokens)": "\u538b\u7f29\u8bc1\u636e\u9884\u7b97\uff08\u4f30\u8ba1 token\uff09", "Repeats": "\u91cd\u590d\u6b21\u6570", "Each request is sent independently in random order; both RAG conditions use the same retrieved passages and all conditions the same output limit. Usage is as reported by the provider; results are written to data/logs.": "\u6bcf\u6b21\u8bf7\u6c42\u72ec\u7acb\u53d1\u9001\uff0c\u8fd0\u884c\u987a\u5e8f\u968f\u673a\uff1b\u4e24\u79cd RAG \u6761\u4ef6\u4f7f\u7528\u540c\u4e00\u6279\u68c0\u7d22\u7ed3\u679c\uff0c\u6240\u6709\u6761\u4ef6\u4f7f\u7528\u76f8\u540c\u8f93\u51fa\u4e0a\u9650\u3002\u7528\u91cf\u4ee5\u670d\u52a1\u5546\u8fd4\u56de\u4e3a\u51c6\uff0c\u7ed3\u679c\u5199\u5165 data/logs\u3002", "Run selected conditions": "\u8fd0\u884c\u6240\u9009\u6761\u4ef6", "Answers and run records": "\u56de\u7b54\u4e0e\u5b9e\u9a8c\u8bb0\u5f55", "Export full JSON": "\u5bfc\u51fa\u5b8c\u6574 JSON", "Export CSV": "\u5bfc\u51fa CSV", "Accuracy must be scored against reference answers. The citation check only tests the number range, not whether facts or citations are correct.": "\u51c6\u786e\u6027\u9700\u4f9d\u636e\u53c2\u8003\u7b54\u6848\u4eba\u5de5\u8bc4\u5206\u3002\u5f15\u7528\u7f16\u53f7\u68c0\u67e5\u53ea\u68c0\u67e5\u8303\u56f4\uff0c\u4e0d\u4ee3\u8868\u4e8b\u5b9e\u6216\u5f15\u7528\u6b63\u786e\u3002", "After a run, the result of each model and condition appears here.": "\u8fd0\u884c\u540e\uff0c\u6bcf\u4e2a\u6a21\u578b\u3001\u6bcf\u79cd\u6761\u4ef6\u7684\u7ed3\u679c\u4f1a\u663e\u793a\u5728\u8fd9\u91cc\u3002", "Current knowledge base": "\u5f53\u524d\u77e5\u8bc6\u5e93", "chunks": "\u8d44\u6599\u7247\u6bb5", "Loading\u2026": "\u6b63\u5728\u8bfb\u53d6\u2026", "Shared knowledge base": "\u5171\u4eab\u77e5\u8bc6\u5e93", "The working knowledge base contains imported web articles and local PDF documents; answers can be traced to the source and page.": "\u5de5\u4f5c\u77e5\u8bc6\u5e93\u5305\u542b\u5df2\u5bfc\u5165\u7684\u7f51\u9875\u6b63\u6587\u4e0e\u672c\u5730 PDF \u6587\u732e\uff0c\u56de\u7b54\u53ef\u6309\u6765\u6e90\u548c\u9875\u7801\u8ffd\u6eaf\u3002", "Local PDF documents": "\u672c\u5730 PDF \u6587\u732e", "Search local documents": "\u641c\u7d22\u672c\u5730\u6587\u732e", "Search web sources": "\u641c\u7d22\u7f51\u9875\u6765\u6e90", "Import / update PDFs": "\u5bfc\u5165 / \u66f4\u65b0 PDF \u6587\u732e", "Reads the data/pdf folder page by page; re-importing updates PDF text and keeps web content. Original PDFs are unchanged. Irrelevant or preview documents are stored but not used for Q&A; extraction is not the same as review.": "\u8bfb\u53d6\u9879\u76ee\u6839\u76ee\u5f55\u7684 data/pdf \u6587\u4ef6\u5939\uff1b\u9010\u9875\u63d0\u53d6\uff0c\u91cd\u590d\u5bfc\u5165\u4f1a\u66f4\u65b0 PDF \u6b63\u6587\u5e76\u4fdd\u7559\u7f51\u9875\u8d44\u6599\u3002\u539f\u59cb PDF \u4fdd\u6301\u539f\u6837\u3002\u660e\u786e\u65e0\u5173\u6216\u9884\u89c8\u6587\u6863\u4fdd\u5b58\u5230\u8d44\u6599\u5e93\uff0c\u6682\u4e0d\u7528\u4e8e\u95ee\u7b54\uff1b\u63d0\u53d6\u5b8c\u6210\u4e0d\u7b49\u4e8e\u4eba\u5de5\u5ba1\u6838\u5b8c\u6210\u3002", "Web import replaces only the web part of the corpus, keeps PDF text and invalidates the old vector index; archived files are unchanged. The main region of each HTML page is parsed; PDFs are imported above; special pages, tables and extracted text still need review.": "\u7f51\u9875\u5bfc\u5165\u53ea\u66ff\u6362\u7f51\u9875\u8bed\u6599\uff0c\u4fdd\u7559\u5df2\u5bfc\u5165 PDF \u6b63\u6587\uff0c\u5e76\u4f7f\u65e7\u5411\u91cf\u7d22\u5f15\u5931\u6548\uff1b\u539f\u59cb\u91c7\u96c6\u6587\u4ef6\u4fdd\u6301\u539f\u6837\u3002\u6b64\u7248\u672c\u81ea\u52a8\u89e3\u6790 HTML \u7684 main \u533a\u57df\uff1bPDF \u5728\u4e0a\u65b9\u5355\u72ec\u5bfc\u5165\uff1b\u7279\u6b8a\u9875\u9762\u3001\u8868\u683c\u548c\u81ea\u52a8\u63d0\u53d6\u7684\u6b63\u6587\u4ecd\u9700\u5ba1\u6838\u3002", "Update web corpus from selected sources": "\u7528\u52fe\u9009\u6765\u6e90\u66f4\u65b0\u7f51\u9875\u8bed\u6599", "Build index with the embedding model": "\u8c03\u7528 Embedding API \u6784\u5efa\u7d22\u5f15", "Building the index sends the corpus to the configured embedding service. Standard and token-efficient RAG share this index.": "\u6784\u5efa\u7d22\u5f15\u5c06\u628a\u5de5\u4f5c\u8bed\u6599\u53d1\u9001\u7ed9\u914d\u7f6e\u7684 embedding \u670d\u52a1\u5e76\u4ea7\u751f\u76f8\u5e94\u7528\u91cf\u3002\u6807\u51c6 RAG \u548c\u538b\u7f29 RAG \u5171\u7528\u8fd9\u4e00\u7d22\u5f15\u3002", "Or import reviewed chunk JSON": "\u6216\u5bfc\u5165\u5df2\u5ba1\u6838\u7684 chunk JSON", "Import JSON and replace the corpus": "\u5bfc\u5165 JSON \u5e76\u66ff\u6362\u5de5\u4f5c\u8bed\u6599", "See the project README for the format. Logs are written to data/logs and the chunk database is in data/chunks, including prompts, source metadata and API responses.": "\u683c\u5f0f\u793a\u4f8b\u4e0e\u64cd\u4f5c\u8bf4\u660e\u89c1\u9879\u76ee README\u3002\u65e5\u5fd7\u5199\u5165\u9879\u76ee data/logs \u6587\u4ef6\u5939\uff0c\u7247\u6bb5\u6570\u636e\u5e93\u4f4d\u4e8e data/chunks\uff0c\u4fdd\u7559\u5b9e\u9645\u63d0\u793a\u8bcd\u3001\u6765\u6e90\u5143\u6570\u636e\u548c API \u54cd\u5e94\u3002", "Model API configuration": "\u6a21\u578b API \u914d\u7f6e", "Choose a model, enter its model ID and API key, and save. Keys set with setx as environment variables are loaded automatically. Keys are kept only in memory and never written to a file.": "\u9009\u62e9\u6a21\u578b\uff0c\u586b\u5199\u6a21\u578b ID \u548c API Key \u540e\u4fdd\u5b58\u3002\u82e5\u5df2\u7528 setx \u8bbe\u7f6e\u73af\u5883\u53d8\u91cf\uff0cKey \u4f1a\u81ea\u52a8\u52a0\u8f7d\uff0c\u8fd9\u91cc\u65e0\u9700\u586b\u5199\u3002Key \u53ea\u4fdd\u5b58\u5728\u5f53\u524d\u7a0b\u5e8f\u5185\u5b58\u4e2d\uff0c\u4e0d\u5199\u5165\u4efb\u4f55\u6587\u4ef6\u3002", "Model to configure": "\u9009\u62e9\u8981\u914d\u7f6e\u7684\u6a21\u578b", "Model ID": "\u6a21\u578b ID", "API key (leave empty to keep the current key)": "API Key\uff08\u7559\u7a7a\u4fdd\u7559\u73b0\u6709 Key\uff09", "Advanced settings": "\u9ad8\u7ea7\u8bbe\u7f6e", "Display name": "\u663e\u793a\u540d\u79f0", "Key environment variable": "Key \u73af\u5883\u53d8\u91cf\u540d\u79f0", "Output limit parameter": "\u8f93\u51fa\u9650\u5236\u53c2\u6570", "Reasoning effort (none = thinking off)": "\u601d\u8003\u5f3a\u5ea6 reasoning_effort\uff08none = \u5173\u95ed\u601d\u8003\uff09", "not sent": "\u4e0d\u53d1\u9001", "none (off)": "none\uff08\u5173\u95ed\uff09", "Send temperature (if the model supports it)": "\u53d1\u9001 temperature \u53c2\u6570\uff08\u6a21\u578b\u652f\u6301\u65f6\u542f\u7528\uff09", "Save": "\u4fdd\u5b58", "Type": "\u7c7b\u578b", "Local sentence-transformers": "\u672c\u5730 sentence-transformers", "Remote compatible API": "\u8fdc\u7a0b\u517c\u5bb9 API", "Query prefix (local BGE)": "\u67e5\u8be2\u524d\u7f00\uff08\u672c\u5730 BGE \u7528\uff09", "Base URL (remote)": "Base URL\uff08\u8fdc\u7a0b\u7528\uff09", "Embedding model ID": "Embedding \u6a21\u578b ID", "Save embedding settings": "\u4fdd\u5b58 Embedding \u914d\u7f6e", "Sidebar": "\u4fa7\u8fb9\u680f", "Collapse sidebar": "\u6536\u8d77\u4fa7\u8fb9\u680f", "Chat history": "\u5386\u53f2\u4f1a\u8bdd", "Other pages": "\u5176\u4ed6\u9875\u9762", "Open sidebar": "\u6253\u5f00\u4fa7\u8fb9\u680f", "Answer model": "\u56de\u7b54\u6a21\u578b", "Switch to dark mode": "\u5207\u6362\u6df1\u8272\u6a21\u5f0f", "Switch to light mode": "\u5207\u6362\u6d45\u8272\u6a21\u5f0f", "Ask about symptoms, conditions or management of apple pests and diseases\u2026": "\u8be2\u95ee\u82f9\u679c\u75c5\u866b\u5bb3\u7684\u75c7\u72b6\u3001\u53d1\u751f\u6761\u4ef6\u6216\u7ba1\u7406\u63aa\u65bd\u2026", "Answer mode": "\u56de\u7b54\u65b9\u5f0f", "Model knowledge only": "\u53ea\u7528\u6a21\u578b\u5df2\u6709\u77e5\u8bc6", "Retrieve full passages": "\u68c0\u7d22\u5b8c\u6574\u8d44\u6599\u7247\u6bb5", "Filter and compact the evidence": "\u7b5b\u9009\u4e0e\u538b\u7f29\u68c0\u7d22\u8bc1\u636e", "Send": "\u53d1\u9001", "Send (Enter)": "\u53d1\u9001\uff08Enter\uff09", "Close": "\u5173\u95ed", "Title, file name or topic": "\u6807\u9898\u3001\u6587\u4ef6\u540d\u6216\u75c5\u866b\u5bb3\u4e13\u9898", "Request failed": "\u8bf7\u6c42\u5931\u8d25", "vector index not built": "\u5411\u91cf\u7d22\u5f15\u672a\u6784\u5efa", "vector index ready": "\u5411\u91cf\u7d22\u5f15\u5df2\u5c31\u7eea", "vector index not ready": "\u5411\u91cf\u7d22\u5f15\u672a\u5c31\u7eea", "vector search available": "\u5411\u91cf\u68c0\u7d22\u53ef\u7528", "The corpus is frozen and cannot be changed": "\u8bed\u6599\u5df2\u51bb\u7ed3\uff0c\u4e0d\u80fd\u4fee\u6539", "model not configured": "\u5c1a\u672a\u914d\u7f6e\u6a21\u578b", "Key loaded; leave empty to keep it": "\u5bc6\u94a5\u5df2\u52a0\u8f7d\uff0c\u7559\u7a7a\u4fdd\u7559\u73b0\u6709\u5bc6\u94a5", "No key loaded; enter it here": "\u5c1a\u672a\u52a0\u8f7d\u5bc6\u94a5\uff0c\u8bf7\u5728\u6b64\u586b\u5199", "A key for this API is loaded (not shown). Connectivity is confirmed by the first answer.": "\u5f53\u524d\u670d\u52a1\u5df2\u52a0\u8f7d\u6b64 API \u7684\u5bc6\u94a5\uff1b\u8f93\u5165\u6846\u4e0d\u56de\u663e\u5bc6\u94a5\u3002\u5b9e\u9645\u8fde\u901a\u6027\u4ee5\u95ee\u7b54\u8c03\u7528\u7ed3\u679c\u4e3a\u51c6\u3002", "No key for this API is loaded. Enter and save one, or set the environment variable before starting.": "\u5f53\u524d\u670d\u52a1\u5c1a\u672a\u52a0\u8f7d\u6b64 API \u7684\u5bc6\u94a5\u3002\u8bf7\u586b\u5199\u5e76\u4fdd\u5b58\uff0c\u6216\u5728\u542f\u52a8\u670d\u52a1\u524d\u8bbe\u7f6e\u5bf9\u5e94\u73af\u5883\u53d8\u91cf\u3002", "in corpus": "\u5df2\u6536\u5f55", "not in corpus": "\u672a\u6536\u5f55", "Offline demo / not a real LLM": "\u79bb\u7ebf\u6f14\u793a / \u975e\u771f\u5b9e LLM", "API result": "API \u7ed3\u679c", "Failed": "\u5931\u8d25", "Running, waiting for the API\u2026": "\u8fd0\u884c\u4e2d\uff0c\u8bf7\u7b49\u5f85 API \u8fd4\u56de\u2026", "Running the selected combinations; every request has its own context.": "\u6b63\u5728\u4f9d\u6b21\u8fd0\u884c\u6240\u9009\u7ec4\u5408\uff1b\u6bcf\u6b21\u8bf7\u6c42\u5747\u4f7f\u7528\u72ec\u7acb\u4e0a\u4e0b\u6587\u3002", "API settings saved. Keys are not written to disk.": "API \u914d\u7f6e\u5df2\u4fdd\u5b58\u3002Key \u4e0d\u5199\u5165\u78c1\u76d8\u3002", "Embedding settings saved; rebuild the index after a change.": "Embedding \u914d\u7f6e\u5df2\u4fdd\u5b58\uff1b\u914d\u7f6e\u53d8\u5316\u540e\u9700\u8981\u91cd\u5efa\u7d22\u5f15\u3002", "Building the shared index\u2026": "\u6b63\u5728\u8c03\u7528 Embedding API \u6784\u5efa\u5171\u4eab\u7d22\u5f15\u2026", "Choose a chunk JSON file first.": "\u8bf7\u5148\u9009\u62e9 chunk JSON \u6587\u4ef6\u3002", "Open local PDF \u2197": "\u6253\u5f00\u672c\u5730 PDF \u2197", "Extracting local PDFs page by page and updating the knowledge base\u2026": "\u6b63\u5728\u9010\u9875\u63d0\u53d6\u672c\u5730 PDF \u5e76\u66f4\u65b0\u77e5\u8bc6\u5e93\uff0c\u8bf7\u7b49\u5f85\u5b8c\u6210\u2026", "What are the symptoms of apple scab?": "\u82f9\u679c\u9ed1\u661f\u75c5\u6709\u54ea\u4e9b\u75c7\u72b6\uff1f", "Spots on leaves and fruit": "\u8bc6\u522b\u53f6\u7247\u548c\u679c\u5b9e\u4e0a\u7684\u75c5\u6591", "Signs of codling moth damage": "\u82f9\u679c\u8839\u86fe\u7684\u5371\u5bb3\u7279\u5f81", "Conditions for fire blight": "\u706b\u75ab\u75c5\u7684\u53d1\u751f\u6761\u4ef6", "What are the common pests and diseases of apples?": "\u82f9\u679c\u6709\u54ea\u4e9b\u5e38\u89c1\u75c5\u866b\u5bb3\uff1f", "Overview of diseases and pests": "\u75c5\u5bb3\u4e0e\u866b\u5bb3\u6982\u89c8", "Browser storage is full; chats were not saved.": "\u6d4f\u89c8\u5668\u5b58\u50a8\u7a7a\u95f4\u4e0d\u8db3\uff0c\u5bf9\u8bdd\u8bb0\u5f55\u6682\u672a\u4fdd\u5b58\u3002", "The server returned no answer record.": "\u670d\u52a1\u672a\u8fd4\u56de\u56de\u7b54\u8bb0\u5f55\u3002", "Model": "\u6a21\u578b", "Unknown error": "\u672a\u77e5\u9519\u8bef", "Copy": "\u590d\u5236", "Copied": "\u5df2\u590d\u5236", "The provider's domain could not be resolved; check the network, DNS or proxy and try again.": "\u65e0\u6cd5\u89e3\u6790\u670d\u52a1\u5546\u57df\u540d\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u3001DNS \u6216\u4ee3\u7406\u8bbe\u7f6e\u540e\u91cd\u8bd5\u3002", "This network may be intercepting HTTPS; try another network (e.g. a phone hotspot).": "\u5f53\u524d\u7f51\u7edc\u53ef\u80fd\u5728\u62e6\u622a HTTPS\uff0c\u8bf7\u6362\u4e00\u4e2a\u7f51\u7edc\uff08\u5982\u624b\u673a\u70ed\u70b9\uff09\u518d\u8bd5\u3002", "The model or network is too slow; try again later or use another model.": "\u6a21\u578b\u6216\u7f51\u7edc\u54cd\u5e94\u8fc7\u6162\uff0c\u53ef\u4ee5\u7a0d\u540e\u91cd\u8bd5\u6216\u6362\u4e00\u4e2a\u6a21\u578b\u3002", "Check the retrieval and answer settings and keep them within the allowed range.": "\u8bf7\u68c0\u67e5\u68c0\u7d22\u4e0e\u56de\u7b54\u8bbe\u7f6e\uff0c\u6309\u63d0\u793a\u7684\u8303\u56f4\u8c03\u6574\u540e\u518d\u63d0\u4ea4\u3002", "The provider refused the request (403); check account permissions, model availability or network access.": "\u670d\u52a1\u5546\u62d2\u7edd\u4e86\u8bf7\u6c42\uff08403\uff09\uff0c\u8bf7\u68c0\u67e5\u8d26\u6237\u6743\u9650\u3001\u6a21\u578b\u53ef\u7528\u6027\u6216\u7f51\u7edc\u8bbf\u95ee\u6761\u4ef6\u3002", "The provider's request or token limit was reached; wait and retry, or use another model.": "\u5df2\u8fbe\u5230\u670d\u52a1\u5546\u8bf7\u6c42\u6216 token \u9650\u989d\uff1b\u8bf7\u7b49\u5f85\u989d\u5ea6\u6062\u590d\u540e\u91cd\u8bd5\uff0c\u6216\u5207\u6362\u53e6\u4e00\u6a21\u578b\u3002", "The provider is temporarily unavailable or timed out; retry later or use another model.": "\u670d\u52a1\u5546\u6682\u65f6\u4e0d\u53ef\u7528\u6216\u7f51\u5173\u8d85\u65f6\uff1b\u7a0d\u540e\u91cd\u8bd5\uff0c\u6216\u5207\u6362\u53e6\u4e00\u4e2a\u5df2\u914d\u7f6e\u6a21\u578b\u3002", "The provider rejected the key (401); check it in API settings.": "\u670d\u52a1\u5546\u672a\u63a5\u53d7\u5bc6\u94a5\uff08401\uff09\uff0c\u8bf7\u5728 API \u8bbe\u7f6e\u4e2d\u68c0\u67e5\u5bc6\u94a5\u3002", "Cannot reach the local server; make sure the program is still running.": "\u65e0\u6cd5\u8fde\u63a5\u672c\u5730\u670d\u52a1\uff0c\u8bf7\u786e\u8ba4\u7a0b\u5e8f\u4ecd\u5728\u8fd0\u884c\u3002", "Check the API settings and connection, or ask again with another model.": "\u8bf7\u68c0\u67e5 API \u8bbe\u7f6e\u4e0e\u8fde\u63a5\uff0c\u6216\u5207\u6362\u6a21\u578b\u540e\u91cd\u65b0\u63d0\u95ee\u3002", "The browser blocked copying; select the text and copy it.": "\u6d4f\u89c8\u5668\u672a\u5141\u8bb8\u590d\u5236\uff0c\u8bf7\u76f4\u63a5\u9009\u4e2d\u6587\u5b57\u590d\u5236\u3002", "Ask a question about your apple trees.": "\u4ece\u4e00\u4e2a\u95ee\u9898\uff0c\u4e86\u89e3\u4f60\u7684\u82f9\u679c\u3002", "Ask about symptoms, conditions and management; RAG answers cite the passages they are based on.": "\u8be2\u95ee\u75c5\u866b\u5bb3\u75c7\u72b6\u3001\u53d1\u751f\u6761\u4ef6\u4e0e\u7ba1\u7406\u63aa\u65bd\uff1bRAG \u56de\u7b54\u4f1a\u6807\u51fa\u6240\u4f9d\u636e\u7684\u8d44\u6599\u3002", "Edit and resend": "\u7f16\u8f91\u540e\u91cd\u65b0\u53d1\u9001", "Wait for the current answer or stop it first.": "\u8bf7\u7b49\u5f85\u5f53\u524d\u56de\u7b54\u5b8c\u6210\u6216\u5148\u505c\u6b62\u751f\u6210\u3002", "Cancel": "\u53d6\u6d88", "Offline demo \u00b7 not a real model answer": "\u79bb\u7ebf\u6f14\u793a \u00b7 \u975e\u771f\u5b9e\u6a21\u578b\u56de\u7b54", "Waiting for the model\u2026": "\u6b63\u5728\u7b49\u5f85\u6a21\u578b\u56de\u7b54\u2026", "Retrieving evidence and waiting for the model\u2026": "\u6b63\u5728\u68c0\u7d22\u8d44\u6599\u5e76\u7b49\u5f85\u6a21\u578b\u56de\u7b54\u2026", "No answer was returned": "\u672c\u6b21\u672a\u80fd\u83b7\u53d6\u56de\u7b54", "Retry": "\u91cd\u8bd5", "Stopped. If the request had reached the local server, the model call still completes and is logged.": "\u5df2\u505c\u6b62\u751f\u6210\u3002\u8bf7\u6c42\u5982\u679c\u5df2\u53d1\u5230\u672c\u5730\u670d\u52a1\uff0c\u6a21\u578b\u8c03\u7528\u4ecd\u4f1a\u5b8c\u6210\u5e76\u5199\u5165\u5b9e\u9a8c\u65e5\u5fd7\u3002", "Stopped.": "\u5df2\u505c\u6b62\u751f\u6210\u3002", "Show full answer": "\u663e\u793a\u5b8c\u6574\u56de\u7b54", "The API returned no text. Increase max output tokens in the settings or try another model.": "API \u672a\u8fd4\u56de\u53ef\u663e\u793a\u7684\u56de\u7b54\u3002\u8bf7\u5728\u8bbe\u7f6e\u4e2d\u63d0\u9ad8\u6700\u5927\u8f93\u51fa token \u6216\u5207\u6362\u6a21\u578b\u540e\u91cd\u8bd5\u3002", "The answer reached the output limit and may be incomplete. Increase max output tokens and regenerate.": "\u56de\u7b54\u8fbe\u5230\u4e86\u8f93\u51fa\u4e0a\u9650\uff0c\u53ef\u80fd\u672a\u5b8c\u6574\u751f\u6210\u3002\u53ef\u5728\u8bbe\u7f6e\u4e2d\u63d0\u9ad8\u6700\u5927\u8f93\u51fa token \u540e\u91cd\u65b0\u751f\u6210\u3002", "Regenerate (current settings)": "\u91cd\u65b0\u751f\u6210\uff08\u4f7f\u7528\u5f53\u524d\u8bbe\u7f6e\uff09", "Helpful (saved on this computer only)": "\u6709\u5e2e\u52a9\uff08\u4ec5\u4fdd\u5b58\u5728\u672c\u673a\uff09", "Not helpful (saved on this computer only)": "\u6ca1\u6709\u5e2e\u52a9\uff08\u4ec5\u4fdd\u5b58\u5728\u672c\u673a\uff09", "Download the full record (JSON)": "\u4e0b\u8f7d\u672c\u6761\u5b8c\u6574\u8bb0\u5f55\uff08JSON\uff09", "Open original source \u2197": "\u6253\u5f00\u539f\u59cb\u6765\u6e90 \u2197", "Source address unavailable": "\u6765\u6e90\u5730\u5740\u4e0d\u53ef\u7528", "Untitled source": "\u672a\u547d\u540d\u8d44\u6599", "Show evidence text": "\u67e5\u770b\u5b9e\u9645\u8bc1\u636e", "No chats yet": "\u8fd8\u6ca1\u6709\u5bf9\u8bdd", "Today": "\u4eca\u5929", "Previous 7 days": "7 \u5929\u5185", "Earlier": "\u66f4\u65e9", "Rename": "\u91cd\u547d\u540d", "Delete": "\u5220\u9664", "Stop generating": "\u505c\u6b62\u751f\u6210", "Configure a model in API settings first": "\u8bf7\u5148\u5728 API \u8bbe\u7f6e\u4e2d\u914d\u7f6e\u6a21\u578b", "Vector search (bge-small) + local reranking; both RAG conditions use the same retrieved passages.": "\u5411\u91cf\u68c0\u7d22\uff08bge-small\uff09+ \u672c\u5730\u91cd\u6392\u5e8f\uff1b\u4e24\u79cd RAG \u6761\u4ef6\u4f7f\u7528\u540c\u4e00\u6279\u68c0\u7d22\u7ed3\u679c\u3002", "The vector index is not ready; RAG conditions are unavailable.": "\u5411\u91cf\u7d22\u5f15\u672a\u5c31\u7eea\uff0cRAG \u6761\u4ef6\u6682\u4e0d\u53ef\u7528\u3002", "Cannot connect to the local server": "\u672c\u5730\u670d\u52a1\u8fde\u63a5\u5931\u8d25", "Only dense (vector) retrieval is supported.": "\u53ea\u652f\u6301\u5411\u91cf\u68c0\u7d22\uff08dense\uff09\u3002", "The embedding index has not been built.": "\u5c1a\u672a\u6784\u5efa embedding \u7d22\u5f15\u3002", "Enter a model ID.": "\u8bf7\u586b\u5199\u5177\u4f53\u6a21\u578b ID\u3002", "Switch to English": "\u5207\u6362\u5230\u82f1\u6587", "No local PDFs imported yet": "\u5c1a\u672a\u5bfc\u5165\u672c\u5730 PDF", "The starter sample covers Apple Scab, Fire Blight and Codling Moth. Documents in the data/pdf folder can be imported to extend the knowledge base.": "\u8d77\u59cb\u6837\u672c\u8986\u76d6 Apple Scab\u3001Fire Blight \u548c Codling Moth\u3002\u53ef\u5bfc\u5165 data/pdf \u6587\u4ef6\u5939\u4e2d\u7684\u6587\u732e\u6269\u5145\u77e5\u8bc6\u5e93\u3002", "Archived \u00b7 not used for Q&A": "\u5df2\u5b58\u6863 \u00b7 \u4e0d\u7528\u4e8e\u95ee\u7b54", "Switch to Chinese": "\u5207\u6362\u5230\u4e2d\u6587", "Fixed to the formal-experiment settings and not editable here": "\u4ee5\u4e0b\u53c2\u6570\u5df2\u6309\u6b63\u5f0f\u5b9e\u9a8c\u56fa\u5b9a\uff0c\u4e0d\u5728\u9875\u9762\u4e2d\u4fee\u6539", "Study of the golden apple snail, not an apple tree pest or disease.": "\u7814\u7a76\u5bf9\u8c61\u662f\u798f\u5bff\u87ba\uff08golden apple snail\uff09\uff0c\u4e0d\u662f\u82f9\u679c\u6811\u75c5\u866b\u5bb3\u3002", "Study of peanut; outside the apple pest and disease knowledge base.": "\u7814\u7a76\u5bf9\u8c61\u662f\u82b1\u751f\uff0c\u4e0d\u5c5e\u4e8e\u82f9\u679c\u75c5\u866b\u5bb3\u77e5\u8bc6\u5e93\u3002", "Promotional/preview version of a guide: the full-text record is kept but it is not retrieved as a complete control guide.": "\u6307\u5357\u7684\u5ba3\u4f20/\u9884\u89c8\u7248\u672c\uff1a\u4fdd\u7559\u5168\u6587\u8bb0\u5f55\uff0c\u4f46\u4e0d\u5f53\u4f5c\u5b8c\u6574\u9632\u6cbb\u6307\u5357\u68c0\u7d22\u3002", "Mainly about spotted-wing drosophila in other fruit or orchards; relation to the apple scope still to be confirmed.": "\u4e3b\u8981\u7814\u7a76\u5176\u4ed6\u6c34\u679c\u6216\u679c\u56ed\u4e2d\u7684\u6591\u7fc5\u679c\u8747\uff0c\u5f85\u786e\u8ba4\u4e0e\u82f9\u679c\u7814\u7a76\u8303\u56f4\u7684\u5173\u7cfb\u3002", "Technical material or manual; extracted page by page; specific region, year and product information still need checking.": "\u6280\u672f\u8d44\u6599/\u624b\u518c\uff1b\u9010\u9875\u63d0\u53d6\uff0c\u5177\u4f53\u5730\u533a\u3001\u5e74\u4efd\u4e0e\u836f\u5242\u4fe1\u606f\u4ecd\u9700\u6838\u5bf9\u3002", "Research or supplementary literature; automatic extraction completed, not yet reviewed passage by passage.": "\u7814\u7a76/\u8865\u5145\u6587\u732e\uff1b\u81ea\u52a8\u63d0\u53d6\u5b8c\u6210\uff0c\u5c1a\u672a\u9010\u6bb5\u4eba\u5de5\u5ba1\u6838\u3002", "PDF import needs pypdf. Run python -m pip install pypdf and try again.": "PDF \u5bfc\u5165\u9700\u8981 pypdf\u3002\u8bf7\u8fd0\u884c python -m pip install pypdf \u540e\u91cd\u8bd5\u3002", "The PDF path must be inside data/pdf.": "PDF \u8def\u5f84\u5fc5\u987b\u4f4d\u4e8e data/pdf \u5185\u3002", "The data/pdf folder contains no PDF files.": "data/pdf \u6587\u4ef6\u5939\u6ca1\u6709 PDF \u6587\u4ef6\u3002", "The PDF is encrypted and cannot be extracted.": "PDF \u5df2\u52a0\u5bc6\uff0c\u65e0\u6cd5\u63d0\u53d6\u3002", "The document review did not approve it for the QA corpus.": "\u6587\u732e\u5ba1\u6838\u672a\u6279\u51c6\u8fdb\u5165\u95ee\u7b54\u5e93\u3002", "Reviewed page numbers are outside the PDF.": "\u5ba1\u6838\u9875\u7801\u8d85\u51fa PDF \u8303\u56f4\u3002", "The extracted PDF text differs from the reviewed version; re-check the page numbers and text ranges.": "PDF \u63d0\u53d6\u7ed3\u679c\u4e0e\u5ba1\u6838\u7248\u672c\u4e0d\u540c\uff0c\u8bf7\u91cd\u65b0\u6838\u5bf9\u9875\u7801\u548c\u6b63\u6587\u8303\u56f4\u3002", "Invalid reviewed text range.": "\u5ba1\u6838\u6b63\u6587\u8303\u56f4\u65e0\u6548\u3002", "Extraction failed for all PDFs; the knowledge base was not changed.": "PDF \u5168\u90e8\u63d0\u53d6\u5931\u8d25\uff0c\u77e5\u8bc6\u5e93\u672a\u4fee\u6539\u3002", "The cleaned file path is outside the source folder.": "\u6e05\u6d17\u6587\u4ef6\u8def\u5f84\u8d85\u51fa\u6765\u6e90\u76ee\u5f55\u3002", "The cleaned file source or original hash does not match.": "\u6e05\u6d17\u6587\u4ef6\u6765\u6e90\u6216\u539f\u6587\u54c8\u5e0c\u4e0d\u5339\u914d\u3002", "The archived web page has changed; review it again.": "\u539f\u59cb\u7f51\u9875\u5df2\u53d8\u66f4\uff0c\u8bf7\u91cd\u65b0\u5ba1\u6838\u3002", "The cleaned text hash does not match.": "\u6e05\u6d17\u6b63\u6587\u54c8\u5e0c\u4e0d\u5339\u914d\u3002", "PDF extraction or review check failed; database unchanged: ": "PDF \u63d0\u53d6\u6216\u5ba1\u6838\u6821\u9a8c\u5931\u8d25\uff0c\u6570\u636e\u5e93\u672a\u4fee\u6539\uff1a", "No text to import.": "\u6ca1\u6709\u53ef\u5bfc\u5165\u6b63\u6587\u3002", "No text to import; choose parsable English HTML or import a text JSON.": "\u6ca1\u6709\u53ef\u5bfc\u5165\u7684\u6b63\u6587\uff1b\u8bf7\u9009\u62e9\u53ef\u89e3\u6790\u7684\u82f1\u6587 HTML \u6216\u5bfc\u5165\u6587\u672c JSON\u3002", "Chunk IDs must be unique.": "Chunk ID \u5fc5\u987b\u552f\u4e00\u3002", "Unknown source ID.": "\u6765\u6e90\u7f16\u53f7\u4e0d\u5b58\u5728\u3002", "The source path is outside the data folder.": "\u6765\u6e90\u8def\u5f84\u8d85\u51fa\u8d44\u6599\u76ee\u5f55\u3002", "No reviewed web text; database unchanged.": "\u6ca1\u6709\u901a\u8fc7\u5ba1\u6838\u7684\u7f51\u9875\u6b63\u6587\uff1b\u6570\u636e\u5e93\u672a\u4fee\u6539\u3002", "Invalid API base URL.": "API Base URL \u683c\u5f0f\u65e0\u6548\u3002", "Remote APIs must use HTTPS.": "\u8fdc\u7a0b API \u5fc5\u987b\u4f7f\u7528 HTTPS\u3002", "Local embeddings need sentence-transformers to be installed.": "\u672c\u5730 embedding \u9700\u8981\u5b89\u88c5 sentence-transformers\u3002", "Configure a local embedding model first.": "\u8bf7\u5148\u914d\u7f6e\u672c\u5730 embedding \u6a21\u578b\u3002", "Configure an embedding model first.": "\u8bf7\u5148\u914d\u7f6e embedding \u6a21\u578b\u3002", "Invalid number or dimension of embeddings in the response.": "Embedding \u54cd\u5e94\u6570\u91cf\u6216\u7ef4\u5ea6\u65e0\u6548\u3002", "The knowledge base is empty.": "\u77e5\u8bc6\u5e93\u4e3a\u7a7a\u3002", "Vector dimension does not match the index.": "\u5411\u91cf\u7ef4\u5ea6\u4e0e\u7d22\u5f15\u4e0d\u4e00\u81f4\u3002", "The corpus or embedding configuration has changed; rebuild the index.": "\u8bed\u6599\u6216 embedding \u914d\u7f6e\u5df2\u6539\u53d8\uff0c\u8bf7\u91cd\u5efa\u7d22\u5f15\u3002", "Invalid output parameter name.": "\u8f93\u51fa\u53c2\u6570\u540d\u79f0\u65e0\u6548\u3002", "This adapter needs message.content as text.": "\u5f53\u524d\u9002\u914d\u5668\u9700\u8981\u6587\u672c\u5f62\u5f0f\u7684 message.content\u3002", "Claude needs the anthropic package: python -m pip install anthropic": "Claude \u9700\u8981\u5b89\u88c5 anthropic\uff1apython -m pip install anthropic", "API HTTP 503; connection failed.": "API HTTP 503\uff1b\u8fde\u63a5\u5931\u8d25\u3002", "Enter 1\u2013100 valid questions of at most 6,000 characters each.": "\u8bf7\u8f93\u51651\u2013100\u4e2a\u6709\u6548\u95ee\u9898\uff0c\u6bcf\u9898\u4e0d\u8d85\u8fc76000\u5b57\u7b26\u3002", "Choose a valid API configuration.": "\u8bf7\u9009\u62e9\u6709\u6548 API \u914d\u7f6e\u3002", "Invalid mode.": "\u6a21\u5f0f\u65e0\u6548\u3002", "Invalid answer language.": "\u56de\u7b54\u8bed\u8a00\u65e0\u6548\u3002", "At most 300 requests per batch.": "\u5355\u6279\u6700\u591a300\u6b21\u8bf7\u6c42\u3002", "Import a knowledge base first.": "\u8bf7\u5148\u5bfc\u5165\u77e5\u8bc6\u5e93\u3002", "Only local access is accepted.": "\u4ec5\u63a5\u53d7\u672c\u5730\u8bbf\u95ee\u3002", "PDF source not found or invalid path.": "PDF \u6765\u6e90\u4e0d\u5b58\u5728\u6216\u8def\u5f84\u65e0\u6548\u3002", "Cross-site request refused.": "\u62d2\u7edd\u8de8\u7ad9\u8bf7\u6c42\u3002", "The request must be application/json.": "\u8bf7\u6c42\u9700\u8981 application/json\u3002", "Invalid request size.": "\u8bf7\u6c42\u5927\u5c0f\u65e0\u6548\u3002", "The request must be a JSON object.": "\u8bf7\u6c42\u9700\u8981 JSON \u5bf9\u8c61\u3002", "Unknown configuration ID.": "\u914d\u7f6eID\u4e0d\u5b58\u5728\u3002", "Invalid reasoning effort.": "\u601d\u8003\u5f3a\u5ea6\u53c2\u6570\u65e0\u6548\u3002", "Invalid adapter.": "\u9002\u914d\u5668\u65e0\u6548\u3002", "Invalid embedding adapter.": "Embedding \u9002\u914d\u5668\u65e0\u6548\u3002", "A list of chunks with id, text, metadata.title and metadata.url is required.": "\u9700\u8981\u5305\u542b id\u3001text\u3001metadata.title\u3001metadata.url \u7684 chunk \u5217\u8868\u3002", "Unknown action.": "\u672a\u77e5\u64cd\u4f5c\u3002", "D001\u2013D020 development set; T001\u2013T060 test set; unique and never reused": "D001\u2013D020 \u5f00\u53d1\u96c6\uff1bT001\u2013T060 \u6d4b\u8bd5\u96c6\uff0c\u552f\u4e00\u4e14\u4e0d\u590d\u7528", "Scope table identifier T01\u2013T46, see the \"Topics\" sheet": "\u8303\u56f4\u8868\u7f16\u53f7 T01\u2013T46\uff0c\u89c1\u201c\u4e13\u9898\u201d\u9875", "See the \"Options\" sheet": "\u89c1\u201c\u9009\u9879\u201d\u9875", "Region of the evidence, e.g. United States - Pacific Northwest / New Zealand": "\u8bc1\u636e\u6240\u5c5e\u5730\u533a\uff0c\u5982 United States - Pacific Northwest / New Zealand", "Growth or postharvest stage": "\u751f\u80b2/\u91c7\u540e\u9636\u6bb5", "answerable / partial / unanswerable (within the corpus)": "answerable / partial / unanswerable\uff08\u8bed\u6599\u5185\uff09", "Question in English; state region or source context; no answer hints": "\u82f1\u6587\u95ee\u9898\uff1b\u5199\u660e\u5730\u533a\u6216\u6765\u6e90\u60c5\u5883\uff0c\u4e0d\u51fa\u73b0\u7b54\u6848\u7ebf\u7d22", "Reference answer written only from the cited passages": "\u53ea\u4f9d\u636e\u6240\u5f15\u539f\u6587\u5199\u6210\u7684\u53c2\u8003\u7b54\u6848", "3\u20135 required points separated by |; basis for the 0\u20134 score": "3\u20135 \u4e2a\u5fc5\u7b54\u8981\u70b9\uff0c\u7528 | \u5206\u9694\uff1b\u8bc4\u5206 0\u20134 \u4f9d\u636e", "Cases counted as major errors, separated by |": "\u5224\u4e3a\u91cd\u5927\u9519\u8bef\u7684\u60c5\u5f62\uff0c\u7528 | \u5206\u9694", "Boundary questions: answerable part / part to decline / reason": "\u8fb9\u754c\u9898\uff1a\u53ef\u7b54\u90e8\u5206 / \u5e94\u62d2\u7b54\u90e8\u5206 / \u7406\u7531", "e.g. S001|S036": "\u5982 S001|S036", "e.g. S001:web:3|S001:web:4 (several equivalent chunks allowed)": "\u5982 S001:web:3|S001:web:4\uff08\u53ef\u7528\u591a\u4e2a\u7b49\u4ef7\u7247\u6bb5\uff09", "PDF page or web section, e.g. p.12 / Symptoms and Signs": "PDF \u9875\u7801\u6216\u7f51\u9875\u7ae0\u8282\uff0c\u5982 p.12 / Symptoms and Signs", "Question author": "\u51fa\u9898\u4eba", "Reviewer; must differ from the author": "\u590d\u6838\u4eba\uff0c\u5fc5\u987b\u4e0d\u540c\u4e8e\u51fa\u9898\u4eba", "Starts at 1; add 1 after each change": "\u4ece 1 \u5f00\u59cb\uff0c\u4fee\u6539\u540e\u52a0 1", "Disputes, regional transfer, source conflicts, etc.": "\u4e89\u8bae\u3001\u5730\u533a\u8f6c\u7528\u3001\u6765\u6e90\u51b2\u7a81\u7b49", "[Example, rewrite from the source] Leaf lesions ... ; fruit lesions ...": "[\u793a\u4f8b\uff0c\u9700\u6309\u539f\u6587\u6539\u5199] Leaf lesions ... ; fruit lesions ..."};
I18N_ZH["Check where the sources apply:"]="\u7559\u610f\u8d44\u6599\u7684\u9002\u7528\u5730\u533a\uff1a";
const I18N_RULES=[
["^Version (\\S+) \u00b7 vector index ready$","\u7248\u672c $1 \u00b7 \u5411\u91cf\u7d22\u5f15\u5df2\u5c31\u7eea"],
["^Version (\\S+) \u00b7 vector index not built$","\u7248\u672c $1 \u00b7 \u5411\u91cf\u7d22\u5f15\u672a\u6784\u5efa"],
["^(\\d+) chunks \u00b7 vector search available$","$1 \u4e2a\u7247\u6bb5 \u00b7 \u5411\u91cf\u68c0\u7d22\u53ef\u7528"],
["^(\\d+) chunks \u00b7 vector index not ready$","$1 \u4e2a\u7247\u6bb5 \u00b7 \u5411\u91cf\u7d22\u5f15\u672a\u5c31\u7eea"],
["^(\\d+) PDFs registered, (\\d+) used for Q&A, together with the imported web articles\\. Check answers against the source, page and original text\\.$","\u5df2\u767b\u8bb0 $1 \u4efd PDF\uff0c\u5176\u4e2d $2 \u4efd\u7528\u4e8e\u95ee\u7b54\uff1b\u540c\u65f6\u4fdd\u7559\u5df2\u5bfc\u5165\u7684\u7f51\u9875\u8d44\u6599\u3002\u8bf7\u7ed3\u5408\u6765\u6e90\u3001\u9875\u7801\u548c\u539f\u6587\u6838\u5bf9\u3002"],
["^Frozen version (\\S+) \\((.+?)\\) \u00b7 vector index ready$","\u51bb\u7ed3\u7248\u672c $1\uff08$2\uff09 \u00b7 \u5411\u91cf\u7d22\u5f15\u5df2\u5c31\u7eea"],
["^Frozen version (\\S+) \\((.+?)\\) \u00b7 vector index not ready$","\u51bb\u7ed3\u7248\u672c $1\uff08$2\uff09 \u00b7 \u5411\u91cf\u7d22\u5f15\u672a\u5c31\u7eea"],
["^Frozen version (\\S+) \\((.+?)\\) \u00b7 \u26a0 the corpus differs from the freeze record$","\u51bb\u7ed3\u7248\u672c $1\uff08$2\uff09 \u00b7 \u26a0 \u5f53\u524d\u8bed\u6599\u4e0e\u51bb\u7ed3\u8bb0\u5f55\u4e0d\u4e00\u81f4"],
["^The corpus was frozen on (\\S+) \\((.*?)\\): .*$","\u8bed\u6599\u5df2\u4e8e $1 \u51bb\u7ed3\uff08$2\uff09\uff1a\u5bfc\u5165\u3001\u66ff\u6362\u8bed\u6599\u3001\u4fee\u6539 Embedding \u548c\u91cd\u5efa\u7d22\u5f15\u5df2\u505c\u7528\u3002\u95ee\u7b54\u4e0e\u5b9e\u9a8c\u5bf9\u6bd4\u7167\u5e38\u4f7f\u7528\u3002"],
["^Fixed to the formal-experiment settings and not editable here: endpoint (.+?); thinking off; temperature not sent; output limit parameter (.+?)\\. Embedding: local (.+?) \\(corpus frozen\\)\\.$","\u4ee5\u4e0b\u53c2\u6570\u5df2\u6309\u6b63\u5f0f\u5b9e\u9a8c\u56fa\u5b9a\uff0c\u4e0d\u5728\u9875\u9762\u4e2d\u4fee\u6539\uff1a\u63a5\u53e3 $1\uff1b\u601d\u8003 \u5173\u95ed\uff1btemperature \u4e0d\u53d1\u9001\uff1b\u8f93\u51fa\u4e0a\u9650\u53c2\u6570 $2\u3002Embedding\uff1a\u672c\u5730 $3\uff08\u8bed\u6599\u5df2\u51bb\u7ed3\uff09\u3002"],
["^Done: (\\d+) results; random seed (\\d+)\\. Logs saved\\.$","\u5b9e\u9a8c\u5b8c\u6210\uff1a$1 \u6761\u7ed3\u679c\uff1b\u968f\u673a\u79cd\u5b50 $2\u3002\u65e5\u5fd7\u5df2\u4fdd\u5b58\u3002"],
["^(.+) \u00b7 No RAG \u00b7 run (\\d+)$","$1 \u00b7 \u65e0 RAG \u00b7 \u7b2c $2 \u6b21"],
["^(.+) \u00b7 Standard RAG \u00b7 run (\\d+)$","$1 \u00b7 \u6807\u51c6 RAG \u00b7 \u7b2c $2 \u6b21"],
["^(.+) \u00b7 Token-efficient RAG \u00b7 run (\\d+)$","$1 \u00b7 \u7cbe\u7b80 RAG \u00b7 \u7b2c $2 \u6b21"],
["^(.+) \u00b7 Headers-only \u00b7 run (\\d+)$","$1 \u00b7 \u4ec5\u7cbe\u7b80\u6807\u9898 \u00b7 \u7b2c $2 \u6b21"],
["^(.+) \u00b7 No RAG$","$1 \u00b7 \u65e0 RAG"],
["^(.+) \u00b7 Standard RAG$","$1 \u00b7 \u6807\u51c6 RAG"],
["^(.+) \u00b7 Token-efficient RAG$","$1 \u00b7 \u7cbe\u7b80 RAG"],
["^(.+) \u00b7 Headers-only$","$1 \u00b7 \u4ec5\u7cbe\u7b80\u6807\u9898"],
["^Time ([\\d.]+) s$","\u8017\u65f6 $1 s"],
["^Input (\\S+) tokens$","\u8f93\u5165 $1 token"],
["^Output (\\S+) tokens$","\u8f93\u51fa $1 token"],
["^Total (\\S+)$","\u603b\u7528\u91cf $1"],
["^Model (\\S+)$","\u6a21\u578b $1"],
["^Citations outside the evidence: (.+)$","\u8d85\u51fa\u8bc1\u636e\u8303\u56f4\u7684\u5f15\u7528\uff1a$1"],
["^Show (\\d+) evidence passages and sources$","\u67e5\u770b $1 \u6761\u5b9e\u9645\u8bc1\u636e\u4e0e\u6765\u6e90"],
["^Imported (\\d+) web sources; PDF text kept; the working corpus has (\\d+) chunks\\. Check the text quality and rebuild the vector index\\.$","\u5df2\u5bfc\u5165 $1 \u4e2a\u7f51\u9875\u6765\u6e90\uff0cPDF \u6b63\u6587\u4fdd\u7559\uff1b\u5de5\u4f5c\u5e93\u5171 $2 \u4e2a\u7247\u6bb5\u3002\u8bf7\u68c0\u67e5\u6b63\u6587\u8d28\u91cf\u5e76\u91cd\u5efa\u5411\u91cf\u7d22\u5f15\u3002"],
["^Index built in ([\\d.]+) s\\. Build usage saved separately\\.$","\u7d22\u5f15\u6784\u5efa\u5b8c\u6210\uff0c\u8017\u65f6 $1 \u79d2\u3002\u6784\u5efa\u7528\u91cf\u5df2\u53e6\u884c\u4fdd\u5b58\u3002"],
["^Imported (\\d+) chunks; rebuild the vector index\\.$","\u5df2\u5bfc\u5165 $1 \u4e2a\u7247\u6bb5\uff0c\u8bf7\u91cd\u5efa\u5411\u91cf\u7d22\u5f15\u3002"],
["^(\\d+) registered \u00b7 (\\d+) used for Q&A \u00b7 (\\S+) pages$","$1 \u4efd\u5df2\u767b\u8bb0 \u00b7 $2 \u4efd\u7528\u4e8e\u95ee\u7b54 \u00b7 $3 \u9875"],
["^(.+) \u00b7 (\\d+) pages$","$1 \u00b7 $2 \u9875"],
["^PDF import finished: (\\d+) registered, (\\d+) used for Q&A; the working corpus has (\\d+) chunks\\. See the document list for details and exclusion reasons\\.$","PDF \u5bfc\u5165\u5b8c\u6210\uff1a$1 \u4efd\u5df2\u767b\u8bb0\u3001$2 \u4efd\u7528\u4e8e\u95ee\u7b54\uff0c\u5de5\u4f5c\u5e93\u5171 $3 \u4e2a\u7247\u6bb5\u3002\u8be6\u60c5\u4e0e\u6392\u9664\u539f\u56e0\u89c1\u6587\u732e\u5217\u8868\u3002"],
["^No response within (\\d+) s \\(timeout\\)\\.$","\u8bf7\u6c42\u8d85\u65f6\uff08$1 \u79d2\uff09\u672a\u8fd4\u56de\u3002"],
["^Show source (\\d+)$","\u67e5\u770b\u6765\u6e90 $1"],
["^Citation numbers outside the evidence: (.+)\\. Check the original text\\.$","\u5b58\u5728\u8d85\u51fa\u8bc1\u636e\u8303\u56f4\u7684\u5f15\u7528\u7f16\u53f7\uff1a$1\u3002\u8bf7\u6838\u5bf9\u539f\u6587\u3002"],
["^Sources (\\d+)$","\u6765\u6e90 $1"],
["^([\\d.]+) s \u00b7 input (\\S+) / output (\\S+) tokens$","$1 s \u00b7 \u8f93\u5165 $2 / \u8f93\u51fa $3 token"],
["^(\\d+) items?$","$1 \u6761"],
["^\\[(\\d+)\\] Untitled source$","[$1] \u672a\u547d\u540d\u8d44\u6599"],
["^Page (\\d+)$","\u7b2c $1 \u9875"],
["^Date (.+)$","\u65e5\u671f $1"],
["^Delete the chat \"([\\s\\S]*)\"\\?\\nOnly the browser copy is deleted; experiment logs are not affected\\.$","\u5220\u9664\u5bf9\u8bdd\"$1\"\uff1f\n\u53ea\u5220\u9664\u6d4f\u89c8\u5668\u4e2d\u7684\u8bb0\u5f55\uff0c\u9879\u76ee\u5b9e\u9a8c\u65e5\u5fd7\u4e0d\u53d7\u5f71\u54cd\u3002"],
["^Cannot connect to the local server: ([\\s\\S]*)$","\u65e0\u6cd5\u8fde\u63a5\u672c\u5730\u670d\u52a1\uff1a$1"],
["^API HTTP (\\d+); check the URL, model, key and parameters\\.(.*)$","API HTTP $1\uff1b\u8bf7\u68c0\u67e5\u5730\u5740\u3001\u6a21\u578b\u3001Key \u548c\u53c2\u6570\u8bbe\u7f6e\u3002$2"],
["^Cannot connect securely to (\\S+): the certificate is not trusted[\\s\\S]*$","\u65e0\u6cd5\u5b89\u5168\u8fde\u63a5 $1\uff1a\u8bc1\u4e66\u4e0d\u53d7\u4fe1\u4efb\uff08\u5f53\u524d\u7f51\u7edc\u53ef\u80fd\u5728\u62e6\u622a HTTPS\uff0c\u4f8b\u5982\u6821\u56ed\u6216\u516c\u53f8\u9632\u706b\u5899\uff09\u3002\u8bf7\u6362\u4e00\u4e2a\u7f51\u7edc\uff08\u5982\u5bb6\u5ead\u7f51\u7edc\u6216\u624b\u673a\u70ed\u70b9\uff09\u518d\u8bd5\uff1b\u4e0d\u8981\u5173\u95ed\u8bc1\u4e66\u9a8c\u8bc1\u3002"],
["^Cannot connect to (\\S+): ([\\s\\S]*)$","\u65e0\u6cd5\u8fde\u63a5 $1\uff1a$2"],
["^Allowed range is (.+)\\.$","\u53c2\u6570\u8303\u56f4\u4e3a $1\u3002"],
["^PDF extraction or review check failed; database unchanged: (.*)$","PDF \u63d0\u53d6\u6216\u5ba1\u6838\u6821\u9a8c\u5931\u8d25\uff0c\u6570\u636e\u5e93\u672a\u4fee\u6539\uff1a$1"]
].map(([p,r])=>[new RegExp(p),r]);
const I18N_SUBS=[[" \u00b7 model not configured", " \u00b7 \u5c1a\u672a\u914d\u7f6e\u6a21\u578b"], [" \u00b7 needs configuration", " \u00b7 \u9700\u8981\u914d\u7f6e"]];
function trText(s){
  const m=String(s).match(/^(\s*)([\s\S]*?)(\s*)$/),core=m[2];
  if(!core||!/[A-Za-z]/.test(core))return s;
  let out=I18N_ZH[core];
  if(out===undefined)for(const [re,rep] of I18N_RULES){if(re.test(core)){out=core.replace(re,rep);break;}}
  if(out===undefined&&core.includes(" · ")){const parts=core.split(" · ").map(trText).join(" · ");if(parts!==core)out=parts;}
  if(out===undefined){let t=core;for(const [a,b] of I18N_SUBS)t=t.split(a).join(b);if(t!==core)out=t;}
  return out===undefined?s:m[1]+out+m[3];
}
const L=s=>LANG==="zh"?trText(s):s;
// Never translate model output, user text or source content.
const I18N_SKIP=".md,.bubble,.question,.answer,.evidence,.chat-open,.edit-box,textarea,script,style,.source-card details div,.source-card strong,.source-row span,.pdf-document strong";
function trAttrs(e){for(const a of ["title","placeholder","aria-label"]){const v=e.getAttribute(a);if(v){const t=trText(v);if(t!==v)e.setAttribute(a,t);}}}
function trTree(root){
  if(root.nodeType===3){const p=root.parentElement;if(p&&!p.closest(I18N_SKIP)){const t=trText(root.data);if(t!==root.data)root.data=t;}return;}
  if(root.nodeType!==1||root.closest(I18N_SKIP))return;
  trAttrs(root);
  const w=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT,{acceptNode:n=>n.nodeType===1&&n.matches(I18N_SKIP)?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  for(let n=w.nextNode();n;n=w.nextNode()){if(n.nodeType===3){const t=trText(n.data);if(t!==n.data)n.data=t;}else trAttrs(n);}
}
if(LANG==="zh"){
  document.documentElement.lang="zh-CN";document.title=trText(document.title);trTree(document.body);document.querySelectorAll("textarea").forEach(trAttrs);
  new MutationObserver(ms=>{for(const m of ms){if(m.type==="childList")m.addedNodes.forEach(trTree);else if(m.type==="characterData")trTree(m.target);else if(m.target.nodeType===1&&!m.target.closest(I18N_SKIP))trAttrs(m.target);}})
    .observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["title","placeholder","aria-label"]});
}
$("lang-toggle").textContent=LANG==="zh"?"EN":"\u4e2d";
$("lang-toggle").title=LANG==="zh"?"Switch to English":"Switch to Chinese";
$("lang-toggle").onclick=()=>{try{localStorage.setItem("apple-rag-lang",LANG==="zh"?"en":"zh");}catch{}location.reload();};

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
    if(!confirm(L(`Delete the chat "${s.title}"?\nOnly the browser copy is deleted; experiment logs are not affected.`)))return;
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
