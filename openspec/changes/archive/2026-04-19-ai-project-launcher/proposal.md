# AI 项目快速启动器 (AI Project Launcher)

## Summary

开发一个 Tauri 桌面悬浮球应用，实现 AI 项目的一键快速启动，减少从文件夹导航到打开 Claude Code 的中间步骤。

## Motivation

**当前痛点：**
- 项目分散在文件夹中，每次打开需要在文件管理器找到目录或用命令行导航
- 流程繁琐：找文件夹 → cmd → cd 项目 → claude

**期望流程：**
- 点击悬浮球 → 选择项目 → 自动执行命令打开 Claude Code

## Goals

- [x] 悬浮球常驻桌面，点击弹出项目菜单
- [x] 支持多项目同时打开（独立窗口）
- [x] 拖拽位置后自动记忆
- [x] 简单的浮动动画，保留扩展性

## Non-Goals

- 项目配置管理（后续迭代）
- 动态宠物动画（当前版本保持静态可扩展设计）

## Technical Design

### 框架选型

| 框架 | 体积 | 内存 | 学习成本 |
|------|------|------|----------|
| Electron | ~150MB | 高 | 低 |
| **Tauri** | **~10MB** | **低** | **中** |
| Flutter | ~20MB | 中 | 中 |

**选择 Tauri**：体积小、性能好、Rust 后端便于系统集成。

### 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Web)                        │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐     │
│  │ FloatingBall  │  │  ProjectMenu  │  │   Settings    │     │
│  │  Component    │  │   Component   │  │   Panel       │     │
│  └───────────────┘  └───────────────┘  └───────────────┘     │
│                          │                                    │
│                   Tauri invoke()                             │
├─────────────────────────┼───────────────────────────────────┤
│                         ▼           Rust Backend            │
│  ┌───────────────────────────────────────────────────────┐   │
│  │                   Tauri Commands                      │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │   │
│  │  │Project  │  │Launcher │  │ Window  │  │ Config │ │   │
│  │  │Manager  │  │Service  │  │Manager  │  │Storage │ │   │
│  │  └─────────┘  └─────────┘  └─────────┘  └────────┘ │   │
│  └───────────────────────────────────────────────────────┘   │
│                           │                                  │
│                     ┌─────┴─────┐                            │
│                     │  Local    │                            │
│                     │  Storage  │  (JSON)                     │
│                     └───────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### 项目结构

```
src-tauri/
├── src/
│   ├── main.rs          # 入口
│   ├── commands/
│   │   ├── mod.rs
│   │   ├── project.rs    # 项目管理命令
│   │   ├── launcher.rs   # 启动器命令
│   │   └── window.rs     # 窗口管理命令
│   └── models/
│       └── project.rs    # 项目数据结构

src/
├── components/
│   ├── FloatingBall.tsx  # 悬浮球
│   ├── ProjectMenu.tsx   # 弹出菜单
│   └── Settings.tsx      # 设置面板
├── stores/
│   └── useAppStore.ts    # 状态管理
├── App.tsx
└── main.tsx
```

### 核心模块

| 模块 | 职责 | 关键技术 |
|------|------|----------|
| **FloatingBall** | 悬浮球渲染 + 浮动动画 | CSS animation，可扩展 |
| **ProjectMenu** | 项目列表 + 快速打开 | Tauri invoke |
| **ProjectManager** | CRUD 项目配置 | Rust: serde_json |
| **LauncherService** | 执行 cmd 命令 | Rust: Command |
| **WindowManager** | 置顶、拖拽、位置保存 | Tauri window API |
| **ConfigStorage** | 持久化到本地 JSON | Rust: std::fs |

### 数据模型

```rust
struct Project {
    id: String,
    name: String,
    path: String,           // 项目目录路径
    created_at: i64,
    last_used: Option<i64>,
}

struct AppConfig {
    window_x: i32,
    window_y: i32,
    projects: Vec<Project>,
}
```

### 启动流程

```
用户点击悬浮球
      │
      ▼
┌─────────────┐    invoke      ┌─────────────┐
│ ProjectMenu │ ───────────▶  │ list_projects│
│             │  ◀───────────  │             │
└─────────────┘    返回列表     └─────────────┘
      │
      │ 用户选择项目
      ▼
┌─────────────┐    invoke      ┌─────────────┐
│ launch_     │ ───────────▶  │ open_project │
│ project     │               │             │
└─────────────┘               └─────────────┘
                                    │
                                    ▼
                             ┌─────────────┐
                             │ cmd /c start │
                             │ cmd /k cd X  │
                             │ && claude    │
                             └─────────────┘
```

### 窗口位置记忆

- 悬浮球位置保存到 `~/.ai-project-launcher/config.json`
- 关闭时保存当前位置
- 启动时恢复上次位置

## Open Questions

- [ ] 项目配置管理方案（模板继承等）
- [ ] 动态宠物动画扩展设计

## Tasks

See [tasks.md](tasks.md)