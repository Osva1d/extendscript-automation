# Návrh — grommet-marks 1.3.0: tvary v režimu cesty

Nástroj: `grommet-marks`, namespace `GM`. Navazuje na vydání 1.2.0
(2026-10-04).

Datum: 2026-10-11 · Stav: **schváleno** (uživatel, 2026-10-11);
implementováno na větvi `feat/grommet-marks-path-mode`, ověřeno v Illustratoru
30.8.2 (2026-10-13), nevydáno. Doplněno 2026-10-17 po automatickém testu
v Illustratoru: vnitřní rohy v kontrole (§5.5, §7), skupina s jedinou cestou
(§8.2, §11)

Vzniklo z průzkumu režimů „Hrany artboardu" a „Vybraná cesta" (2026-10-05 až
2026-10-10): otázky uživateli, měření v Illustratoru 30.8.2, rešerše praxe
a interaktivní prototyp dialogu.

---

## 1. Proč

Režim Vybraná cesta dnes klade značky **středem na cestu**. Kdo chce oka
v odsazení od řezu, musí si cestu nejdřív sám posunout (Objekt ▸ Cesta ▸
Odsazená cesta…), spustit skript na posunuté kopii a kopii pak smazat. K tomu:

- **Zaoblené rohy skript nepozná.** Zaoblený obdélník je pro něj hladká cesta:
  značky jdou rovnoměrně od první kotvy a do rohů nemusí padnout žádná.
- **Tvar bez rohů začíná na první kotvě**, kterou operátor nevidí. U kruhu
  z PDF leží kdekoli; při lichém počtu pak kruh visí nakřivo.
- **Část obvodu** označit nejde.

## 2. Jak se režimy používají (uživatel, 2026-10-05)

- **Obdélníky a čtverce** (nejčastější) jdou přes **artboard**; artboard je
  řezová linka. Režim artboardu se v 1.3.0 nemění.
- **Režim cesty je pro tvary:** kruh, půlkruh, trojúhelník, štít domu (jedna
  cesta — obdélník a trojúhelník spojené v pětiúhelník) a méně často zaoblený
  obdélník. Všechny jsou konvexní.
- Zaoblení vzniká **živými rohy**, nebo cesta přijde hotová v **PDF** od klienta
  (oblouk může být rozdělený na víc úseků nebo nahrazený úsečkami).
- Část obvodu: „téměř nikdy, ale chci mít volbu".

## 3. Rozhodnutí

| # | rozhodnutí | původ |
|---|---|---|
| 1 | Odsazení od řezu se zadá v dialogu, i v režimu cesty. | uživatel, 2026-10-05 |
| 2 | Zaoblený obdélník je tvarová cesta, ne zvláštní případ artboardu. Varianta „vybraný obdélník jako artboard" padla. | uživatel, 2026-10-05 |
| 3 | Zaoblený roh = roh: **jedna značka uprostřed oblouku**, zbytek výplň. Varianta „dlouhý oblouk dostane značky na koncích, hranice v dialogu" zahozena. | uživatel + rešerše, 2026-10-09 (§12) |
| 4 | Tvar bez rohů začíná **nahoře**. | data, 2026-10-09 (§12) |
| 5 | Linku ok počítá **Illustratorova Odsazená cesta** (Objekt ▸ Cesta ▸ Odsazená cesta…) ze skriptu, ne vlastní výpočet. | měření, 2026-10-09 (§6) |
| 6 | Skript **kontroluje výsledek**, nepředpovídá chyby tvaru. | měření, 2026-10-09 (§7) |
| 7 | Vnitřní rohy se značí jako dnes, bez volby. | 2026-10-09 |
| 8 | Část obvodu = zaškrtávátko, vždy vypnuté, neukládá se. | uživatel, 2026-10-09 |
| 9 | Panel Cesta mluví jako panel Hrany; šedý řádek říká, co skript poznal; otevřená cesta zůstane jako dnes. | uživatel, 2026-10-09 |

Rozhodnutí 4–7 navrhl Claude podle dat; uživatel je spolu s celým návrhem
schválil 2026-10-11.

## 4. Pojmy

