/* The hardware quiz. It is registered into COURSE_QUIZZES under the tool's own
   id rather than kept private, which means exam mode draws from it and the
   review queue hands back whatever you got wrong — for free, with no second
   copy of the quiz machinery. */
const HWQUIZ = [
{tier:{sv:"Delarna och vad de gör", en:"The parts and what they do"}, items:[
 {q:{sv:"Vad skiljer arbetsminne (RAM) från lagring (SSD/hårddisk)?",
     en:"What separates memory (RAM) from storage (SSD/hard disk)?"},
  o:[{t:{sv:"RAM töms när strömmen går", en:"RAM is emptied when the power goes"}, c:true},
     {t:{sv:"RAM är mycket snabbare att nå", en:"RAM is far quicker to reach"}, c:true},
     {t:{sv:"Lagring behåller innehållet utan ström", en:"Storage keeps its contents without power"}, c:true},
     {t:{sv:"RAM är alltid större än lagringen", en:"RAM is always larger than the storage"}, c:false}],
  e:{sv:"Snabbt och glömskt mot långsamt och ihågkommande. Det är därför ett program "+
        "körs i RAM men sparar till disk, och därför osparat arbete försvinner vid strömavbrott.",
     en:"Fast and forgetful against slow and remembering. That is why a program runs in "+
        "RAM but saves to disk, and why unsaved work disappears when the power cuts."}},

 {q:{sv:"Vad betyder det att en processor har 8 kärnor och 16 trådar?",
     en:"What does it mean that a processor has 8 cores and 16 threads?"},
  o:[{t:{sv:"Den har 8 fysiska räkneenheter", en:"It has 8 physical execution units"}, c:true},
     {t:{sv:"Operativsystemet ser 16 köer att lägga arbete i",
         en:"The operating system sees 16 queues to put work in"}, c:true},
     {t:{sv:"Två trådar per kärna delar på kärnans resurser",
         en:"Two threads per core share that core's resources"}, c:true},
     {t:{sv:"Den är dubbelt så snabb som en processor med 8 trådar",
         en:"It is twice as fast as a processor with 8 threads"}, c:false}],
  e:{sv:"Trådar är inte extra kärnor. De låter en kärna fylla väntetider med annat "+
        "arbete, vilket ofta ger 20-30 procent — inte 100.",
     en:"Threads are not extra cores. They let one core fill its waiting time with "+
        "other work, which usually buys 20-30 percent, not 100."}},

 {q:{sv:"Datorn är snabb i ett par minuter och blir sedan trög. Vad är mest troligt?",
     en:"A machine is quick for a couple of minutes and then goes sluggish. What is most likely?"},
  o:[{t:{sv:"Processorn blir för varm och saktar ner sig själv",
         en:"The processor is overheating and slowing itself down"}, c:true},
     {t:{sv:"Kylningen är dammig eller en fläkt har slutat",
         en:"The cooling is dusty or a fan has stopped"}, c:true},
     {t:{sv:"Det är alltid ett virus", en:"It is always a virus"}, c:false},
     {t:{sv:"Ett värmeproblem kan se ut som ett mjukvaruproblem",
         en:"A heat problem can look like a software problem"}, c:true}],
  e:{sv:"Mönstret — snabbt först, långsamt sedan — är typiskt för throttling. "+
        "Kolla temperaturer innan du felsöker mjukvaran.",
     en:"The pattern — fast first, slow after — is the signature of throttling. "+
        "Check temperatures before you start debugging software."}},

 {q:{sv:"Vad gör ett grafikkort bra på?",
     en:"What is a graphics card good at?"},
  o:[{t:{sv:"Samma beräkning på väldigt mycket data samtidigt",
         en:"The same calculation on a great deal of data at once"}, c:true},
     {t:{sv:"Maskininlärning och simulering", en:"Machine learning and simulation"}, c:true},
     {t:{sv:"Att prova enorma mängder lösenordsgissningar",
         en:"Trying enormous numbers of password guesses"}, c:true},
     {t:{sv:"Långa kedjor av beslut som beror på varandra",
         en:"Long chains of decisions that depend on each other"}, c:false}],
  e:{sv:"Många enkla kärnor slår få avancerade när arbetet går att dela upp. "+
        "Beror varje steg på det förra hjälper inte bredden.",
     en:"Many simple cores beat a few clever ones when the work divides. When each "+
        "step depends on the last, all that width buys you nothing."}}]},

{tier:{sv:"Hastighet, bussar och gränssnitt", en:"Speed, buses and interfaces"}, items:[
 {q:{sv:"Varför är RAM så mycket snabbare än en SSD?",
     en:"Why is RAM so much quicker than an SSD?"},
  o:[{t:{sv:"Det sitter närmare processorn på en snabbare buss",
         en:"It sits closer to the processor on a faster bus"}, c:true},
     {t:{sv:"Det är byggt för att nås i mycket små bitar åt gången",
         en:"It is built to be reached in very small pieces at a time"}, c:true},
     {t:{sv:"Skillnaden är ungefär tusenfaldig i väntetid",
         en:"The gap is roughly a thousandfold in waiting time"}, c:true},
     {t:{sv:"SSD:er har rörliga delar", en:"SSDs have moving parts"}, c:false}],
  e:{sv:"En SSD har inga rörliga delar — det är hårddisken som har det. "+
        "Skillnaden mot RAM handlar om avstånd, buss och hur datan adresseras.",
     en:"An SSD has no moving parts — that is the hard disk. The gap to RAM is about "+
        "distance, the bus, and how the data is addressed."}},

 {q:{sv:"Vad stämmer om MAC-adress och IP-adress?",
     en:"What is true about MAC addresses and IP addresses?"},
  o:[{t:{sv:"MAC-adressen hör till nätverkskortet", en:"The MAC address belongs to the network card"}, c:true},
     {t:{sv:"IP-adressen delas ut av nätverket", en:"The IP address is handed out by the network"}, c:true},
     {t:{sv:"MAC används inom det lokala nätet, IP mellan nät",
         en:"MAC is used inside the local network, IP between networks"}, c:true},
     {t:{sv:"En MAC-adress går aldrig att ändra", en:"A MAC address can never be changed"}, c:false}],
  e:{sv:"MAC kan förfalskas med ett kommando, så den duger inte som säkerhetsgräns — "+
        "vilket är varför portsäkerhet enbart baserad på MAC är svag.",
     en:"A MAC can be spoofed with one command, so it is not a security boundary — "+
        "which is why port security based on MAC alone is weak."}},

 {q:{sv:"En dator kraschar slumpmässigt under tung belastning men aldrig när den är "+
        "sysslolös. Vad är värt att misstänka?",
     en:"A machine crashes at random under heavy load but never when idle. What is worth suspecting?"},
  o:[{t:{sv:"Nätaggregatet orkar inte med toppbelastningen",
         en:"The power supply cannot handle the peak load"}, c:true},
     {t:{sv:"Överhettning när alla delar arbetar samtidigt",
         en:"Overheating when everything works at once"}, c:true},
     {t:{sv:"Trasigt arbetsminne", en:"Faulty memory"}, c:true},
     {t:{sv:"Alltid ett fel i operativsystemet", en:"Always a fault in the operating system"}, c:false}],
  e:{sv:"Belastningsberoende fel pekar mot ström, värme eller minne. Testa minnet och "+
        "mät temperaturer innan du installerar om.",
     en:"Load-dependent faults point at power, heat or memory. Test the memory and "+
        "measure temperatures before reinstalling anything."}},

 {q:{sv:"Vad avgör hur mycket ett moderkort kan koppla in?",
     en:"What decides how much a motherboard can connect?"},
  o:[{t:{sv:"Chipsetet", en:"The chipset"}, c:true},
     {t:{sv:"Antalet PCIe-banor", en:"The number of PCIe lanes"}, c:true},
     {t:{sv:"Antalet minnesplatser och diskportar", en:"The number of memory slots and drive ports"}, c:true},
     {t:{sv:"Färgen på kortet", en:"The colour of the board"}, c:false}],
  e:{sv:"Chipsetet är budgeten för anslutningar. Det är därför två moderkort med samma "+
        "sockel ändå kan skilja sig kraftigt i vad de klarar.",
     en:"The chipset is the budget for connections. That is why two boards with the "+
        "same socket can still differ a lot in what they support."}}]},

{tier:{sv:"Hårdvara och säkerhet", en:"Hardware and security"}, items:[
 {q:{sv:"Vad gör en TPM?",
     en:"What does a TPM do?"},
  o:[{t:{sv:"Förvarar nycklar så att de inte kan läsas ut som en fil",
         en:"Holds keys so they cannot be read out like a file"}, c:true},
     {t:{sv:"Mäter vad som startats och kan vägra lämna ut nyckeln",
         en:"Measures what was booted and can refuse to release the key"}, c:true},
     {t:{sv:"Låter diskkryptering låsas upp utan att du skriver en lösenfras",
         en:"Lets disk encryption unlock without you typing a passphrase"}, c:true},
     {t:{sv:"Krypterar all nätverkstrafik", en:"Encrypts all network traffic"}, c:false}],
  e:{sv:"TPM är en förvaringsplats med ett minne av hur maskinen startade. Startas den "+
        "med något annat lämnas nyckeln inte ut — det är hela poängen.",
     en:"A TPM is a vault with a memory of how the machine booted. Boot it with "+
        "something else and the key is not released — that is the whole point."}},

 {q:{sv:"Du kastar en gammal server. Vad räcker <b>inte</b> för att skydda datan?",
     en:"You are scrapping an old server. What is <b>not</b> enough to protect the data?"},
  o:[{t:{sv:"Radera filerna och tömma papperskorgen", en:"Delete the files and empty the bin"}, c:true},
     {t:{sv:"Snabbformatera disken", en:"Quick-format the disk"}, c:true},
     {t:{sv:"Skriva över hela disken", en:"Overwrite the whole disk"}, c:false},
     {t:{sv:"Fysiskt förstöra disken", en:"Physically destroy the disk"}, c:false}],
  e:{sv:"Radering och snabbformatering tar bort hänvisningarna, inte innehållet. "+
        "Överskrivning, förstöring — eller att disken var krypterad hela tiden — är det som gäller.",
     en:"Deleting and quick-formatting remove the pointers, not the content. "+
        "Overwriting, destruction — or the disk having been encrypted all along — is what counts."}},

 {q:{sv:"Varför ska lösenord hashas med bcrypt eller Argon2 i stället för SHA-256?",
     en:"Why should passwords be hashed with bcrypt or Argon2 rather than SHA-256?"},
  o:[{t:{sv:"SHA-256 är byggt för att vara snabbt", en:"SHA-256 is built to be fast"}, c:true},
     {t:{sv:"Ett grafikkort provar miljarder gissningar per sekund mot snabba hashar",
         en:"A graphics card tries billions of guesses a second against fast hashes"}, c:true},
     {t:{sv:"bcrypt och Argon2 är avsiktligt långsamma och minneskrävande",
         en:"bcrypt and Argon2 are deliberately slow and memory-hungry"}, c:true},
     {t:{sv:"SHA-256 är knäckt", en:"SHA-256 is broken"}, c:false}],
  e:{sv:"SHA-256 är inte trasigt — det är fel verktyg. Snabbhet är en dygd för en "+
        "kontrollsumma och en defekt för ett lösenord.",
     en:"SHA-256 is not broken — it is the wrong tool. Speed is a virtue for a "+
        "checksum and a defect for a password."}},

 {q:{sv:"Varför är skadlig kod i firmware särskilt besvärlig?",
     en:"Why is malicious code in firmware particularly awkward?"},
  o:[{t:{sv:"Den överlever ominstallation av operativsystemet",
         en:"It survives reinstalling the operating system"}, c:true},
     {t:{sv:"Den överlever byte av hårddisk", en:"It survives replacing the hard disk"}, c:true},
     {t:{sv:"Den kör innan operativsystemets skydd har startat",
         en:"It runs before the operating system's defences have started"}, c:true},
     {t:{sv:"Vanliga antivirusprogram ser den enkelt", en:"Ordinary antivirus spots it easily"}, c:false}],
  e:{sv:"Firmware startar först och ligger utanför disken. Secure Boot och signerade "+
        "uppdateringar finns just för att göra det svårare att komma dit.",
     en:"Firmware runs first and lives outside the disk. Secure Boot and signed "+
        "updates exist precisely to make getting in there harder."}}]},
];

/* register it where the exam and the review queue already look */
if(typeof COURSE_QUIZZES !== "undefined") COURSE_QUIZZES["pv-hardware"] = HWQUIZ;
if (typeof globalThis !== "undefined") globalThis.HWQUIZ = HWQUIZ;
