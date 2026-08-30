/* ===================== preview: shared core =====================
   Everything under src/pv-*.js is spliced into preview.html only, so it can be
   tried on a real copy of the site without shipping it. These files build their
   own DOM and keep their own saved state under a separate storage key, which
   means preview.html stays a plain copy of index.html and nothing here can
   corrupt the progress the published site has already saved.

   Three additions live here:
     · Exam mode      — a timed mixed test, which is what week 42 is for
     · Review         — everything you got wrong or had to be shown, again
     · Progress       — one view of where you stand, plus backup/restore
*/

/* ---------- strings, in both languages like the rest of the site ---------- */
Object.assign(T, {
  pvExam:        {sv:"Tentaläge",            en:"Exam mode"},
  pvExamBlurb:   {sv:"Ett tidsbestämt prov med blandade frågor från alla kurser. "+
                     "Inga facit förrän du lämnat in.",
                  en:"A timed test with mixed questions from every course. "+
                     "No answers until you hand it in."},
  pvReview:      {sv:"Repetition",           en:"Review"},
  pvReviewBlurb: {sv:"Allt du svarat fel på eller behövt se svaret till, samlat på ett ställe.",
                  en:"Everything you got wrong or had to be shown, gathered in one place."},
  pvProgress:    {sv:"Överblick",            en:"Progress"},
  pvProgressBlurb:{sv:"Var du står i hela programmet, och säkerhetskopiering av dina framsteg.",
                  en:"Where you stand across the programme, and a backup of your progress."},

  pvStart:       {sv:"Starta",               en:"Start"},
  pvQuestions:   {sv:"frågor",               en:"questions"},
  pvMinutes:     {sv:"minuter",              en:"minutes"},
  pvHandIn:      {sv:"Lämna in",             en:"Hand in"},
  pvAbandon:     {sv:"Avbryt provet",        en:"Abandon test"},
  pvFlag:        {sv:"Markera",              en:"Flag"},
  pvFlagged:     {sv:"Markerad",             en:"Flagged"},
  pvUnanswered:  {sv:"obesvarade",           en:"unanswered"},
  pvTimeLeft:    {sv:"Tid kvar",             en:"Time left"},
  pvTimeUp:      {sv:"Tiden är ute — provet lämnades in automatiskt.",
                  en:"Time is up — the test was handed in for you."},
  pvOf:          {sv:"av",                   en:"of"},
  pvQuestion:    {sv:"Fråga",                en:"Question"},
  pvResult:      {sv:"Resultat",             en:"Result"},
  pvByCourse:    {sv:"Per kurs",             en:"By course"},
  pvYourAnswer:  {sv:"Ditt svar",            en:"Your answer"},
  pvCorrect:     {sv:"Rätt svar",            en:"Correct answer"},
  pvNothingLeft: {sv:"Inget att repetera just nu. Det är goda nyheter.",
                  en:"Nothing to review right now. That is good news."},
  pvReviewIntro: {sv:"Frågor du svarat fel på och labbuppgifter där du tog fram svaret. "+
                     "Får du rätt utan hjälp försvinner posten härifrån.",
                  en:"Questions you answered wrong and lab tasks where you revealed the answer. "+
                     "Get one right unaided and it leaves this list."},
  pvGotIt:       {sv:"Klarade den",          en:"Got it"},
  pvStillUnsure: {sv:"Behåll den",           en:"Keep it"},
  pvShow:        {sv:"Visa",                 en:"Show"},
  pvItemsLeft:   {sv:"kvar att repetera",    en:"left to review"},
  pvFromLab:     {sv:"Labb",                 en:"Lab"},
  pvExport:      {sv:"Spara till fil",       en:"Save to file"},
  pvImport:      {sv:"Återställ från fil",   en:"Restore from file"},
  pvBackupNote:  {sv:"Allt sparas bara i den här webbläsaren. Rensar du webbdata är det borta. "+
                     "Filen nedan är hela din historik och kan läsas in igen här eller på en annan dator.",
                  en:"Everything is saved only in this browser. Clear your site data and it is gone. "+
                     "The file below is your whole history and can be loaded back here or on another machine."},
  pvImported:    {sv:"Framsteg återställda.", en:"Progress restored."},
  pvImportBad:   {sv:"Den filen gick inte att läsa som en säkerhetskopia.",
                  en:"That file could not be read as a backup."},
  pvOverall:     {sv:"Totalt",               en:"Overall"},
  pvWeakest:     {sv:"Svagast just nu",      en:"Weakest right now"},
  pvNoData:      {sv:"Inget gjort än — börja var som helst och det dyker upp här.",
                  en:"Nothing done yet — start anywhere and it shows up here."},
  pvPastExams:   {sv:"Tidigare prov",        en:"Past tests"},
  pvNoExams:     {sv:"Inget prov gjort än.", en:"No test taken yet."},
  hwTitle:       {sv:"Datorns delar",         en:"Computer hardware"},
  hwHeading:     {sv:"Vad som sitter i lådan, och varför det spelar roll",
                  en:"What is in the box, and why it matters"},
  hwBlurb:       {sv:"Klicka runt på ett moderkort, se hur långsam en hårddisk egentligen är, och testa dig själv på 12 frågor.",
                  en:"Click around a motherboard, see how slow a hard disk really is, and test yourself on 12 questions."},
  hwIntro:       {sv:"Varje del har en uppgift, och nästan varje del har en säkerhetssida som sällan nämns i en vanlig hårdvarugenomgång. Klicka på en del i bilden för att läsa om den.",
                  en:"Every part has a job, and nearly every part has a security side that a normal hardware walkthrough leaves out. Click a part in the diagram to read about it."},
  hwClickAround: {sv:"Klicka på en del", en:"Click a part"},
  hwParts:       {sv:"delar",           en:"parts"},
  hwDiagramAlt:  {sv:"Schematisk bild av datorns delar",
                  en:"Schematic diagram of the parts of a computer"},
  hwWhyItMatters:{sv:"Säkerhetsvinkeln:", en:"The security angle:"},
  hwSpeedTitle:  {sv:"Hur långsamt är långsamt?", en:"How slow is slow?"},
  hwSpeedIntro:  {sv:"Skalan är logaritmisk — annars skulle sex av staplarna vara osynliga. Kolumnen längst till höger är samma väntetid omräknad så att en processortakt motsvarar en sekund.",
                  en:"The scale is logarithmic — otherwise six of these bars would be invisible. The right-hand column is the same wait, rescaled so that one processor tick is one second."},
  hwSpeedFoot:   {sv:"Det är därför program försöker hålla allt de använder ofta i RAM, och varför en SSD kändes som en ny dator.",
                  en:"This is why programs try to keep whatever they touch often in RAM, and why swapping in an SSD felt like a new computer."},
  pyTitle:       {sv:"Lär dig Python",       en:"Learn Python"},
  pyBlurb:       {sv:"Nio kapitel från noll: variabler, listor, loopar, funktioner och filer. Du skriver koden och kör den på riktigt.",
                  en:"Nine chapters from zero: variables, lists, loops, functions and files. You write the code and actually run it."},
  pyChapter:     {sv:"Kapitel",              en:"Chapter"},
  pyExercises:   {sv:"Övningar — koden körs på riktigt i rutan nedanför",
                  en:"Exercises — the code really runs in the box below"},
  pyExercise:    {sv:"övning",               en:"exercise"},
  pyRun:         {sv:"Kör koden",            en:"Run the code"},
  pyRunHint:     {sv:"eller Ctrl+Enter",     en:"or Ctrl+Enter"},
  pyResetCode:   {sv:"börja om",             en:"start over"},
  pyOutputHere:  {sv:"Utskriften hamnar här när du kört koden.",
                  en:"Whatever the program prints shows up here once you run it."},
  pyNoOutput:    {sv:"Programmet kördes men skrev inte ut något. Använd print().",
                  en:"The program ran but printed nothing. Use print()."},
  pyPassed:      {sv:"rätt svar",            en:"correct"},
  pyOpen:        {sv:"öppna",                en:"open"},
  pvNetLab:      {sv:"Nätverkslabb",        en:"Network lab"},
  pvNetTasks:    {sv:"Labb — terminalen nedan sitter på ett riktigt simulerat nät",
                  en:"Lab — the terminal below sits on a real simulated network"},
  pvNetMap:      {sv:"Nätverkskarta — ritad från maskinens eget tillstånd",
                  en:"Network map — drawn from the machine's own state"},
  pvTasksWord:   {sv:"uppgifter",             en:"tasks"},
  pvCheckSelf:   {sv:"Kolla dig själv — svaren är dolda tills du öppnar dem",
                  en:"Check yourself — answers are hidden until you open them"},
  pvResetMachine:{sv:"återställ maskinen",    en:"reset machine"},
  pvTypeCommand: {sv:"skriv ett kommando — prova ip a, nmap -sn 10.0.0.0/24",
                  en:"type a command — try ip a, nmap -sn 10.0.0.0/24"},
  pvNetBlurb:    {sv:"Kartlägg ett litet kontorsnät, hitta värden som inte hör hemma "+
                     "och stäng ute den med brandväggen.",
                  en:"Map a small office network, find the host that does not belong, "+
                     "and shut it out with the firewall."},
  pvPalPlaceholder:{sv:"Sök kurser, kommandon, uppgifter och frågor…",
                  en:"Search courses, commands, tasks and questions…"},
  pvPalNone:     {sv:"Inget matchade.",       en:"Nothing matched."},
  pvPalMove:     {sv:"flytta",                en:"move"},
  pvPalOpen:     {sv:"öppna",                 en:"open"},
  pvPalClose:    {sv:"stäng",                 en:"close"},
  pvKindEntry:   {sv:"kurs",                  en:"entry"},
  pvKindCmd:     {sv:"kommando",              en:"command"},
  pvKindDrill:   {sv:"övning",                en:"drill"},
  pvKindLab:     {sv:"labb",                  en:"lab"},
  pvKindQuiz:    {sv:"fråga",                 en:"quiz"},
  pvPalHint:     {sv:"Sök",                  en:"Search"},
  pvTiTitle:     {sv:"Vad som finns här", en:"What is on this site"},
  pvTiIntro:     {sv:"Allt nedan ligger bakom Menu-knappen. Du behöver ingen Linux-dator "+
                     "— allt körs i webbläsaren.",
                  en:"Everything below sits behind the Menu button. You do not need a Linux "+
                     "machine — it all runs in the browser."},
  pvTiStudy:     {sv:"Öva",                 en:"Practise"},
  pvTiTest:      {sv:"Testa dig själv",     en:"Test yourself"},
  pvTiTools:     {sv:"Verktyg",             en:"Tools"},
  pvTiLectures:  {sv:"föreläsningar",       en:"lectures"},
  pvTiLabDesc:   {sv:"{n} labbuppgifter som rättar sig själva mot en simulerad maskin",
                  en:"{n} lab tasks that check themselves against a simulated machine"},
  pvTiDrillTasks:{sv:"terminaluppgifter",   en:"terminal tasks"},
  pvTiDrillDesc: {sv:"{n} moduler, från pwd till SUID — välj Arch, Debian, Fedora eller SUSE",
                  en:"{n} modules, from pwd to SUID — pick Arch, Debian, Fedora or SUSE"},
  pvTiQuestions: {sv:"quizfrågor",          en:"quiz questions"},
  pvTiQuizDesc:  {sv:"över {n} kurser, var och en med en förklaring",
                  en:"across {n} courses, each one with an explanation"},
  pvTiNetTasks:  {sv:"nätverksuppgifter",   en:"network tasks"},
  pvTiNetDesc:   {sv:"ett riktigt simulerat nät: nmap, ufw, curl mot maskiner som svarar",
                  en:"a real simulated LAN: nmap, ufw, curl against hosts that answer"},
  pvTiExamDesc:  {sv:"tidsbestämt prov med blandade frågor, facit först när du lämnat in",
                  en:"a timed test of mixed questions, answers only once you hand it in"},
  pvTiReviewDesc:{sv:"allt du svarat fel på kommer tillbaka tills du klarar det",
                  en:"everything you got wrong comes back until you get it right"},
  pvTiReports:   {sv:"Rapporter",           en:"Reports"},
  pvTiReportsDesc:{sv:"efter varje labb och quiz: vad du klarade själv och vad du bör repetera",
                  en:"after each lab and quiz: what you did unaided and what to revisit"},
  pvTiProgressDesc:{sv:"var du står i hela programmet, och säkerhetskopiering till fil",
                  en:"where you stand across the programme, and a backup to file"},
  pvTiMachine:   {sv:"Simulerad maskin",    en:"Simulated machine"},
  pvTiMachineDesc:{sv:"riktiga rättigheter, pipes, paket och en liten Python — inget kan gå sönder",
                  en:"real permissions, pipes, packages and a small Python — nothing can break"},
  pvTiSheet:     {sv:"Fusklapp",            en:"Cheatsheet"},
  pvTiSheetDesc: {sv:"varje kommando i kursen, sökbart, öppet bredvid dig medan du jobbar",
                  en:"every command in the course, filterable, open beside you as you work"},
  pvTiSearchDesc:{sv:"sök bland kurser, kommandon, uppgifter och frågor och hoppa dit",
                  en:"search courses, commands, tasks and questions, and jump straight there"},
  pvTiLangDesc:  {sv:"byt språk när som helst",  en:"switch language at any time"},
  pvTiFoot:      {sv:"Framstegen sparas i den här webbläsaren. Resten av rundturen visar "+
                     "hur en uppgift fungerar.",
                  en:"Progress is saved in this browser. The rest of the tour shows how a "+
                     "task works."},
});

