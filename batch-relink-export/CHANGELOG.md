# Changelog

Všechny podstatné změny skriptu Batch Relink & Export. Formát vychází z
[Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování dle
[SemVer](https://semver.org/lang/cs/).

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
