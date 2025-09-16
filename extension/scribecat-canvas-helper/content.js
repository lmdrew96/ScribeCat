(async () => {
  // Only run on dashboard-ish pages
  const onDash = /instructure\.com\/(dashboard|^$)/i.test(location.href) || document.querySelector('.ic-DashboardCard');

  function smartCourseLabel(raw) {
    if (!raw) return "";
    let r = raw.replace(/\s+/g, " ").trim();

    // SUBJECT + NUMBER
    const subjNum = r.match(/\b([A-Za-z]{2,6})\s*[- ]?\s*(\d{3,4}[A-Za-z]?)\b/);

    // Try to pull a human title after punctuation
    let title = "";
    const t1 = r.match(/[:–—-]\s*([A-Za-z].*)$/);
    if (t1) title = t1[1];

    // Strip terms/sections/noise
    const stripNoise = s => s
      .replace(/\((?:Fall|Spring|Summer|Winter)\s*20\d{2}\)/ig, "")
      .replace(/\b(Fall|Spring|Summer|Winter)\s*20\d{2}\b/ig, "")
      .replace(/\b(FA|SP|SU|WI)\s*\d{2}\b/ig, "")
      .replace(/\bsection\s*\d+[A-Za-z]?\b/ig, "")
      .replace(/\b-?\s*\d{2,3}[A-Za-z]?\b/g, "") // -010, -201L
      .replace(/\b\d{2}F?-?[A-Z]{2,5}\d{3}\b/ig, "") // 25F-BISC104
      .replace(/\b[A-Z]{2,5}\d{3,4}-\d{2,3}20\d{2}\b/ig, "") // BISC104-5102025
      .replace(/\s{2,}/g," ").trim();

    r = stripNoise(r);
    title = stripNoise(title);

    // If we have SUBJ+NUM, prefer that as the left part
    if (subjNum) {
      const subj = subjNum[1].toUpperCase();
      const num  = subjNum[2].toUpperCase();
      const goodTitle = /[A-Za-z]{3,}/.test(title) ? title : "";
      return (goodTitle ? `${subj} ${num} — ${goodTitle}` : `${subj} ${num}`).replace(/\s{2,}/g," ").trim();
    }

    // Fallback: trimmed r
    return r;
  }

  function scrapeCourseCards() {
    const items = [];

    // Canvas dashboard course cards typically use these selectors:
    const cardLinks = new Set([
      ...document.querySelectorAll('.ic-DashboardCard a.ic-DashboardCard__link'),
      ...document.querySelectorAll('a.ic-DashboardCard__link')
    ]);

    for (const a of cardLinks) {
      const href = a.getAttribute('href')||'';
      const m = href.match(/\/courses\/(\d+)/);
      if (!m) continue;
      const id = m[1];

      // Prefer visible card title if present
      let raw = "";
      const titleNode = a.querySelector('.ic-DashboardCard__header-title') ||
                        a.closest('.ic-DashboardCard')?.querySelector('.ic-DashboardCard__header-title');
      if (titleNode) raw = titleNode.textContent || "";
      if (!raw) raw = a.getAttribute('aria-label') || a.textContent || "";
      raw = raw.trim().replace(/\s+/g," ");
      if (!raw) continue;

      // Build label
      const name = smartCourseLabel(raw);
      if (!name) continue;

      items.push({ id, name });
    }

    // Deduplicate by ID (closest to “one row per course”)
    const byId = new Map();
    for (const it of items) {
      if (!byId.has(it.id)) byId.set(it.id, it);
      else {
        // keep the shorter, cleaner name
        const prev = byId.get(it.id);
        const pick = (it.name.length < prev.name.length) ? it : prev;
        byId.set(it.id, pick);
      }
    }
    return Array.from(byId.values());
  }

  function addSendButton(onClick) {
    if (document.getElementById("scribecat-send-btn")) return;
    const btn = document.createElement("button");
    btn.id = "scribecat-send-btn";
    btn.textContent = "Send to ScribeCat";
    Object.assign(btn.style, {
      position:"fixed", bottom:"16px", right:"16px", zIndex:"999999",
      padding:"10px 12px", border:"1px solid #d0d7de", borderRadius:"10px",
      background:"#ffd34d", color:"#151028", cursor:"pointer", fontWeight:"600"
    });
    btn.onclick = onClick;
    document.body.appendChild(btn);
  }

  const api = (typeof chrome !== "undefined") ? chrome : browser;
  const pushViaBackground = courses => new Promise(res => {
    api.runtime.sendMessage({ type:"pushCourses", courses }, r => res(r||{ok:false,error:"no response"}));
  });

  if (onDash) {
    addSendButton(async () => {
      const courses = scrapeCourseCards();
      if (!courses.length) { alert("No course cards found on this page."); return; }
      const resp = await pushViaBackground(courses);
      if (resp.ok) {
        const toast = document.createElement("div");
        toast.textContent = "ScribeCat: classes synced ✓";
        Object.assign(toast.style, {
          position:"fixed", bottom:"64px", right:"16px", padding:"8px 10px",
          background:"#151028", color:"#fff", borderRadius:"8px", zIndex:"999999",
          boxShadow:"0 6px 18px rgba(0,0,0,.2)"
        });
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
      } else {
        alert("ScribeCat sync failed: " + (resp.error || resp.text || "unknown error") + "\nIs ScribeCat running?");
      }
    });
  }
})();
