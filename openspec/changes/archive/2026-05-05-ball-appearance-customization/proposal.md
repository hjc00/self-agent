## Why

悬浮球目前使用硬编码的紫色渐变和地球图标，用户无法调整外观。提供外观自定义能让用户根据桌面风格或个人偏好更换图标、颜色、大小和形状，提升产品的个性化程度。

## What Changes

- 设置窗口新增「外观设置」区域，支持修改前景图标、背景渐变色（双色）、悬浮球大小和形状
- 前景图标支持 PNG / JPG / SVG 文件，通过文件选择对话框选取，选择后实时预览
- 背景渐变支持两个颜色配置（单色时将两色设为相同即可）
- 悬浮球大小通过滑块调节，范围 48–128 px
- 形状支持圆形、圆角方形、正方形三种
- 外观配置持久化到 `config.json` 的 `appearance` 字段
- 保存后即时生效：主进程更新悬浮球窗口样式并重建系统托盘图标
- 托盘图标跟随背景色和前景图标联动更新（16×16 合成）
- 图标文件无效或缺失时回退默认地球图标，设置页面显示警告

## Capabilities

### New Capabilities

- `ball-appearance`: 悬浮球外观自定义能力，包括前景图标、背景渐变、大小、形状的配置、持久化和实时生效

### Modified Capabilities

无需修改现有 spec。

## Impact

- `src/settings.html` — 扩展为包含外观设置区域（图标选择、颜色配置、大小滑块、形状选择 + 预览）
- `src/ball.html` — 样式改为 JS 动态注入；监听 `appearance-changed` IPC 事件实时刷新
- `main.js` — 新增 4 个 IPC handler（get-appearance、pick-icon、save-appearance）和 `appearance-changed` 推送；窗口 resize 逻辑；托盘图标重建函数
- `preload.js` — 新增 `getAppearance`、`pickIcon`、`saveAppearance` invoke 和 `onAppearanceChanged` 事件监听
