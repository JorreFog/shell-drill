/* ===================== preview: exam mode =====================
   Week 42 of the schedule is "Repetition och tentaförberedelse", and nothing on
   the site practises the thing an exam actually tests: recall across the whole
   programme, under time, with no feedback until the end. The normal quiz tells
   you immediately whether you were right, which is good for learning and
   useless as rehearsal.

   Questions are drawn across every quiz set, so a test mixes Linux with the
   course material rather than staying in one topic. */

const PV_EXAM_SIZES = [10, 20, 30];
const PV_EXAM_MINUTES = {10: 10, 20: 20, 30: 30};

/* Deterministic shuffle from a seed, so a test is described by its seed alone
   and Math.random stays out of saved state.

   The index is taken from the HIGH bits of the generator, not with s % (i+1).
   A linear congruential generator modulo 2^32 has famously poor low bits — the
   lowest bit alternates, the low k bits repeat every 2^k — so the modulo form
   biased the draw badly: measured over 4000 runs it returned a mean of 8.8
   Linux questions per 20 where 6.42 was expected, and as many as 15. */
function pvShuffle(list, seed){
  const a = list.slice();
  let s = seed >>> 0;
  for(let i = a.length - 1; i > 0; i--){
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = Math.floor((s / 4294967296) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* An unbiased draw still leaves the Linux set at 32% of the pool, because it
   holds 34 questions against 8 for each course — so a "mixed" test came out a
   third Linux. Draw round-robin across the courses instead: every course is
   represented before any course is drawn from twice, which is what makes it a
   test of the programme rather than a test of Linux. */
function pvDraw(pool, n, seed){
  const groups = new Map();
  pool.forEach(q => {
    const k = q.setId || "";
    if(!groups.has(k)) groups.set(k, []);
    groups.get(k).push(q);
  });
  const decks = pvShuffle([...groups.keys()], seed ^ 0x5bf03635)
    .map((k, i) => pvShuffle(groups.get(k), seed + i * 7919));
  const out = [];
  for(let round = 0; out.length < n; round++){
    let took = 0;
    for(const deck of decks){
      if(out.length >= n) break;
      if(deck.length > round){ out.push(deck[round]); took++; }
    }
    if(!took) break;   // every deck exhausted
  }
  return pvShuffle(out, seed ^ 0x2545f491).slice(0, n);
}
function pvStartExam(n){
  const pool = pvAllQuizzes();
  const seed = Date.now() & 0x7fffffff;
  const picked = pvDraw(pool, Math.min(n, pool.length), seed);
  PV.exam = {
    n: picked.length,
    minutes: PV_EXAM_MINUTES[n] || n,
    endsAt: Date.now() + (PV_EXAM_MINUTES[n] || n) * 60000,
    i: 0,
    qs: picked.map(q => ({key:q.key, item:q.item, course:q.course, picked:[], flagged:false})),
    done: false,
  };
  pvRenderExam();
  pvTick();
}

let pvTimer = null;
function pvTick(){
  clearInterval(pvTimer);
  pvTimer = setInterval(() => {
    const e = PV.exam;
    if(!e || e.done){ clearInterval(pvTimer); return; }
    const left = e.endsAt - Date.now();
    const el = document.getElementById("pv-clock");
    if(el) el.textContent = pvClock(left);
    if(left <= 0){ clearInterval(pvTimer); pvFinishExam(true); }
  }, 500);
}

function pvClock(ms){
  if(ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  return String(Math.floor(s / 60)).padStart(2,"0") + ":" + String(s % 60).padStart(2,"0");
}

function pvFinishExam(timedOut){
  const e = PV.exam;
  if(!e || e.done) return;
  e.done = true;
  e.timedOut = !!timedOut;
  clearInterval(pvTimer);

  const perCourse = {};
  let score = 0;
  e.qs.forEach(q => {
    const right = pvIsRight(q.item, new Set(q.picked));
    q.right = right;
    if(right) score++;
    else PV.extraWrong[q.key] = (PV.extraWrong[q.key] || 0) + 1;
    const name = L(q.course);
    perCourse[name] = perCourse[name] || {done:0, total:0};
    perCourse[name].total++;
    if(right) perCourse[name].done++;
  });
  e.score = score;
  PV.examLog.unshift({when: new Date().toISOString().slice(0,16).replace("T"," "),
                      score, total: e.n, perCourse});
  PV.examLog = PV.examLog.slice(0, 10);
  pvSave();
  pvRenderExam();
}

/* Quiz text is authored with <code> markup in it and the published quiz has
   always rendered it raw for that reason. Escaping it here showed the tags
   as literal text: "What is <code>/dev/null</code> used for?". The strings
   come from the site's own data, never from anything a user typed. */
function pvRenderExam(){
  const v = pvView("pv-examview");
  const e = PV.exam;

  if(!e){
    v.innerHTML = '<div class="pvcard"><h2>' + t("pvExam") + "</h2>"+
      '<p class="pvlead">' + t("pvExamBlurb") + "</p>"+
      '<div class="pvsizes">' + PV_EXAM_SIZES.map(n =>
        '<button class="pvsize" data-n="' + n + '"><b>' + n + "</b><span>" + t("pvQuestions") +
        "</span><em>" + (PV_EXAM_MINUTES[n]) + " " + t("pvMinutes") + "</em></button>").join("") + "</div>"+
      pvExamLogHtml() + "</div>";
    v.querySelectorAll(".pvsize").forEach(b =>
      b.onclick = () => pvStartExam(+b.dataset.n));
    return;
  }

  if(e.done){ v.innerHTML = pvExamResultHtml(e); pvWireResult(v, e); return; }

  const q = e.qs[e.i];
  const answered = e.qs.filter(x => x.picked.length).length;
  v.innerHTML =
    '<div class="pvbar">'+
      '<span class="pvclock" id="pv-clock">' + pvClock(e.endsAt - Date.now()) + "</span>"+
      '<span class="pvprog">' + t("pvQuestion") + " " + (e.i+1) + " " + t("pvOf") + " " + e.n +
        " · " + (e.n - answered) + " " + t("pvUnanswered") + "</span>"+
      '<button class="tbtn" id="pv-handin">' + t("pvHandIn") + "</button>"+
    "</div>"+
    '<div class="pvgrid">' + e.qs.map((x,i) =>
      '<button class="pvdot' + (i===e.i?" now":"") + (x.picked.length?" ans":"") +
      (x.flagged?" flag":"") + '" data-i="' + i + '">' + (i+1) + "</button>").join("") + "</div>"+
    '<div class="pvcard">'+
      '<div class="pvmeta">' + esc(L(q.course)) + "</div>"+
      "<h2>" + L(q.item.q) + "</h2>"+
      /* the same classes and inner markup the published quiz uses: .on for a
         selected option, .box for the tick, .txt for the label. This built
         its own names, none of which the stylesheet knows, so clicking an
         option registered but showed nothing at all. */
      '<div class="pvopts">' + q.item.o.map((o,i) => {
        const on = q.picked.includes(i);
        return '<button class="qopt' + (on ? " on" : "") + '" data-o="' + i +
          '" aria-pressed="' + on + '">'+
          '<span class="box" aria-hidden="true"></span>'+
          '<span class="txt">' + L(o.t) + "</span></button>";
      }).join("") + "</div>"+
      '<div class="pvnav">'+
        '<button class="ghost" id="pv-prev"' + (e.i===0?" disabled":"") + ">← " + t("previous") + "</button>"+
        '<button class="ghost" id="pv-flag">' + (q.flagged ? t("pvFlagged") : t("pvFlag")) + "</button>"+
        '<button class="nextbtn" id="pv-next">' + (e.i===e.n-1 ? t("pvHandIn") : t("skip") + " →") + "</button>"+
      "</div>"+
    "</div>";

  v.querySelectorAll(".pvopts .qopt").forEach(b => b.onclick = () => {
    const i = +b.dataset.o, at = q.picked.indexOf(i);
    if(at >= 0) q.picked.splice(at,1); else q.picked.push(i);
    pvRenderExam();
  });
  v.querySelectorAll(".pvdot").forEach(b => b.onclick = () => { e.i = +b.dataset.i; pvRenderExam(); });
  if(typeof pvSidebar === "function") pvSidebar("exam");
  $("pv-prev").onclick = () => { if(e.i>0){ e.i--; pvRenderExam(); } };
  $("pv-flag").onclick = () => { q.flagged = !q.flagged; pvRenderExam(); };
  $("pv-next").onclick = () => { if(e.i < e.n-1){ e.i++; pvRenderExam(); } else pvConfirmHandIn(); };
  $("pv-handin").onclick = pvConfirmHandIn;
}

function pvConfirmHandIn(){
  const e = PV.exam;
  const left = e.qs.filter(x => !x.picked.length).length;
  confirmDialog({
    title: t("pvHandIn") + "?",
    body: left ? "<p>" + left + " " + t("pvUnanswered") + ".</p>" : "<p>" + t("pvHandIn") + "?</p>",
    confirmLabel: t("pvHandIn"),
    onConfirm: () => pvFinishExam(false),
  });
}

function pvExamResultHtml(e){
  const pct = Math.round(e.score / e.n * 100);
  const missed = e.qs.filter(q => !q.right);
  const perCourse = {};
  e.qs.forEach(q => { const n = L(q.course);
    perCourse[n] = perCourse[n] || {done:0,total:0};
    perCourse[n].total++; if(q.right) perCourse[n].done++; });

  return '<div class="report' + (pct===100?" full":"") + '">'+
    '<div class="rhead"><h2>' + t("pvResult") + "</h2>"+
      '<div class="rscore"><b>' + e.score + "</b> / " + e.n + "<span>" + pct + "%</span></div>"+
      (e.timedOut ? '<div class="rsub">' + t("pvTimeUp") + "</div>" : "") + "</div>"+
    '<div class="rsec"><h3>' + t("pvByCourse") + "</h3><div class=\"rtiers\">"+
      Object.entries(perCourse).map(([name,p]) =>
        '<div class="rtier"><span>' + esc(name) + "</span>"+
        '<b class="' + (p.done < p.total ? "warn" : "") + '">' + p.done + "/" + p.total + "</b></div>").join("")+
    "</div></div>"+
    (missed.length ? '<div class="rsec"><h3>' + t("repMissed") + "<span>" + missed.length + "</span></h3>"+
      '<ul class="rlist">' + missed.map(q =>
        "<li>" + L(q.item.q) +
        '<span class="rtake">' + L(q.item.e) + "</span>"+
        '<span class="rtake pvans">' + t("pvCorrect") + ": " +
          q.item.o.filter(o=>o.c).map(o=>L(o.t)).join(" · ") + "</span></li>").join("") + "</ul></div>" : "")+
    '<div class="pvnav"><button class="nextbtn" id="pv-again">' + t("pvExam") + " →</button>"+
      '<button class="tbtn" id="pv-toreview">' + t("pvReview") + "</button></div>"+
  "</div>";
}

function pvWireResult(v, e){
  $("pv-again").onclick = () => { PV.exam = null; pvRenderExam(); };
  $("pv-toreview").onclick = () => { PV.exam = null; enterCourse("pv-review"); };
}

function pvExamLogHtml(){
  if(!PV.examLog.length) return '<p class="pvmuted">' + t("pvNoExams") + "</p>";
  return '<div class="pvlog"><h3>' + t("pvPastExams") + "</h3>"+
    PV.examLog.map(r => '<div class="pvlogrow"><span>' + esc(r.when) + "</span>"+
      "<b>" + r.score + "/" + r.total + "</b>"+
      "<em>" + Math.round(r.score/r.total*100) + "%</em></div>").join("") + "</div>";
}