- **Řezová linka** — vybraná cesta (u artboardu jeho obdélník).
- **Linka ok** — čára, na kterou padnou středy značek: řezová linka posunutá
  o odsazení **D** dovnitř tvaru. Při D = 0 a u otevřené cesty je to řezová
  linka sama.
- **Úsek** — Bézierův úsek mezi dvěma kotvami cesty.
- **Ostrý roh** — kotva, kde se směr cesty zlomí o víc než 15°
  (`CORNER_ANGLE_MIN`, beze změny).
- **Zaoblený roh** — oblouk mezi dvěma rovnými úseky, u kterého se směr
  celkem stočí o víc než 15°, s hladkými přechody na obou koncích. Oblouk mezi
  dvěma ostrými rohy (půlkruh) je obyčejná strana.
- **Část obvodu** — úseky vybrané nástrojem Přímý výběr.

Oblouk nahrazený krátkými úsečkami (PDF z CADu) se jako zaoblený roh
nepozná: každá úsečka je rovná a zlomy mezi nimi jsou pod 15°. Takový tvar
se rozmístí podle ostrých rohů, které skript najde, případně jako tvar bez
rohů. Značky jsou dál ve vzdálenosti D od řezu (§7), jen nemusí padnout doprostřed
oblouku. Zda rozpoznávat i takové oblouky, rozhodne první skutečné PDF (§14).

## 5. Pravidla rozmístění v režimu cesty

### 5.1 Linka ok

- Uzavřená cesta a D > 0 → linka ok = výsledek Odsazené cesty o D dovnitř (§6).
- D = 0 → linka ok je řezová linka (jako dnes).
- Otevřená cesta → linka ok je cesta sama; pole Odsazení je zašedlé (nejde
  určit, na kterou stranu odsadit).

### 5.2 Značky v rozích

Rohy se hledají **na lince ok**, ne na řezové lince:

- ostrý roh → značka v rohu;
- zaoblený roh → jedna značka uprostřed oblouku. Je-li poloměr R ≤ D, má linka
  ok v tom místě ostrý roh a značka padne do něj — výsledek je stejný jako
  u ostrého rohu (D od obou hran);
- žádný roh, uzavřená linka → první značka v **nejvyšším bodě** linky ok.

### 5.3 Výplň a počet

- Mezi sousedními rohovými značkami se vyplní rozestupem stávající funkcí
  `distributeOnSpan` (výběr počtu floor/ceil beze změny), **i přes oblouky**.
  Dlouhý oblouk tak dostane značky z výplně.
- Počet ok: tvar bez rohů → N značek rovnoměrně od nejvyššího bodu; tvar
  s rohy → značky jen do rohů, pole ukazuje jejich počet jen pro čtení
  (pravidlo z 1.1.0). Zaoblené rohy se do počtu rohů počítají.
- Rohové zóny se měří od každé rohové značky, ostré i zaoblené (jako dnes).

### 5.4 Část obvodu

- Úsek je vybraný, když mají obě jeho koncové kotvy
  `PathPointSelection.ANCHORPOINT` (naměřeno, §6.3).
- Souvislé vybrané úseky tvoří **běh**. Běh se značí jako otevřená cesta:
  oba konce dostanou značku, rohy uvnitř podle §5.2.
- Na linku ok se běh přenese po koncích: každý konec běhu jde na nejbližší bod
  linky ok (směr linky ok vychází z orientace obou linek, protože Illustrator
  ji může vrátit opačně). Běh, jehož oba konce splynou v jednom bodě, je podle
  své délky na řezové lince buď jeden bod, nebo celý obvod.
- Vybrané všechny kotvy, nebo žádná → celý obvod. „Všechny strany kromě jedné"
  proto vybrat nejde (všechny kotvy jsou vybrané) — známé omezení.
- Vybrané kotvy, ale žádný celý úsek → zaškrtávátko zašedlé s vlastní
  nápovědou.
- Zaškrtávátko je při každém spuštění vypnuté a do předvolby se neukládá:
  přímý výběr zapomenutý z dřívější úpravy tak nic nezmění.
- Počet ok se u části obvodu nenabízí: běh se značí jako otevřená cesta, počet
  by dal jen jeho konce a rohy (§5.3), ne číslo z pole. Dokud je zaškrtávátko
  zaškrtnuté, je řádek na Rozestupu (§8.2).