/* ---------- preview-only saved state, kept away from the real one ---------- */
const PV = {
  exam: null,        // the test in progress, if any
  examLog: [],       // {when, score, total, perCourse}
  extraWrong: {},    // quiz keys missed in an exam, so review picks them up
  recalled: {},      // lab reveals the student has since recalled unaided
};

async function pvSave(){
  try{ await store.set("shelldrill:pv1", JSON.stringify(
    {examLog: PV.examLog, extraWrong: PV.extraWrong, recalled: PV.recalled})); }
  catch(e){ /* same best-effort contract as the main save */ }
}
async function pvLoad(){
  try{ const r = await store.get("shelldrill:pv1");
    if(r && r.value){ const d = JSON.parse(r.value);
      PV.examLog   = Array.isArray(d.examLog) ? d.examLog : [];
      PV.extraWrong = d.extraWrong || {};
      PV.recalled  = d.recalled || {};
    }
  }catch(e){}
}

/* ---------- every quiz on the site, flattened and addressable ----------
   Keys match the ones the site already writes into S.qDone / S.qWrong, so a
   question missed in the normal quiz and one missed in an exam are the same
   thing to the review queue. */
function pvAllQuizzes(){
  const out = [];
  const push = (setId, quiz, courseTitle) => {
    quiz.forEach((tier, i) => tier.items.forEach((item, j) => {
      out.push({key: setId + i + ":" + j, item, tier, course: courseTitle, setId});
    }));
  };
  push("", QUIZ, {sv:"Linux", en:"Linux"});
  if(typeof COURSE_QUIZZES !== "undefined"){
    for(const id in COURSE_QUIZZES){
      const c = (typeof courseById === "function") && courseById(id);
      push(id + ":", COURSE_QUIZZES[id], c ? c.title : {sv:id, en:id});
    }
  }
  return out;
}

