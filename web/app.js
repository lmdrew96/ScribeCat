const DEFAULT_PRODUCT = { name: "ScribeCat", version: "0.1.0" };
const THEME_STORAGE_KEY = "scribe-theme";
const LOG_LIMIT = 60;
const ROUTES = new Set(["dashboard", "logs", "about"]);

const logEntries = [];
const statusTargets = new Map();

let logListEl = null;
let logPanelEl = null;
let logOriginEl = null;
let logHostEl = null;
let logFallbackEl = null;
let appShellEl = null;
let themeToggleBtn = null;
let hotkeyOverlayEl = null;
let hasExplicitTheme = false;
let currentTheme = "light";
let currentProduct = { ...DEFAULT_PRODUCT };

function formatConsoleArguments(args) {
  return args
    .map((arg) => {
      if (typeof arg === "string") return arg;
      if (arg instanceof Error) return arg.message || String(arg);
      if (typeof arg === "object") {
        try {
          return JSON.stringify(arg);
        } catch (err) {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(" ")
    .trim();
}

function createLogElement(entry) {
  const li = document.createElement("li");
  li.className = "log-entry";
  li.dataset.level = entry.level;

  const timeEl = document.createElement("time");
  timeEl.className = "log-time";
  timeEl.dateTime = entry.ts.toISOString();
  timeEl.textContent = entry.ts.toLocaleTimeString();

  const levelEl = document.createElement("span");
  levelEl.className = "log-level";
  levelEl.textContent = entry.level.toUpperCase();

  const messageEl = document.createElement("span");
  messageEl.className = "log-message";
  messageEl.textContent = entry.message;

  li.append(timeEl, levelEl, messageEl);
  return li;
}

function renderLogs() {
  if (!logListEl) return;
  logListEl.innerHTML = "";
  if (logEntries.length === 0) {
    const placeholder = document.createElement("li");
    placeholder.className = "log-empty";
    placeholder.textContent = "No logs yet.";
    logListEl.appendChild(placeholder);
    return;
  }
  for (const entry of logEntries) {
    logListEl.appendChild(createLogElement(entry));
  }
  scrollLogsToBottom();
}

function scrollLogsToBottom() {
  if (!logListEl) return;
  logListEl.scrollTop = logListEl.scrollHeight;
}

function addLogEntry(level, message) {
  const text = (message ?? "").toString().trim() || level.toUpperCase();
  const entry = { level, message: text, ts: new Date() };
  logEntries.push(entry);
  if (logEntries.length > LOG_LIMIT) {
    logEntries.splice(0, logEntries.length - LOG_LIMIT);
  }
  renderLogs();
}

function clearLogs() {
  logEntries.length = 0;
  renderLogs();
  addLogEntry("info", "Logs cleared.");
}

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

["log", "info", "warn", "error"].forEach((level) => {
  console[level] = (...args) => {
    try {
      const text = formatConsoleArguments(args);
      addLogEntry(level, text);
    } catch (err) {
      originalConsole.warn("Failed to record log entry", err);
    }
    originalConsole[level](...args);
  };
});

function setStatus(key, state, message) {
  const target = statusTargets.get(key);
  if (!target) return;
  target.card.dataset.state = state;
  if (target.messageEl) {
    target.messageEl.textContent = message;
  }
  if (target.timeEl) {
    if (state === "checking") {
      target.timeEl.textContent = "—";
      target.timeEl.removeAttribute("datetime");
    } else {
      const now = new Date();
      target.timeEl.textContent = now.toLocaleTimeString();
      target.timeEl.dateTime = now.toISOString();
    }
  }
}

function refreshAppStatusMessage() {
  const target = statusTargets.get("app");
  if (!target || target.card.dataset.state !== "ok") return;
  target.messageEl.textContent = `Ready • ${currentProduct.name} ${currentProduct.version}`;
}

function applyProduct(name, version) {
  currentProduct = { name, version };
  const nameEl = document.getElementById("productName");
  const versionEl = document.getElementById("productVersion");
  if (nameEl) nameEl.textContent = name;
  if (versionEl) versionEl.textContent = version;
  refreshAppStatusMessage();
}

async function loadVersion() {
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
    addLogEntry("info", `Loaded version metadata (${name} ${version}).`);
  } catch (error) {
    applyProduct(DEFAULT_PRODUCT.name, DEFAULT_PRODUCT.version);
    addLogEntry("warn", "Using fallback version metadata.");
  }
}

function markAppReady() {
  setStatus("app", "ok", "Ready");
  refreshAppStatusMessage();
  addLogEntry("info", "Application shell ready.");
}

async function checkInternet() {
  setStatus("internet", "checking", "Checking connectivity…");
  try {
    await fetch("https://example.com/", { mode: "no-cors" });
    setStatus("internet", "ok", "Reachable");
    addLogEntry("info", "Internet reachable.");
  } catch (error) {
    setStatus("internet", "error", "Unreachable");
    addLogEntry("error", `Internet unreachable (${error.message || error}).`);
  }
}

async function checkStatic() {
  setStatus("static", "checking", "Checking server health…");
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
      setStatus("static", "ok", "Online");
      addLogEntry("info", "Static server responded with ok=true.");
    } else {
      setStatus("static", "error", "Down");
      addLogEntry("warn", "Static server responded without ok=true.");
    }
  } catch (error) {
    setStatus("static", "error", "Down");
    addLogEntry("error", `Static server check failed (${error.message || error}).`);
  }
}

function runAllChecks(reason = "manual") {
  if (reason !== "initial") {
    addLogEntry("info", "Running status checks…");
  }
  return Promise.allSettled([checkInternet(), checkStatic()]);
}

function normalizeHash(hash) {
  const trimmed = (hash || "").replace(/^#/, "").toLowerCase();
  if (ROUTES.has(trimmed)) return trimmed;
  return "dashboard";
}

function placeLogPanel(route) {
  if (!logPanelEl) return;
  if (route === "logs" && logHostEl && logPanelEl.parentElement !== logHostEl) {
    logHostEl.appendChild(logPanelEl);
  } else if (route !== "logs" && logOriginEl && logPanelEl.parentElement !== logOriginEl) {
    logOriginEl.appendChild(logPanelEl);
  }
}

function applyRoute(hash) {
  const route = normalizeHash(hash);
  const sections = document.querySelectorAll("[data-view]");
  sections.forEach((section) => {
    section.hidden = section.dataset.view !== route;
  });
  const links = document.querySelectorAll("[data-nav]");
  links.forEach((link) => {
    const isActive = link.dataset.nav === route;
    link.classList.toggle("is-active", isActive);
    if (isActive) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });
  if (appShellEl) {
    appShellEl.dataset.route = route;
  }
  placeLogPanel(route);
}

function applyTheme(theme) {
  currentTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = currentTheme;
  document.documentElement.style.colorScheme = currentTheme;
  if (themeToggleBtn) {
    themeToggleBtn.textContent = currentTheme === "dark" ? "🌙" : "☀︎";
    themeToggleBtn.setAttribute("aria-pressed", currentTheme === "dark" ? "true" : "false");
  }
}

function initTheme() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    hasExplicitTheme = true;
    applyTheme(stored);
  } else {
    applyTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", (event) => {
    if (hasExplicitTheme) return;
    applyTheme(event.matches ? "dark" : "light");
  });
}

