const net = document.getElementById('net')
const staticSpan = document.getElementById('static')
const internetSpan = document.getElementById('internet')
const overlay = document.getElementById('overlay')
const closeBtn = document.getElementById('close')
const demoBtn = document.getElementById('demo')

async function ping(url, timeout=1200){
  const ctl = new AbortController(); const id = setTimeout(()=>ctl.abort(), timeout)
  try { const r = await fetch(url, {signal: ctl.signal, cache:'no-store'}); clearTimeout(id); return r.ok }
  catch { clearTimeout(id); return false }
}

async function refreshStatus(){
  const staticOK = await ping('/', 800)
  staticSpan.textContent = staticOK ? 'up' : 'down'
  const netOK = await ping('https://www.cloudflare.com/cdn-cgi/trace', 1200)
  internetSpan.textContent = netOK ? 'online' : 'offline'
  net.textContent = netOK ? 'internet: reachable' : 'internet: offline'
}
refreshStatus()
setInterval(refreshStatus, 5000)

function openOverlay(){
  overlay.removeAttribute('hidden')
  const panel = overlay.querySelector('.panel')
  if (panel && panel.focus) panel.focus()
}
function closeOverlay(){
  overlay.setAttribute('hidden','')
}

document.addEventListener('keydown', e => {
  const k = e.key.toLowerCase()
  if (k === 'h') { overlay.hasAttribute('hidden') ? openOverlay() : closeOverlay() }
  if (k === 'escape') closeOverlay()
})
overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay() })
closeBtn.addEventListener('click', closeOverlay)
demoBtn.addEventListener('click', () => { overlay.hasAttribute('hidden') ? openOverlay() : closeOverlay() })
