# 果知 · Apple RAG Lab

苹果病虫害问答程序，同时保留 G6 proposal 的三条件比较实验。前端为原生 HTML、CSS、JavaScript 页面，后端为 Python；不需要前端框架或 Node 构建。需要 Python 3.11+；PDF 导入使用 pypdf，首次安装运行 `python -m pip install -r requirements.txt`。

项目根目录分为 `data`、`论文`、`代码`。本程序位于 `代码/apple_rag_lab`；原始 PDF 位于 `data/pdf`，分块数据库位于 `data/chunks/corpus.sqlite3`，网页原文在 `data/web_raw`，清洗正文在 `data/web_cleaned`，登记表在 `data/registers`，配置、日志、报告和备份分别在 `data/config`、`data/logs`、`data/reports`、`data/backups`。这些数据路径均从代码位置确定，无须在启动时选择目录。完整目录说明见 `代码/目录说明.md`。

## 语料冻结

语料已冻结为 `corpus-v1-20261014`（`data/registers/corpus_freeze.json`）。冻结期间导入、替换语料、修改 Embedding 与重建索引会被拒绝，问答与实验照常。服务启动时先预热 embedding 模型和索引（约 15 秒）再计时。提示词版本为 `v4-readable-date-evidence`：证据头中的日期依据与试验年份以可读文本显示。

## 直接使用问答程序

双击项目文件夹中的 **Start_Apple_QA.cmd**，程序会启动本地服务并打开问答页面。默认地址为 http://127.0.0.1:8766/#qa；如果服务已经运行，启动器会直接复用它，以保留当前进程中的 API Key。新启动的服务需要保持命令窗口打开；按 Ctrl+C 停止。

也可运行 `python launcher.py`；自定义端口使用 `python launcher.py --port 8767`。

1. 进入“病虫害问答”，选择已配置的真实模型；未配置时可用离线演示检查流程。
2. 选择无 RAG、标准 RAG 或精简 RAG。输入中文或英文问题，也可点击示例问题，再点击“获取回答”或 Ctrl+Enter。
3. 查看答案，点击答案中的有效引用编号跳到对应资料；右侧可展开实际证据，并打开原始网页或带页码的本地 PDF。
4. 复制答案或下载本次 JSON 记录。最近 20 次提问以精简记录保存在当前浏览器本地，可点击回看；回看的下载不含原始 API 响应和提示词，完整日志可在“实验对比”中导出。每次调用独立，不发送聊天历史。清空浏览器提问记录不会删除后端实验日志。
5. 需要批量比较时进入“实验对比”；语料与模型分别在“知识库”和“API 设置”管理。

2026-10-13 语料审核后共审核 65 份 PDF，其中 52 份允许指定范围参与问答（199 个片段）；2026-10-14 整理目录时，其余 13 份（无片段）移至 `论文/参考文献` 并从数据库移除，数据库现存 52 份 PDF、694 页原文；198 篇网页提供 1845 个片段，另 1 篇转为背景。当前共 **2044 个可检索片段**。34 份早期 PDF 已补做范围审核，许多研究论文只纳入经过核对的摘要摘录；其余正文可继续扩展审核，不能当作全文已审。2026-10-13 已清理中间产物和旧备份（移入回收站），见项目根目录 `文件统计表_20261013.md`。报告为 `data/reports/corpus_audit_20261013_语料审核报告.md`，逐文件登记为 `论文/研究范围/语料审核登记表_20261013.md`，PDF 范围清单为 `data/registers/pdf_review_manifest.json`。该状态表示来源/范围/提取审核，尚非专家事实核验完成或正式实验冻结。

中文问题通过苹果病虫害术语表映射为英文检索词，回答跟随提问语言；不属于通用机器翻译，未收录术语可改用英文。问答输出上限默认 2048，正式实验仍默认英文和 600。向量索引已用本地 `BAAI/bge-small-en-v1.5` 构建（见下文“本地 Embedding”）；正式实验统一使用向量检索。词项检索带专题锚点过滤，向量检索没有，两者不能混用。当前检索尚无新西兰地区过滤/优先规则。新增文件自动提取不等于审核通过，正式实验前须审核新哈希并更新范围。当前程序重新全量导入禁用文件时可能显示通用 OCR 提示，实际排除原因以审核登记为准。

网页清洗版本保存在 `data/web_cleaned`，每篇有 JSON 和便于检查的 Markdown；原文保存在 `data/web_raw`。审核报告和删除回执在 `data/reports/html_review_20261011_*`。原 225 份 HTML 中，190 份用于问答，33 份目录／其他作物或适用证据不足的文章移入回收站，2 份在研项目报道只作论文背景。导入已审核网页时会校验原文及清洗文件哈希，禁止导入已排除及背景来源；默认勾选全部已审核网页。再次导入会替换网页部分并保留 PDF 部分；仅需要使用现有库时无须再导入。合格表格保留列名、上标和脚注，精简 RAG 把一行及其说明作为整体保留或放弃。历史用药剂量、REI／PHI 表及结构不能确认的表格不参与网页问答。语料更新会清除旧向量索引，需配置 embedding 后重新构建。代码更新后重新启动服务，使新的导入和压缩规则生效。

