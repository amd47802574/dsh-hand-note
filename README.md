# dsh-hand-note · 随手笔记

[![version](https://img.shields.io/badge/version-0.2.1-6d5ef2)](https://github.com/amd47802574/dsh-hand-note/releases)
[![dsh](https://img.shields.io/badge/DeepSeek%20Harness-0.2.0--rc.2-20c997)](https://github.com/anywhere-labs/deepseek-harness-desktop)
[![license](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![market](https://img.shields.io/badge/dsh%20%E6%8F%92%E4%BB%B6%E5%B8%82%E5%9C%BA-%E9%9A%8F%E6%89%8B%E7%AC%94%E8%AE%B0-orange)](https://awesome-dsh-plugin.com)

**给 DeepSeek Harness（dsh）用的本地随手笔记插件。** 每篇笔记就是一个 Markdown 文件，数据完全在你本机，不依赖任何云服务——想到什么记什么，聊完什么存什么。

> 🌱 本项目由 [fangqiing/dsh-knowledge-lite](https://github.com/fangqiing/dsh-knowledge-lite)（v0.1.6，MIT）深度改造而来：全新卡片式界面、自定义标签管理、平铺速览列表，并保留其全部核心能力（全文搜索、Markdown 预览、自动保存、附件抽取、对话回写）。感谢原作者的开源工作。

---

## ✨ 它解决什么问题

- **聊天里的知识点留不住？** 每轮对话结束后一键「存入随手笔记」，AI 自动抽取可复用的命令、配置、结论与坑，勾选后写入
- **笔记散落各处找不回？** 全文搜索 + 标签筛选，毫秒级命中
- **不想把笔记交给第三方云？** 每篇一个 `.md`，放在你指定的本地文件夹，用 VS Code / Obsidian / 记事本都能直接改，插件自动识别
- **文档里的内容没法问 AI？** 拖入 Office 文件自动零依赖抽取正文，笔记立即可搜索、可被 AI 引用

## 🎨 界面一览

- **卡片式双栏布局**：左侧速览列表 + 右侧编辑器，胶囊搜索框、标签 chip 条、分段式「编辑 / 预览」切换
- **平铺速览列表**：无目录层级干扰，所有笔记按更新时间排列，相对时间（「3 小时前」）一目了然，悬停查看完整时间戳
- **舒适阅读排版**：标题、列表符号、引用块色条、圆角代码块、斑马纹表格全部重新调校，明暗主题自适应
- **沉浸编辑**：无边框大标题、无干扰正文区、停笔约 1 秒自动落盘，`Ctrl+S` 随时手动保存

## 📌 功能

### 笔记管理

- **本地纯文本存储**：每篇一个 `.md`（YAML front matter 存元数据），外部编辑器改动即时可见
- **全文搜索 + 标签筛选**：标题 / 正文 / 标签联合检索，标签 chip 单击筛选、再击取消
- **批量删除**：点右上「批量删除」进入多选模式，卡片勾选、支持全选，二次确认后一键删除
- **自动保存**：停止输入约 1 秒自动落盘；切换笔记、返回聊天、关闭窗口前自动冲刷；保存失败静默重试，`Ctrl+S` 保留为手动立即保存
- **Markdown 渲染预览**：标题、粗体/斜体/删除线、行内代码、围栏代码块、链接与裸链、多级嵌套列表、任务列表 `- [ ]`、引用块、表格（含对齐）、分隔线；直接产出 React 元素、不解析 HTML，无注入风险

### 标签系统（0.2.0 新增）

- **提前自定义标签**：标签条末尾「＋ 标签」输入即建，支持逗号批量（`面试题, 算法, 待整理`）；没人使用的标签也会常驻标签栏，方便先把体系搭好
- **一处删除、全局生效**：悬停标签 chip 点 **×**，确认后从标签栏与所有携带它的笔记中一并移除
- **持久化登记表**：自定义标签存于库根目录 `tags.json`，与笔记数据同进退；迁移库位置时自动带走

### 附件与导入

- **拖入即导入**：文本类（`.txt` `.md` `.py` `.json` `.csv`…）直接进正文；`.docx` `.xlsx` `.pptx` 原件存入 `files/` 并**零依赖抽取文本**（自解 ZIP + XML，无第三方库）写进正文，可搜索、可被 AI 引用；其他（PDF / 图片 / 压缩包）原样保存，双击交系统程序打开
- **右键附件**：用系统默认程序打开，或在资源管理器中定位
- **删除笔记连带清理附件**，不留垃圾文件

### 与对话打通

- **对话回写（writeback）**：带附件/文档的对话轮次末尾出现「存入随手笔记」按钮，AI 抽取候选知识点 → 勾选确认 → 写入；纯文字回答不触发，绝不打扰
- **侧栏入口**：左侧栏「随手笔记」一键进入全屏笔记面板，「‹ 聊天」随时返回

## 📦 安装

### 方式一：dsh 插件市场（推荐）

收录后打开 dsh 的 **设置 → 插件（插件市场）**，搜索 `dsh-hand-note` 或「随手笔记」一键安装。

### 方式二：dsh CLI

```bash
dsh plugin --profile <你的profile> add dsh-hand-note
```

### 方式三：从 GitHub 直接装

```bash
dsh plugin --profile <你的profile> add github:amd47802574/dsh-hand-note
```

### 方式四：手动 / 开发模式（Windows）

```bash
git clone https://github.com/amd47802574/dsh-hand-note.git
cd dsh-hand-note
# 把本目录链接（或复制）进 dsh profile 的 node_modules，并在 profile
# package.json 的 dependencies 与 dsh.profile.bundles 中登记 dsh-hand-note
# 安装/卸载前需彻底退出 dsh，否则文件被占用（EPERM）
```

> 从旧版 `dsh-knowledge-lite` 迁移：笔记库默认根目录同为 `E:/dsh-kb`，装好即接管原有数据，无需搬迁。

## 🚀 快速上手

1. 打开左侧栏「随手笔记」，点右上 **＋ 新建笔记**
2. 填标题、写正文（Markdown），停笔即自动保存
3. 想分类？在标签栏点 **＋ 标签** 先建体系，再把标签填进笔记的标签栏（逗号分隔）
4. 带文档聊完后，点对话轮次末尾的 **存入随手笔记** 沉淀知识点
5. 想换库位置？点底部状态栏的「库位置 · 点击更改」，旧笔记自动迁移

## ⌨️ 快捷键

| 快捷键 | 作用 |
|---|---|
| `Ctrl+S` | 手动立即保存 |
| `Esc` | 关闭右键菜单 |
| 右键笔记 | 打开 / 复制 / 剪切 / 重命名 / 删除 |
| 右键标签 chip 的 × | 删除该标签（全局） |

## ⚙️ 配置

| 项 | 默认值 | 说明 |
|---|---|---|
| 笔记根目录 | `E:/dsh-kb` | 所有笔记与附件的存储位置，可在底部状态栏随时更改（自动迁移） |
| 配置文件 | `E:/dsh-tools/dsh-hand-note.json` | 记住根目录设置，独立于插件目录，profile 重置不丢失 |
| 自定义标签 | `<根目录>/tags.json` | 提前注册的标签登记表，可手工编辑 |

目录结构：

```
E:/dsh-kb/
├── notes/          # 每篇笔记一个 .md（文件名即笔记 id）
│   └── 子目录/     # 磁盘文件夹即分类（可选）
├── files/          # 附件原文件（<id>--<原名>）
└── tags.json       # 自定义标签登记表
```

## 🏗️ 架构

| 文件 | 职责 |
|---|---|
| `lib/store.js` | 笔记存储：扫描（mtime 缓存）、增删改查、标签登记表、批量删标签 |
| `lib/index.js` | 宿主（Node）侧入口：webServer 路由 + 令牌鉴权 + RPC 分发表 |
| `lib/client.js` | 浏览器半侧 UI：面板、列表、编辑器、Markdown 渲染、自动保存 |
| `lib/attachments.js` | Office 文档零依赖文本抽取（ZIP + XML 手解，无第三方库） |
| `lib/writeback.js` | 对话回写：定位会话轮次、调用 LLM 抽取候选 |
| `lib/writeback-prompts.js` | 抽取提示词 |
| `lib/config.js` | 根目录配置读写与库迁移 |

安全设计：浏览器→宿主的 RPC 走 per-start 随机令牌（注入鉴权页）+ 同源/环回回退校验，常量时间比较；Markdown 渲染零 `innerHTML`，笔记内容无法向 shell 注入标记。

## ❓ FAQ

**Q：和原版 dsh-knowledge-lite 什么关系？**
A：由它 fork 并深度改造：界面全部重做、新增自定义标签管理（提前建标签 / 全局删标签）、列表改平铺速览；数据格式与默认库位置完全兼容。

**Q：同时装两个插件会冲突吗？**
A：会看到两个入口、两份相同的库（默认同根目录）。建议二选一。

**Q：为什么 Windows 专属默认路径？**
A：默认根目录写死 `E:/dsh-kb`，首次启动后在底部状态栏改掉即可；改 `lib/config.js` 的 `DEFAULT_ROOT` 可换默认值。

**Q：外部编辑器改了 .md 会丢吗？**
A：存储层按 mtime 缓存，外部改动会被识别并展示；插件写入采用临时文件 + 原子重命名，不会写出半截文件。

**Q：删除标签会动我的笔记吗？**
A：只从笔记的 front matter 里移除该标签字段，正文与其他标签原样保留，删除前有确认菜单并显示影响篇数。

## 🧭 兼容性

- **宿主**：DeepSeek Harness `0.2.0-rc.2`（`peerDependencies` 声明）
- **平台**：Windows 优先验证；其他平台需调整默认根目录
- **Node**：`^22.19.0 || >=24.0.0`

## 📝 更新日志

### 0.2.1

- 新增批量删除笔记：多选勾选、全选、二次确认
- 保存按钮移至编辑器右上角（与「编辑 / 预览」同行），取消底部操作栏，编辑区更高；自动保存状态同步显示在顶部
- 移除「引用到对话」功能（按钮、Ctrl+Alt+K 快搜面板与输入框入口），更专注记录

### 0.2.0

- 全新卡片式界面：双栏布局、胶囊搜索、标签 chip 条、分段式编辑/预览切换、底部状态栏
- 自定义标签管理：提前建标签（支持批量）、一处删除全局生效、`tags.json` 持久化
- 列表改平铺速览，新增相对时间显示
- Markdown 预览排版全面翻新；引用快搜面板增加快捷键提示条
- 继承 0.1.x：全文搜索、自动保存、附件导入与 Office 抽取、对话回写、库迁移

### 0.1.6（上游）

- 见 [fangqiing/dsh-knowledge-lite](https://github.com/fangqiing/dsh-knowledge-lite)

## 🙏 致谢

- [fangqiing/dsh-knowledge-lite](https://github.com/fangqiing/dsh-knowledge-lite) —— 本项目的前身
- [@lemoncat7/dsh-knowledge](https://github.com/lemoncat7/dsh-knowledge) —— 回写实现的参考
- [dsh-market](https://github.com/dsh-market/dsh-market) / [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) —— 插件生态

## License

[MIT](./LICENSE)
