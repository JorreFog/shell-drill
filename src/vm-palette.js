/* ===================== preview: command palette =====================
   The site has grown to twelve entries, ~230 tasks, ~180 questions and a
   cheatsheet of a hundred commands, and the only way to reach any of it is to
   remember which tab it lives behind. Ctrl+K searches the lot and jumps.

   The index is built from the same data the pages render, so it cannot list
   something that is not there, and it is built once on first open rather than
   at load — nothing is paid for by a student who never presses the key. */

let pvIndex = null;

function pvBuildIndex(){
  const out = [];

  /* courses and tools */
  PROGRAMME.courses.concat(PROGRAMME.tools).forEach(c => {
    if(!c.ready) return;
    out.push({kind:"go", label:L(c.title), sub:L(T.pvKindEntry), go:() => enterCourse(c.id)});
  });

  /* cheatsheet commands — the fastest thing to want mid-task */
  if(typeof SHEET !== "undefined"){
    SHEET.forEach(([section, rows]) => rows.forEach(([cmd, what]) => {
      out.push({kind:"cmd", label:cmd, sub:what, go:() => {
        $("drawer").classList.add("open");
        const f = $("refsearch"); if(f){ f.value = cmd; renderSheet(cmd); }
      }});
    }));
  }

  /* drill tasks */
  if(typeof MODULES !== "undefined"){
    MODULES.forEach((m, mi) => (m.tasks||[]).forEach((task, ti) => {
      out.push({kind:"drill", label:plain(task.q), sub:m.name,
        go:() => { enterCourse("tool-drill"); S.m = mi; S.t = ti;
                   S.awaitingNext = false; setMode("drill"); }});
    }));
  }

  /* lab tasks, per lecture */
  if(typeof COURSE !== "undefined"){
    COURSE.forEach((lec, li) => lec.tasks.forEach((task, ti) => {
      out.push({kind:"lab", label:plain(task.q), sub:"v"+lec.wk+" "+L(lec.title),
        go:() => { enterCourse("grund-it"); S.c = li; setMode("course");
                   setTimeout(() => { const el = $("t"+ti);
                     if(el) el.scrollIntoView({block:"center"}); }, 60); }});
    }));
  }

  /* the network lab's tasks too */
  if(typeof NETLAB !== "undefined"){
    NETLAB.tasks.forEach((task, i) => {
      out.push({kind:"lab", label:plain(L(task.q)), sub:L(NETLAB.title),
        go:() => enterCourse("pv-netlab")});
    });
  }

  /* every quiz question on the site */
  pvAllQuizzes().forEach(q => {
    out.push({kind:"quiz", label:plain(L(q.item.q)), sub:L(q.course), go:() => {
      const courseId = q.setId ? q.setId.replace(/:$/,"") : "tool-quiz";
      enterCourse(courseId);
      const parts = q.key.replace(q.setId, "").split(":");
      Q.tier = +parts[0]; Q.i = +parts[1];
      Q.picked = new Set(); Q.checked = false;
      setMode("quiz");
    }});
  });

  return out;
}

/* Subsequence match, the way editors do it: "grpr" finds "grep -r". Scores
   earlier and tighter matches higher so exact prefixes float to the top. */
function pvFuzzy(needle, hay){
  if(!needle) return 0;
  const n = needle.toLowerCase(), h = hay.toLowerCase();
  const direct = h.indexOf(n);
  if(direct === 0) return 1000;
  if(direct > 0) return 700 - direct;
  let i = 0, score = 0, last = -1;
  for(let k = 0; k < h.length && i < n.length; k++){
    if(h[k] === n[i]){
      score += (last === k-1) ? 6 : 2;
      if(k === 0 || h[k-1] === " " || h[k-1] === "-") score += 4;
      last = k; i++;
    }
  }
  return i === n.length ? score : -1;
}

const PVP = {open:false, q:"", sel:0, hits:[]};

