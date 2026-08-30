/* ===================== the Python tool's view =====================
   A chapter of teaching, its exercises, and one editor you actually run code
   in. The interpreter is the same one behind the lab terminal, and the program
   runs against the same simulated filesystem — so `open("/var/log/access.log")`
   opens the real thing, and what you learn here is what works there. */

const PY = {ch:0, ex:0, out:"", ran:false, machine:null};

function pyMachine(){
  if(!PY.machine) PY.machine = attachNet(attachPython(seedVM(attachShell(makeVM()))));
  return PY.machine;
}
function pyState(){
  PV.py = PV.py || {done:{}, code:{}};
  return PV.py;
}
const pyKey = (c,e) => c + ":" + e;

/* run whatever is in the editor and remember what it printed */
function pyRun(){
  const st = pyState();
  const key = pyKey(PY.ch, PY.ex);
  const code = (document.getElementById("py-code") || {}).value || "";
  st.code[key] = code;

  const K = pyMachine();
  K.vm.put("/home/analyst/main.py", code, 0o644, "analyst", "analyst");
  let r;
  try{ r = K.run("python3 /home/analyst/main.py"); }
  catch(e){ r = {out:"", err:"internal error: " + e.message}; }
  PY.out = (r.out || "") + (r.err || "");
  PY.ran = true;

  /* the exercise is done when the program prints the right thing — checked by
     running it, not by reading the source */
  const ex = PYLAB[PY.ch].ex[PY.ex];
  let done = false;
  try{ done = !!ex.check(PY.out, code); }
  catch(e){ done = false; console.error("python exercise check threw: " + e.message); }
  if(done && !st.done[key]){
    st.done[key] = 1;
    if(typeof celebrateTask === "function") celebrateTask();
  }
  pvSave();
  pyRender();
  const ta = document.getElementById("py-code");
  if(ta) ta.focus();
}

function pySelect(ch, ex){
  PY.ch = ch; PY.ex = ex; PY.out = ""; PY.ran = false;
  pyRender();
}

function pyChapterDone(ci){
  const st = pyState();
  return PYLAB[ci].ex.filter((_,i) => st.done[pyKey(ci,i)]).length;
}

function pyRenderProgressLine(){
  const total = PYLAB.reduce((n,c) => n + c.ex.length, 0);
  const done = PYLAB.reduce((n,c,ci) => n + pyChapterDone(ci), 0);
  return {done, total};
}

