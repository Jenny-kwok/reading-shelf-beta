const KEY="readingShelfV03";
const OLD_KEY="readingShelfV0";
const uuid=()=>crypto.randomUUID();
const iso=x=>new Date(x).toISOString();
const now=()=>Date.now();
const esc=s=>(s||"").toString().replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const seed={schemaVersion:"0.3.0",books:[],ideas:[],active:null};

function migrateOld(){
  const old=JSON.parse(localStorage.getItem(OLD_KEY)||"null");
  if(!old)return null;
  return {schemaVersion:"0.3.0",active:old.active||null,ideas:[],
    books:(old.books||[]).map(b=>({...b,
      acquisition:b.acquisition||b.provenance||{type:"",place:"",when:"",precision:"unknown"},
      firstStartedAt:b.firstStartedAt||null,finishedAt:b.finishedAt||null,
      sessions:(b.sessions||[]).map(s=>({...s,startPage:s.startPage||null,endPage:s.endPage||null,note:s.note||""})),
      notes:b.notes||[]
    }))
  };
}
let state=JSON.parse(localStorage.getItem(KEY)||"null")||migrateOld()||seed;
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
function totalMs(b){return (b.sessions||[]).reduce((n,s)=>n+((s.end||now())-s.start),0)}
function duration(ms){let m=Math.max(0,Math.floor(ms/60000)),h=Math.floor(m/60);return h?`${h}h ${m%60}m`:`${m}m`}
function dayNo(b){if(!b.firstStartedAt)return "Not started";const end=b.finishedAt?new Date(b.finishedAt):new Date();return `Day ${Math.max(1,Math.ceil((end-new Date(b.firstStartedAt))/86400000))}`}
function fmtDate(x){return x?new Date(x).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"—"}
function card(b,timer=true){return `<article class="book" data-id="${b.id}">
 <div class="openBook">${b.cover?`<img class="cover" src="${b.cover}" alt="">`:`<div class="cover placeholder">${esc(b.title)}</div>`}</div>
 <div class="bookTitle">${esc(b.title)}</div><div class="meta">${dayNo(b)}${b.firstStartedAt?` · ${duration(totalMs(b))}`:""}</div>
 ${timer?`<button class="timerBtn ${state.active===b.id?"running":""}">${state.active===b.id?"Ⅱ Pause":"▶ Start"}</button>`:""}</article>`}
