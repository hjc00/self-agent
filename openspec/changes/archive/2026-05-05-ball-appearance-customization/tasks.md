## 1. preload.js — 扩展 IPC 接口

- [x] 1.1 新增 `getAppearance` invoke（绑定 `ipcRenderer.invoke('get-appearance')`）
- [x] 1.2 新增 `pickIcon` invoke（绑定 `ipcRenderer.invoke('pick-icon')`）
- [x] 1.3 新增 `saveAppearance` invoke（绑定 `ipcRenderer.invoke('save-appearance', appearance)`)
- [x] 1.4 新增 `onAppearanceChanged` 监听（绑定 `ipcRenderer.on('appearance-changed', callback)`）

## 2. main.js — 配置与核心逻辑

- [x] 2.1 在 `loadConfig` 中处理 `appearance` 字段缺失回退默认值
- [x] 2.2 新增 `getAppearance` IPC handler（`ipcMain.handle('get-appearance')`，返回 config.appearance）
- [x] 2.3 新增 `pickIcon` IPC handler（打开 `dialog.showOpenDialog` 筛选 png/jpg/svg；用 `nativeImage` 读取并 resize 到 256×256 上限；返回 PNG base64 data URI）
- [x] 2.4 新增 `saveAppearance` IPC handler（校验 size 范围 48–128、shape 枚举值；写入 config；`saveConfig()`；调用 `applyAppearanceToBall()` 和 `rebuildTrayIcon()`）
- [x] 2.5 新增 `applyAppearanceToBall` 函数（通过 `ballWindow.webContents.send('appearance-changed', config.appearance)` 推送变更）
- [x] 2.6 新增 `rebuildTrayIcon` 函数（16×16 RGBA buffer：填充 color1 圆形；有 icon_data 时缩放叠加中心 10×10；替换 `tray.setImage()`）
- [x] 2.7 在 `ballWindow` 创建后读取 `config.appearance` 并设置窗口初始大小（`ballWindow.setSize(appearance.size, appearance.size)`）

## 3. src/settings.html — 设置窗口外观 UI

- [x] 3.1 扩展窗口尺寸从 400×200 到 400×380
- [x] 3.2 添加前景图标选择区域：`<button>` 触发 `pickIcon` + `<img>` 预览（48×48）
- [x] 3.3 添加渐变颜色选择器：两个 `<input type="color">`（color1、color2）
- [x] 3.4 添加大小滑块：`<input type="range" min="48" max="128" value="64">` + 数值显示
- [x] 3.5 添加形状选择：三个 `<input type="radio">`（circle / rounded-square / square）+ 标签
- [x] 3.6 新增「保存外观」按钮，调用 `saveAppearance` 提交完整 appearance 对象
- [x] 3.7 页面初始化时调用 `getAppearance` 填充各控件当前值
- [x] 3.8 图标预览逻辑：`pickIcon` 返回 data URI 后更新 `<img>` src（未保存时也可预览）

## 4. src/ball.html — 动态样式渲染

- [x] 4.1 提取 `#ball` 和内联 SVG 相关样式为 JS 动态注入（`<style id="dynamic-style">` 节点）
- [x] 4.2 新增 `applyAppearance(appearance)` 函数：根据 color1/color2 设置 background gradient；根据 size 设置 width/height；根据 shape 设置 border-radius；有 icon_data 时设置 background-image
- [x] 4.3 监听 `appearance-changed` IPC 事件，收到后调用 `applyAppearance`
- [x] 4.4 页面加载时调用 `getAppearance` 获取当前外观并首次渲染

## 5. 容错与边界情况

- [x] 5.1 在 `pickIcon` handler 中处理用户取消文件对话框（返回 null，不修改 icon_data）
- [x] 5.2 在 `applyAppearance` 中处理 icon_data 无效时的回退（静默切换为默认 SVG）
- [x] 5.3 在 `saveAppearance` 中校验 shape 值仅允许 circle / rounded-square / square
- [x] 5.4 首次启动（config.json 无 appearance 字段）时所有回退默认值生效
