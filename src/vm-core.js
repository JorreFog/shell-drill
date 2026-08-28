/* =================== simulated machine ===================
   A small but real Linux: a virtual filesystem with owners, groups and
   permission bits, and a shell that parses pipes, redirection, quoting
   and globs. Commands operate on actual state, so a lab task can be
   verified by inspecting the machine afterwards rather than by matching
   the text the student typed. */
function makeVM(){
  const HOME = "/home/analyst";
  const T0 = 1756598400; // fixed clock keeps output reproducible

  const dnode = (mode, owner, group) => ({t:"d", mode, owner:owner||"root", group:group||"root", mt:T0, ch:{}});
  const fnode = (c, mode, owner, group) => ({t:"f", mode:mode==null?0o644:mode, owner:owner||"root", group:group||"root", mt:T0, c:c||""});
  const lnode = (tgt, owner, group) => ({t:"l", mode:0o777, owner:owner||"root", group:group||"root", mt:T0, tgt});

  const vm = {
    user:"analyst", host:"workstation-07", cwd:HOME, HOME,
    root: dnode(0o755),
    groups:{analyst:["analyst","sudo","users"], root:["root"]},
    users:{root:{uid:0,gid:0,home:"/root",shell:"/bin/bash"},
           analyst:{uid:1000,gid:1000,home:HOME,shell:"/bin/bash"}},
    nextUid:1001, nextGid:1001,
    asRoot:false, hist:[], env:{HOME, USER:"analyst", SHELL:"/bin/bash", PATH:"/usr/local/bin:/usr/bin:/bin"},
    units:{}, sockets:[], procs:[], cron:[], iface:{}, selinux:"Enforcing", firewall:[], keys:{},
    now: T0,
    lastStatus:0
  };

  /* ---------- path handling ---------- */
  const norm = p => {
    const abs = p.startsWith("/");
    const out = [];
    for(const part of p.split("/")){
      if(!part || part===".") continue;
      if(part===".."){ if(out.length) out.pop(); continue; }
      out.push(part);
    }
    return (abs?"/":"") + out.join("/");
  };
  const expand = p => {
    if(p==="~") return vm.HOME;
    if(p.startsWith("~/")) return vm.HOME + p.slice(1);
    return p;
  };
  const abspath = p => {
    p = expand(String(p));
    return norm(p.startsWith("/") ? p : vm.cwd + "/" + p);
  };
  const parts = p => abspath(p).split("/").filter(Boolean);

  // walk to a node; follows symlinks on intermediate components and, unless
  // nofollow, on the final one too
  function lookup(p, nofollow){
    const seg = parts(p);
    let node = vm.root, path = "";
    for(let i=0;i<seg.length;i++){
      if(node.t==="l"){ const r = lookup(node.tgt, false); if(!r.node) return {err:"ENOENT"}; node = r.node; }
      if(node.t!=="d") return {err:"ENOTDIR", path};
      if(!canExec(node)) return {err:"EACCES", path};
      const child = node.ch[seg[i]];
      if(!child) return {err:"ENOENT", path:path+"/"+seg[i], parent:node, name:seg[i], last:i===seg.length-1};
      path += "/"+seg[i];
      node = child;
      if(node.t==="l" && !(nofollow && i===seg.length-1)){
        const r = lookup(node.tgt.startsWith("/") ? node.tgt : path.replace(/\/[^/]*$/,"")+"/"+node.tgt, false);
        if(!r.node) return {err:"ENOENT", path, dangling:true};
        node = r.node;
      }
    }
    return {node, path: abspath(p)};
  }
  const parentOf = p => { const a = abspath(p); return a.replace(/\/[^/]*$/,"") || "/"; };
  const baseOf = p => abspath(p).split("/").filter(Boolean).pop() || "/";

  /* ---------- permissions ---------- */
  const inGroup = g => (vm.groups[vm.user]||[]).includes(g);
  function permBits(n){
    if(vm.asRoot || vm.user==="root") return 7;
    if(n.owner===vm.user) return (n.mode>>6)&7;
    if(inGroup(n.group)) return (n.mode>>3)&7;
    return n.mode&7;
  }
  const canRead  = n => (permBits(n)&4)!==0;
  const canWrite = n => (permBits(n)&2)!==0;
  const canExec  = n => (permBits(n)&1)!==0;

  /* ---------- creation helpers used by seeding ---------- */
  function mkdirp(p, mode, owner, group){
    const seg = parts(p); let node = vm.root, cur="";
    for(const s of seg){
      cur += "/"+s;
      if(!node.ch[s]) node.ch[s] = dnode(mode==null?0o755:mode, owner, group);
      node = node.ch[s];
    }
    return node;
  }
  function put(p, content, mode, owner, group){
    const d = mkdirp(parentOf(p), 0o755, owner, group);
    d.ch[baseOf(p)] = fnode(content, mode, owner, group);
    return d.ch[baseOf(p)];
  }
  vm.mkdirp = mkdirp; vm.put = put; vm.lookup = lookup; vm.abspath = abspath;
  vm.exists = p => !!lookup(p).node;
  vm.read = p => { const r = lookup(p); return r.node && r.node.t==="f" ? r.node.c : null; };
  vm.stat = p => lookup(p).node || null;

  /* ---------- formatting ---------- */
  const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  function modeStr(n){
    const t = n.t==="d" ? "d" : n.t==="l" ? "l" : "-";
    const rwx = b => ((b&4)?"r":"-")+((b&2)?"w":"-")+((b&1)?"x":"-");
    let s = t + rwx((n.mode>>6)&7) + rwx((n.mode>>3)&7) + rwx(n.mode&7);
    if(n.mode & 0o4000) s = s.slice(0,3) + (s[3]==="x"?"s":"S") + s.slice(4);
    if(n.mode & 0o2000) s = s.slice(0,6) + (s[6]==="x"?"s":"S") + s.slice(7);
    return s;
  }
  // a file may declare a size without holding that many bytes, so the seed can
  // include a believably large capture without carrying megabytes around
  const sizeOf = n => n.t==="d" ? 4096 : n.t==="l" ? n.tgt.length
                    : (n.sz != null ? n.sz : n.c.length);
  function dateStr(mt){ const d = new Date(mt*1000);
    return MON[d.getUTCMonth()]+" "+String(d.getUTCDate()).padStart(2," ")+" "+
      String(d.getUTCHours()).padStart(2,"0")+":"+String(d.getUTCMinutes()).padStart(2,"0"); }
  function human(b){
    if(b<1024) return b+"";
    const u = ["K","M","G","T"]; let i=-1, v=b;
    while(v>=1024 && i<3){ v/=1024; i++; }
    return (v<10 ? v.toFixed(1) : Math.round(v)) + u[i];
  }

  /* ---------- tokenizer: quotes, pipes, redirection, operators ---------- */
  function tokenize(src){
    const out = []; let i=0, cur="", q=null, had=false, quoted=null;
    // `quoted` records WHICH quote was used and has to outlive `q`, which the
    // closing quote clears. Single quotes suppress every expansion, double
    // quotes suppress globbing and ~ but still expand variables.
    const push = ()=>{ if(cur!=="" || had) out.push({v:cur, q:quoted}); cur=""; had=false; q=null; quoted=null; };
    while(i<src.length){
      const c = src[i];
      if(q){ if(c===q){ q=null; had=true; } else cur+=c; i++; continue; }
      if(c==='"' || c==="'"){ q=c; had=true; if(!quoted) quoted=c; i++; continue; }
      // $( ... ) and ` ... ` are one token even though they contain spaces
      if(c==="$" && src[i+1]==="("){
        let depth=1, j=i+2, s="$(";
        while(j<src.length && depth>0){ if(src[j]==="(") depth++; if(src[j]===")") depth--;
          if(depth>0) s+=src[j]; j++; }
        cur += s+")"; had=true; i=j; continue;
      }
      if(c==="`"){
        let j=i+1, s="`";
        while(j<src.length && src[j]!=="`"){ s+=src[j]; j++; }
        cur += s+"`"; had=true; i=j+1; continue;
      }
      if(c==="\\" && i+1<src.length){ cur+=src[i+1]; had=true; i+=2; continue; }
      if(/\s/.test(c)){ push(); i++; continue; }
      const three = src.slice(i,i+3), two = src.slice(i,i+2);
      if(three==="2>&1"||two==="2>"){ push(); out.push({op: two==="2>"&&three!=="2>&"?"2>":"2>"}); i+=2; continue; }
      if(two===">>"||two==="&&"||two==="||"){ push(); out.push({op:two}); i+=2; continue; }
      if(c==="|"||c===">"||c==="<"||c===";"){ push(); out.push({op:c}); i++; continue; }
      cur+=c; i++;
    }
    push();
    return out;
  }

  /* ---------- globbing ---------- */
  function glob(pat){
    if(!/[*?[]/.test(pat)) return [pat];
    const dir = pat.includes("/") ? pat.replace(/\/[^/]*$/,"") || "/" : ".";
    const base = pat.includes("/") ? pat.split("/").pop() : pat;
    const r = lookup(dir);
    if(!r.node || r.node.t!=="d") return [pat];
    const rx = new RegExp("^" + base.replace(/[.+^${}()|\\]/g,"\\$&")
      .replace(/\*/g,"[^/]*").replace(/\?/g,"[^/]") + "$");
    const hits = Object.keys(r.node.ch).filter(n => rx.test(n) && (base.startsWith(".") || !n.startsWith(".")))
      .sort().map(n => dir==="." ? n : (dir==="/" ? "/"+n : dir+"/"+n));
    return hits.length ? hits : [pat];
  }

  /* ---------- argument parsing ---------- */
  function splitFlags(argv){
    const flags = new Set(), long = {}, ops = [];
    let noMore = false;
    for(let i=0;i<argv.length;i++){
      const a = argv[i];
      if(noMore){ ops.push(a); continue; }
      if(a==="--"){ noMore=true; continue; }
      if(a.startsWith("--") && a.length>2){
        const [k,v] = a.slice(2).split("="); long[k] = v==null?true:v; continue;
      }
      if(a.startsWith("-") && a.length>1 && !/^-\d+$/.test(a)){
        for(const ch of a.slice(1)) flags.add(ch); continue;
      }
      ops.push(a);
    }
    return {flags, long, ops};
  }
  // value-taking flags (-n 20) need the operand pulled out
  function flagValue(argv, letter){
    for(let i=0;i<argv.length;i++){
      const a = argv[i];
      if(!a.startsWith("-")||a.startsWith("--")) continue;
      const idx = a.indexOf(letter);
      if(idx>0){
        const rest = a.slice(idx+1);
        if(rest) return {val:rest, consume:[i]};
        if(argv[i+1]!=null) return {val:argv[i+1], consume:[i+1]};
      }
    }
    return null;
  }

  const E = {
    noent: p => "cannot access '"+p+"': No such file or directory",
    noentOpen: p => p+": No such file or directory",
    isdir: p => p+": Is a directory",
    notdir: p => p+": Not a directory",
    denied: p => p+": Permission denied",
    notempty: p => "failed to remove '"+p+"': Directory not empty"
  };

  return {vm, tokenize, splitFlags, flagValue, glob, lookup, abspath, parentOf, baseOf,
          modeStr, sizeOf, dateStr, human, permBits, canRead, canWrite, canExec,
          dnode, fnode, lnode, mkdirp, put, norm, E, T0, inGroup};
}
