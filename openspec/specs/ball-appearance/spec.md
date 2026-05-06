## Requirements

### Requirement: Background gradient configuration

用户 SHALL 能够通过设置窗口配置悬浮球的背景渐变色，支持双色渐变和单色（两色相同）。颜色使用 hex 格式，通过 `<input type="color">` 控件选取。保存后悬浮球 SHALL 立即使用新颜色渲染。

`config.json` 中的存储格式：
```json
"appearance": {
  "color1": "#667eea",
  "color2": "#764ba2"
}
```

#### Scenario: 设置双色渐变

- **WHEN** 用户在设置窗口中分别选择 color1 为 `#667eea` 和 color2 为 `#764ba2` 并点击保存
- **THEN** 悬浮球背景渲染为从左上到右下的双色渐变
- **AND** `config.json` 的 `appearance.color1` 为 `"#667eea"`, `appearance.color2` 为 `"#764ba2"`

#### Scenario: 设置单色

- **WHEN** 用户将 color1 和 color2 设为相同值 `#ff0000` 并保存
- **THEN** 悬浮球背景渲染为纯红色

#### Scenario: 首次使用默认值

- **WHEN** `config.json` 中不存在 `appearance` 字段
- **THEN** 系统 SHALL 使用 `color1: "#667eea"`, `color2: "#764ba2"` 作为默认值

### Requirement: Foreground icon customization

用户 SHALL 能够通过设置窗口选择一个本地图片文件（PNG / JPG / SVG）作为前景图标。选择后设置窗口 SHALL 显示图标预览。保存后悬浮球 SHALL 替换默认地球 SVG 显示自定义图标。自定义图标 SHALL 显示在渐变背景之上。

#### Scenario: 选择有效图片文件

- **WHEN** 用户点击「选择文件」并选取一个有效 PNG 文件
- **THEN** 设置窗口显示该图片的预览
- **AND** 保存后悬浮球上该图片替换默认地球图标

#### Scenario: 不选择图标使用默认

- **WHEN** 用户未选择自定义图标（`icon_data` 为空字符串）
- **THEN** 悬浮球继续使用默认地球 SVG 图标

#### Scenario: 图标文件无效或缺失

- **WHEN** 配置中的 `icon_data` 无法正确渲染
- **THEN** 系统 SHALL 回退显示默认地球 SVG 图标
- **AND** 设置窗口 SHALL 显示警告提示「图标数据无效，已回退默认图标」

#### Scenario: 图标文件过大

- **WHEN** 用户选择超过 256×256 像素的图片
- **THEN** 主进程 SHALL 将图片缩放到 256×256 以内再转为 data URI 存储

### Requirement: Ball size customization

用户 SHALL 能够通过滑块调节悬浮球大小，范围 48–128 px，步长 1 px。保存后悬浮球窗口 SHALL 立即调整到对应尺寸，悬浮球 CSS 样式同步更新。

#### Scenario: 调整大小为 80 px

- **WHEN** 用户拖动滑块到 80 并保存
- **THEN** 悬浮球窗口 resize 为 80×80 px
- **AND** `#ball` 元素的 width/height 更新为 80 px
- **AND** `config.json` 的 `appearance.size` 为 `80`

#### Scenario: 滑块边界限制

- **WHEN** 用户尝试设置小于 48 或大于 128 的值
- **THEN** 输入 SHALL 被限制在 48–128 范围内

### Requirement: Ball shape customization

用户 SHALL 能够从圆形、圆角方形、正方形三种形状中选择一种。保存后悬浮球窗口的 CSS border-radius SHALL 立即更新对应的圆角值。

| 形状 | border-radius |
|------|---------------|
| 圆形 | 50% |
| 圆角方形 | 25% |
| 正方形 | 0% |

#### Scenario: 切换到圆角方形

- **WHEN** 用户选择「圆角方形」并保存
- **THEN** 悬浮球 `#ball` 的 `border-radius` 变为 `25%`
- **AND** `config.json` 的 `appearance.shape` 为 `"rounded-square"`

#### Scenario: 切换到正方形

- **WHEN** 用户选择「正方形」并保存
- **THEN** 悬浮球 `#ball` 的 `border-radius` 变为 `0%`
- **AND** `config.json` 的 `appearance.shape` 为 `"square"`

### Requirement: Appearance persistence

外观配置 SHALL 持久化到 `%APPDATA%\com.ai-floating-launcher.app\config.json` 的 `appearance` 字段中。应用启动时 SHALL 读取该配置并应用。

#### Scenario: 重启后外观保持

- **WHEN** 用户自定义外观后重启应用
- **THEN** 悬浮球使用上次保存的外观设置（图标、颜色、大小、形状）

### Requirement: Real-time appearance update

保存外观设置后，主进程 SHALL 通过 IPC 将变更推送到悬浮球窗口（`appearance-changed` 事件），悬浮球窗口 SHALL 即时更新样式，无需重启。

#### Scenario: 保存外观即时刷新

- **WHEN** 用户在设置窗口修改外观并点击保存
- **THEN** 悬浮球窗口在 1 秒内更新为新的外观样式

### Requirement: Tray icon follows appearance

系统托盘图标 SHALL 跟随悬浮球外观变化联动更新。托盘图标为 16×16 像素，使用 `color1` 作为主色调填充圆形区域。如果设置了自定义前景图标，SHALL 将缩小后的图标叠加在中心。

#### Scenario: 修改背景色后托盘更新

- **WHEN** 用户修改背景色并保存
- **THEN** 系统托盘图标颜色跟随新的 `color1` 更新

#### Scenario: 未设置自定义图标时托盘

- **WHEN** `icon_data` 为空
- **THEN** 托盘图标 SHALL 为纯色圆形，颜色为 `color1`

### Requirement: Settings window appearance section

设置窗口 SHALL 提供完整的外观配置界面，包含：前景图标选择（带预览）、渐变颜色 1/2 选择器、大小滑块（48–128）、形状单选按钮。窗口尺寸 SHALL 从 400×200 扩展为 400×380 以容纳新内容。

#### Scenario: 设置窗口显示外观选项

- **WHEN** 用户打开设置窗口
- **THEN** 窗口显示外观配置区域，包含图标选择、颜色、大小、形状控件
- **AND** 各控件显示当前生效的配置值

#### Scenario: 图标预览实时更新

- **WHEN** 用户选择新图标文件后（尚未保存）
- **THEN** 设置窗口中的预览区域显示选中的图标
