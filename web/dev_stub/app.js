const overlay=document.getElementById('overlay')
const closeBtn=document.getElementById('close')
const demoBtn=document.getElementById('demo')
function open(){overlay.removeAttribute('hidden')}
function close(){overlay.setAttribute('hidden','')}
document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='escape')close()})
overlay.addEventListener('click',e=>{if(e.target===overlay)close()})
if(closeBtn)closeBtn.addEventListener('click',close)
if(demoBtn)demoBtn.addEventListener('click',()=>overlay.hasAttribute('hidden')?open():close())
