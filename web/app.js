import { initHotkeysModal } from "./hotkeys.js";
import { initStatusOverlay } from "./status.js";
import { createAudioRecorder } from "./recorder.js";
import { createTranscriber } from "./transcribe.js";
import { initCommandPalette } from "./commands.js";

const DEFAULT_PRODUCT = { name: "ScribeCat", version: "0.2.0" };
const env = (window.SC_ENV = window.SC_ENV || {});
const THEME_STORAGE_KEY = "scribe-theme";
const LOG_LIMIT = 60;
const ROUTES = new Set(["dashboard", "logs", "about"]);

const SETTINGS_STORAGE_KEY = "scribecat:recorderSettings";
const DEFAULT_SETTINGS = {
  autoOpenTranscript: true,
  autoSaveRecording: false,
};

const settingsListeners = new Set();
const commandSources = new Map();

function normalizeSettings(value = {}) {
  return {
    autoOpenTranscript: value.autoOpenTranscript !== false,
    autoSaveRecording: Boolean(value.autoSaveRecording),
  };
}

function readStoredSettings() {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return null;
    }
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return normalizeSettings({ ...DEFAULT_SETTINGS, ...parsed });
  } catch (error) {
    console.warn("Failed to read recorder settings", error);
    return null;
  }
}

let settingsState = normalizeSettings({ ...DEFAULT_SETTINGS, ...(readStoredSettings() || {}) });

function getSettingsSnapshot() {
  return { ...settingsState };
}

function persistSettingsState(next) {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    }
  } catch (error) {
    console.warn("Failed to persist recorder settings", error);
  }
}

function notifySettingsListeners() {
  const snapshot = getSettingsSnapshot();
  settingsListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.warn("Recorder settings listener failed", error);
    }
  });
}

function setSetting(key, value) {
  if (!(key in DEFAULT_SETTINGS)) return;
  const normalized = key === "autoOpenTranscript" ? value !== false : Boolean(value);
  if (settingsState[key] === normalized) return;
  settingsState = { ...settingsState, [key]: normalized };
  persistSettingsState(settingsState);
  notifySettingsListeners();
}

function subscribeSettings(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }
  settingsListeners.add(listener);
  try {
    listener(getSettingsSnapshot());
  } catch (error) {
    console.warn("Recorder settings listener failed", error);
  }
  return () => {
    settingsListeners.delete(listener);
  };
}

function getSettingValue(key) {
  return settingsState[key];
}

function registerCommandSource(key, supplier) {
  if (!key || typeof supplier !== "function") {
    return () => {};
  }
  commandSources.set(key, supplier);
  refreshCommandPalette();
  return () => {
    if (commandSources.get(key) === supplier) {
      commandSources.delete(key);
      refreshCommandPalette();
    }
  };
}

function collectCommandsFromSources() {
  const commands = [];
  commandSources.forEach((supplier) => {
    try {
      const result = supplier();
      if (Array.isArray(result)) {
        commands.push(...result);
      }
    } catch (error) {
      console.warn("Command palette source failed", error);
    }
  });
  return commands;
}

function refreshCommandPalette() {
  if (!commandPaletteController || typeof commandPaletteController.setCommands !== "function") {
    return;
  }
  const commands = collectCommandsFromSources();
  commandPaletteController.setCommands(commands);
}

const logEntries = [];
const statusTargets = new Map();

let logListEl = null;
let logPanelEl = null;
let logOriginEl = null;
let logHostEl = null;
let logFallbackEl = null;
let appShellEl = null;
let themeToggleBtn = null;
let hotkeysController = null;
let commandPaletteController = null;
let settingsDrawerController = null;
let hasExplicitTheme = false;
let currentTheme = "light";
let currentProduct = { ...DEFAULT_PRODUCT };
let overlayController = null;

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

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0.00 MB";
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 0.1) {
    return `${megabytes.toFixed(2)} MB`;
  }
  const kilobytes = bytes / 1024;
  return `${kilobytes.toFixed(1)} KB`;
}

function addLogEntry(level, message) {
  const text = (message ?? "").toString().trim() || level.toUpperCase();
  const entry = { level, message: text, ts: new Date() };
  logEntries.push(entry);
  if (logEntries.length > LOG_LIMIT) {
    logEntries.splice(0, logEntries.length - LOG_LIMIT);
  }
  renderLogs();
  refreshCommandPalette();
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
      let message = "Online";
      let logDetails = "Static server responded with ok=true.";
      if (payload.ts) {
        const ts = new Date(payload.ts);
        if (!Number.isNaN(ts.getTime())) {
          const displayTime = ts.toLocaleTimeString();
          message = `Online • ${displayTime}`;
          logDetails = `Static server responded with ok=true at ${displayTime}.`;
        }
      }
      setStatus("static", "ok", message);
      addLogEntry("info", logDetails);
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
  refreshCommandPalette();
}