### 5.5 Vnitřní rohy

Odsazení s ostrým spojem (Spoje čar Ostré, Limit úkosu 4 — výchozí hodnota
Illustratoru): roh linky ok leží D od obou hran, stejně jako u vnějšího rohu,
a dostane značku. Od samotného vrcholu vnitřního rohu řezové linky je ale dál
než D: u pravého úhlu D·√2, u ostřejšího vnitřního rohu víc, nejvýš 4 D (za
touto mezí Illustrator roh zkosí). Kontrola (§7) s tím počítá — do 2026-10-17
nepočítala a vnitřní rohy odmítala (automatický test: tvar L 600 mm při D
20 mm, činka s hrdlem 28 mm při D 10 mm).
V tvarech uživatele se nevyskytují; naměřeno 2026-10-13 (Illustrator 30.8.2,
tvar L, D 56,69 pt): vnitřní (reflexní) roh linky ok je ostrý (`jntp 2`, bez
zkosení a zaoblení) a leží D od obou hran — pro vnitřní roh řezové linky
v (400, 400) přesně v (400 − D, 400 − D). Odchylka od očekávaných rohů nejvýš
0,0006 pt, linka ok se nikde nekříží.

## 6. Odsazení přes Illustrator

### 6.1 Postup

1. Z řezové linky se postaví **čistá kopie** bod po bodu: kotva a oba úchyty
   každého bodu (ne `setEntirePath`, ten úchyty přenést neumí), **s výplní a bez
   tahu**, bez vzhledu. Efekty se v Illustratoru skládají, takže kopie přes
   `duplicate()` by s vlastním efektem cesty dala jiný výsledek, a objekt
   s výplní i tahem by se po `expandStyle` rozpadl na skupinu dvou cest.
2. `applyEffect('<LiveEffect name="Adobe Offset Path"><Dict data="R mlim 4 R ofst -D I jntp 2 "/></LiveEffect>')`
   — D v jednotkách dokumentu (u Large Canvas děleno `scaleFactor`, jako G1).
3. Před `expandStyle` se řezová linka **odznačí výslovně** (`doc.selection =
   null` přímý výběr neodznačí — naměřeno 2026-10-13: cesta s vybranými jen
   některými kotvami zůstane vybraná, a `expandStyle` by pak rozbalil i ji)
   a vybere se jen kopie. Hlídá se, že je vybraný právě jeden objekt, že je to
   kopie a že řezová linka vybraná není; jinak chyba a nic se nerozbaluje.
   Pak se ověří, že je aktivní vlastní dokument běhu, a spustí
   `app.executeMenuCommand("expandStyle")`.
4. Přečíst geometrii z výběru, dočasné objekty smazat, výběr vrátit bod po
   bodu (stavy kotev), aby přežil i přímý výběr a druhý běh dopadl stejně jako
   první.

Parametry efektu Adobe nedokumentuje; jsou z fóra a ověřené měřením (§6.2).
Selhání kteréhokoli kroku je chyba s hláškou, nikdy tichý návrat.

### 6.2 Naměřeno (Illustrator 30.8.2, 2026-10-09, vlastní dokumenty)

| tvar | výsledek |
|---|---|
| kruh r 500 pt, D 56,69 pt | r 443,31–443,46 pt (čekáno 443,31), 4 → 16 kotev |
| trojúhelník, štít (po i proti směru hodin) | vrcholy přesně (0,00 pt) |
| zaoblený obdélník R 150 / R 30 | přesně; R 30 < D dá ostré rohy; 8 → 12 kotev |
| pruh 100 pt, D 56,69 pt | **vrátí původní cestu beze změny**, bez chyby |
| činka s hrdlem 80 pt | `CompoundPathItem` se 2 smyčkami |

- Záporné `ofst` posouvá dovnitř u obou směrů kreslení.
- 33–123 ms na tvar.
- Celý běh (kopie, efekt, expandStyle, smazání, nová vrstva, značky) =
  **jeden krok Zpět**; hláška G4 „Zpět vrátí tento běh" platí dál.
- Odsazená cesta je nová: její kotvy nesouvisí s kotvami řezové linky.

### 6.3 Přímý výběr (2026-10-05)

