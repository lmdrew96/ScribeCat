;(function(){
  const STATUS = {
    internet: {
      label: 'Internet',
      okText: 'Online',
      badText: 'Offline',
      checker: checkInternet,
    },
    static: {
      label: 'Static',
      okText: 'Running',
      badText: 'Down',
      checker: checkStatic,
    }
  };

  const chipTargets = new Map();
  let inFlight = null;
  let lastSnapshot = {
    reason: 'bootstrap',
    timestamp: new Date().toISOString(),
    statuses: {}
  };

  function $(sel){ return document.querySelector(sel); }
  function $all(sel){ return Array.from(document.querySelectorAll(sel)); }

  function styleTagOnce(){
    if ($('#sc-heartbeat-style')) return;
    const style = document.createElement('style');
    style.id = 'sc-heartbeat-style';
    style.textContent = [
      '[data-chip]{transition:opacity .2s ease}',
      '[data-chip][data-chip-kind="ghost"]{position:fixed;right:12px;padding:8px 12px;border-radius:999px;background:#1c1c1e;color:#fff;font:12px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;box-shadow:0 6px 18px rgba(0,0,0,.35);opacity:.92;z-index:999999}',
      '[data-chip][data-chip-kind="ghost"][data-chip-key="internet"]{bottom:60px}',
      '[data-chip][data-chip-kind="ghost"][data-chip-key="static"]{bottom:18px}',
      '[data-chip] .sc-chip-label{font-weight:600;margin-right:.35rem}',
      '[data-chip] .sc-chip-text{font-variant-numeric:tabular-nums}',
      '[data-chip][data-state="ok"]{outline:2px solid #28c972;outline-offset:2px}',
      '[data-chip][data-state="bad"]{outline:2px solid #ff3b30;outline-offset:2px}',
      '[data-chip][data-state="checking"]{outline:2px dashed rgba(255,255,255,.35);outline-offset:2px;opacity:.75}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function findByText(label){
    const needle = label.toLowerCase();
    const candidates = $all('[data-chip], .status-chip, button, div, span, a');
    const scored = candidates.map((el)=>{
      const text = (el.textContent||'').trim().toLowerCase();
      if(!text) return null;
      let score = 0;
      if(el.id && el.id.includes(label.toLowerCase())) score += 4;
      if(text.includes(needle)) score += 6;
      if(/chip|status|pill|badge/.test(el.className||'')) score += 4;
      const rect = el.getBoundingClientRect?.();
      if(rect){ if(rect.top < window.innerHeight/2) score += 1; if(rect.right > window.innerWidth/2) score += 1; }
      return score ? { el, score } : null;
    }).filter(Boolean).sort((a,b)=>b.score-a.score);
    return scored.length ? scored[0].el : null;
  }

  function ensureMessageEl(root, label){
    if(!root) return null;
    let msg = root.querySelector('[data-status-summary]');
    if(msg) return msg;
    msg = root.querySelector('.status-chip__message');
    if(msg) return msg;
    msg = root.querySelector('.sc-chip-text');
    if(msg) return msg;
    const span = document.createElement('span');
    span.className = 'sc-chip-text';
    span.textContent = 'Checking...';
    const labelSpan = root.querySelector('.sc-chip-label');
    if(labelSpan && labelSpan.parentElement){
      labelSpan.parentElement.appendChild(span);
    } else {
      const wrapper = document.createElement('span');
      wrapper.className = 'sc-chip-wrapper';
      const labelNode = document.createElement('span');
      labelNode.className = 'sc-chip-label';
      labelNode.textContent = label;
      wrapper.append(labelNode, document.createTextNode(' '), span);
      root.appendChild(wrapper);
    }
    return span;
  }

  function createGhost(key, meta){
    styleTagOnce();
    const ghost = document.createElement('div');
    ghost.setAttribute('data-chip', key);
    ghost.setAttribute('data-chip-kind', 'ghost');
    ghost.setAttribute('data-chip-key', key);
    ghost.id = ghost.id || 'chip-' + key;
    ghost.innerHTML = '<span class="sc-chip-label">'+meta.label+'</span><span class="sc-chip-text">Checking...</span>';
    document.body.appendChild(ghost);
    return ghost;
  }

  function ensureChip(key, meta){
    let el = $('#chip-' + key) || $('[data-chip="'+key+'"]');
    if(!el){
      el = document.querySelector('.status-chip[data-status="'+key+'"]') || findByText(meta.label);
    }
    if(!el){
      el = createGhost(key, meta);
    } else {
      styleTagOnce();
    }
    el.id = el.id || 'chip-' + key;
    el.setAttribute('data-chip', key);
    const isStatusChip = el.classList?.contains('status-chip') || el.dataset.status === key;
    const messageEl = ensureMessageEl(el, meta.label);
    return { root: el, messageEl, isStatusChip };
  }

  function ensureTargets(){
    Object.entries(STATUS).forEach(([key, meta]) => {
      if(!chipTargets.has(key)){
        chipTargets.set(key, ensureChip(key, meta));
      }
    });
  }

  function markState(key, state, text){
    const target = chipTargets.get(key);
    if(!target) return;
    const { root, messageEl, isStatusChip } = target;
    if(isStatusChip){
      if(state === 'checking'){ root.dataset.state = 'checking'; }
      else if(state === 'ok'){ root.dataset.state = 'online'; }
      else if(state === 'bad'){ root.dataset.state = 'offline'; }
    } else {
      root.dataset.state = state;
    }
    if(messageEl){
      messageEl.textContent = text;
    } else {
      root.textContent = text;
    }
  }

  async function checkInternet(){
    try{
      await Promise.race([
        fetch('https://www.gstatic.com/generate_204',{ mode:'no-cors', cache:'no-store' }),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),2500))
      ]);
      return true;
    }catch(_){
      return false;
    }
  }

  async function checkStatic(){
    try{
      const res = await fetch('http://localhost:1420/health?ts=' + Date.now(),{ cache:'no-store' });
      if(!res.ok) return false;
      const payload = await res.json().catch(()=>({}));
      return Boolean(payload && (payload.ok === undefined || payload.ok));
    }catch(_){
      return false;
    }
  }

  function buildSnapshot(reason, results){
    const timestamp = new Date().toISOString();
    const statuses = {};
    Object.entries(STATUS).forEach(([key, meta]) => {
      const result = results[key];
      const state = result?.state || (result?.ok ? 'ok' : 'bad');
      const ok = result?.ok ?? false;
      const message = result?.message || (ok ? meta.okText : meta.badText);
      statuses[key] = {
        key,
        state,
        ok,
        message,
        checkedAt: timestamp
      };
    });
    return { reason, timestamp, statuses };
  }

  function dispatchSnapshot(snapshot){
    lastSnapshot = snapshot;
    window.dispatchEvent(new CustomEvent('scribecat:heartbeat', { detail: snapshot }));
  }

  function setChecking(reason){
    Object.entries(STATUS).forEach(([key, meta]) => {
      markState(key, 'checking', 'Checking...');
    });
    dispatchSnapshot(buildSnapshot(reason, {
      internet: { state: 'checking', ok: false, message: 'Checking...' },
      static: { state: 'checking', ok: false, message: 'Checking...' }
    }));
  }

  async function runTick(reason){
    if(inFlight) return inFlight;
    ensureTargets();
    inFlight = (async()=>{
      const entries = Object.entries(STATUS);
      const checks = entries.map(async ([key, meta]) => {
        const ok = await meta.checker();
        const message = ok ? meta.okText : meta.badText;
        markState(key, ok ? 'ok' : 'bad', message);
        return { key, ok, message };
      });
      const resolved = await Promise.all(checks);
      const resultByKey = resolved.reduce((acc, item)=>{ acc[item.key] = { ok: item.ok, message: item.message }; return acc; }, {});
      const snapshot = buildSnapshot(reason, resultByKey);
      dispatchSnapshot(snapshot);
      return snapshot;
    })().catch((error)=>{
      console.warn('Heartbeat check failed', error);
      const fallback = buildSnapshot(reason, {});
      dispatchSnapshot(fallback);
      return fallback;
    }).finally(()=>{
      inFlight = null;
    });
    return inFlight;
  }

  function handleRequest(){
    runTick('external');
  }

  function announceReady(){
    window.dispatchEvent(new CustomEvent('scribecat:heartbeat-ready', { detail: { getSnapshot } }));
  }

  function getSnapshot(){
    return JSON.parse(JSON.stringify(lastSnapshot));
  }

  ensureTargets();
  styleTagOnce();
  setChecking('initial');
  runTick('initial');
  setInterval(()=>{ runTick('interval'); }, 5000);
  window.__scribecatHeartbeat = { tickNow: runTick, getSnapshot };
  window.addEventListener('scribecat:heartbeat-request', handleRequest);
  announceReady();
})();
