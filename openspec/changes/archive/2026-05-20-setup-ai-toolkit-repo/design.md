## Context

用户维护一组个人 AI 工具（Claude Code skills）和 Git hooks，需要在多台开发机器间同步。目前没有集中管理的远端仓库，工具散落在各机器的本地目录中。本 change 创建 `ai-toolkit` 远端仓库作为权威源，并设计其目录结构。

## Goals / Non-Goals

**Goals:**
- 创建统一的远端仓库结构，支持 skill 和 hooks 分类存放
- 目录设计支持未来扩展（新类型工具、多版本 skill）
- README 提供清晰的目录说明和使用指引

**Non-Goals:**
- 不实现自动同步机制（留给后续 change）
- 不创建具体的 skill 或 hook 内容
- 不解决 skill 的安装/激活问题（依赖 Claude Code 原生机制）

## Decisions

**1. 仓库根目录用 `skills/` 和 `githooks/` 扁平分组，而非按机器/用户分组**
- 理由：用户是唯一作者，不需要按用户隔离；按功能分组更符合使用直觉
- 替代方案：按机器名分目录（`work-mac/`, `home-pc/`）—— 会导致重复 skill 无法共享

**2. `skills/` 下分 `core-skills/` 和 `experimental/`**
- 理由：区分稳定性和实验性，避免不成熟 skill 被误用于生产项目
- 替代方案：单一层级 + README 标注——不够醒目，容易误用

**3. `githooks/` 下分 `standalone/` 和 `project-specific/`**
- 理由：通用 hooks（如 commit-msg 格式检查）可直接用于任何项目；项目特定 hooks（如 Electron 打包前检查）需要额外上下文
- 替代方案：不按类型分——会导致用户混淆哪些 hook 是安全的通用钩子

**4. 仓库命名为 `ai-toolkit` 而非 `cc-skills` 或 `claude-tools`**
- 理由：未来可能扩展到其他 AI 助手（如 Cursor、Copilot）或通用自动化脚本，名称不应限死工具链

## Risks / Trade-offs

- **风险**：`experimental/` 中的 skill 如果缺乏明确标记，可能被他人误用
  - 缓解：README 中明确标注实验性目录的用途，skill 内部文件命名也加 `exp-` 前缀
- **风险**：Git hooks 跨项目复用时，不同项目可能有不同的 Git 配置（如分支名规范）
  - 缓解：`standalone/` 中的 hook 必须设计为可配置（通过环境变量或配置文件），README 中注明这一点
- **风险**：目录层级过深可能导致路径过长（Windows 限制 260 字符）
  - 缓解：保持两层深度，skill 名称使用短 kebab-case
