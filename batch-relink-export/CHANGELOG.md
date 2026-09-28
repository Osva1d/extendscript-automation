# Changelog

Všechny podstatné změny skriptu Batch Relink & Export. Formát vychází z
[Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování dle
[SemVer](https://semver.org/lang/cs/).

## [Nevydáno]

### Přidáno

- **Dialog si pamatuje poslední nastavení (A1, A2 z auditu UI 2026-09-28).**
  Šablona, výstupní složka, vzor, PDF preset a „Po dokončení otevřít výstupní
  složku" se předvyplní z minulého běhu; uloží se po Spustit, když dialog
  projde kontrolou. Konec výběru presetu při každém běhu — výchozí preset
  podle jazyka Illustratoru (`[Tisková kvalita]` / `[High Quality Print]`)
  platí jen do první volby. Zdrojová složka se mění se zakázkou a „Přeskočit
  existující" je rozhodnutí pro jeden běh, proto se nepamatují. Nastavení je
  v `~/Library/Application Support/batch-relink-export/settings.json`.

### Změněno

- Sjednocen slovník tlačítek se zbytkem sady: **Storno** nyní znamená *zrušit
  dialog* (dříve „Zrušit“). Totéž slovo dosud znamenalo v tomto skriptu i
  zastavení běžícího zpracování — to se teď dělá klávesou Esc (viz Opraveno).
- **Výchozí vzor názvu nese i název zdroje (B8):** `{n}_{template}_{source}`
  místo `{n}_{template}`. Dosavadní vzor dával archům dvou zakázek se stejnou
  šablonou stejná jména, takže se ve výstupní složce přepisovaly nebo
  přeskakovaly. Kratší názvy dá vzor v dialogu přepsat jako dřív.

### Opraveno

Opravy z code review 2026-09-27
([report](../docs/reports/2026-09-27-code-review-batch-relink-export.md)).

- **Zamčená podvrstva už nezastaví dávku (B7).** Skript odemykal jen vrstvy
  nejvyšší úrovně. Pozici v zamčené podvrstvě se nepodařilo přelinkovat
  („Target layer cannot be modified") a každý arch skončil chybou. Teď odemyká
  i podvrstvy.
- **Šablona s nedostupným původním PDF se zpracuje (B6).** Když se PDF, ze
  kterého šablona vznikla, přesunulo nebo smazalo, skončil každý arch hláškou
  „There is no file associated with this item". Pozice s chybějícím odkazem se
  teď přelinkují jako ostatní.
- **Logo ani skrytá pozice už nejsou pozicí (B4).** Skript přelinkoval každý
  propojený objekt v šabloně: propojené logo nebo značky se na každém archu
  změnily na stranu 1 zakázky. Do počtu pozic navíc započítal i objekty na
  skryté vrstvě, takže zdroj s o stranu delším PDF prošel jako „v pořádku"
  a poslední strana se tiše ztratila. Pozice jsou teď jen viditelné objekty
  propojené na soubor, na který odkazuje většina z nich; stejnou definici
  používá počet pozic v náhledu, relink i kontrola pozic navíc.
- **Neuložené změny otevřené šablony už nezmění počet pozic (B5).** Když byla
  šablona otevřená s neuloženými změnami, počítal skript pozice z otevřeného
  dokumentu, ale archy stavěl ze souboru na disku. S dvěma přidanými
  neuloženými pozicemi prošel desetistránkový zdroj jako „v pořádku" a strany
  9–10 se tiše ztratily. Pozice se teď počítají ze šablony uložené na disku
  (z dočasné kopie, otevřený dokument zůstane beze změny).
- **Zdroj jiného formátu už neprojde (B1).** Illustrator při relinku na stranu
  jiného rozměru nehlásí chybu: zachová střed pozice a stranu přeškáluje. PDF
  se spadávkou v ploše stránky a bez TrimBoxu tak vyšlo zmenšené na 93,6 %
  se spadávkou v řezu, PDF 110 × 60 mm v šabloně 100 × 70 mm přeškálované —
  a obojí jako „v pořádku". Ověření relinku teď porovná rozměr strany před
  relinkem a po něm (tolerance 0,1 mm) a arch jiného formátu nevyexportuje,
  s hláškou, která oba rozměry uvede.
- **Neúplný arch se vyčistí sám (B2, T1).** Pozice, pro které zdroj nemá
  stranu, ukázaly znovu stranu 1 — a arch se uložil pod běžným jménem, jen
  s řádkem „odeber ručně" v souhrnu. Automatické odebírání se nespustilo nikdy:
  stálo na vlastnosti `PlacedItem.pageNumber`, kterou Illustrator vůbec nemá.
  Náhled přitom u „Méně stran uprostřed dávky" sliboval, že se pozice odeberou.
  Skript teď stranu každé pozice zjistí přes dočasné pomocné PDF a pozice navíc
  odebere, u oříznuté pozice i s maskou. Když šablona neukazuje strany 1 až N
  každou právě jednou, zůstává dosavadní chování: arch se vyexportuje a souhrn
  řekne proč a kolik pozic odstranit ručně.
- **Počet stran se čte ze stromu stran PDF (B3).** Skript hledal v bajtech
  souboru největší číslo za „/Count" a počítal objekty stran. PDF uložené po
  smazání stran (inkrementální uložení) tak mělo pořád původní počet: prošlo
  jako „v pořádku" a pozice navíc ukázaly znovu stranu 1. U velkého PDF
  s víceúrovňovým stromem stran našel jen část počtu a přebytek stran se tiše
  ztratil. PDF 1.5+ s komprimovanými tabulkami hlásil jako nečitelné a zpracoval
  je bez ochrany proti přebytku stran; záložky a štítky stran naopak blokovaly
  správné soubory. Počet se teď čte jako v prohlížeči — z katalogu a kořene
  stromu stran, přes celý řetěz tabulek odkazů, včetně komprimovaných. Stav
  „nejednoznačný počet stran" zanikl.
- **Výstup nejde do zdrojové složky (B8).** Když byla výstupní složka stejná
  jako zdrojová, načetl další běh vlastní výstupy jako zdrojová PDF: posunulo
  se číslování archů a výstup se zpracoval jako zakázka. Dialog teď takovou
  volbu odmítne s hláškou; podsložka zdrojové složky dál projde.
- **„Přeskočit existující" přeskočí jen opravdu hotový arch (B8).** Stačilo,
  aby ve výstupní složce ležel soubor stejného jména — třeba arch jiné zakázky
  se stejnou šablonou a výchozím vzorem názvu — a arch se nevytvořil. Přeskočí
  se teď jen výstup novější než zdroj i šablona (pokračování přerušené dávky);
  starší se vytvoří znovu a souhrn to uvede.
- **Verdikt náhledu nepočítá archy s upozorněním jako „v pořádku" (T2).**
  „3 z 3 archů v pořádku" zahrnovalo i neúplný arch a PDF s nečitelným počtem
  stran. Verdikt teď říká, kolik archů lze zpracovat, kolik z nich
  s upozorněním a kolik je blokováno.
- **Dávka jde zastavit — podržením klávesy Esc.** Tlačítko v paletě průběhu
  (dříve Storno, pak Zastavit) nereagovalo: Illustrator paletě kliknutí
  během běhu skriptu nepředá, ať skript okno překresluje nebo čeká. Paleta teď
  místo tlačítka říká „Dávku zastavíte podržením klávesy Esc."; skript klávesu
  kontroluje před každým souborem i po jeho dlouhých krocích, rozpracovaný
  soubor dokončí a souhrn uvede, kolik souborů zpracoval.

Opravy z auditu UI 2026-09-28
([report](../docs/reports/2026-09-28-audit-ui-batch-relink-export.md)).

- **Souhrn zastavené dávky netvrdí, že vše proběhlo (A7).** Po zastavení
  klávesou Esc stálo pod „Zrušeno uživatelem po zpracování 1 z 3 souborů." i
  „Vše proběhlo bez chyb." — nedokončená dávka se dala přečíst jako hotová.
  Ten řádek se teď ukáže jen u celé dávky.
- **Čísla v hláškách se neskloňují chybně (A9).** Náhled a souhrn psaly
  „4 pozic", „2 souborů", „2 stran". Hlášky jsou přeformulované tak, aby
  číslo nestálo před podstatným jménem: „Šablona: T1 · pozic: 4",
  „Zdrojových PDF: 2", „a_4.pdf: stran 2, pozic navíc 2 — odeberou se
  z archu."
- **Hlášky říkají, co se stalo a co udělat (A10–A12).** „Neplatná šablona
  AI." platilo pro chybějící soubor, špatnou příponu i šablonu, kterou
  Illustrator neotevřel; teď má otevření vlastní hlášku s radou otevřít
  šablonu ručně. Chyba archu místo „Chyba při zpracování (anglická hláška)"
  říká „Arch se nevyexportoval kvůli chybě: …", neočekávaná chyba místo
  „KRITICKÁ CHYBA: … (line N)" říká, že se skript zastavil a komu hlášku
  poslat. Skrytá pozice se hlásí podle vrstvy („item_3" v dokumentu nikdo
  nenašel), bez žargonu „PlacedItem", „placeholder" a „relinkování".
  Nečitelný počet stran říká riziko a co ověřit. Anglické texty se změnily
  stejně.
- **Chyba v zadání nechá dialog otevřený (A3, A4).** Chybějící `{n}`, výstup
  do zdrojové složky nebo překlep v cestě ukončily skript a všechno se
  vyplňovalo znovu. Kontrola teď proběhne po Spustit v otevřeném dialogu
  a chyba ho nechá otevřený s vyplněnými poli; Ne u dotazu na vytvoření
  výstupní složky vrátí do dialogu. Prázdné pole má vlastní hlášku („Vyberte
  výstupní složku." místo „Výstupní složka neexistuje. Vytvořit?"). Výstupní
  složka se vytvoří až po ostatních kontrolách, takže chyba ve vzoru už po
  sobě nenechá prázdnou složku.

## [1.0.0] — 2026-06-28

První veřejné vydání (re-baseline). Sjednocení verzí napříč sadou pro open-source
release; funkčně navazuje na interní řadu v3.x (viz níže).

---

> **Poznámka k číslování.** Verze `v3.0.0` / `v2.0.0` níže patří **interní řadě**
> před veřejným vydáním — historická reference, ne veřejná řada. Veřejná řada
> začíná na 1.0.0.

## Před veřejným vydáním (interní řada)

### v3.0.0 (2026-06)
- **BREAKING:** Modulární redesign (5 modulů, namespace `BRE`, build systém).
- **BREAKING:** Výstupní pojmenování přes vzor s placeholdery `{n}` / `{template}` / `{source}` (výchozí `{n}_{template}`).
- **Added:** Session management — odemčení/obnovení zamčených vrstev i objektů.
- **Added:** Ověření relinku po každém souboru.
- **Added:** Pre-flight sken + tvrdý blok souborů s více stranami než pozic a s nejednoznačným počtem stran.
- **Added:** Hlášení „N pozic navíc — odeber ručně" u neúplného posledního archu (+ best-effort auto-mazání).
- **Added:** Přirozené (numerické) řazení zdrojů → předvídatelné číslování.
- **Added:** Náhled před zpracováním (přeskočí se u bezchybné dávky).
- **Added:** Lokalizace cs/en; copyright patička dle UI standardu.
- **Changed:** Redesign hlavního dialogu — užší popisky, pole na plnou šířku, tři číslované panely, živý náhled názvu výstupu. Mění se jen prezentační vrstva; logika beze změny.
- **Added:** Diagnostický log za `BRE.Config.debug`.
- **Fixed:** Ignorování macOS `._*` / tečkových souborů ve zdrojové složce.
- **Removed:** Impose skript (slepý vývoj).

### v2.0.0 (2026-03)
- Původní monolit — hromadné relinkování s exportem.
