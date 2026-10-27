# Návrh — zund-summa-marks 1.2.0: čistý tah, měřítko kresby a rodinný jazyk

Nástroj: `zund-summa-marks`, namespace `ZSM`. Navazuje na vydání 1.1.0
(2026-10-03, tag `zund-summa-marks/v1.1.0`, veřejný — oprava znamená novou
verzi).

Datum: 2026-10-23 · Stav: **návrh, čeká na schválení**

Vzniklo z prověrky nálezů dvou auditů společného jazyka pro ZSM
(2026-10-17 až 2026-10-19: čtyři ověřovatelé proti kódu, převod čísel
změřený v Node na funkcích ZSM, předvolby na napodobeném dialogu, sonda P3
v Illustratoru 30.8.2) a z rozhodnutí uživatele 2026-10-23. Podklady:
`docs/reports/2026-10-14-audit-spolecneho-jazyka.md`,
`docs/reports/2026-10-17-dodatecny-audit-spolecneho-jazyka.md`, kánon ve skillu
`extendscript-ui-standards` §12 (dále **kánon**) a návrh GM 1.4.0
(`docs/specs/2026-10-20-grommet-marks-1.4.0-design.md`), který tytéž věci
v rodině vyřešil jako první — ZSM je přebírá stejně, ne po svém.

Sdílené moduly `numbers.js`, `field_paint.js`, `registration.js`
a `drawing_scale.js` už používají GM 1.4.0 a Tile Export; ZSM je poslední
nástroj, který je nemá.

---

## 1. Proč

**Čárkovaný OPOS pruh (P3, naměřeno 2026-10-19).** Nová cesta přebírá čárky,
konce a spoje z výchozího stylu dokumentu, a ten určuje naposledy vybraný
objekt. `doc.selection = null`, kterým ZSM začíná kreslení, ho **nevrátí**.
Když měl operátor naposledy vybranou čárkovanou cestu (perforační linku),
nakreslí ZSM OPOS pruh jako řetěz zaoblených článků se zářezy, o 3 mm delší
(PNG prohlédnuté), a čárkované ořezové linky. Jestli takový pruh kamera Summy
přečte, neověřeno. Značky Zünd a Summa tah nemají a netýká se jich to.

**Měřítko kresby.** ZSM drží měřítko v předvolbě a v posledním běhu, jen
celá čísla 1–10 přes `parseInt`. Po zakázce 1:10 se proto další zakázka 1:1
otevře v 1:10 (značky desetkrát menší, když to operátor přehlédne), „2,5"
tiše poběží jako 1:2 a překlep „1O" jako 1:1. Rodina rozhodla, že měřítko
patří dokumentu (kánon §12.9, varianta C).

