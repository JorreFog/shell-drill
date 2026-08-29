/* ===================== preview: the tutorial's opening step =====================
   The tour used to start by explaining the task panel, which only makes sense
   if you already know what the site is. This puts a contents page first: every
   feature, grouped, with the numbers that say how much of each there is.

   The step is defined with getters rather than fixed strings so that switching
   language re-reads it — showStep() pulls .t and .b fresh on every render. */

function pvTourGroups(){
  const n = {
    courses: PROGRAMME.courses.filter(c => c.ready).length,
    labs: (typeof COURSE !== "undefined") ? COURSE.reduce((a,l) => a + l.tasks.length, 0) : 0,
    lectures: (typeof COURSE !== "undefined") ? COURSE.length : 0,
    drill: (typeof MODULES !== "undefined") ? MODULES.reduce((a,m) => a + m.tasks.length, 0) : 0,
    modules: (typeof MODULES !== "undefined") ? MODULES.length : 0,
    quiz: (typeof QUIZ !== "undefined") ? QUIZ.reduce((a,t) => a + t.items.length, 0) : 0,
    provisional: (typeof COURSE_QUIZZES !== "undefined")
      ? Object.values(COURSE_QUIZZES).reduce((a,q) => a + q.reduce((b,t) => b + t.items.length, 0), 0) : 0,
    net: (typeof NETLAB !== "undefined") ? NETLAB.tasks.length : 0,
  };

  return [
    {k:"study", items:[
      {n: n.lectures + " " + L(T.pvTiLectures), d: L(T.pvTiLabDesc).replace("{n}", n.labs)},
      {n: n.drill + " " + L(T.pvTiDrillTasks), d: L(T.pvTiDrillDesc).replace("{n}", n.modules)},
      {n: (n.quiz + n.provisional) + " " + L(T.pvTiQuestions), d: L(T.pvTiQuizDesc).replace("{n}", n.courses)},
      {n: n.net + " " + L(T.pvTiNetTasks), d: L(T.pvTiNetDesc)},
    ]},
    {k:"test", items:[
      {n: L(T.pvExam), d: L(T.pvTiExamDesc)},
      {n: L(T.pvReview), d: L(T.pvTiReviewDesc)},
      {n: L(T.pvTiReports), d: L(T.pvTiReportsDesc)},
      {n: L(T.pvProgress), d: L(T.pvTiProgressDesc)},
    ]},
    {k:"tools", items:[
      {n: L(T.pvTiMachine), d: L(T.pvTiMachineDesc)},
      {n: L(T.pvTiSheet), d: L(T.pvTiSheetDesc)},
      {n: "Ctrl+K", d: L(T.pvTiSearchDesc)},
      {n: "SV / EN", d: L(T.pvTiLangDesc)},
    ]},
  ];
}

function pvTourListHtml(){
  const heads = {study:"pvTiStudy", test:"pvTiTest", tools:"pvTiTools"};
  return '<div id="pv-tourlist" class="pvtl">'+
    '<p class="pvtlintro">' + t("pvTiIntro") + "</p>"+
    pvTourGroups().map(g =>
      '<div class="pvtlgroup"><h4>' + t(heads[g.k]) + "</h4>"+
      g.items.map(it =>
        '<div class="pvtlrow"><b>' + esc(it.n) + "</b><span>" + esc(it.d) + "</span></div>").join("")+
      "</div>").join("")+
    '<p class="pvtlfoot">' + t("pvTiFoot") + "</p></div>";
}

/* put it first, and target a control that is on screen in every mode so the
   tour's own skip-hidden-steps rule never drops it */
if(typeof TOUR !== "undefined"){
  TOUR.unshift({
    el: "tomenu",
    get t(){ return t("pvTiTitle"); },
    get b(){ return pvTourListHtml(); },
  });
}

/* The card is sized for a paragraph; this step is a table of contents. showStep
   does not know about per-step widths, so widen it whenever the list is what it
   just rendered — detectable from the DOM without reaching into the tour's own
   private step counter. */
if(typeof showStep === "function"){
  const _showStep = showStep;
  window.showStep = function(dir){
    _showStep(dir);
    const card = document.getElementById("tourcard");
    if(card) card.classList.toggle("wide", !!card.querySelector("#pv-tourlist"));
  };
}
