import http from "node:http";
import { URL } from "node:url";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

// Allow newer env var names from AGENTS.md while keeping legacy ones
function aliasEnv(target, candidates) {
  if (process.env[target]) return;
  for (const key of candidates) {
    if (process.env[key]) {
      process.env[target] = process.env[key];
      return;
    }
  }
}

aliasEnv("AAI_API_KEY", ["ASSEMBLYAI_API_KEY"]);
aliasEnv("AIRTABLE_PAT", ["AIRTABLE_API_KEY"]);
aliasEnv("AIRTABLE_BASE", ["AIRTABLE_BASE_ID"]);
aliasEnv("AIRTABLE_TABLE", ["AIRTABLE_TABLE_NAME"]);

const PORT = 8787;
let lastCanvasCourses = []; // [{id,name}]

const ORIGIN_ALLOWLIST = [
  "tauri://localhost",
  "http://127.0.0.1:8787",
  "http://localhost:8787",
  "chrome-extension://jafbaglnkkikhocbfkgonlmopgadmbih"
];
const ORIGIN_LOOKUP = new Map(ORIGIN_ALLOWLIST.map(origin => [origin.toLowerCase(), origin]));
const BASE_CORS_HEADERS = {
  "access-control-allow-headers": "content-type",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "vary": "Origin"
};

function matchAllowedOrigin(value) {
  if (!value) return null;
  return ORIGIN_LOOKUP.get(String(value).toLowerCase()) || null;
}

function deriveOriginFromHost(host) {
  if (!host) return null;
  const trimmed = String(host).trim();
  if (!trimmed) return null;
  return matchAllowedOrigin(`http://${trimmed}`);
}

function evaluateCors(req) {
  const headerOrigin = req.headers.origin;
  if (headerOrigin) {
    const allowed = matchAllowedOrigin(headerOrigin);
    if (allowed) return { allowed: true, origin: allowed };
    return { allowed: false, origin: null };
  }

  const hostOrigin = deriveOriginFromHost(req.headers.host);
  if (hostOrigin) return { allowed: true, origin: hostOrigin };

  return { allowed: true, origin: null };
}

function corsHeaders(cors) {
  const h = { ...BASE_CORS_HEADERS };
  if (cors?.origin) h["access-control-allow-origin"] = cors.origin;
  return h;
}

const json = (res, code, obj, cors) => {
  res.writeHead(code, { "content-type": "application/json", ...corsHeaders(cors) });
  res.end(JSON.stringify(obj));
};
const text = (res, code, str, cors) => {
  res.writeHead(code, { "content-type": "text/plain; charset=utf-8", ...corsHeaders(cors) });
  res.end(str);
};
async function bodyJSON(req){ const chunks=[]; for await (const c of req) chunks.push(c); if (!chunks.length) return {}; try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { return {}; }}