## 启动与第一次使用

在 PowerShell 中运行：

```powershell
cd D:\CodexWork\Working\158888\代码\apple_rag_lab
python server.py
```

打开 http://127.0.0.1:8765 。可用 `python server.py --port 8766` 改端口。

1. 默认选择“离线管线演示”，先运行两个示例问题确认三条件流程。演示只是摘录证据，不是 LLM；没有虚构 token 用量或准确率。
2. 在“API 配置”中选择 OpenAI、DeepSeek、豆包或自定义兼容 API，填写 **Base URL、实际可用模型 ID、API Key**，保存。豆包填写账户要求的模型或推理 Endpoint ID。自定义配置可连接其他兼容服务，也可以把任一配置槽位改为其他提供商或同一提供商的另一个模型。
3. 在“知识库”中选取并导入已审核来源。首次启动自动导入 S001 Apple Scab、S002 Fire Blight、S006 Codling Moth，只是开发起始样本。
4. 默认已配置本地 Embedding（不外发语料、无用量）；也可在“API 设置”把类型改为远程兼容 API。构建索引后将检索方式切换为 **Embedding 向量检索**。
5. 勾选一个或多个 API 和三个条件，输入英文问题（每行一题），设置重复次数，运行。调用组合为：问题数 × 模型数 × 条件数 × 重复次数，单批最多 300 次。
6. 查看真实回答与证据，导出 JSON / CSV。正式研究使用同一冻结语料、问题集合、检索配置和输出上限，保留日志与人工评分。

API Key 不写入配置或日志；界面录入的 Key 仅在服务进程内存中，重启需要重新录入。也可在启动前设置环境变量：

```powershell
$env:OPENAI_API_KEY = 'your-key'
$env:DEEPSEEK_API_KEY = 'your-key'
$env:ARK_API_KEY = 'your-key'
python server.py
```

模型名称不预填，避免把过期或不可用模型当作已验证模型。OpenAI 默认发送 `max_completion_tokens`，其他默认 `max_tokens`；按具体模型文档修改。Temperature 默认不发送，部分推理模型不支持该参数。公平比较时应记录服务商默认值，并统一各模型支持的采样设置。

## 三个系统如何工作

| 条件 | 输入模型的内容 | 实现 |
|---|---|---|
| 无 RAG | 系统指令 + 问题 | 不进行检索、不发送知识库 |
| 标准 RAG | 系统指令 + 问题 + Top K 完整片段 | 共用索引，按余弦相似度排序 |
| Token-efficient RAG | 同一批候选片段，整段保留，以精简格式发送 + 问题 | 精简证据标签（去 URL、重复日期依据；10 条通用使用限制在系统提示中只说一次，段落特有限制保留）、近似重复段落去除、低于最高相似度 0.05 的整段去除；4000 估计 token 安全上限；从不拆分或删减段落内文字 |

两个 RAG 条件使用相同 grounding / 引用 / 信息不足时拒答指令，所有条件使用相同英文简洁回答要求和输出上限。每次请求独立，无聊天历史、联网工具或模型搜索功能。精简 RAG（提示词版本 v5-lossless-efficient）不调用另一个 LLM，也不拆分段落：在开发集 20 题上，证据估计 token 中位数由 3201 降到约 2044（约 36%），节省主要来自标准格式中的重复标签，6 段资料一般全部保留。旧版“句子级抽取压缩”会删去段落中的部分信息，已于 2026-10-19 停用。

向量索引保存在 SQLite 的 state 表，使用远程 embedding 和精确余弦检索，小规模语料不需要另外部署向量数据库。改变语料或 embedding 模型会使索引失效，必须重建。词项检索是无需 Key 的开发备用，不应标成 proposal 要求的向量 RAG 实验。

预算以 UTF-8 字节数 / 3 估计，包含证据标题、URL 等开销；它不是模型 tokenizer 的精确计数。实际输入 / 输出 / 总 token 只读服务商 `usage`，保留完整返回字段，包括服务商提供的缓存与推理用量。缺失 usage 显示为空。不同模型之间 token 定义可能不同，主要比较同一模型三个条件。

## 语料与元数据

读取项目根目录的 `data/registers/source_register.json` 和原始 HTML，不修改原始采集文件。自动导入仅允许已下载的 core / support / local_management / identification HTML，排除目录、候选入口与物种状态记录。解析 main 区域，保留标题、章节、段落与表格行，按完整句子划分，目标最多 300 个单词；单个长句/表格行可能超过目标。

**自动提取不等于语料审核完成**：无 main 的网站可能无法解析；表格行可能缺少列标题或脚注；PDF 现在可按页提取正文；扫描图、图片和复杂表格没有自动 OCR 或人工校验。其他附件与特殊页面仍需检查。正式导入前检查正文、关键表格、适用地区、日期与章节定位。可以通过 JSON 导入人工审核后的文本（数组或 `{"chunks": [...]}`）：