function initSettingsDrawer(root = document) {
  const drawer = root.querySelector("[data-settings-drawer]");
  const trigger = root.getElementById("settingsButton");
  if (!drawer) {
    if (trigger) {
      trigger.setAttribute("hidden", "hidden");
      trigger.setAttribute("aria-hidden", "true");
    }
    return null;
  }

  const doc = drawer.ownerDocument || root;
  const panel = drawer.querySelector(".settings-drawer__panel");
  const backdrop = drawer.querySelector(".settings-drawer__backdrop");
  const closeButtons = Array.from(drawer.querySelectorAll("[data-settings-close]"));
  const toggles = Array.from(drawer.querySelectorAll("[data-setting-toggle]"));

  if (panel && !panel.hasAttribute("tabindex")) {
    panel.setAttribute("tabindex", "-1");
  }

  drawer.hidden = true;
  drawer.classList.remove("is-open");
  drawer.setAttribute("aria-hidden", "true");
  if (trigger) {
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-haspopup", "dialog");
  }

  let isOpen = false;
  let lastFocused = null;
  let previousBodyOverflow = null;

  function focusElement(element) {
    if (!element || typeof element.focus !== "function") return;
    try {
      element.focus({ preventScroll: true });
    } catch (error) {
      element.focus();
    }
  }

  function lockScroll() {
    if (!doc?.body) return;
    previousBodyOverflow = doc.body.style.overflow;
    doc.body.style.overflow = "hidden";
  }

  function unlockScroll() {
    if (!doc?.body) return;
    if (previousBodyOverflow != null) {
      doc.body.style.overflow = previousBodyOverflow;
    } else {
      doc.body.style.removeProperty("overflow");
    }
    previousBodyOverflow = null;
  }

  function openDrawer(triggerElement) {
    if (isOpen) return;
    const active = doc.activeElement;
    if (triggerElement instanceof HTMLElement) {
      lastFocused = triggerElement;
    } else if (active instanceof HTMLElement) {
      lastFocused = active;
    } else {
      lastFocused = null;
    }
    isOpen = true;
    drawer.hidden = false;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    if (trigger) {
      trigger.setAttribute("aria-expanded", "true");
    }
    lockScroll();
    requestAnimationFrame(() => {
      focusElement(panel || drawer);
    });
  }

  function closeDrawer() {
    if (!isOpen) return;
    isOpen = false;
    drawer.classList.remove("is-open");
    drawer.hidden = true;
    drawer.setAttribute("aria-hidden", "true");
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    }
    unlockScroll();
    const target = lastFocused;
    lastFocused = null;
    focusElement(target);
  }

  function toggleDrawer(force, triggerElement) {
    if (typeof force === "boolean") {
      if (force) {
        openDrawer(triggerElement);
      } else {
        closeDrawer();
      }
      return isOpen;
    }
    if (isOpen) {
      closeDrawer();
    } else {
      openDrawer(triggerElement);
    }
    return isOpen;
  }

  function syncSettings(state = getSettingsSnapshot()) {
    toggles.forEach((toggle) => {
      const key = toggle.dataset.settingKey;
      if (!key) return;
      const value = state[key];
      if (key === "autoOpenTranscript") {
        toggle.checked = value !== false;
      } else {
        toggle.checked = Boolean(value);
      }
    });
  }

  const unsubscribe = subscribeSettings(syncSettings);

  toggles.forEach((toggle) => {
    toggle.addEventListener("change", () => {
      const key = toggle.dataset.settingKey;
      if (!key) return;
      const next = toggle.checked;
      setSetting(key, next);
    });
  });

  if (trigger) {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      toggleDrawer(true, trigger);
    });
  }

  closeButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      closeDrawer();
    });
  });

  if (backdrop) {
    backdrop.addEventListener("click", () => {
      closeDrawer();
    });
  }

  drawer.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeDrawer();
    }
  });

  syncSettings();

  return {
    open: openDrawer,
    close: closeDrawer,
    toggle: toggleDrawer,
    isOpen: () => isOpen,
    destroy() {
      unsubscribe();
    },
  };
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const interactive = target.closest("input, textarea, select");
  return Boolean(interactive);
}

