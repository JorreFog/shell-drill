/* Populate a fresh machine. Everything a lab might inspect lives here, so the
   same box supports every week without being reseeded per lecture. */
function seedVM(K){
  const {vm, mkdirp, put} = K;
  const H = vm.HOME;

  for(const d of ["/bin","/boot","/dev","/etc","/home","/opt","/proc","/root","/run","/srv",
                  "/tmp","/usr/bin","/usr/local/bin","/usr/share","/var/log","/var/www","/var/backups"])
    mkdirp(d, 0o755);
  mkdirp("/root", 0o700, "root", "root");
  mkdirp(H, 0o755, "analyst", "analyst");
  // mkdirp only sets the mode when it creates the node, so fix these up directly
  K.lookup("/tmp").node.mode = 0o1777;      // world-writable, like a real /tmp
  K.lookup("/root").node.mode = 0o700;
  K.lookup(H).node.mode = 0o755;

  /* ---- /etc ---- */
  put("/etc/hostname", vm.host+"\n");
  put("/etc/os-release",
    'NAME="Arch Linux"\nPRETTY_NAME="Arch Linux"\nID=arch\nBUILD_ID=rolling\n'+
    'HOME_URL="https://archlinux.org/"\nLOGO=archlinux-logo\n');
  put("/etc/passwd",
    "root:x:0:0::/root:/bin/bash\n"+
    "daemon:x:1:1::/usr/sbin:/usr/sbin/nologin\n"+
    "bin:x:2:2::/bin:/usr/sbin/nologin\n"+
    "www-data:x:33:33::/var/www:/usr/sbin/nologin\n"+
    "sshd:x:74:74::/var/empty:/usr/sbin/nologin\n"+
    "analyst:x:1000:1000::/home/analyst:/bin/bash\n");
  put("/etc/group",
    "root:x:0:\nsudo:x:27:analyst\nwww-data:x:33:\nusers:x:100:analyst\nanalyst:x:1000:\n");
  put("/etc/shadow", "root:!:19000:0:99999:7:::\nanalyst:$6$rounds$abc:19000:0:99999:7:::\n", 0o640, "root", "shadow");
  put("/etc/hosts", "127.0.0.1\tlocalhost\n127.0.1.1\t"+vm.host+"\n::1\t\tlocalhost\n");
  put("/etc/resolv.conf", "nameserver 10.0.0.1\nnameserver 1.1.1.1\n");
  put("/etc/fstab",
    "UUID=8f3c-21ab  /       ext4  rw,relatime  0 1\n"+
    "UUID=1a2b-33cd  /boot   vfat  rw,noatime   0 2\n");
  mkdirp("/etc/ssh", 0o755);
  put("/etc/ssh/sshd_config",
    "Port 22\nPermitRootLogin no\nPasswordAuthentication yes\nPubkeyAuthentication yes\n"+
    "PermitEmptyPasswords no\nX11Forwarding no\nClientAliveInterval 300\n");
  mkdirp("/etc/systemd/system", 0o755);
  put("/etc/logrotate.conf", "weekly\nrotate 4\ncreate\ncompress\ninclude /etc/logrotate.d\n");
  mkdirp("/etc/audit", 0o755);
  put("/etc/audit/audit.rules", "-w /etc/passwd -p wa -k identity\n-w /etc/shadow -p wa -k identity\n-a always,exit -F arch=b64 -S execve -k exec\n");

  /* ---- home ---- */
  put(H+"/notes.txt", "remember to check the backup job\ncheck disk usage on /var\n", 0o644, "analyst", "analyst");
  put(H+"/.bashrc", "alias ll='ls -la'\nexport EDITOR=nano\nPS1='\\u@\\h:\\w\\$ '\n", 0o644, "analyst", "analyst");
  put(H+"/.profile", "# ~/.profile\n", 0o644, "analyst", "analyst");
  /* ~/.ssh exists already and is too open, which is the point of the lecture 5
     task that asks you to fix it. It used to be absent, so the ssh-keygen in the
     task before created it at 0700 and the fix task then completed itself before
     the student had done anything. mkdirp leaves an existing directory's mode
     alone, exactly as the real ssh-keygen does. */
  mkdirp(H+"/.ssh", 0o755, "analyst", "analyst");
  put(H+"/.ssh/known_hosts", "srv-web.lan ssh-ed25519 AAAAC3NzaC1lZDI1NTE5\n",
      0o644, "analyst", "analyst");
  mkdirp(H+"/projects", 0o755, "analyst", "analyst");
  mkdirp(H+"/projects/webshop", 0o755, "analyst", "analyst");
  put(H+"/projects/webshop/index.html", "<h1>webshop</h1>\n", 0o644, "analyst", "analyst");
  put(H+"/projects/webshop/app.conf", "port=8080\ndebug=false\n", 0o644, "analyst", "analyst");
  put(H+"/projects/README.md", "# projects\nOne directory per assignment.\n", 0o644, "analyst", "analyst");
  mkdirp(H+"/reports", 0o755, "analyst", "analyst");
  put(H+"/reports/report.txt", "quarterly report\nall systems nominal\n", 0o644, "analyst", "analyst");
  put(H+"/reports/old.conf", "legacy=true\n", 0o644, "analyst", "analyst");
  put(H+"/deploy.sh", "#!/bin/bash\necho deploying\n", 0o644, "analyst", "analyst");
  put(H+"/id_rsa", "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEA\n-----END OPENSSH PRIVATE KEY-----\n", 0o644, "analyst", "analyst");
  mkdirp(H+"/logs", 0o755, "analyst", "analyst");
  mkdirp(H+"/cache", 0o755, "analyst", "analyst");
  put(H+"/cache/tmp1.tmp", "junk\n", 0o644, "analyst", "analyst");
  put(H+"/cache/tmp2.tmp", "junk\n", 0o644, "analyst", "analyst");
  put(H+"/cache/keep.txt", "keep me\n", 0o644, "analyst", "analyst");
  put(H+"/temp.log", "temporary\n", 0o644, "analyst", "analyst");
  mkdirp(H+"/scratch", 0o755, "analyst", "analyst");

  /* ---- logs ---- */
  const acc = [];
  const ips = ["10.0.0.24","91.240.118.44","10.0.0.31","203.0.113.9","10.0.0.24","91.240.118.44",
               "10.0.0.24","198.51.100.7","10.0.0.31","91.240.118.44"];
  const paths = ["/index.html","/login","/admin","/api/v1/users","/static/app.css","/missing","/admin","/login"];
  for(let i=0;i<40;i++){
    const ip = ips[i%ips.length], p = paths[i%paths.length];
    const code = p==="/missing" ? 404 : (p==="/admin" && i%3===0) ? 403 : 200;
    acc.push(ip+' - - [31/Aug/2026:09:'+String(10+(i%50)).padStart(2,"0")+':02 +0000] "GET '+p+' HTTP/1.1" '+code+" "+(200+i*7));
  }
  put("/var/log/access.log", acc.join("\n")+"\n", 0o644, "root", "root");

  const auth = [];
  for(let i=0;i<12;i++)
    auth.push("Aug 31 09:"+String(20+i).padStart(2,"0")+":02 "+vm.host+
      " sshd[41"+(10+i)+"]: Failed password for invalid user admin from 91.240.118.44 port 55"+(200+i)+" ssh2");
  auth.push("Aug 31 09:33:40 "+vm.host+" sshd[4130]: Accepted publickey for analyst from 10.0.0.24 port 51022 ssh2");
  auth.push("Aug 31 09:34:01 "+vm.host+" sudo:  analyst : TTY=pts/0 ; PWD=/home/analyst ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx");
  auth.push("Aug 31 09:41:12 "+vm.host+" sshd[4155]: Failed password for root from 203.0.113.9 port 44210 ssh2");
  put("/var/log/auth.log", auth.join("\n")+"\n", 0o640, "root", "adm");

  put("/var/log/syslog",
    ["Aug 31 09:00:01 "+vm.host+" systemd[1]: Started Daily apt upgrade and clean activities.",
     "Aug 31 09:04:22 "+vm.host+" kernel: [ 3021.114] EXT4-fs (sda2): mounted filesystem",
     "Aug 31 09:12:10 "+vm.host+" nginx[1180]: 10.0.0.24 GET /index.html 200",
     "Aug 31 09:18:44 "+vm.host+" cron[912]: (analyst) CMD (/home/analyst/backup.sh)",
     "Aug 31 09:22:03 "+vm.host+" systemd[1]: nginx.service: Failed with result 'exit-code'.",
     "Aug 31 09:22:04 "+vm.host+" nginx[1180]: emerg: bind() to 0.0.0.0:80 failed (98: Address already in use)"
    ].join("\n")+"\n", 0o644, "root", "root");
  put("/var/log/app.log",
    ["2026-08-31 09:00:12 INFO  starting worker pool",
     "2026-08-31 09:00:13 ERROR failed to connect to database",
     "2026-08-31 09:00:18 warn  retrying connection",
     "2026-08-31 09:00:21 INFO  connected",
     "2026-08-31 09:03:02 Error timeout talking to cache",
     "2026-08-31 09:07:55 INFO  job finished",
     "2026-08-31 09:09:31 ERROR disk write failed"].join("\n")+"\n", 0o644, "root", "root");
  put("/var/log/hosts.txt",
    ["web01","db01","web01","cache01","web01","db01","web02"].join("\n")+"\n", 0o644, "root", "root");
  put(H+"/hosts.txt", ["web01","db01","web01","cache01","web01","db01","web02"].join("\n")+"\n", 0o644, "analyst", "analyst");
  put(H+"/urls.txt", "http://example.com/a\nhttp://example.com/b\nhttps://example.com/c\n", 0o644, "analyst", "analyst");

  put("/var/www/index.html", "<h1>It works</h1>\n", 0o644, "root", "root");

  /* ---- suid binaries, for the permissions week ---- */
  const bins = {passwd:0o4755, sudo:0o4755, ping:0o755, ls:0o755, cat:0o755, grep:0o755,
                mount:0o4755, find:0o755, bash:0o755, systemctl:0o755};
  for(const b in bins) put("/usr/bin/"+b, "#!ELF\n", bins[b], "root", "root");
  put("/opt/legacy-helper", "#!ELF\n", 0o4755, "root", "root"); // the suspicious one

  /* ---- services, processes, sockets, network ---- */
  vm.units = {
    sshd:   {desc:"OpenSSH Daemon", state:"running", enabled:true,  pid:742},
    nginx:  {desc:"nginx web server", state:"dead",  enabled:false, pid:0},
    cron:   {desc:"Periodic Command Scheduler", state:"running", enabled:true, pid:912},
    docker: {desc:"Docker Application Container Engine", state:"dead", enabled:false, pid:0},
    postgresql:{desc:"PostgreSQL database server", state:"dead", enabled:false, pid:0},
    "systemd-journald":{desc:"Journal Service", state:"running", enabled:true, pid:301},
    bluetooth:{desc:"Bluetooth service", state:"failed", enabled:false, pid:0}
  };
  vm.procs = [
    {pid:1,    user:"root",    cpu:"0.0", cmd:"/sbin/init"},
    {pid:301,  user:"root",    cpu:"0.1", cmd:"/usr/lib/systemd/systemd-journald"},
    {pid:742,  user:"root",    cpu:"0.0", cmd:"/usr/sbin/sshd -D"},
    {pid:912,  user:"root",    cpu:"0.0", cmd:"/usr/sbin/cron -f"},
    {pid:1180, user:"www-data",cpu:"1.2", cmd:"nginx: worker process"},
    {pid:2044, user:"analyst", cpu:"0.3", cmd:"-bash"},
    {pid:4821, user:"analyst", cpu:"98.7",cmd:"node server.js"},
    {pid:5310, user:"analyst", cpu:"0.0", cmd:"ps"}
  ];
  vm.sockets = [
    {proto:"tcp", state:"LISTEN", addr:"0.0.0.0", port:22,   proc:"sshd",     pid:742},
    {proto:"tcp", state:"LISTEN", addr:"0.0.0.0", port:80,   proc:"nginx",    pid:1180},
    {proto:"tcp", state:"LISTEN", addr:"127.0.0.1",port:5432,proc:"postgres", pid:1502},
    {proto:"tcp", state:"LISTEN", addr:"0.0.0.0", port:3000, proc:"node",     pid:4821},
    {proto:"udp", state:"UNCONN", addr:"0.0.0.0", port:68,   proc:"dhclient", pid:688},
    {proto:"udp", state:"UNCONN", addr:"127.0.0.1",port:53,  proc:"systemd-resolve", pid:410}
  ];
  vm.iface = {
    lo:   {flags:"LOOPBACK,UP,LOWER_UP", state:"UNKNOWN", addr:"127.0.0.1/8"},
    eth0: {flags:"BROADCAST,MULTICAST,UP,LOWER_UP", state:"UP", addr:"10.0.0.24/24"}
  };
  vm.gateway = "10.0.0.1";
  vm.subnet  = "10.0.0.0/24";
  vm.dns = {"example.com":"93.184.216.34", "archlinux.org":"95.217.163.246",
            "10.0.0.1":"10.0.0.1", "10.0.0.5":"10.0.0.5", "localhost":"127.0.0.1"};
  vm.remote = {"10.0.0.5":[22,80], "10.0.0.1":[53,80], "localhost":[22,80,3000]};
  vm.web = {"example.com":{server:"ECS", body:"<h1>Example Domain</h1>"},
            "localhost":{server:"nginx/1.27.0", body:"<h1>It works</h1>"}};
  vm.journal = [
    {time:"Aug 31 09:00:01", unit:"systemd", pri:"info",    msg:"Startup finished in 4.812s."},
    {time:"Aug 31 09:00:04", unit:"sshd",    pri:"info",    msg:"Server listening on 0.0.0.0 port 22."},
    {time:"Aug 31 09:12:10", unit:"nginx",   pri:"info",    msg:"10.0.0.24 GET /index.html 200"},
    {time:"Aug 31 09:20:02", unit:"sshd",    pri:"warning", msg:"Failed password for invalid user admin from 91.240.118.44"},
    {time:"Aug 31 09:22:03", unit:"nginx",   pri:"err",     msg:"bind() to 0.0.0.0:80 failed (98: Address already in use)"},
    {time:"Aug 31 09:22:04", unit:"systemd", pri:"err",     msg:"nginx.service: Failed with result 'exit-code'."},
    {time:"Aug 31 09:25:44", unit:"bluetooth",pri:"err",    msg:"Failed to start Bluetooth service."},
    {time:"Aug 31 09:31:12", unit:"cron",    pri:"info",    msg:"(analyst) CMD (/home/analyst/backup.sh)"},
    {time:"Aug 31 09:41:12", unit:"sshd",    pri:"warning", msg:"Failed password for root from 203.0.113.9"},
    {time:"Aug 31 09:44:20", unit:"kernel",  pri:"crit",    msg:"EXT4-fs error (device sda2): ext4_find_entry"}
  ];
  vm.cron = [];
  vm.allGroups = ["root","sudo","www-data","users","analyst","adm","shadow"];

  /* ---- packages: one database behind pacman / apt / dnf / zypper ---- */
  vm.repo = {
    firefox:  {ver:"128.0-1", desc:"Fast, private and safe web browser",
               deps:["gtk3","nss"], files:["/usr/bin/firefox"], size:212},
    nmap:     {ver:"7.95-1", desc:"Utility for network discovery and security auditing",
               deps:["lua"], files:["/usr/bin/nmap","/usr/bin/ncat"], size:26},
    htop:     {ver:"3.3.0-1", desc:"Interactive process viewer", deps:[], files:["/usr/bin/htop"], size:1},
    nginx:    {ver:"1.27.0-1", desc:"Lightweight HTTP server and reverse proxy",
               deps:["pcre2"], files:["/usr/bin/nginx"], size:8},
    git:      {ver:"2.45.2-1", desc:"Fast distributed version control system", deps:[], files:["/usr/bin/git"], size:24},
    tcpdump:  {ver:"4.99.4-1", desc:"Powerful command-line packet analyser",
               deps:["libpcap"], files:["/usr/bin/tcpdump"], size:2},
    gtk3:     {ver:"3.24.42-1", desc:"GObject-based multi-platform GUI toolkit", deps:[], files:[], size:48},
    nss:      {ver:"3.101-1", desc:"Network Security Services", deps:[], files:[], size:6},
    lua:      {ver:"5.4.6-1", desc:"Powerful lightweight programming language", deps:[], files:[], size:1},
    pcre2:    {ver:"10.44-1", desc:"Perl compatible regular expressions library", deps:[], files:[], size:2},
    libpcap:  {ver:"1.10.4-1", desc:"Portable packet capture library", deps:[], files:[], size:1},
    coreutils:{ver:"9.5-1", desc:"The basic file, shell and text manipulation utilities",
               deps:[], files:["/usr/bin/ls","/usr/bin/cat"], size:15},
    bash:     {ver:"5.2.032-1", desc:"The GNU Bourne Again shell", deps:[], files:["/usr/bin/bash"], size:8},
    openssh:  {ver:"9.8p1-1", desc:"SSH protocol implementation for remote login",
               deps:[], files:["/usr/bin/ssh","/usr/bin/ssh-keygen"], size:9},
    "shadow": {ver:"4.16.0-1", desc:"Password and account management tool suite",
               deps:[], files:["/usr/bin/passwd"], size:2}
  };
  vm.installed = {};
  ["coreutils","bash","openssh","git","shadow","nginx","pcre2"].forEach(n => {
    vm.installed[n] = Object.assign({}, vm.repo[n], {auto: n === "pcre2"});
  });
  vm.pkgCache = 148;

  /* ---- login history for last / lastb ---- */
  vm.logins = [
    {user:"analyst", tty:"pts/0", from:"10.0.0.24",     when:"Mon Aug 31 08:58   still logged in"},
    {user:"analyst", tty:"pts/1", from:"10.0.0.24",     when:"Sun Aug 30 14:02 - 16:41  (02:39)"},
    {user:"root",    tty:"tty1",  from:"-",             when:"Sun Aug 30 09:15 - 09:22  (00:07)"},
    {user:"admin",   tty:"ssh",   from:"91.240.118.44", when:"Sun Aug 30 03:11 - 03:11  (00:00)", bad:true},
    {user:"admin",   tty:"ssh",   from:"91.240.118.44", when:"Sun Aug 30 03:10 - 03:10  (00:00)", bad:true},
    {user:"analyst", tty:"pts/0", from:"10.0.0.24",     when:"Fri Aug 28 08:02 - 17:30  (09:28)"}
  ];

  /* ---- mount table and block devices ---- */
  vm.mounts = [
    {dev:"/dev/sda2", at:"/",     fs:"ext4",  opts:"rw,relatime"},
    {dev:"/dev/sda1", at:"/boot", fs:"vfat",  opts:"rw,noatime"},
    {dev:"tmpfs",     at:"/dev/shm", fs:"tmpfs", opts:"rw,nosuid,nodev"}
  ];
  vm.blockdev = ["/dev/sda","/dev/sda1","/dev/sda2","/dev/sdb","/dev/sdb1"];
  mkdirp("/mnt", 0o755);

  /* Spread modification times out so -mtime and -newer mean something, and
     give a couple of files real bulk so -size does too. */
  const DAY = 86400;
  const age = (p, days) => { const n = K.lookup(p).node; if(n) n.mt = vm.now - days*DAY; };
  age(H+"/notes.txt", 0);
  age(H+"/urls.txt", 1);
  age(H+"/hosts.txt", 3);
  age(H+"/deploy.sh", 6);
  age(H+"/temp.log", 12);
  age(H+"/id_rsa", 40);
  age(H+"/reports/old.conf", 400);
  age(H+"/reports/report.txt", 200);
  age(H+"/projects/README.md", 30);
  age(H+"/.bashrc", 365);
  age(H+"/cache/tmp1.tmp", 2);
  age(H+"/cache/tmp2.tmp", 9);
  // a big file, so `find -size +1M` and `du -h` have something to find
  put(H+"/logs/big-capture.pcap", "[binary capture data]\n", 0o644, "analyst", "analyst");
  K.lookup(H+"/logs/big-capture.pcap").node.sz = 3 * 1024 * 1024;
  age(H+"/logs/big-capture.pcap", 5);
  return K;
}
