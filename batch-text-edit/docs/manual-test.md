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

- Testovací build: `~/Dev/extendscript-automation/batch-text-edit/dist/illustrator-batch-text-edit-1.2.0a-test.jsx`,
  SHA-256 `7298092a4ab5bac2476bd73f9a387621ef26dd33ae59dfb74638fdaf6831328e`.
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
  Test 1.0 běží ještě se stávajícím `settings.json` z provozu 1.0.0; hned
  po něm ho přesunout z této složky do Koše (test 1.2 počítá s prvním
  spuštěním).
- Log `bte.log` vzniká jen při zastaveném zápisu nebo neočekávané chybě.
- Testy jdou **popořadě**; každý řádek říká, čím končí (Použít, Storno,
  Cmd+Z). Sekce 1–4 a 6–8 běží na `…geoup.ai`, sekce 5 na zbylých dvou,
  sekce 10 (novinky 1.1.0) na `…geoup arch.ai`, sekce 11 (novinky 1.2.0)
  na dvou kopiích `…geoup.ai`.
- Použít hned po psaní do pole může nejdřív jen přepočítat náhled a ukázat
  hlášku „Náhled se přepočítal…“ (pojistka proti zápisu neviděného
  náhledu); pak Použít znovu. To není chyba, kromě testu 6.3 se to nezapisuje.
- **Brány vydání: 4.1, 4.2, 6.3, 6.4, 6.5, 10.1, 10.2, 10.3, 11.1, 11.2.**
  README a CHANGELOG tvrdí, že celý běh vrátí jedno Cmd+Z, že Použít nikdy
  nezapíše nic, co náhled neukázal, že Do ukončí řadu, že Po aršících
  a „v každém aršíku“ číslují aršík po aršíku a že Navázat pokračuje řadou
  minulého běhu i v jiném dokumentu; ověří to jen tyto testy. Bez nich se
  1.2.0 nevydá. Brány 10.1–10.3 ověřila 2026-11-10 sonda
  `tests/probes/probe_manual.jsx` na kopiích těchto souborů (skutečný
  dialog a `main.js`, zápis přečtený zpět podle polohy; `docs/findings.md`,
  „Manual-test probe (1.1.0a)“); uživatel ji přijal místo ručního běhu.
  Pro 1.2.0 prošla 2026-11-16 znovu, s 11.1 a 11.2 (dva bloky, druhý přes
  Navázat v jiném dokumentu) a s 11.3, 11.4 a 11.6 („Manual-test probe
  (1.2.0a)“). Ručně zůstávají 4.1, 4.2, 6.3–6.5 a 11.1, 11.2, dokud
  nerozhodnete, že sonda stačí i pro ně.

Do sloupce ✓/✗ zapsat výsledek, do poznámky co bylo jinak.

---

## 1. Dialog

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 1.0 | Ještě se stávajícím `settings.json`: otevřít `…geoup.ai`, nic nevybrat, spustit skript; **Storno**. Pak `settings.json` do Koše | Dialog se otevře s posledním během z 1.0.0, bez hlášky o opraveném nastavení; v seznamu předvoleb hvězdička jen tehdy, když se pole od předvolby liší. Po aršících nezaškrtnuté | |
| 1.1 | Otevřít `…geoup.ai`, nic nevybrat, spustit skript | Dialog „Batch Text Edit v1.2.0“, Rozsah **Celý dokument**, řádek „240 prvků, 480 textů“, v řádku Pořadí nezaškrtnuté **Po aršících**. Žádný useknutý text, okno se vejde na obrazovku. Patička „© 2025–2026 Ladislav Osvald · v1.2.0“ | |
| 1.2 | Podívat se na předvolbu | „[Výchozí]“ **bez hvězdičky**, ↺ a Uložit šedé, Smazat šedé; jeden krok Číslovat, − u něj šedé | |
| 1.3 | V editoru kroku rozbalit **Kde** | `{NORDIC CZ}   (240×)` a `{n}   (240×)`, pod čarou „První číslo v prvku“, „Jiný text…“, „Regulární výraz…“ | |
| 1.4 | Najet myší na pole, seznamy, zaškrtávátka a tlačítka kroků a předvoleb | Každý má nápovědu (helpTip), nejvýš dvě věty. Storno a Použít ji nemají, stejně jako v ostatních nástrojích | |
| 1.5 | Esc | Dialog se zavře, dokument beze změny | |

