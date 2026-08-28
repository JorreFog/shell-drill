/* =================== the programme menu ===================
   Two lists: the courses of the IT-säkerhet programme, and the standalone
   practice tools. Only entries with real material set ready:true; the rest
   render as placeholders, so adding a course later is a data change here plus
   its content — not a rebuild of the page.

   LIA, Examensarbete and Kompetensportfölj are deliberately absent: placement,
   thesis and portfolio work have nothing to practise in a browser. */
const PROGRAMME = {
  name: "IT-säkerhet",
  subtitle: "Yrkeshögskola · practice material for the taught courses",
  courses: [
  {id:"grund-it", title:"Grundläggande IT och nätverk",
   blurb:"The Linux command line, filesystem and permissions, networking, systemd and an "+
         "introduction to Python — one lab per lecture, worked on a simulated machine.",
   ready:true, modes:["course","drill","quiz"], entry:"course"},

  {id:"natverkssakerhet", title:"Nätverkssäkerhet",
   blurb:"Segmentation, firewalls, VPN, and how traffic is attacked and defended.",
   ready:false},

  {id:"kryptering", title:"Datasäkerhet och kryptering",
   blurb:"Symmetric and asymmetric cryptography, hashing, certificates and key handling.",
   ready:false},

  {id:"hotanalys", title:"Cybersäkerhet och hotanalys",
   blurb:"Threat modelling, attacker techniques and how risk is assessed in practice.",
   ready:false},

  {id:"pentest", title:"Sårbarhetsanalys och penetrationstestning",
   blurb:"Finding weaknesses methodically: scanning, enumeration, exploitation and reporting.",
   ready:false},

  {id:"incident", title:"Incidenthantering och katastrofåterställning",
   blurb:"Detecting, containing and recovering from incidents, and planning for continuity.",
   ready:false},

  {id:"ledningssystem", title:"Ledningssystem o systematiskt arbetssätt",
   blurb:"ISO 27001 and working systematically with security rather than ad hoc.",
   ready:false},

  {id:"kravstallning", title:"Kravställning, upphandling o kalkylering",
   blurb:"Writing requirements, procuring systems and costing a security solution.",
   ready:false},

  {id:"etik", title:"Etik och professionalism inom IT-säkerhet",
   blurb:"Professional conduct, disclosure, and the ethics of offensive and defensive work.",
   ready:false},

  {id:"juridik", title:"Rättsliga aspekter o efterlevnad inom IT-säk",
   blurb:"GDPR, NIS2 and the legal duties that shape how security work is done.",
   ready:false}
],
  /* Standalone practice, not tied to one course's schedule. */
  tools: [
  {id:"tool-drill", title:"Terminal drill",
   blurb:"123 tasks across ten modules. You type the real command; it tells you what was "+
         "wrong when you don't.",
   ready:true, modes:["drill"], entry:"drill"},

  {id:"tool-quiz", title:"Linux knowledge quiz",
   blurb:"34 multiple-answer questions on the ideas behind the commands, each with an "+
         "explanation.",
   ready:true, modes:["quiz"], entry:"quiz"}
]};

const allEntries = () => PROGRAMME.courses.concat(PROGRAMME.tools);
const courseById = id => allEntries().find(c => c.id === id) || null;
const activeCourse = () => courseById(S.course) || null;

/* Progress for a card. Each ready entry reports whatever it actually tracks. */
function courseProgress(c){
  if(!c.ready) return null;
  if(c.id === "grund-it"){
    const total = COURSE.reduce((n,l)=>n+l.tasks.length, 0);
    const done  = COURSE.reduce((n,l,i)=>n+lecDone(i), 0);
    return {done, total, unit:"lab tasks"};
  }
  if(c.id === "tool-drill"){
    const total = MODULES.reduce((n,m)=>n+m.tasks.length, 0);
    return {done: Object.keys(S.solved).length, total, unit:"tasks solved"};
  }
  if(c.id === "tool-quiz"){
    const total = QUIZ.reduce((n,t)=>n+t.items.length, 0);
    return {done: Object.keys(S.qDone).length, total, unit:"questions answered"};
  }
  return null;
}

