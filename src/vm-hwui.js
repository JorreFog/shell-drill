/* ===================== the hardware tool's view =====================
   A board you can click, and a chart of how slow things really are. Both are
   drawn from HWPARTS / HWSPEED, so the picture and the words come from one
   source and cannot disagree. The questions live in the ordinary quiz view —
   this entry declares both modes rather than growing its own quiz. */

const HW = {part: "cpu"};

function hwPart(){ return HWPARTS.find(p => p.id === HW.part) || HWPARTS[0]; }

/* the board, generated from the parts' own geometry */
function hwBoardSvg(){
  const W = 504, H = 356;
  const board = HWPARTS.find(p => p.id === "board");
  const fill = {core:"#16202c", storage:"#16202c", card:"#16202c",
                power:"#16202c", security:"#16202c", io:"#16202c", board:"#0d141d"};

  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="hwmap" role="img" '+
          'aria-label="' + esc(t("hwDiagramAlt")) + '">';

  /* case outline */
  s += '<rect x="8" y="8" width="' + (W-16) + '" height="' + (H-16) + '" rx="4" '+
       'fill="none" stroke="var(--line)" stroke-width="1"/>';

  /* The board encloses the parts that sit on it, and SVG paints in document
     order — so drawing it in its authored position put a big semi-transparent
     rect on top of the CPU, cooler, RAM, storage and GPU and swallowed every
     click meant for them. It goes down first, as a backdrop, and stays
     clickable wherever no part covers it. Stable sort, so everything else keeps
     its authored order. */
  const drawOrder = HWPARTS.slice()
    .sort((a, b) => (a.kind === "board" ? 0 : 1) - (b.kind === "board" ? 0 : 1));

  drawOrder.forEach(p => {
    const on = p.id === HW.part;
    const stroke = on ? "var(--amber)" : "var(--line)";
    const width = on ? 2 : 1;
    s += '<g class="hwpart' + (on ? " on" : "") + '" data-part="' + p.id + '" '+
         'tabindex="0" role="button" aria-pressed="' + on + '" '+
         'aria-label="' + esc(plain(L(p.name))) + '">';
    s += '<rect x="' + p.x + '" y="' + p.y + '" width="' + p.w + '" height="' + p.h + '" rx="3" '+
         'fill="' + (fill[p.kind] || "#16202c") + '" fill-opacity="' + (p.id === "board" ? ".55" : ".95") + '" '+
         'stroke="' + stroke + '" stroke-width="' + width + '"/>';
    /* the board's label goes in its corner so it does not sit under the parts */
    const lx = p.id === "board" ? p.x + 9 : p.x + p.w / 2;
    const ly = p.id === "board" ? p.y + 17 : p.y + p.h / 2 + 4;
    s += '<text x="' + lx + '" y="' + ly + '" '+
         'text-anchor="' + (p.id === "board" ? "start" : "middle") + '" '+
         'fill="' + (on ? "var(--amber)" : "var(--dim)") + '" '+
         /* the boxes are about 100px wide, so the diagram uses a short label and
           the list and the detail panel keep the full name */
        'font-size="11" font-family="var(--mono)">' +
         esc(plain(L(p.short || p.name))) + "</text>";
    s += "</g>";
  });
  s += "</svg>";
  return s;
}

/* how long things take, drawn on a log scale because a linear one would show
   six invisible bars and one that fills the page */
function hwSpeedChart(){
  const max = Math.log10(HWSPEED[HWSPEED.length - 1].ns);
  const min = Math.log10(HWSPEED[0].ns);
  return '<div class="hwspeed">' + HWSPEED.map(r => {
    const pct = Math.max(4, ((Math.log10(r.ns) - min) / (max - min)) * 100);
    const ns = r.ns < 1000 ? r.ns + " ns"
             : r.ns < 1000000 ? (r.ns/1000) + " µs"
             : (r.ns/1000000) + " ms";
    return '<div class="hwrow">'+
      '<span class="hwlabel">' + esc(L(r.label)) + "</span>"+
      '<span class="hwbar"><i style="width:' + pct.toFixed(1) + '%"></i></span>'+
      '<span class="hwns">' + ns + "</span>"+
      '<span class="hwhuman">' + esc(L(r.human)) + "</span></div>";
  }).join("") + "</div>";
}

function pvRenderHardware(){
  const v = pvView("pv-hardwareview");
  const p = hwPart();

  v.innerHTML =
    '<div class="cw">'+
      '<div class="chead"><div class="cmeta"><span class="wk">' + t("hwTitle") + "</span>"+
        '<span class="dt">' + HWPARTS.length + " " + t("hwParts") + "</span></div>"+
        "<h1>" + t("hwHeading") + "</h1>"+
        '<p class="cbrief">' + t("hwIntro") + "</p></div>"+

      '<div class="csec"><h2>' + t("hwClickAround") + "</h2>"+
        hwBoardSvg()+
        '<div class="hwinfo">'+
          '<div class="hwname">' + esc(L(p.name)) + '<span>' + esc(L(p.spec)) + "</span></div>"+
          "<p>" + esc(L(p.what)) + "</p>"+
          '<p class="hwsec"><b>' + t("hwWhyItMatters") + "</b> " + esc(L(p.sec)) + "</p>"+
        "</div>"+
      "</div>"+

      '<div class="csec"><h2>' + t("hwSpeedTitle") + "</h2>"+
        '<p class="hwlead">' + t("hwSpeedIntro") + "</p>"+
        hwSpeedChart()+
        '<p class="hwfoot">' + t("hwSpeedFoot") + "</p>"+
      "</div>"+
    "</div>";

  v.querySelectorAll(".hwpart").forEach(g => {
    const pick = () => { HW.part = g.dataset.part; pvRenderHardware();
      if(typeof pvSidebar === "function") pvSidebar("hardware"); };
    g.onclick = pick;
    g.onkeydown = e => { if(e.key === "Enter" || e.key === " "){ e.preventDefault(); pick(); } };
  });
}
