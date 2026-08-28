/* Commands and the shell executor. K is the object returned by makeVM(). */
function attachShell(K){
  const {vm, tokenize, splitFlags, flagValue, glob, lookup, abspath, parentOf, baseOf,
         modeStr, sizeOf, dateStr, human, canRead, canWrite, dnode, fnode, lnode, E} = K;

  const ok  = (out)      => ({out: out==null?"":out, err:"", code:0});
  const bad = (err,code) => ({out:"", err, code:code==null?1:code});
  const lines = s => s==="" ? [] : s.replace(/\n$/,"").split("\n");
  const join  = a => a.length ? a.join("\n")+"\n" : "";

  /* resolve a path for reading, producing the usual shell error text */
  function readFile(p, cmd){
    const r = lookup(p);
    if(!r.node) return {err: cmd+": "+E.noentOpen(p)};
    if(r.node.t==="d") return {err: cmd+": "+E.isdir(p)};
    if(!canRead(r.node)) return {err: cmd+": "+E.denied(p)};
    return {c: r.node.c};
  }
  /* gather input either from operands or from stdin */
  function inputs(ops, stdin, cmd){
    if(!ops.length) return {items:[{name:"", c:stdin}], errs:[]};
    const items=[], errs=[];
    for(const p of ops){
      const r = readFile(p, cmd);
      if(r.err) errs.push(r.err); else items.push({name:p, c:r.c});
    }
    return {items, errs};
  }

  const C = {};

  /* ---------------- navigation & listing ---------------- */
  C.pwd = () => ok(vm.cwd+"\n");

  C.cd = (argv) => {
    const t = argv[0];
    let target;
    if(!t || t==="~") target = vm.HOME;
    else if(t==="-"){ target = vm.oldpwd || vm.HOME; }
    else target = t;
    const r = lookup(target);
    if(!r.node) return bad("cd: "+target+": No such file or directory");
    if(r.node.t!=="d") return bad("cd: "+target+": Not a directory");
    if(!K.canExec(r.node)) return bad("cd: "+target+": Permission denied");
    vm.oldpwd = vm.cwd; vm.cwd = r.path;
    return t==="-" ? ok(vm.cwd+"\n") : ok("");
  };

  C.ls = (argv) => {
    const {flags, ops} = splitFlags(argv);
    const all = flags.has("a"), lng = flags.has("l"), hum = flags.has("h"), dirSelf = flags.has("d");
    const targets = ops.length ? ops : ["."];
    const chunks = [], errs = [];
    for(const t of targets){
      // ls shows a symlink itself rather than its target, unless the link
      // points at a directory whose contents were asked for
      let r = lookup(t, true);
      if(r.node && r.node.t==="l" && !dirSelf){
        const deref = lookup(t, false);
        if(deref.node && deref.node.t==="d") r = deref;
      }
      if(!r.node){ errs.push("ls: "+E.noent(t)); continue; }
      let entries;
      if(r.node.t==="d" && !dirSelf){
        if(!canRead(r.node)){ errs.push("ls: "+E.denied(t)); continue; }
        const names = Object.keys(r.node.ch).sort();
        entries = (all ? [".",".."] : []).concat(names.filter(n=>all||!n.startsWith(".")))
          .map(n => ({n, node: n==="." ? r.node : n===".." ? (lookup(parentOf(r.path)).node||r.node) : r.node.ch[n]}));
      } else {
        entries = [{n:t, node:r.node}];
      }
      let body;
      if(lng){
        const rows = entries.map(e=>{
          const n = e.node;
          const nm = n.t==="l" ? e.n+" -> "+n.tgt : e.n;
          return [modeStr(n), "1", n.owner, n.group,
                  hum ? human(sizeOf(n)) : String(sizeOf(n)), dateStr(n.mt), nm];
        });
        const w = [0,1,2,3,4].map(i => Math.max(...rows.map(r=>r[i].length), 0));
        body = rows.map(r =>
          r[0].padEnd(w[0]) + " " + r[1].padStart(w[1]) + " " + r[2].padEnd(w[2]) + " " +
          r[3].padEnd(w[3]) + " " + r[4].padStart(w[4]) + " " + r[5] + " " + r[6]);
        if(r.node.t==="d" && !dirSelf) body.unshift("total "+entries.length*4);
      } else {
        body = entries.map(e => e.n);
      }
      chunks.push({t, body});
    }
    let out = "";
    if(chunks.length>1) out = chunks.map(c => c.t+":\n"+join(c.body)).join("\n");
    else if(chunks.length) out = join(chunks[0].body);
    return {out, err: errs.join("\n")+(errs.length?"\n":""), code: errs.length?2:0};
  };

  C.tree = (argv) => {
    const root = argv[0] || ".";
    const r = lookup(root);
    if(!r.node) return bad("tree: "+root+": No such file or directory");
    const out = [root]; let nd=0, nf=0;
    (function walk(node, prefix){
      const names = Object.keys(node.ch||{}).filter(n=>!n.startsWith(".")).sort();
      names.forEach((n,i)=>{
        const last = i===names.length-1, child = node.ch[n];
        out.push(prefix + (last?"`-- ":"|-- ") + n);
        if(child.t==="d"){ nd++; walk(child, prefix + (last?"    ":"|   ")); } else nf++;
      });
    })(r.node, "");
    out.push("", nd+" directories, "+nf+" files");
    return ok(join(out));
  };

  /* ---------------- creating & removing ---------------- */
  C.mkdir = (argv) => {
    const {flags, ops} = splitFlags(argv);
    if(!ops.length) return bad("mkdir: missing operand");
    const errs = [];
    for(const p of ops){
      if(flags.has("p")){ K.mkdirp(p, 0o755, vm.user, vm.user); continue; }
      const par = lookup(parentOf(p));
      if(!par.node){ errs.push("mkdir: cannot create directory '"+p+"': No such file or directory"); continue; }
      if(!canWrite(par.node)){ errs.push("mkdir: cannot create directory '"+p+"': Permission denied"); continue; }
      if(par.node.ch[baseOf(p)]){ errs.push("mkdir: cannot create directory '"+p+"': File exists"); continue; }
      par.node.ch[baseOf(p)] = dnode(0o755, vm.user, vm.user);
    }
    return {out:"", err: join(errs), code: errs.length?1:0};
  };

  C.rmdir = (argv) => {
    const {ops} = splitFlags(argv);
    const errs = [];
    for(const p of ops){
      const r = lookup(p);
      if(!r.node){ errs.push("rmdir: failed to remove '"+p+"': No such file or directory"); continue; }
      if(r.node.t!=="d"){ errs.push("rmdir: failed to remove '"+p+"': Not a directory"); continue; }
      if(Object.keys(r.node.ch).length){ errs.push("rmdir: "+E.notempty(p)); continue; }
      delete lookup(parentOf(p)).node.ch[baseOf(p)];
    }
    return {out:"", err: join(errs), code: errs.length?1:0};
  };

  C.touch = (argv) => {
    const {ops} = splitFlags(argv);
    if(!ops.length) return bad("touch: missing file operand");
    const errs = [];
    for(const p of ops){
      const r = lookup(p);
      if(r.node){ r.node.mt = K.T0 + 60; continue; }
      const par = lookup(parentOf(p));
      if(!par.node){ errs.push("touch: cannot touch '"+p+"': No such file or directory"); continue; }
      if(!canWrite(par.node)){ errs.push("touch: cannot touch '"+p+"': Permission denied"); continue; }
      par.node.ch[baseOf(p)] = fnode("", 0o644, vm.user, vm.user);
    }
    return {out:"", err: join(errs), code: errs.length?1:0};
  };

  function copyNode(n){
    if(n.t==="d"){ const d = dnode(n.mode, n.owner, n.group);
      for(const k in n.ch) d.ch[k] = copyNode(n.ch[k]); return d; }
    if(n.t==="l") return lnode(n.tgt, n.owner, n.group);
    return fnode(n.c, n.mode, n.owner, n.group);
  }

  C.cp = (argv) => {
    const {flags, ops} = splitFlags(argv);
    const rec = flags.has("r")||flags.has("R")||flags.has("a");
    if(ops.length<2) return bad("cp: missing destination file operand");
    const dst = ops.pop();
    const dr = lookup(dst);
    const intoDir = dr.node && dr.node.t==="d";
    if(ops.length>1 && !intoDir) return bad("cp: target '"+dst+"' is not a directory");
    const errs = [];
    for(const src of ops){
      const sr = lookup(src);
      if(!sr.node){ errs.push("cp: cannot stat '"+src+"': No such file or directory"); continue; }
      if(sr.node.t==="d" && !rec){ errs.push("cp: -r not specified; omitting directory '"+src+"'"); continue; }
      if(!canRead(sr.node)){ errs.push("cp: cannot open '"+src+"' for reading: Permission denied"); continue; }
      const targetPath = intoDir ? dst.replace(/\/$/,"")+"/"+baseOf(src) : dst;
      const par = lookup(parentOf(targetPath));
      if(!par.node){ errs.push("cp: cannot create regular file '"+targetPath+"': No such file or directory"); continue; }
      if(!canWrite(par.node)){ errs.push("cp: cannot create regular file '"+targetPath+"': Permission denied"); continue; }
      const copy = copyNode(sr.node);
      copy.owner = vm.user; copy.group = vm.user;
      par.node.ch[baseOf(targetPath)] = copy;
    }
    return {out:"", err: join(errs), code: errs.length?1:0};
  };

  C.mv = (argv) => {
    const {ops} = splitFlags(argv);
    if(ops.length<2) return bad("mv: missing destination file operand");
    const dst = ops.pop();
    const dr = lookup(dst);
    const intoDir = dr.node && dr.node.t==="d";
    const errs = [];
    for(const src of ops){
      const sr = lookup(src, true);
      if(!sr.node){ errs.push("mv: cannot stat '"+src+"': No such file or directory"); continue; }
      const targetPath = intoDir ? dst.replace(/\/$/,"")+"/"+baseOf(src) : dst;
      const spar = lookup(parentOf(src)), dpar = lookup(parentOf(targetPath));
      if(!dpar.node){ errs.push("mv: cannot move '"+src+"' to '"+targetPath+"': No such file or directory"); continue; }
      if(!canWrite(dpar.node) || !canWrite(spar.node)){ errs.push("mv: cannot move '"+src+"': Permission denied"); continue; }
      dpar.node.ch[baseOf(targetPath)] = sr.node;
      delete spar.node.ch[baseOf(src)];
    }
    return {out:"", err: join(errs), code: errs.length?1:0};
  };

  C.rm = (argv) => {
    const {flags, ops} = splitFlags(argv);
    const rec = flags.has("r")||flags.has("R"), force = flags.has("f");
    if(!ops.length) return force ? ok("") : bad("rm: missing operand");
    const errs = [];
    for(const p of ops){
      const r = lookup(p, true);
      if(!r.node){ if(!force) errs.push("rm: cannot remove '"+p+"': No such file or directory"); continue; }
      if(r.node.t==="d" && !rec){ errs.push("rm: cannot remove '"+p+"': Is a directory"); continue; }
      const par = lookup(parentOf(p));
      if(!canWrite(par.node)){ errs.push("rm: cannot remove '"+p+"': Permission denied"); continue; }
      delete par.node.ch[baseOf(p)];
    }
    return {out:"", err: join(errs), code: errs.length?1:0};
  };

  C.ln = (argv) => {
    const {flags, ops} = splitFlags(argv);
    if(!flags.has("s")) return bad("ln: hard links are not simulated here — use ln -s");
    if(ops.length<1) return bad("ln: missing file operand");
    const [target, nameArg] = ops;
    const linkPath = nameArg || baseOf(target);
    const dr = lookup(linkPath);
    const finalPath = (dr.node && dr.node.t==="d") ? linkPath+"/"+baseOf(target) : linkPath;
    const par = lookup(parentOf(finalPath));
    if(!par.node) return bad("ln: failed to create symbolic link '"+finalPath+"': No such file or directory");
    if(par.node.ch[baseOf(finalPath)]) return bad("ln: failed to create symbolic link '"+finalPath+"': File exists");
    par.node.ch[baseOf(finalPath)] = lnode(target, vm.user, vm.user);
    return ok("");
  };

  /* ---------------- reading ---------------- */
  C.cat = (argv, stdin) => {
    const {ops} = splitFlags(argv);
    if(!ops.length) return ok(stdin);
    let out="", errs=[];
    for(const p of ops){ const r = readFile(p, "cat"); if(r.err) errs.push(r.err); else out += r.c; }
    return {out, err: join(errs), code: errs.length?1:0};
  };
  C.less = C.cat; C.more = C.cat;

  C.head = (argv, stdin) => {
    const fv = flagValue(argv, "n");
    let n = 10, rest = argv.slice();
    if(fv){ n = parseInt(fv.val,10); rest = rest.filter((_,i)=>!fv.consume.includes(i)).filter(a=>a!=="-n"); }
    const numeric = argv.find(a=>/^-\d+$/.test(a));
    if(numeric){ n = parseInt(numeric.slice(1),10); rest = rest.filter(a=>a!==numeric); }
    const {ops} = splitFlags(rest.filter(a=>!/^-n$/.test(a)));
    const {items, errs} = inputs(ops, stdin, "head");
    const out = items.map(it => join(lines(it.c).slice(0,n))).join("");
    return {out, err: join(errs), code: errs.length?1:0};
  };

  C.tail = (argv, stdin) => {
    const fv = flagValue(argv, "n");
    let n = 10, rest = argv.slice();
    if(fv){ n = parseInt(fv.val,10); rest = rest.filter((_,i)=>!fv.consume.includes(i)).filter(a=>a!=="-n"); }
    const numeric = argv.find(a=>/^-\d+$/.test(a));
    if(numeric){ n = parseInt(numeric.slice(1),10); rest = rest.filter(a=>a!==numeric); }
    const {flags, ops} = splitFlags(rest.filter(a=>!/^-n$/.test(a)));
    const {items, errs} = inputs(ops, stdin, "tail");
    let out = items.map(it => join(lines(it.c).slice(-n))).join("");
    if(flags.has("f")||flags.has("F")) out += "[follow mode: in a real shell this keeps running — Ctrl+C to stop]\n";
    return {out, err: join(errs), code: errs.length?1:0};
  };

  C.wc = (argv, stdin) => {
    const {flags, ops} = splitFlags(argv);
    const {items, errs} = inputs(ops, stdin, "wc");
    const only = flags.has("l")||flags.has("w")||flags.has("c");
    const rows = items.map(it=>{
      const l = lines(it.c).length, w = it.c.split(/\s+/).filter(Boolean).length, c = it.c.length;
      const cols = [];
      if(flags.has("l")||!only) cols.push(l);
      if(flags.has("w")||!only) cols.push(w);
      if(flags.has("c")||!only) cols.push(c);
      return cols.join(" ") + (it.name?" "+it.name:"");
    });
    return {out: join(rows), err: join(errs), code: errs.length?1:0};
  };

  /* ---------------- searching ---------------- */
  function grepFiles(node, path, acc, hidden){
    if(node.t==="f"){ acc.push({path, c:node.c}); return; }
    if(node.t!=="d" || !canRead(node)) return;
    for(const n of Object.keys(node.ch).sort()){
      if(!hidden && n.startsWith(".")) continue;
      grepFiles(node.ch[n], path==="/"?"/"+n:path+"/"+n, acc, hidden);
    }
  }
  C.grep = (argv, stdin) => {
    const {flags, ops} = splitFlags(argv);
    if(!ops.length) return bad("usage: grep [OPTION]... PATTERN [FILE]...");
    const pat = ops.shift();
    const rec = flags.has("r")||flags.has("R");
    let rx;
    try{ rx = new RegExp(flags.has("F") ? pat.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") : pat, flags.has("i")?"i":""); }
    catch(e){ return bad("grep: invalid pattern"); }
    const targets = [];
    const errs = [];
    if(!ops.length){ targets.push({path:"", c:stdin}); }
    else for(const p of ops){
      const r = lookup(p);
      if(!r.node){ errs.push("grep: "+p+": No such file or directory"); continue; }
      if(r.node.t==="d"){
        if(!rec){ errs.push("grep: "+p+": Is a directory"); continue; }
        grepFiles(r.node, r.path, targets, false);
      } else if(!canRead(r.node)) errs.push("grep: "+p+": Permission denied");
      else targets.push({path:p, c:r.node.c});
    }
    const multi = targets.length>1 || rec;
    const out = [];
    let count = 0;
    // -o prints each match on its own line instead of the whole line
    const rxAll = flags.has("o") ? new RegExp(rx.source, rx.flags.includes("i") ? "gi" : "g") : null;
    for(const t of targets){
      const ls = lines(t.c);
      ls.forEach((l,i)=>{
        const hit = rx.test(l);
        if(flags.has("v") ? hit : !hit) return;
        count++;
        if(flags.has("c")) return;
        let s = "";
        if(multi && t.path) s += t.path+":";
        if(flags.has("n")) s += (i+1)+":";
        if(rxAll){ const ms = l.match(rxAll) || []; ms.forEach(m => out.push(s + m)); return; }
        out.push(s + l);
      });
    }
    if(flags.has("c")) return {out: count+"\n", err: join(errs), code: count?0:1};
    return {out: join(out), err: join(errs), code: out.length?0:1};
  };

  C.find = (argv) => {
    const start = (argv[0] && !argv[0].startsWith("-")) ? argv[0] : ".";
    const r = lookup(start);
    if(!r.node) return bad("find: '"+start+"': No such file or directory");
    const opts = argv.slice(argv[0]===start?1:0);
    const get = k => { const i = opts.indexOf(k); return i>=0 ? opts[i+1] : null; };
    const nameP = get("-name"), typeP = get("-type"), permP = get("-perm"), sizeP = get("-size");
    const maxd = get("-maxdepth") ? parseInt(get("-maxdepth"),10) : Infinity;
    const del = opts.includes("-delete");
    const nameRx = nameP ? new RegExp("^"+nameP.replace(/[.+^${}()|\\]/g,"\\$&")
      .replace(/\*/g,"[^/]*").replace(/\?/g,"[^/]")+"$") : null;
    const hits = [];
    (function walk(node, path, depth){
      const base = path.split("/").pop() || path;
      let match = true;
      if(nameRx && !nameRx.test(base)) match = false;
      if(typeP==="f" && node.t!=="f") match = false;
      if(typeP==="d" && node.t!=="d") match = false;
      if(typeP==="l" && node.t!=="l") match = false;
      if(permP){
        const want = parseInt(permP.replace(/^-/,""),8);
        match = match && (permP.startsWith("-") ? (node.mode & want)===want : node.mode===want);
      }
      if(match) hits.push({path, node});
      if(node.t==="d" && depth<maxd && K.canExec(node))
        for(const n of Object.keys(node.ch).sort())
          walk(node.ch[n], path==="/"?"/"+n:path+"/"+n, depth+1);
    })(r.node, start==="/"?"":start, 0);
    if(del){
      for(const h of hits.slice().reverse()){
        if(h.path===start) continue;
        const par = lookup(parentOf(h.path));
        if(par.node) delete par.node.ch[baseOf(h.path)];
      }
      return ok("");
    }
    const execIdx = opts.indexOf("-exec");
    if(execIdx>=0){
      const cmdParts = opts.slice(execIdx+1).filter(a=>a!==";"&&a!=="\\;"&&a!=="+"&&a!=="{}");
      const results = hits.filter(h=>h.path!==start).map(h => runSimple(cmdParts.concat([h.path]), ""));
      return ok(results.map(r=>r.out).join(""));
    }
    return ok(join(hits.map(h=>h.path||".")));
  };

  C.which = (argv) => {
    const known = Object.keys(C);
    const out = [], errs = [];
    for(const a of argv){
      if(known.includes(a)) out.push("/usr/bin/"+a);
      else errs.push("which: no "+a+" in ("+vm.env.PATH+")");
    }
    return {out: join(out), err: join(errs), code: errs.length?1:0};
  };
  C.type = C.which; C.command = (argv) => C.which(argv.filter(a=>a!=="-v"));

  /* ---------------- text processing ---------------- */
  C.echo = (argv) => {
    const noNl = argv[0]==="-n";
    const parts = (noNl?argv.slice(1):argv).map(a =>
      a.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (m,k) => vm.env[k]!=null ? vm.env[k] : ""));
    return ok(parts.join(" ") + (noNl?"":"\n"));
  };

  C.sort = (argv, stdin) => {
    const {flags, ops} = splitFlags(argv);
    const {items, errs} = inputs(ops, stdin, "sort");
    let ls = items.flatMap(it => lines(it.c));
    if(flags.has("n")) ls.sort((a,b)=>parseFloat(a)-parseFloat(b) || a.localeCompare(b));
    else ls.sort((a,b)=>a.localeCompare(b));
    if(flags.has("r")) ls.reverse();
    if(flags.has("u")) ls = ls.filter((l,i)=>i===0||l!==ls[i-1]);
    return {out: join(ls), err: join(errs), code: errs.length?1:0};
  };

  C.uniq = (argv, stdin) => {
    const {flags, ops} = splitFlags(argv);
    const {items, errs} = inputs(ops, stdin, "uniq");
    const ls = items.flatMap(it => lines(it.c));
    const out = [];
    for(const l of ls){
      if(out.length && out[out.length-1].v===l){ out[out.length-1].n++; continue; }
      out.push({v:l, n:1});
    }
    let res = out;
    if(flags.has("d")) res = res.filter(r=>r.n>1);
    if(flags.has("u")) res = res.filter(r=>r.n===1);
    return {out: join(res.map(r => flags.has("c") ? String(r.n).padStart(7)+" "+r.v : r.v)),
            err: join(errs), code:0};
  };

  C.cut = (argv, stdin) => {
    const dv = flagValue(argv, "d"), fvv = flagValue(argv, "f");
    const delim = dv ? dv.val : "\t";
    const fieldSpec = fvv ? fvv.val : null;
    if(!fieldSpec) return bad("cut: you must specify a list of fields (-f)");
    const wanted = fieldSpec.split(",").flatMap(s=>{
      if(s.includes("-")){ const [a,b]=s.split("-").map(Number); const r=[]; for(let i=a;i<=b;i++) r.push(i); return r; }
      return [Number(s)];
    });
    const consumed = new Set([...(dv?dv.consume:[]), ...(fvv?fvv.consume:[])]);
    const rest = argv.filter((a,i)=>!consumed.has(i) && !/^-[df]/.test(a));
    const {ops} = splitFlags(rest);
    const {items, errs} = inputs(ops, stdin, "cut");
    const out = items.flatMap(it => lines(it.c).map(l =>
      wanted.map(i => l.split(delim)[i-1] ?? "").join(delim)));
    return {out: join(out), err: join(errs), code: errs.length?1:0};
  };

  C.awk = (argv, stdin) => {
    let fs = null, rest = argv.slice();
    const fv = flagValue(argv, "F");
    if(fv){ fs = fv.val; rest = rest.filter((a,i)=>!fv.consume.includes(i) && !/^-F/.test(a)); }
    const prog = rest.shift() || "";
    const {ops} = splitFlags(rest);
    const {items, errs} = inputs(ops, stdin, "awk");
    const m = prog.match(/^\s*(?:\/([^/]*)\/\s*)?\{\s*print\s*(.*?)\s*\}\s*$/);
    if(!m) return bad("awk: only '{print ...}' programs are simulated here");
    const filter = m[1] ? new RegExp(m[1]) : null;
    const expr = m[2] || "$0";
    const out = [];
    for(const it of items) for(const l of lines(it.c)){
      if(filter && !filter.test(l)) continue;
      const f = fs==null ? l.trim().split(/\s+/) : l.split(fs);
      out.push(expr.split(",").map(part=>{
        part = part.trim();
        if(part==="$0") return l;
        const dm = part.match(/^\$(\d+)$/);
        if(dm) return f[Number(dm[1])-1] ?? "";
        if(part==="NF") return String(f.length);
        return part.replace(/^["']|["']$/g,"");
      }).join(" "));
    }
    return {out: join(out), err: join(errs), code:0};
  };

  C.sed = (argv, stdin) => {
    const inPlace = argv.includes("-i");
    const rest = argv.filter(a=>a!=="-i");
    const prog = rest.shift() || "";
    const m = prog.match(/^s(.)(.*?)\1(.*?)\1([gi]*)$/);
    if(!m) return bad("sed: only s/old/new/ substitution is simulated here");
    const rx = new RegExp(m[2], (m[4].includes("g")?"g":"") + (m[4].includes("i")?"i":""));
    const {ops} = splitFlags(rest);
    const {items, errs} = inputs(ops, stdin, "sed");
    if(inPlace && ops.length){
      for(const p of ops){ const r = lookup(p); if(r.node && r.node.t==="f") r.node.c = r.node.c.replace(rx, m[3]); }
      return {out:"", err: join(errs), code:0};
    }
    const out = items.map(it => it.c.replace(rx, m[3])).join("");
    return {out, err: join(errs), code:0};
  };

  C.tee = (argv, stdin) => {
    const {flags, ops} = splitFlags(argv);
    for(const p of ops){
      const par = lookup(parentOf(p));
      if(!par.node) continue;
      const ex = par.node.ch[baseOf(p)];
      if(ex && ex.t==="f") ex.c = flags.has("a") ? ex.c + stdin : stdin;
      else par.node.ch[baseOf(p)] = fnode(stdin, 0o644, vm.user, vm.user);
    }
    return ok(stdin);
  };

  C.xargs = (argv, stdin) => {
    const args = lines(stdin).filter(Boolean);
    if(!argv.length) return ok(args.join(" ")+"\n");
    const r = runSimple(argv.concat(args), "");
    return r;
  };

  /* ---------------- permissions & identity ---------------- */
  function applySymbolic(node, spec){
    const m = spec.match(/^([ugoa]*)([+-=])([rwxst]*)$/);
    if(!m) return false;
    const who = m[1] || "a", op = m[2];
    let bits = 0;
    if(m[3].includes("r")) bits |= 4;
    if(m[3].includes("w")) bits |= 2;
    if(m[3].includes("x")) bits |= 1;
    const shifts = [];
    if(who.includes("u")||who.includes("a")) shifts.push(6);
    if(who.includes("g")||who.includes("a")) shifts.push(3);
    if(who.includes("o")||who.includes("a")) shifts.push(0);
    for(const s of shifts){
      if(op==="+") node.mode |= bits<<s;
      else if(op==="-") node.mode &= ~(bits<<s);
      else node.mode = (node.mode & ~(7<<s)) | (bits<<s);
    }
    if(m[3].includes("s")){ if(who.includes("u")) node.mode |= 0o4000; if(who.includes("g")) node.mode |= 0o2000; }
    return true;
  }
  C.chmod = (argv) => {
    const {flags, ops} = splitFlags(argv);
    if(ops.length<2) return bad("chmod: missing operand");
    const spec = ops.shift();
    const errs = [];
    const apply = (node) => {
      if(/^[0-7]{3,4}$/.test(spec)) node.mode = parseInt(spec,8);
      else if(!applySymbolic(node, spec)) return false;
      return true;
    };
    for(const p of ops){
      const r = lookup(p);
      if(!r.node){ errs.push("chmod: cannot access '"+p+"': No such file or directory"); continue; }
      if(r.node.owner!==vm.user && !vm.asRoot && vm.user!=="root"){
        errs.push("chmod: changing permissions of '"+p+"': Operation not permitted"); continue; }
      if(!apply(r.node)){ errs.push("chmod: invalid mode: '"+spec+"'"); continue; }
      if(flags.has("R")) (function rec(n){ if(n.t!=="d") return;
        for(const k in n.ch){ apply(n.ch[k]); rec(n.ch[k]); } })(r.node);
    }
    return {out:"", err: join(errs), code: errs.length?1:0};
  };

  C.chown = (argv) => {
    const {flags, ops} = splitFlags(argv);
    if(ops.length<2) return bad("chown: missing operand");
    const spec = ops.shift();
    const [o,g] = spec.split(":");
    if(!vm.asRoot && vm.user!=="root") return bad("chown: changing ownership of '"+ops[0]+"': Operation not permitted");
    const errs = [];
    for(const p of ops){
      const r = lookup(p);
      if(!r.node){ errs.push("chown: cannot access '"+p+"': No such file or directory"); continue; }
      const set = n => { if(o) n.owner = o; if(g!=null && g!=="") n.group = g; };
      set(r.node);
      if(flags.has("R")) (function rec(n){ if(n.t!=="d") return; for(const k in n.ch){ set(n.ch[k]); rec(n.ch[k]); } })(r.node);
    }
    return {out:"", err: join(errs), code: errs.length?1:0};
  };

  C.chgrp = (argv) => {
    const {ops} = splitFlags(argv);
    if(ops.length<2) return bad("chgrp: missing operand");
    return C.chown([":"+ops[0]].concat(ops.slice(1)));
  };

  C.whoami = () => ok((vm.asRoot?"root":vm.user)+"\n");
  C.groups = () => ok((vm.groups[vm.user]||[]).join(" ")+"\n");
  C.id = () => {
    const u = vm.asRoot ? "root" : vm.user;
    const info = vm.users[u] || {uid:1000,gid:1000};
    const gs = (vm.groups[u]||[u]).map((g,i)=>(i===0?info.gid:1000+i)+"("+g+")").join(",");
    return ok("uid="+info.uid+"("+u+") gid="+info.gid+"("+u+") groups="+gs+"\n");
  };
  C.useradd = (argv) => {
    const {flags, ops} = splitFlags(argv);
    if(!vm.asRoot && vm.user!=="root") return bad("useradd: Permission denied.");
    const name = ops[0];
    if(!name) return bad("useradd: missing operand");
    if(vm.users[name]) return bad("useradd: user '"+name+"' already exists");
    vm.users[name] = {uid: vm.nextUid, gid: vm.nextGid, home:"/home/"+name, shell:"/bin/bash"};
    vm.groups[name] = [name];
    const pw = lookup("/etc/passwd").node;
    if(pw) pw.c += name+":x:"+vm.nextUid+":"+vm.nextGid+"::/home/"+name+":/bin/bash\n";
    vm.nextUid++; vm.nextGid++;
    if(flags.has("m")) K.mkdirp("/home/"+name, 0o755, name, name);
    return ok("");
  };
  C.adduser = C.useradd;
  C.groupadd = (argv) => {
    const {ops} = splitFlags(argv);
    if(!vm.asRoot && vm.user!=="root") return bad("groupadd: Permission denied.");
    const g = ops[0];
    if(!g) return bad("groupadd: missing operand");
    if(vm.allGroups && vm.allGroups.includes(g)) return bad("groupadd: group '"+g+"' already exists");
    vm.allGroups = (vm.allGroups||[]).concat([g]);
    const gf = lookup("/etc/group").node;
    if(gf) gf.c += g+":x:"+vm.nextGid+":\n";
    vm.nextGid++;
    return ok("");
  };
  C.usermod = (argv) => {
    const {ops, flags} = splitFlags(argv);
    if(!vm.asRoot && vm.user!=="root") return bad("usermod: Permission denied.");
    const fv = flagValue(argv, "G");
    const user = ops[ops.length-1];
    if(!vm.users[user]) return bad("usermod: user '"+user+"' does not exist");
    if(fv) for(const g of fv.val.split(",")){
      vm.groups[user] = (vm.groups[user]||[user]).concat(g).filter((v,i,a)=>a.indexOf(v)===i);
    }
    return ok("");
  };
  C.passwd = (argv) => {
    const who = argv.filter(a=>!a.startsWith("-"))[0] || vm.user;
    if(who!==vm.user && !vm.asRoot && vm.user!=="root") return bad("passwd: You may not view or modify password information for "+who+".");
    return ok("Changing password for "+who+".\nNew password: \nRetype new password: \npasswd: password updated successfully\n");
  };
  C.getenforce = () => ok(vm.selinux+"\n");
  C.sestatus = () => ok("SELinux status:                 enabled\nCurrent mode:                   "+
    vm.selinux.toLowerCase()+"\nPolicy from config file:        targeted\n");
  C.umask = () => ok("0022\n");

  /* ---------------- system ---------------- */
  C.uname = (argv) => {
    const {flags} = splitFlags(argv);
    const rel = "6.9.7-arch1-1";
    if(flags.has("a")) return ok("Linux "+vm.host+" "+rel+" #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux\n");
    if(flags.has("r")) return ok(rel+"\n");
    return ok("Linux\n");
  };
  C.hostname = () => ok(vm.host+"\n");
  C.date = () => ok("Thu Aug 31 09:00:00 UTC 2026\n");
  C.uptime = () => ok(" 09:00:00 up 3 days,  2:14,  1 user,  load average: 0.08, 0.12, 0.09\n");
  C.free = (argv) => {
    const h = splitFlags(argv).flags.has("h");
    return ok(h
      ? "               total        used        free      shared  buff/cache   available\nMem:            15Gi       3.1Gi       8.4Gi       412Mi       4.1Gi        11Gi\nSwap:          4.0Gi          0B       4.0Gi\n"
      : "               total        used        free      shared  buff/cache   available\nMem:        16116432     3251200     8812340      421900     4052892    11544120\nSwap:        4194300           0     4194300\n");
  };
  C.df = (argv) => {
    const h = splitFlags(argv).flags.has("h");
    return ok(h
      ? "Filesystem      Size  Used Avail Use% Mounted on\n/dev/sda2       234G   89G  133G  41% /\n/dev/sda1       511M   62M  450M  13% /boot\ntmpfs           7.7G  412M  7.3G   6% /dev/shm\n"
      : "Filesystem     1K-blocks      Used Available Use% Mounted on\n/dev/sda2      245117440  93323264 139312128  41% /\n/dev/sda1         523248     63488    459760  13% /boot\n");
  };
  C.du = (argv) => {
    const {flags, ops} = splitFlags(argv);
    const targets = ops.length?ops:["."];
    const out = [];
    for(const p of ops.length?ops:["."]){
      const r = lookup(p);
      if(!r.node){ return bad("du: cannot access '"+p+"': No such file or directory"); }
      const size = (function sz(n){ if(n.t!=="d") return Math.max(4, Math.ceil(sizeOf(n)/1024)*1);
        let t = 4; for(const k in n.ch) t += sz(n.ch[k]); return t; })(r.node);
      out.push((flags.has("h") ? human(size*1024) : String(size)) + "\t" + p);
    }
    return ok(join(out));
  };
  C.lsblk = () => ok("NAME   MAJ:MIN RM   SIZE RO TYPE MOUNTPOINTS\nsda      8:0    0 238.5G  0 disk\n|-sda1   8:1    0   512M  0 part /boot\n`-sda2   8:2    0   238G  0 part /\n");
  C.lscpu = () => ok("Architecture:            x86_64\nCPU(s):                  8\nModel name:              Intel(R) Core(TM) i7-1165G7\nThread(s) per core:      2\nCore(s) per socket:      4\n");
  C.ps = (argv) => {
    const rows = vm.procs.map(p => String(p.pid).padStart(5)+" "+p.user.padEnd(8)+" "+p.cpu.padStart(4)+" "+p.cmd);
    return ok("  PID USER      %CPU COMMAND\n"+rows.join("\n")+"\n");
  };
  C.kill = (argv) => {
    const pid = Number(argv.filter(a=>!a.startsWith("-")).pop());
    const i = vm.procs.findIndex(p=>p.pid===pid);
    if(i<0) return bad("kill: ("+pid+") - No such process");
    vm.procs.splice(i,1); return ok("");
  };
  C.pkill = (argv) => {
    const pat = argv.filter(a=>!a.startsWith("-")).join(" ");
    const before = vm.procs.length;
    vm.procs = vm.procs.filter(p => !p.cmd.includes(pat));
    return before===vm.procs.length ? {out:"",err:"",code:1} : ok("");
  };
  C.pgrep = (argv) => {
    const pat = argv.filter(a=>!a.startsWith("-")).join(" ");
    const hits = vm.procs.filter(p=>p.cmd.includes(pat));
    return {out: join(hits.map(p=>p.pid+" "+p.cmd)), err:"", code: hits.length?0:1};
  };
  C.history = () => ok(join(vm.hist.map((h,i)=>String(i+1).padStart(5)+"  "+h)));
  C.clear = () => ({out:"", err:"", code:0, clear:true});

  C.systemctl = (argv) => {
    const {flags, long, ops} = splitFlags(argv);
    const sub = ops[0], name = (ops[1]||"").replace(/\.service$/,"");
    const u = n => vm.units[n];
    if(!sub || sub==="list-units"){
      if(long["failed"]) {
        const f = Object.entries(vm.units).filter(([,v])=>v.state==="failed");
        return ok(f.length ? join(f.map(([n])=>n+".service loaded failed failed")) : "0 loaded units listed.\n");
      }
      return ok(join(Object.entries(vm.units).map(([n,v])=>n+".service loaded "+v.state)));
    }
    if(sub==="status"){
      if(!u(name)) return {out:"Unit "+name+".service could not be found.\n", err:"", code:4};
      const v = u(name);
      return {out:"* "+name+".service - "+v.desc+"\n     Loaded: loaded (/lib/systemd/system/"+name+".service; "+
        (v.enabled?"enabled":"disabled")+")\n     Active: "+(v.state==="running"?"active (running)":"inactive (dead)")+
        "\n   Main PID: "+(v.state==="running"?v.pid:"-")+"\n", err:"", code: v.state==="running"?0:3};
    }
    if(!u(name) && ["start","stop","restart","enable","disable"].includes(sub))
      return bad("Failed to "+sub+" "+name+".service: Unit "+name+".service not found.");
    if(sub==="start"||sub==="restart"){ u(name).state="running"; return ok(""); }
    if(sub==="stop"){ u(name).state="dead"; return ok(""); }
    if(sub==="enable"){ u(name).enabled=true; if(long["now"]) u(name).state="running"; return ok(""); }
    if(sub==="disable"){ u(name).enabled=false; return ok(""); }
    if(sub==="is-enabled") return {out:(u(name)&&u(name).enabled?"enabled":"disabled")+"\n", err:"", code:0};
    if(sub==="is-active") return {out:(u(name)&&u(name).state==="running"?"active":"inactive")+"\n", err:"", code:0};
    if(sub==="get-default") return ok("graphical.target\n");
    return bad("systemctl: unknown command '"+sub+"'");
  };

  C.journalctl = (argv) => {
    const {flags, long} = splitFlags(argv);
    const uv = flagValue(argv, "u"), nv = flagValue(argv, "n"), pv = flagValue(argv, "p");
    let ls = vm.journal.slice();
    if(uv) ls = ls.filter(l => l.unit === uv.val.replace(/\.service$/,""));
    if(pv){ const rank = {emerg:0,alert:1,crit:2,err:3,warning:4,notice:5,info:6,debug:7};
      const want = isNaN(+pv.val) ? rank[pv.val] : +pv.val;
      ls = ls.filter(l => (rank[l.pri]!=null?rank[l.pri]:6) <= want); }
    if(nv) ls = ls.slice(-parseInt(nv.val,10));
    let out = join(ls.map(l => l.time+" "+vm.host+" "+l.unit+": "+l.msg));
    if(flags.has("f")) out += "[follow mode: in a real shell this keeps running — Ctrl+C to stop]\n";
    return ok(out);
  };

  const CRONFILE = "/var/spool/cron/analyst";
  C.crontab = (argv) => {
    const {flags} = splitFlags(argv);
    if(flags.has("l")){
      const c = (lookup(CRONFILE).node||{}).c;
      return c ? ok(c) : {out:"", err:"no crontab for "+vm.user+"\n", code:1};
    }
    if(flags.has("e")){
      K.mkdirp("/var/spool/cron", 0o755, "root", "root");
      if(!lookup(CRONFILE).node) K.put(CRONFILE, "# m h dom mon dow  command\n", 0o600, vm.user, vm.user);
      return {out:"", err:"", code:0, editor: CRONFILE};
    }
    return bad("crontab: usage error");
  };

  /* A real editor is impossible in a text terminal, so `edit` hands the path
     back to the page, which opens a small editor pane bound to this file. */
  C.edit = (argv) => {
    const p = argv.filter(a=>!a.startsWith("-"))[0];
    if(!p) return bad("edit: which file? try: edit ~/py/hello.py");
    const abs = K.abspath(p);
    const r = lookup(abs);
    if(r.node && r.node.t === "d") return bad("edit: "+p+": Is a directory");
    if(!r.node){
      const par = lookup(parentOf(abs));
      if(!par.node) return bad("edit: "+p+": No such file or directory — create the directory first with mkdir -p");
      if(!canWrite(par.node)) return bad("edit: "+p+": Permission denied");
      par.node.ch[baseOf(abs)] = fnode("", 0o644, vm.user, vm.user);
    } else if(!canWrite(r.node)) return bad("edit: "+p+": Permission denied");
    return {out:"", err:"", code:0, editor: abs};
  };
  C.nano = C.edit; C.vim = C.edit; C.vi = C.edit;

  /* ---------------- networking ---------------- */
  C.ip = (argv) => {
    const sub = (argv[0]||"").replace(/^-/,"");
    if(/^a/.test(sub)) return ok(Object.entries(vm.iface).map(([n,v],i)=>
      (i+1)+": "+n+": <"+v.flags+"> mtu 1500 state "+v.state+"\n    inet "+v.addr+" scope global "+n).join("\n")+"\n");
    if(/^r/.test(sub)) return ok("default via "+vm.gateway+" dev eth0 proto dhcp metric 100\n"+
      vm.subnet+" dev eth0 proto kernel scope link src "+vm.iface.eth0.addr.split("/")[0]+"\n");
    if(/^l/.test(sub)) return ok(Object.keys(vm.iface).join("\n")+"\n");
    return bad("Usage: ip [ address | route | link ]");
  };
  C.ifconfig = () => C.ip(["a"]);
  C.ss = (argv) => {
    const {flags} = splitFlags(argv);
    const rows = vm.sockets
      .filter(s => (!flags.has("t")&&!flags.has("u")) || (flags.has("t")&&s.proto==="tcp") || (flags.has("u")&&s.proto==="udp"))
      .filter(s => !flags.has("l") || s.state==="LISTEN");
    const showPid = flags.has("p") && (vm.asRoot||vm.user==="root");
    return ok("Netid State  Local Address:Port   Peer Address:Port"+(flags.has("p")?"  Process":"")+"\n"+
      rows.map(s=>s.proto.padEnd(6)+s.state.padEnd(7)+(s.addr+":"+s.port).padEnd(21)+"*:*"+
        (flags.has("p")?("  "+(showPid?'users:(("'+s.proc+'",pid='+s.pid+'))':"")):"")).join("\n")+"\n");
  };
  C.netstat = C.ss;
  C.ping = (argv) => {
    const cv = flagValue(argv, "c");
    const host = argv.filter(a=>!a.startsWith("-") && a!==(cv&&cv.val)).pop();
    if(!host) return bad("ping: usage error: Destination address required");
    const n = cv ? Math.min(parseInt(cv.val,10), 10) : 4;
    const known = vm.dns[host] || (/^\d+\.\d+\.\d+\.\d+$/.test(host) ? host : null);
    if(!known) return {out:"", err:"ping: "+host+": Name or service not known\n", code:2};
    const rows = [];
    for(let i=0;i<n;i++) rows.push("64 bytes from "+known+": icmp_seq="+(i+1)+" ttl=56 time="+(11+i*0.4).toFixed(1)+" ms");
    return ok("PING "+host+" ("+known+") 56(84) bytes of data.\n"+rows.join("\n")+
      "\n\n--- "+host+" ping statistics ---\n"+n+" packets transmitted, "+n+" received, 0% packet loss\n");
  };
  C.dig = (argv) => {
    const host = argv.filter(a=>!a.startsWith("+")&&!a.startsWith("-"))[0];
    const ip = vm.dns[host];
    if(argv.includes("+short")) return ip ? ok(ip+"\n") : ok("");
    if(!ip) return ok(";; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN\n");
    return ok(";; ANSWER SECTION:\n"+host+".\t\t300\tIN\tA\t"+ip+"\n");
  };
  C.host = (argv) => { const ip = vm.dns[argv[0]];
    return ip ? ok(argv[0]+" has address "+ip+"\n") : {out:"", err:"Host "+argv[0]+" not found\n", code:1}; };
  C.nslookup = C.host;
  C.curl = (argv) => {
    const {flags, ops} = splitFlags(argv);
    const url = ops[0]||"";
    const site = vm.web[url.replace(/^https?:\/\//,"").replace(/\/$/,"")];
    if(!site) return {out:"", err:"curl: (6) Could not resolve host\n", code:6};
    if(flags.has("I")) return ok("HTTP/1.1 200 OK\r\nServer: "+site.server+"\r\nContent-Type: text/html\r\nContent-Length: "+site.body.length+"\r\n\r\n");
    return ok(site.body+"\n");
  };
  C.wget = (argv) => {
    const url = argv.filter(a=>!a.startsWith("-"))[0]||"";
    const name = url.split("/").pop() || "index.html";
    const site = vm.web[url.replace(/^https?:\/\//,"").replace(/\/$/,"")];
    if(!site) return {out:"", err:"wget: unable to resolve host address\n", code:4};
    K.put(vm.cwd+"/"+name, site.body, 0o644, vm.user, vm.user);
    return ok("'"+name+"' saved ["+site.body.length+"]\n");
  };
  C.nc = (argv) => {
    const {flags, ops} = splitFlags(argv);
    const [h,p] = ops;
    const open = (vm.remote[h]||[]).includes(Number(p));
    if(!flags.has("z")) return bad("nc: only -z (scan) is simulated here");
    return open ? ok("Connection to "+h+" "+p+" port [tcp/*] succeeded!\n")
                : {out:"", err:"nc: connect to "+h+" port "+p+" (tcp) failed: Connection refused\n", code:1};
  };
  C.traceroute = (argv) => {
    const h = argv.filter(a=>!a.startsWith("-"))[0];
    const ip = vm.dns[h];
    if(!ip) return bad("traceroute: unknown host "+h);
    return ok("traceroute to "+h+" ("+ip+"), 30 hops max\n 1  "+vm.gateway+"  0.9 ms\n 2  10.44.0.1  8.2 ms\n 3  "+ip+"  12.4 ms\n");
  };
  C.ssh = (argv) => ok("[ssh is not simulated — this machine is the one you are practising on]\n");
  C["ssh-keygen"] = (argv) => {
    const tv = flagValue(argv, "t");
    const type = tv ? tv.val : "rsa";
    const path = vm.HOME+"/.ssh/id_"+type;
    K.mkdirp(vm.HOME+"/.ssh", 0o700, vm.user, vm.user);
    K.put(path, "PRIVATE KEY ("+type+")\n", 0o600, vm.user, vm.user);
    K.put(path+".pub", "ssh-"+type+" AAAAC3Nza"+type+" "+vm.user+"@"+vm.host+"\n", 0o644, vm.user, vm.user);
    return ok("Generating public/private "+type+" key pair.\nYour identification has been saved in "+path+
      "\nYour public key has been saved in "+path+".pub\n");
  };

  /* ---------------- archives & integrity ---------------- */
  function hash(s){ let h = 0x811c9dc5;
    for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193)>>>0; }
    return h.toString(16).padStart(8,"0").repeat(8).slice(0,64); }
  C.sha256sum = (argv, stdin) => {
    const {ops} = splitFlags(argv);
    const {items, errs} = inputs(ops, stdin, "sha256sum");
    return {out: join(items.map(it => hash(it.c)+"  "+(it.name||"-"))), err: join(errs), code: errs.length?1:0};
  };
  C.md5sum = C.sha256sum;

  C.tar = (argv) => {
    const spec = argv.find(a=>/^-?[cxtvzjJf]+$/.test(a) && /[cxt]/.test(a)) || "";
    const letters = spec.replace(/^-/,"");
    const fIdx = argv.indexOf(spec);
    const rest = argv.slice(fIdx+1).filter(a=>!a.startsWith("-"));
    const archive = rest[0];
    const members = rest.slice(1);
    const create = letters.includes("c"), extract = letters.includes("x"), list = letters.includes("t");
    const verbose = letters.includes("v");
    if(!letters.includes("f")) return bad("tar: Refusing to read archive contents from terminal");
    if(letters.indexOf("f") !== letters.length-1)
      return bad("tar: "+(archive||"")+": Cannot open: No such file or directory\ntar: Error is not recoverable: exiting now");
    const wantZ = letters.includes("z"), wantJ = letters.includes("j"), wantX = letters.includes("J");
    if(create){
      if(!members.length) return bad("tar: Cowardly refusing to create an empty archive");
      const collected = [];
      for(const m of members){
        const r = lookup(m);
        if(!r.node) return bad("tar: "+m+": Cannot stat: No such file or directory");
        (function walk(n, p){
          if(n.t==="d"){ collected.push({p:p+"/", d:true});
            for(const k of Object.keys(n.ch).sort()) walk(n.ch[k], p+"/"+k); }
          else collected.push({p, c:n.c, mode:n.mode});
        })(r.node, m.replace(/\/$/,""));
      }
      const fmt = wantJ ? "bzip2" : wantX ? "xz" : wantZ ? "gzip" : "tar";
      K.put(archive, JSON.stringify({fmt, files:collected}), 0o644, vm.user, vm.user);
      return ok(verbose ? join(collected.map(f=>f.p)) : "");
    }
    const ar = lookup(archive);
    if(!ar.node) return bad("tar: "+archive+": Cannot open: No such file or directory");
    let data; try{ data = JSON.parse(ar.node.c); }catch(e){ return bad("tar: This does not look like a tar archive"); }
    const asked = wantJ ? "bzip2" : wantX ? "xz" : wantZ ? "gzip" : null;
    if(asked && data.fmt !== asked){
      const tool = asked==="bzip2" ? "bzip2" : asked==="xz" ? "xz" : "gzip";
      return bad(tool+": (stdin) is not a "+asked+" file\ntar: Child returned status "+(asked==="xz"?1:2));
    }
    if(list) return ok(join(data.files.map(f=>f.p)));
    for(const f of data.files){
      if(f.d) K.mkdirp(f.p, 0o755, vm.user, vm.user);
      else K.put(f.p, f.c, f.mode, vm.user, vm.user);
    }
    return ok(verbose ? join(data.files.map(f=>f.p)) : "");
  };

  C.rsync = (argv) => {
    const {flags, long, ops} = splitFlags(argv);
    if(ops.length<2) return bad("rsync: missing destination");
    const [src, dst] = ops;
    const sr = lookup(src.replace(/\/$/,""));
    if(!sr.node) return bad("rsync: link_stat \""+src+"\" failed: No such file or directory (2)");
    const dry = long["dry-run"] || flags.has("n");
    const transferred = [];
    const deleted = [];
    const dstNode = lookup(dst).node;
    (function walk(n, rel){
      if(n.t==="d"){ for(const k of Object.keys(n.ch).sort()) walk(n.ch[k], rel?rel+"/"+k:k); }
      else transferred.push(rel);
    })(sr.node, "");
    if(long["delete"] && dstNode && dstNode.t==="d"){
      const srcNames = new Set(transferred);
      (function walk(n, rel){
        if(n.t==="d"){ for(const k of Object.keys(n.ch).sort()) walk(n.ch[k], rel?rel+"/"+k:k); }
        else if(!srcNames.has(rel)) deleted.push(rel);
      })(dstNode, "");
    }
    if(!dry){
      const base = dst.replace(/\/$/,"") + (src.endsWith("/") ? "" : "/"+baseOf(src));
      for(const rel of transferred){
        const r = lookup(src.replace(/\/$/,"")+"/"+rel) ;
        K.put(base+"/"+rel, r.node ? r.node.c : "", 0o644, vm.user, vm.user);
      }
      if(long["delete"]) for(const rel of deleted){
        const p = dst.replace(/\/$/,"")+"/"+rel, par = lookup(parentOf(p));
        if(par.node) delete par.node.ch[baseOf(p)];
      }
    }
    return ok("sending incremental file list\n"+
      transferred.map(t=>t).join("\n")+(transferred.length?"\n":"")+
      deleted.map(d=>"deleting "+d).join("\n")+(deleted.length?"\n":"")+
      "\nsent "+(transferred.length*120+180)+" bytes  received 35 bytes\n"+
      (dry?"(DRY RUN — nothing was actually transferred)\n":""));
  };

  /* ---------------- git (enough for the backup/versioning week) --------- */
  C.git = (argv) => {
    const sub = argv[0];
    const repo = () => { let d = vm.cwd;
      while(true){ if(lookup(d+"/.git").node) return d; if(d==="/") return null; d = parentOf(d); } };
    if(sub==="init"){ K.mkdirp(vm.cwd+"/.git", 0o755, vm.user, vm.user);
      vm.git = {branch:"main", staged:[], commits:[]};
      return ok("Initialized empty Git repository in "+vm.cwd+"/.git/\n"); }
    if(!repo()) return bad("fatal: not a git repository (or any of the parent directories): .git");
    vm.git = vm.git || {branch:"main", staged:[], commits:[]};
    if(sub==="add"){ const files = argv.slice(1);
      const expanded = files.includes(".") ? Object.keys(lookup(vm.cwd).node.ch).filter(n=>n!==".git") : files;
      vm.git.staged = vm.git.staged.concat(expanded).filter((v,i,a)=>a.indexOf(v)===i);
      return ok(""); }
    if(sub==="commit"){
      const mi = argv.indexOf("-m");
      if(mi<0) return bad("Aborting commit due to empty commit message.");
      if(!vm.git.staged.length) return {out:"nothing to commit, working tree clean\n", err:"", code:1};
      const msg = argv[mi+1]||"";
      vm.git.commits.push({msg, files: vm.git.staged.slice(), id: (1000+vm.git.commits.length).toString(16)+"a3f"});
      const n = vm.git.staged.length; vm.git.staged = [];
      return ok("["+vm.git.branch+" "+vm.git.commits[vm.git.commits.length-1].id+"] "+msg+"\n "+n+" file"+(n===1?"":"s")+" changed\n"); }
    if(sub==="status") return ok("On branch "+vm.git.branch+"\n"+
      (vm.git.staged.length ? "Changes to be committed:\n"+vm.git.staged.map(f=>"\tnew file:   "+f).join("\n")+"\n"
                            : "nothing to commit, working tree clean\n"));
    if(sub==="log"){
      if(!vm.git.commits.length) return bad("fatal: your current branch 'main' does not have any commits yet");
      const one = argv.includes("--oneline");
      return ok(join(vm.git.commits.slice().reverse().map(c =>
        one ? c.id+" "+c.msg : "commit "+c.id+"\nAuthor: "+vm.user+"\n\n    "+c.msg+"\n"))); }
    if(sub==="branch"){ const n = argv[1];
      if(!n) return ok("* "+vm.git.branch+"\n");
      vm.git.branches = (vm.git.branches||["main"]).concat(n); return ok(""); }
    if(sub==="checkout"||sub==="switch"){ vm.git.branch = argv[argv.length-1]; return ok("Switched to branch '"+vm.git.branch+"'\n"); }
    return bad("git: '"+sub+"' is not simulated here");
  };

  C.man = (argv) => {
    const n = argv[0];
    if(!n) return bad("What manual page do you want?");
    if(!C[n]) return bad("No manual entry for "+n);
    return ok(n.toUpperCase()+"(1)\n\nNAME\n       "+n+" — see the Cheatsheet drawer for a full description.\n\n"+
      "SYNOPSIS\n       "+n+" [OPTION]... [FILE]...\n");
  };
  C.help = () => ok("This is a simulated machine. Available commands:\n\n"+
    Object.keys(C).sort().join("  ")+"\n\nType 'tasks' to see what the current lab asks for.\n");

  /* ---------------- shell execution ---------------- */
  function runSimple(argv, stdin){
    if(!argv.length) return ok("");
    let cmd = argv[0], args = argv.slice(1);
    let elevated = false;
    if(cmd==="sudo"){
      if(!args.length) return bad("usage: sudo command");
      if(args[0]==="-i"||args[0]==="-s") return ok("[you are now root — this trainer keeps you as "+vm.user+"; prefix commands with sudo instead]\n");
      elevated = true; cmd = args[0]; args = args.slice(1);
    }
    if(cmd==="su") return ok("[su is not simulated — use sudo <command>]\n");
    const fn = C[cmd];
    if(!fn) return {out:"", err:"bash: "+cmd+": command not found\n", code:127};
    const wasRoot = vm.asRoot;
    if(elevated) vm.asRoot = true;
    let r;
    try{ r = fn(args, stdin||""); }
    catch(e){ r = bad(cmd+": "+e.message); }
    vm.asRoot = wasRoot;
    return r;
  }

  /* one pipeline: cmd | cmd > file */
  function runPipeline(tokens){
    const stages = [[]];
    let redir = null, redirAppend = false, errToOut = false, errRedir = null;
    for(let i=0;i<tokens.length;i++){
      const t = tokens[i];
      if(t.op==="|"){ stages.push([]); continue; }
      if(t.op===">"||t.op===">>"){ redir = tokens[++i]; redirAppend = t.op===">>"; continue; }
      if(t.op==="2>"){ const nxt = tokens[i+1];
        if(nxt && nxt.op===undefined && nxt.v==="&1"){ errToOut = true; i++; }
        else { errRedir = tokens[++i]; }
        continue; }
      if(t.v==="2>&1"){ errToOut = true; continue; }
      stages[stages.length-1].push(t);
    }
    // the shell expands ~ and globs before the command ever sees the argument,
    // so commands report the expanded path — exactly as bash does
    const tilde = s => s === "~" ? vm.HOME : s.startsWith("~/") ? vm.HOME + s.slice(1) : s;
    let stdin = "", out = "", err = "", code = 0, clear = false, editor = null;
    for(const stage of stages){
      const argv = stage.flatMap(t => t.q ? [t.v] : glob(tilde(t.v)));
      const r = runSimple(argv, stdin);
      stdin = r.out; out = r.out; err = r.err || ""; code = r.code;
      clear = clear || !!r.clear; editor = r.editor || editor;
      if(err && stages.length>1) { /* stderr does not flow down a pipe */ }
    }
    if(errToOut){ out = out + err; err = ""; }
    if(errRedir){
      const p = errRedir.v;
      if(p!=="/dev/null"){ const par = lookup(parentOf(p));
        if(par.node) par.node.ch[baseOf(p)] = fnode(err, 0o644, vm.user, vm.user); }
      err = "";
    }
    if(redir){
      const p = redir.v;
      if(p==="/dev/null"){ out = ""; }
      else{
        const par = lookup(parentOf(p));
        if(!par.node) return {out:"", err:"bash: "+p+": No such file or directory\n", code:1};
        if(!canWrite(par.node)) return {out:"", err:"bash: "+p+": Permission denied\n", code:1};
        const ex = par.node.ch[baseOf(p)];
        if(ex && ex.t==="f") ex.c = redirAppend ? ex.c + out : out;
        else par.node.ch[baseOf(p)] = fnode(out, 0o644, vm.user, vm.user);
        out = "";
      }
    }
    return {out, err, code, clear, editor};
  }

  function run(input){
    const src = String(input).trim();
    if(!src) return {out:"", err:"", code:0};
    vm.hist.push(src);
    const toks = tokenize(src);
    // split on && and ; keeping short-circuit semantics
    const groups = [[]]; const seps = [];
    for(const t of toks){
      if(t.op==="&&"||t.op===";"||t.op==="||"){ groups.push([]); seps.push(t.op); continue; }
      groups[groups.length-1].push(t);
    }
    let out="", err="", code=0, clear=false, editor=null;
    for(let i=0;i<groups.length;i++){
      if(i>0){
        const s = seps[i-1];
        if(s==="&&" && code!==0) break;
        if(s==="||" && code===0) break;
      }
      if(!groups[i].length) continue;
      const r = runPipeline(groups[i]);
      out += r.out; err += r.err; code = r.code; clear = clear || r.clear; editor = r.editor || editor;
    }
    vm.lastStatus = code;
    return {out, err, code, clear, editor};
  }

  K.C = C; K.run = run; K.runSimple = runSimple;
  return K;
}
