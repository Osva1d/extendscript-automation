# Fáze 3, krok 1: sdílený UI kit

Datum: 2026-11-07. Větev `feat/shared-ui-kit`, worktree `.worktrees/shared-ui-kit`.
Plán: `docs/specs/2026-11-07-ui-design-system.md` §7 a §10.

Značky ověření: [T] Node test, [K] čtení kódu, [M] měření v Illustratoru, [V] pohled
obsluhy, [O] zatím neověřeno.

## Co se změnilo a proč

| změna | proč | řeší |
|---|---|---|
| `shared/lib/ui_kit.js`, `buildUiKit(NS)` | čtyři nástroje stavěly tytéž části čtyřikrát a rozešly se | U29 |
| `FieldPaint.PALETTES` a `FieldPaint.status()` | stav měl na světlých jasech kontrast až 1,12:1 | U14 |
| `UiKit.existingCount`, `UiKit.confirmOverwrite` | TE a BRE přepisují soubory bez dotazu | U5 (část, nástroje ho napojí v krocích 2 a 5) |
| sonda `ui-kit` v `tools/ui-probe` | rozměry kitu ověří jen Illustrator | |

Kit obsahuje: osu popisků (`lockW`, `axis`), řádky čísla, textu, cesty, seznamu,
přepínačů a zaškrtávátka, výběr hodnoty se `(chybí)`, stavový řádek, patičku s tlačítky
a dotaz před přepisem. Mezery a výšky nechává nativní, píše jen `TIGHT` 5 px mezi polem
a jednotkou a šířky z §2.5.

Odchylka od plánu: **panel předvoleb v kroku 1 není**. Přijde v kroku 3 s GM, prvním
nástrojem, který ho použije. Čtyři nástroje ukládají předvolby čtyřmi způsoby a rozhraní
navržené bez uživatele by se v kroku 3 stejně psalo znovu. Návrh §7 a §10 je upravený.

Žádný nástroj se nezměnil: kit nemá konzumenta, `field()` a `text()` ve `FieldPaint`
zůstaly beze změny a `COLORS` taky.

## Co je ověřené a čím

| tvrzení | ověřeno |
|---|---|
| všech 12 barev obou sad drží kontrast aspoň 4,5:1 na obou pozadích své strany | [T] výpočtem proti změřeným pozadím 0,196, 0,326, 0,726, 0,941 |
| `status()` vybere sadu podle jasu, kde jas přečíst nejde, použije dnešní `COLORS` | [T] |
| sady jsou čitelné ve všech čtyřech jasech | [V] specimen 2026-11-07 |
| řádky staví správné prvky v pořadí, se šířkami ze §2.5, s tipy a zapojením | [T] 68 kontrol v `shared/tests/test_ui_kit.js` |
| kit nezapisuje mezery kromě `TIGHT`, okraje ani výšky | [T] |
| `confirmOverwrite` se nezeptá, když není co přepsat, a výchozí tlačítko je `Ano` | [T] logika; tlačítka `Ne`/`Ano` a výchozí `Ano` [V] specimen |
| ES3, žádné chybějící metody, známé globály | lint celého repa a `tools/typecheck.sh` |
| sdílené testy | 7/7 suit |

## Měření v Illustratoru [M]

Sonda `node tools/ui-probe/build-probe.js ui-kit` 2026-11-07, Illustrator 30.8.2 bez
otevřených dokumentů, tmavé UI. Dialog z kitu: panel Soubory (tři cesty, vzor, seznam,
zaškrtávátko) a panel Čísla (tři čísla, přepínače, zaškrtávátko), stavový řádek, patička.
Okno se neukazuje, jen se rozvrhne.

| předpoklad | výsledek |
|---|---|
| pole všech řádků v panelu začínají na jednom x | ✓ Soubory 150, Čísla 145 |
| zaškrtávátko začíná na ose polí, prázdný popisek drží šířku osy | ✓ |
| jednotka 5 px za polem, pole 7 znaků 72 px, 4 znaky 48 px | ✓ |
| `Vybrat…` nejvýš 90 px, konec řádku cesty na hraně pole a seznamu | ✗ při prvním měření: cesta končila na 491, text a seznam na 499 px; po opravě ✓ 499, `Vybrat…` 80 px |
| stavový řádek s mezerou má jeden řádek, dlouhý text ho nezvětší | ✓ 503 × 15 před i po textu o 776 px |
| patička: autor vlevo, tlačítka u pravého okraje v nativní šířce | ✓ okraj 15 px, tlačítka 80 px |
| popisek přepínačů ve výšce tlačítek | ✓ obojí y 365 |
| žádný popisek užší než jeho text | ✓ 0 |
| `measureString("")` | 0 × 15, prázdný popisek osu nerozbije |
| okno se po zápisu stavu nezmění | ✓ 533 × 520, primární tlačítko y 478 v obou snímcích |

Oprava `Vybrat…`: tlačítko bez zarovnání dostane v řádku s `fill` podíl volného místa
a strop 90 px ho utne. Zbytek se ztratí, takže řádek skončil o 2 až 14 px dřív podle
šířky panelu. Změřené varianty jsou v engine-facts. Se zarovnáním vpravo zůstane tlačítko
nativní a pole dojde na konec řádku (commit 64887db). TE i BRE mají dnes tlačítko bez
zarovnání, takže jejich řádek cesty končí dřív. Opraví se napojením na kit v krocích 2 a 5.

Zjištění pro nástroje: osa se počítá po blocích a dva panely pod sebou s vlastní osou
mají pole posunutá o rozdíl popisků (tady 5 px). Návrh §2.5 proto říká, že panely jednoho
sloupce sdílejí jednu osu. Ověří se na GM v kroku 3.

Okem obsluhy se kit ověří v kroku 2 na BRE. Samostatný ruční test krok 1 nemá, protože
nic nezobrazuje.

## Maketa ZSM s 5 vrstvami [M]

Sonda `specimen` téhož dne: okno makety 851 × 545 px ve všech stavech (výchozí, Summa,
plno vrstev), primární tlačítko na y 503. Levý sloupec končí na 458 px, pravý na 436 px.
Odhad 545 z fáze 2 platí, návrh §3 má naměřené číslo.
