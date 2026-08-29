/* =================== completion report ===================
   Shown when a lab or a quiz is finished, and reachable any time from a button.

   Everything here is derived from what actually happened: which tasks needed a
   hint or the answer, which questions were missed, and what the terminal
   returned. No generic praise — if there is nothing to say about an area, that
   section is left out. */

/* ---------- reading the signals ---------- */

/* Error patterns in a lecture's command history, each with the advice it earns. */
function terminalSignals(li){
  const hist = CS.histories[li] || [];
  const ran = hist.filter(h => h.cmd && !/^(tasks|lab|reset)$/i.test(h.cmd));
  const sig = {total: ran.length, notFound: 0, denied: 0, noSuchFile: 0, failed: 0};
  ran.forEach(h => {
    const e = h.err || "";
    if(/command not found/.test(e)) sig.notFound++;
    if(/Permission denied|Operation not permitted|unless you are root/.test(e)) sig.denied++;
    if(/No such file or directory/.test(e)) sig.noSuchFile++;
    if(h.code) sig.failed++;
  });
  return sig;
}

function labReport(li){
  const lec = COURSE[li];
  const solo = [], hinted = [], revealed = [];
  lec.tasks.forEach((task, ti) => {
    const k = ckey(li, ti);
    if(!S.lab[k]) return;
    if(S.reveals[k]) revealed.push({ti, task});
    else if(S.hints[k]) hinted.push({ti, task});
    else solo.push({ti, task});
  });
  return {kind:"lab", li, lec, solo, hinted, revealed,
          done: lecDone(li), total: lec.tasks.length, sig: terminalSignals(li)};
}

function quizReport(){
  const set = quizSetId(), quiz = activeQuiz();
  const missed = [], clean = [];
  quiz.forEach((tier, i) => {
    tier.items.forEach((item, j) => {
      const k = set + i + ":" + j;
      if(!S.qDone[k]) return;
      (S.qWrong[k] ? missed : clean).push({tier, item, i, j, wrong: S.qWrong[k] || 0});
    });
  });
  const perTier = quiz.map((tier, i) => {
    const total = tier.items.length;
    const done = tier.items.filter((_, j) => S.qDone[set + i + ":" + j]).length;
    const slips = tier.items.filter((_, j) => S.qWrong[set + i + ":" + j]).length;
    return {tier, i, total, done, slips};
  });
  return {kind:"quiz", quiz, missed, clean, perTier,
          done: clean.length + missed.length,
          total: quiz.reduce((n, tr) => n + tr.items.length, 0)};
}

/* ---------- advice earned by the signals ---------- */
function labAdvice(r){
  const out = [];
  const s = r.sig;
  // thresholds are low on purpose: two of the same error is already a pattern
  // worth naming, and this section should never come up empty
  if(s.notFound >= 2)  out.push({k:"adviceNotFound", n:s.notFound});
  if(s.denied >= 2)    out.push({k:"adviceDenied", n:s.denied});
  if(s.noSuchFile >= 2) out.push({k:"advicePaths", n:s.noSuchFile});
  if(r.revealed.length) out.push({k:"adviceReveals", n:r.revealed.length});
  else if(r.hinted.length) out.push({k:"adviceHintsOnly", n:r.hinted.length});
  else if(r.done === r.total) out.push({k:"adviceClean", n:r.total});
  if(s.total && s.failed / s.total > 0.4)
    out.push({k:"adviceReadErrors", n:Math.round(s.failed / s.total * 100)});

  // with nothing else to say, point at what comes next rather than padding
  if(!out.length){
    const next = COURSE[r.li + 1];
    out.push(next ? {k:"adviceNextLecture", tier:L(next.title)} : {k:"adviceLastLecture"});
  }
  return out;
}

function quizAdvice(r){
  const out = [];
  const weakest = r.perTier.filter(p => p.done).sort((a,b) => b.slips - a.slips)[0];
  if(weakest && weakest.slips >= 2) out.push({k:"adviceWeakTier", tier:L(weakest.tier.tier), n:weakest.slips});
  if(r.missed.length === 0 && r.done) out.push({k:"adviceQuizClean", n:r.done});
  else if(r.missed.length) out.push({k:"adviceQuizReview", n:r.missed.length});
  const repeats = r.missed.filter(m => m.wrong > 1).length;
  if(repeats) out.push({k:"adviceQuizRepeat", n:repeats});
  return out;
}

