/* =================== course plan tab ===================
   A lab per lecture, worked on a simulated machine that lives in the page.
   Each lecture keeps its own machine and its own scrollback, so switching
   away and back does not throw your work away. */
const COURSE = buildCourse();
const CS = {K:null, lec:-1, hist:[], hp:0, editing:null, machines:{}, screens:{}, histories:{}};
const ckey = (li, ti) => "L" + COURSE[li].n + ":" + ti;
const lecDone = li => COURSE[li].tasks.filter((_,ti)=>S.lab[ckey(li,ti)]).length;

/* which lecture is happening now, so the tab opens somewhere useful */
function currentLecture(){
  const today = new Date().toISOString().slice(0,10);
  for(let i=0;i<COURSE.length;i++) if(COURSE[i].iso >= today) return i;
  return COURSE.length - 1;
}

function bootMachine(li){
  CS.machines[li] = attachPython(seedVM(attachShell(makeVM())));
  CS.histories[li] = [];
  delete CS.screens[li];
  CS.K = CS.machines[li]; CS.hist = CS.histories[li]; CS.hp = 0;
}

/* Machines are small enough to keep, so work survives a reload. Hard links
   share one node in memory; a save/restore cycle turns them into two files. */
function serializeMachines(){
  const out = {};
  for(const li in CS.machines){
    const K = CS.machines[li];
    out[li] = {root:K.vm.root, cwd:K.vm.cwd, units:K.vm.units, env:K.vm.env, git:K.vm.git,
               installed:K.vm.installed, cron:K.vm.cron, mounts:K.vm.mounts, procs:K.vm.procs,
               hist:(CS.histories[li]||[]).slice(-60).map(h=>({cmd:h.cmd, out:h.out, err:h.err, code:h.code})),
               screen:(CS.screens[li]||"").slice(-40000)};
  }
  return out;
}
function restoreMachines(saved){
  if(!saved) return;
  for(const li in saved){
    try{
      const s = saved[li];
      const K = attachPython(seedVM(attachShell(makeVM())));
      ["root","cwd","units","env","git","installed","cron","mounts","procs"].forEach(k=>{
        if(s[k] !== undefined) K.vm[k] = s[k]; });
      CS.machines[li] = K;
      CS.histories[li] = s.hist || [];
      if(s.screen) CS.screens[li] = s.screen;
    }catch(e){ /* a corrupt entry just means that lecture starts fresh */ }
  }
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

/* run every check for this lecture and tick off what is now true */
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
    el.setAttribute("aria-checked", String(done));
    el.querySelector(".lstat").textContent = done ? "done" : "";
  });
  const n = lecDone(CS.lec), tot = lec.tasks.length;
  const bar = $("c-progress");
  if(bar) bar.innerHTML = "<b>"+n+"</b> / "+tot+" tasks" +
    (n===tot ? ' &nbsp;<span class="allgood">lab complete</span>' : "");
  renderCourseNav();
}

/* ---------- show answer ----------
   The answers come from LAB_ANSWERS, the same worked solutions the test suite
   runs, so what is shown here is known to complete the task. You still have to
   type it — that is the part that sticks. */
function answerHtml(li, ti){
  const steps = (typeof LAB_ANSWERS !== "undefined") && LAB_ANSWERS[COURSE[li].n + ":" + ti];
  if(!steps) return '<span class="anote">No worked answer for this one — use the hint.</span>';
  let h = '<span class="anote">One way that works, assuming the earlier tasks in this lab are done. '+
          'Type it out rather than pasting — that is the part that sticks.</span>';
  for(const s of steps){
    if(typeof s === "string"){ h += '<code class="acmd">'+esc(s)+"</code>"; continue; }
    // an editor step: show the command that opens it, then the file itself
    h += '<code class="acmd">'+esc(s.open || ("edit " + s.edit))+"</code>"+
         '<pre class="afile">'+esc(s.body.replace(/\n$/,""))+"</pre>";
  }
  return h;
}

