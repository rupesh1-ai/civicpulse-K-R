(() => {
const $ = id => document.getElementById(id);
const mainForm = $('chatForm'), mainInput = $('chatInput'), mainMessages = $('chatMessages');
const quickForm = $('quickChatForm'), quickInput = $('quickChatInput'), quickMessages = $('quickChatMessages');
const quickPanel = $('quickAssistant'), fab = $('assistantFab');
function addBubble(container, text, kind) {
 const node=document.createElement('div'); node.className=`bubble ${kind}`; node.textContent=text; container.appendChild(node); container.scrollTop=container.scrollHeight; return node;
}
async function sendMessage(input, container, statusEl) {
 const message=input.value.trim(); if(!message)return;
 addBubble(container,message,'user'); input.value=''; if(statusEl)statusEl.textContent='Thinking…';
 const waiting=addBubble(container,'Preparing a response…','bot');
 try {
  const result=await window.CivicAuth.api('/api/assistant',{method:'POST',body:JSON.stringify({message})});
  waiting.textContent=result.answer; if(statusEl)statusEl.textContent='Ready to help';
 } catch(err) { waiting.textContent=err.message; if(statusEl)statusEl.textContent='Temporarily unavailable'; }
 container.scrollTop=container.scrollHeight;
}
mainForm?.addEventListener('submit', e=>{e.preventDefault();sendMessage(mainInput,mainMessages,$('aiStatus'));});
quickForm?.addEventListener('submit', e=>{e.preventDefault();sendMessage(quickInput,quickMessages,$('quickAiStatus'));});
let dragged=false, dragStart=null;
function clampAssistant(x,y){const r=fab.getBoundingClientRect();return {x:Math.max(0,Math.min(window.innerWidth-r.width,x)),y:Math.max(0,Math.min(window.innerHeight-r.height,y))};}
fab?.addEventListener('pointerdown',e=>{dragged=false;dragStart={x:e.clientX,y:e.clientY,rect:fab.getBoundingClientRect()};fab.setPointerCapture?.(e.pointerId);});
fab?.addEventListener('pointermove',e=>{if(!dragStart)return;const dx=e.clientX-dragStart.x,dy=e.clientY-dragStart.y;if(Math.abs(dx)+Math.abs(dy)>7)dragged=true;if(dragged){const pos=clampAssistant(dragStart.rect.left+dx,dragStart.rect.top+dy);fab.style.left=pos.x+'px';fab.style.top=pos.y+'px';fab.style.right='auto';fab.style.bottom='auto';fab.classList.add('dragging');quickPanel.style.left=Math.min(pos.x,window.innerWidth-quickPanel.offsetWidth-8)+'px';quickPanel.style.right='auto';quickPanel.style.top=Math.max(8,Math.min(pos.y-quickPanel.offsetHeight-12,window.innerHeight-quickPanel.offsetHeight-8))+'px';quickPanel.style.bottom='auto';}});
fab?.addEventListener('pointerup',()=>{dragStart=null;fab.classList.remove('dragging');setTimeout(()=>{dragged=false;},0);});
fab?.addEventListener('click',()=>{if(dragged)return;quickPanel.classList.toggle('hidden');if(!quickPanel.classList.contains('hidden'))quickInput.focus();});
$('quickAssistantClose')?.addEventListener('click',()=>quickPanel.classList.add('hidden'));
function startVoice(input, statusEl) {
 const SpeechRecognition=window.SpeechRecognition || window.webkitSpeechRecognition;
 if(!SpeechRecognition){ if(statusEl)statusEl.textContent='Voice input is not supported here. Try Chrome or Edge.'; alert('Voice input is not supported by this browser. Please use a recent version of Chrome or Edge, or type your question.'); return; }
 const recognition=new SpeechRecognition(); recognition.lang='en-IN'; recognition.interimResults=true; recognition.continuous=false;
 const oldText=input.value.trim(); if(statusEl)statusEl.textContent='Listening… speak now';
 recognition.onresult=event=>{let transcript='';for(let i=event.resultIndex;i<event.results.length;i++)transcript+=event.results[i][0].transcript;input.value=[oldText,transcript].filter(Boolean).join(' ').trim();};
 recognition.onerror=event=>{if(statusEl)statusEl.textContent=event.error==='not-allowed'?'Microphone permission denied':'Could not hear you. Try again or type your question.';};
 recognition.onend=()=>{if(statusEl && statusEl.textContent==='Listening… speak now')statusEl.textContent='Voice captured — press Send when ready';};
 try { recognition.start(); } catch { if(statusEl)statusEl.textContent='Microphone is busy. Try again.'; }
}
$('chatMicBtn')?.addEventListener('click',()=>startVoice(mainInput,$('aiStatus')));
$('quickChatMic')?.addEventListener('click',()=>startVoice(quickInput,$('quickAiStatus')));
})();
