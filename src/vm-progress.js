/* ===================== preview: progress overview =====================
   Progress is spread across three stores and ten courses, so the only way to
   see where you stand is to walk into each entry and look. This is that walk,
   done once.

   It also does the thing the reset dialog made obvious: everything lives in one
   browser's local storage, so a cleared cache loses a term of work. The backup
   is a plain JSON file that restores here or on another machine. */

function pvProgressRows(){
  const rows = [];
  /* the Python tool keeps its own progress, so it has to be added by hand */
  if(typeof PYLAB !== "undefined"){
    const p = pyRenderProgressLine();
    if(p.total) rows.push({title:L(T.pyTitle), done:p.done, total:p.total,
                           unit:"exercises", id:"pv-python"});
  }
  PROGRAMME.courses.concat(PROGRAMME.tools).forEach(c => {
    if(!c.ready || c.preview) return;
    const p = courseProgress(c);
    if(p) rows.push({title: L(c.title), done: p.done, total: p.total, unit: p.unit, id: c.id});
  });
  return rows;
}

function pvRenderProgress(){
  const v = pvView("pv-progressview");
  const rows = pvProgressRows();
  const done = rows.reduce((n,r) => n + r.done, 0);
  const total = rows.reduce((n,r) => n + r.total, 0);
  const pct = total ? Math.round(done / total * 100) : 0;
  const reviewCount = pvReviewItems().length;

  /* weakest = furthest from finished, ignoring anything untouched, so it points
     at work in progress rather than at whatever has not been opened yet */
  const started = rows.filter(r => r.done > 0 && r.done < r.total);
  started.sort((a,b) => (a.done/a.total) - (b.done/b.total));

  v.innerHTML = '<div class="pvcard">'+
    "<h2>" + t("pvProgress") + "</h2>"+
    (total === 0 ? '<p class="pvlead">' + t("pvNoData") + "</p>" :
      '<div class="rscore pvbig"><b>' + done + "</b> / " + total + "<span>" + pct + "%</span></div>"+
      '<div class="pvmeter"><i style="width:' + pct + '%"></i></div>')+
    "</div>"+

    '<div class="pvcard"><h3>' + t("pvOverall") + "</h3>"+
      '<div class="pvrows">' + rows.map(r => {
        const p = r.total ? Math.round(r.done/r.total*100) : 0;
        return '<button class="pvrow" data-go="' + r.id + '">'+
          '<span class="pvrname">' + esc(r.title) + "</span>"+
          '<span class="pvrbar"><i style="width:' + p + '%"></i></span>'+
          '<span class="pvrnum">' + r.done + "/" + r.total + "</span></button>";
      }).join("") + "</div>"+
      (started.length ? '<p class="pvmuted pvweak">' + t("pvWeakest") + ": "+
        esc(started[0].title) + " — " + started[0].done + "/" + started[0].total + "</p>" : "")+
      (reviewCount ? '<p class="pvmuted"><button class="lhint" id="pv-goreview">'+
        reviewCount + " " + t("pvItemsLeft") + " →</button></p>" : "")+
    "</div>"+

    '<div class="pvcard"><h3>' + t("pvExport") + "</h3>"+
      '<p class="pvlead">' + t("pvBackupNote") + "</p>"+
      '<div class="pvnav">'+
        '<button class="nextbtn" id="pv-export">' + t("pvExport") + "</button>"+
        '<button class="tbtn" id="pv-import">' + t("pvImport") + "</button>"+
        '<input type="file" id="pv-file" accept="application/json,.json" hidden>'+
      "</div>"+
      '<p class="pvmuted" id="pv-iomsg"></p>'+
    "</div>";

  v.querySelectorAll(".pvrow").forEach(b => b.onclick = () => enterCourse(b.dataset.go));
  const gr = $("pv-goreview"); if(gr) gr.onclick = () => enterCourse("pv-review");
  $("pv-export").onclick = pvExport;
  $("pv-import").onclick = () => $("pv-file").click();
  $("pv-file").onchange = pvImport;
}

/* ---------- backup ---------- */
function pvBackupBlob(){
  return JSON.stringify({
    format: "seclab-progress",
    version: 1,
    saved: new Date().toISOString(),
    main: {
      mode:S.mode, pm:S.pm, m:S.m, t:S.t, solved:S.solved, tries:S.tries, hits:S.hits, best:S.best,
      qDone:S.qDone, qTries:S.qTries, qHits:S.qHits,
      c:S.c, lab:S.lab, course:S.course, lang:S.lang,
      hints:S.hints, reveals:S.reveals, qWrong:S.qWrong, seen:true,
      mach:(typeof serializeMachines === "function" ? serializeMachines() : undefined),
    },
    preview: {examLog: PV.examLog, extraWrong: PV.extraWrong, recalled: PV.recalled},
  }, null, 1);
}

function pvExport(){
  const blob = new Blob([pvBackupBlob()], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "seclab-progress-" + new Date().toISOString().slice(0,10) + ".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function pvImport(ev){
  const f = ev.target.files && ev.target.files[0];
  if(!f) return;
  const msg = $("pv-iomsg");
  const rd = new FileReader();
  rd.onload = () => {
    try{
      const d = JSON.parse(rd.result);
      if(!d || d.format !== "seclab-progress") throw new Error("not a backup");
      const m = d.main || {};
      Object.assign(S, {
        mode:m.mode||"drill", pm:m.pm||"pacman", m:m.m|0, t:m.t|0,
        solved:m.solved||{}, tries:m.tries|0, hits:m.hits|0, best:m.best|0,
        qDone:m.qDone||{}, qTries:m.qTries|0, qHits:m.qHits|0,
        c:(m.c==null?-1:m.c|0), lab:m.lab||{}, course:m.course||null, lang:m.lang||"en",
        hints:m.hints||{}, reveals:m.reveals||{}, qWrong:m.qWrong||{},
      });
      if(m.mach && typeof restoreMachines === "function") restoreMachines(m.mach);
      const p = d.preview || {};
      PV.examLog = Array.isArray(p.examLog) ? p.examLog : [];
      PV.extraWrong = p.extraWrong || {};
      PV.recalled = p.recalled || {};
      save(); pvSave();
      setLang(S.lang);
      msg.textContent = t("pvImported");
      msg.style.color = "var(--lime)";
      pvRenderProgress();
    }catch(e){
      msg.textContent = t("pvImportBad");
      msg.style.color = "var(--rose)";
    }
  };
  rd.readAsText(f);
  ev.target.value = "";
}
