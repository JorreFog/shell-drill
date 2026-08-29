/* Splice the simulated machine + new course tab into index.html, replacing the
   previous milestone-based course code. Idempotent: run it again after editing
   any of the engine files and it re-splices from the markers. */
const fs = require('fs'), path = require('path');
const scratch = __dirname;
const target = process.argv[2];
if(!target){ console.error('usage: node build.js <path to index.html>'); process.exit(1); }

const read = f => fs.readFileSync(path.join(scratch, f), 'utf8');
let html = fs.readFileSync(target, 'utf8');

/* preview-only engine files, in load order */
const PREVIEW = /preview\.html$/i.test(target);
const PREVIEW_FILES = fs.readdirSync(scratch).filter(f => /^pv-.*\.js$/.test(f)).sort();

const BEGIN = '/* ===== BEGIN simulated machine — generated, see src/vm-*.js ===== */';
const FINISH = '/* ===== END simulated machine ===== */';
const END = '/* ---------- quiz state & rendering ---------- */';

// on a re-run, replace between our own sentinels; on the first run, replace the
// original course-plan block
let a = html.indexOf(BEGIN), b;
if(a >= 0){
  b = html.indexOf(FINISH);
  if(b < 0){ console.error('found BEGIN sentinel but no END sentinel'); process.exit(1); }
  b += FINISH.length + 1;
} else {
  a = html.indexOf('/* =================== course plan ===================');
  b = html.indexOf(END);
  if(a < 0 || b < 0 || b < a){
    console.error('could not find the course-plan block to replace');
    process.exit(1);
  }
}

const engine = BEGIN + '\n' +
  read('vm-core.js') + '\n' +
  read('vm-cmds.js') + '\n' +
  read('vm-seed.js') + '\n' +
  read('vm-python.js') + '\n' +
  read('vm-labs.js') + '\n' +
  read('vm-ui.js') + '\n' +
  read('vm-i18n.js') + '\n' +
  read('vm-quizzes.js') + '\n' +
  read('vm-courses.js') + '\n' +
  read('vm-fx.js') + '\n' +
  read('vm-report.js') + '\n' +
  /* These arrived as a preview and now ship. They build their own DOM rather
     than needing markup in the page, which is why index.html carries no trace
     of them beyond the spliced block. */
  read('vm-modes.js') + '\n' +
  read('vm-exam.js') + '\n' +
  read('vm-review.js') + '\n' +
  read('vm-progress.js') + '\n' +
  read('vm-net.js') + '\n' +
  read('vm-netlab.js') + '\n' +
  read('vm-netui.js') + '\n' +
  read('vm-palette.js') + '\n' +
  read('vm-tourintro.js') + '\n' +
  /* Anything named pv-*.js stays preview-only: spliced into preview.html and
     left out of index.html, so the next batch of work can be tried on a real
     copy of the page before it ships. Currently nothing is named that. */
  (PREVIEW ? PREVIEW_FILES.map(f => read(f)).join('\n') + '\n' : '') +
  FINISH + '\n\n';

html = html.slice(0, a) + engine + html.slice(b);

