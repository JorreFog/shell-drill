/* =================== language ===================
   Two languages, one switch. Content is written as {sv, en}; L() picks the
   active one and passes plain strings straight through, which is how the
   older English-only material keeps working untouched.

   Translated so far: the whole interface, and the nine provisional course
   quizzes. The original Linux material — drill tasks, knowledge quiz, course
   labs, cheatsheet — is English only, and the menu says so in Swedish mode. */
const LANGS = {sv:"Svenska", en:"English"};

function L(v){
  if(v == null) return "";
  if(typeof v === "string") return v;
  return v[S.lang] != null ? v[S.lang] : (v.en != null ? v.en : v.sv);
}

const T = {
  /* The site started as a Linux shell drill and grew into practice material for
     the whole programme, so the name follows the subject rather than the shell.
     Change these two lines to rename it. */
  brandA:          {sv:"säk",               en:"sec"},
  brandB:          {sv:"labb",              en:"lab"},
  docTitle:        {sv:"Säk·labb — övningsmaterial för IT-säkerhetsanalytiker ITA26D",
                    en:"Sec·lab — practice material for IT-säkerhetsanalytiker ITA26D"},

  menu:            {sv:"Meny",              en:"Menu"},
  menuTitle:       {sv:"Tillbaka till kurser och verktyg", en:"Back to courses and tools"},
  cheatsheet:      {sv:"Fusklapp",          en:"Cheatsheet"},
  tutorial:        {sv:"Genomgång",         en:"Tutorial"},
  drillTab:        {sv:"Terminalövning",    en:"Terminal drill"},
  quizTab:         {sv:"Kunskapsquiz",      en:"Knowledge quiz"},
  distro:          {sv:"Distribution",      en:"Distro"},
  modules:         {sv:"Moduler",           en:"Modules"},
  quizSections:    {sv:"Quizavsnitt",       en:"Quiz sections"},
  courseWeeks:     {sv:"Kursveckor",        en:"Course weeks"},
  solved:          {sv:"klara",             en:"solved"},
  accuracy:        {sv:"träffsäkerhet",     en:"accuracy"},
  streak:          {sv:"i rad",             en:"streak"},
  resetProgress:   {sv:"nollställ framsteg", en:"reset progress"},

  /* the menu */
  programmeSub:    {sv:"Yrkeshögskola · övningsmaterial för kurserna",
                    en:"Yrkeshögskola · practice material for the taught courses"},
  sectionCourses:  {sv:"Kurser",            en:"Courses"},
  sectionCoursesNote:{sv:"programmet, i ordning", en:"the programme, in order"},
  sectionTools:    {sv:"Verktyg",           en:"Tools"},
  sectionToolsNote:{sv:"övning på egen hand, när som helst", en:"practice on its own, any time"},
  cardOpen:        {sv:"öppna →",           en:"open →"},
  cardSoon:        {sv:"kommer",            en:"soon"},
  cardProvisional: {sv:"preliminär",        en:"provisional"},
  cardNoMaterial:  {sv:"Inget material än — den öppnas när kursen börjar.",
                    en:"No material yet — this opens when the course starts."},
  englishOnly:     {sv:"Materialet i den här kursen finns bara på engelska.",
                    en:""},
  pickerFoot:      {sv:"Kurser utan material är platshållare och öppnas när innehållet finns. "+
                       "LIA, examensarbete och kompetensportfölj saknas — praktik, examensarbete "+
                       "och portföljarbete går inte att öva på här.",
                    en:"Courses without material yet are placeholders and open once the content "+
                       "exists. LIA, examensarbete and kompetensportfölj are not listed — placement, "+
                       "thesis and portfolio work have nothing to practise here."},

  /* provisional notice */
  provTitle:       {sv:"Preliminära frågor",  en:"Provisional questions"},
  provBody:        {sv:"Det finns ännu inget kursmaterial för den här kursen. Frågorna nedan är "+
                       "skrivna utifrån kursens namn och vad en sådan kurs brukar innehålla — de "+
                       "kan alltså skilja sig från vad kursen faktiskt tar upp. Använd dem som "+
                       "träning, inte som facit.",
                    en:"There is no course material for this course yet. The questions below were "+
                       "written from the course title and what such a course usually covers, so "+
                       "they may differ from what it actually teaches. Treat them as practice, "+
                       "not as a syllabus."},

  /* quiz */
  question:        {sv:"Fråga",             en:"Question"},
  selectAll:       {sv:"markera alla som stämmer", en:"select all that apply"},
  answered:        {sv:"besvarad",          en:"answered"},
  checkAnswer:     {sv:"Rätta svaret",      en:"Check answer"},
  correct:         {sv:"Rätt",              en:"Correct"},
  notQuite:        {sv:"Inte riktigt",      en:"Not quite"},
  nextQuestion:    {sv:"Nästa fråga →",     en:"Next question →"},
  previous:        {sv:"← Föregående",      en:"← Previous"},
  skip:            {sv:"Hoppa över →",      en:"Skip →"},
  quizComplete:    {sv:"Quiz klart",        en:"Quiz complete"},
  answeredCorrectly:{sv:"rätt besvarade",   en:"answered correctly"},
  startOver:       {sv:"Börja om",          en:"Start over"},

  /* report */
  hint:            {sv:"ledtråd",           en:"hint"},
  hideHint:        {sv:"dölj ledtråd",      en:"hide hint"},
  showAnswer:      {sv:"visa svar",         en:"show answer"},
  hideAnswer:      {sv:"dölj svar",         en:"hide answer"},
  close:           {sv:"Stäng",             en:"Close"},
  reportBtn:       {sv:"Rapport",           en:"Report"},
  reportDone:      {sv:"Klart — så här gick det", en:"Finished — how it went"},
  reportProgress:  {sv:"Så här långt",      en:"Where you are"},
  repSolo:         {sv:"Klarade du på egen hand", en:"Done without help"},
  repHinted:       {sv:"Behövde en ledtråd", en:"Needed a hint"},
  repRevealed:     {sv:"Tog fram svaret — repetera dessa", en:"Revealed the answer — revisit these"},
  repTerminal:     {sv:"Från terminalen",   en:"From the terminal"},
  repRan:          {sv:"Kommandon körda: {n}", en:"Commands run: {n}"},
  repFailed:       {sv:"varav fel: {n}",    en:"of those, errors: {n}"},
  repBySection:    {sv:"Per avsnitt",       en:"By section"},
  repSlips:        {sv:"{n} fel",           en:"{n} missed"},
  repMissed:       {sv:"Frågor du missade först", en:"Questions you missed first time"},
  repFocus:        {sv:"Att fokusera på",   en:"What to focus on"},
  repNext:         {sv:"Repetera det som står under «repetera dessa» innan nästa föreläsning — "+
                       "det är där du tappar poäng på tentan.",
                    en:"Go over anything under \"revisit these\" before the next lecture — "+
                       "that is where marks get lost on the exam."},

  adviceNotFound:  {sv:"Kommandot fanns inte, {n} gånger. Tryck Tab för att komplettera namn — "+
                       "stavfel är den vanligaste orsaken.",
                    en:"Command not found, {n} times. Press Tab to complete names — "+
                       "a typo is the usual cause."},
  adviceDenied:    {sv:"Nekad åtkomst, {n} gånger. Fundera på vem som äger sökvägen: "+
                       "systemkataloger kräver sudo, din hemkatalog gör det inte.",
                    en:"Permission denied, {n} times. Think about who owns the path: "+
                       "system directories need sudo, your home directory does not."},
  advicePaths:     {sv:"Sökvägen fanns inte, {n} gånger. Kontrollera var du står med pwd, "+
                       "och kom ihåg att ~ betyder din hemkatalog.",
                    en:"Path did not exist, {n} times. Check where you are with pwd, "+
                       "and remember ~ means your home directory."},
  adviceReveals:   {sv:"Svar du tog fram: {n}. Gör om dem utan att titta — "+
                       "att skriva kommandot själv är det som fastnar.",
                    en:"Answers revealed: {n}. Redo those without looking — "+
                       "typing the command yourself is what sticks."},
  adviceHintsOnly: {sv:"Ledtrådar använda: {n}, svar: inga. Bra läge inför tentan.",
                    en:"Hints used: {n}, answers: none. Good place to be for the exam."},
  adviceClean:     {sv:"Hela labben utan ledtrådar eller svar, {n} av {n}. Den här veckan sitter.",
                    en:"The whole lab with no hints and no answers, {n} of {n}. This week is solid."},
  adviceReadErrors:{sv:"{n}% av dina kommandon gav fel. Läs felmeddelandet innan nästa försök — "+
                       "det namnger nästan alltid filen och orsaken.",
                    en:"{n}% of your commands returned an error. Read the message before the next "+
                       "attempt — it almost always names the file and the reason."},
  adviceNextLecture:{sv:"Inget hängde upp sig här. Nästa är {tier} — läs igenom den innan föreläsningen.",
                    en:"Nothing tripped you up here. Next is {tier} — read through it before the lecture."},
  adviceLastLecture:{sv:"Sista labben är klar. Kör igenom terminalövningen utan ledtrådar som repetition.",
                    en:"That was the last lab. Run the terminal drill with no hints as revision."},
  adviceWeakTier:  {sv:"Svagast avsnitt: {tier} — fel på {n}. Läs förklaringarna där igen.",
                    en:"Weakest section: {tier} — missed {n}. Re-read the explanations there."},
  adviceQuizClean: {sv:"Rätt på första försöket: {n} av {n}.",
                    en:"Right first time: {n} of {n}."},
  adviceQuizReview:{sv:"Fel på första försöket: {n}. Förklaringarna står kvar ovan.",
                    en:"Missed first time: {n}. The explanations are above."},
  adviceQuizRepeat:{sv:"Tog mer än ett försök: {n} — värda en extra genomläsning.",
                    en:"Took more than one attempt: {n} — worth a second read."},

  /* confirm dialog */
  resetTitle:      {sv:"Nollställa alla framsteg?", en:"Reset all progress?"},
  resetIntro:      {sv:"Detta rensar allt som sparats i den här webbläsaren och går inte att ångra:",
                    en:"This clears everything saved in this browser and cannot be undone:"},
  resetNothing:    {sv:"Inget är sparat än, så det finns inget att förlora. Du kan nollställa ändå.",
                    en:"Nothing is saved yet, so there is nothing to lose. You can reset anyway."},
  resetConfirm:    {sv:"Nollställ allt",    en:"Reset everything"},
  cancel:          {sv:"Avbryt",            en:"Cancel"},
  drillTasks:      {sv:"lösta terminaluppgifter", en:"solved drill tasks"},
  quizAnswers:     {sv:"besvarade quizfrågor",    en:"answered quiz questions"},
  labTasks:        {sv:"klarade labbuppgifter",   en:"completed lab tasks"},
  machinesFor:     {sv:"de simulerade maskinerna för", en:"the simulated machines for"},
  lectures:        {sv:"föreläsningar, med filerna du skapat", en:"lectures, with any files you made"}
};

