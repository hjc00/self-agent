# AI Floating Launcher - 提案

## 概述

开发一个 Windows 桌面悬浮球应用，提供快速访问配置好的 Claude Code 项目入口。

## 背景

日常开发中需要频繁在多个 Claude Code 项目间切换，每次都需要手动打开终端、cd 到项目目录、再启动 claude。流程繁琐。期望有一个悬浮球，点击即可展开项目列表，选择后直接启动。

## 目标

- 悬浮球始终显示在最上层
- 左键点击展开菜单，显示已配置项目列表
- 点击项目名称，在该项目目录启动 cmd 终端并执行 claude
- 支持拖拽移动悬浮球
- 拖拽后位置记忆
- 开机自启
- 单例运行

## 非目标

- 不支持 Linux/macOS（Windows only）
- 不做项目配置管理（只读已有配置）

## 功能列表

### 核心功能

| 功能 | 描述 |
|------|------|
| 悬浮球置顶 | 窗口始终在最上层，不影响其他应用操作 |
| 左键点击展开菜单 | 菜单在球旁边展开 |
| 项目列表 | 从配置文件读取项目路径列表 |
| 启动项目 | 在项目目录启动 cmd，执行 claude |
| 拖拽移动 | 可拖动悬浮球到任意位置 |
| 位置记忆 | 悬浮球位置持久化到配置 |
| 开机自启 | 支持设置开机自动启动 |
| 单例 | 防止重复启动 |
| 系统托盘 | 右键菜单退出，双击打开设置 |
| 设置页面 | 自启开关 |

## 配置

### 文件位置

```
%APPDATA%/ai-floating-launcher/
├── config.json       # 应用配置（位置、自启等）
└── projects.json     # 项目路径列表
```

### projects.json 格式

```json
{
  "projects": [
    "d:\\workspace\\project-a",
    "d:\\workspace\\project-b"
  ]
}
```

### config.json 格式

```json
{
  "ballX": 100,
  "ballY": 100,
  "autoStart": false
}
```

## UI 设计

### 悬浮球

- 默认 64x64 像素
- 自定义图片（如有），否则显示默认图标
- 拖拽时显示高亮/阴影效果

### 菜单

- 位置：悬浮球右侧或下方（根据屏幕边缘自适应）
- 内容：项目列表 + 分隔线 + 设置选项
- 交互：点击外部关闭菜单

```
┌──────────────────────────────┐
│  📁 project-a               │
│  📁 project-b               │
│  ─────────────────────────   │
│  ⚙ 设置                     │
└──────────────────────────────┘
```

### 系统托盘

- 右键菜单：退出
- 双击：打开设置窗口

### 设置窗口

- 窗口大小：400x200
- 复选框：开机自启
- 关闭按钮

## 技术架构

```
┌─────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                │
├─────────────────────────────────────────────────────────┤
│                                                           │
│   main.js                                                 │
│   ├── main()              ← 入口，单例检查                │
│   ├── createBallWindow()  ← 透明置顶球窗                  │
│   │   └── setIgnoreMouseEvents(true)                      │
│   ├── createMenuWindow()  ← 菜单弹出窗                    │
│   │   └── 定位在球旁边                                   │
│   ├── createSettingsWindow() ← 设置窗口                   │
│   ├── createTray()       ← 系统托盘                       │
│   │   └── 右键退出，双击设置                             │
│   ├── loadConfig()       ← 读取配置                      │
│   └── saveConfig()       ← 保存配置                      │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 窗口类型

| 窗口 | 类型 | 特性 |
|------|------|------|
| ballWindow | BrowserWindow | 透明、无边框、置顶、穿透 |
| menuWindow | BrowserWindow | 无边框、置顶、显示在球旁 |
| settingsWindow | BrowserWindow | 标准窗口 |

### IPC 通信

| 通道 | 方向 | 用途 |
|------|------|------|
| show-menu | main→renderer | 显示菜单 |
| hide-menu | main→renderer | 隐藏菜单 |
| get-projects | renderer→main | 获取项目列表 |
| launch-project | renderer→main | 启动项目 |
| get-config | renderer→main | 获取配置 |
| set-auto-start | renderer→main | 设置自启 |

### 拖拽实现

CSS：
```css
.ball {
  -webkit-app-region: drag;
}
```

但点击事件需要单独处理，防止拖拽触发点击：

```javascript
let isDragging = false;
let startX, startY;

ball.addEventListener('mousedown', (e) => {
  isDragging = false;
  startX = e.screenX;
  startY = e.screenY;
});

ball.addEventListener('mousemove', (e) => {
  if (Math.abs(e.screenX - startX) > 5 || Math.abs(e.screenY - startY) > 5) {
    isDragging = true;
  }
});

ball.addEventListener('mouseup', () => {
  if (!isDragging) {
    // 触发点击事件
  }
});
```

### 启动项目

```javascript
const { spawn } = require('child_process');
const path = require('path');

function launchProject(projectPath) {
  spawn('cmd', ['/K', `cd /d "${projectPath}" && claude`], {
    detached: true,
    stdio: 'ignore',
    shell: true
  });
}
```

## 交互流程

```
用户点击悬浮球
       │
       ▼
┌─────────────────┐
│ ballWindow 收到点击│
│ setIgnoreMouseEvents(false) │
│ 显示 menuWindow │
└─────────────────┘
       │
       ▼
┌─────────────────┐
│ 用户点击项目名称 │
│ menuWindow 隐藏 │
│ spawn cmd 执行   │
│ claude          │
└─────────────────┘
```

## 测试计划

| 测试项 | 验证方式 |
|--------|---------|
| 悬浮球置顶 | 打开其他应用，悬浮球不被遮挡 |
| 菜单展开 | 点击球，菜单正确显示在球旁 |
| 外部关闭 | 点击球外区域，菜单关闭 |
| 拖拽移动 | 拖动球到新位置，刷新后位置保持 |
| 启动项目 | 点击项目，cmd 窗口打开并进入 claude |
| 开机自启 | 开启后重启电脑，球自动启动 |
| 单例 | 启动两个实例，第二个退出 |
| 托盘退出 | 右键托盘，退出应用 |

## 里程碑

1. **基础框架**：Electron 项目初始化，球窗显示
2. **拖拽+位置记忆**：球可拖动，位置持久化
3. **菜单系统**：菜单展开/关闭，项目列表
4. **启动功能**：点击项目启动终端
5. **系统托盘**：托盘图标、右键菜单
6. **设置页面**：自启开关
7. **打包发布**：生成可执行文件