## 2. Hlavní běh

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 2.1 | Spustit znovu. Krok 1: Typ Nahradit, Najít `{NORDIC CZ}`, Nahradit „SNB CZ“. **+** → krok 2: Typ Číslovat, Kde `{n}`, Od 1, Číslic 3, Do prázdné | Náhled: řádek 1 „{NORDIC CZ} \| {n}“ → „SNB CZ \| 001“, poslední řádek „… 240“. Stavový řádek „✓ Změní se 240 z 240 prvků.“ | |
| 2.2 | **Uložit jako…** „Samolepky“ | Předvolba „Samolepky“ v seznamu, bez hvězdičky (sekce 5–7 ji použijí, sekce 10 ji vytvoří znovu) | |
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
| 5.1 | `…arch.ai`, nic nevybrat, spustit, ↺; **Použít**, prohlédnout, **Cmd+Z** | 240 prvků; čísla po řádcích přes celý arch (levý horní aršík 001, 002, 003, 013, 014, 015 …) — bez Po aršících aršíky pořadí neovlivní (volbu zkouší sekce 10) | |
| 5.2 | Vybrat jeden aršík (12 samolepek), spustit, ↺; **Storno** | Rozsah **Výběr**, „12 prvků, 24 textů“, náhled 001–012 | |
| 5.3 | `Zund_Summa_Test.ai` (bez skupin), nic nevybrat, spustit, ↺; **Storno** | 240 prvků, 480 textů, každý řádek náhledu „{NORDIC CZ} \| {n}“; žádné ⚠ „Prvek … má 2 shody …“ — kód a číslo jedné samolepky drží spolu (geometrie podle kruhu) | |
| 5.4 | Tamtéž spustit znovu, ↺, Pořadí **Po sloupcích**; **Použít**, prohlédnout, **Cmd+Z** | Náhled se přepočítá; v dokumentu čísla tečou shora dolů po sloupcích | |
| 5.5 | Má-li soubor víc artboardů: Rozsah Aktivní artboard; **Storno** | Jen prvky, jejichž střed leží na aktivním artboardu | |

Konec sekce: oba soubory v původním stavu (nebo zavřít bez uložení).

## 6. Ovládání

Na `…geoup.ai` v původním stavu (po 4.2). Na začátku **↺** (kroky a pořadí z „Samolepky“); 6.4 a 6.5 pak záměrně pokračují s polem Od z předchozího běhu.

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 6.1 | Kliknout na **Aktivní** v editoru a nehýbat myší; pak znovu | Po každém kliknutí se **hned**, bez dalšího kliknutí, změní řádek kroku v seznamu (vypnutý končí „(vypnutý)“ místo ⚠/✗), stavový řádek i náhled. Seznam kroků nemá zaškrtávátka | |
| 6.2 | ↑ ↓ u kroku 2, **+** a − u nového kroku; myší nehýbat | Pořadí v seznamu i náhled se mění hned; nový krok zmizí. Text řádků v seznamu nikdy neposkočí do strany. (− šedé u jediného kroku ukázal test 1.2) | |
| 6.3 | Do pole Od napsat 5 a **bez Enteru** kliknout Použít; po chvilce **Použít** znovu; **Cmd+Z** | Po prvním kliku dialog zůstane, v hláškách „Náhled se přepočítal podle nové hodnoty. Zkontrolujte ho a potvrďte Použít znovu.“, náhled ukazuje 005. Druhé Použít zapíše 005–244 | |
| 6.4 | Spustit znovu, Od 6 a **Enter**; pak **Enter** nebo Použít; **Cmd+Z** | První Enter jen přepočítá náhled (006), dialog se nezavře; další Enter / Použít zapíše 006–245 | |
| 6.5 | Spustit znovu, vybrat krok 1, vypnout ho přepínačem **Aktivní** a **hned** Použít (případně ještě jednou); **Cmd+Z** | Platí jedno z dvou, **zapsat které**: (a) zapíše hned, (b) dialog zůstane s hláškou a zapíše až další Použít. V obou případech dokument odpovídá náhledu bez kroku 1: kód zůstane `{NORDIC CZ}`, čísla 006–245. ✗ jen tehdy, když se zapíše i vypnutý krok | |
| 6.6 | Spustit znovu, **↺**. Do Od napsat „1O“ (písmeno O) a **hned** kliknout Použít; pak vrátit 1 | Pole červené, ✗ ve stavovém řádku i na řádku kroku, Použít, Uložit a Uložit jako… šedé. Po kliku na šedé Použít **žádná** hláška „Náhled se přepočítal… potvrďte Použít znovu“. Po opravě vše zpět | |
| 6.7 | Do 230, pak Do vymazat | Stavový řádek „⚠ Změní se 240 z 240 prvků.“; v hláškách „⚠ Krok 2: 10 prvků zůstane beze změny, řada končí na Do 230.“ a „⚠ 10 prvků má po posledním kroku dál {n}.“; náhled: řádky 231–240 „SNB CZ \| {n}“. Použít zůstává aktivní. Po vymazání Do obě hlášky zmizí | |
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
| 9.1 | Otevření dialogu na 240 samolepkách | Do pár sekund (sonda 2026-11-10: sestavení dialogu 0,5–0,6 s, sběr textů na vašich souborech 0,5–2,3 s, nejdéle bez skupin) | |
| 9.2 | Změna pole + Enter; zaškrtnout Po aršících | Náhled do ~0,5 s (sonda: medián 0,1 s; Po aršících 0,04 s) | |
| 9.3 | Použít na 240 samolepkách | Zápis a souhrn do pár sekund | |