```json
[
  {
    "id": "S001:reviewed-1",
    "text": "Verified English source passage, including necessary qualifications.",
    "metadata": {
      "source_id": "S001",
      "title": "Apple Scab",
      "organization": "UC IPM",
      "url": "https://ipm.ucanr.edu/agriculture/apple/apple-scab/",
      "publication_or_update_date": "Record the source date if provided",
      "region": "California, USA",
      "section": "Symptoms and signs",
      "page": null,
      "topic": "apple scab"
    }
  }
]
```

网页更新会保留 PDF；PDF 更新会保留网页并替换当前文件夹的 PDF 数据，先备份数据库。JSON 导入会替换整个片段工作库。历史实验仍保留当时实际证据和语料哈希。模型 API 与 embedding API 的供应商可以不同。

## 日志与评价

`data/config/config.json` 保存无密钥配置；`data/chunks/corpus.sqlite3` 保存工作文本与向量索引；`data/logs/experiments.jsonl` 保存随机种子、执行顺序、配置和语料哈希；`data/logs/runs.jsonl` 保存每次真实提示词、回答、原始 API 响应、证据元数据、实际模型标识、用量、阶段耗时和失败记录。这些路径均相对于项目根目录；运行数据与代码分开存放。

端到端耗时包含检索（含查询 embedding）、压缩和生成；离线建库耗时与用量另存索引 state，不混入单题响应时间。查询 embedding usage 单独记录，不与生成 token 混加。网络/服务失败会记录 error，不能当成有效回答。批次按记录的随机种子打乱顺序，以减少固定执行顺序影响；不使用缓存加速某个条件。

CSV 是汇总，JSON 保留详细数据。`accuracy` 初始为 null，不用引用编号是否有效冒充准确率。下一阶段要准备独立测试问题和专家参考答案，对回答准确性、完整性、引用支持、合理拒答和地域适用性进行盲评，再统计同模型三条件的 token 降幅、耗时与准确性变化。对照保留非 RAG / 标准 / 压缩三个条件，不提前宣称压缩改善结果。

## 接口与验证

服务绑定本机 127.0.0.1。API Key 由本地服务发送给配置的提供商，浏览器不会直接请求模型。支持 `/chat/completions` 与 `/embeddings` 的兼容 JSON 接口；Anthropic / Gemini 的原生协议尚未实现，需兼容网关或新增适配器。API 返回错误不保存服务商错误正文，防止其中包含敏感信息。

运行测试：

```powershell
python -m unittest discover -s tests -v
```

测试使用本机模拟 API 验证接口、usage 记录、向量索引、压缩预算和三条件隔离；不代表真实服务商已验证。正式实验前，用真实 Key 对所选模型做小批连通性与参数验证。

接口规范参考：[OpenAI Chat](https://developers.openai.com/api/reference/resources/chat)、[OpenAI Embeddings](https://developers.openai.com/api/reference/resources/embeddings/methods/create)、[DeepSeek Chat Completion](https://api-docs.deepseek.com/api/create-chat-completion/)、[火山方舟输出参数](https://docs.volcengine.com/docs/ark/context-management?lang=zh)。

## 本地 PDF 知识库

1. 将文献放入项目旁的 `D:\CodexWork\Working\158888\data\pdf`。
2. 在页面“知识库 → 本地 PDF 文献”点击“导入 / 更新 PDF 文献”。此操作不移动或修改原文件。
3. 原始逐页文本存于 `data/chunks/corpus.sqlite3` 的 pdf_pages，文献登记存于 pdf_documents，问答片段存于 chunks。片段记录文件 SHA-256、标题、页码、来源及审核状态；无法确认的机构、日期、地区保留未知，不猜测。
4. 资料卡能打开本地原始 PDF；答案的 PDF 引用带页码。指南预览版、明确无关主题等仍登记并保存文本，但不参加问答。
5. 导入后的报告写入 `data/reports/pdf_import_report.json`，导入前的数据库备份写入 `data/backups/`。自动提取后仍须核对多栏排版、表格、剂量、地区与年份。

每次更新语料会使既有向量索引失效，需要重新构建。

## 本地 Embedding

`data/config/config.json` 的 embedding 配置为 `adapter: local`、`model: BAAI/bge-small-en-v1.5`，查询加 BGE 指令前缀 `Represent this sentence for searching relevant passages: `，文档不加前缀；向量归一化后做精确余弦检索（numpy）。模型首次使用时从 Hugging Face 下载并缓存，之后可离线（设置 `HF_HUB_OFFLINE=1`）。在 CPU 上为 2044 个片段建索引约 56 秒，单次查询约 0.3 秒。索引保存在 SQLite state 表，记录语料哈希、配置指纹、维度和构建时间；语料或配置变化即失效。