// === Name cleaners ===
function stripNoise(s){
  return s
    .replace(/\((?:Fall|Spring|Summer|Winter)\s*20\d{2}\)/ig, "")
    .replace(/\b(Fall|Spring|Summer|Winter)\s*20\d{2}\b/ig, "")
    .replace(/\b(FA|SP|SU|WI)\s*\d{2}\b/ig, "")
    .replace(/\bsection\s*\d+[A-Za-z]?\b/ig, "")
    .replace(/\b-?\s*\d{2,3}[A-Za-z]?\b/g, "")            // -010, -201L
    .replace(/\b\d{2}F?-?[A-Z]{2,5}\d{3}\b/ig, "")        // 25F-BISC104
    .replace(/\b[A-Z]{2,5}\d{3,4}-\d{2,3}20\d{2}\b/ig, "")// BISC104-5102025
    .replace(/\s{2,}/g," ").trim();
}
function looksLikeJunk(line){
  return /\b(points|submission|submissions|needs grading|Quiz|Assignment|Unit|EXAM|Chapter|Lab\b.*Cells|out of|required)\b/i.test(line);
}
function formatCodeTitle(raw){
  if (!raw) return "";
  let r = String(raw).replace(/\s+/g," ").trim();
  if (looksLikeJunk(r)) return "";

  // If already "CODE: Title", keep it but clean title
  let m = r.match(/\b([A-Za-z]{2,6})\s*-?\s*(\d{3,4}[A-Za-z]?)\s*:\s*(.+)$/);
  if (m){
    const code = (m[1]+m[2]).toUpperCase();
    const title = stripNoise(m[3]);
    return `${code}: ${title}`.trim();
  }

  // Try to find subject+number anywhere
  const subjNum = r.match(/\b([A-Za-z]{2,6})\s*[- ]?\s*(\d{3,4}[A-Za-z]?)\b/);
  // Try to find a title part (after colon or dash)
  const t1 = r.match(/:\s*([A-Za-z].*)$/);
  const t2 = r.match(/[–—-]\s*([A-Za-z].*)$/);
  let title = stripNoise((t1?.[1] || t2?.[1] || "").trim());

  if (subjNum){
    const code = (subjNum[1] + subjNum[2]).toUpperCase();
    if (title) return `${code}: ${title}`;
    return code;
  }

  // Fallback: cleaned raw (rare)
  return stripNoise(r);
}
function pickBestName(candidates){
  let best = "";
  let bestScore = -1;
  for (const name of candidates) {
    if (!name) continue;
    let score = 0;
    if (/^[A-Z]{2,6}\d{3,4}[A-Z]?: /.test(name)) score += 5;    // CODE: Title
    if (/^[A-Z]{2,6}\d{3,4}[A-Z]?$/.test(name)) score += 3;     // CODE
    score += Math.max(0, 40 - Math.abs(name.length - 28));      // gentle length target
    if (score > bestScore) { bestScore = score; best = name; }
  }
  return best;
}

