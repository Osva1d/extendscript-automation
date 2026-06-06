# Manuální test plán — Zünd & Summa Marks (deploy gate)

> **Jediný** manuální test plán. Když projdou všechny **P0** body, je build připravený k deployi.
> **Testovací dokument:** reálná **Forex deska 1560 × 3050 mm** (běžný use case).
> Pozn.: 3050 mm < 5765 mm (limit Illustratoru) → **reálná velikost, scaleFactor = 1**,
> žádné Large Canvas ani měřítko 1:N (to je sekundární use case, sekce H).

Legenda: `[ ]` krok · ✅ PASS · ❌ FAIL signál · ⚠️ riziko

---

## Příprava

```
[✅] Illustrator CC 2024+ (CZ nebo EN locale)
[✅] Nový dokument: 1560 × 3050 mm, CMYK, jednotky mm
[✅] Vrstva "Layer 1" / "Vrstva 1": nakreslit obdélník ~1500 × 3000 mm (grafika)
[✅] Swatches panel: vytvořit přímou barvu (Spot) "Cut"; pár cest obarvit "Cut"
[✅] Window > Layers a Window > Swatches otevřené (budeš ověřovat)
[✅] Spouštět PŘESNĚ tento soubor (ne starou nainstalovanou kopii):
    Soubor → Skripty → Jiný skript… →
    …/Sandbox/_incubator/zund-summa-marks/dist/illustrator-zund-summa-marks.jsx
[✅] (volitelně čistý start) smazat ~/Library/Application Support/ZSM/settings.json
```

---

## P0 — musí projít pro deploy

### A — Základní generování na Forex desce
```
[✅] ZUND, "Dle výběru (Auto-fit)", vyber grafiku, Generovat
    ✅ rohové kruhové značky φ5 mm + orientační značka u levého dolního rohu
    ✅ artboard se přizpůsobil grafice + mezerám
    ✅ značky ve vrstvě Regmarks / sublayer "Zünd"
[✅] SUMMA, Generovat
    ✅ čtvercové značky (3 mm) + OPOS bar pod grafikou
    ✅ se zapnutým "Přidat ořezové linky" → červené linky na hranicích archu
       (v samostatné top-level vrstvě "Trim")
[✅] "Dle Artboardu (Fixed)", Generovat → značky UVNITŘ artboardu, artboard beze změny
[✅] Spusť ZUND, pak SUMMA na stejný dok → oba sety koexistují (Regmarks/Zünd + /Summa)
```

### B — Rozteč / interpolace (klíčové na dlouhé 3050 hraně)
```
[✅] ZUND, Rozteč značek = 400 mm, Generovat
    ✅ na 3050 mm hraně je mezi rohy ~7 mezilehlých značek (ceil(3050/400)−1)
    ✅ na 1560 mm hraně ~3 mezilehlé (ceil(1560/400)−1)
    ✅ rozmístění je rovnoměrné (značky leží na hraně)
[✅] Rozteč = 5000 mm → žádné mezilehlé (jen rohy)
```

### C — Barvy + registrace  (oprava canonColor / CZ locale)
```
[✅] Otevři skript s presetem [Výchozí], barva značek [Registrační]
    ✅ u [Výchozí] NENÍ hvězdička "*" hned po otevření (bez úprav)   ← CZ AI fix
[✅] Generovat → značky v registrační barvě (overprint, čte se na všech separacích)
[✅] Nastav vlastní spot barvu značek → Generovat → značky v té barvě
[✅] Preset z jiného dokumentu odkazující na neexistující barvu:
    ✅ dropdown ukáže "Název (chybí)"
    ✅ Generovat → značky v [Registrační] + "UPOZORNĚNÍ:", ŽÁDNÝ nový magenta swatch
```

### D — Mapování vrstev k barvám
```
[✅] Řádek {Vrstva: "Cut", Barva: "Cut"}, Generovat
    ✅ vrstva "Cut" vytvořena (pokud nebyla), Cut-obarvené cesty do ní přesunuty
[✅] W1: namapuj vrstvu, která po přesunu skončí dole (např. "Cut")
    ✅ NEPŘEjmenuje se na "Graphics"
[✅] W3: přidej řádek, zvol barvu, nech PRÁZDNÝ název, Generovat
    ✅ chyba "Řádek vrstvy má barvu… ale nemá název" (ne tiché zahození)
```

### E — Pouze značky (Phase 3, nová feature)
```
[✅] Dok s UŽ separovanými vrstvami (Cut, Kiss-cut… s obsahem)
[✅] Zaškrtni "Pouze značky (neměnit vrstvy)"
    ✅ mapovací tabulka pod tím ZAŠEDNE
[❌] Generovat
    ✅ přidají se POUZE značky (Regmarks)
    ✅ existující vrstvy BEZE ZMĚNY — žádný přesun cest, žádné přejmenování
    ✅ (SUMMA) ořezové linky v SAMOSTATNÉ top-level vrstvě "Trim"
       (ne v Regmarks, ne v cut/uživatelských vrstvách)
 BUG: V suma režimu se trim přida do vrstvy Regmarks a to je chyba kolidovalo by to s načtením značek, musí být mimo regmarks i cut.
```

