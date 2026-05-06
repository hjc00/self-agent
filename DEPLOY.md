# AI Floating Launcher 部署文档

## 环境要求

| 工具 | 版本 | 备注 |
|------|------|------|
| Node.js | >= 18 | npm 自带 |
| Rust | >= 1.70 | 编译 Tauri 后端 |
| Windows 10+ | - | WebView2 已内置 |

### 安装 Rust（如未安装）

```bash
# 下载并运行 rustup（Windows）
# https://rustup.rs/
rustup default stable
```

安装时选择 "Desktop development with C++" 的 VS Build Tools（如果 rustc 提示缺少 MSVC）。

## 快速开始

```bash
# 1. 进入项目目录
cd ai-floating-launcher

# 2. 安装依赖
npm install

# 3. 开发模式运行
npm run dev

# 4. 生产构建
npm run build
# 产物在: src-tauri/target/release/ai-floating-launcher.exe
```

## 配置项目列表

首次运行后，编辑配置文件（路径由 Tauri 根据 app identifier 自动生成）：

**配置文件位置：**
```
%APPDATA%\com.ai-floating-launcher.app\projects.json
```

**格式：**
```json
{
  "projects": [
    "d:\\workspace\\project-a",
    "d:\\workspace\\project-b",
    "e:\\code\\my-app"
  ]
}
```

**应用配置文件**（自动生成，通常不需要手动编辑）：
```
%APPDATA%\com.ai-floating-launcher.app\config.json
```

```json
{
  "ballX": 100,
  "ballY": 100,
  "autoStart": false
}
```

| 字段 | 说明 |
|------|------|
| `ballX` / `ballY` | 悬浮球位置（拖拽后自动保存） |
| `autoStart` | 是否开机自启 |

## 生产构建

```bash
npm run build
```

**产物：**
```
src-tauri/target/release/ai-floating-launcher.exe  (~13MB)
src-tauri/target/release/bundle/msi/               (.msi 安装包)
```

打包前确保修改 `src-tauri/tauri.conf.json` 中的 `version` 字段。

## 开机自启

在设置窗口中勾选"开机自启"。实现方式是通过注册表：

```
HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run
  AI-Floating-Launcher = "<path-to>\ai-floating-launcher.exe"
```

## 项目结构

```
ai-floating-launcher/
├── package.json              # npm 配置
├── src/                      # 前端 UI
│   ├── ball.html             # 悬浮球页面
│   ├── menu.html             # 菜单页面
│   └── settings.html         # 设置页面
├── src-tauri/                # Rust 后端
│   ├── Cargo.toml            # Rust 依赖
│   ├── tauri.conf.json       # Tauri 应用配置
│   ├── icons/                # 应用图标
│   ├── capabilities/         # 权限配置
│   └── src/
│       ├── main.rs           # 入口
│       └── app.rs            # 核心逻辑
└── node_modules/             # npm 依赖 (~3MB)
```

## 常见问题

### 菜单弹出后背景有白边

Windows WebView2 不完全支持透明窗口。如遇到白边，可在 `tauri.conf.json` 的 ball 窗口配置中尝试关闭 `transparent`。

### 点击项目后 claude 未启动

确保：
1. `claude` 命令在系统 PATH 中
2. 项目路径使用双反斜杠 `\\` 分隔
3. 项目路径存在且可访问

### 首次编译慢

Tauri 首次 `cargo build` 需下载编译 ~200 个 Rust crates（5-15 分钟），后续增量编译只需几秒。

### 编译时提示缺少 MSVC

运行 `rustup default stable-x86_64-pc-windows-msvc` 确保使用 MSVC 工具链，或通过 Visual Studio Installer 安装 "Desktop development with C++" 工作负载。
