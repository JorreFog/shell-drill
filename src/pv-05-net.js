/* ===================== preview: a network for the machine =====================
   Lecture F4 of the course is "Networking, Firewalls, Subnetting" and the second
   course in the programme is Nätverkssäkerhet, but the simulated machine has
   never had a network to look at. Commands like ping and ss had nothing to
   report, so those lectures were the only ones you could not actually practise.

   This gives the machine a small LAN that behaves consistently: hosts answer
   ping only if they are up and the firewall lets the packet out, nmap finds
   exactly the ports those hosts declare, curl gets the page the host serves,
   and a ufw rule you add really does stop the next ping. Every command reads
   the same state, so the network cannot contradict itself.

   Attached the same way python is: attachNet(K) hangs commands off K.C. */

function makeNet(){
  /* One /24, a gateway, and a handful of machines a student would expect to
     meet on a small office network — plus one that should not be there. */
  const hosts = [
    {ip:"10.0.0.1",  name:"gw",           mac:"3c:7a:8a:11:00:01", up:true, kind:"router",
     ports:[{n:22,svc:"ssh",ver:"OpenSSH 9.6"},{n:80,svc:"http",ver:"lighttpd 1.4"}]},
    {ip:"10.0.0.10", name:"workstation-07",mac:"52:54:00:9d:2b:1a", up:true, self:true, kind:"workstation",
     ports:[{n:22,svc:"ssh",ver:"OpenSSH 9.6"}]},
    {ip:"10.0.0.20", name:"srv-web",      mac:"3c:7a:8a:11:00:20", up:true, kind:"server",
     ports:[{n:22,svc:"ssh",ver:"OpenSSH 9.6"},
            {n:80,svc:"http",ver:"nginx 1.24.0"},
            {n:443,svc:"https",ver:"nginx 1.24.0"}],
     http:{title:"srv-web — internal", server:"nginx/1.24.0",
           body:"<h1>Internal web</h1>\n<p>Staging for the intranet.</p>\n"}},
    {ip:"10.0.0.21", name:"srv-db",       mac:"3c:7a:8a:11:00:21", up:true, kind:"server",
     ports:[{n:22,svc:"ssh",ver:"OpenSSH 9.6"},
            {n:5432,svc:"postgresql",ver:"PostgreSQL 16.2"}]},
    {ip:"10.0.0.22", name:"srv-files",    mac:"3c:7a:8a:11:00:22", up:true, kind:"server",
     ports:[{n:21,svc:"ftp",ver:"vsftpd 3.0.5"},
            {n:22,svc:"ssh",ver:"OpenSSH 9.6"},
            {n:445,svc:"microsoft-ds",ver:"Samba 4.19"}]},
    {ip:"10.0.0.30", name:"prn-hp-2",     mac:"3c:7a:8a:11:00:30", up:true, kind:"printer",
     ports:[{n:80,svc:"http",ver:"HP embedded"},{n:9100,svc:"jetdirect",ver:"HP JetDirect"}],
     http:{title:"HP LaserJet — configuration", server:"HP-ChaiSOE/1.0",
           body:"<h1>Printer admin</h1>\n<p>Administrator password: not set</p>\n"}},
    /* the point of the exercise: nobody put this here on purpose */
    {ip:"10.0.0.99", name:"",             mac:"b8:27:eb:4f:19:77", up:true, kind:"unknown",
     ports:[{n:23,svc:"telnet",ver:"BusyBox telnetd"},
            {n:8080,svc:"http-proxy",ver:"tinyproxy 1.11"}],
     http:{title:"", server:"tinyproxy/1.11", body:"proxy\n"}},
    /* off today, so "no answer" does not always mean "blocked" */
    {ip:"10.0.0.41", name:"laptop-anna",  mac:"3c:7a:8a:11:00:41", up:false, kind:"workstation", ports:[]},
  ];

  return {
    iface: {name:"enp3s0", ip:"10.0.0.10", cidr:24, mac:"52:54:00:9d:2b:1a", gw:"10.0.0.1",
            lo:{name:"lo", ip:"127.0.0.1", cidr:8}},
    hosts,
    dns: {"gw.lan":"10.0.0.1","srv-web.lan":"10.0.0.20","srv-db.lan":"10.0.0.21",
          "srv-files.lan":"10.0.0.22","prn-hp-2.lan":"10.0.0.30",
          "workstation-07.lan":"10.0.0.10","localhost":"127.0.0.1"},
    /* the machine's own listening sockets, which is what ss reports */
    listening: [{proto:"tcp", port:22, svc:"sshd", pid:641, addr:"0.0.0.0"},
                {proto:"tcp", port:631, svc:"cupsd", pid:702, addr:"127.0.0.1"},
                {proto:"udp", port:68,  svc:"dhclient", pid:534, addr:"0.0.0.0"}],
    fw: {enabled:false, rules:[]},   // {action:"allow"|"deny", dir:"in"|"out", port, proto, host}
    arp: {},
  };
}