function handleKeydown(event) {
  if (event.defaultPrevented) return;
  const key = event.key;
  const target = event.target;
  const isModKey = event.metaKey || event.ctrlKey;

  if (commandPaletteController?.isOpen()) {
    if (key === "Escape") {
      event.preventDefault();
      commandPaletteController.close();
    }
    return;
  }

  if (settingsDrawerController?.isOpen() && key === "Escape") {
    event.preventDefault();
    settingsDrawerController.close();
    return;
  }

  if (isModKey && !event.altKey && !event.shiftKey) {
    const lowerKey = key.toLowerCase();
    if (lowerKey === "k" && !isTypingTarget(target)) {
      event.preventDefault();
      commandPaletteController?.toggle(true, target instanceof HTMLElement ? target : null);
      return;
    }
    if (key === "," && !isTypingTarget(target)) {
      event.preventDefault();
      settingsDrawerController?.toggle(true, target instanceof HTMLElement ? target : null);
      return;
    }
  }

  if (key === "?" && !event.repeat && !isTypingTarget(target)) {
    event.preventDefault();
    const trigger = target instanceof HTMLElement ? target : null;
    if (hotkeysController) {
      if (hotkeysController.isOpen()) {
        hotkeysController.close();
      } else {
        hotkeysController.open(trigger);
      }
    }
    return;
  }

  if (hotkeysController?.isOpen()) {
    if (key === "Escape") {
      event.preventDefault();
      hotkeysController.close();
    }
    return;
  }

  if (isTypingTarget(target)) return;
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

function inferExtension(mimeType) {
  if (typeof mimeType !== "string" || mimeType.length === 0) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("webm")) return "webm";
  if (mimeType.includes("mp4")) return "m4a";
  return "ogg";
}