/* ---------- Tab completion, which the module guide promises ---------- */
function completions(input){
  const frag = (input.match(/(\S*)$/) || [""])[0];
  const firstWord = /^\s*[^\s]*$/.test(input);
  if(firstWord && !frag.includes("/"))
    return {frag, list: Object.keys(CS.K.C).filter(c => c.startsWith(frag)).sort()};
  const home = CS.K.vm.HOME;
  const abs = frag.startsWith("~/") ? home + frag.slice(1) : frag === "~" ? home : frag;
  const dir = abs.includes("/") ? (abs.replace(/\/[^/]*$/,"") || "/") : ".";
  const base = abs.includes("/") ? abs.split("/").pop() : abs;
  const r = CS.K.lookup(dir);
  if(!r.node || r.node.t !== "d") return {frag, list: []};
  const prefix = frag.includes("/") ? frag.replace(/[^/]*$/,"") : "";
  const list = Object.keys(r.node.ch)
    .filter(n => n.startsWith(base) && (base.startsWith(".") || !n.startsWith(".")))
    .sort()
    .map(n => prefix + n + (r.node.ch[n].t === "d" ? "/" : ""));
  return {frag, list};
}
function applyCompletion(el){
  const {frag, list} = completions(el.value);
  if(!list.length) return;
  const commonPrefix = list.reduce((a,b)=>{ let i=0; while(i<a.length && a[i]===b[i]) i++; return a.slice(0,i); });
  const replaceWith = list.length === 1 ? list[0] + " " : commonPrefix;
  const keep = el.value.slice(0, el.value.length - frag.length);
  if(replaceWith.length >= frag.length) el.value = keep + replaceWith;
  if(list.length > 1){
    cline(cps1()+" "+esc(el.value), "cmd");
    cline(list.map(esc).join("   "), "note");
  }
}

async function csubmit(raw){
  const input = String(raw).trim();
  if(!input) return;
  CS.hist.push({cmd:input, out:"", err:"", code:0});
  CS.hp = CS.hist.length;
  cline(cps1()+" "+esc(input), "cmd");

  if(/^(tasks|lab)$/i.test(input)){
    CS.hist.pop();
    COURSE[CS.lec].tasks.forEach((t,ti)=>{
      const done = !!S.lab[ckey(CS.lec,ti)];
      cline((done ? "[x] " : "[ ] ") + (ti+1) + ". " + esc(t.q.replace(/<[^>]+>/g,"")), done ? "ok" : "note");
      // an unfinished task says what it is still waiting for, so a near miss
      // does not just sit there silently
      if(!done) cline("        still waiting — " + esc(t.hint), "note");
    });
    cline("A task ticks when the machine shows the result, not when the command looks right.", "note");
    return;
  }
  if(/^reset$/i.test(input)){
    CS.hist.pop(); bootMachine(CS.lec);
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
  CS.screens[CS.lec] = $("c-screen").innerHTML;
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
    CS.screens[CS.lec] = $("c-screen").innerHTML;
  }
  $("c-editor").style.display = "none";
  CS.editing = null;
  $("c-entry").focus();
}

