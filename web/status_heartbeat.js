;(function(){
  const q=s=>document.querySelector(s);
  const qa=s=>Array.from(document.querySelectorAll(s));
  const byIdOrData = name => q('#chip-'+name) || q('[data-chip="'+name+'"]');

  function findByText(txt){
    const T = txt.toLowerCase();
    const els = qa('button,div,span,a,li');
    const scored = els.map(el=>{
      const t=(el.textContent||'').trim().toLowerCase();
      if(!t) return null;
      let score=0;
      if(t.includes(T)) score+=10;
      if(el.className && /chip|status|pill|badge/i.test(el.className)) score+=5;
      const r = el.getBoundingClientRect?.()||{top:0,left:0};
      if(r.top<200) score+=1;
      if(r.left>window.innerWidth/2) score+=1;
      return score?{el,score}:null;
    }).filter(Boolean).sort((a,b)=>b.score-a.score);
    return scored.length?scored[0].el:null;
  }

  function ensureChip(name, label){
    let el = byIdOrData(name);
    if(!el) el = findByText(label);
    if(el){ el.id = 'chip-'+name; el.setAttribute('data-chip',name); styleChip(el); return el; }
    const ghost = document.createElement('div');
    ghost.id = 'chip-'+name;
    ghost.setAttribute('data-chip',name);
    ghost.className = 'sc-chip';
    ghost.innerHTML = '<span class="sc-chip-label">'+label+'</span> <span class="sc-chip-text">Checking...</span>';
    ghost.style.cssText = 'position:fixed;right:12px;bottom:'+(name==='internet'?'58':'18')+'px;padding:8px 12px;border-radius:999px;background:#222;color:#fff;font:12px/1 system-ui;box-shadow:0 2px 8px rgba(0,0,0,.25);opacity:.9;z-index:99999';
    document.body.appendChild(ghost);
    return ghost;
  }

  function styleTagOnce(){
    if(q('#sc-chip-style')) return;
    const s=document.createElement('style');
    s.id='sc-chip-style';
    s.textContent = [
      '[data-chip][data-state="ok"]{outline:2px solid #28c972;outline-offset:2px}',
      '[data-chip][data-state="bad"]{outline:2px solid #ff3b30;outline-offset:2px}',
      '.sc-chip-text{margin-left:.25rem;font-weight:600}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function styleChip(el){ styleTagOnce(); if(!el.querySelector('.sc-chip-text')){ const t=document.createElement('span'); t.className='sc-chip-text'; t.textContent='Checking...'; el.appendChild(t); } }

  const set=(el,txt)=>{ if(!el) return; (el.querySelector('.sc-chip-text')||el).textContent=txt; };
  const mark=(el,ok)=>{ if(!el) return; el.dataset.state=ok?'ok':'bad'; el.style.opacity=1; };

  async function checkInternet(){
    try{
      const p=Promise.race([
        fetch('https://www.gstatic.com/generate_204',{mode:'no-cors',cache:'no-store'}),
        new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),2500))
      ]);
      await p; return true;
    }catch{ return false; }
  }
  async function checkStatic(){
    try{
      const r=await fetch('http://localhost:1420/health?ts='+Date.now(),{cache:'no-store'});
      return r.ok;
    }catch{ return false; }
  }

  const chipInternet = ensureChip('internet','Internet');
  const chipStatic   = ensureChip('static','Static');

  async function tick(){
    set(chipInternet,'Checking...'); set(chipStatic,'Checking...');
    const [i,s] = await Promise.all([checkInternet(),checkStatic()]);
    set(chipInternet, i?'Online':'Offline'); mark(chipInternet, i);
    set(chipStatic,   s?'Running':'Down');   mark(chipStatic,   s);
  }

  tick(); setInterval(tick,5000);
})();
