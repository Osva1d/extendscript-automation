# Batch Text Edit — ruční testy

Co se musí vyzkoušet rukou před vydáním a po větší změně. Čisté jádro
(proměnné, kroky, pořadí, pravidlo prvku, model dialogu, předvolby, souhrn)
kryje 15 automatických sad (`npm test` v `batch-text-edit/`). Sběr textů,
zápis, kontrolu po zápisu a dialog ověřily sondy v Illustratoru na vlastních
dokumentech (`docs/findings.md`). Tady zůstává to, co automat nevidí: jak
dialog vypadá a jak se ovládá rukou, skutečný běh ze Soubor › Skripty,
Cmd+Z a vaše vlastní soubory.

---

## 0. Příprava

- Testovací build: `~/Dev/extendscript-automation/batch-text-edit/dist/illustrator-batch-text-edit-1.0.0a-test.jsx`,
  SHA-256 `8e40153fd8f959c615cb8e406e8fbe00cf90d26de5782a2f3b16b712ede6d12b`.
- Spouštět přes **Soubor › Skripty › Jiný skript…** (tak se skript bude
  spouštět i v provozu).
- Testovat na **kopiích** tří souborů ze sondy 2026-10-29 (240 samolepek,
  texty `{NORDIC CZ}` a `{n}`):

  | soubor | struktura |
  |---|---|
  | `Zund_Summa_Test_geoup.ai` | samolepka = skupina |
  | `Zund_Summa_Test_geoup arch.ai` | samolepky navíc ve skupinách po 12 (aršíky 3 × 4) |
  | `Zund_Summa_Test.ai` | bez skupin |

- Log technických chyb: `~/Library/Application Support/batch-text-edit/bte.log`
  (vzniká jen při zastaveném zápisu nebo neočekávané chybě).

Do sloupce ✓/✗ zapisujte výsledek, do poznámky co bylo jinak.

---

## 1. Dialog

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 1.1 | Otevřít `…geoup.ai`, nic nevybrat, spustit skript | Dialog „Batch Text Edit v1.0.0“, Rozsah **Celý dokument**, řádek „240 prvků, 480 textů“. Žádný useknutý text, okno se vejde na obrazovku. Patička „© 2025–2026 Ladislav Osvald · v1.0.0“ | |
| 1.2 | Podívat se na předvolbu | „[Výchozí]“ **bez hvězdičky**, ↺ a Uložit šedé | |
| 1.3 | V editoru kroku rozbalit **Kde** | `{NORDIC CZ}   (240×)` a `{n}   (240×)`, pod čarou „První číslo v prvku“, „Jiný text…“, „Regulární výraz…“ | |
| 1.4 | Najet myší na pole a tlačítka | Každý ovládací prvek má nápovědu (helpTip), nejvýš dvě věty | |
| 1.5 | Esc | Dialog se zavře, dokument beze změny | |

## 2. Hlavní běh (soubor se skupinami)

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 2.1 | Krok 1: Typ Nahradit, Najít `{NORDIC CZ}`, Nahradit „SNB CZ“. **+** → krok 2: Typ Číslovat, Kde `{n}`, Od 1, Číslic 3 | Náhled: řádek 1 „{NORDIC CZ} \| {n}“ → „SNB CZ \| 001“, poslední řádek „… 240“. Stavový řádek ✓ „Změní se 240 z 240 prvků.“ | |
| 2.2 | Vybrat v seznamu krok 1 | Prostřední sloupec „Po vybraném kroku“ ukazuje stav po kroku 1 („SNB CZ \| {n}“) | |
| 2.3 | **Použít** | Souhrn „Výsledek úprav“: Změněné prvky 240, Změněné texty 480, Neshoda po zápisu 0. V dokumentu 001 vlevo nahoře, čísla po řádcích do 240 vpravo dole | |
| 2.4 | Prohlédnout několik samolepek zblízka | Písmo, velikost a barva kódu i čísla **beze změny**, logo a kruh nedotčené | |
| 2.5 | **Jednou Cmd+Z** | Všech 480 textů zpět na `{NORDIC CZ}` a `{n}` (jeden krok Zpět vrátí celý běh) | |

