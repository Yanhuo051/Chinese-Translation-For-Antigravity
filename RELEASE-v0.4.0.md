# v0.4.0 · 适配 Antigravity 2.35.1：跟进设置项句首大写改版与多语言听写、插件权限新特性

官方桌面端升级到 **Antigravity 2.35.1** 后，除了常规的二进制与归档指纹变化之外，前端界面还做了一次很容易让旧词表「大面积失效」的规范化调整：把设置页里几十处原本采用词首大写（Title Case）的开关与标题统一改成了句首大写（Sentence case），同时上线了多语言语音听写、插件权限管理子页、编排器服务端路由模式及左上角应用图标菜单。

`v0.4.0` 已针对 Windows 版 **2.35.1** 完成全量指纹核对、熔丝复查、锚点校验与新词条增补（新增 **111** 条译文，词库总量达到 **1,700** 条）。

---

## 本版适配与更新内容

### 1. 构建指纹与主进程安全性复核
- **新版校验指纹（Windows 2.35.1）**：
  - `Antigravity.exe`：`fdf8a0a6af474d54301740bdf0144d95a30be3105d96a2cb39bb8086278513ac`
  - `resources\app.asar`（原版 `shell`）：`9f0aad7274795d7fbde04931d96b348dcfc5f3d81d7373e6b70aeb09307442df`
  - `resources\bin\language_server.exe`：`73ce9a2405b455a93d1f13db2ae555da50406110217a349b6dd85c377fbdb9d1`
- **Electron 熔丝与锚点校验**：已核对 `2.35.1` 主程序的 Electron Fuses（`EmbeddedAsarIntegrity` 仍为关闭状态），且 `utils.js`、`menu.js`、`main.js`、`tray.js`、`updater.js`、`ipcHandlers.js` 共 22 处主进程补丁定位点全部原样命中，无任何兼容性偏移。

### 2. 跟进 2.35.1 设置页「句首大写」统一改版
`2.35.1` 将设置各分页的大量标题由 Title Case 调整为 Sentence case，例如：
- 模型与用量页的 `Your plan:`、`Enable AI credit overages`、`Available AI credits:`（同步将 `renderer.js` 动态模板升级为大小写兼容匹配）；
- 常规、外观、应用与浏览器页的 `Enable sounds for agent`、`Enable notifications for agent`、`Conversation steps`、`Custom context menus`、`Screen reader mode`、`Conversation width`、`Terminal placement`、`Markdown artifact width`、`Context and quota indicator`、`Open links in`、`Enable browser agent`、`Browser JavaScript execution policy`、`Prevent sleep`、`Keep in menu bar`、`Automatic check for updates`、`Device name`、`Browsing data`、`Download location`、`Browser actuation rules` 等；
- 账户、快捷键与开发者页的 `Not signed in`、`Enable telemetry`、`Marketing emails`、`Delete all Remote Agents data`、`Google One referral`、`VS Code keyboard shortcuts`、`Project required`、`License required`、`Manage hooks`、`Operating system`、`Host environment`、`User type` 等。
旧写法与新写法均保留在词表中，确保受实验开关控制的新旧界面分支都能稳定命中。

### 3. 覆盖 2.35.1 新增功能界面
- **左上角应用图标菜单（`app-logo-menu`）**：适配新增的左上角徽标下拉菜单作用域，覆盖 `Application Menu`、缩放控制、检查更新及 `Version 2.35.1` 动态版本号翻译。
- **编排器（Orchestrator）路由模式选择**：补齐「模型与用量」新增的 `Model selection`（默认服务端自动路由 vs 自定义固定编排/执行模型）说明，以及模型选择器中的 `Default (Gemini Pro)` 状态文案。
- **多语言语音听写（Dictation Languages）**：适配听写语言搜索与排序浮层（`dictation-languages-popover`），覆盖自动检测默认语言、多语言搜索添加提示、`#1 首选` 标签、拖动排序说明及无匹配语言的动态提示。
- **插件权限子页（Plugin Permissions）**：覆盖「工具权限 → 插件权限」入口说明、`已由你允许` 与 `随插件附带` 分组标题及空状态提示。
- **侧栏与对话交互新增项**：补齐侧栏 `Inbox`（收件箱）、`Show Automations`、`Show Plugins`、`Subtitle`、`Decorations`、自动置顶气泡说明，以及对话中的 `作为新对话继续`、`输入自定义回答`、本地/远程克隆等新按钮。

---

## 安装与升级提示

1. 若刚从 `2.34.0` 自动升级到 `2.35.1`，可直接双击新版文件夹中的 `Start.cmd`。
2. 从右下角 Windows 系统托盘右键**完全退出 Antigravity**，在 `Start.cmd` 窗口中按 **A** 安装 `v0.4.0`，看到 `[完成] 操作已生效` 后重新启动软件即可。
3. 升级完成后，`resources` 目录下会自动生成 `2.35.1` 专属的原版备份文件（`antigravity-zh-cn-2.35.1-9f0aad727479.bak` 与 `.json`）；此前旧版 `2.34.0` 留下的 `antigravity-zh-cn-2.34.0-*.bak` / `.json` 已不再使用，可按需删除以节省空间。