/* correct answers are stored per option, so an answer is right only when the
   picked set is exactly the correct set — same rule the normal quiz uses */
function pvIsRight(item, picked){
  const want = item.o.map((o,i)=>o.c?i:-1).filter(i=>i>=0);
  return want.length === picked.size && want.every(i => picked.has(i));
}

/* ---------- view plumbing ----------
   The published page knows three modes. These add two more without touching
   setMode itself: the wrapper handles its own and delegates everything else. */
const PV_MODES = ["exam", "review", "progress", "netlab", "python", "hardware"];
const PV_LABEL = {exam:"pvExam", review:"pvReview", progress:"pvProgress", netlab:"pvNetLab", python:"pyTitle", hardware:"hwTitle"};
let pvWrapped = false;

function pvView(id){
  let el = document.getElementById(id);
  if(!el){
    el = document.createElement("section");
    el.id = id; el.style.display = "none";
    document.querySelector("main").appendChild(el);
  }
  return el;
}

/* The sidebar belongs to whichever mode is showing: the drill's module list and
   its solved/accuracy/streak counters mean nothing in an exam or on the network
   lab, so each preview mode fills it or empties it. */
function pvSidebar(mode){
  const list = $("modlist"), stats = document.querySelector(".stats");
  if(!list) return;
  list.innerHTML = "";
    /* the drill's solved/accuracy/streak counters mean nothing in these views */
    if(stats) stats.style.display =
      (mode === "netlab" || mode === "exam" || mode === "python" ||
       mode === "hardware") ? "none" : "";

  if(mode === "netlab"){
    NETLAB.tasks.forEach((task, i) => {
      const b = document.createElement("button");
      b.className = "mod" + (NL.done[i] ? " isnow" : "");
      b.innerHTML = '<span class="n">' + String(i+1).padStart(2,"0") + "</span>"+
        '<span class="mlong">' + esc(plain(L(task.q)).slice(0, 42)) + "</span>"+
        '<span class="done">' + (NL.done[i] ? "done" : "") + "</span>";
      b.onclick = () => { const el = document.querySelectorAll("#pv-netlabview .ltask")[i];
        if(el) el.scrollIntoView({block:"center"}); };
      list.appendChild(b);
    });
    return;
  }
  if(mode === "hardware"){
    HWPARTS.forEach((part, i) => {
      const b = document.createElement("button");
      b.className = "mod" + (part.id === HW.part ? " isnow" : "");
      b.setAttribute("aria-current", String(part.id === HW.part));
      b.innerHTML = '<span class="n">' + String(i+1).padStart(2,"0") + "</span>"+
        '<span class="mlong">' + esc(L(part.name)) + "</span>";
      b.onclick = () => { HW.part = part.id; pvRenderHardware(); pvSidebar("hardware"); };
      list.appendChild(b);
    });
    return;
  }
  if(mode === "python"){
    PYLAB.forEach((ch, i) => {
      const b = document.createElement("button");
      const n = pyChapterDone(i);
      b.className = "mod" + (i === PY.ch ? " isnow" : "");
      b.setAttribute("aria-current", String(i === PY.ch));
      b.innerHTML = '<span class="n">' + String(i+1).padStart(2,"0") + "</span>"+
        '<span class="mlong">' + esc(L(ch.title)) + "</span>"+
        '<span class="done">' + n + "/" + ch.ex.length + "</span>";
      b.onclick = () => pySelect(i, 0);
      list.appendChild(b);
    });
    return;
  }
  if(mode === "exam" && PV.exam && !PV.exam.done){
    PV.exam.qs.forEach((q, i) => {
      const b = document.createElement("button");
      b.className = "mod";
      b.setAttribute("aria-current", String(i === PV.exam.i));
      b.innerHTML = '<span class="n">' + String(i+1).padStart(2,"0") + "</span>"+
        '<span class="mlong">' + esc(L(q.course)) + "</span>"+
        '<span class="done">' + (q.picked.length ? "·" : "") + "</span>";
      b.onclick = () => { PV.exam.i = i; pvRenderExam(); pvSidebar("exam"); };
      list.appendChild(b);
    });
  }
}