function pvRenderPython(){
  const v = pvView("pv-pythonview");
  const st = pyState();
  const ch = PYLAB[PY.ch];
  const ex = ch.ex[PY.ex];
  const key = pyKey(PY.ch, PY.ex);
  const code = st.code[key] !== undefined ? st.code[key] : (ex.start || "");
  const done = !!st.done[key];
  const all = pyRenderProgressLine();

  v.innerHTML =
    '<div class="cw">'+
      '<div class="chead"><div class="cmeta">'+
        '<span class="wk">' + t("pyChapter") + " " + (PY.ch+1) + " / " + PYLAB.length + "</span>"+
        '<span class="dt">' + all.done + " / " + all.total + " " + t("pvTasksWord") + "</span></div>"+
        "<h1>" + esc(L(ch.title)) + "</h1>"+
        '<p class="cbrief">' + L(ch.teach) + "</p></div>"+

      '<div class="csec"><h2>' + t("pyExercises") + "</h2><ol class=\"ltasks\">"+
        ch.ex.map((e,i) => {
          const d = !!st.done[pyKey(PY.ch,i)];
          const here = i === PY.ex;
          return '<li class="ltask'+(d?" done":"")+(here?" pyhere":"")+'">'+
            '<span class="lnum">'+(i+1)+"</span>"+
            '<span class="lbody"><span class="ltext">'+L(e.task)+"</span>"+
              '<span class="lbtns">'+
                (here ? "" : '<button class="lhint" data-go="'+i+'">'+t("pyOpen")+"</button>")+
                '<button class="lhint" data-h="'+i+'">'+t("hint")+"</button>"+
                '<button class="lhint lans" data-a="'+i+'">'+t("showAnswer")+"</button>"+
              "</span>"+
              '<span class="lhinttext" id="py-h'+i+'" hidden>'+esc(L(e.hint))+"</span>"+
              '<span class="lanstext" id="py-a'+i+'" hidden><code class="acmd">'+
                esc(e.answer)+"</code></span>"+
            "</span>"+
            '<span class="lstat">'+(d?"done":"")+"</span></li>";
        }).join("")+
      "</ol></div>"+
    "</div>"+

    /* the editor: this is the part that makes it a tool rather than a page */
    '<section class="pyed">'+
      '<div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>'+
        '<span class="tt">main.py — ' + t("pyExercise") + " " + (PY.ex+1) + "</span>"+
        '<button class="tbtn" id="py-reset">' + t("pyResetCode") + "</button></div>"+
      '<textarea id="py-code" spellcheck="false" aria-label="Python code">' + esc(code) + "</textarea>"+
      '<div class="pyfoot">'+
        '<button class="nextbtn" id="py-run">' + t("pyRun") + "</button>"+
        '<span class="pyhintline">' + t("pyRunHint") + "</span>"+
        (done ? '<span class="pydone">' + t("pyPassed") + "</span>" : "")+
      "</div>"+
      '<div class="pyout' + (PY.ran ? "" : " empty") + '">'+
        (PY.ran
          ? (PY.out.trim() === ""
              ? '<span class="pymuted">' + t("pyNoOutput") + "</span>"
              : '<pre class="' + (/Traceback|Error/.test(PY.out) ? "pyerr" : "") + '">' + esc(PY.out) + "</pre>")
          : '<span class="pymuted">' + t("pyOutputHere") + "</span>")+
      "</div>"+
    "</section>";

  v.querySelectorAll("[data-go]").forEach(b => b.onclick = () => pySelect(PY.ch, +b.dataset.go));
  v.querySelectorAll("[data-h]").forEach(b => b.onclick = () => {
    const el = document.getElementById("py-h"+b.dataset.h);
    el.hidden = !el.hidden;
    b.textContent = el.hidden ? t("hint") : t("hideHint");
  });
  v.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
    const el = document.getElementById("py-a"+b.dataset.a);
    el.hidden = !el.hidden;
    b.textContent = el.hidden ? t("showAnswer") : t("hideAnswer");
  });
  document.getElementById("py-run").onclick = pyRun;
  document.getElementById("py-reset").onclick = () => {
    delete pyState().code[key];
    PY.out = ""; PY.ran = false; pvSave(); pyRender();
  };

  const ta = document.getElementById("py-code");
  ta.onkeydown = e => {
    /* Tab indents rather than leaving the box — this is an editor, and Python
       cares about indentation more than most */
    if(e.key === "Tab"){
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + "    " + ta.value.slice(en);
      ta.selectionStart = ta.selectionEnd = s + 4;
      return;
    }
    if(e.key === "Enter" && (e.ctrlKey || e.metaKey)){ e.preventDefault(); pyRun(); return; }
    /* keep the indent of the line you are leaving, and add one after a colon */
    if(e.key === "Enter"){
      const s = ta.selectionStart;
      const line = ta.value.slice(0, s).split("\n").pop();
      const indent = (line.match(/^[ \t]*/) || [""])[0];
      const deeper = /:\s*$/.test(line) ? "    " : "";
      if(indent || deeper){
        e.preventDefault();
        const ins = "\n" + indent + deeper;
        ta.value = ta.value.slice(0, s) + ins + ta.value.slice(ta.selectionEnd);
        ta.selectionStart = ta.selectionEnd = s + ins.length;
      }
    }
  };
  ta.oninput = () => { pyState().code[key] = ta.value; };
}

function pyRender(){
  const ta = document.getElementById("py-code");
  const sel = ta ? [ta.selectionStart, ta.selectionEnd] : null;
  const focused = document.activeElement === ta;
  pvRenderPython();
  if(typeof pvSidebar === "function") pvSidebar("python");
  if(focused){
    const n = document.getElementById("py-code");
    if(n){ n.focus(); if(sel) n.setSelectionRange(sel[0], sel[1]); }
  }
}
