# Audit UI, UX a textů — batch-relink-export

Datum: 2026-09-28. Rozsah: dialog, tok běhu a texty `batch-relink-export` ve
stavu `main` (fc698a1), tedy s opravami critical a major z
[code review 2026-09-27](2026-09-27-code-review-batch-relink-export.md)
a se zastavením dávky klávesou Esc. Kontext: nástroj relinkuje stránky PDF do
šablony vyřazení a exportuje tiskové archy; používají ho operátoři prepressu
pod časovým tlakem a chyba znamená zkažený tisk nebo řez. Frekvenci použití
zadání neuvádí — audit počítá s častým použitím. UI je česky s anglickou
verzí, repo je veřejné, cílová platforma je macOS (README).

Audit je jen prověrka stavu — v kódu se nic neměnilo. Nález je zapsaný jen tam,
kde jde popsat konkrétní situaci, ve které operátorovi škodí; stylová volba bez
praktického dopadu je označená jako preference. Cesty jsou relativní
k `batch-relink-export/`.

## Metoda

- Přečtené `src/ui.js`, `src/locale.js`, `src/main.js`, `src/config.js` a hlášky
  v `src/core.js`.
- Měření v Illustratoru 30.8.2 (cs_CZ) přes `tools/ai-eval.sh`, **bez zobrazení
  oken**: sestavený skript z `main`, `show()` přepsané na instanci okna, dialogy
  vyplněné skriptem. Běh na reálné zakázce z `~/Desktop/batch-export-test`
  (výstup do dočasné složky, uživatelova `vystup` se nezměnila) a na testovacích
  šablonách. U každého okna se změřila velikost, u každého popisku, tlačítka
  a zaškrtávátka přirozená šířka textu proti šířce, kterou dostane, a pořadí
  ovladatelných prvků. Anglické texty se změřily zvlášť proti pevným šířkám.
- Živý dialog se neotvíral; focus a chování Enteru nejde bez něj změřit — viz
  „Neověřeno".

**Závažnost:** problém / drobnost / preference.
**Jistota:** *ověřeno z kódu*, *ověřeno měřením*, *odhad bez spuštění*.

## 1. Verdikty

1. **UI — problém.** Rozvržení, pořadí, šířky i klávesnice jsou v pořádku
   a nic se neořízne česky ani anglicky; dialog si ale nepamatuje nic, takže
   každý běh znamená tři výběry složek, vzor a preset — a výchozí preset nikdy
   není ten, který dílna používá.
2. **Vstupy a validace — drobnosti.** Číselná pole nástroj nemá (desetinná
   čárka, jednotky a rozsahy se ho netýkají); cesty a vzor se kontrolují až po
   Spustit, každá chyba ukončí skript a prázdné pole Výstup skončí matoucím
   dotazem na vytvoření složky.
3. **UX tok — drobnosti.** Náhled jen při nesrovnalostech, průběh po souborech
   se zastavením Esc a souhrn s počty i detaily fungují; chybí odezva před
   prvním oknem, souhrn se po zavření ztratí a po zastavení tvrdí „Vše proběhlo
   bez chyb".
4. **Texty — drobnosti.** Hlášky z oprav říkají co, proč a co udělat; starší
   hlášky používají žargon (relink, PlacedItem, placeholder) nebo surovou
   anglickou chybu a dvanáct hlášek skloňuje čísla špatně.

## 2. Nálezy

