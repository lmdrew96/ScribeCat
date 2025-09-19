const DEFAULT_PRODUCT = { name: "ScribeCat", version: "0.2.0" };
const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
const STATUS_KEYS = ["internet", "static"];

const productNameEl = document.getElementById("productName");
const productVersionEl = document.getElementById("productVersion");
const statusButton = document.querySelector("[data-status-button]");
const dialogRoot = document.querySelector("[data-status-dialog]");
const dialogPanel = dialogRoot?.querySelector(".status-dialog__panel");
const dialogClose = dialogRoot?.querySelector("[data-status-close]");
const statusRefresh = dialogRoot?.querySelector("[data-status-refresh]");
const notesField = document.getElementById("notesField");

const statusRegistry = buildStatusRegistry(STATUS_KEYS);
const statusState = new Map();

let dialogOpen = false;
let lastFocusedElement = null;

function buildStatusRegistry(keys) {
  const registry = {};
  for (const key of keys) {
    const summary = document.querySelector(`.status-chip[data-status="${key}"]`);
    const summaryMessage = summary?.querySelector("[data-status-summary]");
    const detailRow = dialogRoot?.querySelector(`.status-list__row[data-status="${key}"]`);
    const detailMessage = detailRow?.querySelector("[data-status-detail]");
    const timeEl = detailRow?.querySelector("[data-status-time]");
    registry[key] = { summary, summaryMessage, detailRow, detailMessage, timeEl };
  }
  return registry;
}

function applyProduct(name, version) {
  if (productNameEl) {
    productNameEl.textContent = name;
  }
  if (productVersionEl) {
    productVersionEl.textContent = version;
  }
}

