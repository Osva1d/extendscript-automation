# Zünd & Summa Marks 1.4.0 — rozsah (návrh)

Stav: návrh k rozhodnutí, 2026-11-11. Podklady:
[plán řady, krok 4](2026-11-07-ui-design-system.md) (§3, §5, §6, §10),
[audit UX/UI řady](../reports/2026-11-07-audit-ux-ui-rady-nastroju.md),
[audit vrstev ZSM](../reports/2026-11-06-audit-vrstev-zund-summa-marks.md) (fáze 2 a 3)
a ruční test 1.3.0 z 2026-11-11.

**Kdy:** krok 4 plánu řady. Začne po vydání ZSM 1.3.0 a BTE 1.1.0 a po krocích 2
(BRE 1.3.0) a 3 (GM 1.5.0), na kterých se ověří sdílený kit (§10).

**Hotovo už v 1.3.0:** nejvýš 5 řádků mapování (U3 zčásti), U12, výchozí fokus ověřený
v Illustratoru (U10), L1–L5 a L13.

## A. Dialog podle návrhu řady (krok 4)

| bod | co | zdroj |
|---|---|---|
| A1 | Dva sloupce, jedna velikost ve všech stavech (maketa 851 × 545), 5 rezervovaných řádků mapování místo přidávání a ubírání | U3, R1, §3 G2–G5 |
| A2 | Okno se nezavírá: přepnutí režimu ani předvolba druhého režimu ho nestaví znovu; varianty v `stack` | U2, §3 G4 |
| A3 | Odebrat tlačítko `Výchozí`, `[Výchozí]` zůstane v seznamu (souhlas obsluhy 2026-11-07) | U16, §5.7 |
| A4 | Termíny podle slovníku: `Režim a zdroj`, `Role`, `Zünd`/`Summa`, `Jen značky`, `Mezera k orientační značce:`, `Strana značky:`; bez anglických závorek | U18, U24, U27, §6.1 |
| A5 | Panel předvoleb, číselné řádky, stavový řádek a patička ze sdíleného kitu (`presetPanel` přijde s GM v kroku 3) | U29, U15, R2 |
| A6 | Patička v jedné řadě s tlačítky | G7 |
| A7 | Hlášky polí podle §6.3, jedno pravidlo pro `CHYBA:` a `UPOZORNĚNÍ:`, tipy předvoleb jedním tvarem | U25, U26, U28 |
| A8 | Stavové barvy podle jasu UI (`FieldPaint`) | U14, R6 |
| A9 | Úklid dokumentace: README, CHANGELOG, mrtvé klíče; zastaralé požadavky v README | R8, U31, L28 |

Ověření: `tools/ui-probe` (jedna velikost, nejvýš 850 px, primární tlačítko na místě),
snímky obsluhy ve světlém a tmavém jasu, běžná zakázka.

## B. Spolehlivost a informovanost (audit vrstev, fáze 2)

| bod | co | zdroj |
|---|---|---|
| B1 | Souhrn po běhu v nejkratší formě: co se přesunulo, smazalo a přejmenovalo, velikost artboardu, počátek pravítek | L11 |
| B2 | Razítka značek: skript pozná, co nakreslil, a cizí obsah v podvrstvách Zünd a Summa nesmaže bez hlášky | L4 (b) |
| B3 | `PluginItem` a `NonNativeItem` přímo ve vrstvě se počítají do grafiky | L6 |
| B4 | Dle artboardu kontroluje, jestli značky neleží na grafice | L7 |
| B5 | Víc artboardů: varování, co Dle grafiky a Dle artboardu měří | L8 |
| B6 | Dle grafiky počítá skryté a netiskové vrstvy; varovat, nebo vynechat (K4) | L9 |
| B7 | Staré značky ve vrstvách `Register`, `Regmark`, ve druhé nebo vnořené `Regmarks` | L10 |
| B8 | Ochrana `layers.add()` při aktivní podvrstvě jako u Trim | L12 |
| B9 | Řádek, který nic nepřesunul, nenechá prázdnou vrstvu | L16 |
| B10 | Dvě vrstvy stejného jména: zpětné zamčení správné vrstvy | L17 |
| B11 | Žádný tichý `catch` při měření; nečitelný objekt se ohlásí | L18 |
| B12 | Přejmenovat na Graphics jen výchozí názvy vrstev | L14 |

## C. Nové nálezy z ručního testu 1.3.0 (2026-11-11)

Všechny jsou ve vydané 1.2.0 také, žádný nevznikl v 1.3.0.

| bod | co se stalo | návrh |
|---|---|---|
| C1 | Zdroj `Dle artboardu` se ztratí po cestě ZUND → SUMMA → ZUND: dialog SUMMA zapíše `useArtboardBounds: false` | brát hodnotu z předchozího nastavení jako ostatní pole druhého režimu; s A2 zmizí přestavba, ověřit, že i chyba |
| C2 | Odmítnutý běh (řádek `regmarks`) se zapamatuje jako poslední: `main.js` uloží nastavení před kontrolou vyhrazených jmen, příští otevření ukáže odmítnutý řádek | kontrolovat vyhrazená jména živě v dialogu (šedé Generovat, důvod ve stavovém řádku, §5.4) |
| C3 | Zpět po opakovaném běhu má čtyři kroky: nové značky a vrstvy (dokument je chvíli bez značek), návrat starých značek, artboard, zrušení výběru | změřit, jestli jde odstranit staré a nakreslit nové značky v jednom kroku a výběr nerušit |
| C4 | Nový řádek z `+ Přidat` dostane nalezenou řezovou barvu, kterou už má první řádek, takže hned hlásí duplicitu | nabídnout první řezovou barvu dokumentu, která ještě nemá řádek (`detectCutColors`, navazuje na L1) |

## D. Čeká na vstup zvenku

| bod | na co | co z toho plyne |
|---|---|---|
| D1 | Zkouška u stroje: bílé značky ve Spot 1 na tmavém materiálu (6a.7, L23) | jen ověření, kód se nemění, pokud kamera značky najde |
| D2 | Odpověď obsluhy: čte Cut Center název vrstvy, nebo barvu (6a.9) | upozornění, když se název řádku liší od barvy; návod k předání dat stroji (L22) |
| D3 | Zkušenost obsluhy s OPOS pruhem 3 mm a roztečí 500 mm u Summy | L20, L21 |
| D4 | Měření velkého dokumentu | L19 (výkon, sdílený modul průběhu) |

Mimo 1.4.0 vědomě: L15 (pořadí řádků), L25–L27, L29, L30 průběžně; upozornění na chybějící
přetisk v režimu Jen značky (navrženo 2026-11-07), až bude jasné D2.

## Rozhodnutí potřebná před plánem

1. **Jedna verze, nebo dvě?** Doporučuji **1.4.0 = A + C + B1** (dialog, nálezy z testu
   a souhrn, který kánon §5.6 a dialog spojuje) a **1.5.0 = zbytek B**. Přestavba dialogu
   se ověřuje sondou a okem obsluhy, logika vrstev harnessem v Illustratoru; po jednom
   druhu změny je ruční test kratší a chyba se snáz najde.
2. **B1:** souhrn po každém běhu, nebo jen po změnách? Audit doporučuje po každém,
   nejkratší formou.
3. **B6:** má Dle grafiky dál počítat skryté a netiskové vrstvy? Audit doporučuje ano,
   s varováním.
4. **B12:** přejmenovat na Graphics jen výchozí názvy (`Vrstva 1`, `Layer 1`)? Audit
   doporučuje ano.
5. **C2:** kontrolu vyhrazených jmen přesunout do dialogu?
