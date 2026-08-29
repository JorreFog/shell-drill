/* ===================== preview: the network lab's own view =====================
   The published lab view is wired to COURSE and S.c, so rather than bending it
   this builds a compact one: the task list, a terminal on a machine of its own,
   and the same self-checking contract. Roughly a third of the code, because it
   only has to serve one lab. */

const NL = {machine: null, screen: [], hist: [], hp: 0, done: {}, shown: {}};

function nlMachine(){
  if(!NL.machine) NL.machine = attachPython(seedVM(attachShell(makeVM())));
  return NL.machine;
}

function nlCheck(){
  const K = nlMachine();
  let changed = false;
  NETLAB.tasks.forEach((task, i) => {
    if(NL.done[i]) return;
    let pass = false;
    try{ pass = !!task.check(K); }catch(e){ pass = false; }
    if(pass){ NL.done[i] = true; changed = true; }
  });
  if(changed){ pvSave(); nlRender(); if(typeof celebrateTask === "function") celebrateTask(); }
  return changed;
}

function nlPrint(text, cls){
  if(text == null || text === "") return;
  String(text).replace(/\n$/,"").split("\n").forEach(line =>
    NL.screen.push({t: line, c: cls || ""}));
  if(NL.screen.length > 400) NL.screen = NL.screen.slice(-400);
}

function nlRun(line){
  const K = nlMachine();
  nlPrint(K.vm.user + "@" + "workstation-07:" + shortCwd(K) + "$ " + line, "cmd");
  const cmd = line.trim();
  if(!cmd){ nlRender(); return; }
  if(cmd === "clear"){ NL.screen = []; nlRender(); return; }
  if(cmd === "tasks"){ nlPrint(nlTaskText(), "note"); nlRender(); return; }
  if(cmd === "reset"){
    NL.machine = null; NL.screen = [];
    nlPrint("Machine reset. Completed tasks are kept.", "note");
    nlRender(); return;
  }
  let r;
  try{ r = K.run(cmd); }
  catch(e){ r = {out:"", err:"bash: " + e.message + "\n", code:1}; }
  if(r.clear) NL.screen = [];
  nlPrint(r.out, "");
  nlPrint(r.err, "err");
  nlCheck();
  nlRender();
}

function shortCwd(K){
  const c = K.vm.cwd;
  return c === K.vm.HOME ? "~" : c.replace(K.vm.HOME, "~");
}

function nlTaskText(){
  return NETLAB.tasks.map((t,i) =>
    (NL.done[i] ? "[x] " : "[ ] ") + (i+1) + ". " + plain(L(t.q))).join("\n");
}

function pvRenderNetlab(){
  const v = pvView("pv-netlabview");
  const done = NETLAB.tasks.filter((_,i) => NL.done[i]).length;

  v.innerHTML =
    '<div class="cw">'+
      '<div class="chead"><div class="cmeta"><span class="wk">'+t("pvNetLab")+"</span>"+
        '<span class="dt">10.0.0.0/24</span></div>'+
        "<h1>" + esc(L(NETLAB.title)) + "</h1>"+
        '<p class="cbrief">' + esc(L(NETLAB.brief)) + "</p></div>"+
      '<div class="csec"><h2>' + t("pvNetTasks") + "</h2><ol class=\"ltasks\">"+
        NETLAB.tasks.map((task,i) => {
          const d = !!NL.done[i];
          return '<li class="ltask'+(d?" done":"")+'">'+
            '<span class="lnum">'+(i+1)+"</span>"+
            '<span class="lbody"><span class="ltext">'+esc(L(task.q))+"</span>"+
              '<span class="lbtns">'+
                '<button class="lhint" data-h="'+i+'">'+t("hint")+"</button>"+
                '<button class="lhint lans" data-a="'+i+'">'+t("showAnswer")+"</button>"+
              "</span>"+
              '<span class="lhinttext" id="nl-h'+i+'" hidden>'+esc(L(task.hint))+"</span>"+
              '<span class="lanstext" id="nl-a'+i+'" hidden>'+
                task.answer.map(a => "<code>"+esc(a)+"</code>").join("<br>")+"</span>"+
            "</span>"+
            '<span class="lstat">'+(d?"done":"")+"</span></li>";
        }).join("")+
      '</ol><p class="cprog'+(done===NETLAB.tasks.length?" allgood":"")+'">'+
        done+" / "+NETLAB.tasks.length+" "+t("pvTasksWord")+"</p></div>"+

      '<div class="csec"><h2>' + t("pvNetMap") + "</h2>" + nlTopologySvg() + "</div>"+

      '<div class="csec"><h2>' + t("pvCheckSelf") + "</h2>"+
        NETLAB.check.map(([q,a]) =>
          '<details class="chk"><summary>'+esc(L(q))+'</summary>'+
          '<div class="ans">'+esc(L(a))+"</div></details>").join("")+
      "</div>"+
    "</div>"+

    '<section class="term labterm">'+
      '<div class="bar"><span class="dot r"></span><span class="dot y"></span><span class="dot g"></span>'+
        '<span class="tt">bash — analyst@workstation-07 (simulated)</span>'+
        '<button class="tbtn" id="nl-reset">'+t("pvResetMachine")+"</button></div>"+
      '<div class="screen" id="nl-screen">'+
        NL.screen.map(l => '<div class="ln '+l.c+'">'+esc(l.t)+"</div>").join("")+
      "</div>"+
      '<div class="inputline"><span class="ps1">analyst@workstation-07:'+
        esc(shortCwd(nlMachine()))+'$</span>'+
        '<input id="nl-entry" spellcheck="false" autocomplete="off" '+
        'placeholder="'+t("pvTypeCommand")+'" aria-label="terminal"></div>'+
    "</section>";

  v.querySelectorAll(".lhint[data-h]").forEach(b => b.onclick = () => {
    const el = $("nl-h"+b.dataset.h); el.hidden = !el.hidden;
    b.textContent = el.hidden ? t("hint") : t("hideHint");
  });
  v.querySelectorAll(".lans[data-a]").forEach(b => b.onclick = () => {
    const el = $("nl-a"+b.dataset.a); el.hidden = !el.hidden;
    b.textContent = el.hidden ? t("showAnswer") : t("hideAnswer");
  });
  $("nl-reset").onclick = () => { NL.machine = null; NL.screen = []; nlRender(); };

  const inp = $("nl-entry");
  inp.onkeydown = e => {
    if(e.key === "Enter"){
      const line = inp.value; inp.value = "";
      if(line.trim()){ NL.hist.push(line); NL.hp = NL.hist.length; }
      nlRun(line);
    } else if(e.key === "ArrowUp"){
      if(NL.hp > 0){ NL.hp--; inp.value = NL.hist[NL.hp] || ""; }
      e.preventDefault();
    } else if(e.key === "ArrowDown"){
      if(NL.hp < NL.hist.length){ NL.hp++; inp.value = NL.hist[NL.hp] || ""; }
      e.preventDefault();
    }
  };
  const sc = $("nl-screen"); if(sc) sc.scrollTop = sc.scrollHeight;
}