- Klik na rovný úsek → obě kotvy `ANCHORPOINT`; sousedé hlásí jen úchyt
  (`LEFTDIRECTION` / `RIGHTDIRECTION`).
- Výběr kotev u oblouků se čte stejně (hvězda, 20 bodů, 11 z 20 úseků).
- Živé rohy jsou skutečná geometrie: 8 kotev, oblouk = jeden Bézierův úsek
  s úchyty ≈ 0,552·R.

## 7. Kontrola výsledku

Před vytvořením první značky:

- linka ok je **právě jedna uzavřená smyčka** (u uzavřené cesty);
- každá značka leží **uvnitř** řezové linky a její vzdálenost od řezové linky
  se liší od D nejvýš o **0,5 pt** (naměřená odchylka 0,15 pt) plus největší
  průhyb tětiv řezové linky. Kontrola totiž měří k navzorkované řezové lince
  (tětivy), ne k její křivce, a bod uvnitř tvaru je k tětivě blíž než ke
  křivce; průhyb je u běžných tvarů zanedbatelný a roste s poloměrem (kruh ze
  4 kotev o poloměru 2,4 m: 0,556 pt, naměřeno 2026-10-13). Výjimka je značka
  ve vnitřním rohu (§5.5): když je jejím nejbližším bodem řezové linky zlom
  (kotva, kde se směr zlomí o víc než 1°), smí ležet dál než D, nejvýš 4 D
  (Limit úkosu); blíž než D nikdy. Hladká kotva výjimku nedostane — na kruhu
  s Počtem ok 4 leží každá značka na paprsku kotvy a prošlo by i špatné
  odsazení (kontrola 2026-10-17). Při D = 0
  kontrola neběží: značky leží na řezové lince z konstrukce.

Porušení → žádná značka, hláška s důvodem. Pravidlo chytí tichý návrat
originálu (§6.2) i chyby, které dnes nikdo nečeká, protože hlídá přímo to, na
čem záleží. Vzdálenost od řezové linky se počítá z navzorkované řezové linky
(stávající `buildCircuit`).

## 8. Dialog

Předvolby, Hrany, Rohové zóny a Značka se nemění.

| panel | obsah | změna proti 1.2.0 |
|---|---|---|
| Umístění | Hrany artboardu / Vybraná cesta, Jednotky; **šedý řádek** | řádek nový, platí pro oba režimy |
| Cesta | **Odsazení od kraje**, Počet ok / Rozestup, **Jen vybraná část obvodu** | řádek s informací se přesunul do Umístění; poznámka „posuňte si cestu předem" pryč |

### 8.1 Šedý řádek

| stav | text (CS) |
|---|---|
| artboard, 1 | `1 artboard · 2000 × 1000 mm` |
| artboardy, víc | `3 artboardy · značky dostanou všechny` |
| předvolba chce cestu, žádná není | `Předvolba chce cestu, žádná není vybraná — značí se artboard.` (šedě jako ostatní stavy; barva upozornění se nepoužila) |
| cesta | `Uzavřená cesta · 5 rohů` · `· 4 zaoblené rohy` · `· 3 rohy, 2 zaoblené` |
| bez rohů | `Uzavřená cesta · bez rohů · první značka nahoře` |
| otevřená / D = 0 | `… · značky leží na cestě` |

Řádek mění text za běhu: šířka nejdelšího textu se rezervuje předem
(`extendscript-ui-standards` §4, případ 2). Čeština skloňuje: 1 roh, 2–4 rohy,
5 rohů (a obdobně artboardy, zaoblené rohy). Zaoblené rohy se počítají na
řezové lince, takže řádek nezávisí na D a dialog nemusí odsazovat.

### 8.2 Kdy je co aktivní

