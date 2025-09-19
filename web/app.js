import { createTranscriber } from "./transcribe.js";

const DEFAULT_PRODUCT = { name: "ScribeCat", version: "0.3.1" };
const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
const STATUS_KEYS = ["internet", "static"];

const productNameEl = document.getElementById("productName");
const productVersionEl = document.getElementById("productVersion");
const statusButton = document.querySelector("[data-status-button]");
const settingsButton = document.querySelector("[data-settings-button]");
const dialogRoot = document.querySelector("[data-status-dialog]");
const dialogPanel = dialogRoot?.querySelector(".status-dialog__panel");
const dialogClose = dialogRoot?.querySelector("[data-status-close]");
const statusRefresh = dialogRoot?.querySelector("[data-status-refresh]");
const settingsRoot = document.querySelector("[data-settings-drawer]");
const settingsPanel = settingsRoot?.querySelector(".settings-drawer__panel");
const settingsClose = settingsRoot?.querySelector("[data-settings-close]");
const notesField = document.getElementById("notesField");
const recorderControls = document.querySelector("[data-recorder-controls]");
const recordButton = document.querySelector("[data-recorder-record]");
const transcribeButton = document.querySelector("[data-recorder-transcribe]");
const recorderStatus = document.querySelector("[data-recorder-status]");
const recorderAudio = document.querySelector("[data-recorder-audio]");
const transcriptTarget =
  document.getElementById("transcript") ||
  document.querySelector(".transcript-area") ||
  document.querySelector("[data-transcript]");
const settingsFeedback = settingsRoot?.querySelector("[data-settings-feedback]");
const addClassButton = settingsRoot?.querySelector('[data-settings-action="add-class"]');
const manageRostersButton = settingsRoot?.querySelector('[data-settings-action="manage-rosters"]');
const recorderPreferencesButton = settingsRoot?.querySelector(
  '[data-settings-action="open-recorder-preferences"]'
);
const classList = settingsRoot?.querySelector("[data-settings-class-list]");
const classEmptyState = settingsRoot?.querySelector("[data-settings-class-empty]");
const classForm = settingsRoot?.querySelector("[data-class-form]");
const classInput = classForm?.querySelector("[data-class-input]");
const classCancel = classForm?.querySelector("[data-class-cancel]");
const classError = classForm?.querySelector("[data-class-error]");
const rosterManager = settingsRoot?.querySelector("[data-roster-manager]");
const rosterForm = rosterManager?.querySelector("[data-roster-form]");
const rosterSelect = rosterManager?.querySelector("[data-roster-class]");
const rosterTextarea = rosterManager?.querySelector("[data-roster-text]");
const rosterError = rosterManager?.querySelector("[data-roster-error]");
const rosterMessage = rosterManager?.querySelector("[data-roster-message]");
const rosterCloseButtons = rosterManager
  ? Array.from(rosterManager.querySelectorAll("[data-roster-close]"))
  : [];
const recorderPreferencesPanel = settingsRoot?.querySelector("[data-recorder-preferences]");
const recorderForm = recorderPreferencesPanel?.querySelector("[data-recorder-form]");
const recorderInputSelect = recorderPreferencesPanel?.querySelector("[data-recorder-input]");
const recorderMessage = recorderPreferencesPanel?.querySelector("[data-recorder-message]");
const recorderCancelButtons = recorderPreferencesPanel
  ? Array.from(recorderPreferencesPanel.querySelectorAll("[data-recorder-cancel]"))
  : [];
const autoUploadCheckbox = settingsRoot?.querySelector('input[name="settingsAutoUpload"]');
const retainAudioCheckbox = settingsRoot?.querySelector('input[name="settingsRetainAudio"]');

const statusRegistry = buildStatusRegistry(STATUS_KEYS);
const statusState = new Map();
const STATUS_MESSAGES = {
  internet: { ok: "Online", bad: "Offline" },
  static: { ok: "Running", bad: "Down" },
};
const pendingHeartbeatRequests = [];

const RECORDER_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/webm",
];

const TRANSCRIBER_STAGE_MESSAGES = {
  starting: "Preparing transcription…",
  uploading: "Uploading audio…",
  queued: "Waiting for AssemblyAI…",
  processing: "Transcribing audio…",
  completed: "Transcription completed.",
};

const DEV_API_BASE = "http://localhost:8787";
let recorderState = "idle";
let mediaRecorder = null;
let mediaStream = null;
let recordedChunks = [];
let recordedBlob = null;
let activeTranscriptionId = null;

let directTranscriberInstance = null;
let directTranscriberKey = "";
let activeTranscriptionAbortController = null;

let dialogOpen = false;
let lastFocusedElement = null;
let settingsOpen = false;
let lastSettingsFocusedElement = null;

const SETTINGS_STORAGE_KEY = "scribecat.settings";
const DEFAULT_SETTINGS = {
  classes: [],
  transcription: {
    autoUpload: true,
    retainAudio: false,
    preferredInput: "default",
  },
};

let settingsState = cloneDefaultSettings();
let settingsPersistenceEnabled = false;
let settingsFeedbackTimeoutId = null;
let autoUploadTimeoutId = null;
let cachedAudioInputs = [];

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
  if (productNameEl) productNameEl.textContent = name;
  if (productVersionEl) productVersionEl.textContent = version;
}

function formatTimestamp(date) {
  try {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return date.toLocaleTimeString();
  }
}

function parseTimestamp(value) {
  if (!value) return new Date();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return new Date();
  return parsed;
}

function cloneDefaultSettings() {
  return {
    classes: [],
    transcription: { ...DEFAULT_SETTINGS.transcription },
  };
}

function extractAssemblyApiKey(candidate) {
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (trimmed) return trimmed;
  }
  if (candidate && typeof candidate === "object") {
    if (typeof candidate.apiKey === "string" && candidate.apiKey.trim()) {
      return candidate.apiKey.trim();
    }
    if (typeof candidate.key === "string" && candidate.key.trim()) {
      return candidate.key.trim();
    }
  }
  return "";
}

function resolveAssemblyApiKey() {
  if (typeof window === "undefined") return "";
  const env = window.SC_ENV || {};
  const candidates = [
    env.AAI,
    env.ASSEMBLYAI_API_KEY,
    env.assemblyAiKey,
    env.assemblyaiKey,
    env.assemblyAi,
  ];
  for (const candidate of candidates) {
    const value = extractAssemblyApiKey(candidate);
    if (value) return value;
  }
  return "";
}