function render(){
 const reading=state.books.filter(b=>b.status==="reading"), next=state.books.filter(b=>b.status==="upnext");
 readingRail.innerHTML=reading.map(b=>card(b)).join("")||`<p class="muted">No active books yet.</p>`;
 nextRail.innerHTML=next.map(b=>card(b)).join("")||`<p class="muted">Nothing queued. Wander the shelf.</p>`;
 readingCount.textContent=reading.length; nextCount.textContent=next.length;
 const q=search.value.toLowerCase();
 libraryGrid.innerHTML=state.books.filter(b=>["shelf","finished"].includes(b.status)&&(`${b.title} ${b.author} ${(b.notes||[]).map(n=>n.text).join(" ")}`).toLowerCase().includes(q)).map(b=>card(b,false)).join("");
 document.querySelectorAll(".timerBtn").forEach(x=>x.onclick=e=>{e.stopPropagation();toggleTimer(x.closest(".book").dataset.id)});
 document.querySelectorAll(".openBook").forEach(x=>x.onclick=()=>openBook(x.closest(".book").dataset.id));
 renderJourney();renderIdeas();save();
}
function stopActive(at=now()){
 if(!state.active)return null;
 const b=state.books.find(x=>x.id===state.active);
 const s=[...(b?.sessions||[])].reverse().find(x=>!x.end);
 if(s)s.end=at; state.active=null; return b;
}
function toggleTimer(id){
 const t=now();
 if(state.active===id){stopActive(t);render();openBook(id,true);return}
 stopActive(t);
 const b=state.books.find(x=>x.id===id);b.status="reading";
 if(!b.firstStartedAt)b.firstStartedAt=iso(t);
 const prev=[...(b.sessions||[])].reverse().find(s=>s.endPage);
 b.sessions.push({id:uuid(),start:t,end:null,startPage:prev?.endPage||null,endPage:null,note:""});
 state.active=id;render();
}
function acquisitionLine(b){
 const a=b.acquisition||{}; if(!a.when&&!a.place&&!a.type)return "Not recorded";
 return `${esc(a.type||"Acquired")}${a.when?` · ${esc(a.when)}`:""}${a.place?` · ${esc(a.place)}`:""}`;
}
function openBook(id,postPause=false){
 const b=state.books.find(x=>x.id===id);
 dialogBody.innerHTML=`<div class="eyebrow">${esc(b.status.toUpperCase())}</div><h2>${esc(b.title)}</h2><p class="muted">${esc(b.author)}</p>
 <div class="statline">${dayNo(b)} · ${duration(totalMs(b))} active</div>
 <div class="facts"><div><small>Acquired</small>${acquisitionLine(b)}</div><div><small>First started</small>${fmtDate(b.firstStartedAt)}</div><div><small>Finished</small>${fmtDate(b.finishedAt)}</div></div>
 ${postPause?`<div class="pauseLog"><label>Current page — optional<input id="pageNow" inputmode="numeric" placeholder="e.g. 186"></label><label>Quick note — optional<input id="noteNow" placeholder="What shifted / clicked / resisted?"></label><button class="primary" id="saveLog">Save reading log</button></div>`:""}
 <div class="actionRow"><button id="finish">Finish book</button><button id="moveNext">Move to Up Next</button></div>
 <h3>Reading sessions</h3>${(b.sessions||[]).slice().reverse().map(s=>`<div class="log"><b>${new Date(s.start).toLocaleString()}</b> · ${duration((s.end||now())-s.start)}${s.endPage?` · p.${s.endPage}`:""}${s.note?`<br><small>${esc(s.note)}</small> <button class="ideaLink" data-session="${s.id}">Save as idea</button>`:""}</div>`).join("")||`<p class="muted">No sessions yet. Your first Start creates the journey.</p>`}`;
 bookDialog.showModal();
 if(postPause)document.getElementById("saveLog").onclick=()=>{const s=[...(b.sessions||[])].reverse().find(x=>x.end);s.endPage=document.getElementById("pageNow").value||null;s.note=document.getElementById("noteNow").value.trim();if(s.note)b.notes.push({id:uuid(),at:s.end,text:s.note,sessionId:s.id});save();bookDialog.close();render()};
 document.getElementById("finish").onclick=()=>{if(state.active===id)stopActive();b.status="finished";b.finishedAt=iso(now());save();bookDialog.close();render()};
 document.getElementById("moveNext").onclick=()=>{if(state.active===id)stopActive();b.status="upnext";save();bookDialog.close();render()};
 document.querySelectorAll(".ideaLink").forEach(btn=>btn.onclick=()=>{const s=b.sessions.find(x=>x.id===btn.dataset.session);if(!s?.note)return;state.ideas.push({id:uuid(),text:s.note,bookId:b.id,sessionId:s.id,createdAt:iso(now())});save();btn.textContent="Saved ✓";renderIdeas()});
}
function renderJourney(){
 const rows=state.books.filter(b=>b.firstStartedAt).sort((a,b)=>new Date(b.firstStartedAt)-new Date(a.firstStartedAt));
 journeyList.innerHTML=rows.map(b=>`<article class="journeyItem" data-id="${b.id}"><div class="journeyDot"></div><div><div class="bookTitle">${esc(b.title)}</div><div class="muted">${fmtDate(b.firstStartedAt)}${b.finishedAt?` → ${fmtDate(b.finishedAt)}`:" → now"} · ${(b.sessions||[]).length} sessions · ${duration(totalMs(b))} active</div></div></article>`).join("")||`<div class="emptyState"><h3>Your journey starts with Start.</h3><p class="muted">No extra form to fill in.</p></div>`;
 document.querySelectorAll(".journeyItem").forEach(x=>x.onclick=()=>openBook(x.dataset.id));
}
function allIdeaRows(){
 const promoted=state.ideas.map(i=>({...i,kind:"idea"}));
 const notes=state.books.flatMap(b=>(b.notes||[]).map(n=>({id:n.id||uuid(),text:n.text,bookId:b.id,createdAt:iso(n.at||now()),kind:"note"})));
 return [...promoted,...notes].sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
}
function renderIdeas(){
 const q=(ideaSearch?.value||"").toLowerCase();
 const rows=allIdeaRows().filter(i=>i.text.toLowerCase().includes(q));
 ideasList.innerHTML=rows.map(i=>{const b=state.books.find(x=>x.id===i.bookId);return `<article class="ideaCard"><div class="eyebrow">${i.kind==="idea"?"IDEA":"READING NOTE"}</div><p>${esc(i.text)}</p><small>${esc(b?.title||"Unknown book")} · ${fmtDate(i.createdAt)}</small></article>`}).join("")||`<div class="emptyState"><h3>No ideas yet.</h3><p class="muted">Pause after reading and save a note; useful notes can be promoted into Ideas.</p></div>`;
}
addBtn.onclick=()=>addDialog.showModal();closeAdd.onclick=()=>addDialog.close();closeBook.onclick=()=>bookDialog.close();
coverInput.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{preview.src=r.result;preview.classList.remove("hidden")};r.readAsDataURL(f)};
saveBook.onclick=()=>{state.books.push({id:uuid(),title:titleInput.value.trim()||"Untitled book",author:authorInput.value.trim(),status:statusInput.value,cover:preview.src&&!preview.classList.contains("hidden")?preview.src:null,addedAt:iso(now()),firstStartedAt:null,finishedAt:null,sessions:[],notes:[],acquisition:{type:sourceType.value,place:sourcePlace.value.trim(),when:acquiredWhen.value.trim(),precision:datePrecision.value}});save();addDialog.close();render()};
search.oninput=render;ideaSearch.oninput=renderIdeas;
randomBtn.onclick=()=>{const pool=state.books.filter(b=>b.status==="shelf");if(pool.length)openBook(pool[Math.floor(Math.random()*pool.length)].id)};
const views={home:homeView,journey:journeyView,ideas:ideasView,data:dataView};
document.querySelectorAll(".bottom button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".bottom button").forEach(x=>x.classList.remove("active"));b.classList.add("active");Object.values(views).forEach(v=>v.classList.remove("activeView"));views[b.dataset.view].classList.add("activeView");});
const help={journey:["Journey","A history generated automatically from first starts, pauses, restarts and finishes."],ideas:["Ideas","Reading notes across books. Promote a session note when it becomes an idea worth keeping."],data:["My Reading Data","Back up the full archive or export a spreadsheet. PDF and yearly share cards can be generated later from the same records."]};
document.querySelectorAll(".infoBtn").forEach(b=>b.onclick=()=>{const [t,p]=help[b.dataset.help];helpBody.innerHTML=`<div class="eyebrow">ABOUT</div><h2>${t}</h2><p class="muted">${p}</p>`;helpDialog.showModal()});closeHelp.onclick=()=>helpDialog.close();
function download(name,type,text){const blob=new Blob([text],{type});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
exportJson.onclick=()=>download("reading-shelf-full-archive.json","application/json",JSON.stringify({...state,exportedAt:iso(now())},null,2));
function csvCell(v){return `"${String(v??"").replaceAll('"','""')}"`}
exportCsv.onclick=()=>{const header=["Title","Author","Status","Acquired","Acquisition type","Place / from whom","First started","Finished","Sessions","Active minutes"];
 const rows=state.books.map(b=>[b.title,b.author,b.status,b.acquisition?.when,b.acquisition?.type,b.acquisition?.place,b.firstStartedAt,b.finishedAt,(b.sessions||[]).length,Math.round(totalMs(b)/60000)]);
 download("reading-shelf-books.csv","text/csv;charset=utf-8","\ufeff"+[header,...rows].map(r=>r.map(csvCell).join(",")).join("\n"))};
importFile.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.books)throw 0;state=x;state.schemaVersion="0.3.0";save();render();alert("Archive restored.")}catch{alert("Could not read this archive.")}};r.readAsText(f)};
setInterval(()=>{if(state.active)render()},30000);render();