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
  missed:          {sv:"MISSAD",            en:"MISSED"},
  wrong:           {sv:"FEL",               en:"WRONG"},
  right:           {sv:"RÄTT",              en:"CORRECT"},

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
  // re-render whatever is on screen so generated text follows
  if(!$("picker").hidden) renderPicker();
  else if(S.mode === "quiz") { renderQuiz(); renderQuizNav(); }
  else if(S.mode === "course") renderCourse();
  else renderTask();
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