/* ---------- helpers shared by the commands ---------- */
function netFind(net, target){
  if(!target) return null;
  const t = String(target).trim();
  const byIp = net.hosts.find(h => h.ip === t);
  if(byIp) return byIp;
  const name = t.replace(/\.lan$/, "");
  const byName = net.hosts.find(h => h.name && h.name === name);
  if(byName) return byName;
  const viaDns = net.dns[t] || net.dns[t + ".lan"];
  if(viaDns) return net.hosts.find(h => h.ip === viaDns) || null;
  return null;
}

/* Does the firewall let this packet out? Rules are matched in order, first
   match wins, and an enabled firewall with no matching rule allows — the same
   shape as ufw's default-allow-outgoing. */
function netAllowed(net, host, port, proto){
  if(!net.fw.enabled) return true;
  for(const r of net.fw.rules){
    if(r.dir !== "out") continue;
    if(r.host && r.host !== host.ip && r.host !== host.name) continue;
    if(r.port != null && r.port !== port) continue;
    if(r.proto && proto && r.proto !== proto) continue;
    return r.action === "allow";
  }
  return true;
}

function attachNet(K){
  const {vm} = K;
  if(!K.net) K.net = makeNet();
  const net = K.net;
  const ok  = out => ({out: out==null?"":out, err:"", code:0});
  const bad = (err,code) => ({out:"", err, code:code==null?1:code});

  const self = () => net.hosts.find(h => h.self);

  /* ---------------- ip ---------------- */
  K.C.ip = (argv) => {
    const sub = (argv[0]||"addr").replace(/^-/,"");
    const i = net.iface;
    if(/^a(ddr)?$/.test(sub)){
      return ok(
        "1: "+i.lo.name+": <LOOPBACK,UP,LOWER_UP> mtu 65536 state UNKNOWN\n"+
        "    inet "+i.lo.ip+"/"+i.lo.cidr+" scope host lo\n"+
        "2: "+i.name+": <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 state UP\n"+
        "    link/ether "+i.mac+" brd ff:ff:ff:ff:ff:ff\n"+
        "    inet "+i.ip+"/"+i.cidr+" brd 10.0.0.255 scope global "+i.name+"\n");
    }
    if(/^r(oute)?$/.test(sub)){
      return ok("default via "+i.gw+" dev "+i.name+" proto dhcp metric 100\n"+
                "10.0.0.0/"+i.cidr+" dev "+i.name+" proto kernel scope link src "+i.ip+" metric 100\n");
    }
    if(/^l(ink)?$/.test(sub)){
      return ok("1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536\n"+
                "2: "+i.name+": <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500\n"+
                "    link/ether "+i.mac+" brd ff:ff:ff:ff:ff:ff\n");
    }
    return bad('Object "'+sub+'" is unknown, try "ip help".\n');
  };
  K.C.ifconfig = () => {
    const i = net.iface;
    return ok(i.name+": flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n"+
      "        inet "+i.ip+"  netmask 255.255.255.0  broadcast 10.0.0.255\n"+
      "        ether "+i.mac+"  txqueuelen 1000  (Ethernet)\n");
  };

  /* ---------------- ping ---------------- */
  K.C.ping = (argv) => {
    const flags = argv.filter(a => a.startsWith("-"));
    const ops = argv.filter(a => !a.startsWith("-") && !/^\d+$/.test(a) || false);
    let count = 4;
    const ci = argv.indexOf("-c");
    if(ci >= 0 && argv[ci+1]) count = Math.max(1, Math.min(10, parseInt(argv[ci+1],10) || 4));
    const target = argv.filter((a,i) => !a.startsWith("-") && !(ci>=0 && i===ci+1))[0];
    if(!target) return bad("ping: usage error: Destination address required\n");

    const h = netFind(net, target);
    if(!h){
      if(/^\d+\.\d+\.\d+\.\d+$/.test(target)){
        /* an address inside our subnet that nothing answers on */
        return ok("PING "+target+" ("+target+") 56(84) bytes of data.\n\n"+
          "--- "+target+" ping statistics ---\n"+
          count+" packets transmitted, 0 received, 100% packet loss, time "+(count*1000)+"ms\n");
      }
      return bad("ping: "+target+": Name or service not known\n");
    }
    net.arp[h.ip] = h.mac;

    if(!netAllowed(net, h, null, "icmp"))
      return bad("PING "+target+" ("+h.ip+") 56(84) bytes of data.\n"+
        "ping: sendmsg: Operation not permitted\n", 2);

    if(!h.up)
      return ok("PING "+target+" ("+h.ip+") 56(84) bytes of data.\n"+
        "From "+net.iface.ip+" icmp_seq=1 Destination Host Unreachable\n\n"+
        "--- "+target+" ping statistics ---\n"+
        count+" packets transmitted, 0 received, +1 errors, 100% packet loss, time "+(count*1000)+"ms\n");

    let out = "PING "+target+" ("+h.ip+") 56(84) bytes of data.\n";
    for(let i=1;i<=count;i++){
      const ms = h.self ? 0.03 : (0.3 + ((i*7 + h.ip.length) % 9) / 10);
      out += "64 bytes from "+h.ip+": icmp_seq="+i+" ttl=64 time="+ms.toFixed(2)+" ms\n";
    }
    out += "\n--- "+target+" ping statistics ---\n"+
      count+" packets transmitted, "+count+" received, 0% packet loss, time "+((count-1)*1000)+"ms\n";
    return ok(out);
  };

  /* ---------------- ss / netstat ---------------- */
  K.C.ss = (argv) => {
    const f = argv.join("");
    const wantListen = /l/.test(f) || !/[tu]/.test(f);
    const rows = net.listening.filter(s =>
      (/t/.test(f) ? s.proto==="tcp" : false) || (/u/.test(f) ? s.proto==="udp" : false) ||
      (!/[tu]/.test(f)));
    const showPid = /p/.test(f);
    let out = "Netid  State   Recv-Q  Send-Q  Local Address:Port   Peer Address:Port  Process\n";
    rows.forEach(s => {
      out += s.proto.padEnd(7)+(s.proto==="tcp"?"LISTEN  ":"UNCONN  ")+"0       0       "+
        (s.addr+":"+s.port).padEnd(21)+"0.0.0.0:*".padEnd(19)+
        (showPid ? 'users:(("'+s.svc+'",pid='+s.pid+',fd=3))' : "")+"\n";
    });
    return ok(out);
  };
  K.C.netstat = K.C.ss;

  /* ---------------- arp ---------------- */
  K.C.arp = () => {
    const seen = Object.keys(net.arp);
    if(!seen.length) return ok("");
    let out = "Address                  HWtype  HWaddress           Flags Mask            Iface\n";
    seen.sort().forEach(ip => {
      const h = net.hosts.find(x => x.ip === ip);
      out += ip.padEnd(25)+"ether   "+net.arp[ip]+"   C                     "+net.iface.name+"\n";
    });
    return ok(out);
  };

  /* ---------------- dig / host ---------------- */
  K.C.dig = (argv) => {
    const name = argv.filter(a => !a.startsWith("+") && !a.startsWith("-"))[0];
    if(!name) return bad("dig: no name to look up\n");
    const ip = net.dns[name] || net.dns[name+".lan"];
    const short = argv.includes("+short");
    if(!ip) return short ? ok("") : ok(
      "; <<>> DiG 9.18 <<>> "+name+"\n;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN\n\n"+
      ";; QUESTION SECTION:\n;"+name+".\t\tIN\tA\n\n");
    if(short) return ok(ip+"\n");
    return ok("; <<>> DiG 9.18 <<>> "+name+"\n;; ->>HEADER<<- opcode: QUERY, status: NOERROR\n\n"+
      ";; QUESTION SECTION:\n;"+name+".\t\tIN\tA\n\n"+
      ";; ANSWER SECTION:\n"+name+".\t60\tIN\tA\t"+ip+"\n\n"+
      ";; SERVER: 10.0.0.1#53(10.0.0.1)\n");
  };
  K.C.host = (argv) => {
    const name = argv[0];
    const ip = name && (net.dns[name] || net.dns[name+".lan"]);
    if(ip) return ok(name+" has address "+ip+"\n");
    const h = netFind(net, name);
    if(h && h.name) return ok(h.ip+".in-addr.arpa domain name pointer "+h.name+".lan.\n");
    return bad("Host "+name+" not found: 3(NXDOMAIN)\n");
  };

  /* ---------------- nmap ----------------
     Enough of a scan to teach what a scan is: a host sweep over a CIDR, or a
     port list for one host, with -sV adding the version the host declares. */
  K.C.nmap = (argv) => {
    const sv = argv.includes("-sV");
    const sn = argv.includes("-sn") || argv.includes("-sP");
    const target = argv.filter(a => !a.startsWith("-"))[0];
    if(!target) return bad("nmap: no target specified\n");

    const stamp = "Starting Nmap 7.94 ( https://nmap.org )\n";
    if(/\/\d+$/.test(target)){
      const live = net.hosts.filter(h => h.up && netAllowed(net, h, null, "icmp"));
      let out = stamp;
      live.forEach(h => {
        out += "Nmap scan report for "+(h.name ? h.name+".lan ("+h.ip+")" : h.ip)+"\n"+
               "Host is up (0.00"+(20+h.ip.length)+"s latency).\n"+
               "MAC Address: "+h.mac.toUpperCase()+"\n";
        if(!sn && h.ports.length){
          out += "PORT      STATE SERVICE"+(sv?"    VERSION":"")+"\n";
          h.ports.forEach(p => { out += (p.n+"/tcp").padEnd(10)+"open  "+
            p.svc.padEnd(sv?10:0)+(sv?p.ver:"")+"\n"; });
        }
        out += "\n";
      });
      out += "Nmap done: 256 IP addresses ("+live.length+" hosts up) scanned\n";
      return ok(out);
    }

    const h = netFind(net, target);
    if(!h) return ok(stamp+"Note: Host seems down.\nNmap done: 1 IP address (0 hosts up) scanned\n");
    if(!h.up || !netAllowed(net, h, null, "icmp"))
      return ok(stamp+"Note: Host seems down. If it is really up, but blocking our ping probes, try -Pn\n"+
        "Nmap done: 1 IP address (0 hosts up) scanned\n");
    let out = stamp+"Nmap scan report for "+(h.name ? h.name+".lan ("+h.ip+")" : h.ip)+"\n"+
      "Host is up (0.0010s latency).\n";
    if(h.ports.length){
      out += "PORT      STATE SERVICE"+(sv?"    VERSION":"")+"\n";
      h.ports.forEach(p => { out += (p.n+"/tcp").padEnd(10)+"open  "+
        p.svc.padEnd(sv?10:0)+(sv?p.ver:"")+"\n"; });
    } else out += "All 1000 scanned ports on "+h.ip+" are in ignored states.\n";
    out += "MAC Address: "+h.mac.toUpperCase()+"\n\nNmap done: 1 IP address (1 host up) scanned\n";
    return ok(out);
  };

  /* ---------------- nc ---------------- */
  K.C.nc = (argv) => {
    const ops = argv.filter(a => !a.startsWith("-"));
    const target = ops[0], port = parseInt(ops[1],10);
    if(!target || !port) return bad("nc: usage: nc -zv host port\n");
    const h = netFind(net, target);
    if(!h) return bad("nc: getaddrinfo for host \""+target+"\" port "+port+": Name or service not known\n");
    if(!netAllowed(net, h, port, "tcp"))
      return bad("nc: connect to "+h.ip+" port "+port+" (tcp) failed: Operation not permitted\n");
    if(!h.up || !h.ports.some(p => p.n === port))
      return bad("nc: connect to "+h.ip+" port "+port+" (tcp) failed: Connection refused\n");
    return bad("Connection to "+target+" "+port+" port [tcp/"+
      (h.ports.find(p=>p.n===port).svc)+"] succeeded!\n", 0);
  };

  /* ---------------- traceroute ---------------- */
  K.C.traceroute = (argv) => {
    const target = argv.filter(a => !a.startsWith("-"))[0];
    const h = netFind(net, target);
    if(!h) return bad("traceroute: unknown host "+target+"\n");
    let out = "traceroute to "+target+" ("+h.ip+"), 30 hops max, 60 byte packets\n";
    if(h.ip !== net.iface.gw && !h.self)
      out += " 1  gw.lan ("+net.iface.gw+")  0.412 ms  0.388 ms  0.371 ms\n";
    out += " "+(h.self?1:2)+"  "+(h.name?h.name+".lan ":"")+"("+h.ip+")  0.9 ms  0.8 ms  0.8 ms\n";
    return ok(out);
  };

  /* ---------------- ufw ----------------
     Rules here are the same rules ping, nc and curl consult, so "deny then
     verify" is a real loop rather than a message that says it worked. */
  K.C.ufw = (argv) => {
    if(!vm.asRoot) return bad("ERROR: You need to be root to run this script\n");
    const sub = (argv[0]||"status").toLowerCase();

    if(sub === "enable"){ net.fw.enabled = true;  return ok("Firewall is active and enabled on system startup\n"); }
    if(sub === "disable"){ net.fw.enabled = false; return ok("Firewall stopped and disabled on system startup\n"); }
    if(sub === "reset"){ net.fw.enabled = false; net.fw.rules = []; return ok("Backing up 'user.rules'\nFirewall reset\n"); }

    if(sub === "status"){
      if(!net.fw.enabled) return ok("Status: inactive\n");
      let out = "Status: active\n\nTo                         Action      From\n"+
                "--                         ------      ----\n";
      net.fw.rules.forEach(r => {
        const to = r.host ? r.host + (r.port!=null ? " "+r.port : "")
                          : (r.port!=null ? String(r.port) : "Anywhere");
        out += to.padEnd(27)+(r.action.toUpperCase()+(r.dir==="out"?" OUT":"")).padEnd(12)+"Anywhere\n";
      });
      return ok(out);
    }

    if(sub === "allow" || sub === "deny"){
      const rest = argv.slice(1);
      const dir = rest[0] === "out" ? "out" : (rest[0] === "in" ? "in" : "out");
      const args = (rest[0]==="out"||rest[0]==="in") ? rest.slice(1) : rest;
      const rule = {action: sub, dir, port:null, proto:null, host:null};
      /* accepted shapes: PORT | PORT/proto | to IP | to IP port N | from IP */
      for(let i=0;i<args.length;i++){
        const a = args[i];
        if(a === "to" || a === "from"){ rule.host = args[++i]; continue; }
        if(a === "port"){ rule.port = parseInt(args[++i],10); continue; }
        if(a === "proto"){ rule.proto = args[++i]; continue; }
        if(/^\d+\/(tcp|udp)$/.test(a)){ const [p,pr]=a.split("/"); rule.port=+p; rule.proto=pr; continue; }
        if(/^\d+$/.test(a)){ rule.port = +a; continue; }
        if(/^\d+\.\d+\.\d+\.\d+$/.test(a)){ rule.host = a; continue; }
      }
      if(rule.port == null && rule.host == null)
        return bad("ERROR: Wrong number of arguments\n");
      net.fw.rules.push(rule);
      if(!net.fw.enabled) return ok("Rules updated\nFirewall not enabled (use 'ufw enable')\n");
      return ok("Rule added\n");
    }
    return bad("ERROR: Invalid syntax\n");
  };

  /* iptables reads the same rules, so the two views cannot disagree */
  K.C.iptables = (argv) => {
    if(!vm.asRoot) return bad("iptables v1.8.10 (nf_tables): Permission denied (you must be root)\n");
    if(!argv.includes("-L") && !argv.includes("--list"))
      return bad("iptables: use -L here; rule editing is done with ufw in this trainer\n");
    let out = "Chain INPUT (policy ACCEPT)\ntarget     prot opt source               destination\n\n"+
              "Chain FORWARD (policy ACCEPT)\ntarget     prot opt source               destination\n\n"+
              "Chain OUTPUT (policy ACCEPT)\ntarget     prot opt source               destination\n";
    if(net.fw.enabled) net.fw.rules.filter(r=>r.dir==="out").forEach(r => {
      out += (r.action==="deny"?"DROP":"ACCEPT").padEnd(11)+
        (r.proto||"all").padEnd(5)+"--  anywhere             "+
        (r.host||"anywhere")+(r.port!=null?"  tcp dpt:"+r.port:"")+"\n";
    });
    return ok(out);
  };

  /* ---------------- curl, extended to reach the LAN ----------------
     The published curl fetches from a small table of canned sites; this keeps
     that and adds the hosts on the network, firewall included. */
  const innerCurl = K.C.curl;
  K.C.curl = (argv, stdin) => {
    const url = argv.filter(a => !a.startsWith("-"))[0] || "";
    const m = url.match(/^(?:https?:\/\/)?([^\/:\s]+)(?::(\d+))?(\/[^\s]*)?$/);
    const h = m && netFind(net, m[1]);
    if(!h) return innerCurl ? innerCurl(argv, stdin)
                            : bad("curl: (6) Could not resolve host: "+url+"\n");
    const port = m[2] ? parseInt(m[2],10) : 80;
    if(!netAllowed(net, h, port, "tcp"))
      return bad("curl: (7) Failed to connect to "+m[1]+" port "+port+": Operation not permitted\n", 7);
    if(!h.up || !h.ports.some(p => p.n === port))
      return bad("curl: (7) Failed to connect to "+m[1]+" port "+port+": Connection refused\n", 7);
    if(!h.http) return bad("curl: (52) Empty reply from server\n", 52);
    if(argv.includes("-I") || argv.includes("--head"))
      return ok("HTTP/1.1 200 OK\nServer: "+h.http.server+"\nContent-Type: text/html\n"+
                "Content-Length: "+h.http.body.length+"\n\n");
    return ok((h.http.title ? "<title>"+h.http.title+"</title>\n" : "") + h.http.body);
  };

  /* the machine has a network now, so stop claiming otherwise */
  K.C.pip = () => ({out:"", err:"pip: no package index reachable from this network\n", code:1});

  return K;
}
