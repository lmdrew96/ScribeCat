const DEFAULT_PRODUCT = { name: "ScribeCat", version: "0.1.0" };
const STORAGE_KEY = "scribecat:statusVisible";
const QUERY_KEY = "status";
const HEALTH_INTERVAL_MS = 30000;

function parseGitMeta() {
  const meta = document.querySelector('meta[name="git"]');
  const fallback = { branch: "unknown", sha: "unknown" };
  if (!meta) return fallback;
  const content = meta.getAttribute("content") || "";
  const result = { ...fallback };
  content
    .split(";")
    .map((segment) => segment.trim())
    .forEach((segment) => {
      if (!segment) return;
      const [rawKey, rawValue] = segment.split("=");
      const key = rawKey?.trim();
      const value = rawValue?.trim();
      if (!key || !value) return;
      if (key === "branch") {
        result.branch = value;
      } else if (key === "sha") {
        result.sha = value;
      }
    });
  return result;
}

function normalizeShowFlag(value, fallback = true) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["false", "0", "off"].includes(normalized)) return false;
    if (["true", "1", "on"].includes(normalized)) return true;
  }
  return fallback;
}

function getStoredVisibility() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "true") return true;
    if (value === "false") return false;
  } catch {}
  return null;
}

function setStoredVisibility(visible) {
  try {
    window.localStorage.setItem(STORAGE_KEY, visible ? "true" : "false");
  } catch {}
}

function getForcedVisibility() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (!params.has(QUERY_KEY)) return null;
    const value = params.get(QUERY_KEY) || "";
    if (value === "1" || value.toLowerCase() === "true") return true;
    if (value === "0" || value.toLowerCase() === "false") return false;
  } catch {}
  return null;
}

function createOverlay(root) {
  const container = document.createElement("div");
  container.className = "status-overlay";
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-hidden", "true");

  const metaRow = document.createElement("div");
  metaRow.className = "status-overlay__meta";

  const productEl = document.createElement("span");
  productEl.className = "status-overlay__product";
  productEl.textContent = `${DEFAULT_PRODUCT.name}@${DEFAULT_PRODUCT.version}`;

  const gitEl = document.createElement("span");
  gitEl.className = "status-overlay__git";
  gitEl.textContent = "unknown@unknown";

  metaRow.append(productEl, gitEl);

  const healthRow = document.createElement("div");
  healthRow.className = "status-overlay__health";

  const dotEl = document.createElement("span");
  dotEl.className = "status-overlay__dot";
  dotEl.dataset.state = "checking";
  dotEl.setAttribute("aria-hidden", "true");

  const labelEl = document.createElement("span");
  labelEl.className = "status-overlay__label";
  labelEl.textContent = "Checking health…";

  healthRow.append(dotEl, labelEl);

  const timeRow = document.createElement("div");
  timeRow.className = "status-overlay__time";
  const timePrefix = document.createElement("span");
  timePrefix.className = "status-overlay__time-prefix";
  timePrefix.textContent = "Last checked";
  const timeEl = document.createElement("time");
  timeEl.className = "status-overlay__time-value";
  timeEl.textContent = "—";
  timeRow.append(timePrefix, document.createTextNode(" "), timeEl);

  container.append(metaRow, healthRow, timeRow);
  root.appendChild(container);

  return {
    container,
    productEl,
    gitEl,
    dotEl,
    labelEl,
    timeEl,
  };
}

function determineHealthUrl() {
  try {
    const origin = window.location.origin || "";
    if (origin.startsWith("http://localhost:1420") || origin.startsWith("https://localhost:1420")) {
      return "http://localhost:1420/health";
    }
    return `${origin.replace(/\/$/, "")}/health`;
  } catch {
    return "/health";
  }
}

function formatTimeString(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return { text: "—", iso: "" };
  return { text: date.toLocaleTimeString(), iso: date.toISOString() };
}

