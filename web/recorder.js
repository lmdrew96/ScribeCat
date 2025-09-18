const MIME_PREFERENCE = [
  { type: "audio/ogg;codecs=opus", extension: "ogg" },
  { type: "audio/webm;codecs=opus", extension: "webm" },
  { type: "audio/webm", extension: "webm" },
  { type: "audio/wav", extension: "wav" },
];

function selectMimeType() {
  if (typeof window === "undefined" || typeof window.MediaRecorder === "undefined") {
    return { type: "audio/webm", extension: "webm" };
  }
  for (const candidate of MIME_PREFERENCE) {
    if (typeof window.MediaRecorder.isTypeSupported === "function") {
      try {
        if (window.MediaRecorder.isTypeSupported(candidate.type)) {
          return candidate;
        }
      } catch {}
    }
  }
  return { type: "audio/webm", extension: "webm" };
}

function stopTracks(stream) {
  if (!stream) return;
  try {
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch {}
    });
  } catch {}
}

export function createAudioRecorder(options = {}) {
  const supported = Boolean(navigator?.mediaDevices?.getUserMedia) && typeof window.MediaRecorder !== "undefined";
  const noopRecorder = {
    isSupported: () => false,
    isRecording: () => false,
    async start() {
      throw new Error("MediaRecorder is not supported in this environment.");
    },
    async stop() {
      throw new Error("MediaRecorder is not supported in this environment.");
    },
    reset() {},
    getBlob() {
      return null;
    },
    getMimeType() {
      return "";
    },
    getExtension() {
      return "";
    },
  };

  if (!supported) {
    return noopRecorder;
  }

  const onStateChange = typeof options.onStateChange === "function" ? options.onStateChange : () => {};
  const onMeter = typeof options.onMeter === "function" ? options.onMeter : () => {};
  const onElapsed = typeof options.onElapsed === "function" ? options.onElapsed : () => {};
  const onError = typeof options.onError === "function" ? options.onError : () => {};
  const maxBytes = Number.isFinite(options.maxBytes) ? Number(options.maxBytes) : 30 * 1024 * 1024;
  const timeslice = Number.isFinite(options.timeslice) ? Number(options.timeslice) : 500;

  let state = "idle";
  let mediaStream = null;
  let mediaRecorder = null;
  let audioContext = null;
  let sourceNode = null;
  let analyserNode = null;
  let analyserBuffer = null;
  let rafId = null;
  let startTimestamp = 0;
  let durationMs = 0;
  let recordedBlob = null;
  let mimeType = "";
  let extension = "";
  let totalBytes = 0;
  let sizeLimitHit = false;
  let sizeLimitMessage = "";
  let stopPromise = null;
  let stopResolve = null;
  let stopReject = null;

  const chunks = [];

  function setState(next, payload = {}) {
    state = next;
    try {
      onStateChange({ state: next, ...payload });
    } catch (error) {
      console.warn("Recorder state listener failed", error);
    }
  }

  function cleanupNodes() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    onMeter(0);
    if (sourceNode) {
      try {
        sourceNode.disconnect();
      } catch {}
      sourceNode = null;
    }
    if (analyserNode) {
      try {
        analyserNode.disconnect();
      } catch {}
      analyserNode = null;
    }
    if (audioContext) {
      audioContext.close().catch(() => {});
      audioContext = null;
    }
  }

  function cleanupMedia() {
    if (mediaRecorder) {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onerror = null;
      mediaRecorder.onstop = null;
      try {
        if (mediaRecorder.state !== "inactive") {
          mediaRecorder.stop();
        }
      } catch {}
      mediaRecorder = null;
    }
    stopTracks(mediaStream);
    mediaStream = null;
    cleanupNodes();
  }

  function resetStopPromise() {
    stopPromise = null;
    stopResolve = null;
    stopReject = null;
  }

  function ensureStopPromise() {
    if (!stopPromise) {
      stopPromise = new Promise((resolve, reject) => {
        stopResolve = resolve;
        stopReject = reject;
      });
    }
    return stopPromise;
  }

  function reportError(error) {
    const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Recording failed.");
    try {
      onError(err);
    } catch (callbackError) {
      console.warn("Recorder error listener failed", callbackError);
    }
    setState("error", { error: err.message });
  }

  function computeLevel() {
    if (!analyserNode || !analyserBuffer) return 0;
    analyserNode.getByteTimeDomainData(analyserBuffer);
    let sumSquares = 0;
    for (let i = 0; i < analyserBuffer.length; i += 1) {
      const deviation = (analyserBuffer[i] - 128) / 128;
      sumSquares += deviation * deviation;
    }
    const rms = Math.sqrt(sumSquares / analyserBuffer.length);
    return Math.min(1, rms * 1.5);
  }

  function tick() {
    if (state !== "recording") return;
    const level = computeLevel();
    try {
      onMeter(level);
    } catch {}
    const now = performance.now();
    durationMs = now - startTimestamp;
    try {
      onElapsed(durationMs);
    } catch {}
    rafId = requestAnimationFrame(tick);
  }

  function handleDataAvailable(event) {
    if (!event?.data || event.data.size === 0) return;
    chunks.push(event.data);
    totalBytes += event.data.size;
    if (maxBytes > 0 && totalBytes >= maxBytes && !sizeLimitHit) {
      sizeLimitHit = true;
      const limitMb = (maxBytes / (1024 * 1024)).toFixed(1);
      sizeLimitMessage = `Recording stopped at ~${limitMb} MB to keep files manageable.`;
      setState("finalizing");
      try {
        mediaRecorder.stop();
      } catch (error) {
        reportError(error);
        stopReject?.(error);
        resetStopPromise();
      }
    }
  }

  function finalizeRecording() {
    const selectedType = mimeType || chunks.find((chunk) => chunk.type)?.type || undefined;
    try {
      recordedBlob = new Blob(chunks, selectedType ? { type: selectedType } : undefined);
    } catch (error) {
      recordedBlob = null;
      reportError(error);
      stopReject?.(error);
      resetStopPromise();
      return;
    }
    const payload = {
      blob: recordedBlob,
      bytes: recordedBlob ? recordedBlob.size : 0,
      duration: durationMs,
      mimeType: recordedBlob?.type || selectedType || "",
      extension,
      notice: sizeLimitHit && sizeLimitMessage ? sizeLimitMessage : undefined,
    };
    setState("ready", payload);
    sizeLimitHit = false;
    sizeLimitMessage = "";
    stopResolve?.(recordedBlob);
    resetStopPromise();
  }

  function handleStop() {
    cleanupNodes();
    stopTracks(mediaStream);
    mediaStream = null;
    mediaRecorder = null;
    finalizeRecording();
  }

  function handleRecorderError(event) {
    const error = event?.error instanceof Error ? event.error : new Error("Recording failed.");
    cleanupMedia();
    reportError(error);
    stopReject?.(error);
    resetStopPromise();
  }

  async function start() {
    if (state === "recording") {
      throw new Error("Recording already in progress.");
    }
    chunks.length = 0;
    totalBytes = 0;
    recordedBlob = null;
    mimeType = "";
    extension = "";
    durationMs = 0;
    sizeLimitHit = false;
    sizeLimitMessage = "";

    setState("requesting");
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      reportError(error);
      throw error;
    }

    const selected = selectMimeType();
    mimeType = selected.type;
    extension = selected.extension;

    try {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      sourceNode = audioContext.createMediaStreamSource(mediaStream);
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 2048;
      analyserBuffer = new Uint8Array(analyserNode.fftSize);
      sourceNode.connect(analyserNode);
    } catch (error) {
      cleanupMedia();
      reportError(error);
      throw error;
    }

    try {
      mediaRecorder = new MediaRecorder(mediaStream, mimeType ? { mimeType } : undefined);
    } catch (error) {
      cleanupMedia();
      reportError(error);
      throw error;
    }

    mediaRecorder.addEventListener("dataavailable", handleDataAvailable);
    mediaRecorder.addEventListener("stop", handleStop);
    mediaRecorder.addEventListener("error", handleRecorderError);

    try {
      mediaRecorder.start(timeslice);
    } catch (error) {
      cleanupMedia();
      reportError(error);
      throw error;
    }

    startTimestamp = performance.now();
    setState("recording");
    onMeter(0);
    onElapsed(0);
    rafId = requestAnimationFrame(tick);
    return true;
  }

  async function stop() {
    if (state === "idle" || state === "ready") {
      return recordedBlob;
    }
    if (state === "error") {
      return recordedBlob;
    }
    const promise = ensureStopPromise();
    if (state === "recording") {
      setState("finalizing");
      try {
        mediaRecorder.stop();
      } catch (error) {
        cleanupMedia();
        reportError(error);
        stopReject?.(error);
        resetStopPromise();
        throw error;
      }
    } else if (state === "finalizing") {
      // Already stopping; wait for promise.
    } else if (state === "requesting") {
      cleanupMedia();
      setState("idle");
      stopResolve?.(null);
      resetStopPromise();
      return null;
    }
    return promise;
  }

  function reset() {
    cleanupMedia();
    chunks.length = 0;
    totalBytes = 0;
    recordedBlob = null;
    mimeType = "";
    extension = "";
    durationMs = 0;
    sizeLimitHit = false;
    sizeLimitMessage = "";
    if (state !== "idle") {
      setState("idle");
    }
  }

  return {
    isSupported: () => true,
    isRecording: () => state === "recording",
    async start() {
      return start();
    },
    async stop() {
      return stop();
    },
    reset,
    getBlob: () => recordedBlob,
    getMimeType: () => mimeType,
    getExtension: () => extension,
  };
}
