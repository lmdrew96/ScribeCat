const UPLOAD_URL = "https://api.assemblyai.com/v2/upload";
const TRANSCRIPT_URL = "https://api.assemblyai.com/v2/transcript";
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60;

function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("The operation was aborted.", "AbortError"));
      return;
    }
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      reject(new DOMException("The operation was aborted.", "AbortError"));
    }
    if (signal) {
      signal.addEventListener("abort", onAbort, { once: true });
    }
  });
}

function emitStatus(callback, stage, message) {
  if (typeof callback === "function") {
    try {
      callback({ stage, message, timestamp: new Date() });
    } catch (error) {
      console.warn("Transcription status listener failed", error);
    }
  }
}

async function uploadAudio(fetchImpl, blob, headers, signal, onStatus) {
  emitStatus(onStatus, "uploading", "Uploading audio…");
  const response = await fetchImpl(UPLOAD_URL, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/octet-stream",
    },
    body: blob,
    signal,
  });
  if (!response.ok) {
    throw new Error(`Upload failed (HTTP ${response.status})`);
  }
  const data = await response.json();
  if (!data?.upload_url) {
    throw new Error("AssemblyAI did not return an upload URL.");
  }
  return data.upload_url;
}

async function requestTranscript(fetchImpl, audioUrl, headers, signal, onStatus) {
  emitStatus(onStatus, "queued", "Requesting transcription…");
  const response = await fetchImpl(TRANSCRIPT_URL, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ audio_url: audioUrl }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to request transcript (HTTP ${response.status})`);
  }
  const data = await response.json();
  if (!data?.id) {
    throw new Error("AssemblyAI did not return a transcript id.");
  }
  return data.id;
}

async function pollTranscript(fetchImpl, transcriptId, headers, signal, onStatus) {
  const statusUrl = `${TRANSCRIPT_URL}/${encodeURIComponent(transcriptId)}`;
  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
    emitStatus(onStatus, "processing", "Transcribing audio…");
    const response = await fetchImpl(statusUrl, { headers, signal });
    if (!response.ok) {
      throw new Error(`Polling failed (HTTP ${response.status})`);
    }
    const data = await response.json();
    if (data?.status === "completed") {
      emitStatus(onStatus, "completed", "Transcription completed.");
      return data;
    }
    if (data?.status === "error") {
      const message = data?.error || "AssemblyAI reported an error.";
      throw new Error(message);
    }
    await delay(POLL_INTERVAL_MS, signal);
  }
  throw new Error("Transcription timed out. Try again with a shorter clip.");
}

export function createTranscriber(options = {}) {
  const rawKey = typeof options.apiKey === "string" ? options.apiKey.trim() : "";
  const fetchImpl = typeof options.fetch === "function" ? options.fetch : typeof options.fetchImpl === "function" ? options.fetchImpl : fetch;
  const apiKey = rawKey;
  const hasApiKey = apiKey.length > 0;

  async function transcribe(blob, config = {}) {
    if (!hasApiKey) {
      throw new Error("AssemblyAI API key is not configured.");
    }
    if (!(blob instanceof Blob) || blob.size === 0) {
      throw new Error("Audio blob is empty.");
    }
    const signal = config.signal;
    const onStatus = config.onStatus;
    const headers = { Authorization: apiKey };
    emitStatus(onStatus, "starting", "Preparing transcript request…");
    const audioUrl = await uploadAudio(fetchImpl, blob, headers, signal, onStatus);
    const transcriptId = await requestTranscript(fetchImpl, audioUrl, headers, signal, onStatus);
    const result = await pollTranscript(fetchImpl, transcriptId, headers, signal, onStatus);
    return { id: transcriptId, text: result?.text || "", raw: result };
  }

  return { hasApiKey, transcribe };
}
