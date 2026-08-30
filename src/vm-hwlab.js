/* ===================== Computer hardware =====================
   Two visual tools and a quiz.

   The diagram is generated from this data — every part carries its own geometry
   — so the picture cannot drift from the text describing it. Add a part here
   and it appears on the board, in the list and in the sidebar.

   The second visual is the one that actually changes how people think: the
   memory hierarchy, drawn to scale in human time. "RAM is fast" means nothing
   until you see that if a CPU cycle were one second, a disk seek would be a
   fortnight. */

const HWPARTS = [
 {id:"cpu", x:196, y:96, w:96, h:88, kind:"core",
  name:{sv:"Processor (CPU)", en:"Processor (CPU)"},
  short:{sv:"CPU", en:"CPU"},
  spec:{sv:"t.ex. 8 kärnor, 16 trådar, 3.4 GHz", en:"e.g. 8 cores, 16 threads, 3.4 GHz"},
  what:{sv:"Räknar. Allt annat i lådan finns för att hålla processorn matad med "+
           "instruktioner och data. Kärnor är hur många saker den gör samtidigt, "+
           "gigahertz hur många takter per sekund varje kärna hinner.",
        en:"It does the arithmetic. Everything else in the box exists to keep the "+
           "processor fed with instructions and data. Cores are how many things it "+
           "does at once; gigahertz is how many ticks per second each core gets."},
  sec:{sv:"Processorn upprätthåller skyddsringarna som skiljer kärnan från dina "+
          "program. Sårbarheter som Spectre var allvarliga just för att de bröt den gränsen.",
       en:"The processor enforces the rings that separate the kernel from your "+
          "programs. Flaws like Spectre mattered because they broke that boundary."}},

 {id:"cooler", x:196, y:60, w:96, h:30, kind:"core",
  name:{sv:"Kylning", en:"Cooling"},
  short:{sv:"Kylning", en:"Cooling"},
  spec:{sv:"fläkt eller vätskekylning", en:"fan or liquid cooling"},
  what:{sv:"En processor som blir för varm saktar ner sig själv för att överleva — "+
           "det kallas throttling. En dator som är snabb i två minuter och sedan trög "+
           "har oftast ett kylproblem, inte ett prestandaproblem.",
        en:"A processor that gets too hot slows itself down to survive — that is "+
           "throttling. A machine that is fast for two minutes and then sluggish "+
           "usually has a cooling problem, not a performance problem."},
  sec:{sv:"Damm och trasiga fläktar är en driftsäkerhetsfråga: överhettning stänger "+
          "av servrar lika effektivt som en attack.",
       en:"Dust and dead fans are an availability problem: overheating takes servers "+
          "down just as effectively as an attack does."}},

 {id:"ram", x:312, y:60, w:112, h:124, kind:"core",
  name:{sv:"Arbetsminne (RAM)", en:"Memory (RAM)"},
  short:{sv:"RAM", en:"RAM"},
  spec:{sv:"t.ex. 32 GB DDR5", en:"e.g. 32 GB DDR5"},
  what:{sv:"Det snabba men glömska minnet. Program och data som används just nu "+
           "ligger här. Slår du av strömmen är innehållet borta — därför sparas "+
           "ingenting på riktigt förrän det nått en disk.",
        en:"The fast, forgetful memory. Whatever is running right now lives here. "+
           "Cut the power and it is gone — which is why nothing is really saved "+
           "until it has reached a disk."},
  sec:{sv:"Lösenord, nycklar och sessioner finns i klartext i RAM medan de används. "+
          "Därför är minnesdumpar guld för en angripare och en central del av forensik.",
       en:"Passwords, keys and sessions sit in RAM in the clear while they are in "+
          "use. That is why a memory dump is gold to an attacker, and central to "+
          "forensics."}},

 {id:"storage", x:312, y:200, w:112, h:56, kind:"storage",
  name:{sv:"Lagring (SSD/HDD)", en:"Storage (SSD/HDD)"},
  short:{sv:"Lagring", en:"Storage"},
  spec:{sv:"NVMe SSD ~3 500 MB/s · hårddisk ~150 MB/s", en:"NVMe SSD ~3,500 MB/s · hard disk ~150 MB/s"},
  what:{sv:"Det långsamma minnet som kommer ihåg. En SSD har inga rörliga delar och "+
           "hittar vilken plats som helst lika snabbt; en hårddisk måste flytta ett "+
           "huvud dit datan ligger, vilket är den stora skillnaden.",
        en:"The slow memory that remembers. An SSD has no moving parts and reaches "+
           "any location equally fast; a hard disk has to move a head to where the "+
           "data is, which is the whole difference."},
  sec:{sv:"Att radera en fil tar oftast bara bort hänvisningen till den. Riktig "+
          "radering kräver överskrivning — eller full diskkryptering från början, "+
          "vilket är varför BitLocker och LUKS finns.",
       en:"Deleting a file usually just removes the pointer to it. Real erasure "+
          "means overwriting — or full disk encryption from the start, which is "+
          "what BitLocker and LUKS are for."}},

 {id:"gpu", x:80, y:212, w:200, h:44, kind:"card",
  name:{sv:"Grafikkort (GPU)", en:"Graphics card (GPU)"},
  short:{sv:"Grafikkort (GPU)", en:"Graphics card (GPU)"},
  spec:{sv:"tusentals enkla kärnor", en:"thousands of simple cores"},
  what:{sv:"Många små räknare som gör samma sak på mycket data samtidigt. Bra på "+
           "bilder, och på allt annat som ser ut som bilder matematiskt: maskininlärning, "+
           "simulering — och lösenordsknäckning.",
        en:"Many small calculators doing the same thing to a lot of data at once. "+
           "Good at images, and at everything else that looks like images "+
           "mathematically: machine learning, simulation — and password cracking."},
  sec:{sv:"En modern GPU provar miljarder lösenordsgissningar i sekunden mot en snabb "+
          "hash. Det är hela skälet till att lösenord ska hashas med bcrypt eller "+
          "Argon2 och inte med SHA-256.",
       en:"A modern GPU tries billions of password guesses a second against a fast "+
          "hash. That is the entire reason passwords should be hashed with bcrypt or "+
          "Argon2 rather than SHA-256."}},

 {id:"board", x:60, y:40, w:384, h:236, kind:"board",
  name:{sv:"Moderkort", en:"Motherboard"},
  short:{sv:"Moderkort", en:"Motherboard"},
  spec:{sv:"chipset, kortplatser, bussar", en:"chipset, slots, buses"},
  what:{sv:"Skivan som allt annat sitter på och pratar genom. Chipsetet bestämmer "+
           "hur många och hur snabba anslutningar du får — hur många PCIe-banor, "+
           "hur många diskar, vilka processorer som passar.",
        en:"The board everything else sits on and talks through. The chipset decides "+
           "how many connections you get and how fast — how many PCIe lanes, how many "+
           "drives, which processors fit."},
  sec:{sv:"Här sitter också firmware. Skadlig kod i firmware överlever både "+
          "ominstallation och byte av disk, vilket gör den ovanligt svår att bli av med.",
       en:"The firmware lives here too. Malicious code in firmware survives both a "+
          "reinstall and a new disk, which makes it unusually hard to get rid of."}},

 {id:"psu", x:60, y:288, w:132, h:52, kind:"power",
  name:{sv:"Nätaggregat (PSU)", en:"Power supply (PSU)"},
  short:{sv:"Nätaggregat", en:"Power supply"},
  spec:{sv:"t.ex. 650 W, 80+ Gold", en:"e.g. 650 W, 80+ Gold"},
  what:{sv:"Gör om växelström från väggen till de likspänningar datorn vill ha. "+
           "För liten eller dålig PSU ger krascher som ser ut som mjukvarufel, "+
           "särskilt under belastning.",
        en:"Turns the wall's alternating current into the direct voltages the "+
           "computer wants. An undersized or poor one causes crashes that look like "+
           "software faults, especially under load."},
  sec:{sv:"Strömförsörjning är tillgänglighet. UPS och redundanta aggregat finns i "+
          "serverrum av samma skäl som brandväggar: för att tjänsten ska fortsätta fungera.",
       en:"Power is availability. A UPS and redundant supplies are in the server room "+
          "for the same reason firewalls are: so the service keeps running."}},

 {id:"tpm", x:212, y:288, w:96, h:52, kind:"security",
  name:{sv:"TPM och UEFI", en:"TPM and UEFI"},
  short:{sv:"TPM / UEFI", en:"TPM / UEFI"},
  spec:{sv:"säkerhetschip och firmware", en:"security chip and firmware"},
  what:{sv:"UEFI är programmet som startar innan operativsystemet. TPM är ett litet "+
           "chip som förvarar nycklar och mäter vad som startats — det kan inte "+
           "läsas ut på samma sätt som en fil på disken.",
        en:"UEFI is the program that runs before the operating system. The TPM is a "+
           "small chip that stores keys and measures what has been booted — it "+
           "cannot be read out the way a file on disk can."},
  sec:{sv:"Secure Boot vägrar starta kod som inte är signerad, och TPM låser upp "+
          "diskkryptering bara om maskinen startade som den skulle. Det är därför "+
          "Windows 11 kräver TPM 2.0.",
       en:"Secure Boot refuses to start unsigned code, and the TPM only releases the "+
          "disk encryption key if the machine booted the way it should. That is why "+
          "Windows 11 requires TPM 2.0."}},

 {id:"nic", x:328, y:288, w:116, h:52, kind:"io",
  name:{sv:"Nätverkskort och portar", en:"Network card and ports"},
  short:{sv:"Nätverk / portar", en:"Network / ports"},
  spec:{sv:"1 GbE, USB, HDMI", en:"1 GbE, USB, HDMI"},
  what:{sv:"Vägen ut. Nätverkskortet har en MAC-adress som är unik för kortet, "+
           "medan IP-adressen tilldelas av nätverket — de två förväxlas ofta.",
        en:"The way out. The network card has a MAC address that belongs to the card, "+
           "while the IP address is handed out by the network — the two get confused "+
           "constantly."},
  sec:{sv:"Varje port är också en ingång. USB är den klassiska vägen in i en maskin "+
          "som annars är väl skyddad, vilket är därför portar spärras på känsliga system.",
       en:"Every port is also a way in. USB is the classic route into a machine that "+
          "is otherwise well defended, which is why ports get locked down on sensitive "+
          "systems."}},
];

