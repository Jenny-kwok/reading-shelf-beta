const KEY="readingShelfV0";
const seed=[
 {id:crypto.randomUUID(),title:"門得列夫的夢",author:"",status:"reading",cover:null,addedAt:new Date().toISOString(),firstStartedAt:null,finishedAt:null,sessions:[],notes:[],provenance:{precision:"unknown"}},
 {id:crypto.randomUUID(),title:"Next face-out book",author:"",status:"upnext",cover:null,addedAt:new Date().toISOString(),firstStartedAt:null,finishedAt:null,sessions:[],notes:[],provenance:{precision:"unknown"}},
 {id:crypto.randomUUID(),title:"A book waiting on the shelf",author:"",status:"shelf",cover:null,addedAt:new Date().toISOString(),firstStartedAt:null,finishedAt:null,sessions:[],notes:[],provenance:{precision:"unknown"}}
];
let state=JSON.parse(localStorage.getItem(KEY)||"null")||{books:seed,active:null};
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
const esc=s=>(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function totalMs(b){return b.sessions.reduce((n,s)=>n+((s.end||Date.now())-s.start),0)}
function duration(ms){let m=Math.floor(ms/60000),h=Math.floor(m/60);return h?`${h}h ${m%60}m`:`${m}m`}
function dayNo(b){if(!b.firstStartedAt)return "Not started";return `Day ${Math.max(1,Math.ceil((Date.now()-new Date(b.firstStartedAt))/86400000))}`}
function card(b, timer=true){return `<article class="book" data-id="${b.id}">
  <div class="openBook">${b.cover?`<img class="cover" src="${b.cover}" alt="">`:`<div class="cover placeholder">${esc(b.title)}</div>`}</div>
  <div class="bookTitle">${esc(b.title)}</div><div class="meta">${dayNo(b)}${b.firstStartedAt?` · ${duration(totalMs(b))}`:""}</div>
  ${timer?`<button class="timerBtn ${state.active===b.id?"running":""}">${state.active===b.id?"Ⅱ Pause":"▶ Start"}</button>`:""}
</article>`}
function render(){
 const reading=state.books.filter(b=>b.status==="reading"), next=state.books.filter(b=>b.status==="upnext");
 readingRail.innerHTML=reading.map(b=>card(b)).join("")||`<p class="muted">No active books yet.</p>`;
 nextRail.innerHTML=next.map(b=>card(b)).join("")||`<p class="muted">Nothing queued. Wander the shelf.</p>`;
 readingCount.textContent=`${reading.length}`;nextCount.textContent=`${next.length}`;
 const q=search.value.toLowerCase();
 libraryGrid.innerHTML=state.books.filter(b=>["shelf","finished"].includes(b.status)&&(`${b.title} ${b.author} ${b.notes.map(n=>n.text).join(" ")}`).toLowerCase().includes(q)).map(b=>card(b,false)).join("");
 document.querySelectorAll(".timerBtn").forEach(x=>x.onclick=e=>{e.stopPropagation();toggleTimer(x.closest(".book").dataset.id)});
 document.querySelectorAll(".openBook").forEach(x=>x.onclick=()=>openBook(x.closest(".book").dataset.id));
 save();
}
function stopActive(at=Date.now()){
 if(!state.active)return;
 const b=state.books.find(x=>x.id===state.active); const s=b?.sessions.findLast?.(x=>!x.end)||[...(b?.sessions||[])].reverse().find(x=>!x.end);
 if(s)s.end=at; state.active=null;
}
function toggleTimer(id){
 const now=Date.now();
 if(state.active===id){stopActive(now);render();openBook(id,true);return}
 stopActive(now);const b=state.books.find(x=>x.id===id);b.status="reading";if(!b.firstStartedAt)b.firstStartedAt=new Date(now).toISOString();
 b.sessions.push({id:crypto.randomUUID(),start:now,end:null,startPage:null,endPage:null,note:""});state.active=id;render();
}
function openBook(id,postPause=false){
 const b=state.books.find(x=>x.id===id);const prov=b.provenance||{};
 dialogBody.innerHTML=`<div class="eyebrow">${b.status.toUpperCase()}</div><h2>${esc(b.title)}</h2><p class="muted">${esc(b.author)}</p>
 <div class="statline">${dayNo(b)} · ${duration(totalMs(b))} active</div>
 ${prov.when||prov.place||prov.type?`<p class="muted">Acquired ${esc(prov.when||"date unknown")}${prov.place?` · ${esc(prov.place)}`:""}${prov.type?` · ${esc(prov.type)}`:""}</p>`:""}
 ${postPause?`<label>Current page — optional<input id="pageNow" inputmode="numeric" placeholder="e.g. 186"></label><label>Quick note — optional<input id="noteNow" placeholder="What shifted / clicked / resisted?"></label><button type="button" class="primary" id="saveLog">Save reading log</button>`:""}
 <div class="actionRow"><button type="button" id="finish">Finish book</button><button type="button" id="moveNext">Move to Up Next</button></div>
 <h3>Reading log</h3>${b.sessions.slice().reverse().map(s=>`<div class="log">${new Date(s.start).toLocaleString()} · ${duration((s.end||Date.now())-s.start)}${s.endPage?` · p.${s.endPage}`:""}${s.note?`<br><small>${esc(s.note)}</small>`:""}</div>`).join("")||`<p class="muted">No sessions yet.</p>`}`;
 bookDialog.showModal();
 if(postPause)document.getElementById("saveLog").onclick=()=>{let s=[...b.sessions].reverse().find(x=>x.end);s.endPage=document.getElementById("pageNow").value||null;s.note=document.getElementById("noteNow").value||"";if(s.note)b.notes.push({at:s.end,text:s.note});save();bookDialog.close();render()};
 document.getElementById("finish").onclick=()=>{if(state.active===id)stopActive();b.status="finished";b.finishedAt=new Date().toISOString();save();bookDialog.close();render()};
 document.getElementById("moveNext").onclick=()=>{if(state.active===id)stopActive();b.status="upnext";save();bookDialog.close();render()};
}
addBtn.onclick=()=>addDialog.showModal();closeAdd.onclick=()=>addDialog.close();
coverInput.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{preview.src=r.result;preview.classList.remove("hidden")};r.readAsDataURL(f)};
saveBook.onclick=()=>{state.books.push({id:crypto.randomUUID(),title:titleInput.value.trim()||"Unmatched book",author:authorInput.value.trim(),status:statusInput.value,cover:preview.src&& !preview.classList.contains("hidden")?preview.src:null,addedAt:new Date().toISOString(),firstStartedAt:null,finishedAt:null,sessions:[],notes:[],provenance:{type:sourceType.value,place:sourcePlace.value.trim(),when:acquiredWhen.value.trim()}});save();addDialog.close();render()};
search.oninput=render;
randomBtn.onclick=()=>{const pool=state.books.filter(b=>b.status==="shelf");if(!pool.length)return;openBook(pool[Math.floor(Math.random()*pool.length)].id)};
document.querySelectorAll(".bottom button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".bottom button").forEach(x=>x.classList.remove("active"));b.classList.add("active");if(b.dataset.view==="shelf")return;simpleBody.innerHTML=b.dataset.view==="journey"?`<div class="eyebrow">JOURNEY</div><h2>Your reading over time</h2><p class="muted">V0 records the evidence now: first start, elapsed journey, active time and sessions. The visual timeline comes next.</p>`:b.dataset.view==="ideas"?`<div class="eyebrow">IDEA BANK</div><h2>Find the thought again.</h2><p class="muted">Session notes are searchable from the shelf already. Semantic retrieval comes later, after we have real notes to work with.</p>`:`<div class="eyebrow">DATA</div><h2>Import / Export</h2><p class="muted">Export a complete JSON backup, or import one made by this app.</p><button class="primary" id="exportBtn">Export JSON</button><label class="photoPick">Import JSON<input id="importFile" type="file" accept="application/json"></label>`;simpleDialog.showModal();
 if(b.dataset.view==="settings"){document.getElementById("exportBtn").onclick=()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="reading-shelf-backup.json";a.click()};document.getElementById("importFile").onchange=e=>{const r=new FileReader();r.onload=()=>{try{state=JSON.parse(r.result);save();simpleDialog.close();render()}catch{alert("Could not read this backup.")}};r.readAsText(e.target.files[0])}}
});
closeSimple.onclick=()=>simpleDialog.close();
setInterval(()=>{if(state.active)render()},30000);
render();