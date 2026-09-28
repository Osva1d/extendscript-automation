# Changelog

Všechny podstatné změny skriptu Batch Relink & Export. Formát vychází z
[Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování dle
[SemVer](https://semver.org/lang/cs/).

## [Nevydáno]

### Změněno

- Sjednocen slovník tlačítek se zbytkem sady: **Storno** nyní znamená *zrušit
  dialog* (dříve „Zrušit“), tlačítko pro zastavení běžícího zpracování se jmenuje
  **Zastavit** (dříve „Storno“). Totéž slovo dosud znamenalo v tomto skriptu něco
  jiného než v Grommet Marks a Zünd & Summa Marks.

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
