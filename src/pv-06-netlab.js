/* ===================== preview: network security lab =====================
   Nätverkssäkerhet is the second course in the programme and has been a
   placeholder with a provisional quiz. With a network on the machine it can
   have real work instead: find what is on the wire, notice the thing that
   should not be there, shut it out, and prove it is shut out.

   The checks read machine state — files you wrote, rules the firewall holds —
   never the text you typed, which is the same contract the existing labs use.
   That matters here: there are several right ways to find a rogue host, and a
   check that insisted on one command would be teaching the command instead of
   the skill. */

/* every machine built from here on also gets a network */
if(typeof attachPython === "function" && typeof attachNet === "function"){
  const _attachPython = attachPython;
  window.attachPython = function(K){ return attachNet(_attachPython(K)); };
}

const NETLAB = {
  title: {sv:"Nätverksrekognosering och brandvägg", en:"Network recon and firewall"},
  brief: {sv:"Du sitter på 10.0.0.10 i ett litet kontorsnät. Ta reda på vad som finns "+
             "där ute, hitta det som inte hör hemma, och stäng ute det.",
          en:"You are on 10.0.0.10 in a small office network. Find out what is out "+
             "there, find the thing that does not belong, and shut it out."},
  tasks: [
    {q: {sv:"Skriv den här maskinens IPv4-adress till ~/net/ip.txt.",
         en:"Write this machine's IPv4 address to ~/net/ip.txt."},
     hint: {sv:"ip a visar adressen. Katalogen måste finnas först.",
            en:"ip a shows the address. The directory has to exist first."},
     answer: ["mkdir -p ~/net", "ip a > ~/net/raw.txt", "echo 10.0.0.10 > ~/net/ip.txt"],
     check: (K) => fileHas(K, "/home/analyst/net/ip.txt", /\b10\.0\.0\.10\b/)},

    {q: {sv:"Svepet: skriv IP-adresserna för alla värdar som svarar i 10.0.0.0/24 "+
            "till ~/net/hosts.txt, en per rad.",
         en:"Sweep the network: write the IP of every host that answers in "+
            "10.0.0.0/24 to ~/net/hosts.txt, one per line."},
     hint: {sv:"nmap -sn 10.0.0.0/24 svarar. Sju värdar är uppe.",
            en:"nmap -sn 10.0.0.0/24 answers this. Seven hosts are up."},
     answer: ["nmap -sn 10.0.0.0/24 > ~/net/scan.txt",
              "grep -o '10\\.0\\.0\\.[0-9]*' ~/net/scan.txt | sort -u > ~/net/hosts.txt"],
     check: (K) => {
       const c = readFileText(K, "/home/analyst/net/hosts.txt");
       if(c == null) return false;
       const found = new Set((c.match(/10\.0\.0\.\d+/g) || []));
       const want = ["10.0.0.1","10.0.0.10","10.0.0.20","10.0.0.21","10.0.0.22","10.0.0.30","10.0.0.99"];
       /* every live host present, and the host that is switched off absent */
       return want.every(ip => found.has(ip)) && !found.has("10.0.0.41");
     }},

    {q: {sv:"En av värdarna kör telnet (port 23). Skriv dess IP-adress till ~/net/rogue.txt.",
         en:"One host is running telnet (port 23). Write its IP to ~/net/rogue.txt."},
     hint: {sv:"nmap -sV 10.0.0.0/24 visar tjänsterna. Telnet skickar lösenord i klartext.",
            en:"nmap -sV 10.0.0.0/24 shows the services. Telnet sends passwords in the clear."},
     answer: ["nmap -sV 10.0.0.0/24 > ~/net/ports.txt", "echo 10.0.0.99 > ~/net/rogue.txt"],
     check: (K) => fileHas(K, "/home/analyst/net/rogue.txt", /\b10\.0\.0\.99\b/)},

    {q: {sv:"Slå på brandväggen och blockera all utgående trafik till den värden.",
         en:"Turn the firewall on and block all outbound traffic to that host."},
     hint: {sv:"sudo ufw enable, sedan sudo ufw deny out to 10.0.0.99.",
            en:"sudo ufw enable, then sudo ufw deny out to 10.0.0.99."},
     answer: ["sudo ufw enable", "sudo ufw deny out to 10.0.0.99"],
     check: (K) => !!(K.net && K.net.fw.enabled &&
       K.net.fw.rules.some(r => r.action === "deny" && r.dir === "out" && r.host === "10.0.0.99"))},

    {q: {sv:"Bevisa att den är blockerad: kör ping mot värden igen och spara utfallet "+
            "i ~/net/blocked.txt.",
         en:"Prove it is blocked: ping the host again and save the result to ~/net/blocked.txt."},
     hint: {sv:"ping skriver felet på stderr, så 2>&1 behövs för att fånga det.",
            en:"ping writes the error on stderr, so you need 2>&1 to capture it."},
     answer: ["ping -c 1 10.0.0.99 > ~/net/blocked.txt 2>&1"],
     check: (K) => fileHas(K, "/home/analyst/net/blocked.txt", /not permitted|Operation not permitted/i)},

    {q: {sv:"Webbservern i nätet svarar på port 80. Spara dess serverrubrik "+
            "(Server:-raden) till ~/net/server.txt.",
         en:"The web server on the network answers on port 80. Save its server header "+
            "(the Server: line) to ~/net/server.txt."},
     hint: {sv:"curl -I visar bara rubrikerna. Servern är srv-web.",
            en:"curl -I shows headers only. The server is srv-web."},
     answer: ["curl -I http://srv-web > ~/net/head.txt",
              "grep Server ~/net/head.txt > ~/net/server.txt"],
     check: (K) => fileHas(K, "/home/analyst/net/server.txt", /nginx/i)},

    {q: {sv:"Skrivaren på 10.0.0.30 har ett admingränssnitt utan lösenord. "+
            "Hämta sidan och spara den till ~/net/printer.txt.",
         en:"The printer on 10.0.0.30 has an admin page with no password. "+
            "Fetch it and save it to ~/net/printer.txt."},
     hint: {sv:"curl http://10.0.0.30 räcker. Läs vad som står om lösenordet.",
            en:"curl http://10.0.0.30 is enough. Read what it says about the password."},
     answer: ["curl http://10.0.0.30 > ~/net/printer.txt"],
     check: (K) => fileHas(K, "/home/analyst/net/printer.txt", /password/i)},
  ],
  check: [
    [{sv:"Varför är telnet ett fynd värt att rapportera?", en:"Why is telnet worth reporting?"},
     {sv:"Telnet skickar användarnamn och lösenord i klartext över nätet. Vem som helst som "+
         "kan lyssna på trafiken läser dem. Det är därför ssh ersatte den.",
      en:"Telnet sends usernames and passwords in clear text over the wire. Anyone who can "+
         "listen to the traffic reads them. That is why ssh replaced it."}],
    [{sv:"Vad är skillnaden mellan «Destination Host Unreachable» och «Operation not permitted»?",
      en:"What is the difference between \"Destination Host Unreachable\" and \"Operation not permitted\"?"},
     {sv:"Det första betyder att ingen svarade — värden kan vara avstängd. Det andra betyder "+
         "att din egen brandvägg stoppade paketet innan det lämnade maskinen.",
      en:"The first means nothing answered — the host may be switched off. The second means "+
         "your own firewall stopped the packet before it left the machine."}],
    [{sv:"Varför räcker det inte att bara stänga av porten på den okända värden?",
      en:"Why is it not enough to just close the port on the unknown host?"},
     {sv:"Du äger inte den värden och vet inte vad den är. Det du kontrollerar är din egen "+
         "maskin och nätets gränser — börja där, och eskalera fyndet.",
      en:"You do not own that host and do not know what it is. What you control is your own "+
         "machine and the network boundary — start there, and escalate the finding."}],
  ],
};

/* ---------- small helpers the checks share ---------- */
function readFileText(K, path){
  try{ const r = K.lookup(path); return r.node && r.node.t === "f" ? r.node.c : null; }
  catch(e){ return null; }
}
function fileHas(K, path, rx){
  const c = readFileText(K, path);
  return c != null && rx.test(c);
}

/* a const declared inside eval() does not escape it, and the tests load these
   files that way — same reason vm-labs.js exports LAB_ANSWERS */
if (typeof globalThis !== "undefined") globalThis.NETLAB = NETLAB;