/* ---- Airtable / Make helpers (unchanged) ---- */
async function airtableCreate(fields){
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE}/${encodeURIComponent(process.env.AIRTABLE_TABLE||"Recordings")}`;
  const r = await fetch(url, {
    method:"POST",
    headers:{ "authorization":`Bearer ${process.env.AIRTABLE_PAT}`, "content-type":"application/json" },
    body: JSON.stringify({ fields })
  });
  const j = await r.json().catch(()=>null);
  if (!r.ok) throw new Error(`Airtable ${r.status}: ${j ? JSON.stringify(j) : "(no body)"}`);
  return j;
}
async function airtableDelete(recordId){
  const url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE}/${encodeURIComponent(process.env.AIRTABLE_TABLE||"Recordings")}/${recordId}`;
  const r = await fetch(url, { method:"DELETE", headers:{ "authorization":`Bearer ${process.env.AIRTABLE_PAT}` }});
  const j = await r.json().catch(()=>null);
  if (!r.ok) throw new Error(`Airtable DEL ${r.status}: ${j ? JSON.stringify(j) : "(no body)"}`);
  return j;
}
async function makeKick(payload){
  const url = process.env.MAKE_WEBHOOK_URL;
  if (!url) return { skipped:true };
  const r = await fetch(url, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
  let j=null; try{ j = await r.json(); } catch {}
  return { status:r.status, body:j };
}

const server = http.createServer(async (req, res) => {
  const cors = evaluateCors(req);

  if (req.method === "OPTIONS") {
    if (!cors.allowed) {
      res.writeHead(403, corsHeaders(cors));
      return res.end();
    }
    res.writeHead(204, corsHeaders(cors));
    return res.end();
  }

  if (!cors.allowed) return json(res, 403, { error: "origin_forbidden" }, cors);
  const u = new URL(req.url, `http://${req.headers.host}`);
  const p = u.pathname;

  try {
    if (p === "/api/aai-token" && req.method === "GET"){
      const expires = u.searchParams.get("expires_in_seconds") || "300";
      const r = await fetch(`https://streaming.assemblyai.com/v3/token?expires_in_seconds=${encodeURIComponent(expires)}`, {
        method:"GET", headers:{ "Authorization": process.env.AAI_API_KEY }
      });
      const j = await r.json();
      if (!r.ok) return json(res, r.status, j, cors);
      return json(res, 200, j, cors);
    }

    if (p === "/api/fetch-ics" && req.method === "GET"){
      const src = u.searchParams.get("url"); if (!src) return text(res, 400, "missing url", cors);
      const r = await fetch(src); const t = await r.text();
      return text(res, 200, t, cors);
    }

    // ===== Canvas helper endpoints =====
    if (p === "/api/canvas-push" && req.method === "POST"){
      const b = await bodyJSON(req);
      const list = Array.isArray(b.courses) ? b.courses : [];

      // Group by course ID and pick best formatted "CODE: Title"
      const byId = new Map();
      for (const it of list) {
        const id = String(it?.id||"").trim();
        const cand = formatCodeTitle(it?.name||"");
        if (!id || !cand) continue;
        const arr = byId.get(id) || [];
        arr.push(cand);
        byId.set(id, arr);
      }
      const clean = [];
      for (const [id, arr] of byId.entries()) {
        const name = pickBestName(arr);
        if (name) clean.push({ id, name });
      }
      clean.sort((a,b)=>a.name.localeCompare(b.name));
      lastCanvasCourses = clean.slice(0, 200);
      return json(res, 200, { ok:true, count:lastCanvasCourses.length }, cors);
    }
    if (p === "/api/canvas-pull" && req.method === "GET"){
      // Always return formatted names
      return json(res, 200, { courses: lastCanvasCourses.map(c => ({ id:c.id, name: formatCodeTitle(c.name) })) }, cors);
    }

    // ===== OpenAI polish/summarize/chat =====
    if (p === "/api/summarize" && req.method === "POST"){
      const b = await bodyJSON(req);
      const prompt = `Summarize this university lecture transcript into:
- 5-10 bullet key points
- key terms with one-line definitions
- 3-5 potential exam questions
- action items (if any)

Return Markdown. Transcript:\n${b.transcript_text||""}`;
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method:"POST",
        headers:{ "authorization":`Bearer ${process.env.OPENAI_API_KEY}`, "content-type":"application/json" },
        body: JSON.stringify({ model:"gpt-4o-mini", messages:[{role:"user", content:prompt}], temperature:0.3 })
      });
      const j = await r.json(); if (!r.ok) return json(res, r.status, j, cors);
      return json(res, 200, { summary_md: j.choices?.[0]?.message?.content || "" }, cors);
    }

    if (p === "/api/polish" && req.method === "POST"){
      const b = await bodyJSON(req);
      const transcript = String(b.transcript_text||"").slice(0, 100000);
      if (!process.env.OPENAI_API_KEY) return json(res, 200, { polished: transcript, skipped: true, reason:"no_openai_key" }, cors);
      const prompt = `Fix casing, punctuation, and obvious mis-hearings in this ASR transcript. Keep meaning; do not summarize.\n\nRAW:\n${transcript}`;
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method:"POST",
        headers:{ "authorization":`Bearer ${process.env.OPENAI_API_KEY}`, "content-type":"application/json" },
        body: JSON.stringify({ model:"gpt-4o-mini", messages:[{role:"user", content:prompt}], temperature:0.2 })
      });
      const j = await r.json(); if (!r.ok) return json(res, r.status, j, cors);
      return json(res, 200, { polished: j.choices?.[0]?.message?.content || transcript, skipped:false }, cors);
    }

    if (p === "/api/openai-chat" && req.method === "POST"){
      const b = await bodyJSON(req);
      const include = !!b.include_context;
      const notes = (b.notes_html||"").replace(/<[^>]+>/g," ");
      const transcript = b.transcript_text||"";
      const sys = "You are ScribeCat, a study copilot. Be concise and structured.";
      const msgs = [{ role:"system", content: sys }];
      if (include){ msgs.push({ role:"user", content:`CONTEXT\nNotes:\n${notes}\n\nTranscript:\n${transcript}`}); }
      msgs.push({ role:"user", content: String(b.prompt||"") });
      const r = await fetch("https://api.openai.com/v1/chat/completions", {
        method:"POST",
        headers:{ "authorization":`Bearer ${process.env.OPENAI_API_KEY}`, "content-type":"application/json" },
        body: JSON.stringify({ model:"gpt-4o-mini", messages: msgs, temperature:0.3 })
      });
      const j = await r.json(); if (!r.ok) return json(res, r.status, j, cors);
      return json(res, 200, { reply: j.choices?.[0]?.message?.content || "" }, cors);
    }

    // ===== Save to Airtable =====
    if (p === "/api/save" && req.method === "POST"){
      const b = await bodyJSON(req);
      const fields = {};
      fields["Title"] = b.title || "Lecture";
      fields["Class"] = b.class_name || "";
      if (b.audio_url) fields["Audio URL"] = b.audio_url;
      if (Number.isFinite(b.duration_seconds) && b.duration_seconds > 0) fields["Duration (s)"] = b.duration_seconds;
      if (typeof b.confidence === "number") fields["Confidence"] = b.confidence;
      if (b.notes_html) fields["Notes (HTML)"] = b.notes_html;
      if (b.transcript_text) fields["Transcript (Text)"] = b.transcript_text;

      let created;
      try{ created = await airtableCreate(fields); }
      catch(e){ return json(res, 500, { error: String(e), hint: "Check Airtable PAT scope & base access; field names/types must match." }, cors); }

      const recordId = created.id;
      let makeResult;
      try{
        makeResult = await makeKick({
          title: fields["Title"],
          class_name: fields["Class"],
          notes_html: fields["Notes (HTML)"] || "",
          transcript_text: fields["Transcript (Text)"] || "",
          airtable: { baseId: process.env.AIRTABLE_BASE, table: process.env.AIRTABLE_TABLE || "Recordings", recordId }
        });
      }catch(e){ makeResult = { error: String(e) }; }
      return json(res, 200, { ok:true, airtable_record_id: recordId, make: makeResult }, cors);
    }

    if (p === "/api/diag-env" && req.method === "GET"){
      return json(res, 200, {
        AAI_API_KEY: !!process.env.AAI_API_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        AIRTABLE_PAT: !!process.env.AIRTABLE_PAT,
        AIRTABLE_BASE: !!process.env.AIRTABLE_BASE,
        AIRTABLE_TABLE: process.env.AIRTABLE_TABLE || "Recordings",
        MAKE_WEBHOOK_URL: !!process.env.MAKE_WEBHOOK_URL
      }, cors);
    }
    if (p === "/api/diag-airtable" && req.method === "POST"){
      let rec = null, del = null, err=null;
      try{
        rec = await airtableCreate({ "Title":"_diag", "Class":"_diag" });
        try{ del = await airtableDelete(rec.id); }catch(e){ del = { error: String(e) }; }
      }catch(e){ err = String(e); }
      return json(res, 200, { create: rec, delete: del, error: err }, cors);
    }

    if (p === "/api/quit" && req.method === "POST"){
      json(res, 200, { ok:true }, cors);
      setTimeout(()=>process.exit(0), 150);
      return;
    }

    if (p === "/" && req.method === "GET") return text(res, 200, "Local API on http://localhost:8787", cors);
    return json(res, 404, { error:"Not found" }, cors);
  } catch (e){ return json(res, 500, { error: e?.message || String(e) }, cors); }
});

server.listen(PORT, ()=>console.log(`Local API on http://localhost:${PORT}`));
