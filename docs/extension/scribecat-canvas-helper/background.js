const api = (typeof chrome !== "undefined") ? chrome : browser;

api.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === "pushCourses") {
    (async () => {
      try {
        const r = await fetch("http://localhost:8787/api/canvas-push", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ courses: msg.courses || [] })
        });
        const ok = r.ok;
        const text = await r.text().catch(() => "");
        sendResponse({ ok, text });
      } catch (e) {
        sendResponse({ ok: false, error: String(e) });
      }
    })();
    return true; // keep channel open for async
  }
});
