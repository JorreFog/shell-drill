/* A small Python, scoped to what lectures 10-12 teach: types, arithmetic,
   strings and f-strings, lists/dicts/sets, if/loops, functions, and file I/O
   backed by the simulated filesystem. Not a general Python — but what it does
   support, it does honestly, including int/float distinction and real errors. */
function attachPython(K){
  const {vm, lookup, parentOf, baseOf, fnode} = K;

  class PyFloat { constructor(v){ this.v = v; } }
  class PyTuple { constructor(a){ this.a = a; } }
  class PyFunc  { constructor(name, params, defaults, body, closure, rest){
    Object.assign(this, {name, params, defaults, body, closure, rest}); } }
  class PyFile  { constructor(path, mode){ this.path = path; this.mode = mode; this.buf = ""; this.closed = false; } }
  class PyErr extends Error { constructor(type, msg){ super(msg); this.pytype = type; this.pymsg = msg; } }
  const err = (t,m) => { throw new PyErr(t,m); };

  const isInt   = v => typeof v === "number";
  const isFloat = v => v instanceof PyFloat;
  const isNum   = v => isInt(v) || isFloat(v);
  const num     = v => isFloat(v) ? v.v : v;
  const isStr   = v => typeof v === "string";

  function typeName(v){
    if(v === null) return "NoneType";
    if(typeof v === "boolean") return "bool";
    if(isInt(v)) return "int";
    if(isFloat(v)) return "float";
    if(isStr(v)) return "str";
    if(Array.isArray(v)) return "list";
    if(v instanceof Map) return "dict";
    if(v instanceof Set) return "set";
    if(v instanceof PyTuple) return "tuple";
    if(v instanceof PyFunc) return "function";
    if(v instanceof PyFile) return "TextIOWrapper";
    return "object";
  }

  function repr(v){
    if(v === null) return "None";
    if(typeof v === "boolean") return v ? "True" : "False";
    if(isFloat(v)) return Number.isInteger(v.v) ? v.v.toFixed(1) : String(v.v);
    if(isInt(v)) return String(v);
    if(isStr(v)) return "'" + v + "'";
    if(Array.isArray(v)) return "[" + v.map(repr).join(", ") + "]";
    if(v instanceof PyTuple) return "(" + v.a.map(repr).join(", ") + (v.a.length===1?",":"") + ")";
    if(v instanceof Set) return v.size ? "{" + [...v].map(repr).join(", ") + "}" : "set()";
    if(v instanceof Map) return "{" + [...v].map(([k,val])=>repr(k)+": "+repr(val)).join(", ") + "}";
    if(v instanceof PyFunc) return "<function " + v.name + ">";
    return String(v);
  }
  function str(v){
    if(isStr(v)) return v;
    return repr(v);
  }
  function truthy(v){
    if(v === null || v === false) return false;
    if(v === true) return true;
    if(isNum(v)) return num(v) !== 0;
    if(isStr(v)) return v.length > 0;
    if(Array.isArray(v)) return v.length > 0;
    if(v instanceof Map || v instanceof Set) return v.size > 0;
    if(v instanceof PyTuple) return v.a.length > 0;
    return true;
  }
  function eqVal(a,b){
    if(isNum(a) && isNum(b)) return num(a) === num(b);
    if(Array.isArray(a) && Array.isArray(b))
      return a.length===b.length && a.every((x,i)=>eqVal(x,b[i]));
    return a === b;
  }

  /* ---------------- lexer ---------------- */
  const KEYWORDS = new Set(["if","elif","else","for","while","def","return","in","not","and","or",
    "True","False","None","break","continue","pass","import","from","with","as","try","except",
    "finally","raise","is","del","lambda","global"]);

  function lex(src){
    const toks = [];
    const linesArr = src.replace(/\r/g,"").split("\n");
    const stack = [0];
    let paren = 0;
    for(let ln=0; ln<linesArr.length; ln++){
      let line = linesArr[ln];
      const stripped = line.replace(/#.*$/,"");
      if(!stripped.trim()){ continue; }
      let indent = 0;
      while(indent < stripped.length && stripped[indent]===" ") indent++;
      if(stripped[indent]==="\t") err("IndentationError","tabs are not supported here — use spaces");
      const body = stripped.slice(indent);
      if(paren === 0){
        if(indent > stack[stack.length-1]){ stack.push(indent); toks.push({t:"INDENT", ln}); }
        else while(indent < stack[stack.length-1]){ stack.pop(); toks.push({t:"DEDENT", ln}); }
        if(indent !== stack[stack.length-1] && indent > stack[stack.length-1])
          err("IndentationError","unexpected indent on line "+(ln+1));
      }
      let i = 0;
      while(i < body.length){
        const c = body[i];
        if(c===" "){ i++; continue; }
        // strings, including f-strings
        const fpre = (c==="f"||c==="F") && (body[i+1]==='"'||body[i+1]==="'");
        if(c==='"'||c==="'"||fpre){
          const start = fpre ? i+1 : i;
          const q = body[start];
          let j = start+1, s = "";
          while(j < body.length && body[j]!==q){
            if(body[j]==="\\" && j+1<body.length){
              const n = body[j+1];
              s += n==="n" ? "\n" : n==="t" ? "\t" : n;
              j += 2; continue;
            }
            s += body[j++];
          }
          if(j >= body.length) err("SyntaxError","unterminated string literal on line "+(ln+1));
          toks.push({t: fpre?"FSTR":"STR", v:s, ln});
          i = j+1; continue;
        }
        if(/[0-9]/.test(c)){
          let j=i, s="";
          while(j<body.length && /[0-9._]/.test(body[j])) s += body[j++];
          s = s.replace(/_/g,"");
          toks.push({t:"NUM", v: s.includes(".") ? new PyFloat(parseFloat(s)) : parseInt(s,10), ln});
          i = j; continue;
        }
        if(/[A-Za-z_]/.test(c)){
          let j=i, s="";
          while(j<body.length && /[A-Za-z0-9_]/.test(body[j])) s += body[j++];
          toks.push({t: KEYWORDS.has(s)?"KW":"NAME", v:s, ln});
          i = j; continue;
        }
        const three = body.slice(i,i+3), two = body.slice(i,i+2);
        if(["//=","**="].includes(three)){ toks.push({t:"OP", v:three, ln}); i+=3; continue; }
        if(["==","!=","<=",">=","//","**","+=","-=","*=","/="].includes(two)){
          toks.push({t:"OP", v:two, ln}); i+=2; continue; }
        if("+-*/%<>=(),:[]{}.".includes(c)){
          if("([{".includes(c)) paren++;
          if(")]}".includes(c)) paren--;
          toks.push({t:"OP", v:c, ln}); i++; continue;
        }
        err("SyntaxError","unexpected character '"+c+"' on line "+(ln+1));
      }
      if(paren===0) toks.push({t:"NL", ln});
    }
    while(stack.length>1){ stack.pop(); toks.push({t:"DEDENT", ln:linesArr.length}); }
    toks.push({t:"EOF", ln:linesArr.length});
    return toks;
  }

  /* ---------------- parser ---------------- */
  function parse(toks){
    let p = 0;
    const peek = (k=0) => toks[p+k];
    const at = (t,v) => peek().t===t && (v===undefined || peek().v===v);
    const eat = (t,v) => { if(!at(t,v)) err("SyntaxError","expected "+(v||t)+" but found '"+
      (peek().v!==undefined?peek().v:peek().t)+"' on line "+(peek().ln+1)); return toks[p++]; };
    const opt = (t,v) => at(t,v) ? (p++, true) : false;

    function block(){
      // either an inline statement after ':' or an indented suite
      if(at("NL")){
        eat("NL"); eat("INDENT");
        const body = [];
        while(!at("DEDENT") && !at("EOF")) body.push(statement());
        opt("DEDENT");
        return body;
      }
      return [statement()];
    }

    function statement(){
      while(at("NL")) p++;
      const tk = peek();
      if(tk.t==="KW"){
        switch(tk.v){
          case "if": {
            p++; const test = expr(); eat("OP",":");
            const then = block();
            const clauses = [{test, body:then}];
            let orelse = [];
            while(at("KW","elif")){ p++; const t2 = expr(); eat("OP",":"); clauses.push({test:t2, body:block()}); }
            if(at("KW","else")){ p++; eat("OP",":"); orelse = block(); }
            return {k:"if", clauses, orelse};
          }
          case "while": { p++; const test = expr(); eat("OP",":"); return {k:"while", test, body:block()}; }
          case "for": {
            p++; const names = [eat("NAME").v];
            while(opt("OP",",")) names.push(eat("NAME").v);
            eat("KW","in"); const iter = expr(); eat("OP",":");
            return {k:"for", names, iter, body:block()};
          }
          case "def": {
            p++; const name = eat("NAME").v; eat("OP","(");
            const params = [], defaults = {};
            let rest = null;
            while(!at("OP",")")){
              if(at("OP","*")){ p++; rest = eat("NAME").v; if(!opt("OP",",")) break; continue; }
              const pn = eat("NAME").v;
              if(opt("OP","=")) defaults[pn] = expr();
              params.push(pn);
              if(!opt("OP",",")) break;
            }
            eat("OP",")"); eat("OP",":");
            return {k:"def", name, params, defaults, rest, body:block()};
          }
          case "return": { p++; const v = (at("NL")||at("EOF")) ? null : expr(); opt("NL"); return {k:"return", v}; }
          case "break": p++; opt("NL"); return {k:"break"};
          case "continue": p++; opt("NL"); return {k:"continue"};
          case "pass": p++; opt("NL"); return {k:"pass"};
          case "import": case "from": {
            // record the names so using them gives a clear message rather than
            // a confusing NameError
            const names = [];
            while(!at("NL")&&!at("EOF")){ if(at("NAME")) names.push(peek().v); p++; }
            opt("NL"); return {k:"import", names};
          }
          case "with": {
            p++; const ctx = expr(); eat("KW","as"); const name = eat("NAME").v; eat("OP",":");
            return {k:"with", ctx, name, body:block()};
          }
          case "try": {
            p++; eat("OP",":"); const body = block();
            const handlers = [];
            while(at("KW","except")){
              p++;
              let type = null, alias = null;
              if(!at("OP",":")){ type = eat("NAME").v; if(opt("KW","as")) alias = eat("NAME").v; }
              eat("OP",":");
              handlers.push({type, alias, body:block()});
            }
            let orelse = [];
            if(at("KW","finally")){ p++; eat("OP",":"); orelse = block(); }
            return {k:"try", body, handlers, final:orelse};
          }
          case "raise": {
            p++; const e = (at("NL")||at("EOF")) ? null : expr(); opt("NL"); return {k:"raise", e};
          }
        }
      }
      // assignment or bare expression
      const start = p;
      const target = expr();
      if(at("OP","=")){
        p++; const value = expr(); opt("NL");
        return {k:"assign", target, value};
      }
      const aug = ["+=","-=","*=","/=","//=","**="].find(o => at("OP",o));
      if(aug){ p++; const value = expr(); opt("NL"); return {k:"aug", target, op:aug.slice(0,-1), value}; }
      opt("NL");
      return {k:"expr", e:target};
    }

    /* expression precedence, loosest first */
    function expr(){ return orExpr(); }
    function orExpr(){ let l = andExpr();
      while(at("KW","or")){ p++; l = {k:"or", l, r:andExpr()}; } return l; }
    function andExpr(){ let l = notExpr();
      while(at("KW","and")){ p++; l = {k:"and", l, r:notExpr()}; } return l; }
    function notExpr(){ if(at("KW","not")){ p++; return {k:"not", e:notExpr()}; } return compare(); }
    function compare(){
      let l = arith();
      for(;;){
        let op = null;
        if(at("OP","==")||at("OP","!=")||at("OP","<")||at("OP",">")||at("OP","<=")||at("OP",">=")) op = eat("OP").v;
        else if(at("KW","in")){ p++; op = "in"; }
        else if(at("KW","not") && peek(1).t==="KW" && peek(1).v==="in"){ p+=2; op = "not in"; }
        else if(at("KW","is")){ p++; if(at("KW","not")){ p++; op = "is not"; } else op = "is"; }
        else break;
        l = {k:"cmp", op, l, r:arith()};
      }
      return l;
    }
    function arith(){ let l = term();
      while(at("OP","+")||at("OP","-")){ const op = eat("OP").v; l = {k:"bin", op, l, r:term()}; } return l; }
    function term(){ let l = unary();
      while(at("OP","*")||at("OP","/")||at("OP","//")||at("OP","%")){ const op = eat("OP").v; l = {k:"bin", op, l, r:unary()}; }
      return l; }
    function unary(){ if(at("OP","-")){ p++; return {k:"neg", e:unary()}; }
      if(at("OP","+")){ p++; return unary(); } return power(); }
    function power(){ const b = postfix();
      if(at("OP","**")){ p++; return {k:"bin", op:"**", l:b, r:unary()}; } return b; }

    function postfix(){
      let e = atom();
      for(;;){
        if(at("OP","(")){
          p++; const args = [], kwargs = {};
          while(!at("OP",")")){
            // name=value is a keyword argument; name==value is a comparison
            if(peek().t==="NAME" && peek(1).t==="OP" && peek(1).v==="="){
              const kw = eat("NAME").v; eat("OP","="); kwargs[kw] = expr();
            } else args.push(expr());
            if(!opt("OP",",")) break;
          }
          eat("OP",")");
          e = {k:"call", fn:e, args, kwargs};
        } else if(at("OP","[")){
          p++;
          let lo = at("OP",":") ? null : expr();
          if(opt("OP",":")){
            const hi = at("OP","]") ? null : expr();
            eat("OP","]");
            e = {k:"slice", obj:e, lo, hi};
          } else { eat("OP","]"); e = {k:"index", obj:e, i:lo}; }
        } else if(at("OP",".")){
          p++; const name = eat("NAME").v;
          e = {k:"attr", obj:e, name};
        } else break;
      }
      return e;
    }

    function atom(){
      const tk = peek();
      if(tk.t==="NUM"){ p++; return {k:"const", v:tk.v}; }
      if(tk.t==="STR"){ p++; return {k:"const", v:tk.v}; }
      if(tk.t==="FSTR"){ p++; return {k:"fstr", v:tk.v}; }
      if(tk.t==="NAME"){ p++; return {k:"name", v:tk.v}; }
      if(tk.t==="KW"){
        if(tk.v==="True"){ p++; return {k:"const", v:true}; }
        if(tk.v==="False"){ p++; return {k:"const", v:false}; }
        if(tk.v==="None"){ p++; return {k:"const", v:null}; }
        if(tk.v==="not"){ return notExpr(); }
      }
      if(at("OP","(")){
        p++;
        if(at("OP",")")){ p++; return {k:"tuple", items:[]}; }
        const first = expr();
        if(at("OP",",")){
          const items = [first];
          while(opt("OP",",")){ if(at("OP",")")) break; items.push(expr()); }
          eat("OP",")"); return {k:"tuple", items};
        }
        eat("OP",")"); return first;
      }
      if(at("OP","[")){
        p++;
        if(at("OP","]")){ p++; return {k:"list", items:[]}; }
        const first = expr();
        if(at("KW","for")){                       // [expr for x in xs if cond]
          p++; const names = [eat("NAME").v];
          while(opt("OP",",")) names.push(eat("NAME").v);
          eat("KW","in"); const iter = expr();
          let cond = null;
          if(at("KW","if")){ p++; cond = expr(); }
          eat("OP","]");
          return {k:"comp", body:first, names, iter, cond};
        }
        const items = [first];
        while(opt("OP",",")){ if(at("OP","]")) break; items.push(expr()); }
        eat("OP","]"); return {k:"list", items};
      }
      if(at("OP","{")){
        p++;
        const pairs = [], items = [];
        let isDict = null;
        while(!at("OP","}")){
          const kx = expr();
          if(opt("OP",":")){ isDict = true; pairs.push([kx, expr()]); }
          else { isDict = isDict===null ? false : isDict; items.push(kx); }
          if(!opt("OP",",")) break;
        }
        eat("OP","}");
        return isDict === false ? {k:"set", items} : {k:"dict", pairs};
      }
      err("SyntaxError","unexpected '"+(tk.v!==undefined?tk.v:tk.t)+"' on line "+(tk.ln+1));
    }

    const prog = [];
    while(!at("EOF")){ if(at("NL")||at("INDENT")||at("DEDENT")){ p++; continue; } prog.push(statement()); }
    return prog;
  }

  /* ---------------- evaluator ---------------- */
  const BREAK = {sig:"break"}, CONT = {sig:"continue"};
  class Ret { constructor(v){ this.v = v; } }

  function run(src, opts){
    const out = [];
    const stdin = (opts && opts.stdin ? opts.stdin.split("\n") : []);
    let stdinPos = 0;
    const globals = new Map();

    const write = s => {
      out.push(s);
      if(out.join("").length > 200000) err("RuntimeError","too much output — is a loop not terminating?");
    };

    /* ---- builtins ---- */
    const BUILTINS = {
      print: (args, kw) => {
        const sep = kw && kw.sep !== undefined ? kw.sep : " ";
        write(args.map(str).join(sep) + ((kw && kw.end !== undefined) ? kw.end : "\n"));
        return null;
      },
      len: a => {
        const v = a[0];
        if(isStr(v)) return v.length;
        if(Array.isArray(v)) return v.length;
        if(v instanceof Map || v instanceof Set) return v.size;
        if(v instanceof PyTuple) return v.a.length;
        err("TypeError","object of type '"+typeName(v)+"' has no len()");
      },
      int: a => {
        const v = a[0];
        if(v === undefined) return 0;
        if(isStr(v)){
          const t = v.trim();
          if(!/^[+-]?\d+$/.test(t)) err("ValueError","invalid literal for int() with base 10: '"+v+"'");
          return parseInt(t,10);
        }
        if(isFloat(v)) return Math.trunc(v.v);
        if(typeof v === "boolean") return v?1:0;
        if(isInt(v)) return v;
        err("TypeError","int() argument must be a string or a number, not '"+typeName(v)+"'");
      },
      float: a => {
        const v = a[0];
        if(isStr(v)){ const n = parseFloat(v); if(isNaN(n)) err("ValueError","could not convert string to float: '"+v+"'"); return new PyFloat(n); }
        return new PyFloat(num(v));
      },
      str: a => a.length ? str(a[0]) : "",
      bool: a => truthy(a[0]),
      type: a => ({__type: typeName(a[0])}),
      list: a => { const v = a[0];
        if(v === undefined) return [];
        if(Array.isArray(v)) return v.slice();
        if(isStr(v)) return v.split("");
        if(v instanceof Set) return [...v];
        if(v instanceof Map) return [...v.keys()];
        if(v instanceof PyTuple) return v.a.slice();
        err("TypeError","'"+typeName(v)+"' object is not iterable"); },
      set: a => { const v = a[0];
        if(v === undefined) return new Set();
        return new Set(BUILTINS.list([v])); },
      dict: a => a[0] instanceof Map ? new Map(a[0]) : new Map(),
      tuple: a => new PyTuple(BUILTINS.list(a)),
      range: a => {
        const [x,y,z] = a.map(num);
        const start = y===undefined ? 0 : x, stop = y===undefined ? x : y, step = z===undefined ? 1 : z;
        const r = [];
        if(step === 0) err("ValueError","range() arg 3 must not be zero");
        for(let i=start; step>0 ? i<stop : i>stop; i+=step){ r.push(i);
          if(r.length > 100000) err("RuntimeError","range too large"); }
        return r;
      },
      sum: a => { const l = BUILTINS.list([a[0]]);
        let anyF = false, t = 0;
        for(const x of l){ if(!isNum(x)) err("TypeError","unsupported operand type(s) for +: 'int' and '"+typeName(x)+"'");
          if(isFloat(x)) anyF = true; t += num(x); }
        return anyF ? new PyFloat(t) : t; },
      min: a => { const l = a.length===1 ? BUILTINS.list([a[0]]) : a; return l.reduce((m,x)=> num(x)<num(m)?x:m); },
      max: a => { const l = a.length===1 ? BUILTINS.list([a[0]]) : a; return l.reduce((m,x)=> num(x)>num(m)?x:m); },
      abs: a => isFloat(a[0]) ? new PyFloat(Math.abs(a[0].v)) : Math.abs(a[0]),
      round: a => { const d = a[1]===undefined ? 0 : num(a[1]);
        const r = Math.round(num(a[0]) * Math.pow(10,d)) / Math.pow(10,d);
        return d===0 ? Math.round(num(a[0])) : new PyFloat(r); },
      sorted: (a, kw) => { const l = BUILTINS.list([a[0]]).slice();
        l.sort((x,y)=> isNum(x)&&isNum(y) ? num(x)-num(y) : String(x)<String(y)?-1:String(x)>String(y)?1:0);
        if(kw && kw.reverse !== undefined && truthy(kw.reverse)) l.reverse();
        return l; },
      reversed: a => BUILTINS.list([a[0]]).slice().reverse(),
      enumerate: a => BUILTINS.list([a[0]]).map((v,i)=> new PyTuple([i,v])),
      zip: a => { const ls = a.map(x=>BUILTINS.list([x]));
        const n = Math.min(...ls.map(l=>l.length));
        const r = []; for(let i=0;i<n;i++) r.push(new PyTuple(ls.map(l=>l[i]))); return r; },
      input: a => {
        if(a.length) write(str(a[0]));
        if(stdinPos >= stdin.length) err("EOFError","EOF when reading a line — this lab has no input queued");
        return stdin[stdinPos++];
      },
      open: a => {
        const path = str(a[0]), mode = a[1] ? str(a[1]) : "r";
        const abs = K.abspath(path);
        const r = lookup(abs);
        if(mode.startsWith("r")){
          if(!r.node) err("FileNotFoundError","[Errno 2] No such file or directory: '"+path+"'");
          if(r.node.t === "d") err("IsADirectoryError","[Errno 21] Is a directory: '"+path+"'");
          if(!K.canRead(r.node)) err("PermissionError","[Errno 13] Permission denied: '"+path+"'");
          const f = new PyFile(abs, mode); f.buf = r.node.c; return f;
        }
        const par = lookup(parentOf(abs));
        if(!par.node) err("FileNotFoundError","[Errno 2] No such file or directory: '"+path+"'");
        const ex = par.node.ch[baseOf(abs)];
        const f = new PyFile(abs, mode);
        if(mode.startsWith("a") && ex && ex.t === "f") f.buf = ex.c;
        else if(!ex) par.node.ch[baseOf(abs)] = fnode("", 0o644, vm.user, vm.user);
        else if(mode.startsWith("w")) ex.c = "";
        return f;
      }
    };

    function flushFile(f){
      if(f.mode.startsWith("r")) return;
      const r = lookup(f.path);
      if(r.node && r.node.t === "f") r.node.c = f.buf;
    }

    /* ---- attribute access / methods ---- */
    function getAttr(obj, name){
      if(isStr(obj)){
        const S = {
          upper: () => obj.toUpperCase(), lower: () => obj.toLowerCase(),
          strip: a => a && a[0] ? obj.replace(new RegExp("^["+a[0]+"]+|["+a[0]+"]+$","g"),"") : obj.trim(),
          lstrip: () => obj.replace(/^\s+/,""), rstrip: () => obj.replace(/\s+$/,""),
          split: a => a && a[0] !== undefined ? obj.split(str(a[0])) : obj.trim().split(/\s+/).filter(x=>x!==""),
          replace: a => obj.split(str(a[0])).join(str(a[1])),
          startswith: a => obj.startsWith(str(a[0])), endswith: a => obj.endsWith(str(a[0])),
          find: a => obj.indexOf(str(a[0])), count: a => obj.split(str(a[0])).length-1,
          join: a => BUILTINS.list([a[0]]).map(str).join(obj),
          title: () => obj.replace(/\w\S*/g, w=>w[0].toUpperCase()+w.slice(1).toLowerCase()),
          capitalize: () => obj.charAt(0).toUpperCase()+obj.slice(1).toLowerCase(),
          isdigit: () => /^\d+$/.test(obj), isalpha: () => /^[A-Za-z]+$/.test(obj),
          format: (a) => { let i = 0;
            return obj.replace(/\{(\d*)(?::([^}]*))?\}/g, (m, idx, spec) => {
              const v = a[idx === "" ? i++ : Number(idx)];
              if(spec && /^\.\d+f$/.test(spec)) return num(v).toFixed(parseInt(spec.slice(1),10));
              return str(v); }); }
        };
        if(S[name]) return {__method:S[name]};
        err("AttributeError","'str' object has no attribute '"+name+"'");
      }
      if(Array.isArray(obj)){
        const L = {
          append: a => { obj.push(a[0]); return null; },
          insert: a => { obj.splice(num(a[0]),0,a[1]); return null; },
          remove: a => { const i = obj.findIndex(x=>eqVal(x,a[0]));
            if(i<0) err("ValueError","list.remove(x): x not in list"); obj.splice(i,1); return null; },
          pop: a => { if(!obj.length) err("IndexError","pop from empty list");
            return a && a.length ? obj.splice(num(a[0]),1)[0] : obj.pop(); },
          sort: (a, kw) => { obj.sort((x,y)=> isNum(x)&&isNum(y) ? num(x)-num(y)
            : String(x)<String(y)?-1:String(x)>String(y)?1:0);
            if(kw && kw.reverse !== undefined && truthy(kw.reverse)) obj.reverse(); return null; },
          reverse: () => { obj.reverse(); return null; },
          index: a => { const i = obj.findIndex(x=>eqVal(x,a[0]));
            if(i<0) err("ValueError",repr(a[0])+" is not in list"); return i; },
          count: a => obj.filter(x=>eqVal(x,a[0])).length,
          clear: () => { obj.length = 0; return null; },
          extend: a => { obj.push(...BUILTINS.list([a[0]])); return null; }
        };
        if(L[name]) return {__method:L[name]};
        err("AttributeError","'list' object has no attribute '"+name+"'");
      }
      if(obj instanceof Map){
        const D = {
          get: a => obj.has(a[0]) ? obj.get(a[0]) : (a.length>1 ? a[1] : null),
          keys: () => [...obj.keys()], values: () => [...obj.values()],
          items: () => [...obj].map(([k,v]) => new PyTuple([k,v])),
          pop: a => { if(!obj.has(a[0])){ if(a.length>1) return a[1]; err("KeyError",repr(a[0])); }
            const v = obj.get(a[0]); obj.delete(a[0]); return v; },
          update: a => { for(const [k,v] of a[0]) obj.set(k,v); return null; },
          clear: () => { obj.clear(); return null; }
        };
        if(D[name]) return {__method:D[name]};
        err("AttributeError","'dict' object has no attribute '"+name+"'");
      }
      if(obj instanceof Set){
        const St = {
          add: a => { obj.add(a[0]); return null; },
          remove: a => { if(!obj.has(a[0])) err("KeyError",repr(a[0])); obj.delete(a[0]); return null; },
          discard: a => { obj.delete(a[0]); return null; },
          union: a => new Set([...obj, ...BUILTINS.list([a[0]])]),
          intersection: a => { const o = new Set(BUILTINS.list([a[0]])); return new Set([...obj].filter(x=>o.has(x))); },
          difference: a => { const o = new Set(BUILTINS.list([a[0]])); return new Set([...obj].filter(x=>!o.has(x))); }
        };
        if(St[name]) return {__method:St[name]};
        err("AttributeError","'set' object has no attribute '"+name+"'");
      }
      if(obj instanceof PyFile){
        const F = {
          read: () => obj.buf,
          readlines: () => obj.buf.split("\n").filter((l,i,a)=>!(i===a.length-1&&l==="")).map(l=>l+"\n"),
          readline: () => { const i = obj.buf.indexOf("\n"); const l = i<0?obj.buf:obj.buf.slice(0,i+1);
            obj.buf = i<0?"":obj.buf.slice(i+1); return l; },
          write: a => { const s = str(a[0]); obj.buf += s; flushFile(obj); return s.length; },
          writelines: a => { for(const l of BUILTINS.list([a[0]])) obj.buf += str(l); flushFile(obj); return null; },
          close: () => { flushFile(obj); obj.closed = true; return null; }
        };
        if(F[name]) return {__method:F[name]};
        err("AttributeError","'TextIOWrapper' object has no attribute '"+name+"'");
      }
      if(obj && obj.__module)
        err("ModuleNotFoundError", "'"+obj.__module+"' is not available — this trainer has no modules, only the built-ins");
      if(obj && obj.__type !== undefined && name === "__name__") return obj.__type;
      err("AttributeError","'"+typeName(obj)+"' object has no attribute '"+name+"'");
    }

    function iterate(v){
      if(Array.isArray(v)) return v;
      if(isStr(v)) return v.split("");
      if(v instanceof Set) return [...v];
      if(v instanceof Map) return [...v.keys()];
      if(v instanceof PyTuple) return v.a;
      if(v instanceof PyFile) return v.buf.split("\n").filter((l,i,a)=>!(i===a.length-1&&l==="")).map(l=>l+"\n");
      err("TypeError","'"+typeName(v)+"' object is not iterable");
    }

    function binop(op, a, b){
      if(op === "+"){
        if(isStr(a) && isStr(b)) return a + b;
        if(isStr(a) !== isStr(b) && (isNum(a)||isNum(b)) && (isStr(a)||isStr(b)))
          err("TypeError", isStr(a) ? 'can only concatenate str (not "'+typeName(b)+'") to str'
                                    : "unsupported operand type(s) for +: '"+typeName(a)+"' and '"+typeName(b)+"'");
        if(Array.isArray(a) && Array.isArray(b)) return a.concat(b);
        if(isNum(a) && isNum(b)) return (isFloat(a)||isFloat(b)) ? new PyFloat(num(a)+num(b)) : a+b;
        err("TypeError","unsupported operand type(s) for +: '"+typeName(a)+"' and '"+typeName(b)+"'");
      }
      if(op === "%" && isStr(a)){
        const vals = b instanceof PyTuple ? b.a : [b];
        let i = 0;
        return a.replace(/%([sd]|\.\d+f)/g, (m, kind) => {
          const v = vals[i++];
          if(kind === "d") return String(Math.trunc(num(v)));
          if(kind.endsWith("f")) return num(v).toFixed(parseInt(kind.slice(1),10));
          return str(v); });
      }
      if(op === "*"){
        if(isStr(a) && isInt(b)) return a.repeat(Math.max(0,b));
        if(isInt(a) && isStr(b)) return b.repeat(Math.max(0,a));
        if(Array.isArray(a) && isInt(b)){ const r=[]; for(let i=0;i<b;i++) r.push(...a); return r; }
      }
      if(!isNum(a) || !isNum(b))
        err("TypeError","unsupported operand type(s) for "+op+": '"+typeName(a)+"' and '"+typeName(b)+"'");
      const x = num(a), y = num(b), anyF = isFloat(a)||isFloat(b);
      switch(op){
        case "-": return anyF ? new PyFloat(x-y) : x-y;
        case "*": return anyF ? new PyFloat(x*y) : x*y;
        case "/": if(y===0) err("ZeroDivisionError","division by zero"); return new PyFloat(x/y);
        case "//": if(y===0) err("ZeroDivisionError","integer division or modulo by zero");
          return anyF ? new PyFloat(Math.floor(x/y)) : Math.floor(x/y);
        case "%": if(y===0) err("ZeroDivisionError","integer division or modulo by zero");
          { const m = ((x%y)+y)%y; return anyF ? new PyFloat(m) : m; }
        case "**": return anyF ? new PyFloat(Math.pow(x,y)) : Math.pow(x,y);
      }
      err("SyntaxError","unknown operator "+op);
    }

    function compareOp(op, a, b){
      if(op === "in" || op === "not in"){
        let found;
        if(isStr(b)) found = b.includes(str(a));
        else if(Array.isArray(b)) found = b.some(x=>eqVal(x,a));
        else if(b instanceof Set) found = b.has(a);
        else if(b instanceof Map) found = b.has(a);
        else if(b instanceof PyTuple) found = b.a.some(x=>eqVal(x,a));
        else err("TypeError","argument of type '"+typeName(b)+"' is not iterable");
        return op === "in" ? found : !found;
      }
      if(op === "is") return a === b || (a===null&&b===null);
      if(op === "is not") return !(a === b || (a===null&&b===null));
      if(op === "==") return eqVal(a,b);
      if(op === "!=") return !eqVal(a,b);
      if(isStr(a) && isStr(b)){
        if(op === "<") return a < b; if(op === ">") return a > b;
        if(op === "<=") return a <= b; return a >= b;
      }
      if(!isNum(a) || !isNum(b))
        err("TypeError","'"+op+"' not supported between instances of '"+typeName(a)+"' and '"+typeName(b)+"'");
      const x = num(a), y = num(b);
      if(op === "<") return x < y; if(op === ">") return x > y;
      if(op === "<=") return x <= y; return x >= y;
    }

    function lookupName(scope, n){
      if(scope.has(n)) return scope.get(n);
      if(globals.has(n)) return globals.get(n);
      if(BUILTINS[n]) return {__builtin:n};
      err("NameError","name '"+n+"' is not defined");
    }

    function evalNode(n, scope){
      switch(n.k){
        case "const": return n.v;
        case "name": return lookupName(scope, n.v);
        case "fstr": {
          return n.v.replace(/\{([^{}]*)\}/g, (m, code) => {
            const spec = code.split(":");
            const exprSrc = spec[0];
            const toks = lex(exprSrc);
            const ast = parse(toks);
            const v = evalNode(ast[0].e !== undefined ? ast[0].e : ast[0].value, scope);
            if(spec[1] && /^\.\d+f$/.test(spec[1])) return num(v).toFixed(parseInt(spec[1].slice(1),10));
            return str(v);
          });
        }
        case "list": return n.items.map(i=>evalNode(i,scope));
        case "tuple": return new PyTuple(n.items.map(i=>evalNode(i,scope)));
        case "set": return new Set(n.items.map(i=>evalNode(i,scope)));
        case "dict": { const m = new Map();
          for(const [k,v] of n.pairs) m.set(evalNode(k,scope), evalNode(v,scope)); return m; }
        case "neg": { const v = evalNode(n.e,scope);
          if(!isNum(v)) err("TypeError","bad operand type for unary -: '"+typeName(v)+"'");
          return isFloat(v) ? new PyFloat(-v.v) : -v; }
        case "not": return !truthy(evalNode(n.e,scope));
        case "and": { const l = evalNode(n.l,scope); return truthy(l) ? evalNode(n.r,scope) : l; }
        case "or": { const l = evalNode(n.l,scope); return truthy(l) ? l : evalNode(n.r,scope); }
        case "bin": return binop(n.op, evalNode(n.l,scope), evalNode(n.r,scope));
        case "cmp": return compareOp(n.op, evalNode(n.l,scope), evalNode(n.r,scope));
        case "attr": return getAttr(evalNode(n.obj,scope), n.name);
        case "index": {
          const o = evalNode(n.obj,scope), i = evalNode(n.i,scope);
          if(o instanceof Map){ if(!o.has(i)) err("KeyError",repr(i)); return o.get(i); }
          if(isStr(o)){ const idx = num(i)<0 ? o.length+num(i) : num(i);
            if(idx<0||idx>=o.length) err("IndexError","string index out of range"); return o[idx]; }
          const arr = Array.isArray(o) ? o : o instanceof PyTuple ? o.a : null;
          if(!arr) err("TypeError","'"+typeName(o)+"' object is not subscriptable");
          const idx = num(i)<0 ? arr.length+num(i) : num(i);
          if(idx<0||idx>=arr.length) err("IndexError","list index out of range");
          return arr[idx];
        }
        case "slice": {
          const o = evalNode(n.obj,scope);
          const seq = isStr(o) ? o : Array.isArray(o) ? o : o instanceof PyTuple ? o.a : null;
          if(seq === null) err("TypeError","'"+typeName(o)+"' object is not subscriptable");
          const L = seq.length;
          let lo = n.lo===null?0:num(evalNode(n.lo,scope)), hi = n.hi===null?L:num(evalNode(n.hi,scope));
          if(lo<0) lo += L; if(hi<0) hi += L;
          return isStr(o) ? o.slice(lo,hi) : seq.slice(lo,hi);
        }
        case "comp": {
          const inner = new Map(scope);           // the loop name stays local
          const out = [];
          for(const item of iterate(evalNode(n.iter, scope))){
            if(n.names.length === 1) inner.set(n.names[0], item);
            else { const vs = iterate(item); n.names.forEach((nm,i)=>inner.set(nm, vs[i])); }
            if(n.cond && !truthy(evalNode(n.cond, inner))) continue;
            out.push(evalNode(n.body, inner));
          }
          return out;
        }
        case "call": {
          const args = n.args.map(a=>evalNode(a,scope));
          const kw = {};
          for(const k in (n.kwargs||{})) kw[k] = evalNode(n.kwargs[k], scope);
          const fnNode = n.fn;
          if(fnNode.k === "attr"){
            const m = getAttr(evalNode(fnNode.obj,scope), fnNode.name);
            if(m && m.__method) return m.__method(args, kw);
            err("TypeError","'"+typeName(m)+"' object is not callable");
          }
          const f = evalNode(fnNode, scope);
          if(f && f.__builtin) return BUILTINS[f.__builtin](args, kw);
          if(f instanceof PyFunc) return callFunc(f, args, kw);
          if(f && f.__module) err("TypeError","'"+f.__module+"' is not available — this trainer has no modules, only the built-ins");
          err("TypeError","'"+typeName(f)+"' object is not callable");
        }
      }
      err("SyntaxError","cannot evaluate node "+n.k);
    }

    function callFunc(f, args, kw){
      kw = kw || {};
      const local = new Map(f.closure);
      f.params.forEach((pn,i)=>{
        if(i < args.length) local.set(pn, args[i]);
        else if(kw[pn] !== undefined) local.set(pn, kw[pn]);
        else if(f.defaults[pn] !== undefined) local.set(pn, evalNode(f.defaults[pn], local));
        else err("TypeError",f.name+"() missing required positional argument: '"+pn+"'");
      });
      if(f.rest) local.set(f.rest, new PyTuple(args.slice(f.params.length)));
      else if(args.length > f.params.length)
        err("TypeError",f.name+"() takes "+f.params.length+" positional arguments but "+args.length+" were given");
      for(const k in kw) if(!f.params.includes(k))
        err("TypeError",f.name+"() got an unexpected keyword argument '"+k+"'");
      const r = execBlock(f.body, local);
      return r instanceof Ret ? r.v : null;
    }

    function assign(target, value, scope){
      if(target.k === "name"){ scope.set(target.v, value); return; }
      if(target.k === "index"){
        const o = evalNode(target.obj,scope), i = evalNode(target.i,scope);
        if(o instanceof Map){ o.set(i,value); return; }
        if(Array.isArray(o)){ const idx = num(i)<0 ? o.length+num(i) : num(i);
          if(idx<0||idx>=o.length) err("IndexError","list assignment index out of range");
          o[idx] = value; return; }
        err("TypeError","'"+typeName(o)+"' object does not support item assignment");
      }
      if(target.k === "tuple"){
        const vals = iterate(value);
        target.items.forEach((t,i)=>assign(t, vals[i], scope));
        return;
      }
      err("SyntaxError","cannot assign to this expression");
    }

    let steps = 0;
    function execBlock(body, scope){
      for(const st of body){
        if(++steps > 400000) err("RuntimeError","this program ran too long — check your loop condition");
        const r = execStmt(st, scope);
        if(r) return r;
      }
      return null;
    }

    function execStmt(st, scope){
      switch(st.k){
        case "pass": return null;
        case "import": st.names.forEach(n => scope.set(n, {__module:n})); return null;
        case "expr": evalNode(st.e, scope); return null;
        case "assign": assign(st.target, evalNode(st.value, scope), scope); return null;
        case "aug": {
          const cur = evalNode(st.target, scope);
          assign(st.target, binop(st.op, cur, evalNode(st.value, scope)), scope);
          return null;
        }
        case "if": {
          for(const c of st.clauses)
            if(truthy(evalNode(c.test, scope))) return execBlock(c.body, scope);
          return execBlock(st.orelse, scope);
        }
        case "while": {
          let guard = 0;
          while(truthy(evalNode(st.test, scope))){
            if(++guard > 100000) err("RuntimeError","this while loop did not terminate");
            const r = execBlock(st.body, scope);
            if(r === BREAK) break;
            if(r && r !== CONT) return r;
          }
          return null;
        }
        case "for": {
          for(const item of iterate(evalNode(st.iter, scope))){
            if(st.names.length === 1) scope.set(st.names[0], item);
            else { const vals = iterate(item); st.names.forEach((nm,i)=>scope.set(nm, vals[i])); }
            const r = execBlock(st.body, scope);
            if(r === BREAK) break;
            if(r && r !== CONT) return r;
          }
          return null;
        }
        case "def": scope.set(st.name, new PyFunc(st.name, st.params, st.defaults, st.body, scope, st.rest)); return null;
        case "return": return new Ret(st.v ? evalNode(st.v, scope) : null);
        case "break": return BREAK;
        case "continue": return CONT;
        case "with": {
          const ctx = evalNode(st.ctx, scope);
          scope.set(st.name, ctx);
          try { return execBlock(st.body, scope); }
          finally { if(ctx instanceof PyFile){ flushFile(ctx); ctx.closed = true; } }
        }
        case "try": {
          try { const r = execBlock(st.body, scope); if(r) return r; }
          catch(e){
            if(!(e instanceof PyErr)) throw e;
            for(const h of st.handlers){
              if(h.type === null || h.type === e.pytype ||
                 (h.type === "Exception") || (h.type === "OSError" && /Error$/.test(e.pytype))){
                if(h.alias) scope.set(h.alias, e.pymsg);
                const r = execBlock(h.body, scope);
                if(r) return r;
                return execBlock(st.final, scope);
              }
            }
            execBlock(st.final, scope);
            throw e;
          }
          return execBlock(st.final, scope);
        }
        case "raise": {
          const v = st.e ? evalNode(st.e, scope) : null;
          if(v && v.__call) err("Exception", str(v));
          err("Exception", v === null ? "" : str(v));
        }
      }
      err("SyntaxError","unknown statement "+st.k);
    }

    try {
      const ast = parse(lex(src));
      execBlock(ast, globals);
      return {out: out.join(""), err:"", code:0};
    } catch(e){
      if(e instanceof PyErr){
        const body = out.join("");
        return {out: body, err: "Traceback (most recent call last):\n  File \"<stdin>\"\n"+
                e.pytype+(e.pymsg?": "+e.pymsg:""), code:1};
      }
      if(e && e.message && /Maximum call stack/.test(e.message))
        return {out: out.join(""), err:"RecursionError: maximum recursion depth exceeded", code:1};
      throw e;
    }
  }

  /* ---- wire python3 into the shell ---- */
  K.C.python3 = (argv, stdin) => {
    const {flags, ops} = K.splitFlags(argv);
    if(flags.has("V") || argv.includes("--version")) return {out:"Python 3.12.4\n", err:"", code:0};
    const ci = argv.indexOf("-c");
    if(ci >= 0) { const r = run(argv[ci+1] || "", {stdin});
      return {out:r.out, err:r.err?r.err+"\n":"", code:r.code}; }
    if(!ops.length) return {out:"", err:"python3: an interactive prompt is not available here — write a .py file and run it\n", code:1};
    const p = ops[0];
    const r = lookup(p);
    if(!r.node) return {out:"", err:"python3: can't open file '"+K.abspath(p)+"': [Errno 2] No such file or directory\n", code:2};
    if(r.node.t === "d") return {out:"", err:"python3: '"+p+"' is a directory\n", code:2};
    const res = run(r.node.c, {stdin});
    return {out:res.out, err:res.err?res.err+"\n":"", code:res.code};
  };
  K.C.python = K.C.python3;
  K.C.pip = () => ({out:"", err:"pip: no network in this trainer — the standard library is all you need here\n", code:1});
  K.py = run;
  return K;
}
