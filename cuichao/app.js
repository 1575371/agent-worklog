(() => {
  "use strict";

  const DATA = window.SITE;
  if (!DATA || !Array.isArray(DATA.entries)) return;

  const THEME_KEY = "cuichao-site:theme:v1";
  const $ = (id) => document.getElementById(id);
  const els = {
    avatar: $("avatar"), siteName: $("siteName"), siteTagline: $("siteTagline"),
    nav: $("nav"), footer: $("footer"), sidebarFoot: $("sidebarFoot"),
    breadcrumb: $("breadcrumb"), search: $("searchInput"), view: $("view"),
    themeOptions: $("themeOptions"), menuToggle: $("menuToggle"),
    sidebar: $("sidebar"), scrim: $("scrim"), toast: $("toast")
  };

  const icons = {
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    folder: '<path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2h8.5A1.5 1.5 0 0 1 21 8.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/>',
    tag: '<path d="M20 13 12 21 3 12V4h8z"/><circle cx="7.5" cy="8" r="1.3"/>',
    archive: '<rect x="3" y="4" width="18" height="4" rx="1"/><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8"/><path d="M10 12h4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="8" r=".8" fill="currentColor" stroke="none"/>',
    date: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'
  };

  let currentView = "home";
  let keyword = "";
  let toastTimer = null;

  /* ---------- 工具 ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }
  function svg(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (icons[name] || "") + "</svg>";
  }
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2200);
  }
  function sortedEntries() {
    return DATA.entries.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }
  function fmtDate(d) {
    const p = String(d).split("-");
    return p.length === 3 ? p[0] + "/" + p[1] + "/" + p[2] : String(d);
  }
  function byId(id) { return DATA.entries.find((e) => e.id === id); }

  /* ---------- 主题 ---------- */
  function applyTheme(mode) {
    const light = window.matchMedia("(prefers-color-scheme: light)");
    const resolve = () => (mode === "system" ? (light.matches ? "light" : "dark") : mode);
    document.documentElement.setAttribute("data-theme", resolve());
    els.themeOptions.querySelectorAll(".theme-btn").forEach((b) => {
      const on = b.getAttribute("data-theme") === mode;
      b.classList.toggle("active", on);
      if (on) b.setAttribute("aria-pressed", "true"); else b.removeAttribute("aria-pressed");
    });
    light.onchange = () => { if (mode === "system") document.documentElement.setAttribute("data-theme", resolve()); };
  }
  function initTheme() {
    let mode = "light";
    try { mode = localStorage.getItem(THEME_KEY) || "light"; } catch (e) { mode = "light"; }
    applyTheme(mode);
    els.themeOptions.addEventListener("click", (e) => {
      const b = e.target.closest(".theme-btn");
      if (!b) return;
      const mode2 = b.getAttribute("data-theme");
      try { localStorage.setItem(THEME_KEY, mode2); } catch (err) { /* 忽略 */ }
      applyTheme(mode2);
    });
  }

  /* ---------- 侧栏 / 顶栏 ---------- */
  function renderChrome() {
    els.avatar.textContent = DATA.site.avatar || "站";
    els.siteName.textContent = DATA.site.name || "我的小站";
    els.siteTagline.textContent = DATA.site.tagline || "";
    els.footer.textContent = (DATA.site.foot || "") + " · 内容内嵌展示，无需跳转";
    els.sidebarFoot.textContent = "共 " + DATA.entries.length + " 条内容";

    els.nav.innerHTML = DATA.nav.map((n) => {
      const count = n.id === "works" ? DATA.entries.length : "";
      return '<button class="nav-item" type="button" data-view="' + esc(n.id) + '">' +
        svg(n.icon) + "<span>" + esc(n.label) + "</span>" +
        (count !== "" ? '<span class="nav-count">' + count + "</span>" : "") +
        "</button>";
    }).join("");
    updateNav();
  }

  function updateNav() {
    els.nav.querySelectorAll(".nav-item").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-view") === currentView);
    });
    const label = (DATA.nav.find((n) => n.id === currentView) || {}).label || "首页";
    els.breadcrumb.innerHTML = '<span>首页</span>' +
      (currentView === "home" ? "" : '<span class="sep">/</span><span class="cur">' + esc(label) + "</span>");
  }

  function closeSidebar() {
    els.sidebar.classList.remove("open");
    els.scrim.hidden = true;
  }
  els.menuToggle.addEventListener("click", () => {
    const open = !els.sidebar.classList.contains("open");
    els.sidebar.classList.toggle("open", open);
    els.scrim.hidden = !open;
  });
  els.scrim.addEventListener("click", closeSidebar);

  /* ---------- 视图渲染 ---------- */
  function entryCard(e) {
    const tags = (e.tags || []).map((t) => '<span class="entry-tag">' + esc(t) + "</span>").join("");
    return '<article class="entry" data-entry="' + esc(e.id) + '">' +
      '<h3 class="entry-title">' + esc(e.title) + "</h3>" +
      '<p class="entry-summary">' + esc(e.summary) + "</p>" +
      '<div class="entry-meta">' +
        '<span class="date">' + svg("date") + esc(fmtDate(e.date)) + "</span>" +
        '<div class="entry-tags">' + tags + "</div>" +
        '<span class="entry-cta">查看内容 →</span>' +
      "</div></article>";
  }

  function moduleCard(e) {
    const c = e.color || ["#2f6b5f", "#4f9b86"];
    return '<article class="module-card" data-entry="' + esc(e.id) + '">' +
      '<div class="module-cover" style="background:linear-gradient(135deg,' + esc(c[0]) + "," + esc(c[1]) + ')">' +
        esc(e.icon || "站") + "</div>" +
      '<div class="module-body"><h3>' + esc(e.title) + "</h3>" +
        "<p>" + esc(e.summary) + "</p>" +
        '<div class="entry-meta"><span class="date">' + svg("date") + esc(fmtDate(e.date)) + "</span>" +
        '<span class="entry-tag">' + esc(e.category || "未分类") + "</span></div>" +
      "</div></article>";
  }

  function renderHome() {
    const list = sortedEntries();
    const tags = hotTags();
    const tagBtns = tags.map((t) => '<button type="button" data-tag="' + esc(t.name) + '">' +
      esc(t.name) + " · " + t.count + "</button>").join("");
    const recent = list.slice(0, 6).map((e) =>
      '<li data-entry="' + esc(e.id) + '"><span class="t">' + esc(e.title) + "</span><span>" + esc(fmtDate(e.date)) + "</span></li>"
    ).join("");

    els.view.innerHTML =
      '<div class="view-heading"><h2>最近的内容</h2><p>共 ' + list.length + " 条，点击任意一条即可在站内查看。</p></div>" +
      (list.length ? '<div class="entry-list">' + list.map(entryCard).join("") + "</div>"
                   : '<div class="empty-state"><div class="big">✦</div>暂时还没有内容</div>') +
      '<div class="side-panel">' +
        '<section><div class="section-head"><h2>最近更新</h2></div><ul class="mini-list">' + (recent || "<li>暂无</li>") + "</ul></section>" +
        '<section><div class="section-head"><h2>热门标签</h2></div><div class="tag-cloud">' + (tagBtns || "<span>暂无</span>") + "</div></section>" +
      "</div>";
  }

  function renderWorks() {
    const list = sortedEntries();
    els.view.innerHTML =
      '<div class="view-heading"><h2>作品</h2><p>这里的内容都可以直接在本站内打开、操作。</p></div>' +
      (list.length ? '<div class="module-grid">' + list.map(moduleCard).join("") + "</div>"
                   : '<div class="empty-state">暂时还没有作品</div>');
  }

  function renderCategories() {
    const map = {};
    DATA.entries.forEach((e) => { const c = e.category || "未分类"; (map[c] = map[c] || []).push(e); });
    const keys = Object.keys(map).sort();
    els.view.innerHTML =
      '<div class="view-heading"><h2>分类</h2><p>共 ' + keys.length + " 个分类。</p></div>" +
      keys.map((c) =>
        '<section class="section-head"><h2>' + esc(c) + " · " + map[c].length + "</h2></section>" +
        '<div class="entry-list">' + map[c].sort((a, b) => String(b.date).localeCompare(String(a.date))).map(entryCard).join("") + "</div>"
      ).join("");
  }

  function renderTags() {
    const tags = hotTags();
    els.view.innerHTML =
      '<div class="view-heading"><h2>标签</h2><p>点击标签查看相关内容。</p></div>' +
      '<div class="tag-cloud">' + tags.map((t) =>
        '<button type="button" data-tag="' + esc(t.name) + '">' + esc(t.name) + " · " + t.count + "</button>"
      ).join("") + "</div>";
  }

  function renderArchive() {
    const map = {};
    sortedEntries().forEach((e) => { const y = String(e.date).slice(0, 4) || "未标注"; (map[y] = map[y] || []).push(e); });
    const years = Object.keys(map).sort().reverse();
    els.view.innerHTML =
      '<div class="view-heading"><h2>归档</h2><p>按年份整理的全部内容。</p></div>' +
      years.map((y) =>
        '<section class="section-head"><h2>' + esc(y) + " · " + map[y].length + "</h2></section>" +
        '<div class="entry-list">' + map[y].map(entryCard).join("") + "</div>"
      ).join("");
  }

  function renderAbout() {
    const a = DATA.about || {};
    els.view.innerHTML =
      '<div class="about-card"><h2>' + esc(a.title || "关于") + "</h2>" +
      (a.paragraphs || []).map((p) => "<p>" + esc(p) + "</p>").join("") +
      ((a.points && a.points.length) ? "<ul>" + a.points.map((p) => "<li>" + esc(p) + "</li>").join("") + "</ul>" : "") +
      "</div>";
  }

  function renderDetail(id) {
    const e = byId(id);
    if (!e) { renderHome(); return; }
    const tags = (e.tags || []).map((t) => '<span class="entry-tag">' + esc(t) + "</span>").join("");
    els.view.innerHTML =
      '<div class="detail-head"><div>' +
        "<h2>" + esc(e.title) + "</h2>" +
        '<div class="entry-meta"><span class="date">' + svg("date") + esc(fmtDate(e.date)) + "</span>" +
        '<div class="entry-tags">' + tags + "</div></div>" +
      '</div><button class="back-btn" type="button" data-back>← 返回</button></div>' +
      '<iframe class="embed-frame" src="' + esc(e.embed) + '" title="' + esc(e.title) +
        '" loading="lazy" referrerpolicy="no-referrer"></iframe>' +
      '<p class="embed-note">上面展示的是该作品的真实页面，可直接在站内操作和浏览。</p>';
    currentView = "detail";
    updateNav();
  }

  function hotTags() {
    const map = {};
    DATA.entries.forEach((e) => (e.tags || []).forEach((t) => { map[t] = (map[t] || 0) + 1; }));
    return Object.keys(map).map((name) => ({ name, count: map[name] }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN"));
  }

  function renderFiltered(tag) {
    const list = sortedEntries().filter((e) => (e.tags || []).indexOf(tag) !== -1);
    els.view.innerHTML =
      '<div class="view-heading"><h2>标签：' + esc(tag) + "</h2><p>共 " + list.length + " 条相关内容。</p></div>" +
      (list.length ? '<div class="entry-list">' + list.map(entryCard).join("") + "</div>"
                   : '<div class="empty-state">该标签下暂无内容</div>');
    currentView = "tag:" + tag;
    updateNav();
  }

  function renderSearch() {
    const q = keyword.toLowerCase();
    const list = sortedEntries().filter((e) => {
      const hay = [e.title, e.summary, e.category, (e.tags || []).join(" ")].join(" ").toLowerCase();
      return hay.indexOf(q) !== -1;
    });
    els.view.innerHTML =
      '<div class="view-heading"><h2>搜索结果</h2><p>关键词「' + esc(keyword) + "」共匹配 " + list.length + " 条。</p></div>" +
      (list.length ? '<div class="entry-list">' + list.map(entryCard).join("") + "</div>"
                   : '<div class="empty-state">没有匹配的内容，换个关键词试试</div>');
    currentView = "search";
    updateNav();
  }

  function render() {
    switch (currentView) {
      case "home": renderHome(); break;
      case "works": renderWorks(); break;
      case "categories": renderCategories(); break;
      case "tags": renderTags(); break;
      case "archive": renderArchive(); break;
      case "about": renderAbout(); break;
      default:
        if (currentView.indexOf("tag:") === 0) renderFiltered(currentView.slice(4));
        else if (currentView === "detail") renderHome();
        else renderHome();
    }
  }

  function go(view) {
    currentView = view;
    keyword = "";
    els.search.value = "";
    closeSidebar();
    render();
    updateNav();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ---------- 事件 ---------- */
  els.nav.addEventListener("click", (e) => {
    const b = e.target.closest(".nav-item");
    if (b) go(b.getAttribute("data-view"));
  });

  els.view.addEventListener("click", (e) => {
    if (e.target.closest("[data-back]")) { go("works"); return; }
    const tagBtn = e.target.closest("[data-tag]");
    if (tagBtn) { currentView = "tag:" + tagBtn.getAttribute("data-tag"); render(); updateNav(); return; }
    const card = e.target.closest("[data-entry]");
    if (card) { renderDetail(card.getAttribute("data-entry")); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });

  let searchTimer = null;
  els.search.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      keyword = els.search.value.trim();
      if (keyword) renderSearch();
      else go("home");
    }, 180);
  });

  /* ---------- 启动 ---------- */
  initTheme();
  renderChrome();
  render();
})();
