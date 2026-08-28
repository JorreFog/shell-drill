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
  return K;
}
