const api = (typeof chrome !== "undefined") ? chrome : browser;

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "pushCourses") {
    (async () => {
      try {
        const targets = [
          "http://127.0.0.1:8787",
          "http://localhost:8787"
        ];
        let response = null;
        let lastError = null;
        for (const base of targets) {
          try {
            response = await fetch(`${base}/api/canvas-push`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ courses: msg.courses || [] })
            });
            break;
          } catch (err) {
            lastError = err;
          }
        }
        if (!response) {
          sendResponse({ ok: false, error: String(lastError || "Failed to reach local API") });
          return;
        }
        const ok = response.ok;
        const text = await response.text().catch(() => "");
        sendResponse({ ok, text });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true; // keep channel open for async
  }
});
