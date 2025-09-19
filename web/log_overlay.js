;(function(){
  const WRAP="sc-term-wrap", HEAD="sc-term-head", BODY="sc-term-body";
  const STORE_CLOSED="sc-term-closed", STORE_COLLAPSED="sc-term-collapsed";

  function el(tag, attrs){ const e=document.createElement(tag); if(attrs){ for(const k in attrs){ e.setAttribute(k, attrs[k]); } } return e; }
  function isClosed(){ return localStorage.getItem(STORE_CLOSED)==='1'; }
  function setClosed(v){ if(v){ localStorage.setItem(STORE_CLOSED,'1'); const w=document.getElementById(WRAP); if(w) w.remove(); } else { localStorage.removeItem(STORE_CLOSED); ensureUI(); } }
  function isCollapsed(){ return localStorage.getItem(STORE_COLLAPSED)==='1'; }
  function setCollapsed(v){
    if(v){ localStorage.setItem(STORE_COLLAPSED,'1'); } else { localStorage.removeItem(STORE_COLLAPSED); }
    const b=document.getElementById(BODY);
    const btn=document.getElementById('sc-term-collapse-btn');
    if(b) b.style.display = v ? 'none' : 'block';
    if(btn) btn.textContent = v ? '▸' : '▾';
  }

  function ensureUI(){
    if(isClosed()) return null;
    let w=document.getElementById(WRAP);
    if(w) return w;
    w=el('div',{id:WRAP,style:'position:fixed; right:8px; bottom:8px; width:360px; max-height:40vh; background:#0b0b0c; border:1px solid #2a2a2e; border-radius:8px; box-shadow:0 8px 24px rgba(0,0,0,.5); color:#e8e8ea; font:12px/1.4 -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; z-index:2147483647; overflow:hidden;'});
    const head=el('div',{id:HEAD,style:'display:flex;align-items:center;gap:6px;padding:6px 8px;background:#141418;border-bottom:1px solid #2a2a2e;'});
    const btnCollapse=el('button',{id:'sc-term-collapse-btn',style:'border:0;background:#232329;color:#e8e8ea;padding:2px 6px;border-radius:4px;cursor:pointer;'}); btnCollapse.textContent='▾';
    const title=el('div',{style:'flex:1;opacity:.8'}); title.textContent='ScribeCat • Launch Log';
    const btnClear=el('button',{id:'sc-term-clear-btn',style:'border:0;background:#232329;color:#e8e8ea;padding:2px 6px;border-radius:4px;cursor:pointer;'}); btnClear.textContent='Clear';
    const btnClose=el('button',{id:'sc-term-close-btn',style:'border:0;background:#a83a3a;color:#fff;padding:2px 8px;border-radius:4px;cursor:pointer;'}); btnClose.textContent='✕';
    head.append(btnCollapse,title,btnClear,btnClose);
    const body=el('pre',{id:BODY,style:'margin:0;padding:8px 10px;max-height:28vh;overflow:auto;white-space:pre-wrap;'});
    w.append(head,body);
    document.body.appendChild(w);
    btnCollapse.addEventListener('click',()=>setCollapsed(!isCollapsed()));
    btnClear.addEventListener('click',()=>{ body.textContent=''; });
    btnClose.addEventListener('click',()=>setClosed(true));
    setCollapsed(isCollapsed());
    return w;
  }

  async function poll(){
    try{
      if(isClosed()){ setTimeout(poll,1500); return; }
      const url='/.runtime/dev.log?_=' + Date.now();
      const r=await fetch(url);
      if(r.ok){
        const txt=await r.text();
        const w=ensureUI();
        if(w){
          const b=w.querySelector('#'+BODY);
          if(b && b.dataset.last !== String(txt.length)){
            b.textContent=txt;
            b.dataset.last=String(txt.length);
            b.scrollTop=b.scrollHeight;
          }
        }
      }
    }catch(_){}
    setTimeout(poll,1000);
  }

  document.addEventListener('keydown',e=>{
    if(e.key==='`' && e.shiftKey){
      setClosed(isClosed()?false:true);
    }else if(e.key==='`'){
      if(!isClosed()) setCollapsed(!isCollapsed());
    }
  });

  if(!document.getElementById(WRAP) && !isClosed()) ensureUI();
  poll();
})();