### F — Presety + Revert
```
[x] Uložit jako… "Test" → objeví se v dropdownu
[x] Změň hodnotu (Rozteč 400→500)
    ✅ "Test *" + ↺ Revert AKTIVNÍ + Uložit AKTIVNÍ
[x] Klikni ↺ Revert → hodnoty zpět na uložené, "*" zmizí, ↺ a Uložit zašednou
[ ] Změň + Uložit → přepíše Test (bez "*")
[x] Smazat → potvrzovací dialog → po OK preset zmizí
[x] Tovární hodnoty: vyber [Výchozí] v dropdownu → načtou se výchozí hodnoty
[x] (Reset tlačítko NEEXISTUJE — footer je jen Storno + Generovat)
```

### G — Validace + zotavení (kritický fix, Reset odstraněn)
```
[✅] Zadej neplatnou Rozteč (99999), Generovat
    ✅ pole červené + tlačítko Generovat VYPNUTÉ
[✅] Přepiš na platnou (500)
    ✅ červená ZMIZÍ + Generovat se ZAPNE
[✅] Znovu zadej neplatnou → pak ↺ Revert NEBO přepni preset
    ✅ ZOTAVÍ se: červená pryč, Generovat zapnutý   ← klíčové (Reset už není)
[ ] Vymaž pole úplně → Generovat vypnutý
```

---

## P1 — důležité, ne blokující deploy

### H — Měřítko 1:N (sekundární use case — zmenšené doky)
`✅] Menší dok reprezentující velký formát (např. 500×500 mm = 5000×5000 reality)
[ ✅ "Pracovat v měřítku", 1: 10; zadávej REÁLNÉ mm (značky 5, rozteč 400)
    ✅ titulek dialogu "… — 1:10"
    ✅ značky vykresleny v 1/10 (0,5 mm), pozice odpovídají
[✅] Odškrtni měřítko → značky zpět v zadané velikosti (1:1)
```

### I — Persistence + jazyk
```
[✅] Ulož preset, zavři skript, otevři → preset tam je
[✅] Změň bez uložení, zavři, otevři → [Last Settings] obnoví poslední běh
[?] CZ locale → české texty; EN locale → anglické
```

### J — Geometrie a přesnost (na malém obdélníku, kvůli přesným číslům)
```
[✅] Obdélník 100×100 mm, ZUND Auto-fit, Mezera grafiky 10, Mezera okraje 0, Zünd 5, Orient 100
    ✅ artboard ~130×130 mm  (polovina šířky = 50 + 12,5 + 2,5 = 65 → W 130)
    ✅ 5 značek (4 rohy + orient), žádné mezilehlé (hrana < rozteč)
[✅] Obdélník 600×100 mm, Rozteč 200
    ✅ na 600 mm hraně 3 mezilehlé rovnoměrně  (ceil(625/200)=4 segmenty → 3)
[✅] SUMMA, obdélník 100×100, Feed Top 70 / Bot 50, Summa 3
    ✅ OPOS bar 11,5 mm pod grafikou, tloušťka 3 mm
    ✅ výška artboardu ~246 mm  (100 + 83 + 63)
[✅] Orient. offset 200 na malé grafice → artboard se rozšíří tak, aby orient značku obsáhl
```

### K — Edge cases / robustnost
```
[✅] Zamčená vrstva → skript ji odemkne, vykreslí, zamkne zpět; skrytá vrstva zůstane skrytá
[✅] Clipping maska (group s maskou, vnitřek větší) → bounds podle MASKY, ne obsahu;
    cesty uvnitř clip group se nepřesouvají (movePaths je vynechá)
[✅] Přepnutí ZUND ↔ SUMMA → zadané hodnoty zachovány (přes [Last Settings])
[✅] Žádný dokument → "Není otevřený dokument"; Auto-fit bez výběru → "Nic není vybráno"
[✅] Skript NIKDY nemaže/needituje grafiku — jen přidává značky (+ volitelně přesun cest)
[✅] Čárka jako desetinný oddělovač (např. 10,5) → akceptováno (normalizace na tečku)
[✅] Velmi velký dok blízko limitu → buď vykreslí, nebo srozumitelná chyba (ne pád)
```

---

## Pokud něco selže

| Symptom | Pravděpodobná příčina | Co nahlásit |
|---|---|---|
| "*" u [Výchozí] bez úprav | registrační normalizace | CZ/EN locale, název reg swatche |
| Pole zůstane červené / Generovat vypnutý | validace/zotavení | posloupnost akcí |
| Vznikl magenta swatch | getCol fallback | název barvy, dok |
| Vrstva přejmenována na Graphics | §7 rename guard (W1) | která vrstva, byla mapovaná?, pořadí vrstev |
| Špatná velikost/pozice značek | geometrie/scaleN | hodnoty + naměřeno |
| Skript spadl | C++ pipeline | Layers panel + posloupnost |

---

## Deploy sign-off

```
Datum: __________   Illustrator: __________   Locale: CZ / EN

P0:  A [✅]  B [✅]  C [✅]  D [✅]  E [ ]  F [✅]  G [✅]
P1:  H [✅]  I [✅]  J [✅]  K [✅]

[⚠️] Všechny P0 PASS

Před deployem:
[ ] verze sjednocena (package.json = src/config.js) a bumpnuta (marks-only = minor → 26.5.0)
[ ] npm test (12/12+ suites) zelené
[ ] bash tools/build.sh — dist přebudován
[ ] dist zkopírován do Projects/extendscript-automation/Scripts/
[ ] (volitelně) git tag

Verdikt: [✅] DEPLOY   [⚠️] BLOKOVÁNO — poznámky: E BUG: V suma režimu se trim přida do vrstvy Regmarks a to je chyba kolidovalo by to s načtením značek, musí být mimo regmarks i cut.
```