**Čísla v polích.** Živá kontrola čte `parseFloat`, odeslání `Number()`:
„1O5" nezčervená a zastaví ho až alert, „0x10" v poli s minimem 0 projde
živě jako 0 a nakreslí se 16 mm, Uložit a přepnutí režimu tiše uloží
„1O5" jako 1. Desetinná čárka se do pole vrací jako tečka a meze v hláškách
se píšou s tečkou („0.1–50").

**Rodinný jazyk.** Předvolby (hvězdička u předchozí položky, věty, šířka
tlačítek), hlášky (šablona neočekávané chyby, předpony, uvozovky,
vykřičníky), slovník Zünd parametrů (kánon §12.8) a [Výchozí] v režimu
SUMMA, které má trvale „*" a jehož ↺ přepne dialog do ZUND.

## 2. Cíle, ne-cíle, anti-cíle

**Cíle**

- Pruh a ořezové linky mají vždy plný tah s rovnými konci, ať byl předtím
  vybraný jakýkoli objekt.
- Pole „Měřítko kresby 1:" předvyplněné z dokumentu, desetinné, stejné jako
  v GM a TE; předvolby a poslední běh měřítko nenesou.
- Jedno čtení čísel pro pole, živou kontrolu, odeslání, Uložit i přepnutí
  režimu; čárka se vrací jako čárka.
- ZSM mluví a chová se podle kánonu §12 a používá všechny čtyři sdílené
  moduly.

**Ne-cíle**

- Geometrie značek, pruhu a linek se při měřítku 1:1 nemění — polohy
  a rozměry bajtově stejné jako 1.1.0 (regresní test).
- Logika mapování vrstev, třídění řezových cest a vrstvy beze změny, kromě
  §4.3 a §4.4.
- K4 (Dle grafiky podle výběru) a K18 (ořezová cesta mimo `pageItems[0]`)
  zůstávají otevřené.
- Složka a soubor nastavení se nepřejmenují (`ZSM/settings.json`).
- GM, TE ani BRE se v této verzi nemění, s jedinou výjimkou: oprava ve
  sdíleném `registration.js` (§4.2), kterou dostanou od příštího buildu.

**Anti-cíle (neúspěch, i kdyby to technicky fungovalo)**

- Značky v nečekané velikosti, protože měřítko přišlo z dokumentu nebo
  zmizelo z posledního běhu a v dialogu nebylo dost vidět.
- Předvolba nebo poslední běh, které po aktualizaci kreslí při 1:1 jinak
  než 1.1.0.
- Skript, který smaže cizí obsah bez upozornění.
- Dialog, kterému se na 13" displeji uříznou tlačítka.

## 3. Rozhodnutí

| # | Rozhodnutí | Zdroj |
|---|---|---|
| 1 | Všechno v jedné verzi **1.2.0** (bez mezivydání 1.1.1 jen s P3). | uživatel, 2026-10-23 |
| 2 | Měřítko jen z dokumentu; staré měřítko z předvoleb a z posledního běhu se **zahodí**. | uživatel, 2026-10-23 |
| 3 | Vrstva Regmarks: **cizí obsah zůstane a běh ho ohlásí** (varianta A, jako Trim od K6). | uživatel, 2026-10-23 |
| 4 | Oprava ve sdíleném `registration.js` (try kolem každého vzorníku) se sdíleným testem. | uživatel, 2026-10-23 |
| 5 | Měřítko 1–100, desetinné, N < 1 neplatné; zápis po úspěšném běhu a jen při změně. | rodina: GM 1.4.0 §4.3, §13 |
| 6 | Kánon §12: čísla, pole, předvolby, hlášky, slovník, titulek. | uživatel, 2026-10-15 a 2026-10-17 |
| 7 | Důvod šedého Generovat ve stavovém řádku jako ✗ v barvě chyby (dnes ⚠ jantarová). | **moje volba**, §7 |

## 4. Kreslení

### 4.1 Čistý tah (P3)

OPOS pruh (`draw.js` ~362–367) a ořezové linky (~622–629) si nastaví
`strokeDashes = []` a `strokeCap = StrokeCap.BUTTENDCAP`, stejně jako GM
`_plainStroke` (`grommet-marks/src/illustrator.js`). Spoj ne: obě cesty jsou
dvoubodové bez rohů (GM to má se stejným zdůvodněním). Barva tahu zapne tah
sama (naměřeno 2026-10-19), výslovné `stroked = true` je pojistka, kterou
GM nastavuje taky.

Naměřené chování (zrušení výběru styl nevrátí; přiřazení barvy zapne tah
i výplň; `defaultStrokeDashes` bez výběru nejde nastavit) se zapíše do
`docs/extendscript-engine-facts.md`, sekce „Nová cesta dědí výchozí styl
tahu", kde dnes stojí „stav po zrušení výběru neměřen".

### 4.2 Registrační barva

`ZSM.Draw.getRegistrationName` a `registrationColor` vrátí výsledek sdíleného
`NS.Registration.name(doc)` a `color(doc)`. `getCol`, `swatchExists`,
kanonický token „[Registration]" v předvolbách a `REG` v náhledu barev
zůstávají v ZSM (modul je nepokrývá). Zmizí tím zastaralý komentář „Same
check as grommet-marks".

**Oprava v modulu (rozhodnutí 4):** dnes jeden `try` kolem celé smyčky —
nečitelný vzorník před registrací ukončí hledání a značky dostanou 100 % K
bez hlášky (změřeno v Node na ZSM i modulu). Nově `try` kolem každého
vzorníku zvlášť, s testem v `shared/tests/test_registration.js`. Platí pro
GM a TE od jejich příštího buildu; na neporušených dokumentech beze změny.

Jediný naměřený rozdíl mezi ZSM a modulem: dokument bez vzorníku typu
registrace, ale se vzorníkem pojmenovaným „[Registration]" — ZSM dnes vrátí
jeho barvu, modul 100 % K. **Moje volba:** přijmout chování modulu; jestli
takový název v Illustratoru vůbec jde vytvořit, neověřeno.

### 4.3 Vrstva Regmarks bez podvrstev (rozhodnutí 3)

Dnes (`draw.js` ~164–169): když Regmarks nemá podvrstvu Zünd ani Summa,
`_clearLayer` smaže celý její obsah. Pravidlo pochází z interní řady před
1.0.0 (značky přímo v Regmarks) a maže i značky z výstupu Tile Exportu (ten
kreslí přímo do Regmarks, `tile-export/src/export.js`) nebo vlastní vrstvu
operátora.

Nově: skript se objektů v Regmarks mimo své podvrstvy nedotkne a na konci
běhu upozorní, že ve vrstvě zůstaly objekty, které nevytvořil (počet, jako
`WARN_TRIM_FOREIGN`). Cena: ve staré zakázce z doby před 1.0.0 zůstanou
staré značky vedle nových — hláška řekne, kde jsou.

### 4.4 Skrytá vrstva Trim a selhání odstranění podvrstvy

- Skrytou vrstvu Trim skript zviditelní (`draw.js` ~506) bez ohlášení. Nově
  přibude do seznamu `WARN_LAYERS_UNHIDDEN` jako Regmarks a mapované vrstvy.
- Odstranění podvrstvy Zünd/Summa má tichý `catch` (~178, ~191); když
  selže, vznikne druhá podvrstva a staré značky zůstanou. Nově se selhání
  počítá jako chyba kreslení (jako K12), ne tiše.

## 5. Měřítko kresby

### 5.1 Pole

Zaškrtávátko „Pracovat v měřítku" a pole „1:" (panel Výstup) nahradí jeden
řádek **„Měřítko kresby 1:"** s polem, stejně jako GM a TE (`LBL_SCALE`;
EN „Drawing scale 1:"). Nápověda podle GM: dokument si měřítko pamatuje,
hodnoty v dialogu se zadávají ve skutečné velikosti.

- Platné je číslo **od 1 do 100**, desetinné, čtení podle §6.1. N < 1 je
  neplatné (rodina kreslí N < 1 jako 1:1 — `getEffectiveSF`, TE
  `manualScale` — a kánon tichou náhradu zakazuje; GM 1.4.0 rozhodl stejně).
  Neplatné pole zčervená a zašedí Generovat i Uložit.
- Zobrazení s čárkou: `2,5` zůstane `2,5`.
- Přípona titulku „ — 1:N" a konec stavového řádku „ · 1:N" zůstávají a píšou
  N s čárkou (dnes regulární výraz `1:\d+` na celé číslo).

### 5.2 Kde žije hodnota

- Při otevření: `ZSM.DrawingScale.load(app.activeDocument)`; nic uloženého → 1.
- Zápis `ZSM.DrawingScale.save` **po úspěšném běhu a jen když se hodnota
  změnila** (GM 1.4.0, §13): odmítnutý běh slibuje „Dokument nebyl změněn.",
  takže nesmí změnit ani měřítko. `render()` dnes úspěch nevrací (holé
  `return` v preflightu) — musí ho vracet.
- Do předvoleb, `[Last Settings]` ani `[Výchozí]` se měřítko neukládá;
  `scaleN` zmizí z `presetEquals` a z ukládaných hodnot. Uložené `scaleN`
  ze starých souborů se ignoruje (rozhodnutí 2).
- Přepnutí ZUND ↔ SUMMA a výběr předvolby měřítko nemění.
- Zpět vrátí značky, ne měřítko v XMP (naměřeno v GM 1.4.0) — README a ruční
  test to řeknou.
- Dokument s měřítkem z Tile Exportu nebo GM otevře ZSM s tímto měřítkem,
  a obráceně.

### 5.3 Přechod (anti-cíl 1)

Dokument kreslený v 1.1.0 v měřítku 1:10 nemá měřítko v XMP a 1.2.0 ho
otevře v 1:1. Měřítko je vidět v poli, a když není 1:1, i v titulku a ve
stavovém řádku. **Moje volba:** žádná jednorázová hláška ani převzetí
z posledního běhu (rozhodnutí 2); CHANGELOG a README řeknou, že dokument
v měřítku je potřeba jednou zadat, a ruční test to projde.

## 6. Čísla a pole (kánon §12.3, P1, N1, N3, N6)

### 6.1 Čtení

`ZSM.Numbers.parse` (sdílený `numbers.js`, gramatika TE: čárka i tečka,
mezery okolo; `1O5`, `1 000`, `20 mm`, `1e3`, `0x10`, `.5` neplatné) nahradí:

- `parseNum` a `isValueInRange` v živé kontrole (`ui.js` ~617, ~1124),
- `Number()` ve `ZSM.Utils.validateNumber` (odeslání),
- `parseInt` měřítka (~300, ~315, ~337, ~353, ~714) — zaniká s polem §5,
- čtení pro Uložit, Uložit jako… a snímek při přepnutí režimu (`getUIValues`).

Prázdné pole zůstává neplatné (všechna pole ZSM jsou povinná). Zašedlé pole
(Mezera od grafiky ve Fixed) dál nese hodnotu předchozího běhu.

Dva testy dnes vyžadují gramatiku `Number()` a změní se vědomě:
`tests/test_utils.js` (`"1e2"` → 100) a property 5 v
`tests/test_properties.js` (generátor `String(fc.double)` dává i `5e-324`;
nově desetinné řetězce).

### 6.2 Zápis

Každé číslo zapsané do pole jde přes `ZSM.Numbers.format` s `ZSM.L.DEC_SEP`
(setUIValues, pole měřítka, první hodnota v `addRow`): česky `2,5`, bez
zaokrouhlení. Meze v hláškách (stavový řádek `STATUS_RANGE`, alert
`ERR_OUT_OF_RANGE`) taky: „0,1–50".

### 6.3 Obarvení pole a Uložit

- `ZSM.FieldPaint.field` nahradí `markFieldValidity` (`ui.js` ~1131–1153);
  chování stejné, jedna kopie pro rodinu (od 2026-10-23 i s opravou pera na
  světlém UI).
- **Uložit i Uložit jako… jsou šedé, dokud je některé pole neplatné**
  (kánon §12.4, dodatečný audit N3). Stav nastaví živá kontrola — ne
  `refreshModifiedIndicator`, který handlery volají dřív, než se platnost
  spočítá (jinak se o jeden úhoz zpozdí). Pole jsou ta, která kontroluje
  živá kontrola (aktivní režim, povolená pole), jako v GM a TE.

## 7. Stavový řádek

Dnes: v klidu „ZUND · 1:10 · vrstvy: 1" výchozím perem; při neplatném poli
„⚠ <pole> — povolený rozsah …" nebo „⚠ Chyb ve formuláři: N…" jantarově.

- **Důvod šedého Generovat** se ukáže jako `✗` v barvě chyby kánonu
  (`ZSM.FieldPaint.COLORS.ERR`), jako GM 1.4.0 a TE. **Moje volba:** kánon
  §12.6 vede stavový řádek ZSM jako příklad „upozornění", jenže ten ukazuje
  jen to, co blokuje běh — to je chyba, ne upozornění. Po vydání se tabulka
  kánonu opraví (patří vláknu kánonu; tady jen zmínka).
- **Klid** se nikdy nemaluje (výchozí pero hostitele). Jestli to s jedním
  popiskem nejde (`FieldPaint` na zakázaném statictextu, pero před `show()`),
  stavitel převezme řešení GM 1.4.0 §13: dva popisky ve stohu, nález
  a důvod, viditelný vždy jeden.
- **Klid říká, co skript v dokumentu našel** (kánon §12.3: šedý řádek
  s nálezem, na stejném místě důvod šedého tlačítka). Dnes klid opakuje jen
  nastavení dialogu a „vrstvy: N" počítá řádky mapování, ne vrstvy
  v dokumentu (prověrka 2026-10-17). Nově, **moje volba** (návrh textu):
  `ZUND · artboard 1 560 × 3 050 mm · řez „Cut" · 1:10` — režim, rozměr
  ve skutečné velikosti (× N, jako GM 1.4.0 §4.6), řezová barva, kterou
  skript v dokumentu našel (`detectCutColor`, už dnes v `docData`), nebo
  `řez nenalezen`, a měřítko jen když není 1:1. V režimu Dle grafiky
  rozměr grafiky místo artboardu, **pokud** je změření hranic před dialogem
  levné (`ZSM.Bounds.get` prochází všechny objekty — stavitel změří na
  velkém dokumentu; když ne, v Dle grafiky rozměr vynechá). Pouze značky
  dál řekne „pouze značky". Nejdelší možný text určí šířku řádku.
- Šířka řádku je dnes literál 340 px v kódu; přesune se do `ZSM.UI.M`
  s důvodem „živý text" (kánon §4.1) a změří se pro nejdelší text.

## 8. Předvolby (kánon §9, §12.4, P5, J3)

- **Hvězdička:** při každé změně se přepíšou všechny položky seznamu (dnes
  jen aktivní, `ui.js` ~809–824). Chyba je jen v ZSM, sdílený `ui_state.js`
  se nemění.
- **[Výchozí] v režimu SUMMA:** porovnává se s továrními hodnotami
  *aktuálního* režimu (dnes vždy ZUND, proto trvalé „*"), a ↺ u [Výchozí]
  udělá totéž co tlačítko Výchozí — tovární hodnoty, režim zůstane (dnes
  přepne do ZUND).
- **Věty a klíče** podle tabulky kánonu §12.4 (`PROMPT_SAVE_AS`,
  `CONFIRM_OVERWRITE_PRESET` s názvem, `CONFIRM_DELETE_PRESET`,
  `ERR_ENTER_NAME` pro prázdný i mezerový název, `ERR_RESERVED_NAME`,
  `ERR_CANNOT_DELETE_DEFAULT`, `BTN_REVERT` = ↺ místo literálu v kódu).
- **Panel podle šablony §9:** ↺ ve vlastní skupině vedle seznamu, Uložit /
  Uložit jako… / Smazat v nativní šířce (dnes 92 px, „Uložit jako…" potřebuje
  103 px); literál šířky tlačítka Výchozí zmizí.
- Uložit na [Výchozí] otevře Uložit jako… (beze změny), [Výchozí] z kódu
  při každém otevření (beze změny).

## 9. Hlášky a texty

### 9.1 Slovník (kánon §12.8, J1)

| pole | dnes | 1.2.0 |
|---|---|---|
| `maxDist` | Rozteč značek: | **Max. rozteč značek:** |
| `markSizeZ` | Velikost Zünd: | **Průměr značky:** |
| `markColor` | Barva značek (Spot): | **Barva značek:** |
| `gapInner`, `orientDist` | Mezera od grafiky:, Odsazení orientační značky: | beze změny |

Hlášky o kolizi značek říkají „max. rozteč značek"; „velikost značky" v nich
zůstává, platí pro oba režimy. Nápověda odsazení orientační značky doplní
„mezi okraji značek" (naměřeno: odsazení je volná mezera mezi okraji, ne
vzdálenost středů — nápověda TE „od rohu" je nepřesná, nepřebírat).

### 9.2 Šablony hlášek (kánon §12.2, J5)

- **Bez dokumentu:** „Před spuštěním skriptu otevřete dokument." (GM).
- **Neočekávaná chyba:** šablona `ERR_CRITICAL` kánonu (řádek česky, stav
  dokumentu, komu poslat), pojistka na `e.line` z `main.js` zůstává.
- **Pád při kreslení** (`ERR_RENDER_CRITICAL`): jedna předpona místo dnešních
  dvou („CHYBA: Kritická chyba při vykreslování:"), číslo řádku a rada podle
  šablony. Dnešní rada „Soubor › Vrátit" zahodí i neuloženou práci z doby
  před spuštěním — nahradí ji Zpět (Cmd+Z) s poznámkou, že u SUMMA je to
  několik kroků (README, K11).
- **Neuložené nastavení** se rozdělí podle následku (GM 1.4.0
  `ERR_WRITE_SETTINGS_RUN`): po Generovat „…příště se dialog otevře
  s předchozími hodnotami. Značky se vykreslí."; u tlačítek předvoleb věta
  o předvolbě bez „Běh pokračuje".

### 9.3 Typografie (kánon §12.1, J6)

- Názvy v hláškách v „…" (dnes ‘…’, 12 klíčů).
- Bez vykřičníků (3 hlášky validace; `tests/test_locale.js` je dnes
  vyžaduje — upravit).
- Jen předpony `CHYBA: ` a `UPOZORNĚNÍ: `; blokující chyby, které dnes
  předponu nemají (vyhrazená vrstva, prázdný dokument, název vrstvy,
  validace), ji dostanou.
- Alert z validace bez dvojtečky popisku uprostřed věty („Mezera od okraje:
  musí být číslo!" → „Mezera od okraje: zadejte číslo od 0 do 1000 mm.").
- Počty v nových textech (cizí objekty v Regmarks, §4.3) přes `ZSM.L.count`
  s tvary `_1`, `_2`, `_5`, nebo ve tvaru „objektů: 4" (kánon §12.1).
- „artboard" malým písmenem i v češtině, jako ve slovníku kánonu §12.8
  („Dle artboardu (Fixed)", nápověda zdroje, hláška prázdného dokumentu).

### 9.4 „Dokument nebyl změněn."

- Doplnit do hlášky prázdného dokumentu (`ERR_NO_SEL`); hláška o příliš
  velkém artboardu sjednotit na tutéž větu.
- Dnes se před preflightem nastaví `rulerOrigin = [0, 0]` (`main.js` ~74–75),
  takže věta neplatí doslova. **Moje volba:** přesunout nastavení za
  preflight, ať je věta pravdivá; když to nejde (geometrie ho potřebuje
  dřív), větu u těchto hlášek zmírnit. Rozhodne stavitel podle kódu.

### 9.5 Registrační barva v textech

České texty píšou „[Registration]" (`WARN_COLOR_FALLBACK`, `TIP_MARK_COLOR`),
nabídka ukazuje „[Registrační]". Nově „registrační barva" slovy; nápověda
k barvě značek přestane tvrdit, že je registrační barva „výchozí pro
všechny separace" (EN říká „all separations").

### 9.6 Úklid

- Nepoužitých klíčů locale je dnes 9. Sedm se smaže (`ERR_LAY_COLOR`,
  `ERR_SWATCH`, `ERR_GENERIC`, `ERR_MIN_ROW`, `DEF_CUT`, `DEF_KISS`,
  `PRESET_PLACEHOLDER`), dva se začnou používat (`BTN_REVERT` §8, `DEC_SEP`
  §6.2).
- Titulek „Zünd & Summa Marks v1.2.0" a patička beze změny (kánon splněn).

## 10. Drobnosti

- Úvodní fokus ve Fixed míří na zašedlé pole — nově první povolené pole.
- Komentář `main.js` ~14–20 k `coordinateSystem` odporuje engine-facts (Y roste
  nahoru v obou systémech); opravit text, chování beze změny.

## 11. Výška a šířka dialogu

Pole měřítka ubere řádek (zaškrtávátko + pole → jeden řádek), panel
předvoleb podle §9 výšku nemění, tlačítka v nativní šířce přidají asi 33 px
šířky v řádku předvoleb. Stavitel změří headless všechny stavy (ZUND/SUMMA,
Auto/Fixed, Pouze značky; CS i EN) a uživatel v ručním testu potvrdí, že jsou
tlačítka vidět celá. Strop výšky jako GM a TE (~850 px).

## 12. Kompatibilita

- Předvolby a `[Last Settings]` beze změny klíčů kromě `scaleN`, které se
  ignoruje a při dalším uložení vypadne.
- Hodnoty uložené jako čísla se v polích zapíšou s čárkou.
- Uložená hodnota, kterou nová gramatika nepřečte, neexistuje: ukládají se
  čísla, ne text.
- Dokument bez měřítka → 1:1 → stejný výsledek jako 1.1.0 s 1:1.

## 13. Ověření

- **Node:** čtení a zápis čísel v polích (tabulka N1 v obou směrech);
  hradlo Uložit; měřítko v dialogu, validaci a XMP přes mock; regresní test
  1:1 (polohy a rozměry jako 1.1.0); 1:10 = 1:1 / 10; měřítko × Large Canvas;
  pruh a linky s `strokeDashes = []` a `BUTTENDCAP` v mocku; Regmarks
  s cizím obsahem; Trim v ohlášení; hvězdička; [Výchozí] v SUMMA; parita
  klíčů a texty (žádné ‘…’, „!", „Velikost Zünd" v CS). Sdílené testy
  `npm run test:shared` vč. nového testu registrace.
- **Illustrator** (harness ve vlastních dokumentech, nikdy při otevřeném
  dokumentu uživatele): sonda P3 po úpravě (čárkovaná cesta vybraná → pruh
  plný, PNG); 1:10 proti 1:1; dokument s měřítkem z Tile Exportu; zápis
  a čtení XMP; výšky dialogu headless.
- **Ruční test:** nová sekce v `docs/manual-test.md` (P3 s perforací, měřítko
  a přechod z 1.1.0, čísla s čárkou a překlepy, předvolby, hlášky, výstup TE
  s Regmarks).

## 14. Pořadí prací (návrh)

1. P3 čistý tah (§4.1) — samostatně, kdyby bylo potřeba vydat dřív.
2. Sdílené moduly v buildu a čísla (§6), obarvení pole.
3. Registrace + oprava modulu (§4.2).
4. Měřítko kresby (§5) s návratovou hodnotou `render()`.
5. Vrstvy: Regmarks, Trim, odstranění podvrstvy (§4.3, §4.4).
6. Předvolby (§8) a stavový řádek (§7).
7. Hlášky a texty (§9), drobnosti (§10).
8. Výška dialogu (§11), dokumentace: CHANGELOG, README, ruční test,
   engine-facts.

## 15. Co je na staviteli

- Přesné texty nových hlášek a anglické texty.
- Jestli stavový řádek zvládne jeden popisek, nebo dva ve stohu (§7).
- Přesun `rulerOrigin` za preflight, nebo zmírnění věty (§9.4).
- Rozdělení práce do commitů a testů.

## 16. Pokrytí kánonu a sdílených modulů

Kontrolní tabulka: každé pravidlo kánonu (`extendscript-ui-standards` §9,
§12, checklist §10) a každý modul ze `shared/lib`, a kde ho tento návrh řeší.
✓ ZSM splňuje už dnes · → řeší tento návrh · — netýká se.

| kánon / modul | stav | kde |
|---|---|---|
| §12.1 vykání, dvojtečka za popiskem | ✓ | — |
| §12.1 „…", bez „!", dvě předpony, počty | → | §9.3 |
| §12.2 co, proč, co dělat; stav dokumentu | → | §9.4 |
| §12.2 bez dokumentu, `ERR_CRITICAL`, neuložené nastavení | → | §9.2 |
| §12.3 jedno čtení čísel | → | §6.1 |
| §12.3 zápis s `DEC_SEP`, bez zaokrouhlení | → | §6.2 |
| §12.3 červené pole, šedé hlavní tlačítko | ✓ (vlastní kód) → modul | §6.3 |
| §12.3 jedno místo říká, proč je tlačítko šedé | ✓ | §7 (symbol a barva) |
| §12.3 šedý řádek s tím, co skript našel | → | §7 |
| §12.3 „(chybí)" u uložené hodnoty | ✓ | — |
| §12.3 cesty a složky v dialogu | — | ZSM nevybírá soubory |
| §12.4 hvězdička u všech položek | → | §8 |
| §12.4 Uložit a Uložit jako… šedé s neplatným polem | → | §6.3 |
| §12.4 Uložit na [Výchozí] → Uložit jako…, [Výchozí] z kódu | ✓ | §8 ([Výchozí] v SUMMA) |
| §12.4 věty a klíče předvoleb | → | §8 |
| §12.5 průběh, souhrn, otevřít složku | — | viz `progress.js` níže |
| §12.6 symboly a barvy | → | §7 |
| §12.7 titulek, §9 patička | ✓ | — |
| §12.8 slovník | → | §9.1, §9.3 |
| §12.9 měřítko kresby | → | §5 |
| §12.10 čárky, konce a spoje nové cesty | → | §4.1 |
| §9 panel předvoleb (↺ ve skupině, nativní šířky) | → | §8 |
| §4.1 pixelové šířky jen v `M` s důvodem | → | §7, §8 |
| `json2.js`, `ui_state.js`, `cut_marks.js` | ✓ | už v buildu |
| `numbers.js` | → | §6.1, §6.2 |
| `field_paint.js` | → | §6.3, §7 |
| `registration.js` (+ oprava v modulu) | → | §4.2 |
| `drawing_scale.js` | → | §5 |
| `progress.js`, `summary.js` | — | **moje volba:** běh ZSM nezapisuje soubory a nemá dávku položek, na konci ukáže upozornění v jednom okně (kánon §12.1). Kdyby měření na velkém dokumentu ukázalo běh delší než pár sekund, je to kandidát na další verzi. |

Moduly přibudou do `tools/build.sh` za `buildUIState(ZSM);` po dvojicích
`cat` + `build…(ZSM);`, jako v GM (`grommet-marks/tools/build.sh`);
sahají na `ZSM.L` a `ZSM.Utils.log` až při volání.

## 17. Odchylky od návrhu (implementace 2026-10-23/24)

Co se při stavbě změnilo proti textu výš; čísla jsou z měření v Illustratoru
30.8.2 (`docs/extendscript-engine-facts.md`, oddíl „Čistý tah, měřítko kresby,
Zpět a rozměry dialogu zund-summa-marks 1.2.0“, 2026-10-24).

- **Počátek pravítek se vrací, nepřesouvá** (§9.4). Geometrie čte souřadnice
  od počátku [0, 0], takže ho `main.js` nastavuje dál před měřením. Věta
  „Dokument nebyl změněn.“ přesto platí doslova: běh odmítnutý dřív, než se
  dokument změnil (prázdný dokument, `render()` vrátí `false`), vrátí
  operátorovi jeho původní počátek. Změřeno: počátek posunutý na [100, 50]
  zůstal po odmítnutí kolizí značek i po odmítnutí prázdného dokumentu; běh,
  který kreslil, ho nechá v rohu artboardu jako dřív.
- **`render()` odpovídá třemi hodnotami** (§5.2 chtěl jen „úspěch“, R4):
  `true` = kreslilo (i s ohlášenou chybou části výstupu — měřítko se uloží),
  `false` = odmítnuto bez změny (počátek pravítek se vrátí), `null` = pád
  uprostřed kreslení (dokument může být změněný: počátek zůstane, měřítko se
  neuloží).
- **[Výchozí] vybrané ze seznamu zůstane v aktuálním režimu** (§8 to říkal jen
  o ↺, R8). [Výchozí] jsou tovární hodnoty režimu, který dialog ukazuje,
  takže výběr ze seznamu i ↺ nechají SUMMA v SUMMA. Dřív výběr přepnul do
  ZUND; CHANGELOG to říká.
- **Rada po pádu při kreslení: několik kroků Zpět v každém režimu** (§9.2
  psal „s poznámkou, že u SUMMA je to několik kroků“ — to je chyba, R10).
  Každý běh se vrací několika kroky a změna artboardu je samostatný krok:
  změřeno příkazem menu Zpět ZUND s mapováním 2 kroky (značky a vrstvy, pak
  artboard), SUMMA s mapováním a ořezovými linkami 4 (poslední artboard).
  Hláška žádný režim nejmenuje a nepíše „a skript spusťte znovu“.
- **Zašedlá Mezera od grafiky se při Uložit uloží s hodnotou předvolby**
  (§6.1, ruling úkolu 3): pole zašedlé v Dle artboardu živá kontrola
  přeskakuje, takže by se překlep v něm uložil jako `null`. `getUIValues`
  proto bere hodnotu předchozí (aktivní předvolby), jako handler Generovat.
- **`ERR_NO_DOC` a `ERR_CRITICAL` jsou bez předpony** (§9.3 dával předponu
  všem blokujícím chybám, R9). Kánon §12.2 je uvádí jako hotové šablony a GM
  i BRE je ukazují bez předpony.
- **Stavový řádek je 425 px a dialog 465 px** (§7: „změří se pro nejdelší
  text“). Šířka 415 px z úkolu 8 byla odhad podle modelu písma, který nepočítal
  s tím, že `detectCutColor` vrací název barvy, jak ho má dokument: nález
  s „CUTCONTOUR“ měří 425 px (EN 424) a důvod „✗ Barva „CUTCONTOUR“ je
  přiřazena více vrstvám…“ 418 px — obojí se uřízlo. `M.STATUS_W` je teď
  změřený a test v `test_ui_layout.js` drží texty, pro které se měřilo.
  Dialog: ZUND 465 × 720, SUMMA 465 × 756 (1.1.0: 448 × 717 a 753), česky
  i anglicky stejně; strop ~850 px drží s jedním až čtyřmi řádky mapování
  (odhad z krajních stavů, řádek přidá 25–29 px), s osmi měří dialog
  923/932 px skoro stejně jako 1.1.0 (920/932).
- **Rozměr grafiky ve stavovém řádku chybí** (§7: „pokud je změření hranic
  před dialogem levné“). Měření bez zrušení výběru existuje (táž procházka
  jako `ZSM.Bounds.get`, výsledek stejný, výběr zůstane), ale roste
  kvadraticky: 1 006 cest 15 ms, 5 026 cest 0,25 s, 20 101 cest 3,9 s, a to
  pro každý režim zvlášť (ZUND a SUMMA počítají jiné podvrstvy Regmarks).
  Dialog by se na velkém dokumentu otevíral o sekundy později i pro Storno,
  proto `docData.artwork` zůstává `null` a v Dle grafiky a SUMMA řádek
  rozměr neuvádí.
- **Zpět ze skriptu a z menu se liší** (§5.2 předpokládal „Zpět vrátí
  značky, ne měřítko“, naměřeno v GM přes `app.undo()`). Měřítko Zpět
  nevrátí v obou případech, ale `app.undo()` nevrátil po běhu ZSM ani
  artboard (ani 1.1.0), příkaz menu Zpět ano. README, CHANGELOG a ruční test
  proto mluví o krocích naměřených příkazem menu; Cmd+Z po běhu z menu Soubor
  › Skripty ověří ruční test (oddíl 3).
- **Řádek nálezu vypisuje všechny známé řezové barvy** (§7 počítal s jednou,
  `řez „Cut"`). Ruční kontrola 2026-10-24: dokument s Thru-cut a Kiss-cut
  ukazoval jen „Thru-cut", protože `detectCutColor` vrací první barvu podle
  priority. Uživatel zvolil vypsat všechny: nové `ZSM.Draw.detectCutColors()`
  (CutContour → Thru-cut → Kiss-cut → Cut, v zápisu dokumentu), řádek je
  ukáže dvě jménem a zbytek jako „+N" (`řezy: „Thru-cut", „Kiss-cut"`).
  Měřítko se přesunulo před řezové barvy: řádek se zkracuje na konci a dlouhý
  seznam barev nesmí schovat měřítko. `detectCutColor` dál vrací první barvu
  (plní [Výchozí]). Šířka `M.STATUS_W` se nemění: nejširší změřený text má
  jednu barvu, stejné znaky jen v jiném pořadí; seznam dvou dlouhých jmen se
  na konci zkrátí.
