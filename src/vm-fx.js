/* =================== motion ===================
   A boot sequence on arrival, and small reactions to what you do. Everything
   here is decoration: if it is skipped, disabled or fails, the site behaves
   exactly the same. Nothing below gates any functionality. */

// guarded so the file can also be loaded by the node test suite
const REDUCED = typeof window !== "undefined" && window.matchMedia
  ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

/* ---------- boot sequence ----------
   Once per browser session, and any key or click cuts it short. The counts are
   read from the real data, so the lines are not decorative lies. */
function bootLines(){
  const courses = PROGRAMME.courses.length, tools = PROGRAMME.tools.length;
  const ready = allEntries().filter(c => c.ready).length;
  const drill = MODULES.reduce((n,m)=>n+m.tasks.length, 0);
  const quizzes = QUIZ.reduce((n,t)=>n+t.items.length, 0) +
    Object.values(COURSE_QUIZZES).reduce((n,set)=>n+set.reduce((m,t)=>m+t.items.length,0), 0);
  const labs = COURSE.reduce((n,l)=>n+l.tasks.length, 0);
  return [
    {t:"", cls:""},
    {t:t("brandA")+"·"+t("brandB")+"  —  "+PROGRAMME.name, cls:"bhead"},
    {t:"", cls:""},
    {t:"mounting simulated filesystem", ok:true},
    {t:"starting shell, python interpreter", ok:true},
    {t:"loading "+courses+" courses, "+tools+" tools ("+ready+" open)", ok:true},
    {t:drill+" drill tasks · "+quizzes+" quiz questions · "+labs+" lab tasks", ok:true},
    {t:"", cls:""},
    {t:"ready.", cls:"bready"}
  ];
}

function runBoot(done){
  let skipped = false;
  const finish = ()=>{
    if(skipped) return;
    skipped = true;
    document.removeEventListener("keydown", cut, true);
    document.removeEventListener("click", cut, true);
    const el = $("boot");
    if(el){ el.classList.add("out"); setTimeout(()=>el.remove(), 340); }
    done();
  };
  const cut = ()=>finish();

  let seen = false;
  try{ seen = sessionStorage.getItem("seclab:boot") === "1"; }catch(e){}
  if(seen || REDUCED){ done(); return; }
  try{ sessionStorage.setItem("seclab:boot", "1"); }catch(e){}

  const el = document.createElement("div");
  el.className = "boot"; el.id = "boot";
  el.innerHTML = '<div class="bwrap"><div class="blines" id="blines"></div>'+
    '<div class="bskip">press any key to skip</div></div>';
  document.body.appendChild(el);
  document.addEventListener("keydown", cut, true);
  document.addEventListener("click", cut, true);

  const lines = bootLines();
  const box = $("blines");
  let i = 0;
  const step = ()=>{
    if(skipped) return;
    if(i >= lines.length){ setTimeout(finish, 420); return; }
    const l = lines[i++];
    const d = document.createElement("div");
    d.className = "bline " + (l.cls || "");
    d.innerHTML = l.ok ? '<span class="bok">[  OK  ]</span> ' + esc(l.t)
                       : (l.t ? esc(l.t) : "&nbsp;");
    box.appendChild(d);
    setTimeout(step, l.t === "" ? 40 : l.ok ? 115 : 220);
  };
  step();
}

/* ---------- reactions ---------- */

/* A task just completed: draw the tick, flash the row, pulse the progress bar. */
function celebrateTask(ti){
  if(REDUCED) return;
  const row = $("t" + ti);
  if(row){
    row.classList.remove("justdone");
    void row.offsetWidth;              // restart the animation if it is still running
    row.classList.add("justdone");
  }
  const bar = $("c-progress");
  if(bar){ bar.classList.remove("pulse"); void bar.offsetWidth; bar.classList.add("pulse"); }
}

/* Fade the main panel when switching tabs, so views do not snap. */
function transitionView(){
  if(REDUCED) return;
  const m = document.querySelector("main");
  if(!m) return;
  m.classList.remove("viewin");
  void m.offsetWidth;
  m.classList.add("viewin");
}

/* The terminal glows while a command is being handled — brief, but it makes the
   machine feel like it is doing something. */
function pulseTerminal(){
  if(REDUCED) return;
  const term = document.querySelector(".labterm");
  if(!term) return;
  term.classList.add("working");
  setTimeout(()=>term.classList.remove("working"), 220);
}
