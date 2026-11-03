# Batch Text Edit — ruční testy

Co se musí vyzkoušet rukou před vydáním a po větší změně. Čisté jádro
(proměnné, kroky, pořadí, pravidlo prvku, model dialogu, předvolby, souhrn)
kryje 15 automatických sad (`npm test` v `batch-text-edit/`). Sběr textů,
zápis, kontrolu po zápisu a dialog ověřily sondy v Illustratoru na vlastních
dokumentech (`docs/findings.md`). Tady zůstává to, co automat nevidí: jak
dialog vypadá a jak se ovládá rukou, skutečný běh ze Soubor › Skripty,
Cmd+Z a skutečné soubory.

---

## 0. Příprava

- Testovací build: `~/Dev/extendscript-automation/batch-text-edit/dist/illustrator-batch-text-edit-1.0.0a-test.jsx`,
  SHA-256 `8e40153fd8f959c615cb8e406e8fbe00cf90d26de5782a2f3b16b712ede6d12b`.
- Spouštět přes **Soubor › Skripty › Jiný skript…** (tak se skript bude
  spouštět i v provozu).
- Testovat na **kopiích** tří souborů ze sondy 2026-10-29 (240 samolepek,
  texty `{NORDIC CZ}` a `{n}`):

  | soubor | struktura |
  |---|---|
  | `Zund_Summa_Test_geoup.ai` | samolepka = skupina |
  | `Zund_Summa_Test_geoup arch.ai` | samolepky navíc ve skupinách po 12 (aršíky 3 × 4) |
  | `Zund_Summa_Test.ai` | bez skupin |

- Nastavení a log leží v `~/Library/Application Support/batch-text-edit/`.
  Před prvním testem přesunout `settings.json` z této složky do Koše: zbyl
  po sondách a dialog by se otevřel s jejich nastavením (test 1.2 počítá
  s prvním spuštěním).
- Log `bte.log` vzniká jen při zastaveném zápisu nebo neočekávané chybě.
- Testy jdou **popořadě**; každý řádek říká, čím končí (Použít, Storno,
  Cmd+Z). Sekce 1–4 a 6–8 běží na `…geoup.ai`, sekce 5 na zbylých dvou.
- Použít hned po psaní do pole může nejdřív jen přepočítat náhled a ukázat
  hlášku „Náhled se přepočítal…“ (pojistka proti zápisu neviděného
  náhledu); pak Použít znovu. To není chyba, kromě testu 6.3 se to nezapisuje.
- **Brány vydání: 4.1, 4.2, 6.3, 6.4, 6.5.** README a CHANGELOG tvrdí, že
  celý běh vrátí jedno Cmd+Z a že Použít nikdy nezapíše nic, co náhled
  neukázal; ověří to jen tyto testy. Bez nich se 1.0.0 nevydá.

Do sloupce ✓/✗ zapsat výsledek, do poznámky co bylo jinak.

---

## 1. Dialog

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 1.1 | Otevřít `…geoup.ai`, nic nevybrat, spustit skript | Dialog „Batch Text Edit v1.0.0“, Rozsah **Celý dokument**, řádek „240 prvků, 480 textů“. Žádný useknutý text, okno se vejde na obrazovku. Patička „© 2025–2026 Ladislav Osvald · v1.0.0“ | |
| 1.2 | Podívat se na předvolbu | „[Výchozí]“ **bez hvězdičky**, ↺ a Uložit šedé, Smazat šedé; jeden krok Číslovat, − u něj šedé | |
| 1.3 | V editoru kroku rozbalit **Kde** | `{NORDIC CZ}   (240×)` a `{n}   (240×)`, pod čarou „První číslo v prvku“, „Jiný text…“, „Regulární výraz…“ | |
| 1.4 | Najet myší na pole, seznamy, zaškrtávátka a tlačítka kroků a předvoleb | Každý má nápovědu (helpTip), nejvýš dvě věty. Storno a Použít ji nemají, stejně jako v ostatních nástrojích | |
| 1.5 | Esc | Dialog se zavře, dokument beze změny | |