| prvek | aktivní, když | jinak |
|---|---|---|
| Vybraná cesta | výběr je jedna jednoduchá cesta, nebo skupina, ve které není nic než ona (Illustrator takovou cestu podle způsobu výběru hlásí jako vybranou skupinu, naměřeno 2026-10-17) | zašedlá, nápověda s důvodem (jako dnes) |
| Odsazení (Cesta) | cesta je uzavřená | zašedlé, nápověda „U otevřené cesty nejde určit, na kterou stranu odsadit — značky leží na cestě." |
| Počet ok | není zaškrtnuté Jen vybraná část; na cestě s rohy pole jen ukazuje počet rohů (§5.3) | zašedlé, řádek je na Rozestupu, nápověda řekne proč; po odškrtnutí se vrátí zvolený Počet ok |
| Jen vybraná část | přímý výběr obsahuje aspoň jeden celý úsek | zašedlé; vlastní nápověda pro samostatnou kotvu |
| Zhustit u rohů | artboard; cesta s rohy (i zaoblenými) a Rozestupem | zašedlé s důvodem (jako dnes) |
| Generovat | pole aktivního režimu jsou platná | zašedlé, vadné pole zčervená |

Výchozí režim dál určuje předvolba; když chce cestu a žádná použitelná není,
dialog otevře artboard a řekne to šedým řádkem (dnes potichu).

Nápověda zaškrtávátka: „Značky jen na úsecích, které mají vybrané obě koncové
kotvy. Výchozí je celý obvod; volba se do předvolby neukládá." Zašedlé: „Část
obvodu vyberte nástrojem Přímý výběr (A): kotvy na začátku i konci každého
úseku." Samostatná kotva: „Vybraná je jen samostatná kotva — označte Přímým
výběrem i druhý konec úseku."

### 8.3 Výška

V režimu cesty se výška nemění (panel Cesta řádek ztratil, Umístění získalo).
V režimu artboardu přibude jeden řádek, asi 30 px: dnes 708 px, bez zrcadlení
754 px (audit 2026-09-29). Verze v6 se kvůli uříznutým tlačítkům na 13"
displejích stáhla na ~795 px — tu výšku nepřekročit. Změřit headless.

Naměřeno headless 2026-10-13 (Illustrator 30.8.2, čeština): artboard se
zrcadlením 731 px (+23), bez zrcadlení 777 px (+23), cesta 651 px (−10;
návrh čekal beze změny). Šířka se nezměnila (CS 521 px, EN 492 px); nejvyšší
stav 777 px je pod stropem 795 px. Šedý řádek má 445 px (CS) / 416 px (EN),
nejdelší text 409 / 408 px.

## 9. Generovat — průběh

1. Znovu přečíst výběr (jako dnes; zmizelá cesta → stávající hláška).
2. Linka ok (§5.1, §6).
3. Rohy na lince ok, začátek tvaru bez rohů (§5.2).
4. Část obvodu, je-li zaškrtnutá (§5.4).
5. Výplň a zóny (§5.3).
6. Kontrola (§7). Chyba → hláška, konec, žádná značka.
7. Značky na vrstvu Grommet Marks a stávající upozornění (zdvojené značky,
   skrytá vrstva, nevytvořené značky).

### 9.1 Nové hlášky (CS)

- `Odsazení %s je na tento tvar moc velké — linka ok by se v nejužším místě zhroutila. Zmenšete odsazení. Dokument nebyl změněn.`
- `Linka ok se v úzkém místě rozpadá na víc částí (%s). Zmenšete odsazení. Dokument nebyl změněn.`
- `Illustrator nedokázal cestu odsadit (%s). Žádná značka nevznikla.`

Odmítnutí končí tím, co se stalo s dokumentem (rodinný kánon
`extendscript-ui-standards` §12.2, doplněno 2026-10-17). U selhání Illustratoru
to skript zaručit nemůže (otevřený bod v engine-facts), proto jen „Žádná značka
nevznikla".

Každý klíč i v angličtině; parita klíčů hlídá stávající test.

## 10. Předvolby a kompatibilita

- Nové pole `pathOffset` (v jednotkách dialogu), pravidlo jako `offsetX`
  (0–9999). Výchozí **0** v `getDefaults()`; forward-fill v `GM.Storage` ho
  doplní starým předvolbám → chovají se jako dnes, **žádné dvojí odsazení** pro
  ty, kdo si cestu posouvají ručně. Hodnota se nastaví jednou a uloží do
  předvolby.
- Zaškrtávátko části obvodu se neukládá.

## 11. Změny chování proti 1.2.0 (do CHANGELOG)

- Zaoblený roh dnes nedostane nic zvláštního (hladký prstenec od první kotvy);
  nově značka uprostřed oblouku a výplň mezi rohy.