function getDirectTranscriber() {
  const key = resolveAssemblyApiKey();
  if (!key) {
    directTranscriberKey = "";
    directTranscriberInstance = null;
    return null;
  }
  if (directTranscriberInstance && directTranscriberKey === key) {
    return directTranscriberInstance;
  }
  directTranscriberKey = key;
  directTranscriberInstance = createTranscriber({ apiKey: key });
  return directTranscriberInstance;
}

function directTranscriptionAvailable() {
  const transcriber = getDirectTranscriber();
  return Boolean(transcriber?.hasApiKey);
}

function applyDirectTranscriberStatus(update) {
  if (!update || recorderState !== "transcribing") return;
  const stage = update.stage;
  const fallback = stage && TRANSCRIBER_STAGE_MESSAGES[stage]
    ? TRANSCRIBER_STAGE_MESSAGES[stage]
    : "Transcribing…";
  const message = update.message || fallback;
  setRecorderStatus(message);
}

function normalizeClassEntry(entry, index) {
  if (!entry || typeof entry !== "object") return null;
  const name = typeof entry.name === "string" ? entry.name.trim() : "";
  if (!name) return null;
  const roster = Array.isArray(entry.roster)
    ? entry.roster.map((value) => String(value || "").trim()).filter(Boolean)
    : [];
  const identifier =
    typeof entry.id === "string" && entry.id.trim()
      ? entry.id.trim()
      : `class-${index}-${Math.random().toString(36).slice(2, 8)}`;
  return { id: identifier, name, roster };
}

function normalizeSettings(payload) {
  const normalized = cloneDefaultSettings();
  if (!payload || typeof payload !== "object") return normalized;
  if (Array.isArray(payload.classes)) {
    normalized.classes = payload.classes
      .map((entry, index) => normalizeClassEntry(entry, index))
      .filter(Boolean);
  }
  if (payload.transcription && typeof payload.transcription === "object") {
    normalized.transcription.autoUpload =
      payload.transcription.autoUpload !== undefined
        ? Boolean(payload.transcription.autoUpload)
        : normalized.transcription.autoUpload;
    normalized.transcription.retainAudio =
      payload.transcription.retainAudio !== undefined
        ? Boolean(payload.transcription.retainAudio)
        : normalized.transcription.retainAudio;
    normalized.transcription.preferredInput =
      typeof payload.transcription.preferredInput === "string" &&
      payload.transcription.preferredInput
        ? payload.transcription.preferredInput
        : normalized.transcription.preferredInput;
  }
  return normalized;
}

function loadSettingsState() {
  const fallback = cloneDefaultSettings();
  if (typeof window === "undefined") return fallback;
  try {
    const storage = window.localStorage;
    if (!storage) return fallback;
    const raw = storage.getItem(SETTINGS_STORAGE_KEY);
    settingsPersistenceEnabled = true;
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed);
  } catch (error) {
    console.warn("Failed to load settings", error);
    settingsPersistenceEnabled = false;
    return fallback;
  }
}

function persistSettingsState() {
  if (typeof window === "undefined" || !settingsPersistenceEnabled) return;
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsState));
  } catch (error) {
    settingsPersistenceEnabled = false;
    console.warn("Failed to persist settings", error);
  }
}

function clearSettingsFeedback() {
  if (!settingsFeedback) return;
  settingsFeedback.textContent = "";
  settingsFeedback.hidden = true;
  settingsFeedback.removeAttribute("data-tone");
}

function setSettingsFeedbackMessage(message, tone = "info") {
  if (!settingsFeedback) return;
  if (settingsFeedbackTimeoutId) {
    window.clearTimeout(settingsFeedbackTimeoutId);
    settingsFeedbackTimeoutId = null;
  }
  if (!message) {
    clearSettingsFeedback();
    return;
  }
  settingsFeedback.hidden = false;
  settingsFeedback.dataset.tone = tone;
  settingsFeedback.textContent = message;
  settingsFeedbackTimeoutId = window.setTimeout(() => {
    clearSettingsFeedback();
    settingsFeedbackTimeoutId = null;
  }, 5000);
}

function announceSettings(message, tone = "info") {
  setSettingsFeedbackMessage(message, tone);
}

function renderClassList() {
  if (!classList || !classEmptyState) return;
  classList.innerHTML = "";
  const classes = Array.isArray(settingsState.classes) ? settingsState.classes : [];
  if (!classes.length) {
    classList.hidden = true;
    classEmptyState.hidden = false;
    updateManageRostersButton();
    return;
  }
  const fragment = document.createDocumentFragment();
  for (const entry of classes) {
    fragment.appendChild(createClassListItem(entry));
  }
  classList.hidden = false;
  classList.appendChild(fragment);
  classEmptyState.hidden = true;
  updateManageRostersButton();
}

function createClassListItem(entry) {
  const item = document.createElement("li");
  item.className = "settings-collection__item";
  item.dataset.classId = entry.id;

  const meta = document.createElement("div");
  meta.className = "settings-collection__meta";

  const name = document.createElement("span");
  name.className = "settings-collection__name";
  name.textContent = entry.name;

  const count = document.createElement("span");
  count.className = "settings-collection__count";
  const rosterCount = Array.isArray(entry.roster) ? entry.roster.length : 0;
  count.textContent = rosterCount === 1 ? "1 student" : `${rosterCount} students`;

  meta.append(name, count);

  const actions = document.createElement("div");
  actions.className = "settings-collection__actions";
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "button button--ghost button--danger";
  removeButton.dataset.classRemove = entry.id;
  removeButton.textContent = "Remove";
  actions.append(removeButton);

  item.append(meta, actions);
  return item;
}

function updateManageRostersButton() {
  if (!manageRostersButton) return;
  const classes = Array.isArray(settingsState.classes) ? settingsState.classes : [];
  const hasClasses = classes.length > 0;
  manageRostersButton.disabled = !hasClasses;
  manageRostersButton.setAttribute("aria-disabled", hasClasses ? "false" : "true");
  if (!hasClasses) manageRostersButton.setAttribute("aria-expanded", "false");
}