/* ---------- rendering ---------- */
// index.html already has a strip(); this one flattens task markup to plain text
const plain = s => esc(String(s).replace(/<[^>]+>/g, ""));

function reportHtml(r){
  const adv = r.kind === "lab" ? labAdvice(r) : quizAdvice(r);
  const pct = r.total ? Math.round(r.done / r.total * 100) : 0;
  const complete = r.done === r.total;

  let h = '<div class="report' + (complete ? " full" : "") + '">'+
    '<div class="rhead"><h2>' + t(complete ? "reportDone" : "reportProgress") + "</h2>"+
      '<div class="rscore"><b>' + r.done + "</b> / " + r.total + "<span>" + pct + "%</span></div>"+
      '<div class="rsub">' + (r.kind === "lab"
        ? esc("Vecka " + r.lec.wk + " · " + L(r.lec.title))
        : esc(L((activeCourse() || {title:""}).title))) + "</div></div>";

  const section = (title, note, body) =>
    '<div class="rsec"><h3>' + title + (note ? '<span>' + note + "</span>" : "") + "</h3>" + body + "</div>";
  const list = items => '<ul class="rlist">' + items.map(i => "<li>" + i + "</li>").join("") + "</ul>";

  if(r.kind === "lab"){
    if(r.solo.length)
      h += section(t("repSolo"), r.solo.length + "", list(r.solo.map(x => plain(x.task.q))));
    if(r.hinted.length)
      h += section(t("repHinted"), r.hinted.length + "",
        list(r.hinted.map(x => plain(x.task.q) + '<span class="rtake">' + plain(x.task.hint) + "</span>")));
    if(r.revealed.length)
      h += section(t("repRevealed"), r.revealed.length + "",
        list(r.revealed.map(x => plain(x.task.q) + '<span class="rtake">' + plain(x.task.hint) + "</span>")));
    const s = r.sig;
    if(s.total)
      h += section(t("repTerminal"), "",
        '<p class="rline">' + t("repRan").split("{n}").join(s.total) +
        (s.failed ? " · " + t("repFailed").split("{n}").join(s.failed) : "") + "</p>");
  } else {
    h += section(t("repBySection"), "",
      '<div class="rtiers">' + r.perTier.map(p =>
        '<div class="rtier"><span>' + esc(L(p.tier.tier)) + "</span>"+
        '<b class="' + (p.slips ? "warn" : "") + '">' + p.done + "/" + p.total +
        (p.slips ? " · " + t("repSlips").split("{n}").join(p.slips) : "") + "</b></div>").join("") + "</div>");
    if(r.missed.length)
      h += section(t("repMissed"), r.missed.length + "",
        list(r.missed.map(m => plain(L(m.item.q)) + '<span class="rtake">' + plain(L(m.item.e)) + "</span>")));
  }

  if(adv.length)
    h += section(t("repFocus"), "", list(adv.map(a =>
      t(a.k).split("{n}").join(a.n).split("{tier}").join(a.tier || ""))));

  h += '<div class="rnext">' + t("repNext") + "</div>";
  h += '<button class="tbtn rclose" id="rep-close">' + t("close") + "</button></div>";
  return h;
}

/* Panel above the content; shown on completion and via the button. */
function showReport(r){
  const host = r.kind === "lab" ? $("courseview") : $("quizview");
  if(!host) return;
  const old = host.querySelector(".report");
  if(old) old.remove();
  const box = document.createElement("div");
  box.innerHTML = reportHtml(r);
  const el = box.firstChild;
  host.insertBefore(el, host.firstChild);
  const close = $("rep-close");
  if(close) close.onclick = ()=>{ el.remove(); };
  el.scrollIntoView({block:"nearest", behavior: REDUCED ? "auto" : "smooth"});
}

function toggleLabReport(){ showReport(labReport(CS.lec)); }
function toggleQuizReport(){ showReport(quizReport()); }
