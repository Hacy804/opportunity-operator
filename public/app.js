const names={mcp:'MCP tool execution',sandbox:'Isolated sandbox',subagents:'Subagent delegation',approvalGate:'Human approval gate',sessionPersistence:'Session persistence'};
async function refresh(){
  const state=await fetch('/api/state',{cache:'no-store'}).then(r=>r.json());
  document.querySelector('#status').textContent=(state.status||'not started').replaceAll('_',' ').toUpperCase();
  document.querySelector('#title').textContent=state.selected?.title||'Waiting for candidate…';
  document.querySelector('#ev').textContent=state.selected?.ev===undefined?'—':`+$${state.selected.ev.toFixed(2)}`;
  document.querySelector('#session').textContent=`SESSION ${state.sessionId?.slice(-8)||'—'}`;
  const waiting=state.trueforge?.approvalGate;
  document.querySelector('#gate-title').textContent=waiting?'Human checkpoint observed':'Awaiting agent';
  document.querySelector('#gate-copy').textContent=waiting?'TrueForge stopped the turn before the local mock submission and required an explicit decision.':'The harness will pause before the submission tool can run.';
  document.querySelector('#timeline').innerHTML=(state.timeline||[]).map((s,i)=>`<div class="step ${s.kind==='approval'?'approval':''}"><b>${String(i+1).padStart(2,'0')}</b><div><strong>${s.label}</strong><p>${s.detail}</p></div><time>${new Date(s.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'})}</time></div>`).join('')||'<div class="step"><b>00</b><div><strong>No run yet</strong><p>Start the reproducible demo to populate this trace.</p></div></div>';
  document.querySelector('#evidence').innerHTML=Object.entries(names).map(([key,label])=>`<div class="proof"><span>${label}${key==='subagents'?` · ${state.trueforge?.subagents||0}`:''}</span><i class="${key==='subagents'?(state.trueforge?.subagents>=2?'on':''):(state.trueforge?.[key]?'on':'')}"></i></div>`).join('');
}
refresh();setInterval(refresh,1500);