function formatTimestamp(date) {
  try {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch (error) {
    return date.toLocaleTimeString();
  }
}

function parseTimestamp(value) {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

function applyStatus(key, state, message, timestamp = null) {
  const entry = statusRegistry[key];
  if (!entry) return;

  const resolvedTimestamp = timestamp instanceof Date ? timestamp : timestamp ? parseTimestamp(timestamp) : null;

  if (entry.summary) {
    entry.summary.dataset.state = state;
  }
  if (entry.detailRow) {
    entry.detailRow.dataset.state = state;
  }
  if (entry.summaryMessage) {
    entry.summaryMessage.textContent = message;
  }
  if (entry.detailMessage) {
    entry.detailMessage.textContent = message;
  }
  if (entry.timeEl) {
    if (resolvedTimestamp) {
      entry.timeEl.textContent = formatTimestamp(resolvedTimestamp);
      entry.timeEl.dateTime = resolvedTimestamp.toISOString();
    } else {
      entry.timeEl.textContent = "—";
      entry.timeEl.removeAttribute("datetime");
    }
  }
  statusState.set(key, {
    state,
    message,
    timestamp: resolvedTimestamp ? resolvedTimestamp.toISOString() : null,
  });
}

function markChecking(key) {
  applyStatus(key, "checking", "Checking…", null);
}

function setStatus(key, state, message, timestamp = new Date()) {
  applyStatus(key, state, message, timestamp);
}

async function checkInternet() {
  markChecking("internet");
  try {
    await fetch("https://example.com/", { mode: "no-cors" });
    setStatus("internet", "online", "Online");
  } catch (error) {
    console.warn("Internet check failed", error);
    setStatus("internet", "offline", "Offline");
  }
}

async function checkStatic() {
  markChecking("static");
  try {
    const response = await fetch(`/health?ts=${Date.now()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (payload && payload.ok) {
      const timestamp = payload.ts ? parseTimestamp(payload.ts) : new Date();
      setStatus("static", "online", "Online", timestamp);
      return;
    }
    throw new Error("Invalid health payload");
  } catch (error) {
    console.warn("Static server check failed", error);
    setStatus("static", "offline", "Offline");
  }
}

function runChecks(reason = "manual") {
  if (reason !== "initial") {
    console.info("Running status checks (%s)", reason);
  }
  return Promise.allSettled([checkInternet(), checkStatic()]);
}

function openDialog() {
  if (!dialogRoot || !dialogPanel || dialogOpen) return;
  dialogOpen = true;
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialogRoot.hidden = false;
  document.body.dataset.dialogOpen = "true";
  if (statusButton) {
    statusButton.setAttribute("aria-expanded", "true");
  }
  dialogRoot.addEventListener("click", handleDialogRootClick);
  document.addEventListener("keydown", handleDialogKeydown);
  dialogPanel.addEventListener("keydown", trapDialogFocus);

  const focusTarget =
    dialogPanel.querySelector("[data-status-close]") ||
    dialogPanel.querySelector(FOCUSABLE_SELECTORS) ||
    dialogPanel;

  requestAnimationFrame(() => {
    focusTarget.focus({ preventScroll: true });
  });
}

function closeDialog() {
  if (!dialogRoot || !dialogPanel || !dialogOpen) return;
  dialogOpen = false;
  dialogRoot.hidden = true;
  delete document.body.dataset.dialogOpen;
  if (statusButton) {
    statusButton.setAttribute("aria-expanded", "false");
  }
  dialogRoot.removeEventListener("click", handleDialogRootClick);
  document.removeEventListener("keydown", handleDialogKeydown);
  dialogPanel.removeEventListener("keydown", trapDialogFocus);

  const focusTarget = lastFocusedElement;
  lastFocusedElement = null;
  if (focusTarget && typeof focusTarget.focus === "function") {
    requestAnimationFrame(() => {
      focusTarget.focus({ preventScroll: true });
    });
  }
}

function toggleDialog(force) {
  if (force === true) {
    openDialog();
    return;
  }
  if (force === false) {
    closeDialog();
    return;
  }
  if (dialogOpen) {
    closeDialog();
  } else {
    openDialog();
  }
}

function handleDialogRootClick(event) {
  if (!dialogOpen) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.dataset.statusDismiss !== undefined) {
    event.preventDefault();
    closeDialog();
  }
}

function handleDialogKeydown(event) {
  if (!dialogOpen) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeDialog();
  }
}

function trapDialogFocus(event) {
  if (!dialogOpen || event.key !== "Tab") return;
  const focusable = Array.from(dialogPanel.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
    (element) => !element.hasAttribute("disabled") && element.getAttribute("aria-hidden") !== "true"
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  } else if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  }
}

function handleShortcut(event) {
  if (event.defaultPrevented || event.isComposing) return;
  if (!(event.metaKey || event.ctrlKey)) return;

  const key = event.key.toLowerCase();

  if (key === "enter" && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    toggleDialog();
    return;
  }

  if ((key === "." || event.code === "Period") && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    runChecks("shortcut");
    return;
  }

  if (key === "n" && event.shiftKey && !event.altKey) {
    event.preventDefault();
    focusNotes();
  }
}

function focusNotes() {
  if (notesField) {
    notesField.focus({ preventScroll: false });
  }
}

function setupNotesField() {
  if (!notesField) return;
  notesField.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const start = notesField.selectionStart ?? 0;
    const end = notesField.selectionEnd ?? 0;
    const value = notesField.value;

    if (event.shiftKey) {
      if (start === end) {
        const { text, caret } = unindentAtCaret(value, start);
        notesField.value = text;
        notesField.selectionStart = caret;
        notesField.selectionEnd = caret;
      } else {
        const { text, selectionStart, selectionEnd } = unindentSelection(value, start, end);
        notesField.value = text;
        notesField.selectionStart = selectionStart;
        notesField.selectionEnd = selectionEnd;
      }
      return;
    }

    if (start === end) {
      const tab = "\t";
      notesField.value = value.slice(0, start) + tab + value.slice(end);
      const caret = start + tab.length;
      notesField.selectionStart = caret;
      notesField.selectionEnd = caret;
    } else {
      const { text, selectionStart, selectionEnd } = indentSelection(value, start, end);
      notesField.value = text;
      notesField.selectionStart = selectionStart;
      notesField.selectionEnd = selectionEnd;
    }
  });
}

function unindentAtCaret(value, caret) {
  if (caret <= 0) {
    return { text: value, caret };
  }
  const lookBehind = value.slice(Math.max(0, caret - 4), caret);
  if (lookBehind.endsWith("\t")) {
    return {
      text: value.slice(0, caret - 1) + value.slice(caret),
      caret: caret - 1,
    };
  }
  if (lookBehind.endsWith("    ")) {
    return {
      text: value.slice(0, caret - 4) + value.slice(caret),
      caret: caret - 4,
    };
  }
  return { text: value, caret };
}

function indentSelection(value, start, end) {
  const selected = value.slice(start, end);
  const lines = selected.split("\n");
  const indented = lines.map((line) => "\t" + line).join("\n");
  const text = value.slice(0, start) + indented + value.slice(end);
  return {
    text,
    selectionStart: start,
    selectionEnd: start + indented.length,
  };
}

function unindentSelection(value, start, end) {
  const selected = value.slice(start, end);
  const lines = selected.split("\n");
  let removedFromFirst = 0;
  const adjusted = lines.map((line, index) => {
    if (line.startsWith("\t")) {
      if (index === 0) removedFromFirst = 1;
      return line.slice(1);
    }
    if (line.startsWith("    ")) {
      if (index === 0) removedFromFirst = 4;
      return line.slice(4);
    }
    return line;
  });
  const replacement = adjusted.join("\n");
  const text = value.slice(0, start) + replacement + value.slice(end);
  const selectionStart = start - removedFromFirst;
  return {
    text,
    selectionStart: selectionStart < 0 ? 0 : selectionStart,
    selectionEnd: selectionStart + replacement.length,
  };
}

async function loadVersionMetadata() {
  try {
    const response = await fetch(`/version.json?ts=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const name = data.productName || data.name || DEFAULT_PRODUCT.name;
    const version = data.version || DEFAULT_PRODUCT.version;
    applyProduct(name, version);
  } catch (error) {
    console.warn("Falling back to bundled version metadata", error);
    applyProduct(DEFAULT_PRODUCT.name, DEFAULT_PRODUCT.version);
  }
}

if (statusButton) {
  statusButton.addEventListener("click", () => toggleDialog());
}
if (dialogClose) {
  dialogClose.addEventListener("click", () => closeDialog());
}
if (statusRefresh) {
  statusRefresh.addEventListener("click", () => runChecks("dialog"));
}

document.addEventListener("keydown", handleShortcut);
setupNotesField();
loadVersionMetadata();
runChecks("initial");
setInterval(() => {
  runChecks("interval");
}, 60000);

export {};