export function initStatusOverlay(options = {}) {
  const rootId = options.rootId || "status-root";
  const root = document.getElementById(rootId);
  if (!root) return;

  root.dataset.visible = "false";

  const elements = createOverlay(root);
  const git = parseGitMeta();
  elements.gitEl.textContent = `${git.branch}@${git.sha}`;

  let visible = false;
  let healthTimer = null;
  const healthUrl = determineHealthUrl();

  function updateVisibility(next, opts = {}) {
    const shouldPersist = opts.persist ?? true;
    const nextValue = Boolean(next);
    if (visible !== nextValue) {
      visible = nextValue;
    }
    root.dataset.visible = visible ? "true" : "false";
    elements.container.setAttribute("aria-hidden", visible ? "false" : "true");
    if (shouldPersist) {
      setStoredVisibility(visible);
    }
  }

  function handleToggle(event) {
    if (event.defaultPrevented) return;
    if (event.key !== "`") return;
    if (!event.metaKey && !event.ctrlKey) return;
    if (event.altKey || event.shiftKey) return;
    const target = event.target;
    if (target && typeof target === "object") {
      const element = target instanceof HTMLElement ? target : null;
      if (element) {
        const editable = element.closest("input, textarea, select, [contenteditable=true]");
        if (editable) return;
        if (element.isContentEditable) return;
      }
    }
    event.preventDefault();
    updateVisibility(!visible);
  }

  function setHealthState(state, label, checkedAt = null) {
    elements.dotEl.dataset.state = state;
    elements.labelEl.textContent = label;
    const { text, iso } = formatTimeString(checkedAt);
    elements.timeEl.textContent = text;
    if (iso) {
      elements.timeEl.dateTime = iso;
    } else {
      elements.timeEl.removeAttribute("datetime");
    }
  }

  async function checkHealth() {
    setHealthState("checking", "Checking health…");
    try {
      const response = await fetch(`${healthUrl}?ts=${Date.now()}`, {
        cache: "no-store",
        credentials: "omit",
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      let payload = null;
      try {
        payload = await response.json();
      } catch {}
      const now = new Date();
      if (!payload || payload.ok !== false) {
        let timestamp = now;
        if (payload?.ts) {
          const parsed = new Date(payload.ts);
          if (!Number.isNaN(parsed.getTime())) {
            timestamp = parsed;
          }
        }
        setHealthState("ok", "Healthy", timestamp);
      } else {
        setHealthState("error", "Unhealthy", now);
      }
    } catch {
      setHealthState("error", "Unreachable", new Date());
    }
  }

  function startHealthPolling() {
    if (healthTimer) window.clearTimeout(healthTimer);
    const run = async () => {
      await checkHealth();
      healthTimer = window.setTimeout(run, HEALTH_INTERVAL_MS);
    };
    run();
  }

  document.addEventListener("keydown", handleToggle);

  const forced = getForcedVisibility();
  const stored = forced === null ? getStoredVisibility() : null;
  if (forced !== null) {
    updateVisibility(forced, { persist: true });
  } else if (stored !== null) {
    updateVisibility(stored, { persist: false });
  }

  (async () => {
    try {
      const response = await fetch(`/version.json?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        const name = data.productName || data.name || DEFAULT_PRODUCT.name;
        const version = data.version || DEFAULT_PRODUCT.version;
        elements.productEl.textContent = `${name}@${version}`;
        const defaultVisible = normalizeShowFlag(data.showStatusOverlay, true);
        if (forced === null && stored === null) {
          updateVisibility(defaultVisible, { persist: false });
        }
      } else {
        elements.productEl.textContent = `${DEFAULT_PRODUCT.name}@${DEFAULT_PRODUCT.version}`;
        if (forced === null && stored === null) {
          updateVisibility(true, { persist: false });
        }
      }
    } catch {
      elements.productEl.textContent = `${DEFAULT_PRODUCT.name}@${DEFAULT_PRODUCT.version}`;
      if (forced === null && stored === null) {
        updateVisibility(true, { persist: false });
      }
    }
  })();

  startHealthPolling();
}
