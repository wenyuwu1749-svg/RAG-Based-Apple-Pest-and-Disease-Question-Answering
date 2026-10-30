# 模型 API 申请、配置与运行指南

本项目比较 3 个被测模型，另用 1 个模型做评分评委。配置已预置在 `data/config/config.json`，只需申请 Key 并告诉程序。

| 角色 | 配置名 | 模型 ID | 接口 |
|---|---|---|---|
| 被测模型 | `claude` | `claude-haiku-5-5` | Anthropic 官方 Python 库 |
| 被测模型 | `gemini` | `gemini-3.6-flash` | OpenAI 兼容接口 |
| 被测模型 | `deepseek` | `deepseek-flash` | OpenAI 兼容接口 |
| 评委 | `gpt_judge` | `gpt-5.4-mini-2026-03-17` | OpenAI 兼容接口 |

三个被测模型都关闭"思考"（`reasoning_effort = none`），保证 token 与耗时可比；评委开轻度推理（`low`），使逐要点判断与最终打分一致。评委与三个被测模型来自不同公司。

> 安全规则：API Key 相当于密码。不要发到聊天、群里，不要写进任何文件、截图或论文。程序只在内存或系统环境变量中使用 Key，不会写入日志或配置。

## 一、申请 Key

| 平台 | 网址 | 费用 | 步骤 |
|---|---|---|---|
| Anthropic（Claude） | console.anthropic.com | 预充值，最低约 5 美元；**不要开 auto-reload** | 登录 → Billing 充值 → API Keys → Create Key → 只复制以 `sk-ant-` 开头的那串 |
| Google Gemini | aistudio.google.com | 免费层每天约 20 次，不够用；需绑定结算，预付 NZ$10，**关闭自动充值** | Get API key → Set up billing |
| DeepSeek | platform.deepseek.com | 预充值约 10 元人民币 | 充值 → API Keys → 创建 |
| OpenAI（评委） | platform.openai.com | 预充值 10 美元；建议在 Limits 设月度上限 | Billing 充值 → API keys → Create new secret key |

整个实验（开发集 + 测试集）总花费约 2–3 美元。价格以各平台控制台为准。

## 二、配置 Key

打开 PowerShell，逐行执行（引号内只放 Key 本身）：

```powershell
setx ANTHROPIC_API_KEY "sk-ant-你的Claude密钥"
setx GEMINI_API_KEY "你的Gemini密钥"
setx DEEPSEEK_API_KEY "sk-你的DeepSeek密钥"
setx OPENAI_API_KEY "sk-你的OpenAI密钥"
```

执行后**关闭并重新打开** PowerShell 才会生效。之后运行 `cls` 清屏，避免截图带出 Key。Claude 还需要安装官方库（Windows 若拦截 pip.exe，用这种写法）：

```powershell
python -m pip install anthropic
```

## 三、检查连通性

在项目根目录 `D:\CodexWork\Working\158888` 运行：

```powershell
python 代码/tools/check_models.py
```

四个配置都应显示 `OK`；被测模型应显示 `no hidden reasoning tokens`，评委显示 "reasoning tokens (expected …)"。加 `--list gemini` 可列出该 Key 能用的模型 ID。

## 四、批量实验与评分

```powershell
python 代码/tools/run_experiment.py plan --name test_final --bank data/eval/test_questions.xlsx --models claude gemini deepseek
python 代码/tools/run_experiment.py run --name test_final
python 代码/tools/run_experiment.py summary --name test_final
python 代码/tools/judge_answers.py run --name test_final --bank data/eval/test_questions.xlsx
python 代码/tools/judge_answers.py summary --name test_final
```

- `plan` 记录题库、语料、代码的哈希和全部设置；之后若代码、题库或语料变化，`run` 会拒绝运行（开发阶段才可加 `--allow-changes`）。
- `run` 和评分都可以 Ctrl+C 中断，再运行同一命令即续跑；失败的任务用 `--retry-errors` 补跑。
- 结果在 `data/logs/`：`<name>_summary.csv`（准确度以外的速度、token）、`<name>_answers.csv`（全部回答）、`<name>_scores.csv`（评委分数，`human_*` 列供人工抽查填写）。

## 五、启动问答网页

- 双击 `代码\apple_rag_lab\Start_Apple_QA.cmd`，或运行 `python 代码/apple_rag_lab/launcher.py`。
- 启动先加载 embedding 模型（约 15 秒），然后打开 http://127.0.0.1:8766 。命令窗口保持打开，Ctrl+C 停止。
- 网页用于演示和单题测试；正式实验只用上面的批量脚本。

## 六、常见问题

| 现象 | 原因与处理 |
|---|---|
| `API HTTP 401` | Key 错误或未生效：检查是否只复制了 Key 本身；setx 后是否重开了窗口 |
| `API HTTP 402` / 余额不足 | 对应平台未充值或余额用完 |
| `API HTTP 404` | 模型名写错或已下线：用 `check_models.py --list <配置名>` 查看 |
| `API HTTP 429 [quota=…PerDay…]` | 每日额度用完（免费层常见），次日再跑或开通付费 |
| `API HTTP 429 [retry-after=…]` | 短期限流；评分脚本会按提示时间自动等待后继续 |
| `pip.exe` 被 Windows 拦截 | 改用 `python -m pip install …`，不要关闭系统安全功能 |
| 启动时提示端口被占用 | 程序已在运行，直接用浏览器打开；或 `python launcher.py --port 8767` |
