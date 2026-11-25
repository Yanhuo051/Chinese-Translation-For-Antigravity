# Antigravity 简体中文汉化补丁

![Platform](https://img.shields.io/badge/Platform-Windows-0078D6?style=flat-square)
![Antigravity](https://img.shields.io/badge/Antigravity-2.35.1-6B5CE7?style=flat-square)
![Patch](https://img.shields.io/badge/Patch-v0.4.0-2EA043?style=flat-square)
![Node.js](https://img.shields.io/badge/Node.js-22%2B-43853D?style=flat-square)

面向 **Windows 平台 Antigravity 独立桌面版** 的轻量级纯本地简体中文补丁。当前版本为 **v0.4.0**（适配官方 **2.35.1** 已核对构建，累计收录 **1,700** 条界面译文与 30+ 组动态句式模板）。

补丁以可随时撤销的方式安装至本地 `resources\app.asar`，运行在独立的渲染隔离世界中——**零联网请求、零 API 密钥、零遥测收集**，不影响官方自动更新，也绝不触碰你的代码、终端与对话内容。

---

## ✨ 汉化覆盖与保留边界

| 覆盖区域 | 具体说明 |
| :--- | :--- |
| **主界面与导航** | 左上角应用菜单、顶部标题栏、侧边栏对话分组/筛选/排序、系统托盘与原生右键菜单 |
| **设置与深层子面板** | 常规、权限与沙盒、GitHub 细粒度策略、快捷键与冲突提示、模型与用量、编排器、多语言语音听写、内置浏览器与 Cookie 管理、MCP 服务器、词元用量明细、智能体钩子（Hooks）、账户与开发者工具 |
| **对话与周边模块** | 模型选择器、思考强度（Thinking effort）、实时配额倒计时、附件与连接器菜单、工作树（Worktree）切换、排队消息、插件市场与定时自动化 |
| **严格原样保留** | 对话正文、代码编辑器、终端输出、项目名与文件名、模型名称（如 `Gemini 3.1 Pro`）、插件名、快捷键按键组合（如 `Ctrl+Shift+L`）以及外部网页 |

---

## 🚀 快速安装、升级与恢复

> **环境要求**：Windows 10/11，且已安装 **Node.js 22 或更新版本**（可在终端输入 `node --version` 确认）。

1. **完整解压**：从右侧 **Releases** 下载对应版本的 `.zip` 压缩包（或克隆本仓库），**完整解压到普通文件夹**（切勿直接在压缩包预览窗口中双击运行）。
2. **退出应用**：从右下角 **Windows 系统托盘** 右键点击 Antigravity 图标，选择 **退出**。
3. **一键安装**：双击运行文件夹内的 `Start.cmd`（英文输入法下按键）：
   - 按 **`C`** — 检查当前客户端版本与 SHA-256 指纹是否兼容；
   - 按 **`A`** — 一键安装或升级补丁（若进程正在后台收尾退出，脚本会自动等待最多 15 秒）；
   - 按 **`R`** — 随时无损恢复为官方英文原版。
4. 看到 `[完成]` / `可以重新启动 Antigravity` 提示后，正常打开软件即可。

### 自定义安装路径

如果 Antigravity 安装在非默认盘符，可在 PowerShell 中手动传入包含 `Antigravity.exe` 的目录：

```powershell
node .\patch.cjs check "D:\Apps\Antigravity"
node .\patch.cjs apply "D:\Apps\Antigravity"
node .\patch.cjs restore "D:\Apps\Antigravity"
```

---

## 📂 文件说明

| 文件 | 作用 |
| :--- | :--- |
| `Start.cmd` | Windows 交互式一键检查 / 安装 / 恢复入口脚本 |
| `patch.cjs` | 核心安装器：执行 SHA-256 指纹校验、原版归档备份（`.bak`）、主进程钩子注入与原子替换 |
| `renderer.js` | 隔离世界界面翻译脚本：负责分区作用域识别、跨层浮层/子弹窗监听与动态数值模板匹配 |
| `translations.txt` | 纯文本中英对照词表（按 `英文原文\|中文译文` 分区维护，可直接用文本编辑器增补） |
| `audit.cjs` | 离线词条审查工具：用于新版本提取文件指纹、统计词表命中率并扫描新增英文文案 |
| `可能出现的问题.md` | 常见报错原因与标准解决方法汇总 |

---

## 📖 文档与历史版本记录

- 🛠️ **故障排查指南**：[可能出现的问题与常规解决方法](可能出现的问题.md)
- 📝 **版本更新日志**：
  - [v0.4.0 · 适配 Antigravity 2.35.1 与新特性](RELEASE-v0.4.0.md)（对应客户端 `2.35.1`）
  - [v0.3.0 · 深层折叠面板、快捷键覆写与跨层浮层修复](RELEASE-v0.3.0.md)（对应客户端 `2.34.0`）
  - [v0.2.0 · 设置页首轮补全与平滑升级](RELEASE-v0.2.0.md)（对应客户端 `2.34.0`）
  - [v0.1.0 · 初版简体中文汉化](RELEASE-v0.1.0.md)（对应客户端 `2.34.0`）

---

## 🔧 官方更新后如何维护适配

当 Antigravity 自动更新版本后，界面会安全回到英文原版，旧补丁会因指纹锁保护自动停用（**请勿手动将旧版 `.bak` 覆盖回新版程序**）。适配新版时，可在干净原版状态下运行离线审查脚本提取新指纹与新增候选词条：

```powershell
node .\audit.cjs "D:\Apps\Antigravity"
```

---

## ⚠️ 免责声明

本汉化补丁为个人学习与交流制作的**非官方本地界面展示层补丁**，与 Google 及 Antigravity 官方团队无关。补丁完全在本地离线运行，不包含任何网络请求或隐私收集行为；修改客户端本地归档前请妥善保留 `resources` 目录自动生成的 `.bak` 与 `.json` 备份文件。遇到报错或异常时，请先查阅 [可能出现的问题](可能出现的问题.md) 或先向无敌的 Gemini 询问清楚原因后再操作。

<br />

<div align="center">
  <img src="assets/mascot.jpg" width="300" alt="Mascot" />
</div>
