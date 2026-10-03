const KEY="readingShelfV04";
const PREV_KEY="readingShelfV03";
const OLD_KEY="readingShelfV0";
const uuid=()=>crypto.randomUUID();
const iso=x=>new Date(x).toISOString();
const now=()=>Date.now();
const esc=s=>(s||"").toString().replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const seed={schemaVersion:"0.4.0",books:[],ideas:[],active:null,settings:{lastAcquisition:null,recentPlaces:[]}};

function migrateOld(){
  const old=JSON.parse(localStorage.getItem(OLD_KEY)||"null");
  if(!old)return null;
  return {schemaVersion:"0.4.0",active:old.active||null,ideas:[],
    books:(old.books||[]).map(b=>({...b,
      acquisition:b.acquisition||b.provenance||{type:"",place:"",when:"",precision:"unknown"},
      firstStartedAt:b.firstStartedAt||null,finishedAt:b.finishedAt||null,
      sessions:(b.sessions||[]).map(s=>({...s,startPage:s.startPage||null,endPage:s.endPage||null,note:s.note||""})),
      notes:b.notes||[]
    }))
  };
}
let state=JSON.parse(localStorage.getItem(KEY)||"null")||JSON.parse(localStorage.getItem(PREV_KEY)||"null")||migrateOld()||seed;
state.schemaVersion="0.4.0";
state.settings=state.settings||{lastAcquisition:null,recentPlaces:[]};
state.feedback=state.feedback||[];
state.devNotes=state.devNotes||[];
const save=()=>localStorage.setItem(KEY,JSON.stringify(state));
function totalMs(b){return (b.sessions||[]).reduce((n,s)=>n+((s.end||now())-s.start),0)}
function duration(ms){let m=Math.max(0,Math.floor(ms/60000)),h=Math.floor(m/60);return h?`${h}h ${m%60}m`:`${m}m`}
function dayNo(b){if(!b.firstStartedAt)return "Not started";const end=b.finishedAt?new Date(b.finishedAt):new Date();return `Day ${Math.max(1,Math.ceil((end-new Date(b.firstStartedAt))/86400000))}`}
function fmtDate(x){return x?new Date(x).toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"}):"—"}
function card(b,timer=true){
 const isShelf=b.status==="shelf";
 const hasStarted=!!b.firstStartedAt;
 let action="";
 if(isShelf){
   action=`<div class="shelfActions"><button class="queueBtn">Up Next</button><button class="readNowBtn">${hasStarted?"Resume Reading":"Start Reading"}</button></div>`;
 } else if(timer){
   action=`<button class="timerBtn ${state.active===b.id?"running":""}">${state.active===b.id?"Ⅱ Pause":hasStarted?"▶ Resume Reading":"▶ Start Reading"}</button>`;
 }
 return `<article class="book" data-id="${b.id}">
 <div class="openBook">${b.cover?`<img class="cover" src="${b.cover}" alt="">`:`<div class="cover placeholder">${esc(b.title)}</div>`}</div>
 <div class="bookTitle">${esc(b.title)}</div><div class="meta">${dayNo(b)}${b.firstStartedAt?` · ${duration(totalMs(b))}`:""}</div>
 ${action}</article>`;
}
function render(){
 const reading=state.books.filter(b=>b.status==="reading"), next=state.books.filter(b=>b.status==="upnext");
 readingRail.innerHTML=reading.map(b=>card(b)).join("")||`<p class="muted">No active books yet.</p>`;
 nextRail.innerHTML=next.map(b=>card(b)).join("")||`<p class="muted">Nothing queued. Wander the shelf.</p>`;
 readingCount.textContent=reading.length; nextCount.textContent=next.length;
 const q=search.value.toLowerCase();
 libraryGrid.innerHTML=state.books.filter(b=>["shelf","finished"].includes(b.status)&&(`${b.title} ${b.author} ${(b.notes||[]).map(n=>n.text).join(" ")}`).toLowerCase().includes(q)).map(b=>card(b,false)).join("");
 document.querySelectorAll(".timerBtn").forEach(x=>x.onclick=e=>{e.stopPropagation();toggleTimer(x.closest(".book").dataset.id)});
 document.querySelectorAll(".queueBtn").forEach(x=>x.onclick=e=>{e.stopPropagation();const b=state.books.find(v=>v.id===x.closest(".book").dataset.id);b.status="upnext";save();render()});
 document.querySelectorAll(".readNowBtn").forEach(x=>x.onclick=e=>{e.stopPropagation();toggleTimer(x.closest(".book").dataset.id)});
 document.querySelectorAll(".openBook").forEach(x=>x.onclick=()=>openBook(x.closest(".book").dataset.id));
 renderJourney();renderIdeas();renderDeveloperNotes();save();
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
 const a=b.acquisition||{}; if(!a.when&&!a.place&&!a.type)return `Not recorded <button class="inlineEdit" id="editAcq">+ Add</button>`;
 return `${esc(a.type||"Acquired")}${a.when?` · ${esc(a.when)}`:""}${a.place?` · ${esc(a.place)}`:""} <button class="inlineEdit" id="editAcq">Edit</button>`;
}
function readingStartLine(b){
 return `${fmtDate(b.firstStartedAt)} <button class="inlineEdit" id="editStart">${b.firstStartedAt?"Edit":"+ Add retrospectively"}</button>`;
}
function editAcquisition(b){
 const a=b.acquisition||{type:"",place:"",when:"",precision:"unknown"};
 dialogBody.innerHTML=`<div class="eyebrow">BOOK DETAILS</div><h2>Acquisition</h2>
 <label>How it came to me<select id="editType"><option value="">Unknown / not recorded</option>${["Bought","Gift","Borrowed","Other"].map(x=>`<option ${a.type===x?"selected":""}>${x}</option>`).join("")}</select></label>
 <label>Place / from whom<input id="editPlace" list="recentPlacesEdit" value="${esc(a.place||"")}" placeholder="e.g. Daikanyama T-Site"></label><datalist id="recentPlacesEdit">${(state.settings.recentPlaces||[]).map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
 <div class="dateModes" id="editDateModes"><button type="button" data-mode="day">Exact</button><button type="button" data-mode="month">Month</button><button type="button" data-mode="year">Year</button><button type="button" data-mode="vague">Around…</button><button type="button" data-mode="unknown">Unknown</button></div>
 <input id="editDateValue" type="${a.precision==="month"?"month":a.precision==="year"?"number":"date"}" value="${["day","month","year"].includes(a.precision)?esc(a.when||""):""}">
 <input id="editVague" class="${["day","month","year"].includes(a.precision)?"hidden":""}" value="${!["day","month","year"].includes(a.precision)?esc(a.when||""):""}" placeholder="e.g. Spring 2024 / late 2025">
 <button class="primary" id="saveAcqEdit">Save</button>`;
 let mode=["day","month","year"].includes(a.precision)?a.precision:(a.when?"vague":"unknown");
 setupDateModes("editDateModes","editDateValue","editVague",m=>mode=m,mode);
 saveAcqEdit.onclick=()=>{const place=editPlace.value.trim();b.acquisition={type:editType.value,place,when:mode==="unknown"?"":(mode==="vague"?editVague.value.trim():editDateValue.value),precision:mode==="vague"?"range":mode};rememberAcquisition(b.acquisition);save();openBook(b.id)};
}
function editStartDate(b){
 dialogBody.innerHTML=`<div class="eyebrow">READING HISTORY</div><h2>When did you first start this book?</h2><p class="muted">This changes the journey start only. It does not invent reading minutes for time the app did not measure.</p><label>First reading date<input id="startDateEdit" type="date" value="${b.firstStartedAt?new Date(b.firstStartedAt).toISOString().slice(0,10):""}"></label><button class="primary" id="saveStartEdit">Save</button>`;
 saveStartEdit.onclick=()=>{if(startDateEdit.value)b.firstStartedAt=new Date(startDateEdit.value+"T12:00:00").toISOString();save();openBook(b.id)};
}
function openBook(id,postPause=false){
 const b=state.books.find(x=>x.id===id);
 const hasStarted=!!b.firstStartedAt;
 dialogBody.innerHTML=`<div class="eyebrow">${esc(b.status.toUpperCase())}</div><h2>${esc(b.title)}</h2><p class="muted">${esc(b.author)}</p>
 <div class="statline">${dayNo(b)} · ${duration(totalMs(b))} active</div>
 <div class="facts"><div><small>Acquired</small>${acquisitionLine(b)}</div><div><small>First started</small>${readingStartLine(b)}</div><div><small>Finished</small>${fmtDate(b.finishedAt)}</div></div>
 ${postPause?`<div class="pauseLog"><label>Current page — optional<input id="pageNow" inputmode="numeric" placeholder="e.g. 186"></label><label>Quick note — optional<input id="noteNow" placeholder="What shifted / clicked / resisted?"></label><button class="primary" id="saveLog">Save reading log</button></div>`:""}
 <button class="primary" id="detailStart">${state.active===id?"Pause Reading":hasStarted?"Resume Reading":"Start Reading"}</button>
 <div class="actionRow"><button id="finish">Finish book</button><button id="moveNext">Move to Up Next</button></div>
 <h3>Reading sessions</h3>${(b.sessions||[]).slice().reverse().map(s=>`<div class="log"><b>${new Date(s.start).toLocaleString()}</b> · ${duration((s.end||now())-s.start)}${s.endPage?` · p.${s.endPage}`:""}${s.note?`<br><small>${esc(s.note)}</small> <button class="ideaLink" data-session="${s.id}">Save as idea</button>`:""}</div>`).join("")||`<p class="muted">No sessions yet. Start Reading creates Day 1 automatically.</p>`}`;
 bookDialog.showModal();
 const acq=document.getElementById("editAcq");if(acq)acq.onclick=()=>editAcquisition(b);
 const est=document.getElementById("editStart");if(est)est.onclick=()=>editStartDate(b);
 detailStart.onclick=()=>{bookDialog.close();toggleTimer(id)};
 if(postPause)document.getElementById("saveLog").onclick=()=>{const s=[...(b.sessions||[])].reverse().find(x=>x.end);s.endPage=document.getElementById("pageNow").value||null;s.note=document.getElementById("noteNow").value.trim();if(s.note)b.notes.push({id:uuid(),at:s.end,text:s.note,sessionId:s.id});save();bookDialog.close();render()};
 document.getElementById("finish").onclick=()=>{if(state.active===id)stopActive();b.status="finished";b.finishedAt=iso(now());save();bookDialog.close();render()};
 document.getElementById("moveNext").onclick=()=>{if(state.active===id)stopActive();b.status="upnext";save();bookDialog.close();render()};
 document.querySelectorAll(".ideaLink").forEach(btn=>btn.onclick=()=>{const ss=b.sessions.find(x=>x.id===btn.dataset.session);if(!ss?.note)return;state.ideas.push({id:uuid(),text:ss.note,bookId:b.id,sessionId:ss.id,createdAt:iso(now())});save();btn.textContent="Saved ✓";renderIdeas()});
}
function renderJourney(){
 const rows=state.books.filter(b=>b.firstStartedAt).sort((a,b)=>new Date(b.firstStartedAt)-new Date(a.firstStartedAt));
 journeyList.innerHTML=rows.map(b=>`<article class="journeyItem" data-id="${b.id}"><div class="journeyDot"></div><div><div class="bookTitle">${esc(b.title)}</div><div class="muted">${fmtDate(b.firstStartedAt)}${b.finishedAt?` → ${fmtDate(b.finishedAt)}`:" → now"} · ${(b.sessions||[]).length} sessions · ${duration(totalMs(b))} active</div></div></article>`).join("")||`<div class="emptyState"><h3>Your journey starts with Start.</h3><p class="muted">No extra form to fill in.</p></div>`;
 document.querySelectorAll(".journeyItem").forEach(x=>x.onclick=()=>openBook(x.dataset.id));
}
function renderDeveloperNotes(){
 if(!window.devNotesList)return;
 devNotesList.innerHTML=(state.devNotes||[]).slice().reverse().map(n=>`<article class="devNote"><div>${esc(n.text)}</div><small>${new Date(n.createdAt).toLocaleString()}</small><button class="deleteDevNote" data-id="${n.id}" aria-label="Delete note">Delete</button></article>`).join("")||`<p class="muted">No developer notes yet.</p>`;
 document.querySelectorAll(".deleteDevNote").forEach(b=>b.onclick=()=>{state.devNotes=state.devNotes.filter(n=>n.id!==b.dataset.id);save();renderDeveloperNotes()});
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
function rememberAcquisition(a){
 if(a.place){state.settings.recentPlaces=[a.place,...(state.settings.recentPlaces||[]).filter(x=>x!==a.place)].slice(0,8)}
 state.settings.lastAcquisition={...a};
}
function setupDateModes(containerId,dateId,vagueId,onMode,initial="day"){
 const box=document.getElementById(containerId), date=document.getElementById(dateId), vague=document.getElementById(vagueId);
 function apply(mode){box.querySelectorAll("button").forEach(b=>b.classList.toggle("selected",b.dataset.mode===mode));vague.classList.toggle("hidden",mode!=="vague");date.classList.toggle("hidden",["vague","unknown"].includes(mode));date.type=mode==="month"?"month":mode==="year"?"number":"date";if(mode==="year"){date.min="1000";date.max="2999";date.placeholder="2026"}onMode(mode)}
 box.querySelectorAll("button").forEach(b=>b.onclick=()=>apply(b.dataset.mode));apply(initial);
}
let addDateMode="day";
setupDateModes("addDateModes","acquiredDateValue","acquiredVague",m=>addDateMode=m,"day");
function prepAdd(){
 const last=state.settings.lastAcquisition;
 recentPlaces.innerHTML=(state.settings.recentPlaces||[]).map(x=>`<option value="${esc(x)}">`).join("");
 if(last){sourceType.value=last.type||"";sourcePlace.value=last.place||""; if(last.precision==="day"){addDateMode="day";acquiredDateValue.type="date";acquiredDateValue.value=last.when||""} else if(last.precision==="month"){addDateMode="month";acquiredDateValue.type="month";acquiredDateValue.value=last.when||""} else if(last.precision==="year"){addDateMode="year";acquiredDateValue.type="number";acquiredDateValue.value=last.when||""} else {addDateMode=last.when?"vague":"unknown";acquiredVague.value=last.when||""} setupDateModes("addDateModes","acquiredDateValue","acquiredVague",m=>addDateMode=m,addDateMode)}
}
addBtn.onclick=()=>{prepAdd();addDialog.showModal()};closeAdd.onclick=()=>addDialog.close();closeBook.onclick=()=>bookDialog.close();
coverInput.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{preview.src=r.result;preview.classList.remove("hidden")};r.readAsDataURL(f)};
saveBook.onclick=()=>{const acquisition={type:sourceType.value,place:sourcePlace.value.trim(),when:addDateMode==="unknown"?"":(addDateMode==="vague"?acquiredVague.value.trim():acquiredDateValue.value),precision:addDateMode==="vague"?"range":addDateMode};rememberAcquisition(acquisition);state.books.push({id:uuid(),title:titleInput.value.trim()||"Untitled book",author:authorInput.value.trim(),status:"shelf",cover:preview.src&&!preview.classList.contains("hidden")?preview.src:null,addedAt:iso(now()),firstStartedAt:null,finishedAt:null,sessions:[],notes:[],acquisition});save();addDialog.close();render()};
search.oninput=render;ideaSearch.oninput=renderIdeas;
randomBtn.onclick=()=>{const pool=state.books.filter(b=>b.status==="shelf");if(pool.length)openBook(pool[Math.floor(Math.random()*pool.length)].id)};
const views={home:homeView,journey:journeyView,ideas:ideasView,feedback:feedbackView,data:dataView};
document.querySelectorAll(".bottom button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".bottom button").forEach(x=>x.classList.remove("active"));b.classList.add("active");Object.values(views).forEach(v=>v.classList.remove("activeView"));views[b.dataset.view].classList.add("activeView");if(b.dataset.view==="feedback"){renderFeedback();setTimeout(()=>feedbackText.focus(),50)}});

function renderFeedback(){
 feedbackList.innerHTML=(state.feedback||[]).slice().reverse().map(f=>`<article class="ideaCard"><div class="eyebrow">${esc(f.type.toUpperCase())} · ${esc(f.area.toUpperCase())}</div><p>${esc(f.text)}</p><small>${new Date(f.createdAt).toLocaleString()} · build ${esc(f.appVersion||"0.4")}</small><br><button class="inlineEdit deleteFeedback" data-id="${f.id}">Delete</button></article>`).join("")||`<div class="emptyState"><h3>No feedback yet.</h3><p class="muted">Use this as the beta notebook while you dogfood the app.</p></div>`;
 document.querySelectorAll(".deleteFeedback").forEach(b=>b.onclick=()=>{state.feedback=state.feedback.filter(x=>x.id!==b.dataset.id);save();renderFeedback()});
}
saveFeedback.onclick=()=>{const text=feedbackText.value.trim();if(!text)return;state.feedback.push({id:uuid(),type:feedbackType.value,area:feedbackArea.value,text,createdAt:iso(now()),appVersion:"0.4"});feedbackText.value="";save();renderFeedback()};
const help={feedback:["Reader Feedback","A private beta notebook for friction, bugs, wishes and observations. It is stored with this local beta archive and can be exported separately."],journey:["Journey","A history generated automatically from first starts, pauses, restarts and finishes."],ideas:["Ideas","Reading notes across books. Promote a session note when it becomes an idea worth keeping."],data:["My Reading Data","Back up the full archive or export a spreadsheet. PDF and yearly share cards can be generated later from the same records."]};
document.querySelectorAll(".infoBtn").forEach(b=>b.onclick=()=>{const [t,p]=help[b.dataset.help];helpBody.innerHTML=`<div class="eyebrow">ABOUT</div><h2>${t}</h2><p class="muted">${p}</p>`;helpDialog.showModal()});closeHelp.onclick=()=>helpDialog.close();
function download(name,type,text){const blob=new Blob([text],{type});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
saveDevNote.onclick=()=>{const text=devNoteInput.value.trim();if(!text)return;state.devNotes.push({id:uuid(),text,createdAt:iso(now())});devNoteInput.value="";save();renderDeveloperNotes()};
function readingRecords(){const {feedback,...records}=state;return records}
exportJson.onclick=()=>download("reading-shelf-everything.json","application/json",JSON.stringify({...state,exportedAt:iso(now())},null,2));
exportRecordsJson.onclick=()=>download("reading-shelf-records.json","application/json",JSON.stringify({...readingRecords(),exportedAt:iso(now())},null,2));
exportFeedbackJson.onclick=()=>download("reading-shelf-feedback.json","application/json",JSON.stringify({schemaVersion:state.schemaVersion,feedback:state.feedback||[],exportedAt:iso(now())},null,2));
function csvCell(v){return `"${String(v??"").replaceAll('"','""')}"`}
exportCsv.onclick=()=>{const header=["Title","Author","Status","Acquired","Acquisition type","Place / from whom","First started","Finished","Sessions","Active minutes"];
 const rows=state.books.map(b=>[b.title,b.author,b.status,b.acquisition?.when,b.acquisition?.type,b.acquisition?.place,b.firstStartedAt,b.finishedAt,(b.sessions||[]).length,Math.round(totalMs(b)/60000)]);
 download("reading-shelf-books.csv","text/csv;charset=utf-8","\ufeff"+[header,...rows].map(r=>r.map(csvCell).join(",")).join("\n"))};

exportFeedbackCsv.onclick=()=>{const header=["Created at","Build","Type","Area","Feedback"];const rows=(state.feedback||[]).map(f=>[f.createdAt,f.appVersion,f.type,f.area,f.text]);download("reading-shelf-feedback.csv","text/csv;charset=utf-8","\ufeff"+[header,...rows].map(r=>r.map(csvCell).join(",")).join("\n"))};
importFile.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.books)throw 0;state=x;state.schemaVersion="0.4.0";state.feedback=state.feedback||[];state.settings=state.settings||{lastAcquisition:null,recentPlaces:[]};save();render();renderFeedback();alert("Archive restored.")}catch{alert("Could not read this archive.")}};r.readAsText(f)};
setInterval(()=>{if(state.active)render()},30000);render();renderFeedback();