## 3. Struktura dokumentu

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 3.1 | `…arch.ai`, Celý dokument, stejné dva kroky | 240 prvků; čísla po řádcích přes celý arch (levý horní aršík 1, 2, 3, 13, 14, 15 …) — aršíky pořadí neovlivní | |
| 3.2 | Vybrat jeden aršík (12 samolepek), Rozsah Výběr, Od 1 | „12 prvků, 24 textů“, čísla 001–012 v aršíku | |
| 3.3 | `Zund_Summa_Test.ai` (bez skupin), Celý dokument | 240 prvků, 480 textů — kód a číslo jedné samolepky drží spolu (geometrie podle kruhu) | |
| 3.4 | Pořadí **Po sloupcích** | Náhled se přepočítá: čísla tečou shora dolů | |
| 3.5 | Aktivní artboard (je-li v souboru víc artboardů) | Jen prvky, jejichž střed leží na aktivním artboardu | |

## 4. Druhý běh na hotovém bloku

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 4.1 | Po testu 2.3 (bez Zpět) spustit znovu | V Kde se uložená `{n}` ukáže jako „{n}  (nenalezeno)“, krok ⚠ „Nic nenašel, nic nezmění.“ | |
| 4.2 | Číslovat: Kde **První číslo v prvku**, Od 101 | Náhled 101 … 340 | |
| 4.3 | Nahradit: Najít **Jiný text…** „SNB CZ“, Nahradit „SNB SK“ | Kód se změní, čísla zůstanou | |

## 5. Ovládání

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 5.1 | Kliknout na zaškrtávátko u kroku v seznamu | Krok se vypne (přeškrtnutý), náhled se přepočítá. Pokud klik nefunguje, poznamenat — náhradou je zaškrtávátko **Aktivní** v editoru | |
| 5.2 | ↑ ↓ u kroků, − u kroku | Pořadí kroků se mění, náhled sedí; u jediného kroku je − šedé | |
| 5.3 | Do pole Od napsat 5 a **bez Enteru** kliknout Použít | Dialog zůstane, v hláškách „Náhled se přepočítal podle nové hodnoty. Zkontrolujte ho a potvrďte Použít znovu.“, náhled ukazuje 005. Druhé Použít zapíše | |
| 5.4 | Do pole Od napsat 6 a stisknout **Enter** | Náhled se přepočítá (dialog se nezavře); další Enter / Použít zapíše | |
| 5.5 | Vypnout krok zaškrtávátkem a hned Použít | Dialog zůstane s hláškou, náhled bez vypnutého kroku; zapíše až další Použít | |
| 5.6 | Do Od napsat „1O“ (písmeno O) | Pole červené, ✗ ve stavovém řádku, Použít, Uložit a Uložit jako… šedé | |
| 5.7 | Číslovat s Do 230 na 240 prvcích | ⚠ „Poslední číslo vyjde 240, v poli Do je 230. Prvků je o 10 víc.“ — Použít zůstává aktivní | |
| 5.8 | Krok Velikost písmen, Kde Celý text, Režim VELKÁ | Náhled ve verzálkách, formát po zápisu beze změny | |

## 6. Zvláštní stavy

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 6.1 | Dvojklikem vstoupit do textu (blikající kurzor) a spustit skript | Dialog se otevře na **Výběr** a hned ✗ „Kurzor je v textu. Ukončete úpravu textu klávesou Esc a vyberte prvky, nebo zvolte jiný rozsah.“, Použít šedé. Přepnutí na Celý dokument funguje | |
| 6.2 | Zamknout jeden text `{n}`, běh na celý dokument | Řádek rozsahu „… · přeskočené texty: 1“, v souhrnu „Přeskočené texty: 1“ a ⚠ řádek. Zamčený text zůstane `{n}`, jeho samolepka dostane kód | |
| 6.3 | V souhrnu zkontrolovat znaky | ⚠ a ✗ se v poli podrobností vykreslí (ne čtverečky) | |

## 7. Předvolby

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 7.1 | Po sestavení kroků z testu 2.1 **Uložit jako…** „Samolepky“ | Předvolba v seznamu, bez hvězdičky | |
| 7.2 | Zavřít, spustit znovu | Otevře se poslední nastavení; „Samolepky“ v seznamu nese oba kroky | |
| 7.3 | Změnit Od → hvězdička; **↺** | Hvězdička zmizí, hodnoty z předvolby zpět | |
| 7.4 | Vybrat „[Výchozí]“ a dát Uložit | Otevře se Uložit jako… (výchozí se nepřepisuje) | |
| 7.5 | **Smazat** „Samolepky“ | Předvolba zmizí | |

## 8. Výkon (pocitově)

| # | co udělat | co čekat | ✓/✗ |
|---|---|---|---|
| 8.1 | Otevření dialogu na 240 samolepkách | Do pár sekund (sonda na hlučném stroji 1,9–2,8 s) | |
| 8.2 | Změna pole + Enter | Náhled do ~0,5 s | |
| 8.3 | Použít na 240 samolepkách | Zápis a souhrn do pár sekund | |