function pvHideAll(){
  PV_MODES.forEach(m => { const v = document.getElementById("pv-" + m + "view");
    if(v) v.style.display = "none"; });
}

function pvInit(){
  if(pvWrapped) return;
  pvWrapped = true;

  PV_MODES.forEach(m => pvView("pv-" + m + "view"));

  /* Ctrl+K is worth nothing if nobody knows it is there, so the header carries
     a button that opens the same thing. It sits next to the cheatsheet because
     that is where you look when you are trying to find something. */
  if(!document.getElementById("pv-palbtn")){
    const b = document.createElement("button");
    b.className = "refbtn"; b.id = "pv-palbtn";
    b.textContent = t("pvPalHint");
    b.onclick = pvPaletteOpen;
    const ref = $("openref");
    if(ref && ref.parentNode) ref.parentNode.insertBefore(b, ref);
  }

  /* a tab button per mode, sitting with the existing ones */
  const modes = document.querySelector(".modes");
  PV_MODES.forEach(m => {
    if(document.getElementById("m-" + m)) return;
    const b = document.createElement("button");
    b.className = "pill"; b.id = "m-" + m; b.setAttribute("aria-pressed", "false");
    b.style.display = "none";
    b.onclick = () => setMode(m);
    modes.appendChild(b);
  });

  const inner = window.setMode;
  window.setMode = function(m){
    if(PV_MODES.includes(m)){
      S.mode = m;
      ["guide","brief","after"].forEach(id => { const e = $(id); if(e) e.style.display = "none"; });
      const term = document.querySelector(".term"); if(term) term.style.display = "none";
      $("quizview").style.display = "none";
      $("courseview").style.display = "none";
      pvHideAll();
      pvView("pv-" + m + "view").style.display = "";
      ["drill","quiz","course"].concat(PV_MODES).forEach(x => {
        const b = $("m-" + x); if(b) b.setAttribute("aria-pressed", String(x === m)); });
      $("sectlabel").textContent = t(PV_LABEL[m]);
      pvSidebar(m);
      ({exam: pvRenderExam, review: pvRenderReview,
        progress: pvRenderProgress, netlab: pvRenderNetlab,
        python: pvRenderPython, hardware: pvRenderHardware})[m]();
      if(typeof transitionView === "function") transitionView();
      save();
      return;
    }
    pvHideAll();
    const st = document.querySelector(".stats");
    if(st) st.style.display = "";
    inner(m);
  };

  /* the new entries only make sense once they are in the menu */
  const tools = PROGRAMME.tools;
  const add = (id, mode, title, blurb) => {
    if(tools.some(x => x.id === id)) return;
    tools.push({id, title, blurb, ready:true, modes:[mode], entry:mode, preview:true});
  };
  add("pv-exam",     "exam",     t("pvExam"),     T.pvExamBlurb);
  add("pv-review",   "review",   t("pvReview"),   T.pvReviewBlurb);
  add("pv-progress", "progress", t("pvProgress"), T.pvProgressBlurb);
  add("pv-netlab",   "netlab",   t("pvNetLab"),   T.pvNetBlurb);
  add("pv-python",   "python",   t("pyTitle"),    T.pyBlurb);
  /* two modes on purpose: its own diagrams, plus the ordinary quiz view, so
     the questions reach exam mode and the review queue without a second copy
     of the quiz machinery */
  if(!tools.some(x => x.id === "pv-hardware"))
    tools.push({id:"pv-hardware", title:t("hwTitle"), blurb:T.hwBlurb, ready:true,
                modes:["hardware","quiz"], entry:"hardware", preview:true});

  /* enterCourse only knows the three published tabs; show ours and hide the
     others when one of these entries is the destination */
  const enter = window.enterCourse;
  window.enterCourse = function(id){
    const c = courseById(id);
    enter(id);
    if(c && c.modes && PV_MODES.includes(c.modes[0])){
      /* Show a tab for every mode the entry declares, not only the first. An
         entry can mix one of these views with a published one — the hardware
         tool offers its diagrams AND the ordinary quiz view, which is what lets
         it reuse the quiz machinery instead of growing a second copy. */
      ["drill","quiz","course"].forEach(x => { const b = $("m-"+x);
        if(b) b.style.display = c.modes.includes(x) ? "" : "none"; });
      PV_MODES.forEach(x => { const b = $("m-"+x);
        if(b){ b.style.display = c.modes.includes(x) ? "" : "none";
               b.textContent = t(PV_LABEL[x]); } });
      $("distro").style.display = "none";
      $("openref").style.display = "none";
      setMode(c.modes[0]);
    } else {
      PV_MODES.forEach(x => { const b = $("m-"+x); if(b) b.style.display = "none"; });
    }
  };

  /* keep the tab labels honest when the language changes */
  const sl = window.setLang;
  if(typeof sl === "function"){
    window.setLang = function(l){
      sl(l);
      PV_MODES.forEach(x => { const b = $("m-"+x);
        if(b) b.textContent = t(PV_LABEL[x]); });
      pvIndex = null;   // labels are cached in the index; rebuild in the new language
      const c = activeCourse();
      if(c && c.modes && PV_MODES.includes(c.modes[0])) setMode(c.modes[0]);
    };
  }
}

/* the boot sequence runs before this file can wrap anything, so pick up what
   it decided once it has finished. Guarded: the node suites load this file. */
if(typeof document !== "undefined") pvLoad().then(() => {
  const go = () => {
    pvInit();
    if(PV_MODES.includes(S.mode)){
      const c = activeCourse();
      if(c && c.modes && PV_MODES.includes(c.modes[0])) enterCourse(c.id); else setMode("drill");
    }
  };
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => setTimeout(go, 0));
  else setTimeout(go, 0);
});
