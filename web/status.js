const DEFAULT_PRODUCT = { name: "ScribeCat", version: "0.3.0" };
const STORAGE_KEY = "scribecat:statusVisible";
const COLLAPSE_STORAGE_KEY = "scribecat:statusCollapsed";
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
  container.dataset.collapsed = "false";

  const contentEl = document.createElement("div");
  contentEl.className = "status-overlay__content";

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

  const micRow = document.createElement("div");
  micRow.className = "status-overlay__mic";
  const micDot = document.createElement("span");
  micDot.className = "status-overlay__mic-dot";
  micDot.dataset.state = "idle";
  micDot.setAttribute("aria-hidden", "true");
  const micLabel = document.createElement("span");
  micLabel.className = "status-overlay__mic-label";
  micLabel.textContent = "Mic idle";
  const micTime = document.createElement("time");
  micTime.className = "status-overlay__mic-time";
  micTime.textContent = "—";
  micTime.dataset.empty = "true";
  micRow.append(micDot, micLabel, micTime);

  const timeRow = document.createElement("div");
  timeRow.className = "status-overlay__time";
  const timePrefix = document.createElement("span");
  timePrefix.className = "status-overlay__time-prefix";
  timePrefix.textContent = "Last checked";
  const timeEl = document.createElement("time");
  timeEl.className = "status-overlay__time-value";
  timeEl.textContent = "—";
  timeRow.append(timePrefix, document.createTextNode(" "), timeEl);

  contentEl.append(metaRow, healthRow, micRow, timeRow);

  const collapsedEl = document.createElement("div");
  collapsedEl.className = "status-overlay__collapsed";
  collapsedEl.hidden = true;
  const collapsedDot = document.createElement("span");
  collapsedDot.className = "status-overlay__collapsed-dot";
  collapsedDot.dataset.state = "checking";
  collapsedDot.setAttribute("aria-hidden", "true");
  const collapsedLabel = document.createElement("span");
  collapsedLabel.className = "status-overlay__collapsed-label visually-hidden";
  collapsedLabel.textContent = "Checking health…";
  collapsedEl.append(collapsedDot, collapsedLabel);

  const toggleBtn = document.createElement("button");
  toggleBtn.type = "button";
  toggleBtn.className = "status-overlay__toggle";
  toggleBtn.setAttribute("aria-label", "Toggle status panel");
  toggleBtn.setAttribute("aria-pressed", "false");
  const toggleIcon = document.createElement("span");
  toggleIcon.className = "status-overlay__toggle-icon";
  toggleIcon.setAttribute("aria-hidden", "true");
  toggleBtn.append(toggleIcon);

  container.append(contentEl, collapsedEl, toggleBtn);
  root.appendChild(container);

  return {
    container,
    contentEl,
    collapsedEl,
    collapsedDot,
    collapsedLabel,
    toggleBtn,
    productEl,
    gitEl,
    dotEl,
    labelEl,
    micDot,
    micLabel,
    micTimeEl: micTime,
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

function determineDefaultVisibility() {
  try {
    const { protocol, hostname, port } = window.location;
    if (protocol === "http:" || protocol === "https:") {
      const localHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"];
      if (localHosts.includes(hostname)) {
        return true;
      }
      if (port && Number.parseInt(port, 10) === 1420) {
        return true;
      }
    }
  } catch {}
  return false;
}

function formatTimeString(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return { text: "—", iso: "" };
  return { text: date.toLocaleTimeString(), iso: date.toISOString() };
}

function getStoredCollapsed() {
  try {
    const value = window.localStorage.getItem(COLLAPSE_STORAGE_KEY);
    if (value === "1") return true;
    if (value === "0") return false;
  } catch {}
  return null;
}

function setStoredCollapsed(collapsed) {
  try {
    window.localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? "1" : "0");
  } catch {}
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
  let collapsed = false;
  let healthTimer = null;
  const healthUrl = determineHealthUrl();
  const envDefaultVisible = determineDefaultVisibility();
  const micLabels = {
    idle: "Mic idle",
    recording: "Recording…",
    processing: "Transcribing…",
    transcribed: "Transcript ready",
    error: "Mic error",
  };
  const allowedMicStates = new Set(["idle", "recording", "processing", "transcribed", "error"]);
  let micState = "idle";

  function setMicState(state, message, eventTime) {
    const nextState = allowedMicStates.has(state) ? state : "idle";
    micState = nextState;
    if (elements.micDot) {
      elements.micDot.dataset.state = nextState;
    }
    if (elements.micLabel) {
      const fallback = micLabels[nextState] || micLabels.idle;
      let labelText = fallback;
      let providedMessage = message;
      let timestamp = eventTime;
      if (providedMessage instanceof Date && typeof timestamp === "undefined") {
        timestamp = providedMessage;
        providedMessage = undefined;
      }
      if (typeof providedMessage === "string" && providedMessage.trim().length > 0) {
        labelText = providedMessage.trim();
      }
      const validTime = timestamp instanceof Date && !Number.isNaN(timestamp.getTime()) ? timestamp : new Date();
      elements.micLabel.textContent = labelText;
      if (elements.micTimeEl) {
        const { text, iso } = formatTimeString(validTime);
        elements.micTimeEl.textContent = text;
        elements.micTimeEl.dataset.empty = iso ? "false" : "true";
        if (iso) {
          elements.micTimeEl.dateTime = iso;
        } else {
          elements.micTimeEl.removeAttribute("datetime");
        }
      }
    }
  }

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
    if (elements.collapsedDot) {
      elements.collapsedDot.dataset.state = state;
    }
    if (elements.collapsedLabel) {
      elements.collapsedLabel.textContent = label;
    }
    const { text, iso } = formatTimeString(checkedAt);
    elements.timeEl.textContent = text;
    if (iso) {
      elements.timeEl.dateTime = iso;
    } else {
      elements.timeEl.removeAttribute("datetime");
    }
  }

  function applyCollapsed(next, opts = {}) {
    const shouldPersist = opts.persist ?? true;
    const nextValue = Boolean(next);
    if (collapsed !== nextValue) {
      collapsed = nextValue;
    }
    if (elements.container) {
      elements.container.dataset.collapsed = collapsed ? "true" : "false";
      elements.container.setAttribute("aria-expanded", collapsed ? "false" : "true");
    }
    if (elements.contentEl) {
      elements.contentEl.hidden = collapsed;
    }
    if (elements.collapsedEl) {
      elements.collapsedEl.hidden = !collapsed;
    }
    if (elements.toggleBtn) {
      elements.toggleBtn.setAttribute("aria-pressed", collapsed ? "true" : "false");
    }
    if (shouldPersist) {
      setStoredCollapsed(collapsed);
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

  if (elements.toggleBtn) {
    elements.toggleBtn.addEventListener("click", () => {
      applyCollapsed(!collapsed);
    });
  }

  const forced = getForcedVisibility();
  const stored = forced === null ? getStoredVisibility() : null;
  const storedCollapsed = getStoredCollapsed();
  if (forced !== null) {
    updateVisibility(forced, { persist: true });
  } else if (stored !== null) {
    updateVisibility(stored, { persist: false });
  } else {
    updateVisibility(envDefaultVisible, { persist: false });
  }

  if (storedCollapsed !== null) {
    applyCollapsed(storedCollapsed, { persist: false });
  } else {
    applyCollapsed(false, { persist: false });
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
        const defaultVisible = normalizeShowFlag(data.showStatusOverlay, envDefaultVisible);
        if (forced === null && stored === null) {
          updateVisibility(defaultVisible, { persist: false });
        }
      } else {
        elements.productEl.textContent = `${DEFAULT_PRODUCT.name}@${DEFAULT_PRODUCT.version}`;
        if (forced === null && stored === null) {
          updateVisibility(envDefaultVisible, { persist: false });
        }
      }
    } catch {
      elements.productEl.textContent = `${DEFAULT_PRODUCT.name}@${DEFAULT_PRODUCT.version}`;
      if (forced === null && stored === null) {
        updateVisibility(envDefaultVisible, { persist: false });
      }
    }
  })();

  startHealthPolling();
  setMicState("idle");

  return {
    setMicState,
    updateVisibility,
    getMicState: () => micState,
    setCollapsed: (next, opts) => applyCollapsed(next, opts),
    isCollapsed: () => collapsed,
  };
}