## 10. Novinky 1.1.0 (brány 10.1–10.3)

Na `…geoup arch.ai` (20 aršíků po 12 samolepkách, 3 × 4) v původním stavu.
Předvolbu „Samolepky“ smazal test 8.4: nejdřív na tomto souboru spustit
skript, vybrat „[Výchozí]“ (jeden krok Číslovat), sestavit kroky jako v 2.1
a **Uložit jako…** „Samolepky“;
**Storno**. Každý test pak začíná **↺** (předvolba „Samolepky“: Nahradit
`{NORDIC CZ}` → „SNB CZ“, Číslovat `{n}` Od 1, Číslic 3).

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 10.1 | Nic nevybrat, spustit, ↺. Krok 2: **Do 100**; **Použít**, prohlédnout, **Cmd+Z** | Náhled: prvních 100 řádků 001–100, řádky 101–240 „SNB CZ \| {n}“. Hlášky „⚠ Krok 2: 140 prvků zůstane beze změny, řada končí na Do 100.“ a „⚠ 140 prvků má po posledním kroku dál {n}.“; Použít aktivní. V dokumentu 001–100 po řádcích přes arch, zbytek `{n}`; v Souhrnu v podrobnostech řádek o 140 prvcích s `{n}` | |
| 10.2 | Spustit znovu, ↺, zaškrtnout **Po aršících**; **Použít**, prohlédnout, **Cmd+Z** | Řádek rozsahu „240 prvků, 480 textů, 20 aršíků“. Sloupec # „1 · 1“ … „1 · 12“, „2 · 13“ …, poslední „20 · 240“ **celý, neuseknutý**. V dokumentu levý horní aršík 001–012 po řádcích (001 002 003 / 004 005 006 …), aršík vpravo vedle něj 013–024, levý aršík druhé řady 049–060 | |
| 10.3 | Spustit znovu (otevře se s Po aršících), ↺, zaškrtnout Po aršících; krok 2 zaškrtnout **v každém aršíku** a **Do 10**; **Použít**, prohlédnout, **Cmd+Z** | Náhled: v každém aršíku 001–010, poslední dvě samolepky aršíku „SNB CZ \| {n}“. Hlášky „⚠ Krok 2: 40 prvků zůstane beze změny, řada končí na Do 10.“ a „⚠ 40 prvků má po posledním kroku dál {n}.“. V dokumentu každý aršík 001–010 a dvě samolepky s `{n}` | |
| 10.4 | Spustit znovu, ↺, zaškrtnout Po aršících, krok 2 „v každém aršíku“; pak Po aršících **odškrtnout**; **Storno** | „v každém aršíku“ zešedne (zaškrtnutí zůstane), hláška „⚠ Krok 2: v každém aršíku platí jen s Pořadím po aršících.“, číslování souvisle 001–240 | |
| 10.5 | Na `…geoup.ai` (bez aršíků) spustit, ↺, zaškrtnout Po aršících; **Storno** | Hláška „⚠ Žádný prvek neleží v aršíku; pořadí je stejné jako bez volby.“, náhled 001–240 ve stejném pořadí jako bez volby | |
| 10.6 | Na `…arch.ai`: ↺, zaškrtnout Po aršících a u kroku 2 „v každém aršíku“, **Uložit jako…** „Aršíky“; vybrat „Samolepky“, pak „Aršíky“; **Storno** | „Samolepky“: obě volby nezaškrtnuté; „Aršíky“: obě zaškrtnuté, bez hvězdičky | |

