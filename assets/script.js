(() => {
  "use strict";

  const STORAGE_KEY = "agent-worklog:content:v1";
  const MAX_WORK_ITEMS = 12;
  const MAX_METRICS = 8;

  const workSection = document.querySelector('[data-section="work"]');
  const outcomesSection = document.querySelector('[data-section="outcomes"]');
  const workList = document.querySelector("[data-work-list]");
  const metricsList = document.querySelector("[data-metrics-list]");

  if (!workSection || !outcomesSection || !workList || !metricsList) {
    return;
  }

  const editToggle = document.querySelector("[data-edit-toggle]");
  const editLabel = document.querySelector("[data-edit-label]");
  const editDock = document.querySelector("[data-edit-dock]");
  const doneButton = document.querySelector("[data-edit-done]");
  const saveStatus = document.querySelector(".dock-status");
  const saveLabel = document.querySelector("[data-save-label]");
  const toastEl = document.querySelector("[data-toast]");
  const importInput = document.querySelector("[data-import-input]");
  const lastUpdatedEl = document.querySelector("[data-last-updated]");
  const noteEl = document.querySelector("[data-note]");

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const readText = (el) => {
    if (!el) return "";
    return (el.innerText || el.textContent || "").replace(/\u00a0/g, " ");
  };

  const splitTags = (value) => {
    const source = Array.isArray(value) ? value.join("，") : String(value || "");
    return source
      .split(/[,，、;；\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 10);
  };

  const pad = (value) => String(value).padStart(2, "0");

  const formatDate = (value) => {
    const date = value ? new Date(value) : new Date();
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    return `${safeDate.getFullYear()}.${pad(safeDate.getMonth() + 1)}.${pad(safeDate.getDate())}`;
  };

  function harvestInitialState() {
    const workHeading = $('[data-bind="work.heading"]');
    const workIntro = $('[data-bind="work.intro"]');
    const outcomesHeading = $('[data-bind="outcomes.heading"]');
    const outcomesIntro = $('[data-bind="outcomes.intro"]');

    const workItems = $$("[data-work-item]", workList).map((item) => ({
      phase: readText($('[data-field="phase"]', item)).trim(),
      status: readText($('[data-field="status"]', item)).trim(),
      title: readText($('[data-field="title"]', item)).trim(),
      description: readText($('[data-field="description"]', item)).trim(),
      tags: $$(".chip", item)
        .map((chip) => readText(chip).trim())
        .filter(Boolean),
    }));

    const metrics = $$("[data-metric-item]", metricsList).map((metric) => ({
      value: readText($('[data-field="value"]', metric)).trim(),
      label: readText($('[data-field="label"]', metric)).trim(),
      note: readText($('[data-field="note"]', metric)).trim(),
    }));

    return {
      version: 1,
      updatedAt: null,
      work: {
        heading: readText(workHeading).trim(),
        intro: readText(workIntro).trim(),
        items: workItems,
      },
      outcomes: {
        heading: readText(outcomesHeading).trim(),
        intro: readText(outcomesIntro).trim(),
        metrics,
        note: {
          title: readText($('[data-field="title"]', noteEl)).trim(),
          body: readText($('[data-field="body"]', noteEl)).trim(),
        },
      },
    };
  }

  const initialState = harvestInitialState();
  let state = initialState;
  let editing = false;
  let saveTimer = null;
  let toastTimer = null;

  function normalizeText(value, fallback = "") {
    if (typeof value === "string") return value.slice(0, 20000);
    if (typeof value === "number") return String(value);
    return fallback;
  }

  function normalizeWorkItem(item, fallback = {}) {
    const source = item && typeof item === "object" && !Array.isArray(item) ? item : {};
    return {
      phase: normalizeText(source.phase, fallback.phase || ""),
      status: normalizeText(source.status, fallback.status || ""),
      title: normalizeText(source.title, fallback.title || ""),
      description: normalizeText(source.description, fallback.description || ""),
      tags: splitTags(
        Array.isArray(source.tags)
          ? source.tags
          : typeof source.tags === "string"
            ? source.tags
            : fallback.tags || [],
      ),
    };
  }

  function normalizeMetric(metric, fallback = {}) {
    const source = metric && typeof metric === "object" && !Array.isArray(metric) ? metric : {};
    return {
      value: normalizeText(source.value, fallback.value || ""),
      label: normalizeText(source.label, fallback.label || ""),
      note: normalizeText(source.note, fallback.note || ""),
    };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error("Invalid backup");
    }
    if (!raw.work && !raw.outcomes) {
      throw new Error("Not a worklog backup");
    }

    const workRaw = raw.work && typeof raw.work === "object" ? raw.work : {};
    const outcomesRaw = raw.outcomes && typeof raw.outcomes === "object" ? raw.outcomes : {};
    const noteRaw = outcomesRaw.note && typeof outcomesRaw.note === "object" ? outcomesRaw.note : {};
    const fallbackWork = initialState.work;
    const fallbackOutcomes = initialState.outcomes;

    const workItems = Array.isArray(workRaw.items)
      ? workRaw.items
          .slice(0, MAX_WORK_ITEMS)
          .filter((item) => item && typeof item === "object")
          .map((item) => normalizeWorkItem(item))
      : fallbackWork.items.map((item) => normalizeWorkItem(item, item));

    const metrics = Array.isArray(outcomesRaw.metrics)
      ? outcomesRaw.metrics
          .slice(0, MAX_METRICS)
          .filter((metric) => metric && typeof metric === "object")
          .map((metric) => normalizeMetric(metric))
      : fallbackOutcomes.metrics.map((metric) => normalizeMetric(metric, metric));

    return {
      version: 1,
      updatedAt:
        typeof raw.updatedAt === "string" && !Number.isNaN(new Date(raw.updatedAt).getTime())
          ? raw.updatedAt
          : new Date().toISOString(),
      work: {
        heading: normalizeText(workRaw.heading, fallbackWork.heading),
        intro: normalizeText(workRaw.intro, fallbackWork.intro),
        items: workItems,
      },
      outcomes: {
        heading: normalizeText(outcomesRaw.heading, fallbackOutcomes.heading),
        intro: normalizeText(outcomesRaw.intro, fallbackOutcomes.intro),
        metrics,
        note: {
          title: normalizeText(noteRaw.title, fallbackOutcomes.note.title),
          body: normalizeText(noteRaw.body, fallbackOutcomes.note.body),
        },
      },
    };
  }

  function setByPath(target, path, value) {
    const parts = path.split(".");
    let cursor = target;
    for (let index = 0; index < parts.length - 1; index += 1) {
      if (!cursor[parts[index]] || typeof cursor[parts[index]] !== "object") {
        return;
      }
      cursor = cursor[parts[index]];
    }
    cursor[parts[parts.length - 1]] = value;
  }

  function captureElement(el, trim = false) {
    if (!el) return;

    if (el.classList.contains("tags-input")) {
      const path = el.dataset.bind;
      if (path) setByPath(state, path, splitTags(readText(el)));
      return;
    }

    const path = el.dataset.bind;
    const noteField = el.dataset.field;
    let value = readText(el).replace(/\u00a0/g, " ");

    if (el.hasAttribute("data-single-line")) {
      value = value.replace(/\s+/g, " ");
    }
    if (trim) {
      value = value.trim();
    }

    if (path) {
      setByPath(state, path, value);
      return;
    }

    if (noteField && el.closest("[data-note]")) {
      state.outcomes.note[noteField] = value;
    }
  }

  function captureAllEdits(trim = true) {
    $$("[data-bind]").forEach((el) => {
      if (!workSection.contains(el) && !outcomesSection.contains(el)) return;
      captureElement(el, trim);
    });
    $$("[data-note] [data-field]").forEach((el) => captureElement(el, trim));
  }

  function setSaveStatus(kind, label) {
    if (!saveStatus) return;
    saveStatus.classList.toggle("is-saving", kind === "saving");
    saveStatus.classList.toggle("is-error", kind === "error");
    if (saveLabel) saveLabel.textContent = label;
  }

  function updateFooterDate() {
    if (lastUpdatedEl) {
      lastUpdatedEl.textContent = formatDate(state.updatedAt);
    }
  }

  function saveNow() {
    window.clearTimeout(saveTimer);
    saveTimer = null;
    state.updatedAt = new Date().toISOString();

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setSaveStatus("saved", "已保存到本机");
    } catch (error) {
      setSaveStatus("error", "本机保存不可用");
    }

    updateFooterDate();
  }

  function scheduleSave() {
    setSaveStatus("saving", "正在保存…");
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNow, 450);
  }

  function showToast(message) {
    if (!toastEl) return;
    window.clearTimeout(toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toastEl.classList.remove("is-visible");
    }, 2600);
  }

  function createEmptyMessage(message, extraClass = "") {
    const empty = document.createElement("p");
    empty.className = `empty-state ${extraClass}`.trim();
    empty.textContent = message;
    return empty;
  }

  function renderTags(container, tags, isEditing, path) {
    if (!container) return;
    container.hidden = false;
    container.innerHTML = "";

    if (isEditing) {
      const label = document.createElement("span");
      label.className = "tags-label";
      label.textContent = "标签";

      const input = document.createElement("div");
      input.className = "tags-input";
      input.setAttribute("contenteditable", "true");
      input.setAttribute("spellcheck", "false");
      input.setAttribute("data-bind", path);
      input.setAttribute("data-single-line", "");
      input.setAttribute("data-placeholder", "标签，用逗号分隔");
      input.textContent = tags.join("，");

      container.append(label, input);
      return;
    }

    tags.forEach((tag) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = tag;
      container.append(chip);
    });

    if (!tags.length) {
      container.hidden = true;
    } else {
      container.hidden = false;
    }
  }

  function makeEditable(scope) {
    $$("[data-bind], [data-note] [data-field]", scope).forEach((el) => {
      el.setAttribute("contenteditable", "true");
      el.setAttribute("spellcheck", "false");
    });
  }

  function makeReadonly(scope = document) {
    $$('[contenteditable="true"]', scope).forEach((el) => {
      el.removeAttribute("contenteditable");
    });
  }

  function createWorkItem(item, index) {
    const article = document.createElement("article");
    article.className = "work-item";
    article.setAttribute("data-work-item", "");
    article.dataset.index = String(index);

    article.innerHTML = `
      <div class="work-number" aria-hidden="true">${pad(index + 1)}</div>
      <div class="work-content">
        <div class="work-meta">
          <span class="work-phase" data-field="phase" data-bind="work.items.${index}.phase" data-single-line data-placeholder="阶段"></span>
          <span class="work-status" data-field="status" data-bind="work.items.${index}.status" data-single-line data-placeholder="状态"></span>
        </div>
        <h3 class="work-title" data-field="title" data-bind="work.items.${index}.title" data-single-line data-placeholder="工作标题"></h3>
        <p class="work-desc" data-field="description" data-bind="work.items.${index}.description" data-placeholder="描述这项工作：目标、你如何与 Agent 协作、你的判断是什么。"></p>
        <div class="work-tags" data-tags></div>
      </div>
      <button class="remove-item" type="button" data-remove-work aria-label="删除第 ${index + 1} 项工作">
        <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"/></svg>
      </button>
    `;

    $('[data-field="phase"]', article).textContent = item.phase;
    $('[data-field="status"]', article).textContent = item.status;
    $('[data-field="title"]', article).textContent = item.title;
    $('[data-field="description"]', article).textContent = item.description;

    renderTags($(".work-tags", article), item.tags, editing, `work.items.${index}.tags`);

    if (editing) {
      makeEditable(article);
      $(`[data-bind="work.items.${index}.tags"]`, article)?.setAttribute(
        "contenteditable",
        "true",
      );
    }

    return article;
  }

  function renderWorkList() {
    workList.innerHTML = "";
    workList.hidden = false;

    state.work.items.forEach((item, index) => {
      workList.append(createWorkItem(item, index));
    });

    if (!state.work.items.length) {
      workList.append(
        createEmptyMessage(
          editing ? "还没有工作条目，点击下方「添加一项工作」开始。" : "工作条目正在整理中。",
        ),
      );
    }

    if (editing) {
      makeEditable(workList);
    }
  }

  function renderAllTags(isEditing) {
    $$("[data-work-item]", workList).forEach((article, index) => {
      const item = state.work.items[index];
      if (!item) return;
      renderTags(
        $(".work-tags", article),
        item.tags,
        isEditing,
        `work.items.${index}.tags`,
      );
    });
  }

  function createMetric(metric, index) {
    const article = document.createElement("article");
    article.className = "metric";
    article.setAttribute("data-metric-item", "");
    article.dataset.index = String(index);

    article.innerHTML = `
      <div class="metric-top">
        <span class="metric-index" aria-hidden="true">${pad(index + 1)}</span>
        <button class="remove-metric" type="button" data-remove-metric aria-label="删除第 ${index + 1} 项指标">
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15"/></svg>
        </button>
      </div>
      <div class="metric-value" data-field="value" data-bind="outcomes.metrics.${index}.value" data-single-line data-placeholder="数字"></div>
      <h3 class="metric-label" data-field="label" data-bind="outcomes.metrics.${index}.label" data-single-line data-placeholder="指标名称"></h3>
      <p class="metric-note" data-field="note" data-bind="outcomes.metrics.${index}.note" data-placeholder="用一句话解释这个数字"></p>
    `;

    $('[data-field="value"]', article).textContent = metric.value;
    $('[data-field="label"]', article).textContent = metric.label;
    $('[data-field="note"]', article).textContent = metric.note;

    if (editing) makeEditable(article);
    return article;
  }

  function renderMetrics() {
    metricsList.innerHTML = "";

    state.outcomes.metrics.forEach((metric, index) => {
      metricsList.append(createMetric(metric, index));
    });

    if (!state.outcomes.metrics.length) {
      metricsList.append(
        createEmptyMessage(
          editing ? "还没有指标，点击下方「添加一项指标」开始。" : "成效数据正在整理中。",
        ),
      );
    }

    if (editing) makeEditable(metricsList);
  }

  function renderNote() {
    const title = $('[data-field="title"]', noteEl);
    const body = $('[data-field="body"]', noteEl);
    if (title) title.textContent = state.outcomes.note.title;
    if (body) body.textContent = state.outcomes.note.body;
  }

  function applyState() {
    const fixedBindings = {
      "work.heading": state.work.heading,
      "work.intro": state.work.intro,
      "outcomes.heading": state.outcomes.heading,
      "outcomes.intro": state.outcomes.intro,
    };

    Object.entries(fixedBindings).forEach(([path, value]) => {
      const el = $(`[data-bind="${path}"]`);
      if (el) el.textContent = value;
    });

    renderWorkList();
    renderMetrics();
    renderNote();
    updateFooterDate();

    if (editing) {
      makeEditable(workSection);
      makeEditable(outcomesSection);
      renderAllTags(true);
    }
  }

  function placeCaretAtEnd(el) {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const selection = window.getSelection();
    if (!selection) return;
    selection.removeAllRanges();
    selection.addRange(range);
  }

  function focusField(scope, selector) {
    window.requestAnimationFrame(() => {
      const el = $(selector, scope);
      if (!el) return;
      el.focus({ preventScroll: true });
      placeCaretAtEnd(el);
      if (typeof scope.scrollIntoView === "function") {
        scope.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  function setEditing(nextEditing) {
    if (editing === nextEditing) return;

    if (!nextEditing) {
      captureAllEdits(true);
      saveNow();
    }

    editing = nextEditing;
    document.body.classList.toggle("is-editing", editing);
    editToggle?.setAttribute("aria-pressed", String(editing));
    if (editLabel) editLabel.textContent = editing ? "完成编辑" : "编辑内容";
    if (editDock) editDock.hidden = !editing;

    if (editing) {
      makeEditable(workSection);
      makeEditable(outcomesSection);
      renderAllTags(true);
      setSaveStatus("saved", "已保存到本机");
      showToast("点击文字直接修改，改动会自动保存在本机");
    } else {
      renderAllTags(false);
      makeReadonly(workSection);
      makeReadonly(outcomesSection);
      showToast("修改已保存");
    }
  }

  function addWorkItem() {
    if (!editing) return;
    if (state.work.items.length >= MAX_WORK_ITEMS) {
      showToast(`最多可以添加 ${MAX_WORK_ITEMS} 项工作`);
      return;
    }

    state.work.items.push({
      phase: "新工作",
      status: "进行中",
      title: "未命名工作",
      description: "在这里写下你的目标、如何把任务交给 Agent，以及你在哪些节点做了判断。",
      tags: ["Trae", "DeepSeek Harness"],
    });

    renderWorkList();
    saveNow();
    const last = workList.lastElementChild;
    if (last) focusField(last, '[data-field="title"]');
    showToast("已添加一项工作，直接点击文字修改");
  }

  function addMetric() {
    if (!editing) return;
    if (state.outcomes.metrics.length >= MAX_METRICS) {
      showToast(`最多可以添加 ${MAX_METRICS} 项指标`);
      return;
    }

    state.outcomes.metrics.push({
      value: "新",
      label: "一项新指标",
      note: "用一句话解释这个数字代表什么，以及它是如何发生的。",
    });

    renderMetrics();
    saveNow();
    const last = metricsList.lastElementChild;
    if (last) focusField(last, '[data-field="value"]');
    showToast("已添加一项指标，直接点击文字修改");
  }

  function removeWorkItem(index) {
    const item = state.work.items[index];
    if (!item) return;
    const name = item.title || "未命名工作";
    if (!window.confirm(`删除「${name}」？删除后无法自动恢复。`)) return;

    state.work.items.splice(index, 1);
    renderWorkList();
    saveNow();
    showToast("工作条目已删除");
  }

  function removeMetric(index) {
    const metric = state.outcomes.metrics[index];
    if (!metric) return;
    const name = metric.label || "这项指标";
    if (!window.confirm(`删除「${name}」？删除后无法自动恢复。`)) return;

    state.outcomes.metrics.splice(index, 1);
    renderMetrics();
    saveNow();
    showToast("指标已删除");
  }

  function exportBackup() {
    captureAllEdits(true);
    saveNow();

    const payload = JSON.stringify(
      { ...state, exportedAt: new Date().toISOString() },
      null,
      2,
    );
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agent-worklog-${formatDate(new Date()).replace(/\./g, "-")}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);
    showToast("备份文件已导出");
  }

  function downloadPage() {
    const wasEditing = editing;

    // Render the clean, read-only version before serialising the document.
    if (wasEditing) setEditing(false);

    const clone = document.documentElement.cloneNode(true);
    const cloneBody = clone.querySelector("body");
    const cloneDock = clone.querySelector("[data-edit-dock]");
    const cloneToast = clone.querySelector("[data-toast]");
    const cloneEditLabel = clone.querySelector("[data-edit-label]");
    const cloneEditToggle = clone.querySelector("[data-edit-toggle]");
    const cloneHeader = clone.querySelector(".site-header");

    cloneBody?.classList.remove("is-editing");
    cloneDock?.setAttribute("hidden", "");
    cloneToast?.classList.remove("is-visible");
    if (cloneToast) cloneToast.textContent = "";
    if (cloneEditLabel) cloneEditLabel.textContent = "编辑内容";
    cloneEditToggle?.setAttribute("aria-pressed", "false");
    cloneHeader?.classList.remove("is-scrolled");

    clone.querySelectorAll("[contenteditable]").forEach((el) => {
      el.removeAttribute("contenteditable");
    });
    clone.querySelectorAll(".reveal").forEach((el) => {
      el.classList.remove("reveal-ready", "is-visible");
    });

    const html = `<!doctype html>\n${clone.outerHTML}`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "index.html";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1200);

    if (wasEditing) setEditing(true);
    showToast("网页已下载。替换文件夹里的 index.html 即可发布。");
  }

  async function importBackup(file) {
    if (!file) return;
    if (!window.confirm("导入备份会覆盖当前内容，确定继续吗？")) return;

    try {
      const raw = JSON.parse(await file.text());
      const nextState = normalizeState(raw);

      if (editing) {
        editing = false;
        document.body.classList.remove("is-editing");
        editToggle?.setAttribute("aria-pressed", "false");
        if (editLabel) editLabel.textContent = "编辑内容";
        if (editDock) editDock.hidden = true;
        makeReadonly(workSection);
        makeReadonly(outcomesSection);
      }

      state = nextState;
      applyState();
      saveNow();
      showToast("备份已导入并保存");
    } catch (error) {
      showToast("导入失败：请选择由本站导出的 JSON 备份");
    }
  }

  function resetToExample() {
    if (!window.confirm("恢复初始示例内容？你当前的修改将被覆盖。")) return;

    state = JSON.parse(JSON.stringify({ ...initialState, updatedAt: new Date().toISOString() }));
    applyState();
    saveNow();
    showToast("已恢复示例内容");
  }

  // Load a saved draft before wiring up the interface.
  let restoredDraft = false;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      state = normalizeState(JSON.parse(stored));
      restoredDraft = true;
    }
  } catch (error) {
    state = initialState;
  }

  state.updatedAt = state.updatedAt || new Date().toISOString();
  applyState();
  updateFooterDate();

  // Editing controls.
  editToggle?.addEventListener("click", () => setEditing(!editing));
  doneButton?.addEventListener("click", () => setEditing(false));

  document.querySelector("[data-add-work]")?.addEventListener("click", addWorkItem);
  document.querySelector("[data-add-metric]")?.addEventListener("click", addMetric);

  workList.addEventListener("click", (event) => {
    if (!editing) return;
    const removeButton = event.target.closest("[data-remove-work]");
    if (!removeButton) return;
    const item = removeButton.closest("[data-work-item]");
    if (!item) return;
    removeWorkItem(Number(item.dataset.index));
  });

  metricsList.addEventListener("click", (event) => {
    if (!editing) return;
    const removeButton = event.target.closest("[data-remove-metric]");
    if (!removeButton) return;
    const item = removeButton.closest("[data-metric-item]");
    if (!item) return;
    removeMetric(Number(item.dataset.index));
  });

  document.addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    switch (actionButton.dataset.action) {
      case "download-page":
        downloadPage();
        break;
      case "export":
        exportBackup();
        break;
      case "import":
        importInput?.click();
        break;
      case "reset":
        resetToExample();
        break;
      default:
        break;
    }
  });

  importInput?.addEventListener("change", () => {
    const file = importInput.files?.[0];
    importInput.value = "";
    importBackup(file);
  });

  document.addEventListener("input", (event) => {
    if (!editing) return;
    const el = event.target.closest("[data-bind], [data-note] [data-field]");
    if (!el) return;
    if (!workSection.contains(el) && !outcomesSection.contains(el)) return;

    captureElement(el, false);
    scheduleSave();
  });

  document.addEventListener("paste", (event) => {
    if (!editing) return;
    const el = event.target.closest('[contenteditable="true"]');
    if (!el) return;

    const clipboard = event.clipboardData || window.clipboardData;
    const pasted = clipboard?.getData("text/plain");
    if (!pasted) return;

    event.preventDefault();
    const clean = el.hasAttribute("data-single-line")
      ? pasted.replace(/\s+/g, " ")
      : pasted;

    if (document.execCommand) {
      document.execCommand("insertText", false, clean);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!editing || event.isComposing) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setEditing(false);
      editToggle?.focus();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      captureAllEdits(true);
      saveNow();
      showToast("已保存到本机");
      return;
    }

    if (event.key === "Enter") {
      const field = event.target.closest("[data-single-line]");
      if (field) {
        event.preventDefault();
        field.blur();
      }
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && editing) {
      captureAllEdits(true);
      saveNow();
    }
  });

  window.addEventListener("pagehide", () => {
    if (editing) {
      captureAllEdits(true);
      saveNow();
    }
  });

  // Navigation state.
  const navLinks = $$(".nav-link");
  const sections = ["agents", "work", "outcomes"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          navLinks.forEach((link) => {
            link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
          });
        });
      },
      { rootMargin: "-24% 0px -62% 0px", threshold: 0 },
    );
    sections.forEach((section) => spy.observe(section));
  }

  // Scroll-in reveal, added only after JS is ready so content stays visible without it.
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const revealItems = $$(".reveal");
    revealItems.forEach((item) => item.classList.add("reveal-ready"));
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const header = document.querySelector(".site-header");
  const onScroll = () => {
    header?.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  if (restoredDraft) {
    showToast("已恢复上次保存的内容");
  }

  // Convenience for previewing the editor: index.html?edit=1
  if (new URLSearchParams(window.location.search).get("edit") === "1") {
    window.setTimeout(() => {
      setEditing(true);
      showToast("编辑模式已开启，点击任意虚线文字即可修改");
    }, 320);
  }
})();