| ID | Místo | Co | Praktický dopad | Závažnost | Jistota |
|---|---|---|---|---|---|
| A1 | `src/ui.js:20–259` (dialog nic nenačítá ani neukládá) | Dialog si nepamatuje šablonu, zdroj, výstup, vzor, preset ani volby | Každý běh tři procházení složek, přepsání vzoru a výběr presetu; při častém použití minuty denně a riziko, že operátor ve spěchu sáhne po šabloně nebo výstupní složce minulé zakázky | problém | ověřeno z kódu |
| A2 | `src/config.js:29`, `src/ui.js:104–123` | Výchozí preset je česky `[Tisková kvalita]`, anglicky `[High Quality Print]`; vlastní presety dílny (v této instalaci čtyři pass4press) se musí vybírat při každém běhu | Operátor ve spěchu nechá výchozí a archy odejdou v jiném PDF, než dílna do tisku posílá (převod barev, standard PDF) | problém | výchozí volba ověřena měřením (review), dopad odhad |
| A3 | `src/ui.js:176–233` | Cesty a vzor se kontrolují až po Spustit; každá chyba zobrazí hlášku a skript skončí | Chybějící `{n}`, výstup = zdroj nebo překlep v cestě znamená spustit skript znovu a vyplnit všechno (A1) | drobnost | ověřeno z kódu |
| A4 | `src/ui.js:181`, `:202–211`; `src/locale.js:132–133` | Prázdné pole Výstup vede na „Výstupní složka neexistuje. Vytvořit?" a po Ano „Nepodařilo se vytvořit výstupní složku." (skript zkouší `/tmp00000001` v kořeni disku) | Dvě matoucí hlášky místo „vyberte výstupní složku"; operátor hledá chybu v právech nebo disku | drobnost | cesta ověřena měřením (review), vytvoření nespuštěno |
| A5 | `src/ui.js:352–358`, `:368–370` | V náhledu je prvním ovladatelným prvkem víceřádkové pole s detaily | Stojí-li na něm po otevření focus, Enter nemusí spustit Pokračovat a operátor to vezme jako zaseknutí | drobnost | odhad bez spuštění |
| A6 | `src/main.js:20–39` | Mezi Spustit a prvním oknem (otevření šablony, sken zdrojů) se nic neukazuje | Běžně asi sekunda; u PDF s komprimovanými tabulkami až ~2 s na soubor, u desítek takových souborů desítky sekund bez odezvy — operátor může Illustrator ukončit | drobnost | čas na soubor ověřen měřením, počty odhad |
| A7 | `src/ui.js:489–505` | Po zastavení Esc souhrn napíše „Zrušeno uživatelem…" a pod tím „Vše proběhlo bez chyb." | Operátor čte „vše proběhlo" a přehlédne, že dávka není celá | drobnost | ověřeno měřením |
| A8 | `src/ui.js:456–513`, `src/main.js:246` | Souhrn se nikam neukládá | Po zavření okna už nejde zjistit, který arch byl blokovaný, přeskočený nebo potřebuje ruční úpravu | drobnost | ověřeno z kódu |
| A9 | `src/locale.js:146`, `:198–199`, `:203`, `:209–211`, `:214`, `:231` | Čísla se neskloňují: „4 pozic", „2 souborů", „2 stran", „2 pozic navíc" | Hlášky se hůř čtou a působí neúhledně; k chybnému rozhodnutí nevedou | drobnost | ověřeno měřením (zachycené texty) |
| A10 | `src/locale.js:130`, `:138`, `:145`, `:129`; `src/main.js:26`, `:227`, `:254` | „Neplatná šablona AI." pro chybějící soubor, špatnou příponu i chybu otevření; „…k relinkování"; „placeholder {n}" u pole, které se jmenuje „Vzor"; holá anglická hláška Illustratoru; „(line N)" | Operátor neví, co opravit, u surové hlášky ani jestli je chyba v šabloně, nebo ve zdroji | drobnost | ověřeno z kódu |
| A11 | `src/locale.js:143`, `src/core.js:201` | „PlacedItem na skryté vrstvě přeskočen: item_3" | Vývojářský žargon; nepojmenovanou pozici „item_3" v dokumentu nenajde | drobnost | ověřeno z kódu |
| A12 | `src/locale.js:212` | „Počet stran nelze zjistit — relinkne se vše bez odebrání" neříká riziko ani co ověřit | U poškozeného nebo šifrovaného PDF s víc stranami než pozic se přebytek tiše ztratí (po B3 vzácné) | drobnost | ověřeno z kódu |
| A13 | `src/locale.js:162`, `:152–153`, `:160`, `:183`, `:185`, `:188`; `src/config.js:9`, `:43` | Anglické „PDF Preset" a „relinkovat" v české UI; „arch" a „soubor" pro tutéž jednotku; titulek okna anglicky, český `TITLE` nepoužitý; panel „1 · Vstupní soubory" obsahuje Výstup; nápovědy Zdroj, Výstup a Preset jen opakují popisek | bez praktického dopadu | preference | ověřeno z kódu |

## 3. Neověřeno

Vyžaduje živý dialog:

- kam skočí focus po otevření hlavního dialogu a náhledu, a jestli Enter
  v náhledu spustí Pokračovat (A5);
- jestli filtr `*.ai` v `File.openDialog` na macOS opravdu skryje jiné soubory
  (`src/ui.js:567`); když ne, špatný výběr zachytí až validace;
- vzhled znaků ● · × — … mimo macOS (README cílí jen na macOS).

## 4. Co je dobře a nemá se rozbít

- Pořadí úlohy: soubory → pojmenování a formát → volby → tlačítka; tabulátor jde
  stejně (změřeno), Storno vlevo, Spustit vpravo, Enter/Esc přes
  `name: "ok"` / `"cancel"`.
- Nic se neořízne česky ani anglicky; hlavní dialog měří 460 × 478 px, největší
  okno 554 × 478 px — vejde se i na malý displej.
- Živý náhled názvu výstupu a viditelná legenda `{n}` · `{template}` · `{source}`.
- Náhled jen při nesrovnalostech; když nejde nic zpracovat, Pokračovat je
  vypnuté a dialog řekne proč; verdikt počítá archy s upozorněním zvlášť (T2);
  u každého souboru řádek s počtem stran.
- Paleta průběhu: soubor, pořadí, ukazatel a návod k zastavení; Esc dokončí
  rozpracovaný soubor (ověřil uživatel).