/* ---- CSS for the lab UI, re-splices between its own sentinels ---- */
const CSS_MARK = '/* ---------- course lab ---------- */';
const CSS_END  = '/* ---------- end course lab ---------- */';
{
  const css = `
${CSS_MARK}
.cw .cbrief{font-family:var(--sans);font-size:13.5px;color:var(--bone);opacity:.85;margin:10px 0 0;
  padding-left:11px;border-left:2px solid var(--amber)}
.ltasks{list-style:none;margin:0;padding:0;counter-reset:none}
.ltask{display:flex;gap:12px;align-items:flex-start;padding:11px 13px;margin-bottom:8px;
  border:1px solid var(--line);background:var(--panel-2)}
.ltask.done{border-color:var(--lime);background:rgba(167,217,108,.07)}
.ltask .lnum{flex:0 0 22px;height:22px;line-height:20px;text-align:center;font-size:12px;
  border:1px solid var(--line);color:var(--dim)}
.ltask.done .lnum{border-color:var(--lime);color:var(--lime)}
.ltask .lbody{flex:1;min-width:0}
.ltask .ltext{font-family:var(--sans);font-size:14px;line-height:1.55;display:block}
.ltask.done .ltext{color:var(--dim)}
.ltask .ltext code{font-family:var(--mono);font-size:12.5px;background:rgba(92,207,230,.1);
  color:var(--cyan);padding:1px 5px}
.ltask .lstat{flex:0 0 auto;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--lime)}
/* these read as inline links but are still tap targets; the padding buys a
   comfortable touch area without changing where the underline sits */
.lhint{margin-top:7px;background:none;border:0;border-bottom:1px dotted var(--dim);color:var(--dim);
  font-family:var(--mono);font-size:11.5px;cursor:pointer;padding:0 0 5px}
.lhint:hover{color:var(--amber);border-color:var(--amber)}
.lhinttext{display:block;margin-top:7px;font-family:var(--sans);font-size:13px;color:var(--amber);
  padding-left:10px;border-left:2px solid rgba(255,180,84,.4)}
/* an author display rule beats the hidden attribute, so restore it explicitly */
.lhinttext[hidden]{display:none}
.cprog{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin:14px 0 0}
.cprog b{color:var(--lime);font-weight:500}
.cprog .allgood{color:var(--lime)}
.labterm{margin-bottom:16px;position:relative}
.labterm .screen{min-height:230px;max-height:44vh}
.tbtn{margin-left:auto;background:var(--panel);border:1px solid var(--line);color:var(--dim);
  font-family:var(--mono);font-size:11px;padding:3px 9px;cursor:pointer}
.tbtn:hover{color:var(--bone);border-color:#3B5063}
.editor{position:absolute;inset:0;background:var(--panel);border:1px solid var(--amber);
  display:flex;flex-direction:column;z-index:5}
.edhead{padding:9px 13px;border-bottom:1px solid var(--line);font-size:12px;color:var(--dim);
  display:flex;gap:12px;align-items:center}
.edhead b{color:var(--amber);font-weight:500}
.edhead .edhint{margin-left:auto;font-size:11px}
#ed-body{flex:1;width:100%;background:var(--void);color:var(--bone);border:0;resize:none;
  font-family:var(--mono);font-size:13.5px;line-height:1.6;padding:13px;outline:none;tab-size:4}
.edfoot{padding:9px 13px;border-top:1px solid var(--line);display:flex;gap:9px;align-items:center}
.cnav{display:flex;gap:9px;margin-top:14px;flex-wrap:wrap;align-items:center}
/* .tbtn and .nextbtn disagree on padding, font-size, border and margin-top, which
   in a flex row made these three boxes different heights and left Next sitting
   lower than its neighbours. Size every button in the row identically instead. */
.cnav button,.edfoot button{margin:0;padding:9px 16px;font-size:12px;line-height:1.25;
  border:1px solid transparent}
.cnav .tbtn,.edfoot .tbtn{margin-left:0;border-color:var(--line)}
.lbtns{display:flex;gap:14px;margin-top:7px;flex-wrap:wrap}
.lbtns .lhint{margin-top:0}
.lans{border-bottom-color:#3B5063}
.lans:hover{color:var(--lime);border-color:var(--lime)}
.lanstext{display:block;margin-top:9px;padding-left:10px;border-left:2px solid rgba(167,217,108,.45)}
.lanstext[hidden]{display:none}
.lanstext .anote{display:block;font-family:var(--sans);font-size:12px;color:var(--dim);margin-bottom:7px}
.lanstext .acmd{display:block;font-family:var(--mono);font-size:12.5px;color:var(--lime);
  background:rgba(167,217,108,.08);padding:5px 9px;margin-bottom:4px;overflow-x:auto;white-space:pre}
.lanstext .afile{margin:0 0 6px;font-family:var(--mono);font-size:12.5px;color:var(--bone);
  background:var(--void);border:1px solid var(--line);padding:8px 10px;overflow-x:auto;
  white-space:pre;line-height:1.5}
/* ---------- course & tool menu ---------- */
body.picking{overflow:hidden}
/* The picker is opaque and covers the viewport, so anything behind it is
   invisible. Blurring it cost a full-subtree rasterisation for nothing;
   taking it out of rendering entirely is free and looks identical. */
body.picking .wrap{visibility:hidden}
.picker{
  position:fixed;inset:0;z-index:150;overflow-y:auto;background:var(--void);
  animation:pickerIn .28s ease both;
}
.picker::before{
  content:"";position:fixed;inset:0;pointer-events:none;
  background:radial-gradient(900px 480px at 50% -8%,rgba(255,180,84,.10),transparent 70%),
             radial-gradient(700px 420px at 92% 108%,rgba(92,207,230,.08),transparent 70%);
}
.pwrap{position:relative;max-width:1180px;margin:0 auto;padding:52px 20px 72px}
.phead{margin-bottom:34px}
.pbrand{font-weight:700;font-size:13px;letter-spacing:.26em;text-transform:uppercase;color:var(--dim)}
.pbrand b{color:var(--amber)}
.phead h1{
  font-family:var(--sans);font-size:clamp(30px,5.2vw,46px);margin:12px 0 0;font-weight:700;
  letter-spacing:-.01em;
  background:linear-gradient(96deg,var(--bone) 12%,var(--amber) 58%,var(--cyan) 96%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}
.psub{font-family:var(--sans);color:var(--dim);font-size:14px;margin:9px 0 0}
.psect{
  display:flex;align-items:baseline;gap:12px;margin:34px 0 14px;font-size:11px;
  letter-spacing:.22em;text-transform:uppercase;color:var(--amber);font-weight:600;
}
.psect::after{content:"";flex:1;height:1px;background:var(--line)}
.psect span{font-family:var(--sans);font-size:12px;letter-spacing:.02em;text-transform:none;color:var(--dim);font-weight:400}
.cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:12px}
.ccard{
  position:relative;display:flex;gap:15px;align-items:flex-start;text-align:left;width:100%;
  background:var(--panel);border:1px solid var(--line);border-left:2px solid var(--line);
  padding:16px 17px;cursor:pointer;color:var(--bone);font-family:var(--mono);overflow:hidden;
  animation:cardIn .42s cubic-bezier(.2,.7,.3,1) both;animation-delay:calc(var(--i) * 34ms);
  transition:transform .16s ease,border-color .16s ease,background .16s ease;
}
.ccard::after{
  content:"";position:absolute;inset:0;pointer-events:none;opacity:0;
  background:linear-gradient(100deg,transparent 30%,rgba(255,180,84,.09),transparent 70%);
  transition:opacity .2s ease;
}
.ccard.ready:hover,.ccard.ready:focus-visible{
  transform:translateY(-3px);border-color:#3B5063;border-left-color:var(--amber);background:var(--panel-2);
}
.ccard.ready:hover::after{opacity:1}
.ccard.planned{cursor:default;opacity:.62}
.ccard.planned:hover{border-left-color:var(--rose)}
.cmain{flex:1;min-width:0}
.ctitle{display:block;font-family:var(--sans);font-size:15.5px;font-weight:600;line-height:1.3}
.cblurb{display:block;font-family:var(--sans);font-size:12.5px;color:var(--dim);line-height:1.55;margin-top:6px}
.cbar{display:block;height:3px;background:var(--line);margin-top:11px;overflow:hidden}
.cbar-fill{display:block;height:100%;background:linear-gradient(90deg,var(--lime),var(--cyan));
  transition:width .5s cubic-bezier(.2,.7,.3,1)}
.cprogtext{display:block;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim);margin-top:6px}
.csoon{display:block;font-family:var(--sans);font-size:12px;color:var(--rose);margin-top:9px}
.cside{flex:0 0 auto;display:flex;flex-direction:column;align-items:flex-end;gap:9px;padding-top:2px}
.cstate{font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--line)}
.ccard.ready .cstate{color:var(--lime)}
.ccard.planned .cstate{color:var(--dim)}
.pfoot{font-family:var(--sans);font-size:12.5px;color:var(--dim);margin:30px 0 0;max-width:70ch;line-height:1.6}
@keyframes pickerIn{from{opacity:0}to{opacity:1}}
@keyframes cardIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
@keyframes nudge{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
.ccard.nudge{animation:nudge .28s ease}

/* header: menu button and the you-are-here label */
.menubtn{
  display:flex;align-items:center;gap:8px;background:var(--panel);border:1px solid var(--line);
  color:var(--dim);font-family:var(--mono);font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;
  padding:7px 12px;cursor:pointer;transition:color .14s ease,border-color .14s ease;
  /* the header aligns on the text baseline, but a flex container takes its
     baseline from its first item — the icon, which has no text — so this
     button would otherwise hang below the logo. Centre it on the row instead. */
  align-self:center;
}
.menubtn:hover{color:var(--amber);border-color:var(--amber)}
.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:2px;width:11px;height:11px}
.mgrid i{background:currentColor;display:block}
.here{
  font-family:var(--sans);font-size:12.5px;color:var(--cyan);
  border-left:1px solid var(--line);padding-left:14px;
}
@media(max-width:820px){
  .pwrap{padding:34px 16px 56px}
  .cgrid{grid-template-columns:1fr}
  .here{display:none}
}
@media(prefers-reduced-motion:reduce){
  .picker,.ccard{animation:none}
  body.picking .wrap{filter:none}
}
/* ---------- completion report ---------- */
.report{
  border:1px solid var(--line);border-top:2px solid var(--cyan);background:var(--panel);
  margin-bottom:16px;padding:20px 20px 16px;position:relative;
  animation:reportIn .34s cubic-bezier(.2,.7,.3,1) both;
}
.report.full{border-top-color:var(--lime)}
@keyframes reportIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
.rhead{border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:4px}
.rhead h2{
  margin:0;font-size:11px;letter-spacing:.18em;text-transform:uppercase;
  color:var(--cyan);font-weight:600;
}
.report.full .rhead h2{color:var(--lime)}
.rscore{font-family:var(--mono);font-size:26px;color:var(--bone);margin-top:8px;line-height:1}
.rscore b{font-weight:700}
.rscore span{font-size:12px;color:var(--dim);margin-left:10px;letter-spacing:.1em}
.rsub{font-family:var(--sans);font-size:13px;color:var(--dim);margin-top:6px}
.rsec{padding:14px 0;border-bottom:1px solid rgba(34,48,63,.6)}
.rsec:last-of-type{border-bottom:0}
.rsec h3{
  margin:0 0 9px;font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--dim);font-weight:500;display:flex;gap:9px;align-items:baseline;
}
.rsec h3 span{color:var(--amber);font-family:var(--mono);letter-spacing:0}
.rlist{margin:0;padding-left:17px;font-family:var(--sans);font-size:13.5px;line-height:1.55}
.rlist li{margin-bottom:7px;color:var(--bone)}
.rlist li::marker{color:var(--line)}
.rtake{display:block;font-size:12.5px;color:var(--dim);margin-top:3px}
.rline{margin:0;font-family:var(--mono);font-size:12.5px;color:var(--dim)}
.rtiers{display:flex;flex-direction:column;gap:5px}
.rtier{
  display:flex;justify-content:space-between;gap:12px;font-size:13px;font-family:var(--sans);
  padding:6px 9px;background:var(--panel-2);border-left:2px solid var(--line);
}
.rtier b{font-family:var(--mono);font-size:12px;color:var(--lime);font-weight:500;white-space:nowrap}
.rtier b.warn{color:var(--amber)}
.rnext{
  font-family:var(--sans);font-size:13px;color:var(--amber);line-height:1.6;
  border-left:2px solid var(--amber);padding-left:12px;margin:14px 0 4px;
}
.rclose{position:absolute;top:16px;right:16px;margin-left:0}
@media(max-width:560px){ .rclose{position:static;margin-top:12px;width:100%} }

/* ---------- boot sequence ---------- */
.boot{
  position:fixed;inset:0;z-index:300;background:var(--void);
  display:flex;align-items:center;justify-content:center;
  animation:bootIn .2s ease both;
}
.boot.out{animation:bootOut .34s ease both}
.boot::after{
  content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(700px 380px at 50% 42%,rgba(255,180,84,.07),transparent 72%);
}
.bwrap{width:min(560px,90vw);padding:0 8px}
.blines{font-family:var(--mono);font-size:13px;line-height:1.85;min-height:210px}
.bline{animation:bootLine .18s ease both;color:var(--dim);white-space:pre-wrap}
.bline .bok{color:var(--lime)}
.bline.bhead{color:var(--bone);font-size:15px;letter-spacing:.14em;text-transform:uppercase}
.bline.bready{color:var(--amber);letter-spacing:.1em}
.bline.bready::after{
  content:"_";margin-left:3px;animation:caret 1s steps(1) infinite;color:var(--amber);
}
.bskip{
  margin-top:22px;font-family:var(--mono);font-size:10.5px;letter-spacing:.18em;
  text-transform:uppercase;color:var(--line);
}
@keyframes bootIn{from{opacity:0}to{opacity:1}}
@keyframes bootOut{to{opacity:0;transform:scale(1.02)}}
@keyframes bootLine{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:none}}
@keyframes caret{0%,50%{opacity:1}51%,100%{opacity:0}}

/* ---------- menu atmosphere ---------- */
.picker::after{
  /* Static, and faded with a gradient layer rather than mask-image. A mask
     takes the layer off the fast paint path in Gecko, and this one was also
     animating for ever with will-change:transform, so the compositor kept a
     full-viewport masked layer alive the whole time the menu was open. The
     top background layer paints the page colour back over the edges, which
     gives the same fade for the cost of one more gradient. */
  content:"";position:fixed;inset:0;pointer-events:none;opacity:.5;
  background-image:radial-gradient(760px 520px at 50% 6%,transparent 34%,var(--void) 80%),
                   linear-gradient(rgba(92,207,230,.045) 1px,transparent 1px),
                   linear-gradient(90deg,rgba(92,207,230,.045) 1px,transparent 1px);
  background-size:100% 100%, 52px 52px, 52px 52px;
}
/* animating background-position on background-clip:text repaints the text on
   every frame, so this runs twice on arrival instead of forever */
.phead h1{background-size:220% 100%;animation:sheen 4.5s ease-in-out 2}
@keyframes sheen{0%,100%{background-position:0% 0}50%{background-position:100% 0}}

/* cards: a line traces the left edge on hover, and the whole card lifts */
.ccard::before{
  content:"";position:absolute;left:-2px;top:0;width:2px;height:0;
  background:linear-gradient(180deg,var(--amber),var(--cyan));
  transition:height .26s cubic-bezier(.2,.7,.3,1);
}
.ccard.ready:hover::before,.ccard.ready:focus-visible::before{height:100%}
.ccard.ready:active{transform:translateY(-1px) scale(.996)}
.ccard.ready .cstate{transition:transform .18s ease}
.ccard.ready:hover .cstate{transform:translateX(3px)}
.cbar-fill{animation:barGrow .7s cubic-bezier(.2,.7,.3,1) both}
@keyframes barGrow{from{transform:scaleX(0);transform-origin:left}to{transform:none}}

/* ---------- view transition ---------- */
main.viewin{animation:viewIn .26s cubic-bezier(.2,.7,.3,1) both}
@keyframes viewIn{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:none}}

/* ---------- a task completing ---------- */
.ltask{transition:border-color .2s ease,background .2s ease}
.ltask.justdone{animation:taskDone .75s cubic-bezier(.2,.7,.3,1)}
@keyframes taskDone{
  0%{background:rgba(167,217,108,.28);border-color:var(--lime)}
  100%{background:rgba(167,217,108,.07);border-color:var(--lime)}
}
.ltask.done .lnum{position:relative}
.ltask.justdone .lnum{animation:numPop .5s cubic-bezier(.2,.9,.3,1.4)}
@keyframes numPop{0%{transform:scale(1)}45%{transform:scale(1.35);color:var(--lime)}100%{transform:scale(1)}}
.cprog.pulse{animation:progPulse .8s ease}
@keyframes progPulse{0%{color:var(--lime)}100%{color:var(--dim)}}

/* ---------- terminal ---------- */
.labterm{transition:border-color .25s ease,box-shadow .25s ease}
.labterm:focus-within{border-color:#33475C;box-shadow:0 0 0 1px rgba(92,207,230,.16)}
.labterm.working{box-shadow:0 0 0 1px rgba(167,217,108,.35)}
.labterm .bar .dot.g{animation:none}
.labterm.working .bar .dot.g{animation:dotBlink .22s ease 1}
@keyframes dotBlink{50%{box-shadow:0 0 8px var(--lime)}}
.ln{animation:lineIn .14s ease both}
@keyframes lineIn{from{opacity:0}to{opacity:1}}

/* ---------- nav ---------- */
.mod{position:relative}
.mod::after{
  content:"";position:absolute;left:0;bottom:0;height:2px;width:0;background:var(--amber);
  transition:width .22s cubic-bezier(.2,.7,.3,1);
}
.mod[aria-current="true"]::after{width:100%}
.pill{transition:transform .14s ease,color .14s ease,border-color .14s ease,background .14s ease}
.pill:hover{transform:translateY(-1px)}

@media(prefers-reduced-motion:reduce){
  .boot,.bline,.picker::after,.phead h1,.cbar-fill,main.viewin,
  .ltask.justdone,.ltask.justdone .lnum,.cprog.pulse,.ln{animation:none}
  .ccard::before{transition:none}
}

/* provisional-course notice and the language switch */
.provnote{
  border:1px solid var(--rose);border-left:3px solid var(--rose);
  background:rgba(240,113,120,.07);padding:15px 17px;margin-bottom:16px;
}
.provnote h2{
  margin:0 0 7px;font-size:11px;letter-spacing:.16em;text-transform:uppercase;
  color:var(--rose);font-weight:600;
}
.provnote p{margin:0;font-family:var(--sans);font-size:13.5px;line-height:1.6;color:var(--bone)}
.ccard.prov .cstate{color:var(--rose)}
.ccard.prov{border-left-color:rgba(240,113,120,.5)}
.ccard.ready.prov:hover{border-left-color:var(--rose)}
.cnote{display:block;font-family:var(--sans);font-size:12px;color:var(--amber);margin-top:7px}
.langbtn{
  align-self:center;background:var(--panel);border:1px solid var(--line);color:var(--dim);
  font-family:var(--mono);font-size:11px;letter-spacing:.12em;padding:6px 10px;cursor:pointer;
  transition:color .14s ease,border-color .14s ease;
}
.langbtn:hover{color:var(--cyan);border-color:var(--cyan)}
/* Each header control is its own class with its own padding and font-size, which
   left four different box heights sitting on the same row (menu 30.8, pills 27.6,
   lang 28, cheatsheet 28.8). Give them one height and centre the contents rather
   than trying to reconcile four sets of padding. */
.top .menubtn,.top .pill,.top .langbtn,.top .refbtn{
  min-height:30px;display:inline-flex;align-items:center;justify-content:center;
  padding-top:0;padding-bottom:0;
}
.cmeta .nowtag{color:var(--lime);border:1px solid var(--lime);padding:1px 7px;font-size:10px}
.mod.isnow .n{color:var(--lime);opacity:1}
/* the closed drawer sits off-canvas; without this it widens the document */
html,body{overflow-x:hidden}
.drawer{visibility:hidden}
.drawer.open{visibility:visible}
@media(max-width:820px){
  /* iOS Safari zooms any focused input under 16px, which yanks the layout
     around every time you tap the terminal */
  .inputline input,#ed-body,#refsearch{font-size:16px}
  .labterm .screen{min-height:180px;max-height:38vh}
  .editor{position:fixed;inset:8px;z-index:120}
  #ed-body{font-size:16px}
  .ltask{padding:10px}
  .ltask .ltext{font-size:13.5px}
}
${CSS_END}
`;
  const ca = html.indexOf(CSS_MARK);
  if(ca >= 0){
    const cb = html.indexOf(CSS_END);
    if(cb < 0){ console.error('found the css start sentinel but no end sentinel'); process.exit(1); }
    html = html.slice(0, ca) + css.trim() + '\n' + html.slice(cb + CSS_END.length + 1);
  } else {
    html = html.replace('</style>', css + '</style>');
  }
}

