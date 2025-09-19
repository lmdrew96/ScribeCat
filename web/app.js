const DEFAULT_PRODUCT = { name: "ScribeCat", version: "0.3.0" };
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
const recorderControls = document.querySelector("[data-recorder-controls]");
const recordButton = document.querySelector("[data-recorder-record]");
const transcribeButton = document.querySelector("[data-recorder-transcribe]");
const recorderStatus = document.querySelector("[data-recorder-status]");
const recorderAudio = document.querySelector("[data-recorder-audio]");
const transcriptTarget =
  document.getElementById("transcript") ||
  document.querySelector(".transcript-area") ||
  document.querySelector("[data-transcript]");

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

const DEV_API_BASE = "http://localhost:8787";
let recorderState = "idle";
let mediaRecorder = null;
let mediaStream = null;
let recordedChunks = [];
let recordedBlob = null;
let activeTranscriptionId = null;

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
  dialogOpen = true;
  lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialogRoot.hidden = false;
  document.body.dataset.dialogOpen = "true";
  if (statusButton) statusButton.setAttribute("aria-expanded", "true");
  dialogRoot.addEventListener("click", handleDialogRootClick);
  document.addEventListener("keydown", handleDialogKeydown);
  dialogPanel.addEventListener("keydown", trapDialogFocus);
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
  dialogPanel.removeEventListener("keydown", trapDialogFocus);
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

async function startRecording() {
  if (!navigator?.mediaDevices?.getUserMedia || typeof window.MediaRecorder === "undefined") {
    setRecorderStatus("Recording is not supported in this browser.");
    return;
  }
  try {
    recorderState = "starting";
    updateTranscribeButton();
    activeTranscriptionId = null;
    recordedBlob = null;
    recordedChunks = [];
    releasePlayback();
    clearMediaStream();
    setRecorderStatus("Requesting microphone…");
    if (recordButton) {
      recordButton.disabled = true;
      recordButton.textContent = "Starting…";
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
      setRecorderStatus("Recording ready. Click Transcribe to send it for transcription.");
      updateTranscribeButton();
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
  recorderState = "transcribing";
  updateTranscribeButton();
  if (recordButton) recordButton.disabled = true;
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
  } finally {
    if (recordButton) recordButton.disabled = false;
    if (recorderState === "transcribing") recorderState = "ready";
    updateTranscribeButton();
  }
}

async function checkRecorderHealth() {
  if (!recorderStatus) return;
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
      setRecorderStatus("Recorder ready. Dev API unavailable.");
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

setupNotesField();
loadVersionMetadata();
initRecorder();
runChecks("initial").catch((e) => console.warn("Initial heartbeat failed", e));

export {};