/* Access times, in nanoseconds, and the same times scaled so that one CPU cycle
   is one second. The second column is the point of the whole exercise. */
const HWSPEED = [
 {id:"reg",   label:{sv:"Register i CPU:n", en:"Register in the CPU"},   ns:0.3,        human:{sv:"1 sekund", en:"1 second"}},
 {id:"l1",    label:{sv:"L1-cache", en:"L1 cache"},                      ns:1,          human:{sv:"3 sekunder", en:"3 seconds"}},
 {id:"l2",    label:{sv:"L2-cache", en:"L2 cache"},                      ns:4,          human:{sv:"13 sekunder", en:"13 seconds"}},
 {id:"ram",   label:{sv:"Arbetsminne (RAM)", en:"Main memory (RAM)"},    ns:80,         human:{sv:"4 minuter", en:"4 minutes"}},
 {id:"ssd",   label:{sv:"NVMe SSD", en:"NVMe SSD"},                      ns:100000,     human:{sv:"4 dygn", en:"4 days"}},
 {id:"hdd",   label:{sv:"Hårddisk, sökning", en:"Hard disk seek"},       ns:10000000,   human:{sv:"1 år", en:"1 year"}},
 {id:"net",   label:{sv:"Paket över internet", en:"Packet across the internet"}, ns:50000000, human:{sv:"5 år", en:"5 years"}},
];

if (typeof globalThis !== "undefined"){
  globalThis.HWPARTS = HWPARTS;
  globalThis.HWSPEED = HWSPEED;
}