## 2. Hlavní běh

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 2.1 | Spustit znovu. Krok 1: Typ Nahradit, Najít `{NORDIC CZ}`, Nahradit „SNB CZ“. **+** → krok 2: Typ Číslovat, Kde `{n}`, Od 1, Číslic 3, Do prázdné | Náhled: řádek 1 „{NORDIC CZ} \| {n}“ → „SNB CZ \| 001“, poslední řádek „… 240“. Stavový řádek „✓ Změní se 240 z 240 prvků.“ | |
| 2.2 | **Uložit jako…** „Samolepky“ | Předvolba „Samolepky“ v seznamu, bez hvězdičky (sekce 5–7 ji použijí) | |
| 2.3 | Vybrat v seznamu krok 1 | Prostřední sloupec „Po vybraném kroku“ ukazuje stav po kroku 1 („SNB CZ \| {n}“) | |
| 2.4 | **Použít** | Souhrn „Výsledek úprav“: Změněné prvky 240, Změněné texty 480, Neshoda po zápisu 0. V dokumentu 001 vlevo nahoře, čísla po řádcích do 240 vpravo dole | |
| 2.5 | Prohlédnout několik samolepek zblízka | Písmo, velikost a barva kódu i čísla **beze změny**, logo a kruh nedotčené. **Nevracet** — sekce 3 pokračuje na zapsaném bloku | |

## 3. Druhý běh na hotovém bloku

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 3.1 | Spustit znovu, nic nevybrat | Pole ukazují kroky z 2.1. Krok 1 má v Najít `{NORDIC CZ}  (nenalezeno)`, krok 2 v Kde `{n}  (nenalezeno)`; oba kroky ⚠ „Nic nenašel, nic nezmění.“, stavový řádek „⚠ Nic se nezmění.“, Použít šedé | |
| 3.2 | Krok 2: Kde **První číslo v prvku**, Od 101 | Náhled „… \| 101“ až „… \| 340“ | |
| 3.3 | Krok 1: Najít **Jiný text…** „SNB CZ“, Nahradit „SNB SK“; **Použít** | Náhled „SNB CZ \| 001“ → „SNB SK \| 101“, stav „✓ Změní se 240 z 240 prvků.“; souhrn 240 / 480 / 0, v dokumentu SNB SK 101–340 | |

## 4. Zpět (brána vydání)

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 4.1 | **Jednou Cmd+Z** | Všech 240 samolepek zpět na „SNB CZ“ a 001–240: vrátí se druhý běh, celý a jen on | |
| 4.2 | **Ještě jednou Cmd+Z** | Všech 480 textů zpět na `{NORDIC CZ}` a `{n}`; soubor je v původním stavu | |

## 5. Struktura dokumentu

Každý test začíná tlačítkem **↺** u předvoleb: vrátí kroky a pořadí aktivní předvolby „Samolepky“ (z 2.2), hvězdička zmizí. Znovu vybrat „Samolepky“ v seznamu nestačí — aktivní předvolba se výběrem nenačte znovu.

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 5.1 | `…arch.ai`, nic nevybrat, spustit, ↺; **Použít**, prohlédnout, **Cmd+Z** | 240 prvků; čísla po řádcích přes celý arch (levý horní aršík 001, 002, 003, 013, 014, 015 …) — aršíky pořadí neovlivní | |
| 5.2 | Vybrat jeden aršík (12 samolepek), spustit, ↺; **Storno** | Rozsah **Výběr**, „12 prvků, 24 textů“, náhled 001–012 | |
| 5.3 | `Zund_Summa_Test.ai` (bez skupin), nic nevybrat, spustit, ↺; **Storno** | 240 prvků, 480 textů, každý řádek náhledu „{NORDIC CZ} \| {n}“; žádné ⚠ „Prvek … má 2 shody …“ — kód a číslo jedné samolepky drží spolu (geometrie podle kruhu) | |
| 5.4 | Tamtéž spustit znovu, ↺, Pořadí **Po sloupcích**; **Použít**, prohlédnout, **Cmd+Z** | Náhled se přepočítá; v dokumentu čísla tečou shora dolů po sloupcích | |
| 5.5 | Má-li soubor víc artboardů: Rozsah Aktivní artboard; **Storno** | Jen prvky, jejichž střed leží na aktivním artboardu | |

Konec sekce: oba soubory v původním stavu (nebo zavřít bez uložení).

## 6. Ovládání

