## Why

用户希望在多台机器之间同步个人 AI 工具（Claude Code skills）和 Git hooks。目前这些工具分散在各处，没有统一的远端管理和分发机制。建立一个远端仓库作为权威源，可以简化跨设备同步和项目管理。

## What Changes

- 创建 GitHub 私有仓库 `ai-toolkit` 作为个人工具合集
- 在仓库中初始化 `skills/` 和 `githooks/` 目录骨架
- `skills/` 分为 `core-skills/`（稳定）和 `experimental/`（实验性）
- `githooks/` 分为 `standalone/`（通用）和 `project-specific/`（项目特定）
- 提供 README 说明目录结构和使用方式
- 此 change 仅创建仓库骨架，不包含具体的 skill 或 hook 内容

## Capabilities

### New Capabilities
- `skill-repo-sync`: 个人 skill 仓库的初始化与同步能力，包括目录结构设计和远端仓库管理

### Modified Capabilities
- 无

## Impact

- 新增一个 GitHub 私有仓库
- 不影响 self-agent 现有代码
- 为后续在 self-agent 中集成"一键同步 skill"功能提供数据基础
