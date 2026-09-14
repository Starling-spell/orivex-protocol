const agents=[{name:'ResearchBot-X',owner:'0x8293...A41C',cap:['Market research','Data analysis'],trust:'A+',actions:'2,450',avatar:'R'},{name:'CodeAgent-X',owner:'0x12f8...91B2',cap:['Software engineering','Audits'],trust:'A',actions:'1,892',avatar:'C'},{name:'Atlas Support',owner:'0x7a2d...EE09',cap:['Customer support','Operations'],trust:'B+',actions:'764',avatar:'A'},{name:'Signal Scout',owner:'0x1b93...C202',cap:['Trading research'],trust:'A',actions:'1,206',avatar:'S'}];
const table=document.getElementById('agentTable');
function renderAgents(list=agents){table.innerHTML='<div class="agent-row agent-head"><span>AGENT</span><span>CAPABILITIES</span><span>TRUST</span><span>VERIFIED ACTIONS</span><span></span></div>'+list.map(a=>`<div class="agent-row"><div class="agent-name"><span class="agent-avatar">${a.avatar}</span><div><div>${a.name}</div><div class="agent-sub">${a.owner}</div></div></div><div class="tags">${a.cap.map(c=>`<span class="tag">${c}</span>`).join('')}</div><div class="trust">${a.trust} <span style="color:#697594">trust</span></div><div class="actions-count">${a.actions}</div><div class="row-arrow">→</div></div>`).join('')}
renderAgents();
document.getElementById('agentSearch').addEventListener('input',e=>{const q=e.target.value.toLowerCase();renderAgents(agents.filter(a=>(a.name+a.owner+a.cap.join('')).toLowerCase().includes(q)))});
const modal=document.getElementById('registerModal');
document.querySelectorAll('[data-view="register"]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault();modal.hidden=false}));
document.getElementById('closeModal').addEventListener('click',()=>modal.hidden=true);modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3200)}
document.getElementById('verifyBtn').textContent='Verification preview';
document.getElementById('verifyBtn').addEventListener('click',()=>toast('Demo certificate only. GenLayer verification is not connected.'));
let lastFocused;
document.querySelectorAll('[data-view="register"]').forEach(el=>el.addEventListener('click',()=>{lastFocused=el;document.getElementById('closeModal').focus()}));
document.addEventListener('keydown',event=>{
  if(modal.hidden)return;
  if(event.key==='Escape'){modal.hidden=true;lastFocused?.focus();}
  if(event.key==='Tab' && modal.contains(document.activeElement)){
    const items=[...modal.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled)')];
    const first=items[0],last=items.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }
});
document.querySelectorAll('.pill').forEach(p=>p.addEventListener('click',()=>{document.querySelectorAll('.pill').forEach(x=>x.classList.remove('active'));p.classList.add('active')}));