Na `…geoup.ai` v původním stavu (po 4.2). Na začátku **↺** (kroky a pořadí z „Samolepky“); 6.4 a 6.5 pak záměrně pokračují s polem Od z předchozího běhu.

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 6.1 | Kliknout na zaškrtávátko u kroku v seznamu, pak znovu | Krok se vypne: zaškrtnutí zmizí (i jeho ⚠/✗), náhled se přepočítá bez něj; druhý klik ho zapne. **Zapsat, jak zaškrtávátko vypadá a zda klik funguje.** Když nefunguje, náhradou je zaškrtávátko **Aktivní** v editoru | |
| 6.2 | ↑ ↓ u kroku 2, **+** a − u nového kroku | Pořadí v seznamu i náhled se mění; nový krok zmizí. (− šedé u jediného kroku ukázal test 1.2) | |
| 6.3 | Do pole Od napsat 5 a **bez Enteru** kliknout Použít; po chvilce **Použít** znovu; **Cmd+Z** | Po prvním kliku dialog zůstane, v hláškách „Náhled se přepočítal podle nové hodnoty. Zkontrolujte ho a potvrďte Použít znovu.“, náhled ukazuje 005. Druhé Použít zapíše 005–244 | |
| 6.4 | Spustit znovu, Od 6 a **Enter**; pak **Enter** nebo Použít; **Cmd+Z** | První Enter jen přepočítá náhled (006), dialog se nezavře; další Enter / Použít zapíše 006–245 | |
| 6.5 | Spustit znovu, vypnout krok 1 zaškrtávátkem v seznamu a **hned** Použít (případně ještě jednou); **Cmd+Z** | Platí jedno z dvou, **zapsat které**: (a) zapíše hned, (b) dialog zůstane s hláškou a zapíše až další Použít. V obou případech dokument odpovídá náhledu bez kroku 1: kód zůstane `{NORDIC CZ}`, čísla 006–245. ✗ jen tehdy, když se zapíše i vypnutý krok | |
| 6.6 | Spustit znovu, **↺**. Do Od napsat „1O“ (písmeno O), pak vrátit 1 | Pole červené, ✗ ve stavovém řádku i na řádku kroku, Použít, Uložit a Uložit jako… šedé; po opravě vše zpět | |
| 6.7 | Do 230, pak Do vymazat | Stavový řádek „⚠ Změní se 240 z 240 prvků.“, v hláškách dva řádky „⚠ Krok 2: Poslední číslo vyjde 240, v poli Do je 230.“ a „⚠ Krok 2: Prvků je o 10 víc.“; Použít zůstává aktivní | |
| 6.8 | **+** → krok 3: Velikost písmen, Kde Celý text, Režim malá; **Použít**, prohlédnout, **Cmd+Z** | Náhled „snb cz \| 001“; v dokumentu písmo, velikost a barva beze změny | |

## 7. Zvláštní stavy

Na `…geoup.ai` v původním stavu.

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 7.1 | Dvojklikem vstoupit do textu (blikající kurzor) a spustit skript; přepnout Rozsah na Celý dokument; **Storno**, Esc | Dialog se otevře na **Výběr** a hned ✗ „Kurzor je v textu. Ukončete úpravu textu klávesou Esc a vyberte prvky, nebo zvolte jiný rozsah.“, Použít šedé. Po přepnutí 240 prvků, Použít aktivní | |
| 7.2 | Přímým výběrem vybrat jeden text `{NORDIC CZ}` a zamknout ho (Objekt › Zamknout › Výběr), nic nevybrat, spustit, ↺; **Použít**; **Cmd+Z**, Objekt › Odemknout vše | Řádek rozsahu „… · přeskočené texty: 1“; v souhrnu „Přeskočené texty: 1“ a v podrobnostech řádek s ⚠, vykreslený jako znak (ne čtvereček). Zamčený text zůstane `{NORDIC CZ}`, jeho samolepka dostane číslo | |

✗ se v podrobnostech souhrnu ukáže jen při neshodě po zápisu nebo zastaveném
zápisu; ten ruční test nevyvolá (pokryla ho sonda, `findings.md`). Znak ✗
v dialogu ověřil test 6.6.

## 8. Předvolby

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 8.1 | Spustit znovu | Pole ukazují poslední Použít, v seznamu „Samolepky“ — s hvězdičkou jen tehdy, když se pole od předvolby liší | |
| 8.2 | Změnit Od; pak **↺** | Po změně „Samolepky *“ a ↺ aktivní; po ↺ hvězdička zmizí a hodnoty jsou z předvolby | |
| 8.3 | Vybrat „[Výchozí]“, změnit libovolné pole, **Uložit**; dotaz na název zrušit | Po výběru jeden krok Číslovat, bez hvězdičky, Smazat šedé. Uložit otevře Uložit jako… (výchozí se nepřepisuje) | |
| 8.4 | Vybrat „Samolepky“, **Smazat**, potvrdit; **Storno** | Dotaz „Smazat předvolbu „Samolepky“? Smazání nejde vrátit.“; po potvrzení předvolba zmizí ze seznamu | |

## 9. Výkon (pocitově)

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 9.1 | Otevření dialogu na 240 samolepkách | Do pár sekund (sonda: 2,6–2,8 s, z toho sběr textů 1,7–2,1 s) | |
| 9.2 | Změna pole + Enter | Náhled do ~0,5 s (sonda: medián 0,3 s) | |
| 9.3 | Použít na 240 samolepkách | Zápis a souhrn do pár sekund | |