function pvPalette(){
  let box = $("pv-palette");
  if(!box){
    box = document.createElement("div");
    box.id = "pv-palette"; box.className = "pvpal"; box.hidden = true;
    box.innerHTML = '<div class="pvpalbox" role="dialog" aria-label="Search">'+
      '<input id="pv-palq" autocomplete="off" spellcheck="false">'+
      '<div class="pvpalhits" id="pv-palhits"></div>'+
      '<div class="pvpalfoot"><span>&uarr;&darr;</span> '+t("pvPalMove")+
        ' <span>&crarr;</span> '+t("pvPalOpen")+' <span>esc</span> '+t("pvPalClose")+"</div></div>";
    document.body.appendChild(box);
    box.onclick = e => { if(e.target === box) pvPaletteClose(); };
    $("pv-palq").oninput = e => { PVP.q = e.target.value; PVP.sel = 0; pvPaletteRender(); };
    $("pv-palq").onkeydown = e => {
      if(e.key === "Escape"){ pvPaletteClose(); e.preventDefault(); }
      else if(e.key === "ArrowDown"){ PVP.sel = Math.min(PVP.sel+1, PVP.hits.length-1); pvPaletteRender(); e.preventDefault(); }
      else if(e.key === "ArrowUp"){ PVP.sel = Math.max(PVP.sel-1, 0); pvPaletteRender(); e.preventDefault(); }
      else if(e.key === "Enter"){ pvPaletteGo(); e.preventDefault(); }
    };
  }
  return box;
}

function pvPaletteRender(){
  if(!pvIndex) pvIndex = pvBuildIndex();
  const q = PVP.q.trim();
  PVP.hits = (q
    ? pvIndex.map(it => ({it, s: Math.max(pvFuzzy(q, it.label), pvFuzzy(q, it.sub||"") - 200)}))
        .filter(x => x.s > 0).sort((a,b) => b.s - a.s).slice(0, 40).map(x => x.it)
    : pvIndex.filter(it => it.kind === "go"));
  if(PVP.sel >= PVP.hits.length) PVP.sel = Math.max(0, PVP.hits.length - 1);

  const kindLabel = {go:"pvKindEntry", cmd:"pvKindCmd", drill:"pvKindDrill",
                     lab:"pvKindLab", quiz:"pvKindQuiz"};
  $("pv-palhits").innerHTML = PVP.hits.length
    ? PVP.hits.map((it, i) =>
        '<button class="pvpalhit'+(i===PVP.sel?" sel":"")+'" data-i="'+i+'">'+
          '<span class="pvpalkind k-'+it.kind+'">'+t(kindLabel[it.kind])+"</span>"+
          '<span class="pvpallab">'+esc(it.label)+"</span>"+
          '<span class="pvpalsub">'+esc(it.sub||"")+"</span></button>").join("")
    : '<p class="pvpalnone">'+t("pvPalNone")+"</p>";
  $("pv-palhits").querySelectorAll(".pvpalhit").forEach(b =>
    b.onclick = () => { PVP.sel = +b.dataset.i; pvPaletteGo(); });
  const sel = $("pv-palhits").querySelector(".sel");
  if(sel) sel.scrollIntoView({block:"nearest"});
}

function pvPaletteGo(){
  const it = PVP.hits[PVP.sel];
  if(!it) return;
  pvPaletteClose();
  try{ it.go(); }catch(e){}
}

function pvPaletteOpen(){
  const box = pvPalette();
  box.hidden = false; PVP.open = true; PVP.q = ""; PVP.sel = 0;
  $("pv-palq").value = "";
  $("pv-palq").placeholder = t("pvPalPlaceholder");
  pvPaletteRender();
  $("pv-palq").focus();
}
function pvPaletteClose(){
  const box = $("pv-palette");
  if(box) box.hidden = true;
  PVP.open = false;
}

/* guarded so the node suites can load this file for its matcher */
if(typeof document !== "undefined") document.addEventListener("keydown", e => {
  if((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")){
    e.preventDefault();
    PVP.open ? pvPaletteClose() : pvPaletteOpen();
  }
  /* the language switch rebuilds labels, so the index has to go with it */
  if(e.key === "Escape" && PVP.open) pvPaletteClose();
});
