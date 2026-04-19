# Tasks

## Phase 1: 项目初始化

- [x] 1.1 初始化 Tauri 项目
- [x] 1.2 配置 Tauri 悬浮窗口（无边框、置顶、透明背景）
- [x] 1.3 验证窗口可拖拽

## Phase 2: 前端基础组件

- [x] 2.1 实现 FloatingBall 悬浮球组件（基础样式）
- [x] 2.2 添加浮动动画 CSS
- [x] 2.3 实现点击展开/收起菜单
- [x] 2.4 组件结构可扩展（支持后续宠物动画）

## Phase 3: 后端核心功能

- [x] 3.1 实现 ProjectManager（项目增删改查）
- [x] 3.2 实现 ConfigStorage（JSON 持久化到 ~/.ai-project-launcher/config.json）
- [x] 3.3 实现 LauncherService（执行 cmd 命令）
- [x] 3.4 实现 WindowManager（位置保存/恢复）

## Phase 4: 前后端集成

- [x] 4.1 ProjectMenu 调用 list_projects
- [x] 4.2 点击项目调用 launch_project
- [x] 4.3 添加项目功能
- [x] 4.4 删除项目功能

## Phase 5: 体验优化

- [x] 5.1 悬浮球位置记忆
- [x] 5.2 窗口首次启动位置优化
- [x] 5.3 右键菜单（可选）- 跳过

## Status Notes

**Blocked by:** Rust toolchain not installed - cannot compile Tauri backend
**Frontend build:** Verified working (`npm run build` succeeds)
**Next step:** Install Rust to complete backend compilation