/* ---- CSS for the modes, the network lab, the palette and the theme ----
   Spliced between its own sentinels like the block above. Was preview-only;
   ships now. ---- */
{
  const PV_MARK = '/* ---------- preview ---------- */';
  const PV_END  = '/* ---------- end preview ---------- */';
  const pvcss = `
${PV_MARK}
.pvcard{border:1px solid var(--line);background:var(--panel-2);padding:18px 20px;margin-bottom:14px}
.pvcard h2{font-family:var(--sans);font-size:21px;margin:0 0 6px;font-weight:500;line-height:1.35}
.pvcard h3{font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:var(--dim);
  margin:0 0 12px;font-weight:500}
.pvlead{font-family:var(--sans);font-size:13.5px;color:var(--dim);line-height:1.6;margin:0 0 14px}
.pvintro{margin:0 0 14px}
.pvmuted{font-family:var(--sans);font-size:12.5px;color:var(--dim);margin:10px 0 0}
.pvmeta{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--amber);margin-bottom:8px}
.pvempty{text-align:center;padding:40px 20px}

/* the size picker that starts a test */
.pvsizes{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px}
.pvsize{flex:1 1 130px;background:var(--panel);border:1px solid var(--line);color:var(--bone);
  padding:16px 12px;cursor:pointer;display:flex;flex-direction:column;gap:3px;align-items:center;
  transition:border-color .14s ease,transform .14s ease}
.pvsize:hover{border-color:var(--amber);transform:translateY(-2px)}
.pvsize b{font-size:26px;font-weight:700;color:var(--amber);font-family:var(--mono)}
.pvsize span{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
.pvsize em{font-style:normal;font-size:11.5px;color:var(--dim);opacity:.8}

/* the running-test bar */
.pvbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:12px;
  padding:10px 14px;border:1px solid var(--line);background:var(--panel)}
/* .pvmuted and friends carry a margin-top for the contexts they usually sit in,
   which inside this row knocked them off the baseline. Same trap as .nextbtn. */
.pvbar > *{margin:0}
.pvbar .pvright{margin-left:auto}
.pvclock{font-family:var(--mono);font-size:20px;font-weight:700;color:var(--amber);
  font-variant-numeric:tabular-nums}
.pvprog{font-size:12px;color:var(--dim);letter-spacing:.04em;font-family:var(--mono)}
.pvbar .tbtn{margin-left:auto}

.pvgrid{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:14px}
.pvdot{width:28px;height:28px;border:1px solid var(--line);background:var(--panel);
  color:var(--dim);font-family:var(--mono);font-size:11px;cursor:pointer;padding:0;
  transition:border-color .12s,color .12s}
.pvdot:hover{color:var(--bone);border-color:#3B5063}
.pvdot.ans{color:var(--bone);border-color:#3B5063;background:var(--panel-2)}
.pvdot.now{border-color:var(--amber);color:var(--amber)}
.pvdot.flag{box-shadow:inset 0 -3px 0 var(--rose)}

.pvopts{display:flex;flex-direction:column;gap:8px;margin:14px 0}
.pvopts .qopt{width:100%;text-align:left}
.pvexpl{font-family:var(--sans);font-size:13.5px;color:var(--dim);line-height:1.6;
  padding-left:11px;border-left:2px solid var(--amber);margin:14px 0 0}
.pvnav{display:flex;gap:9px;flex-wrap:wrap;align-items:center;margin-top:16px}
.pvnav button{margin:0;padding:9px 16px;font-size:12px;line-height:1.25;min-height:34px;
  border:1px solid transparent}
.pvnav .ghost,.pvnav .tbtn{border-color:var(--line);margin-left:0}
.pvreveal{margin:12px 0 0;padding-left:11px;border-left:2px solid var(--lime)}
.pvans{color:var(--lime)}

/* progress overview */
.pvbig{margin:6px 0 12px}
.pvmeter{height:6px;background:var(--panel);border:1px solid var(--line);overflow:hidden}
.pvmeter i{display:block;height:100%;background:var(--amber);transition:width .5s ease}
.pvrows{display:flex;flex-direction:column;gap:6px}
.pvrow{display:flex;gap:12px;align-items:center;width:100%;text-align:left;background:none;
  border:0;border-left:2px solid transparent;color:var(--dim);padding:7px 10px;cursor:pointer;
  font-size:12.5px;transition:color .12s,border-color .12s,background .12s}
.pvrow:hover{color:var(--bone);border-left-color:var(--amber);background:rgba(255,255,255,.03)}
.pvrname{flex:1 1 auto;min-width:0;overflow-wrap:anywhere;font-family:var(--sans)}
.pvrbar{flex:0 0 90px;height:4px;background:var(--panel);overflow:hidden}
.pvrbar i{display:block;height:100%;background:var(--lime)}
.pvrnum{flex:0 0 auto;font-family:var(--mono);font-size:11.5px;font-variant-numeric:tabular-nums}
.pvweak{color:var(--amber)}

.pvlog{margin-top:18px;border-top:1px solid var(--line);padding-top:14px}
.pvlogrow{display:flex;gap:12px;align-items:center;padding:5px 0;font-size:12.5px;color:var(--dim)}
.pvlogrow span{flex:1 1 auto;font-family:var(--mono);font-size:11.5px}
.pvlogrow b{color:var(--bone);font-weight:500;font-family:var(--mono)}
.pvlogrow em{font-style:normal;color:var(--amber);font-family:var(--mono);font-size:11.5px}

/* ============ phosphor theme ============
   Green on black, but the green is the accent, not the whole page. Tinting the
   surfaces, the body text and the highlights all green passed contrast checks
   on luminance and still read as mud, because everything sat in one narrow
   band of hue. Terminal themes that stay readable for hours do the opposite:
   neutral near-black surfaces, near-white text, and green reserved for the
   things that carry meaning.

   Roles stay separated by hue as well as brightness — light green marks what is
   active, deeper green what is finished, teal what is a link, red what broke. */
:root{
  --void:    #070A0C;   /* page — neutral near-black, no green cast */
  --panel:   #0D1117;
  --panel-2: #121821;
  --line:    #233041;
  --bone:    #E6EDF3;   /* body text — neutral, so the greens stay legible next to it */
  --dim:     #97A4B2;   /* secondary text */
  --amber:   #7EE787;   /* active, headings, hints */
  --lime:    #3FB950;   /* done, prompt, success */
  --cyan:    #56D4DD;   /* links, mode pills, code */
  --rose:    #FF7B72;   /* errors and danger */
  --warn:    #E3B341;   /* provisional — caveated, not broken */
}

/* Scanlines only. There was a vignette layered under these, and because this
   element is position:fixed it darkened the bottom of the viewport rather than
   the bottom of the page — so text dimmed as it scrolled down and brightened
   again as it passed the middle. A full-page effect cannot live on a fixed
   layer. */
/* The scanlines were a position:fixed layer covering the viewport, so every
   scroll frame repainted a full-screen gradient above all the content. At
   0.016 alpha they cost far more than they showed. Removing the layer
   entirely is the cheapest thing available; restoring it is one rule. */
body::after{content:none}

/* glow only where it means something, and only on small text */
.brand{text-shadow:0 0 16px rgba(126,231,135,.30)}
.ps1{text-shadow:0 0 10px rgba(63,185,80,.45)}
.pvclock{text-shadow:0 0 14px rgba(126,231,135,.35)}

/* the terminal reads as a screen rather than a panel */
.term .screen{background:linear-gradient(180deg,rgba(63,185,80,.045),transparent 140px),var(--void)}
/* the ring is free; the 50px blur behind it was repainting on every line the
   terminal printed, which is the one element that redraws constantly */
.term{box-shadow:0 0 0 1px rgba(35,48,65,.9)}

/* menu wash and the faint grid a network map is drawn on */
.picker::before{
  background:radial-gradient(900px 480px at 50% -8%,rgba(126,231,135,.09),transparent 70%),
             radial-gradient(700px 420px at 92% 108%,rgba(86,212,221,.06),transparent 70%);
}
/* A second masked grid used to sit here, on top of the one .picker::after
   already draws. Two full-viewport masked layers for one faint grid. */

/* the title led on near-white, which made the biggest thing on the page grey */
/* the background shorthand resets background-clip, so the clip has to be
   restated here or the heading paints as a solid bar over its own text */
.phead h1{
  background:linear-gradient(96deg,var(--amber) 6%,var(--bone) 44%,var(--cyan) 96%);
  -webkit-background-clip:text;background-clip:text;color:transparent;
}

/* Red is for things that broke. Provisional material is not broken, it is
   caveated — yellow is the ordinary sign for "usable, with a warning", and it
   keeps the badge visible without borrowing the colour the terminal uses for
   real errors. Courses that are not built at all stay grey: those are not a
   caution, there is simply nothing there yet. */
.provnote{border-color:var(--line);border-left-color:var(--warn);
  background:rgba(227,179,65,.06)}
.provnote h2{color:var(--warn)}
.ccard.prov .cstate{color:var(--warn)}
.ccard.prov{border-left-color:rgba(227,179,65,.38)}
.ccard.ready.prov:hover{border-left-color:var(--warn)}
.ccard.planned:hover{border-left-color:var(--dim)}
.csoon{color:var(--dim)}

.nlmap{max-width:100%;height:auto}

/* the tour card, widened for the contents step */
/* the tour card sets its width in an inline style, which a class cannot beat */
#tourcard.wide{width:min(560px,92vw)!important}
.pvtl{max-height:56vh;overflow-y:auto;margin-top:2px}
.pvtlintro{font-family:var(--sans);font-size:13px;color:var(--dim);line-height:1.6;margin:0 0 14px}
.pvtlgroup{margin-bottom:14px}
.pvtlgroup h4{margin:0 0 7px;font-size:10px;letter-spacing:.18em;text-transform:uppercase;
  color:var(--amber);font-weight:500}
.pvtlrow{display:flex;gap:10px;align-items:baseline;padding:3px 0;font-size:12.5px;line-height:1.5}
.pvtlrow b{flex:0 0 34%;color:var(--bone);font-weight:500;font-family:var(--mono);font-size:12px}
.pvtlrow span{flex:1 1 auto;color:var(--dim);font-family:var(--sans)}
.pvtlfoot{font-family:var(--sans);font-size:12px;color:var(--dim);margin:12px 0 0;
  padding-top:10px;border-top:1px solid var(--line)}
@media(max-width:560px){.pvtlrow{flex-direction:column;gap:1px}.pvtlrow b{flex:none}}

/* command palette */
.pvpal{position:fixed;inset:0;z-index:300;background:rgba(4,7,11,.72);
  display:flex;align-items:flex-start;justify-content:center;padding:12vh 16px 16px}
.pvpal[hidden]{display:none}
.pvpalbox{width:min(680px,100%);background:var(--panel-2);border:1px solid var(--amber);
  box-shadow:0 30px 80px -20px #000;display:flex;flex-direction:column;max-height:70vh}
#pv-palq{width:100%;background:var(--void);border:0;border-bottom:1px solid var(--line);
  color:var(--bone);font-family:var(--mono);font-size:15px;padding:15px 17px;outline:none}
#pv-palq::placeholder{color:#3E4C5C}
.pvpalhits{overflow-y:auto;flex:1;min-height:0}
.pvpalhit{display:flex;gap:11px;align-items:baseline;width:100%;text-align:left;
  background:none;border:0;border-left:2px solid transparent;color:var(--bone);
  padding:9px 15px;cursor:pointer;font-size:13px;font-family:var(--sans)}
.pvpalhit:hover{background:rgba(255,255,255,.03)}
.pvpalhit.sel{background:rgba(255,180,84,.09);border-left-color:var(--amber)}
.pvpalkind{flex:0 0 62px;font-family:var(--mono);font-size:9.5px;letter-spacing:.14em;
  text-transform:uppercase;color:var(--dim)}
.pvpalkind.k-cmd{color:var(--lime)} .pvpalkind.k-go{color:var(--amber)}
.pvpalkind.k-quiz{color:var(--cyan)} .pvpalkind.k-lab{color:var(--rose)}
.pvpallab{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pvpalsub{flex:0 0 auto;max-width:34%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
  color:var(--dim);font-size:11.5px;font-family:var(--mono)}
.pvpalnone{padding:22px 17px;color:var(--dim);font-family:var(--sans);font-size:13px;margin:0}
.pvpalfoot{border-top:1px solid var(--line);padding:8px 15px;color:var(--dim);
  font-size:11px;font-family:var(--mono);display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.pvpalfoot span{border:1px solid var(--line);padding:1px 6px;color:var(--bone)}
.pvflag .tbtn{margin-left:auto}
@media(max-width:560px){.pvpal{padding:6vh 10px 10px}.pvpalsub{display:none}}


/* the banner that says this is not the published site */
.pvflag{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:18px;
  padding:10px 14px;border:1px solid var(--rose);background:rgba(240,113,120,.07)}
.pvflag b{color:var(--rose);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase}
.pvflag span{font-family:var(--sans);font-size:12.5px;color:var(--dim)}

@media(max-width:560px){
  .pvcard{padding:15px 14px}
  .pvbar{padding:9px 11px}
  .pvnav button{flex:1 1 auto}
  .pvrbar{flex-basis:52px}
}

/* Last in the sheet on purpose. These override rules defined further up and CSS
   settles ties on source order, so anywhere earlier simply loses — which is
   exactly what happened the first two times. The preview banner and the palette
   tags were using the error colour for things that are not errors. */
.pvflag{border-color:var(--line);background:rgba(126,231,135,.05)}
.pvflag b{color:var(--amber)}
.pvpalkind.k-lab{color:var(--lime)}
${PV_END}
`;
  const pa = html.indexOf(PV_MARK);
  if(pa >= 0){
    const pb = html.indexOf(PV_END);
    html = html.slice(0, pa) + pvcss.trim() + '\n' + html.slice(pb + PV_END.length + 1);
  } else {
    html = html.replace('</style>', pvcss + '</style>');
  }
}

fs.writeFileSync(target, html);
console.log('spliced ' + (engine.length/1024).toFixed(0) + 'KB of engine into ' + path.basename(target));
