# AIToolbelt (AI 收藏夹) 🐹

**AIToolbelt** 是一款专为 AI 开发者、Prompt 工程师和仓鼠党设计的极简、高效且极具现代感视觉风格的 Chrome 浏览器扩展。

支持快速双击/右键划词收藏 Web 页面上的 Prompt（提示词）、Skill（技能文件）、MCP Server 链接/配置，以及各种 AI 工具和产品，并支持通过个人私有 Supabase 数据库进行安全的跨设备双向云同步。

---

## ✨ 核心特性

- 🐹 **极简交互 & 划词收藏**
  - 在网页中双击或通过右键菜单，一键将选中文本作为 `Prompt` 快速存入收藏夹。
  - 弹出窗口（Popup）支持自动抓取当前页面 URL，智能归类为 `Skill`、`MCP`、`Prompt` 或 `Tool`。
- 📊 **仓鼠的高颜控制台 (Dashboard)**
  - 精心设计的深色太空（Space）美学，包含毛玻璃质感、渐变微交互以及平滑的微动画。
  - 支持**全文快速检索**，支持根据**资源类型**（Skill, MCP, Prompt, Tool）以及**自定义标签**进行多维度过滤。
  - 内置便捷的 Prompt 快速复制按钮、快速链接跳转及卡片编辑/删除面板。
- 🔄 **本地优先与私有云同步 (Supabase)**
  - **本地优先**：数据默认保存在浏览器本地，即使离线也能正常存储和检索。
  - **私有云同步**：支持自主配置个人免费的 Supabase 数据库（Project URL & Anon Key），不依赖任何第三方集中式服务器。
  - **无密码登录**：使用邮箱验证码（OTP）进行跨设备双向同步安全验证。
  - **冲突解决**：采用基于时间戳（`updated_at`）的自动冲突合并策略，确保多端编辑数据不丢失。

---

## 🛠️ 安装方法

由于本项目完全开源且支持本地开发者模式运行，您可以直接加载代码：

1. 克隆本项目到本地：
   ```bash
   git clone https://github.com/Ha1o/AIToolbelt.git
   ```
2. 打开您的 Chromium 浏览器（如 Chrome、Edge、Brave 等），访问 `chrome://extensions/`（扩展程序管理页面）。
3. 开启右上角的 **“开发者模式” (Developer mode)**。
4. 点击左上角的 **“加载已解压的扩展程序” (Load unpacked)**。
5. 选择本项目目录下的 `dist` 文件夹即可完成安装。

*(注意：若 clone 后直接使用，必须确保已有 `dist` 目录。如果您是二次开发或该目录下没有 `dist`，请参照下方的“开发与构建”进行编译)*。

---

## 💻 开发与构建

项目采用 Vite 进行轻量化模块打包：

### 环境准备
- 安装 [Node.js](https://nodejs.org/) (建议 v18+ 或更高版本)

### 本地编译
1. 安装依赖包：
   ```bash
   npm install
   ```
2. 启动开发服务器（仅针对 Dashboard 调试，非插件状态）：
   ```bash
   npm run dev
   ```
3. **打包生产包**（将最新源码编译输出至 `dist/` 目录以加载到浏览器）：
   ```bash
   npm run build
   ```

---

## 📂 项目结构

```text
├── dist/                  # Vite 编译输出（加载插件时选择此文件夹）
├── public/                # 静态资源 (icons, manifest.json)
├── src/
│   ├── background/        # 后台 Service Worker（处理右键菜单和后台同步）
│   ├── content/           # 页面内容注入脚本（Toast 弹出框提示）
│   ├── dashboard/         # 仓鼠控制台主页面（HTML, CSS, JS）
│   ├── popup/             # 点击插件图标显示的悬浮面板
│   ├── styles/            # 全局样式与设计系统变量 (Design Tokens)
│   └── utils/             # 本地存储 (storage.js) 与 Supabase 同步 (supabase.js) 封装
├── build-scripts.js       # 针对 Service Worker & Content Script 的自定义打包脚本
├── package.json           # 项目配置与 NPM 依赖
└── vite.config.js         # Vite 配置文件
```

---

## 📄 开源协议

本项目基于 **[MIT License](LICENSE)** 完全开源。您可以自由修改、分发和商业化使用。
