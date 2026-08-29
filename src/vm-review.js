/* ===================== preview: review queue =====================
   The reports already tell a student what went wrong. What they could not do is
   hand the material back. This does: every quiz question answered wrong, and
   every lab task where the answer was revealed, comes back one at a time.

   An item leaves the queue only by being answered correctly with no help, which
   is the whole point — clearing the list means something. */

function pvReviewItems(){
  const out = [];

  /* quiz questions missed here or in an exam */
  pvAllQuizzes().forEach(q => {
    const wrong = (S.qWrong[q.key] || 0) + (PV.extraWrong[q.key] || 0);
    if(wrong > 0) out.push({kind:"quiz", key:q.key, item:q.item, course:q.course, wrong});
  });

  /* lab tasks whose answer was revealed and not since recalled */
  if(typeof COURSE !== "undefined"){
    COURSE.forEach((lec, li) => lec.tasks.forEach((task, ti) => {
      const k = ckey(li, ti);
      if(S.reveals[k] && !PV.recalled[k])
        out.push({kind:"lab", key:k, task, lec, li, ti});
    }));
  }
  return out;
}

const PVR = {i: 0, picked: new Set(), checked: false, shown: false};

function pvRenderReview(){
  const v = pvView("pv-reviewview");
  const items = pvReviewItems();

  if(!items.length){
    v.innerHTML = '<div class="pvcard pvempty"><h2>' + t("pvReview") + "</h2>"+
      '<p class="pvlead">' + t("pvNothingLeft") + "</p></div>";
    return;
  }
  if(PVR.i >= items.length) PVR.i = 0;
  const it = items[PVR.i];

  /* built like the exam bar on purpose: same big count, same right-aligned
     position, so the two modes do not look like different products */
  const head = '<div class="pvbar">'+
      '<span class="pvclock">' + items.length + "</span>"+
      '<span class="pvprog">' + t("pvItemsLeft") + "</span>"+
      '<span class="pvprog pvright">' + (PVR.i+1) + " " + t("pvOf") + " " + items.length + "</span>"+
    "</div>"+
    '<p class="pvlead pvintro">' + t("pvReviewIntro") + "</p>";

  v.innerHTML = head + (it.kind === "quiz" ? pvReviewQuiz(it) : pvReviewLab(it));
  if(it.kind === "quiz") pvWireReviewQuiz(v, it, items); else pvWireReviewLab(v, it, items);
}

/* Quiz text is authored with <code> markup in it and the published quiz has
   always rendered it raw for that reason. Escaping it here showed the tags
   as literal text: "What is <code>/dev/null</code> used for?". The strings
   come from the site's own data, never from anything a user typed. */
function pvReviewQuiz(it){
  const checked = PVR.checked;
  const right = checked && pvIsRight(it.item, PVR.picked);
  return '<div class="pvcard">'+
    '<div class="pvmeta">' + esc(L(it.course)) + " · " +
      t("repSlips").split("{n}").join(it.wrong) + "</div>"+
    "<h2>" + L(it.item.q) + "</h2>"+
    '<div class="pvopts">' + it.item.o.map((o,i) => {
      const picked = PVR.picked.has(i);
      let cls = "qopt" + (picked ? " picked" : "");
      if(checked){ if(o.c) cls += " good"; else if(picked) cls += " bad"; }
      return '<button class="' + cls + '" data-o="' + i + '"' + (checked?" disabled":"") + ">"+
        '<span class="qbox"></span>' + L(o.t) + "</button>";
    }).join("") + "</div>"+
    (checked ? '<p class="pvexpl">' + L(it.item.e) + "</p>" : "")+
    '<div class="pvnav">'+
      (checked
        ? '<button class="nextbtn" id="pv-r-next">' + (right ? t("pvGotIt") : t("pvStillUnsure")) + " →</button>"
        : '<button class="nextbtn" id="pv-r-check">' + t("checkAnswer") + "</button>")+
      '<button class="ghost" id="pv-r-skip">' + t("skip") + " →</button>"+
    "</div></div>";
}

function pvWireReviewQuiz(v, it, items){
  v.querySelectorAll(".pvopts .qopt").forEach(b => b.onclick = () => {
    const i = +b.dataset.o;
    if(PVR.picked.has(i)) PVR.picked.delete(i); else PVR.picked.add(i);
    pvRenderReview();
  });
  const check = $("pv-r-check");
  if(check) check.onclick = () => {
    if(!PVR.picked.size) return;
    PVR.checked = true;
    pvRenderReview();
  };
  const next = $("pv-r-next");
  if(next) next.onclick = () => {
    if(pvIsRight(it.item, PVR.picked)){
      /* cleared: forget both the normal miss and any exam miss */
      delete S.qWrong[it.key];
      delete PV.extraWrong[it.key];
      S.qDone[it.key] = true;
      save(); pvSave();
    } else {
      PVR.i++;
    }
    PVR.picked = new Set(); PVR.checked = false;
    pvRenderReview();
  };
  $("pv-r-skip").onclick = () => {
    PVR.i++; PVR.picked = new Set(); PVR.checked = false;
    pvRenderReview();
  };
}

function pvReviewLab(it){
  return '<div class="pvcard">'+
    '<div class="pvmeta">' + t("pvFromLab") + " · " + esc("v" + it.lec.wk) + " " + esc(L(it.lec.title)) + "</div>"+
    "<h2>" + plain(it.task.q) + "</h2>"+
    (PVR.shown
      ? '<div class="pvreveal">' + (typeof answerHtml === "function"
          ? answerHtml(it.li, it.ti)
          : "<code>" + esc((LAB_ANSWERS[it.li]||[])[it.ti] || "") + "</code>") + "</div>"
      : '<p class="pvmuted">' + plain(it.task.hint) + "</p>")+
    '<div class="pvnav">'+
      (PVR.shown
        ? '<button class="nextbtn" id="pv-r-got">' + t("pvGotIt") + "</button>"+
          '<button class="ghost" id="pv-r-keep">' + t("pvStillUnsure") + "</button>"
        : '<button class="nextbtn" id="pv-r-show">' + t("pvShow") + "</button>"+
          '<button class="ghost" id="pv-r-skip">' + t("skip") + " →</button>")+
    "</div></div>";
}

function pvWireReviewLab(v, it, items){
  const show = $("pv-r-show");
  if(show) show.onclick = () => { PVR.shown = true; pvRenderReview(); };
  const skip = $("pv-r-skip");
  if(skip) skip.onclick = () => { PVR.i++; PVR.shown = false; pvRenderReview(); };
  const got = $("pv-r-got");
  if(got) got.onclick = () => {
    PV.recalled[it.key] = 1; pvSave();
    PVR.shown = false; pvRenderReview();
  };
  const keep = $("pv-r-keep");
  if(keep) keep.onclick = () => { PVR.i++; PVR.shown = false; pvRenderReview(); };
}