Konec sekce: soubor v původním stavu (nebo zavřít bez uložení).

## 11. Novinky 1.2.0 (brány 11.1–11.2)

Na dvou kopiích `…geoup.ai` v původním stavu: **A** a **B** (B pod jiným
jménem, např. `…geoup B.ai`). Arch má 20 řad po 12 samolepkách; blok je
10 řad (120 samolepek). Předvolba „Samolepky“ je ta ze sekce 10 (Nahradit
`{NORDIC CZ}` → „SNB CZ“, Číslovat `{n}` Od 1, Číslic 3).

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 11.1 | Na A vybrat horních 10 řad, spustit, vybrat předvolbu „Samolepky“ (nebo ↺); krok 2 **Do 120**; **Použít**. Pak vybrat spodních 10 řad, spustit, vybrat krok 2, kliknout **Navázat**; **Použít**. Nevracet | První dialog: rozsah „120 prvků, 240 textů“, Navázat šedé. Souhrn v podrobnostech „Krok 2: čísla 001–120, 120 prvků; další číslo 121.“ Druhý dialog: tlačítko **„Navázat (121)“**, po kliku Od 121, Do 240, náhled „SNB CZ \| 121“ až „… 240“, u předvolby hvězdička. V dokumentu 001–240 po řádcích bez díry a bez dvojího čísla; Souhrn „Krok 2: čísla 121–240, 120 prvků; další číslo 241.“ | |
| 11.2 | Otevřít B, vybrat horních 10 řad, spustit, vybrat krok 2, najet myší na Navázat; kliknout **Navázat**; **Použít**, prohlédnout, **Cmd+Z**; B zavřít bez uložení | „Navázat (241)“, nápověda „Od 241 a Do 360 podle běhu v …geoup.ai, *datum čas*.“ se jménem dokumentu A a časem druhého Použít v 11.1. V B 241–360 po řádcích, Souhrn „… 241–360, 120 prvků; další číslo 361.“ | |
| 11.3 | Na A (001–240 z 11.1) nic nevybrat, spustit. Krok 2: Kde **První číslo v prvku**, Od 101, Do 240. Dialog nechat otevřený | Řádky 1–140 101–240, řádky 141–240 beze změny (141–240). Hlášky „⚠ Krok 2: 100 prvků zůstane beze změny, řada končí na Do 240.“ a „⚠ Krok 2: 100 prvků za Do si nechá číslo, které krok dal jinému prvku (např. prvek 141 má 141 jako prvek 41).“; Použít aktivní. (⚠ „Nic nenašel“ u kroku 1 sem nepatří: `{NORDIC CZ}` už v A není) | |
| 11.4 | Ve stejném dialogu rozbalit **Ukázat** a postupně vybrat K prověření, Změněné, Všechny; pak K prověření a v kroku 2 vymazat Do; **Storno** | Položky „Všechny (240)“, „Změněné (140)“, „K prověření (100)“; Ukázat se otevřel na Všechny. K prověření: 100 řádků, sloupec # 141–240 (filtr nepřečísluje), Změněné 140 řádků, Všechny 240. Po vymazání Do „K prověření (0)“, prázdná tabulka, volba zůstane na K prověření | |
| 11.5 | V 11.4 po každém výběru v Ukázat a po vymazání Do nehýbat myší | Tabulka se změní **hned**, bez dalšího kliknutí (Illustrator 2027). Seznam Ukázat ukazuje vybranou položku s novým počtem (po vymazání Do „K prověření (0)“), ne prázdné pole ani starý počet | |
| 11.6 | Na A spustit znovu, vybrat krok 2 a najet na Navázat. Pak **+** (nový krok Číslovat) a najet na jeho Navázat; pak **↺** a vybrat krok 2; **Storno** | Krok 2: „Navázat (361)“ s nápovědou o běhu v B: Storno v 11.3–11.4 ani Cmd+Z v 11.2 záznam nezměnily (skript Zpět nevidí; proto nápověda jmenuje dokument a čas). Nový krok: „Navázat“ šedé, nápověda „Navázat jde jen u kroku z minulého běhu; ten se musel zapsat celý a bez neshody.“ Po ↺ šedé i u kroku 2 | |

Konec sekce: A zavřít bez uložení.