function initRecorderPanel() {
  const recorderRoot = document.querySelector("[data-recorder]");
  if (!recorderRoot) return;

  const transcriptRoot = document.querySelector("[data-transcript]");
  const captionEl = recorderRoot.querySelector("[data-recorder-caption]");
  const dotEl = recorderRoot.querySelector("[data-recorder-dot]");
  const timerEl = recorderRoot.querySelector("[data-recorder-timer]");
  const sizeEl = recorderRoot.querySelector("[data-recorder-size]");
  const meterEl = recorderRoot.querySelector("[data-recorder-meter]");
  const errorEl = recorderRoot.querySelector("[data-recorder-error]");
  const audioEl = recorderRoot.querySelector("[data-recorder-audio]");
  const downloadEl = recorderRoot.querySelector("[data-recorder-download]");
  const transcriptStatusEl = transcriptRoot?.querySelector("[data-transcript-status]") || null;
  const transcriptOutputEl = transcriptRoot?.querySelector("[data-transcript-output]") || null;

  const buttonsByAction = new Map();
  const actionsContainer = recorderRoot.querySelector(".recorder-actions");
  const TRANSCRIBE_DISABLED_MESSAGE = "Transcription unavailable in prod without proxy.";
  const current = {
    blob: null,
    url: null,
    extension: "ogg",
    durationMs: 0,
    size: 0,
    mimeType: "",
    autoSaved: false,
  };
  let transcribeAbort = null;
  let transcribeTooltipEl = null;
  let activeSettings = getSettingsSnapshot();
  let unsubscribeSettings = null;
  let unregisterRecorderCommands = () => {};
  recorderRoot.querySelectorAll("[data-recorder-action]").forEach((button) => {
    const action = button.getAttribute("data-recorder-action");
    if (!buttonsByAction.has(action)) {
      buttonsByAction.set(action, []);
    }
    buttonsByAction.get(action).push(button);
  });

  const transcriber = createTranscriber({ apiKey: env.AAI });
  const recorder = createAudioRecorder({
    maxBytes: 30 * 1024 * 1024,
    onMeter(level) {
      updateMeter(level);
    },
    onElapsed(ms) {
      timerEl.textContent = formatDuration(ms);
      current.durationMs = ms;
    },
    onStateChange(details) {
      handleRecorderState(details || {});
    },
    onError(error) {
      handleRecorderError(error);
    },
  });

  if (!recorder || !recorder.isSupported()) {
    disableAllButtons();
    setRecorderUiState("error", {
      message: "Audio recording is not supported in this browser.",
      overlayState: "error",
    });
    return;
  }

  unsubscribeSettings = subscribeSettings((next) => {
    activeSettings = next;
    if (next.autoSaveRecording && current.blob && !current.autoSaved) {
      maybeAutoSaveRecording();
    }
  });
  unregisterRecorderCommands = registerCommandSource("recorder", buildRecorderCommands);

  let isPlaying = false;

  if (audioEl) {
    audioEl.addEventListener("play", () => {
      isPlaying = true;
      updatePlayButtons();
    });
    audioEl.addEventListener("pause", () => {
      isPlaying = false;
      updatePlayButtons();
    });
    audioEl.addEventListener("ended", () => {
      isPlaying = false;
      updatePlayButtons();
    });
  }

  function settingEnabled(key) {
    const value = activeSettings?.[key];
    if (key === "autoOpenTranscript") {
      return value !== false;
    }
    return Boolean(value);
  }

  function refreshRecorderCommands() {
    refreshCommandPalette();
  }

  function maybeAutoSaveRecording() {
    if (!settingEnabled("autoSaveRecording")) return;
    if (current.autoSaved) return;
    const saved = performSave({ manual: false });
    if (saved) {
      current.autoSaved = true;
    }
  }

  function revealTranscriptPanel() {
    if (!settingEnabled("autoOpenTranscript")) return;
    const target = transcriptOutputEl || transcriptRoot;
    if (!target) return;
    requestAnimationFrame(() => {
      try {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } catch {}
      if (typeof target.focus === "function") {
        try {
          target.focus({ preventScroll: true });
        } catch (error) {
          target.focus();
        }
      }
    });
  }

  function updateOverlayMic(state, message, timestamp) {
    if (!overlayController || typeof overlayController.setMicState !== "function") return;
    try {
      overlayController.setMicState(state, message, timestamp);
    } catch (err) {
      console.warn("Failed to sync microphone state", err);
    }
  }

  function ensureTranscribeTooltip() {
    if (!actionsContainer) return null;
    if (!transcribeTooltipEl) {
      transcribeTooltipEl = document.createElement("span");
      transcribeTooltipEl.className = "recorder-transcribe-tooltip";
      transcribeTooltipEl.textContent = "Transcribe";
      transcribeTooltipEl.title = TRANSCRIBE_DISABLED_MESSAGE;
      transcribeTooltipEl.setAttribute("role", "note");
      transcribeTooltipEl.setAttribute("aria-label", TRANSCRIBE_DISABLED_MESSAGE);
      transcribeTooltipEl.tabIndex = 0;
    }
    if (!actionsContainer.contains(transcribeTooltipEl)) {
      actionsContainer.appendChild(transcribeTooltipEl);
    }
    return transcribeTooltipEl;
  }

  function removeTranscribeTooltip() {
    if (transcribeTooltipEl?.parentElement) {
      transcribeTooltipEl.parentElement.removeChild(transcribeTooltipEl);
    }
  }

  function updateTranscribeVisibility() {
    const transcribeButtons = buttonsByAction.get("transcribe") || [];
    if (transcriber.hasApiKey) {
      removeTranscribeTooltip();
      transcribeButtons.forEach((button) => {
        button.hidden = false;
        button.removeAttribute("aria-hidden");
      });
    } else {
      transcribeButtons.forEach((button) => {
        button.hidden = true;
        button.setAttribute("aria-hidden", "true");
      });
      ensureTranscribeTooltip();
    }
  }

  function setRecorderUiState(state, options = {}) {
    const { message, overlayState, overlayMessage, timestamp } = options;
    recorderRoot.dataset.recorderState = state;
    if (captionEl && typeof message === "string") {
      captionEl.textContent = message;
    }
    const dotState =
      overlayState ||
      (state === "recording"
        ? "recording"
        : state === "processing"
        ? "processing"
        : state === "transcribed"
        ? "transcribed"
        : state === "error"
        ? "error"
        : "idle");
    if (dotEl) {
      dotEl.dataset.state = dotState;
    }
    const micMessage =
      typeof overlayMessage === "string" && overlayMessage.trim().length > 0
        ? overlayMessage
        : typeof message === "string"
          ? message
          : undefined;
    const micTimestamp = timestamp instanceof Date ? timestamp : new Date();
    updateOverlayMic(dotState, micMessage, micTimestamp);
  }

  function updateMeter(level) {
    const normalized = Math.min(Math.max(Number(level) || 0, 0), 1);
    if (meterEl) {
      meterEl.style.setProperty("--recorder-meter-level", normalized.toFixed(3));
    }
  }

  function updatePlayButtons() {
    const label = isPlaying ? "Pause" : "Play";
    (buttonsByAction.get("play") || []).forEach((button) => {
      button.textContent = label;
    });
  }

  function setButtonDisabled(action, disabled) {
    (buttonsByAction.get(action) || []).forEach((button) => {
      button.disabled = disabled;
    });
  }

  function disableAllButtons() {
    buttonsByAction.forEach((buttonList) => {
      buttonList.forEach((button) => {
        button.disabled = true;
      });
    });
  }

  function clearError() {
    if (errorEl) {
      errorEl.textContent = "";
    }
  }

  function showError(message) {
    if (errorEl) {
      errorEl.textContent = message;
    }
  }

  function handleRecorderError(error) {
    const message = typeof error === "string" ? error : error?.message || "Recording failed.";
    showError(message);
    setRecorderUiState("error", { message, overlayState: "error" });
    addLogEntry("error", `Recorder error (${message}).`);
    setButtonDisabled("record", false);
    setButtonDisabled("stop", true);
    setButtonDisabled("play", true);
    setButtonDisabled("save", true);
    setButtonDisabled("clear", false);
    setButtonDisabled("transcribe", true);
    updateMeter(0);
  }

  function revokeObjectUrl() {
    if (current.url) {
      URL.revokeObjectURL(current.url);
      current.url = null;
    }
  }

  function attachAudio(blob) {
    if (!audioEl || !blob) return;
    revokeObjectUrl();
    const url = URL.createObjectURL(blob);
    current.url = url;
    audioEl.src = url;
    audioEl.hidden = false;
    try {
      audioEl.load();
    } catch {}
    updatePlayButtons();
  }

  function clearAudio() {
    if (!audioEl) return;
    try {
      audioEl.pause();
    } catch {}
    audioEl.hidden = true;
    audioEl.removeAttribute("src");
    try {
      audioEl.load();
    } catch {}
    isPlaying = false;
    updatePlayButtons();
  }

  function cancelTranscription(message) {
    if (transcribeAbort) {
      transcribeAbort.abort();
      transcribeAbort = null;
      if (transcriptStatusEl && message) {
        transcriptStatusEl.textContent = message;
      }
      refreshRecorderCommands();
    }
  }

  function resetState() {
    cancelTranscription("Transcription reset.");
    clearAudio();
    revokeObjectUrl();
    current.blob = null;
    current.durationMs = 0;
    current.size = 0;
    current.mimeType = "";
    current.extension = "ogg";
    current.autoSaved = false;
    timerEl.textContent = "00:00";
    sizeEl.textContent = "0.00 MB";
    updateMeter(0);
    clearError();
    if (transcriptOutputEl) {
      transcriptOutputEl.textContent = "";
    }
    if (transcriptStatusEl) {
      transcriptStatusEl.textContent = transcriber.hasApiKey
        ? "Set up a recording to transcribe."
        : TRANSCRIBE_DISABLED_MESSAGE;
    }
    setRecorderUiState("idle", { message: "Ready to capture audio.", overlayState: "idle" });
    setButtonDisabled("record", false);
    setButtonDisabled("stop", true);
    setButtonDisabled("play", true);
    setButtonDisabled("save", true);
    setButtonDisabled("clear", true);
    setButtonDisabled("transcribe", true);
    refreshRecorderCommands();
  }

  function handleRecorderState(details) {
    const state = details.state;
    switch (state) {
      case "requesting": {
        clearError();
        setRecorderUiState("active", { message: "Requesting microphone access…" });
        setButtonDisabled("record", true);
        setButtonDisabled("stop", true);
        setButtonDisabled("play", true);
        setButtonDisabled("save", true);
        setButtonDisabled("clear", true);
        setButtonDisabled("transcribe", true);
        cancelTranscription("Recording in progress.");
        break;
      }
      case "recording": {
        setRecorderUiState("recording", { message: "Recording…" });
        clearError();
        cancelTranscription("Recording in progress.");
        setButtonDisabled("record", true);
        setButtonDisabled("stop", false);
        setButtonDisabled("play", true);
        setButtonDisabled("save", true);
        setButtonDisabled("clear", true);
        setButtonDisabled("transcribe", true);
        addLogEntry("info", "Recording started.");
        break;
      }
      case "finalizing": {
        setRecorderUiState("processing", { message: "Processing audio…" });
        setButtonDisabled("record", true);
        setButtonDisabled("stop", true);
        setButtonDisabled("play", true);
        setButtonDisabled("save", true);
        setButtonDisabled("clear", true);
        setButtonDisabled("transcribe", true);
        break;
      }
      case "ready": {
        current.blob = details.blob || null;
        current.size = details.bytes ?? (current.blob ? current.blob.size : 0);
        current.durationMs = details.duration ?? current.durationMs;
        current.mimeType = details.mimeType || (current.blob ? current.blob.type : "");
        current.extension = details.extension || inferExtension(current.mimeType);
        current.autoSaved = false;
        timerEl.textContent = formatDuration(current.durationMs);
        sizeEl.textContent = formatSize(current.size);
        updateMeter(0);
        if (details.notice) {
          showError(details.notice);
          addLogEntry("warn", details.notice);
        } else {
          clearError();
        }
        if (current.blob) {
          attachAudio(current.blob);
        }
        const canTranscribe = Boolean(current.blob) && transcriber.hasApiKey;
        if (transcriptOutputEl && !current.blob) {
          transcriptOutputEl.textContent = "";
        }
        if (transcriptStatusEl) {
          transcriptStatusEl.textContent = canTranscribe
            ? "Ready to transcribe."
            : transcriber.hasApiKey
              ? "Record audio to enable transcription."
              : TRANSCRIBE_DISABLED_MESSAGE;
        }
        setRecorderUiState("active", { message: "Recording ready." });
        setButtonDisabled("record", false);
        setButtonDisabled("stop", true);
        setButtonDisabled("play", !current.blob);
        setButtonDisabled("save", !current.blob);
        setButtonDisabled("clear", !current.blob);
        setButtonDisabled("transcribe", !canTranscribe);
        addLogEntry("info", "Recording ready.");
        maybeAutoSaveRecording();
        break;
      }
      case "idle": {
        resetState();
        break;
      }
      case "error": {
        handleRecorderError(details.error);
        break;
      }
      default:
        break;
    }
    refreshRecorderCommands();
  }

  function ensureRecordingStopped() {
    if (recorder.isRecording()) {
      recorder.stop().catch(() => {});
    }
  }

  async function startRecording() {
    clearError();
    cancelTranscription("Recording in progress.");
    try {
      await recorder.start();
    } catch (error) {
      const message = error?.message || "Failed to start recording.";
      handleRecorderError(message);
      addLogEntry("error", `Failed to start recording (${message}).`);
    }
  }

  async function stopRecording() {
    if (!recorder.isRecording()) return;
    try {
      await recorder.stop();
      addLogEntry("info", "Recording stopped.");
    } catch (error) {
      const message = error?.message || "Failed to stop recording.";
      handleRecorderError(message);
      addLogEntry("error", `Failed to stop recording (${message}).`);
    }
  }

  async function togglePlayback() {
    if (!audioEl || !current.url) return;
    try {
      if (audioEl.paused) {
        await audioEl.play();
      } else {
        audioEl.pause();
      }
    } catch (error) {
      const message = error?.message || "Unable to play recording.";
      showError(message);
      addLogEntry("warn", `Playback failed (${message}).`);
    }
  }

  function performSave(options = {}) {
    if (!current.blob || !current.url || !downloadEl) return false;
    const manual = options?.manual !== false;
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const extension = current.extension || inferExtension(current.mimeType);
    const filename = `scribecat-${timestamp}.${extension}`;
    downloadEl.href = current.url;
    downloadEl.download = filename;
    downloadEl.click();
    addLogEntry("info", manual ? `Recording saved (${filename}).` : `Recording auto-saved (${filename}).`);
    return true;
  }

  function handleSaveClick(event) {
    if (event instanceof Event) {
      event.preventDefault();
    }
    performSave({ manual: true });
  }

  function clearRecordingAction() {
    cancelTranscription("Transcription reset.");
    recorder.reset();
    resetState();
    addLogEntry("info", "Recorder reset.");
  }

  function setTranscribeBusy(active) {
    const buttons = buttonsByAction.get("transcribe") || [];
    buttons.forEach((button) => {
      button.disabled = active || !current.blob || !transcriber.hasApiKey;
      button.textContent = active ? "Transcribing…" : "Transcribe";
    });
    setButtonDisabled("record", active);
    setButtonDisabled("stop", true);
    refreshRecorderCommands();
  }

  async function runTranscription() {
    if (!transcriber.hasApiKey) {
      showError(TRANSCRIBE_DISABLED_MESSAGE);
      return;
    }
    if (!current.blob) {
      showError("Record audio before requesting a transcript.");
      return;
    }
    cancelTranscription();
    transcribeAbort = new AbortController();
    setTranscribeBusy(true);
    setRecorderUiState("processing", {
      message: "Submitting for transcription…",
      overlayState: "processing",
    });
    if (transcriptOutputEl) {
      transcriptOutputEl.textContent = "";
    }
    if (transcriptStatusEl) {
      transcriptStatusEl.textContent = "Uploading audio…";
    }
    try {
      const result = await transcriber.transcribe(current.blob, {
        signal: transcribeAbort.signal,
        onStatus(status) {
          if (status?.message && transcriptStatusEl) {
            transcriptStatusEl.textContent = status.message;
          }
        },
      });
      if (transcriptOutputEl) {
        const text = (result?.text || "").trim();
        transcriptOutputEl.textContent = text.length > 0 ? text : "(No transcript returned.)";
      }
      if (transcriptStatusEl) {
        transcriptStatusEl.textContent = "Transcription completed.";
      }
      revealTranscriptPanel();
      setRecorderUiState("transcribed", { message: "Transcript ready.", overlayState: "transcribed" });
      addLogEntry("info", "Transcription completed.");
    } catch (error) {
      if (error?.name === "AbortError") {
        if (transcriptStatusEl) {
          transcriptStatusEl.textContent = "Transcription canceled.";
        }
        addLogEntry("warn", "Transcription canceled.");
      } else {
        const message = error?.message || "Transcription failed.";
        showError(message);
        if (transcriptStatusEl) {
          transcriptStatusEl.textContent = message;
        }
        addLogEntry("error", `Transcription failed (${message}).`);
      }
      setRecorderUiState("active", { message: "Recording ready." });
    } finally {
      setTranscribeBusy(false);
      transcribeAbort = null;
      setButtonDisabled("transcribe", !current.blob || !transcriber.hasApiKey);
    }
  }

  function buildRecorderCommands() {
    const clipReady = Boolean(current.blob);
    const recording = recorder.isRecording();
    const transcribing = Boolean(transcribeAbort);
    const playbackReady = clipReady && audioEl;
    const playbackPaused = !audioEl || audioEl.paused;

    const commands = [
      {
        id: "recorder-start",
        label: "Start recording",
        description: "Begin a new clip from the microphone.",
        keywords: ["record", "start", "microphone"],
        shortcut: "Record",
        run: startRecording,
        isVisible: () => !recording && !transcribing,
        isEnabled: () => !recording && !transcribing,
      },
      {
        id: "recorder-stop",
        label: "Stop recording",
        description: "Finalize the current recording.",
        keywords: ["stop", "record"],
        shortcut: "Stop",
        run: stopRecording,
        isVisible: () => recording,
        isEnabled: () => recording,
      },
      {
        id: "recorder-play",
        label: "Play recording",
        description: "Listen to the latest clip.",
        keywords: ["play", "audio", "preview"],
        shortcut: "Play",
        run: togglePlayback,
        isVisible: () => playbackReady && playbackPaused,
        isEnabled: () => playbackReady,
      },
      {
        id: "recorder-pause",
        label: "Pause playback",
        description: "Pause the current playback.",
        keywords: ["pause", "audio"],
        shortcut: "Pause",
        run: togglePlayback,
        isVisible: () => playbackReady && !playbackPaused,
        isEnabled: () => playbackReady,
      },
      {
        id: "recorder-save",
        label: "Save recording",
        description: "Download the audio file to your device.",
        keywords: ["save", "download"],
        shortcut: "Save",
        run: () => performSave({ manual: true }),
        isVisible: () => clipReady,
        isEnabled: () => clipReady,
      },
      {
        id: "recorder-clear",
        label: "Clear recording",
        description: "Reset the recorder and remove the current clip.",
        keywords: ["clear", "reset", "remove"],
        shortcut: "Clear",
        run: clearRecordingAction,
        isVisible: () => clipReady || recording || transcribing,
        isEnabled: () => !recording && !transcribing,
      },
      {
        id: "recorder-transcribe",
        label: "Transcribe recording",
        description: "Send the clip to AssemblyAI for transcription.",
        keywords: ["transcribe", "assemblyai", "text"],
        shortcut: "Transcribe",
        run: runTranscription,
        isVisible: () => clipReady && transcriber.hasApiKey,
        isEnabled: () => clipReady && transcriber.hasApiKey && !transcribing,
      },
      {
        id: "recorder-cancel-transcription",
        label: "Cancel transcription",
        description: "Abort the active transcription request.",
        keywords: ["cancel", "abort", "transcribe"],
        shortcut: "Cancel",
        run: () => {
          cancelTranscription("Transcription canceled.");
        },
        isVisible: () => transcribing,
        isEnabled: () => transcribing,
      },
    ];

    return commands;
  }

  (buttonsByAction.get("record") || []).forEach((button) => {
    button.addEventListener("click", startRecording);
  });
  (buttonsByAction.get("stop") || []).forEach((button) => {
    button.addEventListener("click", stopRecording);
  });
  (buttonsByAction.get("play") || []).forEach((button) => {
    button.addEventListener("click", togglePlayback);
  });
  (buttonsByAction.get("save") || []).forEach((button) => {
    button.addEventListener("click", handleSaveClick);
  });
  (buttonsByAction.get("clear") || []).forEach((button) => {
    button.addEventListener("click", clearRecordingAction);
  });
  (buttonsByAction.get("transcribe") || []).forEach((button) => {
    button.addEventListener("click", runTranscription);
  });

  if (!transcriber.hasApiKey) {
    updateTranscribeVisibility();
    setButtonDisabled("transcribe", true);
    if (transcriptStatusEl) {
      transcriptStatusEl.textContent = TRANSCRIBE_DISABLED_MESSAGE;
    }
  } else {
    updateTranscribeVisibility();
  }

  resetState();

  window.addEventListener("beforeunload", () => {
    cancelTranscription();
    ensureRecordingStopped();
    recorder.reset();
    revokeObjectUrl();
    if (typeof unsubscribeSettings === "function") {
      unsubscribeSettings();
      unsubscribeSettings = null;
    }
    if (typeof unregisterRecorderCommands === "function") {
      unregisterRecorderCommands();
      unregisterRecorderCommands = () => {};
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  appShellEl = document.querySelector(".app-shell");
  themeToggleBtn = document.getElementById("themeToggle");
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
  hotkeysController = initHotkeysModal(document);
  settingsDrawerController = initSettingsDrawer(document);
  commandPaletteController = initCommandPalette(document);

  registerCommandSource("core", () => {
    const settingsButton = document.getElementById("settingsButton");
    return [
      {
        id: "core-open-settings",
        label: "Open recorder settings",
        description: "Adjust auto-save and transcript preferences.",
        keywords: ["settings", "preferences", "drawer"],
        shortcut: "Cmd/Ctrl+,",
        run: () => {
          settingsDrawerController?.toggle(true, settingsButton || null);
        },
        isVisible: () => Boolean(settingsDrawerController),
        isEnabled: () => Boolean(settingsDrawerController),
      },
      {
        id: "core-toggle-theme",
        label: () => (currentTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"),
        description: "Toggle between light and dark modes.",
        keywords: ["theme", "appearance", "light", "dark"],
        shortcut: "T",
        run: toggleTheme,
        isVisible: () => true,
        isEnabled: () => true,
      },
      {
        id: "core-rerun-checks",
        label: "Rerun status checks",
        description: "Ping internet and static server health endpoints.",
        keywords: ["status", "check", "refresh"],
        shortcut: "R",
        run: () => runAllChecks(),
        isVisible: () => true,
        isEnabled: () => true,
      },
      {
        id: "core-clear-logs",
        label: "Clear logs",
        description: "Remove all entries from the log panel.",
        keywords: ["logs", "clear"],
        shortcut: "L",
        run: clearLogs,
        isVisible: () => true,
        isEnabled: () => logEntries.length > 0,
      },
      {
        id: "core-show-hotkeys",
        label: "Show keyboard shortcuts",
        description: "Display the shortcut reference overlay.",
        keywords: ["shortcuts", "help", "keyboard"],
        shortcut: "?",
        run: () => {
          if (hotkeysController) {
            hotkeysController.open(document.body);
          }
        },
        isVisible: () => Boolean(hotkeysController),
        isEnabled: () => Boolean(hotkeysController),
      },
    ];
  });
  refreshCommandPalette();

  applyRoute(window.location.hash);
  window.addEventListener("hashchange", () => applyRoute(window.location.hash));
  document.addEventListener("keydown", handleKeydown);

  setStatus("internet", "checking", "Checking connectivity…");
  setStatus("static", "checking", "Checking server health…");
  setStatus("app", "checking", "Preparing console…");

  runAllChecks("initial");
  markAppReady();
  loadVersion();

  if (typeof initStatusOverlay === "function") {
    overlayController = initStatusOverlay({ rootId: "status-root" }) || null;
  }
  initRecorderPanel();
});