function nlRender(){
  const active = document.activeElement && document.activeElement.id === "nl-entry";
  const caret = active ? document.activeElement.value : null;
  pvRenderNetlab();
  if(typeof pvSidebar === "function") pvSidebar("netlab");
  if(active){ const i = $("nl-entry"); i.value = caret; i.focus(); }
}

/* A picture of the same state the commands read: hosts the scan would find,
   drawn from net.hosts rather than hand-placed, so it cannot drift. */
function nlTopologySvg(){
  const K = nlMachine();
  const net = K.net || makeNet();
  const rows = net.hosts.filter(h => !h.self);
  const W = 620, rowH = 34, H = 90 + rows.length * rowH;
  const cx = 90;

  let s = '<svg viewBox="0 0 '+W+' '+H+'" class="nlmap" role="img" '+
    'aria-label="Network map of 10.0.0.0/24">';
  /* the switch spine */
  s += '<line x1="'+cx+'" y1="56" x2="'+cx+'" y2="'+(56 + rows.length*rowH)+'" '+
       'stroke="var(--line)" stroke-width="2"/>';
  /* this machine */
  s += '<rect x="20" y="20" width="140" height="26" rx="2" fill="var(--panel)" '+
       'stroke="var(--amber)"/>'+
       '<text x="30" y="37" fill="var(--amber)" font-size="11" font-family="monospace">'+
       'this machine · .10</text>';

  rows.forEach((h, i) => {
    const y = 62 + i * rowH;
    const blocked = net.fw.enabled && !netAllowed(net, h, null, "icmp");
    const colour = !h.up ? "var(--dim)" : blocked ? "var(--rose)"
                 : h.kind === "unknown" ? "var(--rose)" : "var(--lime)";
    s += '<line x1="'+cx+'" y1="'+y+'" x2="'+(cx+40)+'" y2="'+y+'" stroke="var(--line)"/>';
    s += '<circle cx="'+(cx+40)+'" cy="'+y+'" r="4" fill="'+colour+'"/>';
    s += '<text x="'+(cx+54)+'" y="'+(y+4)+'" fill="var(--bone)" font-size="11.5" '+
         'font-family="monospace">'+esc(h.ip)+"</text>";
    s += '<text x="'+(cx+150)+'" y="'+(y+4)+'" fill="var(--dim)" font-size="11.5" '+
         'font-family="monospace">'+esc(h.name || "?")+"</text>";
    s += '<text x="'+(cx+300)+'" y="'+(y+4)+'" fill="'+
         (h.kind === "unknown" ? "var(--rose)" : "var(--dim)")+'" font-size="11" '+
         'font-family="monospace">'+
         esc(h.up ? h.ports.map(p => p.n).join(" ") : "down")+"</text>";
    if(blocked)
      s += '<text x="'+(cx+430)+'" y="'+(y+4)+'" fill="var(--rose)" font-size="10.5" '+
           'font-family="monospace">BLOCKED</text>';
  });
  s += "</svg>";
  return s;
}
