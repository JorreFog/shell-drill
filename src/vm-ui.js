/* =================== course plan tab ===================
   A lab per lecture, worked on a simulated machine that lives in the page.
   Task completion is checked against machine state and persists; the machine
   itself resets on reload, which is what you want when practising. */
const COURSE = buildCourse();
const CS = {K:null, lec:-1, hist:[], hp:0, editing:null};
const ckey = (li, ti) => "L" + COURSE[li].n + ":" + ti;
const lecDone = li => COURSE[li].tasks.filter((_,ti)=>S.lab[ckey(li,ti)]).length;

function bootMachine(){
  CS.K = attachPython(seedVM(attachShell(makeVM())));
  CS.hist = []; CS.hp = 0;
}

function cline(html, cls){
  const d = document.createElement("div");
  d.className = "ln " + (cls||"");
  d.innerHTML = html;
  const s = $("c-screen");
  s.appendChild(d); s.scrollTop = s.scrollHeight;
}
function cps1(){
  const p = CS.K.vm.cwd.replace(CS.K.vm.HOME, "~");
  return '<span class="h">analyst@'+CS.K.vm.host+'</span>:<span class="path">'+esc(p)+'</span>$';
}
function cprompt(){ $("c-ps1").innerHTML = cps1(); }

/* run everything the current lecture asks for and tick off what is now true */
function recheck(){
  const lec = COURSE[CS.lec];
  const ctx = makeLabCtx(CS.K, CS.hist);
  const newly = [];
  lec.tasks.forEach((t,ti)=>{
    if(S.lab[ckey(CS.lec,ti)]) return;
    let done = false;
    try{ done = !!t.check(ctx); }catch(e){ done = false; }
    if(done){ S.lab[ckey(CS.lec,ti)] = 1; newly.push(ti); }
  });
  if(newly.length){ save(); paintTasks(); }
  return newly;
}

function paintTasks(){
  const lec = COURSE[CS.lec];
  lec.tasks.forEach((t,ti)=>{
    const el = $("t"+ti);
    if(!el) return;
    const done = !!S.lab[ckey(CS.lec,ti)];
    el.className = "ltask" + (done ? " done" : "");
    el.querySelector(".lstat").textContent = done ? "done" : "";
  });
  const n = lecDone(CS.lec), tot = lec.tasks.length;
  const bar = $("c-progress");
  if(bar){
    bar.innerHTML = '<b>'+n+"</b> / "+tot+" tasks" +
      (n===tot ? ' &nbsp;<span class="allgood">lab complete</span>' : "");
  }
  renderCourseNav();
}

async function csubmit(raw){
  const input = String(raw).trim();
  if(!input) return;
  CS.hist.push({cmd:input, out:"", err:"", code:0});
  CS.hp = CS.hist.length;
  cline(cps1()+" "+esc(input), "cmd");

  if(/^(tasks|lab)$/i.test(input)){
    CS.hist.pop();
    COURSE[CS.lec].tasks.forEach((t,ti)=>
      cline((S.lab[ckey(CS.lec,ti)] ? "[x] " : "[ ] ") + esc(t.q.replace(/<[^>]+>/g,"")), "note"));
    return;
  }
  if(/^reset$/i.test(input)){
    CS.hist.pop(); bootMachine();
    $("c-screen").innerHTML = "";
    cline("machine reset — your completed tasks are kept", "note");
    cprompt(); return;
  }

  let r;
  try{ r = CS.K.run(input); }
  catch(e){ r = {out:"", err:"internal error: "+e.message+"\n", code:1}; }

  const rec = CS.hist[CS.hist.length-1];
  rec.out = r.out || ""; rec.err = r.err || ""; rec.code = r.code;

  if(r.clear) $("c-screen").innerHTML = "";
  if(r.out) r.out.replace(/\n$/,"").split("\n").forEach(l => cline(esc(l) || "&nbsp;"));
  if(r.err) r.err.replace(/\n$/,"").split("\n").forEach(l => cline(esc(l), "err"));
  if(r.editor) openEditor(r.editor);

  cprompt();
  const newly = recheck();
  newly.forEach(ti => cline("task "+(ti+1)+" complete — "+
    esc(COURSE[CS.lec].tasks[ti].q.replace(/<[^>]+>/g,"").slice(0,68)), "ok"));
}

/* ---------- the editor pane, for writing scripts and crontabs ---------- */
function openEditor(path){
  CS.editing = path;
  const node = CS.K.lookup(path).node;
  $("ed-path").textContent = path;
  $("ed-body").value = node && node.t === "f" ? node.c : "";
  $("c-editor").style.display = "";
  setTimeout(()=>$("ed-body").focus(), 30);
}
function closeEditor(saveIt){
  if(saveIt && CS.editing){
    const node = CS.K.lookup(CS.editing).node;
    if(node && node.t === "f") node.c = $("ed-body").value;
    cline("saved "+esc(CS.editing), "note");
    recheck();
  }
  $("c-editor").style.display = "none";
  CS.editing = null;
  $("c-entry").focus();
}

function renderCourseNav(){
  const box = $("modlist"); box.innerHTML = "";
  COURSE.forEach((s,i)=>{
    const b = document.createElement("button");
    b.className = "mod"; b.setAttribute("aria-current", i===CS.lec);
    b.innerHTML = '<span class="n">v'+s.wk+'</span><span>F'+s.n+": "+esc(s.title)+'</span>'+
      '<span class="done">'+lecDone(i)+"/"+s.tasks.length+"</span>";
    b.onclick = ()=>{ S.c = i; renderCourse(); save(); };
    box.appendChild(b);
  });
  const tot = COURSE.reduce((n,s)=>n+s.tasks.length,0);
  const dn  = COURSE.reduce((n,s,i)=>n+lecDone(i),0);
  $("s-solved").textContent = dn;
  $("s-acc").textContent = Math.round(dn/tot*100)+"%";
  $("s-streak").textContent = "—";
}

