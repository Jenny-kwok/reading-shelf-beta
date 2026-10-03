const KEY="readingShelfV05";
const PREV_KEY="readingShelfV04";
const OLD_KEY="readingShelfV0";
const uuid=()=>crypto.randomUUID();
const iso=x=>new Date(x).toISOString();
const now=()=>Date.now();
const esc=s=>(s||"").toString().replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const seed={schemaVersion:"0.5.0",books:[],ideas:[],active:null,settings:{lastAcquisition:null,recentPlaces:[]}};

function migrateOld(){
  const old=JSON.parse(localStorage.getItem(OLD_KEY)||"null");
  if(!old)return null;
  return {schemaVersion:"0.5.0",active:old.active||null,ideas:[],
    books:(old.books||[]).map(b=>({...b,
      acquisition:b.acquisition||b.provenance||{type:"",place:"",when:"",precision:"unknown"},
      firstStartedAt:b.firstStartedAt||null,finishedAt:b.finishedAt||null,
      sessions:(b.sessions||[]).map(s=>({...s,startPage:s.startPage||null,endPage:s.endPage||null,note:s.note||""})),
      notes:b.notes||[]
    }))
  };
}
let state=JSON.parse(localStorage.getItem(KEY)||"null")||JSON.parse(localStorage.getItem(PREV_KEY)||"null")||migrateOld()||seed;
state.schemaVersion="0.5.0";
state.settings=state.settings||{lastAcquisition:null,recentPlaces:[]};
state.feedback=state.feedback||[];
state.devNotes=state.devNotes||[];
state.books=(state.books||[]).map(b=>({...b,metadata:b.metadata||{isbn:"",publisher:"",publishedYear:"",pageCount:null,language:"",source:""}}));
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
 <div class="facts"><div><small>Acquired</small>${acquisitionLine(b)}</div>${b.metadata?.isbn?`<div><small>Edition</small>ISBN ${esc(b.metadata.isbn)}${b.metadata.publisher?` · ${esc(b.metadata.publisher)}`:""}${b.metadata.publishedYear?` · ${esc(b.metadata.publishedYear)}`:""}</div>`:""}<div><small>First started</small>${readingStartLine(b)}</div><div><small>Finished</small>${fmtDate(b.finishedAt)}</div></div>
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
 updateMapLink();
 const last=state.settings.lastAcquisition;
 recentPlaces.innerHTML=(state.settings.recentPlaces||[]).map(x=>`<option value="${esc(x)}">`).join("");
 if(last){sourceType.value=last.type||"";sourcePlace.value=last.place||""; if(last.precision==="day"){addDateMode="day";acquiredDateValue.type="date";acquiredDateValue.value=last.when||""} else if(last.precision==="month"){addDateMode="month";acquiredDateValue.type="month";acquiredDateValue.value=last.when||""} else if(last.precision==="year"){addDateMode="year";acquiredDateValue.type="number";acquiredDateValue.value=last.when||""} else {addDateMode=last.when?"vague":"unknown";acquiredVague.value=last.when||""} setupDateModes("addDateModes","acquiredDateValue","acquiredVague",m=>addDateMode=m,addDateMode)}
}
addBtn.onclick=()=>{prepAdd();addDialog.showModal()};closeAdd.onclick=()=>addDialog.close();closeBook.onclick=()=>bookDialog.close();
async function setCoverFile(f){if(!f)return;const data=await compressImage(f);preview.src=data;preview.classList.remove("hidden")}
function compressImage(f){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const max=1000,scale=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale);c.getContext("2d").drawImage(im,0,0,c.width,c.height);resolve(c.toDataURL("image/jpeg",.82))};im.onerror=reject;im.src=r.result};r.onerror=reject;r.readAsDataURL(f)})}
coverInput.onchange=e=>setCoverFile(e.target.files[0]);cameraInput.onchange=e=>setCoverFile(e.target.files[0]);
function isbnFromText(s){const m=(s||"").replace(/[-\s]/g,"").match(/(?:97[89])?\d{9}[\dXx]/);return m?m[0]:""}
function mapUrl(q){return q?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`:""}
function updateMapLink(){const q=sourcePlace.value.trim();mapLink.href=mapUrl(q);mapLink.style.display=q?"inline-block":"none"}
sourcePlace.addEventListener("input",updateMapLink);
async function lookupBooks(q){q=q.trim();if(!q)return[];const isbn=isbnFromText(q);let url;if(isbn)url=`https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`;else url=`https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=5&fields=key,title,author_name,first_publish_year,isbn,publisher,language,number_of_pages_median,cover_i`;
 const res=await fetch(url);if(!res.ok)throw new Error("lookup failed");const x=await res.json();
 if(isbn){const d=x[`ISBN:${isbn}`];if(!d)return[];return [{title:d.title||"",author:(d.authors||[]).map(a=>a.name).join(", "),isbn,publisher:d.publishers?.[0]?.name||"",year:d.publish_date||"",pages:d.number_of_pages||null,language:d.languages?.[0]?.key?.split("/").pop()||"",cover:d.cover?.large||d.cover?.medium||"",source:"Open Library"}]}
 return (x.docs||[]).map(d=>({title:d.title||"",author:(d.author_name||[]).join(", "),isbn:d.isbn?.[0]||"",publisher:d.publisher?.[0]||"",year:d.first_publish_year||"",pages:d.number_of_pages_median||null,language:d.language?.[0]||"",cover:d.cover_i?`https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`:"",source:"Open Library"}));}
function showLookup(rows){lookupResults.innerHTML=rows.length?rows.map((d,i)=>`<button type="button" class="lookupResult" data-i="${i}"><b>${esc(d.title)}</b><span>${esc(d.author)}${d.year?` · ${esc(d.year)}`:""}${d.publisher?` · ${esc(d.publisher)}`:""}</span></button>`).join(""):`<p class="muted">No match found. You can still enter the book manually.</p>`;lookupResults.querySelectorAll(".lookupResult").forEach(b=>b.onclick=()=>{const d=rows[+b.dataset.i];titleInput.value=d.title;authorInput.value=d.author;bookLookup.dataset.meta=JSON.stringify(d);if(d.cover){preview.src=d.cover;preview.classList.remove("hidden")}lookupResults.innerHTML=`<p class="matched">Selected: ${esc(d.title)}</p>`})}
lookupBook.onclick=async()=>{lookupResults.innerHTML='<p class="muted">Looking up…</p>';try{showLookup(await lookupBooks(bookLookup.value))}catch(e){lookupResults.innerHTML='<p class="muted">Could not reach the book service. Manual entry still works.</p>'}};
saveBook.onclick=()=>{const acquisition={type:sourceType.value,place:sourcePlace.value.trim(),when:addDateMode==="unknown"?"":(addDateMode==="vague"?acquiredVague.value.trim():acquiredDateValue.value),precision:addDateMode==="vague"?"range":addDateMode};rememberAcquisition(acquisition);let metadata={isbn:"",publisher:"",publishedYear:"",pageCount:null,language:"",source:"manual"};try{if(bookLookup.dataset.meta){const d=JSON.parse(bookLookup.dataset.meta);metadata={isbn:d.isbn||"",publisher:d.publisher||"",publishedYear:d.year||"",pageCount:d.pages||null,language:d.language||"",source:d.source||"Open Library"}}}catch{}state.books.push({id:uuid(),title:titleInput.value.trim()||"Untitled book",author:authorInput.value.trim(),status:"shelf",cover:preview.src&&!preview.classList.contains("hidden")?preview.src:null,addedAt:iso(now()),firstStartedAt:null,finishedAt:null,sessions:[],notes:[],metadata,acquisition});save();addDialog.close();titleInput.value="";authorInput.value="";bookLookup.value="";bookLookup.dataset.meta="";lookupResults.innerHTML="";preview.src="";preview.classList.add("hidden");render()};
search.oninput=render;ideaSearch.oninput=renderIdeas;
randomBtn.onclick=()=>{const pool=state.books.filter(b=>b.status==="shelf");if(pool.length)openBook(pool[Math.floor(Math.random()*pool.length)].id)};
const views={home:homeView,journey:journeyView,ideas:ideasView,feedback:feedbackView,data:dataView};
document.querySelectorAll(".bottom button").forEach(b=>b.onclick=()=>{document.querySelectorAll(".bottom button").forEach(x=>x.classList.remove("active"));b.classList.add("active");Object.values(views).forEach(v=>v.classList.remove("activeView"));views[b.dataset.view].classList.add("activeView");if(b.dataset.view==="feedback"){renderFeedback();setTimeout(()=>feedbackText.focus(),50)}});

function renderFeedback(){
 feedbackList.innerHTML=(state.feedback||[]).slice().reverse().map(f=>`<article class="ideaCard"><div class="eyebrow">${esc(f.type.toUpperCase())} · ${esc(f.area.toUpperCase())}</div><p>${esc(f.text)}</p><small>${new Date(f.createdAt).toLocaleString()} · build ${esc(f.appVersion||"0.4")}</small><br><button class="inlineEdit deleteFeedback" data-id="${f.id}">Delete</button></article>`).join("")||`<div class="emptyState"><h3>No feedback yet.</h3><p class="muted">Use this as the beta notebook while you dogfood the app.</p></div>`;
 document.querySelectorAll(".deleteFeedback").forEach(b=>b.onclick=()=>{state.feedback=state.feedback.filter(x=>x.id!==b.dataset.id);save();renderFeedback()});
}
saveFeedback.onclick=()=>{const text=feedbackText.value.trim();if(!text)return;state.feedback.push({id:uuid(),type:feedbackType.value,area:feedbackArea.value,text,createdAt:iso(now()),appVersion:"0.5"});feedbackText.value="";save();renderFeedback()};
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
let pendingImport=[];
function parseCsv(text){const rows=[];let row=[],cell="",q=false;for(let i=0;i<text.length;i++){const c=text[i],n=text[i+1];if(c==='"'&&q&&n==='"'){cell+='"';i++}else if(c==='"')q=!q;else if(c===','&&!q){row.push(cell);cell=""}else if((c==='\n'||c==='\r')&&!q){if(c==='\r'&&n==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell=""}else cell+=c}row.push(cell);if(row.some(x=>x.trim()))rows.push(row);if(rows.length<2)return[];const head=rows[0].map(x=>x.trim().toLowerCase());return rows.slice(1).map(r=>Object.fromEntries(head.map((h,i)=>[h,r[i]||""])))}
function normalizeImport(x){const title=x.title||x.book||x["book title"]||"";const author=x.author||x.authors||"";return {title,author,status:"shelf",acquisition:{type:x["acquisition type"]||x.type||"",place:x["place / from whom"]||x.place||x["acquisition place"]||"",when:x.acquired||x["acquisition date"]||"",precision:x.precision||"unknown"},firstStartedAt:x["first started"]||x.firststartedat||x.first_started_at||null,finishedAt:x.finished||x.finishedat||null,metadata:{isbn:x.isbn||"",publisher:x.publisher||"",publishedYear:x.year||x["publication year"]||"",pageCount:x.pages||null,language:x.language||"",source:"import"}}}
function showImportPreview(){const dupe=pendingImport.filter(r=>state.books.some(b=>b.title.toLowerCase()===r.title.toLowerCase()&&b.author.toLowerCase()===r.author.toLowerCase())).length;importPreview.innerHTML=`<div class="importSummary"><b>${pendingImport.length} records found</b><br><span>${dupe} possible duplicate${dupe===1?"":"s"}</span><button class="primary" id="confirmRecordsImport">Import to Shelf</button></div>`;confirmRecordsImport.onclick=()=>{pendingImport.forEach(r=>{if(!r.title)return;state.books.push({id:uuid(),...r,cover:null,addedAt:iso(now()),sessions:[],notes:[]})});save();pendingImport=[];importPreview.innerHTML='<p class="matched">Import complete ✓</p>';render()}}
recordsImportFile.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{let rows;if(f.name.toLowerCase().endsWith('.json')){const x=JSON.parse(r.result);rows=Array.isArray(x)?x:(x.books||[])}else rows=parseCsv(r.result);pendingImport=(rows||[]).map(normalizeImport).filter(x=>x.title);showImportPreview()}catch{importPreview.innerHTML='<p class="muted">Could not read this file.</p>'}};r.readAsText(f)};
importFile.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(!x.books)throw 0;if(!confirm(`Restore this full archive with ${x.books.length} books? This replaces the current local archive.`))return;state=x;state.schemaVersion="0.5.0";state.feedback=state.feedback||[];state.settings=state.settings||{lastAcquisition:null,recentPlaces:[]};save();render();renderFeedback();alert("Archive restored.")}catch{alert("Could not read this archive.")}};r.readAsText(f)};
setInterval(()=>{if(state.active)render()},30000);render();renderFeedback();