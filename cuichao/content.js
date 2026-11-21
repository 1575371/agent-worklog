/*
 * 崔超的小站 — 内容数据源
 * ============================================================
 * 这是全站唯一需要维护的文件。页面不会显示任何网址文本，
 * 而是把下面 embed 指向的真实页面直接内嵌展示在站点里。
 *
 * 【以后新增内容怎么做】
 * 只需在 SITE.entries 数组里追加一个对象，字段含义如下：
 *   id       唯一标识（英文短横线，如 "my-new-project"）
 *   title    标题（卡片和详情页显示）
 *   summary  摘要（卡片上显示的一句话介绍）
 *   date     日期，格式 YYYY-MM-DD
 *   category 分类（首页侧栏、分类页会自动汇总）
 *   tags     标签数组（标签页、热门标签会自动汇总）
 *   icon     卡片封面上的字符（一个 emoji 或汉字）
 *   color    卡片封面渐变色（两个 CSS 颜色，如 ["#2f6b5f","#4f9b86"]）
 *   embed    要内嵌展示的真实页面地址（不会以文本形式出现在页面上）
 *   kind     展示形态："iframe"（整页内嵌）或 "panel"（留作以后扩展）
 *
 * 首页列表、作品网格、最近更新、热门标签、分类页、标签页、归档页、
 * 站内搜索，全部从这一个数组自动派生，无需改动 index.html / app.js。
 * ============================================================
 */

window.SITE = {
  site: {
    name: "崔超的小站",
    tagline: "把喜欢的东西，留在这里。",
    avatar: "崔",
    foot: "持续更新中 · 内容由本站统一维护"
  },

  // 导航项：id 对应 app.js 中的视图；新增分类/标签不需要改这里
  nav: [
    { id: "home", label: "首页", icon: "home" },
    { id: "works", label: "作品", icon: "grid" },
    { id: "categories", label: "分类", icon: "folder" },
    { id: "tags", label: "标签", icon: "tag" },
    { id: "archive", label: "归档", icon: "archive" },
    { id: "about", label: "关于", icon: "info" }
  ],

  about: {
    title: "关于这个小站",
    paragraphs: [
      "这里是崔超的个人站点，用来集中展示做过的作品、写过的记录，以及值得留存的学习内容。",
      "页面里看到的作品都是可以直接浏览和操作的真实内容，不需要跳转到别处。站点结构按内容统一管理，新增条目后各个板块会自动更新。"
    ],
    points: [
      "作品与记录集中在一页浏览",
      "内容可直接在本站内查看和交互",
      "支持按分类、标签、日期与关键词查找"
    ]
  },

  entries: [
    {
      id: "mlp-bootcamp",
      title: "神经网络训练营 · MLP 闯关游戏",
      summary: "把多层感知机的训练过程做成 5 个关卡：前向传播接力、调权重画分界线、选学习率、判断梯度方向，最后亲手训练一个能学会 XOR 的网络。边玩边看懂神经网络是怎么学出来的。",
      date: "2026-11-18",
      category: "作品",
      tags: ["MLP", "XOR", "反向传播", "神经网络", "游戏化学习"],
      icon: "神",
      color: ["#2f6b5f", "#57a68f"],
      embed: "https://1575371.github.io/learning/",
      kind: "iframe"
    },
    {
      id: "agent-worklog",
      title: "Agent 工作档案",
      summary: "一份关于 AI Agent 协作的在线工作档案，记录使用 Trae 与 DeepSeek Harness 完成的工作与成效，并支持在页面内直接编辑、自动保存。",
      date: "2026-10-18",
      category: "作品",
      tags: ["Trae", "DeepSeek", "WorkBuddy", "AI Agent", "工作档案"],
      icon: "档",
      color: ["#3b52a6", "#6b7cd6"],
      embed: "https://1575371.github.io/agent-worklog/",
      kind: "iframe"
    }
  ]
};
