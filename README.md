# Agent 工作档案

在线地址：<https://1575371.github.io/agent-worklog/>

一个单页作品集网站，用来记录：

1. 使用的 Agent：Trae、DeepSeek Harness
2. 使用 Agent 完成的工作
3. 取得的成效

网站是纯静态的 HTML / CSS / JavaScript，没有构建步骤，也没有外部依赖。

## 打开网站

直接双击 `index.html`，用 Chrome 或 Edge 打开即可。

如果浏览器限制本地文件保存，可以在当前文件夹运行一个本地服务器：

```powershell
python -m http.server 8000
```

然后访问 <http://localhost:8000>。

## 编辑内容

1. 点击右上角「编辑内容」。
2. 点击任意带虚线框的标题、正文或标签，直接修改。
3. 在「工作」和「成效」区域，可以添加或删除条目。
4. 点击底部「完成编辑」，或按 `Esc` 退出。

编辑内容会自动保存在当前浏览器的 `localStorage` 中，刷新页面不会丢失，也不会上传任何数据。

### 底部的编辑工具栏

| 按钮 | 作用 |
| --- | --- |
| 下载网页 | 下载一份已经把当前内容写进去的 `index.html`。用它替换原文件，就可以发布带内容的版本。 |
| 导出备份 | 下载 JSON 备份，方便换电脑或换浏览器时恢复。 |
| 导入备份 | 读取之前导出的 JSON 备份，覆盖当前内容。 |
| 恢复示例 | 恢复到初始示例文案。 |

> 自动保存只发生在当前浏览器里。如果要把内容发布到 GitHub Pages、Netlify 等平台，请先点「下载网页」，再用下载得到的 `index.html` 替换项目里的同名文件。

## 修改 Agent 介绍

Trae 和 DeepSeek Harness 的介绍是静态文案，直接在 `index.html` 中搜索 `agent-card` 修改即可。

## 文件结构

```text
.
├── index.html          # 页面结构、Agent 介绍、示例内容
├── assets/
│   ├── styles.css      # 全部样式、动画与响应式布局
│   └── script.js       # 编辑模式、自动保存、导入导出
└── README.md
```

## 发布

把整个文件夹上传到任意静态托管即可，例如 GitHub Pages、Netlify、Vercel 或 Cloudflare Pages。

发布前建议先执行一次「下载网页」，确保线上版本包含你编辑后的内容。

## 浏览器支持

推荐使用最新版 Chrome 或 Edge。Safari、Firefox 也可以正常浏览和编辑，但下载网页、字体渲染等细节可能略有差异。

## 设计说明

- 主色：暖纸色 `#f3efe6` + 墨黑 `#161613`
- 强调色：电光蓝 `#2f4bff` + 荧光黄绿 `#d9ff63`
- 中文标题使用系统黑体，英文衬线斜体作为节奏变化
- 所有图形、图标均由 CSS / SVG 绘制，无外部图片请求