function setClassError(message) {
  if (!classError) return;
  if (message) {
    classError.textContent = message;
    classError.hidden = false;
  } else {
    classError.textContent = "";
    classError.hidden = true;
  }
}

function showClassForm() {
  if (!classForm) return;
  closeRosterManager();
  closeRecorderPreferences();
  if (typeof classForm.reset === "function") classForm.reset();
  classForm.hidden = false;
  if (addClassButton) addClassButton.setAttribute("aria-expanded", "true");
  setClassError("");
  requestAnimationFrame(() => {
    if (classInput) {
      try {
        classInput.focus({ preventScroll: true });
      } catch {
        classInput.focus();
      }
    }
  });
}

function hideClassForm() {
  if (!classForm || classForm.hidden) return;
  classForm.hidden = true;
  if (addClassButton) addClassButton.setAttribute("aria-expanded", "false");
  setClassError("");
}

function toggleClassForm(force) {
  if (!classForm) return;
  if (force === true) {
    showClassForm();
    return;
  }
  if (force === false) {
    hideClassForm();
    return;
  }
  if (classForm.hidden) showClassForm();
  else hideClassForm();
}

function handleClassFormSubmit(event) {
  event.preventDefault();
  if (!classInput) return;
  const name = classInput.value.trim();
  if (!name) {
    setClassError("Enter a class name to continue.");
    classInput.focus();
    return;
  }
  const classes = Array.isArray(settingsState.classes) ? settingsState.classes : [];
  const duplicate = classes.some((entry) => entry.name.toLowerCase() === name.toLowerCase());
  if (duplicate) {
    setClassError(`Class “${name}” already exists.`);
    classInput.focus();
    return;
  }
  const id = `class-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const entry = { id, name, roster: [] };
  settingsState.classes = [...classes, entry];
  persistSettingsState();
  renderClassList();
  announceSettings(`Added class “${name}”.`, "success");
  toggleClassForm(false);
  if (rosterManager && !rosterManager.hidden) {
    syncRosterSelect(id);
  }
}

function handleClassListClick(event) {
  const button = event.target instanceof HTMLElement ? event.target.closest("[data-class-remove]") : null;
  if (!button) return;
  const classId = button.getAttribute("data-class-remove");
  if (!classId) return;
  const classes = Array.isArray(settingsState.classes) ? settingsState.classes : [];
  const entry = classes.find((item) => item.id === classId);
  if (!entry) return;
  const confirmed = window.confirm(`Remove ${entry.name}? This clears its roster.`);
  if (!confirmed) return;
  settingsState.classes = classes.filter((item) => item.id !== classId);
  persistSettingsState();
  renderClassList();
  if (rosterManager && !rosterManager.hidden) {
    syncRosterSelect();
    setRosterMessage(`Removed class “${entry.name}”.`);
  }
  announceSettings(`Removed class “${entry.name}”.`, "success");
}

function setRosterError(message) {
  if (!rosterError) return;
  if (message) {
    rosterError.textContent = message;
    rosterError.hidden = false;
  } else {
    rosterError.textContent = "";
    rosterError.hidden = true;
  }
}

function setRosterMessage(message) {
  if (!rosterMessage) return;
  if (message) {
    rosterMessage.hidden = false;
    rosterMessage.textContent = message;
  } else {
    rosterMessage.textContent = "";
    rosterMessage.hidden = true;
  }
}

function findClassById(id) {
  if (!id) return null;
  const classes = Array.isArray(settingsState.classes) ? settingsState.classes : [];
  return classes.find((entry) => entry.id === id) || null;
}

function syncRosterSelect(preferredId) {
  if (!rosterSelect) return;
  const classes = Array.isArray(settingsState.classes) ? settingsState.classes : [];
  rosterSelect.innerHTML = "";
  if (!classes.length) {
    rosterSelect.disabled = true;
    if (rosterTextarea) rosterTextarea.value = "";
    return;
  }
  rosterSelect.disabled = false;
  const fragment = document.createDocumentFragment();
  for (const entry of classes) {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.name;
    fragment.append(option);
  }
  rosterSelect.append(fragment);
  const fallbackId = classes[0]?.id || "";
  const targetId = preferredId && classes.some((entry) => entry.id === preferredId) ? preferredId : fallbackId;
  rosterSelect.value = targetId;
  applyRosterToTextarea(targetId);
}

function applyRosterToTextarea(classId) {
  if (!rosterTextarea) return;
  const entry = findClassById(classId);
  rosterTextarea.value = entry ? (entry.roster || []).join("\n") : "";
}

function openRosterManager(preferredId) {
  if (!rosterManager) return;
  const classes = Array.isArray(settingsState.classes) ? settingsState.classes : [];
  if (!classes.length) {
    announceSettings("Add a class before managing rosters.", "error");
    showClassForm();
    return;
  }
  hideClassForm();
  closeRecorderPreferences();
  rosterManager.hidden = false;
  rosterManager.setAttribute("data-open", "true");
  if (manageRostersButton) manageRostersButton.setAttribute("aria-expanded", "true");
  syncRosterSelect(preferredId);
  setRosterError("");
  setRosterMessage("Update rosters to keep track of students.");
  requestAnimationFrame(() => {
    try {
      rosterManager.focus({ preventScroll: true });
    } catch {
      rosterManager.focus();
    }
  });
}

function closeRosterManager() {
  if (!rosterManager || rosterManager.hidden) return;
  rosterManager.hidden = true;
  rosterManager.removeAttribute("data-open");
  if (manageRostersButton) manageRostersButton.setAttribute("aria-expanded", "false");
  setRosterError("");
  setRosterMessage("");
}

function toggleRosterManager(force) {
  if (!rosterManager) return;
  if (force === true) {
    openRosterManager();
    return;
  }
  if (force === false) {
    closeRosterManager();
    return;
  }
  if (rosterManager.hidden) openRosterManager();
  else closeRosterManager();
}

function parseRosterText(value) {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function handleRosterSubmit(event) {
  event.preventDefault();
  if (!rosterSelect) return;
  const classId = rosterSelect.value;
  const entry = findClassById(classId);
  if (!entry) {
    setRosterError("Select a class to save its roster.");
    return;
  }
  const students = parseRosterText(rosterTextarea?.value || "");
  entry.roster = students;
  persistSettingsState();
  renderClassList();
  setRosterError("");
  const countText = students.length === 1 ? "1 student" : `${students.length} students`;
  setRosterMessage(`Saved ${countText} for “${entry.name}”.`);
  announceSettings(`Roster for “${entry.name}” updated.`, "success");
}

function setRecorderPreferencesMessage(message, tone = "info") {
  if (!recorderMessage) return;
  if (message) {
    recorderMessage.hidden = false;
    recorderMessage.dataset.tone = tone;
    recorderMessage.textContent = message;
  } else {
    recorderMessage.textContent = "";
    recorderMessage.hidden = true;
    recorderMessage.removeAttribute("data-tone");
  }
}

function populateRecorderDevices(devices) {
  if (!recorderInputSelect) return;
  recorderInputSelect.innerHTML = "";
  const fragment = document.createDocumentFragment();
  const defaultOption = document.createElement("option");
  defaultOption.value = "default";
  defaultOption.textContent = "System default";
  fragment.append(defaultOption);
  devices.forEach((device, index) => {
    const option = document.createElement("option");
    const label = device.label && device.label.trim() ? device.label.trim() : `Microphone ${index + 1}`;
    option.value = device.deviceId || "default";
    option.textContent = label;
    fragment.append(option);
  });
  recorderInputSelect.append(fragment);
  const preferred = settingsState.transcription?.preferredInput || "default";
  const hasPreferred = Array.from(recorderInputSelect.options).some((option) => option.value === preferred);
  recorderInputSelect.value = hasPreferred ? preferred : "default";
  if (!hasPreferred && preferred && preferred !== "default") {
    settingsState.transcription.preferredInput = "default";
    persistSettingsState();
  }
}

async function refreshRecorderDevices() {
  if (!recorderInputSelect) return [];
  if (!navigator?.mediaDevices?.enumerateDevices) {
    setRecorderPreferencesMessage("Microphone listing is not supported in this browser.", "error");
    populateRecorderDevices([]);
    cachedAudioInputs = [];
    return [];
  }
  setRecorderPreferencesMessage("Looking for microphones…");
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((device) => device.kind === "audioinput");
    cachedAudioInputs = inputs;
    populateRecorderDevices(inputs);
    if (inputs.length === 0) {
      setRecorderPreferencesMessage("No microphones detected. Check your hardware.", "error");
    } else {
      setRecorderPreferencesMessage(
        `Found ${inputs.length} microphone${inputs.length === 1 ? "" : "s"}.`,
        "success"
      );
    }
    return inputs;
  } catch (error) {
    console.warn("Unable to enumerate media devices", error);
    populateRecorderDevices([]);
    cachedAudioInputs = [];
    setRecorderPreferencesMessage("Unable to list microphones. Check browser permissions.", "error");
    return [];
  }
}

function openRecorderPreferences() {
  if (!recorderPreferencesPanel) return;
  hideClassForm();
  closeRosterManager();
  recorderPreferencesPanel.hidden = false;
  recorderPreferencesPanel.setAttribute("data-open", "true");
  if (recorderPreferencesButton) recorderPreferencesButton.setAttribute("aria-expanded", "true");
  applyTranscriptionSettingsToControls();
  refreshRecorderDevices();
  requestAnimationFrame(() => {
    const focusTarget =
      recorderInputSelect || recorderPreferencesPanel.querySelector(FOCUSABLE_SELECTORS) || recorderPreferencesPanel;
    if (focusTarget && typeof focusTarget.focus === "function") {
      try {
        focusTarget.focus({ preventScroll: true });
      } catch {
        focusTarget.focus();
      }
    }
  });
}

function closeRecorderPreferences() {
  if (!recorderPreferencesPanel || recorderPreferencesPanel.hidden) return;
  recorderPreferencesPanel.hidden = true;
  recorderPreferencesPanel.removeAttribute("data-open");
  if (recorderPreferencesButton) recorderPreferencesButton.setAttribute("aria-expanded", "false");
  setRecorderPreferencesMessage("");
}

function toggleRecorderPreferences(force) {
  if (!recorderPreferencesPanel) return;
  if (force === true) {
    openRecorderPreferences();
    return;
  }
  if (force === false) {
    closeRecorderPreferences();
    return;
  }
  if (recorderPreferencesPanel.hidden) openRecorderPreferences();
  else closeRecorderPreferences();
}

function applyTranscriptionSettingsToControls() {
  if (autoUploadCheckbox) {
    autoUploadCheckbox.checked = Boolean(settingsState.transcription?.autoUpload);
  }
  if (retainAudioCheckbox) {
    retainAudioCheckbox.checked = Boolean(settingsState.transcription?.retainAudio);
  }
  if (recorderInputSelect) {
    const preferred = settingsState.transcription?.preferredInput || "default";
    const hasOption = Array.from(recorderInputSelect.options || []).some(
      (option) => option.value === preferred
    );
    recorderInputSelect.value = hasOption ? preferred : "default";
  }
}

function handleRecorderSubmit(event) {
  event.preventDefault();
  if (recorderInputSelect) {
    const value = recorderInputSelect.value && recorderInputSelect.value !== "default"
      ? recorderInputSelect.value
      : "default";
    settingsState.transcription.preferredInput = value;
  }
  if (autoUploadCheckbox) {
    settingsState.transcription.autoUpload = autoUploadCheckbox.checked;
  }
  if (retainAudioCheckbox) {
    settingsState.transcription.retainAudio = retainAudioCheckbox.checked;
  }
  persistSettingsState();
  setRecorderPreferencesMessage("Recorder preferences saved.", "success");
  announceSettings("Recorder preferences updated.", "success");
}

function handleAutoUploadChange() {
  if (!autoUploadCheckbox) return;
  settingsState.transcription.autoUpload = autoUploadCheckbox.checked;
  persistSettingsState();
  announceSettings(
    autoUploadCheckbox.checked
      ? "Automatic transcription enabled. We'll queue recordings right away."
      : "Automatic transcription disabled. Use Transcribe when you're ready.",
    "success"
  );
}

function handleRetainAudioChange() {
  if (!retainAudioCheckbox) return;
  settingsState.transcription.retainAudio = retainAudioCheckbox.checked;
  persistSettingsState();
  announceSettings(
    retainAudioCheckbox.checked
      ? "ScribeCat will keep raw audio after transcription completes."
      : "Raw audio will be discarded once transcription finishes.",
    "success"
  );
}

function initializeSettingsManager() {
  settingsState = loadSettingsState();
  renderClassList();
  applyTranscriptionSettingsToControls();
  setRosterError("");
  setRosterMessage("");
  if (!settingsPersistenceEnabled) {
    announceSettings(
      "Settings will reset after this session because local storage is unavailable.",
      "error"
    );
  }
  if (addClassButton) addClassButton.addEventListener("click", () => toggleClassForm());
  if (classForm) classForm.addEventListener("submit", handleClassFormSubmit);
  if (classCancel) classCancel.addEventListener("click", () => toggleClassForm(false));
  if (classList) classList.addEventListener("click", handleClassListClick);
  if (manageRostersButton)
    manageRostersButton.addEventListener("click", () => toggleRosterManager());
  if (rosterForm) rosterForm.addEventListener("submit", handleRosterSubmit);
  if (rosterSelect) {
    rosterSelect.addEventListener("change", () => {
      setRosterError("");
      const currentId = rosterSelect.value;
      applyRosterToTextarea(currentId);
      const entry = findClassById(currentId);
      setRosterMessage(entry ? `Editing roster for “${entry.name}”.` : "");
    });
  }
  rosterCloseButtons.forEach((button) =>
    button.addEventListener("click", () => closeRosterManager())
  );
  if (recorderPreferencesButton)
    recorderPreferencesButton.addEventListener("click", () => toggleRecorderPreferences());
  if (recorderForm) recorderForm.addEventListener("submit", handleRecorderSubmit);
  recorderCancelButtons.forEach((button) =>
    button.addEventListener("click", () => closeRecorderPreferences())
  );
  if (autoUploadCheckbox) autoUploadCheckbox.addEventListener("change", handleAutoUploadChange);
  if (retainAudioCheckbox) retainAudioCheckbox.addEventListener("change", handleRetainAudioChange);
  updateManageRostersButton();
}

function applyStatus(key, state, message, timestamp = null) {
  const entry = statusRegistry[key];
  if (!entry) return;
  const resolvedTimestamp =
    timestamp instanceof Date ? timestamp : timestamp ? parseTimestamp(timestamp) : null;

  if (entry.summary) entry.summary.dataset.state = state;
  if (entry.detailRow) entry.detailRow.dataset.state = state;
  if (entry.summaryMessage) entry.summaryMessage.textContent = message;
  if (entry.detailMessage) entry.detailMessage.textContent = message;

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

function applyHeartbeatStatus(key, payload) {
  if (!payload) return;
  if (payload.state === "checking") {
    markChecking(key);
    return;
  }
  const ok = Boolean(payload.ok);
  const messages = STATUS_MESSAGES[key] || STATUS_MESSAGES.internet;
  const message = payload.message || (ok ? messages.ok : messages.bad);
  const timestamp = payload.checkedAt ? parseTimestamp(payload.checkedAt) : new Date();
  setStatus(key, ok ? "online" : "offline", message, timestamp);
}

function handleHeartbeat(event) {
  const detail = event?.detail;
  if (!detail || !detail.statuses) return;
  for (const key of STATUS_KEYS) {
    if (detail.statuses[key]) {
      applyHeartbeatStatus(key, detail.statuses[key]);
    }
  }
}

function requestHeartbeat(reason = "manual") {
  const heartbeat = window.__scribecatHeartbeat;
  if (heartbeat && typeof heartbeat.tickNow === "function") {
    try {
      return Promise.resolve(heartbeat.tickNow(reason));
    } catch (error) {
      console.warn("Heartbeat request failed", error);
      return Promise.reject(error);
    }
  }
  return new Promise((resolve, reject) => {
    pendingHeartbeatRequests.push({ reason, resolve, reject });
    window.dispatchEvent(
      new CustomEvent("scribecat:heartbeat-request", { detail: { reason } })
    );
  });
}

function flushHeartbeatQueue() {
  const heartbeat = window.__scribecatHeartbeat;
  if (!heartbeat || typeof heartbeat.tickNow !== "function") return;
  while (pendingHeartbeatRequests.length) {
    const request = pendingHeartbeatRequests.shift();
    if (!request) continue;
    const { reason, resolve, reject } = request;
    try {
      const result = heartbeat.tickNow(reason);
      Promise.resolve(result)
        .then((value) => resolve?.(value))
        .catch((error) => {
          console.warn("Heartbeat request failed", error);
          reject?.(error);
        });
    } catch (error) {
      console.warn("Heartbeat request failed", error);
      reject?.(error);
    }
  }
}

function runChecks(reason = "manual") {
  if (reason !== "interval") STATUS_KEYS.forEach((key) => markChecking(key));
  return requestHeartbeat(reason);
}

function openDialog() {
  if (!dialogRoot || !dialogPanel || dialogOpen) return;
  if (settingsOpen) closeSettingsDrawer();
  dialogOpen = true;
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialogRoot.hidden = false;
  document.body.dataset.dialogOpen = "true";
  if (statusButton) statusButton.setAttribute("aria-expanded", "true");
  dialogRoot.addEventListener("click", handleDialogRootClick);
  document.addEventListener("keydown", handleDialogKeydown);
  dialogPanel.addEventListener("keydown", handleStatusFocusTrap);
  const focusTarget =
    dialogPanel.querySelector("[data-status-close]") ||
    dialogPanel.querySelector(FOCUSABLE_SELECTORS) ||
    dialogPanel;
  requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
}

function closeDialog() {
  if (!dialogRoot || !dialogPanel || !dialogOpen) return;
  dialogOpen = false;
  dialogRoot.hidden = true;
  delete document.body.dataset.dialogOpen;
  if (statusButton) statusButton.setAttribute("aria-expanded", "false");
  dialogRoot.removeEventListener("click", handleDialogRootClick);
  document.removeEventListener("keydown", handleDialogKeydown);
  dialogPanel.removeEventListener("keydown", handleStatusFocusTrap);
  const focusTarget = lastFocusedElement;
  lastFocusedElement = null;
  if (focusTarget && typeof focusTarget.focus === "function") {
    requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
  }
}

function setRefreshBusy(isBusy) {
  const el = statusRefresh;
  if (!el) return;
  if (isBusy) {
    if (!el.dataset.originalLabel) el.dataset.originalLabel = el.textContent || "";
    el.disabled = true;
    el.textContent = "Checking…";
    el.setAttribute("aria-busy", "true");
    const id = window.setTimeout(() => {
      if (el?.disabled) setRefreshBusy(false);
    }, 10000);
    el.dataset.refreshTimeoutId = String(id);
  } else {
    const original = el.dataset.originalLabel || "Re-run checks";
    el.disabled = false;
    el.textContent = original;
    el.removeAttribute("aria-busy");
    const id = el.dataset.refreshTimeoutId;
    if (id) {
      window.clearTimeout(Number(id));
      delete el.dataset.refreshTimeoutId;
    }
  }
}

function toggleDialog(force) {
  if (force === true) return openDialog();
  if (force === false) return closeDialog();
  if (dialogOpen) closeDialog();
  else openDialog();
}

function openSettingsDrawer() {
  if (!settingsRoot || !settingsPanel || settingsOpen) return;
  if (dialogOpen) closeDialog();
  settingsOpen = true;
  lastSettingsFocusedElement =
    document.activeElement instanceof HTMLElement ? document.activeElement : null;
  settingsRoot.hidden = false;
  settingsRoot.removeAttribute("hidden");
  document.body.dataset.settingsOpen = "true";
  if (settingsButton) settingsButton.setAttribute("aria-expanded", "true");
  settingsRoot.addEventListener("click", handleSettingsRootClick);
  document.addEventListener("keydown", handleSettingsKeydown);
  settingsPanel.addEventListener("keydown", handleSettingsFocusTrap);
  const focusTarget =
    settingsPanel.querySelector("[data-settings-close]") ||
    settingsPanel.querySelector(FOCUSABLE_SELECTORS) ||
    settingsPanel;
  requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
}

function closeSettingsDrawer() {
  if (!settingsRoot || !settingsPanel || !settingsOpen) return;
  settingsOpen = false;
  toggleClassForm(false);
  closeRosterManager();
  closeRecorderPreferences();
  setSettingsFeedbackMessage("");
  settingsRoot.hidden = true;
  settingsRoot.setAttribute("hidden", "");
  delete document.body.dataset.settingsOpen;
  if (settingsButton) settingsButton.setAttribute("aria-expanded", "false");
  settingsRoot.removeEventListener("click", handleSettingsRootClick);
  document.removeEventListener("keydown", handleSettingsKeydown);
  settingsPanel.removeEventListener("keydown", handleSettingsFocusTrap);
  const focusTarget = lastSettingsFocusedElement;
  lastSettingsFocusedElement = null;
  if (focusTarget && typeof focusTarget.focus === "function") {
    requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
  }
}

function toggleSettingsDrawer(force) {
  if (force === true) return openSettingsDrawer();
  if (force === false) return closeSettingsDrawer();
  if (settingsOpen) closeSettingsDrawer();
  else openSettingsDrawer();
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

function handleSettingsRootClick(event) {
  if (!settingsOpen) return;
  const target = event.target;
  if (target instanceof HTMLElement && target.dataset.settingsDismiss !== undefined) {
    event.preventDefault();
    closeSettingsDrawer();
  }
}

function handleSettingsKeydown(event) {
  if (!settingsOpen) return;
  if (event.key === "Escape") {
    event.preventDefault();
    closeSettingsDrawer();
  }
}

function trapFocusWithin(event, container) {
  if (event.key !== "Tab" || !container) return;
  const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
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

function handleStatusFocusTrap(event) {
  if (!dialogOpen) return;
  trapFocusWithin(event, dialogPanel);
}

function handleSettingsFocusTrap(event) {
  if (!settingsOpen) return;
  trapFocusWithin(event, settingsPanel);
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
  if (key === "," && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    toggleSettingsDrawer();
    return;
  }
  if ((key === "." || event.code === "Period") && !event.shiftKey && !event.altKey) {
    event.preventDefault();
    runChecks("shortcut").catch((e) => console.warn("Shortcut heartbeat failed", e));
    return;
  }
  if (key === "n" && event.shiftKey && !event.altKey) {
    event.preventDefault();
    focusNotes();
  }
}

function focusNotes() {
  if (notesField) notesField.focus({ preventScroll: false });
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
  if (caret <= 0) return { text: value, caret };
  const lookBehind = value.slice(Math.max(0, caret - 4), caret);
  if (lookBehind.endsWith("\t")) return { text: value.slice(0, caret - 1) + value.slice(caret), caret: caret - 1 };
  if (lookBehind.endsWith("    ")) return { text: value.slice(0, caret - 4) + value.slice(caret), caret: caret - 4 };
  return { text: value, caret };
}

function indentSelection(value, start, end) {
  const selected = value.slice(start, end);
  const lines = selected.split("\n");
  const indented = lines.map((line) => "\t" + line).join("\n");
  const text = value.slice(0, start) + indented + value.slice(end);
  return { text, selectionStart: start, selectionEnd: start + indented.length };
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
    const response = await fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const name = data.productName || data.name || DEFAULT_PRODUCT.name;
    const version = data.version || DEFAULT_PRODUCT.version;
    applyProduct(name, version);
  } catch (error) {
    console.warn("Falling back to bundled version metadata", error);
    applyProduct(DEFAULT_PRODUCT.name, DEFAULT_PRODUCT.version);
  }
}

function selectRecorderMimeType() {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") return "";
  if (typeof window.MediaRecorder.isTypeSupported !== "function") return RECORDER_MIME_TYPES[0] || "";
  for (const type of RECORDER_MIME_TYPES) {
    try {
      if (window.MediaRecorder.isTypeSupported(type)) return type;
    } catch {}
  }
  return "";
}

function setRecorderStatus(message) {
  if (recorderStatus) recorderStatus.textContent = message;
}

function updateTranscribeButton() {
  if (!transcribeButton) return;
  const disabled = !recordedBlob || recorderState === "recording" || recorderState === "transcribing";
  transcribeButton.disabled = disabled;
  transcribeButton.textContent = recorderState === "transcribing" ? "Transcribing…" : "Transcribe";
}

function releasePlayback() {
  if (!recorderAudio) return;
  const url = recorderAudio.dataset.url;
  if (url) {
    try {
      URL.revokeObjectURL(url);
    } catch {}
    delete recorderAudio.dataset.url;
  }
  recorderAudio.pause();
  recorderAudio.removeAttribute("src");
  recorderAudio.load();
  recorderAudio.hidden = true;
}

function clearMediaStream() {
  if (mediaStream) {
    try {
      mediaStream.getTracks().forEach((t) => t.stop());
    } catch {}
    mediaStream = null;
  }
}

function buildAudioConstraints() {
  const preferred = settingsState?.transcription?.preferredInput;
  if (preferred && preferred !== "default") {
    return { audio: { deviceId: preferred } };
  }
  return { audio: true };
}

function shouldAutoUpload() {
  return Boolean(settingsState?.transcription?.autoUpload);
}

function queueAutoTranscription() {
  if (autoUploadTimeoutId) {
    window.clearTimeout(autoUploadTimeoutId);
    autoUploadTimeoutId = null;
  }
  if (!shouldAutoUpload()) return;
  autoUploadTimeoutId = window.setTimeout(() => {
    autoUploadTimeoutId = null;
    if (recorderState === "ready" && recordedBlob) {
      sendForTranscription();
    }
  }, 600);
}

function cleanupAfterTranscription() {
  if (settingsState?.transcription?.retainAudio) return;
  recordedBlob = null;
  releasePlayback();
  activeTranscriptionId = null;
  updateTranscribeButton();
}

async function startRecording() {
  if (!navigator?.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
    setRecorderStatus("Recording is not supported in this browser.");
    return;
  }
  try {
    if (activeTranscriptionAbortController) {
      try {
        activeTranscriptionAbortController.abort();
      } catch {}
      activeTranscriptionAbortController = null;
    }
    recorderState = "starting";
    updateTranscribeButton();
    activeTranscriptionId = null;
    recordedBlob = null;
    recordedChunks = [];
    releasePlayback();
    clearMediaStream();
    setRecorderStatus("Requesting microphone…");
    if (autoUploadTimeoutId) {
      window.clearTimeout(autoUploadTimeoutId);
      autoUploadTimeoutId = null;
    }
    if (recordButton) {
      recordButton.disabled = true;
      recordButton.textContent = "Starting…";
    }
    const constraints = buildAudioConstraints();
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      if (constraints.audio !== true) {
        console.warn("Preferred microphone unavailable, falling back to default", error);
        try {
          setRecorderStatus("Preferred microphone unavailable. Using system default.");
          setRecorderPreferencesMessage(
            "Preferred microphone unavailable. Using system default.",
            "error"
          );
        } catch {}
        settingsState.transcription.preferredInput = "default";
        persistSettingsState();
        applyTranscriptionSettingsToControls();
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } else {
        throw error;
      }
    }
    mediaStream = stream;
    const mimeType = selectRecorderMimeType();
    mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => {
      if (event?.data && event.data.size > 0) recordedChunks.push(event.data);
    };
    mediaRecorder.onerror = (event) => {
      console.warn("Recorder error", event?.error || event);
      recorderState = "idle";
      recordedChunks = [];
      recordedBlob = null;
      setRecorderStatus("Recording error. Please try again.");
      updateTranscribeButton();
      if (recordButton) {
        recordButton.disabled = false;
        recordButton.textContent = "Record";
      }
    };
    mediaRecorder.onstop = () => {
      clearMediaStream();
      if (recordButton) {
        recordButton.disabled = false;
        recordButton.textContent = "Record";
      }
      if (!recordedChunks.length) {
        setRecorderStatus("No audio captured. Try recording again.");
        recorderState = "idle";
        updateTranscribeButton();
        return;
      }
      const mime = mediaRecorder?.mimeType || mimeType || "audio/webm";
      recordedBlob = new Blob(recordedChunks, { type: mime });
      recordedChunks = [];
      recorderState = "ready";
      if (recorderAudio) {
        releasePlayback();
        const objectUrl = URL.createObjectURL(recordedBlob);
        recorderAudio.src = objectUrl;
        recorderAudio.hidden = false;
        recorderAudio.dataset.url = objectUrl;
      }
      if (shouldAutoUpload()) {
        setRecorderStatus("Recording captured. Sending for transcription automatically…");
      } else {
        setRecorderStatus("Recording ready. Click Transcribe to send it for transcription.");
      }
      updateTranscribeButton();
      queueAutoTranscription();
    };
    mediaRecorder.start();
    recorderState = "recording";
    if (recordButton) {
      recordButton.disabled = false;
      recordButton.textContent = "Stop";
    }
    setRecorderStatus("Recording…");
    updateTranscribeButton();
  } catch (error) {
    console.warn("Failed to start recording", error);
    setRecorderStatus(error?.message || "Microphone access failed.");
    recorderState = "idle";
    recordedChunks = [];
    recordedBlob = null;
    clearMediaStream();
    if (recordButton) {
      recordButton.disabled = false;
      recordButton.textContent = "Record";
    }
    updateTranscribeButton();
  }
}

function stopRecording() {
  if (!mediaRecorder) return;
  if (mediaRecorder.state === "inactive") return;
  recorderState = "stopping";
  setRecorderStatus("Finishing recording…");
  if (recordButton) {
    recordButton.disabled = true;
    recordButton.textContent = "Stopping…";
  }
  try {
    mediaRecorder.stop();
  } catch (error) {
    console.warn("Failed to stop recorder", error);
    recorderState = "idle";
    updateTranscribeButton();
    if (recordButton) {
      recordButton.disabled = false;
      recordButton.textContent = "Record";
    }
  }
}

function applyTranscriptText(text) {
  if (!transcriptTarget) return;
  const display = text && text.trim() ? text : "No transcript returned yet.";
  transcriptTarget.innerHTML = "";
  const paragraph = document.createElement("p");
  paragraph.textContent = display;
  transcriptTarget.appendChild(paragraph);
}

async function pollTranscription(id) {
  if (!id) {
    recorderState = "ready";
    updateTranscribeButton();
    return;
  }
  const timeoutAt = Date.now() + 60000;
  while (Date.now() < timeoutAt) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    if (!activeTranscriptionId || activeTranscriptionId !== id) return;
    try {
      const response = await fetch(`${DEV_API_BASE}/v1/transcribe/${encodeURIComponent(id)}`, {
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error || "Transcription failed.");
      if (!activeTranscriptionId || activeTranscriptionId !== id) return;
      if (payload.status === "completed") {
        applyTranscriptText(payload.text || "");
        setRecorderStatus("Transcription completed.");
        recorderState = "ready";
        cleanupAfterTranscription();
        updateTranscribeButton();
        return;
      }
      if (payload.status === "error") {
        setRecorderStatus(payload.error || "Transcription failed.");
        recorderState = "ready";
        updateTranscribeButton();
        return;
      }
      setRecorderStatus("Waiting for AssemblyAI…");
    } catch (error) {
      console.warn("Transcription poll failed", error);
      setRecorderStatus(error?.message || "Transcription polling failed.");
      recorderState = "ready";
      updateTranscribeButton();
      return;
    }
  }
  if (activeTranscriptionId === id) setRecorderStatus("Still processing… check again shortly.");
  recorderState = "ready";
  updateTranscribeButton();
}

async function sendForTranscription() {
  if (!recordedBlob) {
    setRecorderStatus("Record audio before requesting a transcript.");
    return;
  }
  if (autoUploadTimeoutId) {
    window.clearTimeout(autoUploadTimeoutId);
    autoUploadTimeoutId = null;
  }
  recorderState = "transcribing";
  updateTranscribeButton();
  if (recordButton) recordButton.disabled = true;
  const transcriber = getDirectTranscriber();
  if (transcriber?.hasApiKey) {
    const controller = new AbortController();
    activeTranscriptionAbortController = controller;
    activeTranscriptionId = "direct";
    setRecorderStatus("Uploading for transcription…");
    try {
      const result = await transcriber.transcribe(recordedBlob, {
        signal: controller.signal,
        onStatus: applyDirectTranscriberStatus,
      });
      applyTranscriptText(result?.text || "");
      setRecorderStatus("Transcription completed.");
      recorderState = "ready";
      cleanupAfterTranscription();
    } catch (error) {
      if (controller.signal.aborted) {
        setRecorderStatus("Transcription cancelled.");
      } else {
        console.warn("Transcription request failed", error);
        setRecorderStatus(error?.message || "Transcription failed.");
      }
    } finally {
      activeTranscriptionAbortController = null;
      activeTranscriptionId = null;
      if (recordButton) recordButton.disabled = false;
      if (recorderState === "transcribing") recorderState = "ready";
      updateTranscribeButton();
    }
    return;
  }
  setRecorderStatus("Uploading for transcription…");
  try {
    const response = await fetch(`${DEV_API_BASE}/v1/transcribe`, {
      method: "POST",
      headers: { "Content-Type": recordedBlob.type || "audio/webm" },
      body: recordedBlob,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }
    const payload = await response.json();
    if (!payload.ok) throw new Error(payload.error || "Transcription failed.");
    activeTranscriptionId = payload.id || null;
    if (payload.status === "completed") {
      applyTranscriptText(payload.text || "");
      setRecorderStatus("Transcription completed.");
      recorderState = "ready";
      cleanupAfterTranscription();
      return;
    }
    if (payload.status === "error") {
      setRecorderStatus(payload.error || "Transcription failed.");
      recorderState = "ready";
      return;
    }
    setRecorderStatus("Transcription in progress…");
    await pollTranscription(activeTranscriptionId);
  } catch (error) {
    console.warn("Transcription request failed", error);
    setRecorderStatus(error?.message || "Transcription failed.");
    activeTranscriptionId = null;
  } finally {
    if (recordButton) recordButton.disabled = false;
    if (recorderState === "transcribing") recorderState = "ready";
    updateTranscribeButton();
  }
}

async function checkRecorderHealth() {
  if (!recorderStatus) return;
  if (directTranscriptionAvailable()) {
    if (recorderState === "idle") {
      setRecorderStatus("Recorder ready. AssemblyAI transcription available. Click Record to begin.");
    }
    return;
  }
  try {
    const response = await fetch(`${DEV_API_BASE}/v1/health`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (recorderState === "idle") {
      if (payload.haveKey) {
        setRecorderStatus("Recorder ready. Click Record to begin.");
      } else {
        setRecorderStatus("Recorder ready. Add ASSEMBLYAI_API_KEY to enable transcription.");
      }
    }
  } catch {
    if (recorderState === "idle") {
      setRecorderStatus(
        "Recorder ready. Transcription unavailable (start dev API or inject ASSEMBLYAI_API_KEY)."
      );
    }
  }
}

function initRecorder() {
  if (!recordButton || !transcribeButton || !recorderControls) return;
  if (!navigator?.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
    recordButton.disabled = true;
    transcribeButton.disabled = true;
    setRecorderStatus("Recording is not supported in this browser.");
    return;
  }
  recordButton.addEventListener("click", () => {
    if (recorderState === "starting" || recorderState === "stopping") return;
    if (recorderState === "recording") {
      stopRecording();
      return;
    }
    if (recorderState !== "transcribing") startRecording();
  });
  transcribeButton.addEventListener("click", () => {
    if (!transcribeButton.disabled && recorderState !== "transcribing") {
      sendForTranscription();
    }
  });
  window.addEventListener("beforeunload", () => {
    clearMediaStream();
    releasePlayback();
  });
  setRecorderStatus("Recorder ready. Click Record to begin.");
  updateTranscribeButton();
  checkRecorderHealth();
}

if (settingsButton) settingsButton.addEventListener("click", () => toggleSettingsDrawer());
if (settingsClose) settingsClose.addEventListener("click", () => closeSettingsDrawer());
if (statusButton) statusButton.addEventListener("click", () => toggleDialog());
if (dialogClose) dialogClose.addEventListener("click", () => closeDialog());
if (statusRefresh) {
  statusRefresh.addEventListener("click", () => {
    setRefreshBusy(true);
    Promise.resolve(runChecks("dialog"))
      .catch((e) => console.warn("Refresh request failed", e))
      .finally(() => setRefreshBusy(false));
  });
}

document.addEventListener("keydown", handleShortcut);
window.addEventListener("scribecat:heartbeat", handleHeartbeat);
window.addEventListener("scribecat:heartbeat-ready", () => {
  const snapshot = window.__scribecatHeartbeat?.getSnapshot?.();
  if (snapshot && snapshot.statuses) handleHeartbeat({ detail: snapshot });
  flushHeartbeatQueue();
});

initializeSettingsManager();
setupNotesField();
loadVersionMetadata();
initRecorder();
runChecks("initial").catch((e) => console.warn("Initial heartbeat failed", e));

export {};