- Tvar bez rohů dnes začíná na první kotvě; nově nahoře.
- Předvolba s cestou bez výběru: dnes tichý přechod na artboard; nově řádek
  v dialogu.
- Při D = 0 na cestě s ostrými rohy zůstává rozmístění stejné jako v 1.2.0
  (regresní test).
- Skupina, ve které je jen jedna cesta, se bere jako ta cesta; dřív Vybraná
  cesta zašedla (2026-10-17).

## 12. Data za rozhodnutími 3 a 4

- **Praxe u rohů:** výrobci bannerů popisují oko v každém rohu a zbytek
  rovnoměrně (4over4, banners.com, namebadge.com); RIPy Onyx a Caldera
  rozmisťují po stranách, Caldera i po elipse — rovnoměrně. Pravidlo „oka na
  koncích oblouku" nenašla rešerše ani uživatel v praxi.
- **Začátek nahoře:** jediný konkrétní případ z praxe (kruhové cedule) dává
  první díru doprostřed nahoru, aby cedule nevisela nakřivo. Začátek nahoře je
  souměrný podle svislé osy pro každý počet; začátek na kotvě vlevo jen pro
  sudý. Odsazená cesta má navíc vlastní kotvy (§6.2), takže „první kotva" by
  nebyla kotvou operátora.

## 13. Architektura a testy

| modul | nové | test |
|---|---|---|
| `GM.Core` | rozpoznání zaoblených rohů, rohové body linky ok, nejvyšší bod, běhy části obvodu a přenos konců běhu na linku ok, kontrola §7 | Node: zaoblený obdélník R > D i R ≤ D, půlkruh (oblouk = strana), štít, hvězda, kruh; kontrola s originálem místo linky ok (pruh) a se dvěma smyčkami |
| `GM.Illustrator` | `offsetPath` (§6.1), čtení přímého výběru | falešný adaptér v Node; harness v Illustratoru: tvary z §6.2, Large Canvas, jeden krok Zpět |
| `GM.Main.process` | průběh §9 | `test_main_process` s falešným adaptérem |
| `GM.UI` | šedý řádek, panel Cesta, zaškrtávátko | `test_ui_dialog` (stavy §8.2), headless výška |
| `GM.L` | klíče §8, §9.1, skloňování | parita CS/EN |

Regrese: pozice v režimu artboardu a v režimu cesty při D = 0 na cestě
s ostrými rohy beze změny (stávající sady).

## 14. Co změřit před implementací

- Čistá kopie přes `setEntirePath` + úchyty: zachová geometrii živých rohů
  a ignoruje vzhled originálu.
- `ofst` v dokumentu Large Canvas: D v jednotkách dokumentu.
- Co hlásí Přímý výběr při kliknutí přímo na zakřivený úsek.
- Výsledek na vnitřním rohu (§5.5).
- Výšku dialogu a šířku šedého řádku headless.
- Oblouky z úseček v klientském PDF (§4): jak často a jak vypadají.

Stav 2026-10-13: změřeno je první, druhé, čtvrté a páté (kopie bod po bodu
v §6.1, Large Canvas v `docs/extendscript-engine-facts.md` M2, vnitřní roh
v §5.5, výška a šířka řádku v §8.3).
Otevřené zůstává kliknutí přímo na zakřivený úsek (ruční test J10) a oblouky
z úseček v klientském PDF.
Stav 2026-10-17: kliknutí přímo na zakřivený úsek změřil ruční test J10 —
chová se jako výběr obou koncových kotev úseku (engine-facts). Otevřené
zůstávají oblouky z úseček v klientském PDF.

## 15. Pořadí prací

1. `GM.Core`: zaoblené rohy, nejvyšší bod, kontrola — Node testy.
2. `GM.Illustrator.offsetPath` + měření §14 + harness.
3. `GM.Main.process` — průběh §9.
4. Dialog §8 — Node testy stavů, headless výška.
5. Část obvodu §5.4.
6. README, manual-test (nová sekce), CHANGELOG 1.3.0, engine-facts (§6.2,
   §6.3). Vydání přes `releasing-a-tool`.

Práce běží na větvi `feat/grommet-marks-path-mode` v odděleném worktree;
pracovní kopie v `~/Dev` zůstává na `main`, kde souběžně vzniká tile-export.
