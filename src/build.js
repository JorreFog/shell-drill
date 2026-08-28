/* Splice the simulated machine + new course tab into index.html, replacing the
   previous milestone-based course code. Idempotent: run it again after editing
   any of the engine files and it re-splices from the markers. */
const fs = require('fs'), path = require('path');
const scratch = __dirname;
const target = process.argv[2];
if(!target){ console.error('usage: node build.js <path to index.html>'); process.exit(1); }

const read = f => fs.readFileSync(path.join(scratch, f), 'utf8');
let html = fs.readFileSync(target, 'utf8');

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
  read('vm-courses.js') + '\n' +
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
.lhint{margin-top:7px;background:none;border:0;border-bottom:1px dotted var(--dim);color:var(--dim);
  font-family:var(--mono);font-size:11.5px;cursor:pointer;padding:0}
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
.cnav{display:flex;gap:9px;margin-top:14px;flex-wrap:wrap}
.cnav .tbtn{margin-left:0;padding:9px 15px;font-size:12px}
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
body.picking .wrap{filter:blur(3px) saturate(.6);opacity:.25;pointer-events:none}
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

fs.writeFileSync(target, html);
console.log('spliced ' + (engine.length/1024).toFixed(0) + 'KB of engine into ' + path.basename(target));
