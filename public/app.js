(() => {
const contacts = [
 {name:"Police Emergency",number:"112",description:"Pan-India emergency response",icon:"🚓",verified:true},
 {name:"Ambulance",number:"108",description:"Emergency medical response (availability varies)",icon:"🚑",verified:true},
 {name:"Fire & Rescue",number:"101",description:"Fire emergency services",icon:"🚒",verified:true},
 {name:"Municipal Corporation",number:"",description:"Add your city's verified municipal helpline",icon:"🏛️",verified:false},
 {name:"Water & Drainage",number:"",description:"Add your local water department number",icon:"💧",verified:false},
 {name:"Electricity Complaints",number:"",description:"Add your local electricity provider number",icon:"💡",verified:false}
];
let issues = [];
let dashboardMap;
const $ = id => document.getElementById(id);
function esc(v) { return window.CivicAuth.escapeHtml(v ?? ""); }
function toast(msg) { const el=$("toast"); el.textContent=msg; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600); }
function statusClass(status) { return status.toLowerCase().replace(/\s+/g,"-"); }
function iconFor(category) { return ({Roads:"🛣️",Waste:"🗑️",Water:"💧",Electricity:"💡",Sanitation:"🚻",Parks:"🌳",Traffic:"🚦","Public Health":"🏥"})[category] || "📍"; }
const departments = [
 {name:"Roads & potholes",category:"Roads",icon:"🛣️",desc:"Road damage, potholes and footpaths"},
 {name:"Waste management",category:"Waste",icon:"🗑️",desc:"Garbage collection and overflowing bins"},
 {name:"Water & drainage",category:"Water",icon:"💧",desc:"Leaks, water supply and blocked drains"},
 {name:"Electricity & lighting",category:"Electricity",icon:"💡",desc:"Streetlights and public electrical issues"},
 {name:"Sanitation",category:"Sanitation",icon:"🚻",desc:"Public toilets and sanitation concerns"},
 {name:"Parks & public spaces",category:"Parks",icon:"🌳",desc:"Parks, playgrounds and public spaces"},
 {name:"Traffic & road safety",category:"Traffic",icon:"🚦",desc:"Signals, signs and road safety"},
 {name:"Public health",category:"Public Health",icon:"🏥",desc:"Community health and hygiene concerns"}
];
function contactCard(c, mini=false) {
 const canCall=!!c.number;
 return `<div class="${mini?"contact-mini":"contact-card"}"><div class="contact-icon">${c.icon}</div><div class="contact-info"><b>${esc(c.name)}</b>${mini?`<small>${canCall?esc(c.number):"Local number required"}</small>`:`<p>${esc(c.description)}</p><div class="contact-number">${canCall?esc(c.number):"Not configured"}</div>`}${canCall?`<a href="tel:${esc(c.number)}">Call ${mini?"now":"service"} ↗</a>`:`${mini?"":'<span class="muted small">Contact administrator to verify this number.</span>'}`}</div></div>`;
}
function issueRow(i) { return `<div class="issue-row" data-issue="${esc(i.id)}"><div class="issue-symbol">${iconFor(i.category)}</div><div class="issue-row-main"><b>${esc(i.title)}</b><small>⌖ ${esc(i.location)} · ${esc(i.reportedAt)}</small></div><span class="status ${statusClass(i.status)}">${esc(i.status)}</span></div>`; }
function issueCard(i) { return `<article class="issue-card" data-issue="${esc(i.id)}"><div class="issue-meta"><span>${iconFor(i.category)} ${esc(i.category)}</span><span class="status ${statusClass(i.status)}">${esc(i.status)}</span></div><h3>${esc(i.title)}</h3><p>${esc(i.description)}</p><div class="issue-meta"><span>⌖ ${esc(i.location)}</span><span>${esc(i.id)} →</span></div></article>`; }
function renderIssues() {
 const departmentsGrid=$("departmentsGrid");
 if(departmentsGrid) departmentsGrid.innerHTML=departments.map(d=>`<button class="department-card" data-department="${esc(d.category)}"><span>${d.icon}</span><b>${esc(d.name)}</b><small>${esc(d.desc)}</small><em>${issues.filter(i=>i.category===d.category).length} reports</em></button>`).join("");
 $("statDepartments").textContent=departments.length;
 $("recentIssues").innerHTML = issues.slice(0,3).map(issueRow).join("");
 const query=($("issueSearch")?.value||"").toLowerCase();
 const status=$("statusFilter")?.value||"";
 const filtered=issues.filter(i=>(!status||i.status===status)&&[i.title,i.location,i.category,i.description].some(v=>v.toLowerCase().includes(query)));
 $("allIssues").innerHTML=filtered.length?filtered.map(issueCard).join():'<div class="panel">No issues match your search.</div>';
 $("statTotal").textContent=issues.length;
 $("statProgress").textContent=issues.filter(i=>i.status==="In progress").length;
 $("statResolved").textContent=issues.filter(i=>i.status==="Resolved").length;
 $("quickContacts").innerHTML=contacts.slice(0,4).map(c=>contactCard(c,true)).join("");
 $("contactsGrid").innerHTML=contacts.map(c=>contactCard(c)).join("");
 $("mapIssueList").innerHTML=issues.map(i=>`<button data-issue="${esc(i.id)}"><b>${esc(i.title)}</b><small>${esc(i.location)} · ${esc(i.status)}</small></button>`).join("");
 if(window.CivicMaps) window.CivicMaps.update(issues);
}
function openIssue(id) {
 const i=issues.find(x=>x.id===id); if(!i)return;
 $("issueModalTitle").textContent=i.title;
 const isOwner=!!(window.CivicAuth.currentUser && !i.sample && i.reportedBy===window.CivicAuth.currentUser.phone);
 $("issueDetails").innerHTML=`<div class="issue-meta"><span>${iconFor(i.category)} ${esc(i.category)}</span><span class="status ${statusClass(i.status)}">${esc(i.status)}</span></div><p class="detail-description">${esc(i.description)}</p>${isOwner?`<div class="owner-controls"><b>You're the reporter of this issue</b><p>Update the progress when you have a verified status update.</p><div class="owner-actions"><button class="btn outline" data-status="Reported" data-issue-status="${esc(i.id)}">Mark reported</button><button class="btn primary" data-status="In progress" data-issue-status="${esc(i.id)}">Start progress</button><button class="btn success" data-status="Resolved" data-issue-status="${esc(i.id)}">Mark resolved</button></div></div>`:`<div class="owner-note small muted">${i.sample?"This is an illustrative sample report.":"Only the person who submitted this report can update its status."}</div>`}<div class="detail-grid"><div class="detail-item"><small>Report ID</small><b>${esc(i.id)}</b></div><div class="detail-item"><small>Priority</small><b>${esc(i.priority)}</b></div><div class="detail-item"><small>Location</small><b>${esc(i.location)}</b></div><div class="detail-item"><small>Reported</small><b>${esc(i.reportedAt)}</b></div></div><div class="eyebrow">ISSUE LOCATION</div><div id="detailMap" class="detail-map"></div><p class="small muted">Map pin uses sample coordinates and may not reflect an actual report location.</p>`;
 $("issueModal").classList.remove("hidden");
 setTimeout(()=>window.CivicMaps?.showDetailMap(i),100);
}
function switchView(name) {
 document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
 const target=$(name+"View"); if(target)target.classList.remove("hidden");
 document.querySelectorAll(".nav-link[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 const titles={dashboard:"Dashboard overview",issues:"Community issues",map:"Live issue map",emergency:"Emergency contacts",assistant:"CivicPulse Assistant"};
 $("pageTitle").textContent=titles[name]||"CivicPulse";
 document.querySelector(".sidebar").classList.remove("open");
 if(name==="map")setTimeout(()=>window.CivicMaps?.invalidate(),120);
}
async function loadIssues() {
 try { const data=await window.CivicAuth.api("/api/issues"); issues=data.issues; renderIssues(); }
 catch(e) { toast(e.message); }
}
async function updateIssueStatus(id,status) {
 try { const result=await window.CivicAuth.api(`/api/issues/${encodeURIComponent(id)}/status`,{method:"PATCH",body:JSON.stringify({status})}); const idx=issues.findIndex(i=>i.id===id); if(idx>=0)issues[idx]=result.issue; renderIssues(); openIssue(id); toast(`Issue status updated: ${status}`); }
 catch(err){toast(err.message);}
}
async function submitIssue(e) {
 e.preventDefault();
 const payload={title:$("reportIssueTitle").value.trim(),category:$("reportCategory").value,location:$("reportLocation").value.trim(),lat:$("reportLat").value,lng:$("reportLng").value,description:$("reportDescription").value.trim()};
 try {
  const data=await window.CivicAuth.api("/api/issues",{method:"POST",body:JSON.stringify(payload)});
  issues.unshift(data.issue); renderIssues(); $("reportForm").reset(); $("reportMessage").textContent="Report added to the demo system."; $("reportModal").classList.add("hidden"); switchView("issues"); toast("Civic issue submitted.");
 } catch(err) { $("reportMessage").textContent=err.message; }
}
function init() { loadIssues(); }
document.addEventListener("click",e=>{
 const view=e.target.closest("[data-view]"); if(view){switchView(view.dataset.view);return;}
 const action=e.target.closest("[data-action]"); if(action?.dataset.action==="report"){$("reportModal").classList.remove("hidden");return;}
 const statusBtn=e.target.closest("[data-issue-status]"); if(statusBtn){updateIssueStatus(statusBtn.dataset.issueStatus,statusBtn.dataset.status);return;}
 const dept=e.target.closest("[data-department]"); if(dept){switchView("issues");$("issueSearch").value=dept.dataset.department;renderIssues();return;}
 const issue=e.target.closest("[data-issue]"); if(issue){openIssue(issue.dataset.issue);return;}
 const close=e.target.closest("[data-close]"); if(close){$(close.dataset.close).classList.add("hidden");return;}
 if(e.target.classList.contains("modal"))e.target.classList.add("hidden");
});
$("reportForm").addEventListener("submit",submitIssue);
$("issueSearch").addEventListener("input",renderIssues);
$("statusFilter").addEventListener("change",renderIssues);
$("profileBtn").addEventListener("click",()=>$("profileModal").classList.remove("hidden"));
$("topProfileBtn").addEventListener("click",()=>$("profileModal").classList.remove("hidden"));
$("mobileMenuBtn").addEventListener("click",()=>document.querySelector(".sidebar").classList.toggle("open"));
window.CivicPulse={init, getIssues:()=>issues, toast, switchView};
})();