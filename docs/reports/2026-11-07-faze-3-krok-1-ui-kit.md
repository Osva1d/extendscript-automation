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

## Co čeká na měření [O]

Illustrator měl otevřený dokument, sonda se proto nespustila. Spustí se, až bude
Illustrator bez dokumentů:

```
node tools/ui-probe/build-probe.js ui-kit
tools/ai-eval.sh -t 120 "<vytištěná cesta>"
node tools/ui-probe/build-probe.js --report ui-kit
```

Předpoklady, které sonda potvrdí nebo vyvrátí:

1. Pole všech druhů řádků v jednom panelu začínají na stejném x (osa + nativní mezera 10).
2. Zaškrtávátko v `checkRow` začíná na téže ose; prázdný popisek zamčený na šířku osy drží.
3. Jednotka stojí 5 px za polem; pole 7 znaků má 72 px.
4. `Vybrat…` je nejvýš 90 px a cesta bere zbytek řádku; konce cesty, vzoru a seznamu
   jsou na jedné hraně.
5. Stavový řádek založený s mezerou má výšku jednoho řádku a dlouhý text ho nezvětší.
6. Patička: autor vlevo, tlačítka u pravého okraje, žádné tlačítko širší než nativní.
7. Popisek přepínačů stojí v jedné výšce s textem tlačítek.

Okem obsluhy se kit ověří až v kroku 2 na BRE; samostatný ruční test krok 1 nemá, protože
nic nezobrazuje.
