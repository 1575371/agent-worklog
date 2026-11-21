(() => {
  "use strict";

  const STORAGE_KEY = "cuichao-site:links:v1";
  const SAMPLE_KEY = "cuichao-site:sampleLoaded:v1";

  const SAMPLE_LINKS = [
    { name: "MDN Web Docs", url: "https://developer.mozilla.org/zh-CN/", desc: "Web 技术权威文档，前端开发查阅 API 与标准的首选。", category: "学习" },
    { name: "GitHub", url: "https://github.com/", desc: "代码托管与协作平台，也是开源项目的聚集地。", category: "工具" },
    { name: "腾讯文档", url: "https://docs.qq.com/", desc: "在线协作文档，支持多人实时编辑与分享。", category: "工具" },
    { name: "少数派", url: "https://sspai.com/", desc: "关于效率工具与数字生活的优质内容社区。", category: "资讯" }
  ];

  const $ = (id) => document.getElementById(id);
  const els = {
    stats: $("stats"), search: $("searchInput"), chips: $("categoryChips"),
    grid: $("linkGrid"), empty: $("emptyState"), emptyTitle: $("emptyTitle"),
    emptyDesc: $("emptyDesc"), emptyAdd: $("emptyAddBtn"), loadSample: $("loadSampleBtn"),
    addBtn: $("addBtn"), exportBtn: $("exportBtn"), importBtn: $("importBtn"),
    importFile: $("importFile"), clearAll: $("clearAllBtn"),
    modal: $("modal"), modalTitle: $("modalTitle"), form: $("linkForm"),
    fName: $("fName"), fUrl: $("fUrl"), fDesc: $("fDesc"), fCategory: $("fCategory"),
    categoryList: $("categoryList"), errName: $("errName"), errUrl: $("errUrl"),
    closeModal: $("closeModalBtn"), cancel: $("cancelBtn"), save: $("saveBtn"),
    toast: $("toast")
  };

  let links = [];
  let activeCategory = "全部";
  let keyword = "";
  let editingId = null;
  let toastTimer = null;

  /* ---------- 存储 ---------- */
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      links = Array.isArray(parsed) ? parsed.filter(validLink) : [];
    } catch (e) {
      links = [];
      showToast("读取本地数据失败，已显示为空");
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
    } catch (e) {
      showToast("保存失败：浏览器存储不可用或已写满");
    }
  }

  function validLink(x) {
    return x && typeof x === "object" && typeof x.name === "string" && typeof x.url === "string" && /^https?:\/\//i.test(x.url);
  }

  function uid() {
    return "l_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  /* ---------- 工具 ---------- */
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  function displayUrl(url) {
    try {
      const u = new URL(url);
      return (u.hostname || "") + (u.pathname && u.pathname !== "/" ? u.pathname : "");
    } catch (e) {
      return url;
    }
  }

  function normalizeUrl(raw) {
    let v = String(raw || "").trim();
    if (!v) return "";
    if (!/^https?:\/\//i.test(v)) v = "https://" + v;
    try {
      const u = new URL(v);
      if (!u.hostname || !/\./.test(u.hostname)) return "";
      return u.href;
    } catch (e) {
      return "";
    }
  }

  const FAVI_COLORS = ["#3b52e6", "#0f9d76", "#e0703a", "#8b5cf6", "#d64565", "#0e8fb8"];
  function faviColor(text) {
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
    return FAVI_COLORS[h % FAVI_COLORS.length];
  }

  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2600);
  }

  /* ---------- 渲染 ---------- */
  function categories() {
    const set = new Set();
    links.forEach((l) => { if (l.category && l.category.trim()) set.add(l.category.trim()); });
    return ["全部", ...Array.from(set).sort((a, b) => a.localeCompare(b, "zh-CN"))];
  }

  function render() {
    renderStats();
    renderChips();
    renderGrid();
  }

  function renderStats() {
    const cats = categories().length - 1;
    els.stats.innerHTML =
      '<div class="stat"><span class="stat-num">' + links.length + '</span><span class="stat-label">个网址</span></div>' +
      '<div class="stat"><span class="stat-num">' + cats + '</span><span class="stat-label">个分类</span></div>';
  }

  function renderChips() {
    const cats = categories();
    if (!cats.includes(activeCategory)) activeCategory = "全部";
    els.chips.innerHTML = cats.map((c) =>
      '<button type="button" class="chip' + (c === activeCategory ? ' active' : '') +
      '" data-cat="' + escapeHtml(c) + '">' + escapeHtml(c) + '</button>'
    ).join("");
  }

  function renderGrid() {
    const list = links.filter((l) => {
      const catOk = activeCategory === "全部" || (l.category || "").trim() === activeCategory;
      if (!catOk) return false;
      if (!keyword) return true;
      const hay = [l.name, l.url, l.desc, l.category].join(" ").toLowerCase();
      return hay.indexOf(keyword) !== -1;
    });

    if (list.length === 0) {
      els.grid.innerHTML = "";
      els.empty.hidden = false;
      const noData = links.length === 0;
      els.emptyTitle.textContent = noData ? "还没有收藏的网址" : "没有匹配的网址";
      els.emptyDesc.textContent = noData
        ? "点「添加网址」，把第一个好地方收进来。"
        : "试试换个关键词或切换分类。";
      els.emptyAdd.hidden = !noData;
      els.loadSample.hidden = !noData || localStorage.getItem(SAMPLE_KEY) === "1";
      return;
    }

    els.empty.hidden = true;
    els.grid.innerHTML = list.map((l) => {
      const initial = (l.name || l.url).trim().charAt(0).toUpperCase() || "★";
      const cat = (l.category || "").trim();
      const desc = (l.desc || "").trim();
      return '<article class="card" data-id="' + escapeHtml(l.id) + '">' +
        '<div class="card-top">' +
          '<div class="favicon" style="background:' + faviColor(l.name || l.url) + '">' + escapeHtml(initial) + '</div>' +
          '<div class="card-title-wrap">' +
            '<h3 class="card-title">' + escapeHtml(l.name) + '</h3>' +
            '<a class="card-url" href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(displayUrl(l.url)) + '</a>' +
          '</div>' +
        '</div>' +
        '<p class="card-desc' + (desc ? '' : ' placeholder') + '">' + escapeHtml(desc || "暂无介绍") + '</p>' +
        '<div class="card-bottom">' +
          (cat ? '<span class="tag">' + escapeHtml(cat) + '</span>' : '<span class="tag none">未分类</span>') +
          '<div class="card-actions">' +
            '<button class="icon-btn" type="button" data-act="edit" title="编辑" aria-label="编辑">✎</button>' +
            '<button class="icon-btn danger" type="button" data-act="delete" title="删除" aria-label="删除">🗑</button>' +
          '</div>' +
        '</div>' +
        '<a class="card-open" href="' + escapeHtml(l.url) + '" target="_blank" rel="noopener noreferrer" aria-label="打开 ' + escapeHtml(l.name) + '"></a>' +
      '</article>';
    }).join("");
  }

  /* ---------- 弹窗 ---------- */
  function openModal(item) {
    editingId = item ? item.id : null;
    els.modalTitle.textContent = item ? "编辑网址" : "添加网址";
    els.save.textContent = item ? "保存修改" : "保存";
    els.fName.value = item ? item.name : "";
    els.fUrl.value = item ? item.url : "";
    els.fDesc.value = item ? (item.desc || "") : "";
    els.fCategory.value = item ? (item.category || "") : "";
    els.errName.hidden = true;
    els.errUrl.hidden = true;
    els.fName.classList.remove("invalid");
    els.fUrl.classList.remove("invalid");
    updateCategoryList();
    els.modal.hidden = false;
    setTimeout(() => els.fName.focus(), 0);
  }

  function closeModal() {
    els.modal.hidden = true;
    editingId = null;
  }

  function updateCategoryList() {
    els.categoryList.innerHTML = categories().filter((c) => c !== "全部")
      .map((c) => '<option value="' + escapeHtml(c) + '"></option>').join("");
  }

  function submitForm(e) {
    e.preventDefault();
    const name = els.fName.value.trim();
    const url = normalizeUrl(els.fUrl.value);
    let ok = true;

    if (!name) {
      els.errName.hidden = false; els.fName.classList.add("invalid"); ok = false;
    } else {
      els.errName.hidden = true; els.fName.classList.remove("invalid");
    }
    if (!url) {
      els.errUrl.hidden = false; els.fUrl.classList.add("invalid"); ok = false;
    } else {
      els.errUrl.hidden = true; els.fUrl.classList.remove("invalid");
    }
    if (!ok) return;

    const data = {
      name: name,
      url: url,
      desc: els.fDesc.value.trim(),
      category: els.fCategory.value.trim()
    };

    if (editingId) {
      const idx = links.findIndex((l) => l.id === editingId);
      if (idx !== -1) links[idx] = Object.assign({}, links[idx], data);
      showToast("已保存修改");
    } else {
      links.unshift(Object.assign({ id: uid(), createdAt: Date.now() }, data));
      showToast("已添加网址");
    }

    activeCategory = "全部";
    keyword = "";
    els.search.value = "";
    save();
    render();
    closeModal();
  }

  /* ---------- 导入导出 ---------- */
  function exportData() {
    if (links.length === 0) { showToast("暂无数据可导出"); return; }
    const blob = new Blob([JSON.stringify(links, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "崔超的小站-网址备份-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("已导出 " + links.length + " 条网址");
  }

  function importData(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const arr = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.links) ? parsed.links : []);
        const incoming = arr.filter(validLink).map((x) => ({
          id: uid(), name: x.name, url: x.url,
          desc: typeof x.desc === "string" ? x.desc : "",
          category: typeof x.category === "string" ? x.category : "",
          createdAt: Date.now()
        }));
        if (incoming.length === 0) { showToast("文件中没有可导入的网址"); return; }
        let added = 0;
        incoming.forEach((item) => {
          if (!links.some((l) => l.url === item.url)) { links.unshift(item); added++; }
        });
        save(); render();
        showToast("导入完成，新增 " + added + " 条，跳过重复 " + (incoming.length - added) + " 条");
      } catch (e) {
        showToast("导入失败：不是有效的 JSON 文件");
      }
    };
    reader.onerror = () => showToast("读取文件失败");
    reader.readAsText(file, "utf-8");
  }

  function loadSample() {
    let added = 0;
    SAMPLE_LINKS.forEach((s) => {
      if (!links.some((l) => l.url === s.url)) {
        links.unshift(Object.assign({ id: uid(), createdAt: Date.now() }, s));
        added++;
      }
    });
    localStorage.setItem(SAMPLE_KEY, "1");
    save(); render();
    showToast("已载入 " + added + " 条示例网址");
  }

  /* ---------- 事件 ---------- */
  els.addBtn.addEventListener("click", () => openModal(null));
  els.emptyAdd.addEventListener("click", () => openModal(null));
  els.loadSample.addEventListener("click", loadSample);
  els.closeModal.addEventListener("click", closeModal);
  els.cancel.addEventListener("click", closeModal);
  els.form.addEventListener("submit", submitForm);
  els.modal.addEventListener("click", (e) => { if (e.target === els.modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !els.modal.hidden) closeModal(); });

  els.search.addEventListener("input", () => {
    keyword = els.search.value.trim().toLowerCase();
    renderGrid();
  });

  els.chips.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    activeCategory = btn.getAttribute("data-cat");
    renderChips();
    renderGrid();
  });

  els.grid.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    const card = btn.closest(".card");
    const id = card && card.getAttribute("data-id");
    const item = links.find((l) => l.id === id);
    if (!item) return;
    if (btn.getAttribute("data-act") === "edit") openModal(item);
    else if (btn.getAttribute("data-act") === "delete") {
      if (confirm('确定删除“' + item.name + '”吗？')) {
        links = links.filter((l) => l.id !== id);
        save(); render();
        showToast("已删除");
      }
    }
  });

  els.exportBtn.addEventListener("click", exportData);
  els.importBtn.addEventListener("click", () => els.importFile.click());
  els.importFile.addEventListener("change", (e) => {
    importData(e.target.files && e.target.files[0]);
    e.target.value = "";
  });

  els.clearAll.addEventListener("click", () => {
    if (links.length === 0) { showToast("当前没有网址"); return; }
    if (confirm("确定清空全部 " + links.length + " 条网址吗？此操作不可撤销，建议先导出备份。")) {
      links = [];
      activeCategory = "全部";
      keyword = "";
      els.search.value = "";
      save(); render();
      showToast("已清空全部网址");
    }
  });

  /* ---------- 启动 ---------- */
  load();
  render();
})();