- Souhrn: počty s chybami červeně, detaily s názvy výstupů, počet zpracovaných
  po zastavení; „Po dokončení otevřít výstupní složku" je zapnuté.
- Hlášky z oprav (`ERR_PAGE_SIZE`, `ERR_OUTPUT_IS_SOURCE`, `WARN_PAGE_MAP`,
  `LOG_MANUAL`, `LOG_REDONE`) říkají co, proč a co udělat.
- Konzistentní vykání; kódování UTF-8, dist s BOM, čeština v ScriptUI na macOS
  změřeně v pořádku.
- Běh nemění žádný otevřený dokument ani šablonu — není co vracet přes Zpět;
  chyba jednoho archu nezastaví ostatní.

## 5. Doporučené změny — top 5 podle poměru přínosu k práci

1. **A1 + A2 — pamatovat poslední nastavení** (šablona, výstupní složka, vzor,
   preset, „Otevřít složku"; zdroj se mění s každou zakázkou a „Přeskočit
   existující" záměrně ne). Největší úspora času a zároveň konec rizika
   výchozího presetu. Vzor ukládání mají GM a ZSM (`storage.js`,
   `docs/persistence.md`). Beze změny textů.
2. **A10–A12 — hlášky, které říkají, co udělat.**
   - `ERR_TEMPLATE`: „Neplatná šablona AI." → „Šablona se nenašla nebo nemá
     příponu .ai. Vyberte ji tlačítkem Vybrat…"
   - `ERR_NAMING_PATTERN`: „Vzor pojmenování musí obsahovat placeholder {n}." →
     „Vzor musí obsahovat {n} (pořadí archu), jinak by se výstupy přepisovaly."
   - `ERR_HIDDEN_LAYER`: „PlacedItem na skryté vrstvě přeskočen: %s" →
     „Pozice na skryté vrstvě se nepřelinkovala (netiskne se): %s"
   - `ERR_NO_RELINK`: „Žádný propojený PDF objekt nebyl nalezen k relinkování." →
     „Žádnou pozici šablony se nepodařilo přelinkovat — arch se nevyexportoval."
   - `SCAN_FILE_UNREAD`: „%s: počet stran nelze zjistit — relinkne se vše bez
     odebrání." → „%s: počet stran nejde zjistit (poškozené nebo šifrované PDF?).
     Ověřte, že nemá víc stran než pozic — přebytek by se ztratil."
3. **A9 — čísla bez skloňování** přeformulováním, bez nové logiky:
   - `PREVIEW_TEMPLATE`: „Šablona: %s (%s pozic)" → „Šablona: %s · pozic: %s"
   - `PREVIEW_SOURCE`: „Zdrojové PDF: %s souborů" → „Zdrojových PDF: %s"
   - `SCAN_FILE_PARTIAL`: „%s: %s stran — %s pozic navíc se z archu odebere." →
     „%s: stran %s, pozic navíc %s — odeberou se z archu."
   - `LOG_MANUAL`: „%s pozic navíc se nepodařilo odebrat…" → „Pozic navíc, které
     se nepodařilo odebrat: %s. Ukazují znovu stranu 1 — před tiskem je
     odstraňte ručně."
   - stejně `SCAN_HEADER`, `SCAN_FILE_OVER`, `SCAN_FILE_UNDER`, `ERR_OVER_PAGES`
     a `ERR_RELINK_FAILED`.
4. **A7 — souhrn po zastavení** bez „Vše proběhlo bez chyb." (text se ukáže jen
   u celé dávky). Beze změny textů.
5. **A3 + A4 — kontrola před zavřením dialogu.** Chyba nechá dialog otevřený
   s vyplněnými poli; prázdné pole dostane vlastní hlášku:
   - nová `ERR_OUTPUT_EMPTY`: „Vyberte výstupní složku." (a obdobně pro šablonu
     a zdroj).

## 6. Naměřeno

Illustrator 30.8.2, cs_CZ, macOS; okna sestavená a rozvržená bez zobrazení
(`w.layout.layout(true)`).

| okno | velikost obsahu |
|---|---|
| hlavní dialog | 460 × 478 px |
| náhled (reálná zakázka, 1 upozornění) | 554 × 474 px |
| náhled (2 soubory, 1 upozornění) | 554 × 429 px |
| paleta průběhu | 480 × 97 px |
| souhrn bez chyb | 258 × 181 px |
| souhrn se všemi řádky, zastavením a logem | 554 × 436 px |

Přirozená šířka textu proti přidělené šířce: česky se neořízne žádný popisek,
tlačítko ani zaškrtávátko. Anglicky také ne; nejtěsnější je legenda vzoru
(278 z 284 px) a „Needs manual cleanup" (132 ze 150 px).

Pořadí ovladatelných prvků v hlavním dialogu: šablona, Vybrat…, zdroj, Vybrat…,
výstup, Vybrat…, vzor, preset, Přeskočit existující, Otevřít složku, Storno,
Spustit. V náhledu: pole s detaily, Storno, Pokračovat.