function renderCourse(){
  const li = Math.min(S.c|0, COURSE.length-1);
  const lec = COURSE[li];
  if(CS.lec !== li){ CS.lec = li; bootMachine(); }

  let h =
    '<div class="cw"><div class="chead">'+
      '<div class="cmeta"><span class="wk">Vecka '+lec.wk+'</span>'+
        '<span class="dt">'+esc(lec.date)+'</span><span>Föreläsning '+lec.n+'</span></div>'+
      "<h1>"+esc(lec.title)+"</h1>"+
      '<p class="topics">'+esc(lec.topics)+"</p>"+
      '<p class="cbrief">'+esc(lec.brief)+"</p>"+
    "</div>"+
    '<div class="csec"><h2>Lab — the terminal below is a real simulated machine</h2>'+
      '<ol class="ltasks">';
  lec.tasks.forEach((t,ti)=>{
    const done = !!S.lab[ckey(li,ti)];
    h += '<li class="ltask'+(done?" done":"")+'" id="t'+ti+'">'+
      '<span class="lnum">'+(ti+1)+"</span>"+
      '<span class="lbody"><span class="ltext">'+t.q+"</span>"+
        '<button class="lhint" data-h="'+ti+'">hint</button>'+
        '<span class="lhinttext" id="h'+ti+'" hidden>'+esc(t.hint)+"</span></span>"+
      '<span class="lstat">'+(done?"done":"")+"</span></li>";
  });
  h += "</ol>"+
    '<p class="cprog" id="c-progress"></p>'+
    "</div>"+
    '<div class="csec"><h2>Check yourself — answers are hidden until you open them</h2>';
  lec.check.forEach(([q,a])=>{
    h += '<details class="chk"><summary>'+q+'</summary><div class="ans">'+a+"</div></details>";
  });
  h += "</div></div>";

  h += '<section class="term labterm">'+
    '<div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>'+
      '<span class="title">bash — analyst@workstation-07 (simulated)</span>'+
      '<button class="tbtn" id="c-reset">reset machine</button></div>'+
    '<div class="screen" id="c-screen"></div>'+
    '<div class="inputline"><span class="ps1" id="c-ps1"></span>'+
      '<input id="c-entry" autocomplete="off" autocapitalize="off" spellcheck="false" '+
      'aria-label="Type a command" placeholder="type a command — try: ls, help, tasks"></div>'+
    '<div class="editor" id="c-editor" style="display:none">'+
      '<div class="edhead">editing <b id="ed-path"></b>'+
        '<span class="edhint">Ctrl+Enter saves</span></div>'+
      '<textarea id="ed-body" spellcheck="false"></textarea>'+
      '<div class="edfoot"><button class="nextbtn" id="ed-save">Save</button>'+
        '<button class="tbtn" id="ed-cancel">Cancel</button></div>'+
    "</div>"+
    "</section>";

  h += '<div class="cnav">'+
    '<button class="tbtn" id="c-prev">← Previous</button>'+
    '<button class="nextbtn" id="c-next">Next lecture →</button></div>';

  $("courseview").innerHTML = h;

  $("c-screen").innerHTML = "";
  cline("Simulated Arch machine. Your home is /home/analyst. Nothing here can break anything.", "note");
  cline("Type <b>help</b> for the command list, <b>tasks</b> to re-read the lab, <b>reset</b> to start the machine over.", "note");
  cprompt();

  $("c-entry").addEventListener("keydown", e=>{
    if(e.key==="Enter"){ const v=e.target.value; e.target.value=""; csubmit(v); }
    else if(e.key==="ArrowUp"){ e.preventDefault();
      if(CS.hp>0){ CS.hp--; e.target.value = CS.hist[CS.hp] ? CS.hist[CS.hp].cmd : ""; } }
    else if(e.key==="ArrowDown"){ e.preventDefault();
      if(CS.hp < CS.hist.length-1){ CS.hp++; e.target.value = CS.hist[CS.hp].cmd; }
      else { CS.hp = CS.hist.length; e.target.value=""; } }
  });
  $("c-screen").addEventListener("click", ()=>$("c-entry").focus());
  $("c-reset").onclick = ()=>csubmit("reset");
  $("ed-save").onclick = ()=>closeEditor(true);
  $("ed-cancel").onclick = ()=>closeEditor(false);
  $("ed-body").addEventListener("keydown", e=>{
    if(e.key==="Enter" && (e.ctrlKey||e.metaKey)){ e.preventDefault(); closeEditor(true); }
    if(e.key==="Escape"){ e.preventDefault(); closeEditor(false); }
    if(e.key==="Tab"){ e.preventDefault();
      const t = e.target, s = t.selectionStart;
      t.value = t.value.slice(0,s) + "    " + t.value.slice(t.selectionEnd);
      t.selectionStart = t.selectionEnd = s + 4; }
  });
  $("courseview").querySelectorAll(".lhint").forEach(b=>{
    b.onclick = ()=>{ const el = $("h"+b.dataset.h);
      el.hidden = !el.hidden; b.textContent = el.hidden ? "hint" : "hide hint"; };
  });
  $("c-prev").onclick = ()=>{ if(S.c>0){ S.c--; renderCourse(); save(); } };
  $("c-next").onclick = ()=>{ if(S.c<COURSE.length-1){ S.c++; renderCourse(); save(); } };
  [["c-prev", li===0], ["c-next", li===COURSE.length-1]].forEach(([id,off])=>{
    $(id).disabled = off; $(id).style.opacity = off ? ".4" : "1";
  });

  paintTasks();
}