/* ---------- the picker ---------- */
function pickerCard(c, i){
  const p = courseProgress(c);
  const pct = p && p.total ? Math.round(p.done / p.total * 100) : 0;
  return '<button class="ccard '+(c.ready ? "ready" : "planned")+'" data-course="'+c.id+'" '+
      'style="--i:'+i+'"'+(c.ready ? "" : ' aria-disabled="true"')+'>'+
    '<span class="cmain">'+
      '<span class="ctitle">'+esc(c.title)+"</span>"+
      '<span class="cblurb">'+esc(c.blurb)+"</span>"+
      (p ? '<span class="cbar"><span class="cbar-fill" style="width:'+pct+'%"></span></span>'+
           '<span class="cprogtext">'+p.done+" / "+p.total+" "+p.unit+"</span>" : "")+
    "</span>"+
    '<span class="cside">'+
      '<span class="cstate">'+(c.ready ? "open →" : "soon")+"</span>"+
    "</span></button>";
}

function renderPicker(){
  const el = $("picker");
  const last = activeCourse();
  let i = 0;
  const section = (label, note, list) =>
    '<h2 class="psect">'+esc(label)+(note ? '<span>'+esc(note)+"</span>" : "")+"</h2>"+
    '<div class="cgrid">'+list.map(c => pickerCard(c, i++)).join("")+"</div>";

  el.innerHTML =
    '<div class="pwrap">'+
      '<div class="phead">'+
        '<div class="pbrand">shell<b>·</b>drill</div>'+
        "<h1>"+esc(PROGRAMME.name)+"</h1>"+
        '<p class="psub">'+esc(PROGRAMME.subtitle)+"</p>"+
      "</div>"+
      section("Kurser", "the programme, in order", PROGRAMME.courses)+
      section("Verktyg", "practice on its own, any time", PROGRAMME.tools)+
      '<p class="pfoot">Courses without material yet are placeholders and open once the '+
        "content exists. LIA, examensarbete and kompetensportfölj are not listed — "+
        "placement, thesis and portfolio work have nothing to practise here.</p>"+
    "</div>";

  el.querySelectorAll(".ccard").forEach(b=>{
    b.onclick = ()=>{
      const c = courseById(b.dataset.course);
      if(!c) return;
      if(!c.ready){
        el.querySelectorAll(".csoon").forEach(n=>n.remove());
        const note = document.createElement("span");
        note.className = "csoon";
        note.textContent = "No material yet — this opens when the course starts.";
        b.querySelector(".cmain").appendChild(note);
        b.classList.remove("nudge"); void b.offsetWidth; b.classList.add("nudge");
        return;
      }
      enterCourse(c.id);
    };
  });

  // whatever you were last in takes focus, so Enter goes straight back in
  const target = el.querySelector('.ccard[data-course="'+(last ? last.id : "grund-it")+'"]')
              || el.querySelector(".ccard.ready");
  if(target) setTimeout(()=>target.focus(), 60);
}

function openPicker(){
  renderPicker();
  $("picker").hidden = false;
  document.body.classList.add("picking");
  $("picker").scrollTop = 0;
}

function enterCourse(id){
  const c = courseById(id);
  if(!c || !c.ready) return;
  // coming back to the same entry keeps the tab you were on; switching to a
  // different one lands on that entry's own starting point
  const returning = S.course === id;
  S.course = id;
  $("picker").hidden = true;
  document.body.classList.remove("picking");
  // an entry declares which tabs it offers and where to land
  const modes = c.modes || ["drill"];
  ["drill","quiz","course"].forEach(m=>{
    const b = $("m-"+m);
    if(b) b.style.display = modes.includes(m) ? "" : "none";
  });
  $("m-course").textContent = c.id === "grund-it" ? c.title : "Course plan";
  $("here").textContent = c.title;
  setMode(returning && modes.includes(S.mode) ? S.mode : (c.entry || modes[0]));
  save();
}