const t = key => L(T[key] || key);

function setLang(lang){
  S.lang = LANGS[lang] ? lang : "en";
  document.documentElement.lang = S.lang;
  applyChrome();
  // a re-render wipes the report panel, so put it back in the new language
  const hadReport = !!document.querySelector(".report");
  // re-render whatever is on screen so generated text follows
  if(!$("picker").hidden) renderPicker();
  else if(S.mode === "quiz") { renderQuiz(); renderQuizNav(); }
  else if(S.mode === "course") renderCourse();
  else renderTask();
  if(hadReport){
    if(S.mode === "quiz") toggleQuizReport();
    else if(S.mode === "course") toggleLabReport();
  }
  save();
}

/* static chrome that is not regenerated on every render */
const brandHtml = () => esc(t("brandA")) + "<b>·</b>" + esc(t("brandB"));

function applyChrome(){
  const set = (id, key) => { const e = $(id); if(e) e.textContent = t(key); };
  document.title = t("docTitle");
  document.querySelectorAll(".brand, .pbrand").forEach(e => { e.innerHTML = brandHtml(); });
  set("m-drill", "drillTab");
  set("m-quiz", "quizTab");
  set("tomenu-label", "menu");
  set("openref", "cheatsheet");
  set("s-lab-solved", "solved");
  const tb = document.getElementById("tut-btn"); if(tb) tb.textContent = t("tutorial");
  const dl = document.querySelector("#distro .lbl"); if(dl) dl.textContent = t("distro");
  const rs = $("reset"); if(rs) rs.textContent = t("resetProgress");
  const tm = $("tomenu"); if(tm) tm.title = t("menuTitle");
  const st = $("sectlabel");
  if(st) st.textContent = S.mode === "drill" ? t("modules")
                        : S.mode === "quiz" ? t("quizSections") : t("courseWeeks");
  document.querySelectorAll("[data-stat]").forEach(e => { e.textContent = t(e.dataset.stat); });
  const lb = $("langbtn");
  if(lb){ lb.textContent = S.lang === "sv" ? "EN" : "SV";
          lb.title = S.lang === "sv" ? "Switch to English" : "Byt till svenska"; }
}