function toggleTheme() {
  const next = currentTheme === "dark" ? "light" : "dark";
  hasExplicitTheme = true;
  localStorage.setItem(THEME_STORAGE_KEY, next);
  applyTheme(next);
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const interactive = target.closest("input, textarea, select");
  return Boolean(interactive);
}

function toggleHotkeyOverlay(force) {
  if (!hotkeyOverlayEl) return;
  const shouldShow = force ?? hotkeyOverlayEl.hidden;
  hotkeyOverlayEl.hidden = !shouldShow;
  hotkeyOverlayEl.setAttribute("aria-hidden", hotkeyOverlayEl.hidden ? "true" : "false");
}

function hideHotkeyOverlay() {
  if (!hotkeyOverlayEl) return;
  hotkeyOverlayEl.hidden = true;
  hotkeyOverlayEl.setAttribute("aria-hidden", "true");
}

function handleKeydown(event) {
  if (event.defaultPrevented) return;
  const key = event.key;
  if (key === "?" && !isTypingTarget(event.target)) {
    event.preventDefault();
    toggleHotkeyOverlay();
    return;
  }
  if (key === "Escape" && hotkeyOverlayEl && !hotkeyOverlayEl.hidden) {
    hideHotkeyOverlay();
    return;
  }
  if (isTypingTarget(event.target)) return;
  const lower = key.toLowerCase();
  if (lower === "t") {
    event.preventDefault();
    toggleTheme();
  } else if (lower === "r") {
    event.preventDefault();
    runAllChecks();
  } else if (lower === "l") {
    event.preventDefault();
    clearLogs();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  appShellEl = document.querySelector(".app-shell");
  themeToggleBtn = document.getElementById("themeToggle");
  hotkeyOverlayEl = document.getElementById("hotkeyOverlay");
  logListEl = document.querySelector("[data-log-list]");
  logPanelEl = document.getElementById("logPanel");
  logOriginEl = logPanelEl ? logPanelEl.parentElement : null;
  logHostEl = document.querySelector("[data-log-host]");
  logFallbackEl = document.querySelector("[data-log-fallback]");
  if (logFallbackEl) {
    logFallbackEl.hidden = Boolean(logPanelEl && logHostEl);
  }

  document.querySelectorAll("[data-status-card]").forEach((card) => {
    const key = card.getAttribute("data-status-card");
    statusTargets.set(key, {
      card,
      messageEl: card.querySelector("[data-status-message]"),
      timeEl: card.querySelector("[data-status-time]"),
    });
  });

  renderLogs();
  applyProduct(DEFAULT_PRODUCT.name, DEFAULT_PRODUCT.version);
  initTheme();

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", toggleTheme);
  }
  const rerunBtn = document.getElementById("rerunChecks");
  if (rerunBtn) {
    rerunBtn.addEventListener("click", () => runAllChecks());
  }
  const clearBtn = document.querySelector("[data-action=\"clear-logs\"]");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearLogs);
  }
  if (hotkeyOverlayEl) {
    hotkeyOverlayEl.hidden = true;
    hotkeyOverlayEl.setAttribute("aria-hidden", "true");
    hotkeyOverlayEl.addEventListener("click", (event) => {
      if (event.target === hotkeyOverlayEl) {
        hideHotkeyOverlay();
      }
    });
  }
  const closeHotkeysBtn = document.querySelector("[data-action=\"close-hotkeys\"]");
  if (closeHotkeysBtn) {
    closeHotkeysBtn.addEventListener("click", hideHotkeyOverlay);
  }

  applyRoute(window.location.hash);
  window.addEventListener("hashchange", () => applyRoute(window.location.hash));
  document.addEventListener("keydown", handleKeydown);

  setStatus("internet", "checking", "Checking connectivity…");
  setStatus("static", "checking", "Checking server health…");
  setStatus("app", "checking", "Preparing console…");

  runAllChecks("initial");
  markAppReady();
  loadVersion();
});