function renderCourseNav(){
  const box = $("modlist"); box.innerHTML = "";
  const now = currentLecture();
  COURSE.forEach((s,i)=>{
    const b = document.createElement("button");
    b.className = "mod" + (i === now ? " isnow" : "");
    b.setAttribute("aria-current", i===CS.lec);
    b.innerHTML = '<span class="n">v'+s.wk+"·F"+s.n+'</span><span class="mlong">'+esc(s.title)+'</span>'+
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
  if(S.c == null || S.c < 0) S.c = currentLecture();
  const li = Math.min(S.c|0, COURSE.length-1);
  const lec = COURSE[li];
  const firstVisit = CS.lec !== li;
  CS.lec = li;
  // reuse this lecture's machine if it already has one
  if(CS.machines[li]){ CS.K = CS.machines[li]; CS.hist = CS.histories[li]; CS.hp = CS.hist.length; }
  else bootMachine(li);

  let h =
    '<div class="cw"><div class="chead">'+
      '<div class="cmeta"><span class="wk">Vecka '+lec.wk+'</span>'+
        '<span class="dt">'+esc(lec.date)+'</span><span>Föreläsning '+lec.n+'</span>'+
        (li === currentLecture() ? '<span class="nowtag">next up</span>' : "")+"</div>"+
      "<h1>"+esc(lec.title)+"</h1>"+
      '<p class="topics">'+esc(lec.topics)+"</p>"+
      '<p class="cbrief">'+esc(lec.brief)+"</p>"+
    "</div>"+
    '<div class="csec"><h2>Lab — the terminal below is a real simulated machine</h2>'+
      '<ol class="ltasks">';
  lec.tasks.forEach((t,ti)=>{
    const done = !!S.lab[ckey(li,ti)];
    h += '<li class="ltask'+(done?" done":"")+'" id="t'+ti+'" role="checkbox" aria-checked="'+done+'">'+
      '<span class="lnum">'+(ti+1)+"</span>"+
      '<span class="lbody"><span class="ltext">'+t.q+"</span>"+
        '<span class="lbtns">'+
          '<button class="lhint" data-h="'+ti+'" aria-expanded="false" aria-controls="h'+ti+'">hint</button>'+
          '<button class="lhint lans" data-a="'+ti+'" aria-expanded="false" aria-controls="a'+ti+'">show answer</button>'+
        "</span>"+
        '<span class="lhinttext" id="h'+ti+'" hidden>'+esc(t.hint)+"</span>"+
        '<span class="lanstext" id="a'+ti+'" hidden>'+answerHtml(li, ti)+"</span></span>"+
      '<span class="lstat">'+(done?"done":"")+"</span></li>";
  });
  h += "</ol><p class=\"cprog\" id=\"c-progress\"></p></div>"+
    '<div class="csec"><h2>Check yourself — answers are hidden until you open them</h2>';
  lec.check.forEach(([q,a])=>{
    h += '<details class="chk"><summary>'+q+'</summary><div class="ans">'+a+"</div></details>";
  });
  h += "</div></div>";

  h += '<section class="term labterm">'+
    '<div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>'+
      '<span class="title">bash — analyst@workstation-07 (simulated)</span>'+
      '<button class="tbtn" id="c-reset">reset machine</button></div>'+
    '<div class="screen" id="c-screen" role="log" aria-live="polite" aria-label="Terminal output"></div>'+
    '<div class="inputline"><span class="ps1" id="c-ps1"></span>'+
      '<input id="c-entry" autocomplete="off" autocapitalize="off" spellcheck="false" '+
      'aria-label="Type a command" placeholder="type a command — Tab completes, try: ls, help, tasks"></div>'+
    '<div class="editor" id="c-editor" style="display:none">'+
      '<div class="edhead"><label for="ed-body">editing <b id="ed-path"></b></label>'+
        '<span class="edhint">Ctrl+Enter saves · Esc cancels</span></div>'+
      '<textarea id="ed-body" spellcheck="false" aria-label="File contents"></textarea>'+
      '<div class="edfoot"><button class="nextbtn" id="ed-save">Save</button>'+
        '<button class="tbtn" id="ed-cancel">Cancel</button></div>'+
    "</div></section>";

  h += '<div class="cnav">'+
    '<button class="tbtn" id="c-prev">← Previous</button>'+
    '<button class="nextbtn" id="c-next">Next lecture →</button></div>';

  $("courseview").innerHTML = h;

  // restore this lecture's scrollback, or print the banner on a first visit
  if(CS.screens[li]) $("c-screen").innerHTML = CS.screens[li];
  else {
    cline("Simulated Arch machine. Your home is /home/analyst. Nothing here can break anything.", "note");
    cline("Type <b>help</b> for the command list, <b>tasks</b> to re-read the lab, <b>reset</b> to start over.", "note");
    CS.screens[li] = $("c-screen").innerHTML;
  }
  $("c-screen").scrollTop = $("c-screen").scrollHeight;
  cprompt();

  $("c-entry").addEventListener("keydown", e=>{
    if(e.key==="Enter"){ const v=e.target.value; e.target.value=""; csubmit(v); }
    else if(e.key==="Tab"){ e.preventDefault(); applyCompletion(e.target); }
    else if(e.key==="ArrowUp"){ e.preventDefault();
      if(CS.hp>0){ CS.hp--; e.target.value = CS.hist[CS.hp] ? CS.hist[CS.hp].cmd : ""; } }
    else if(e.key==="ArrowDown"){ e.preventDefault();
      if(CS.hp < CS.hist.length-1){ CS.hp++; e.target.value = CS.hist[CS.hp].cmd; }
      else { CS.hp = CS.hist.length; e.target.value=""; } }
    else if(e.key==="l" && e.ctrlKey){ e.preventDefault();
      $("c-screen").innerHTML=""; CS.screens[CS.lec]=""; }
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
  $("courseview").querySelectorAll(".lhint[data-h]").forEach(b=>{
    b.onclick = ()=>{ const el = $("h"+b.dataset.h);
      el.hidden = !el.hidden;
      b.setAttribute("aria-expanded", String(!el.hidden));
      b.textContent = el.hidden ? "hint" : "hide hint"; };
  });
  $("courseview").querySelectorAll(".lans[data-a]").forEach(b=>{
    b.onclick = ()=>{ const el = $("a"+b.dataset.a);
      el.hidden = !el.hidden;
      b.setAttribute("aria-expanded", String(!el.hidden));
      b.textContent = el.hidden ? "show answer" : "hide answer"; };
  });
  $("c-prev").onclick = ()=>{ if(S.c>0){ S.c--; renderCourse(); save(); } };
  $("c-next").onclick = ()=>{ if(S.c<COURSE.length-1){ S.c++; renderCourse(); save(); } };
  [["c-prev", li===0], ["c-next", li===COURSE.length-1]].forEach(([id,off])=>{
    $(id).disabled = off; $(id).style.opacity = off ? ".4" : "1";
  });

  paintTasks();
}
