# Návrh — tile-export 1.3.0: část přelepu bez potisku pro svár plachet

Nástroj: `tile-export`, namespace `TE`.
Navazuje na [návrh 1.0](2026-09-13-tile-export-design.md),
[Zünd režim](2026-09-13-tile-export-zund-design.md) a
[návrh 1.1.0](2026-10-10-tile-export-1.1.0-design.md).

Datum: 2026-11-06 · Stav: **schváleno** (uživatel, 2026-11-06); `WARN_UNPRINTED_SKIP` doplněno při plánování

---

## 1. Proč

Plachty z PVC se spojují svárem. Inkoust v místě sváru spoj oslabuje, proto se
spodní plát v přelepu nechává bez potisku. Běžnou plachtu s rovnoměrnými švy
takhle připraví RIP. Přes TE ale jdou plachty, které RIP připravit neumí:

- **strojový ořez:** každý plát potřebuje vlastní regmarky a řezová data,
  a u většího množství plachet se Zünd používá,
- **nerovnoměrné dělení:** šev se vyhýbá textu nebo logu.

TE dnes tiskne celý přelep, takže pás by se musel ručně maskovat v každém plátu.

## 2. Rozhodnutí

| # | rozhodnutí | kdo, kdy |
|---|---|---|
| 1 | Přelep se dělí na potištěnou a nepotištěnou část. Potisk přes šev 1–2 mm kryje nespasování. | uživatel, 2026-11-06 |
| 2 | Šířka sváru je hodnota v poli a v předvolbě, ne konstanta. Dílna počítá asi s 30 mm, ještě se potvrdí ve finiši. | uživatel, 2026-11-06 |
| 3 | Rysky pro prořez nejsou v této verzi. Pláty se spasují podle obrazu, rysky by jen zrychlily práci. Nejdřív ruční zkouška na zakázce (§7). | uživatel, 2026-11-06 |
| 4 | Žádný přestavěný dialog, žádný nový režim „technika spoje“ (§7). | uživatel, 2026-11-06 |

Verze **1.3.0**: nová schopnost, předvolby se nerozbijí (`docs/conventions.md`,
kdy bumpovat).

## 3. Model

Svár je jednostranný přelep, jen z větší části nepotištěný. Nosič přelepu leží
při sváru dole, jeho soused nahoře a končí přesně na švu. Tuto geometrii TE už
má, takže `computeCuts`, `equalCuts` ani rozměry plátů se nemění.

Nové nastavení `overlapUnprinted` (mm, výchozí 0) říká, kolik z přelepu je bez
potisku, a to od vnější hrany nosiče:

```
Svisle, přelep „Celý na pravý / dolní“, přelep 32, z toho bez potisku 30

                       šev S
                         |
plát 1   ################|                  končí na švu, potisk až k hraně
plát 2   ..............##|###############   30 mm bez potisku, 2 mm potisku přes šev
         ^ S−32        ^ S−2
```

Příklad, zeď 6000 mm na 3 pláty, bez přídavků:

| plát | řez | potisk | bez potisku |
|---|---|---|---|
| 1 | 2000 mm | 2000 mm | nic |
| 2 | 2032 mm | 2002 mm | 30 mm vlevo |
| 3 | 2032 mm | 2002 mm | 30 mm vlevo |

**Kdy platí:** přelep je jednostranný, přelep > 0 a `overlapUnprinted` > 0.
Jinak se hodnota ignoruje a v předvolbě zůstává, jako uložená volba linky
v Zünd režimu (N28). `overlapUnprinted` = přelep je povolené, jen bez tolerance.

**Plát má nejvýš jeden lem.** `TE.Grid.computeTiles` doplní k plátu
`unprinted: {side, width}` (šířka v bodech dokumentu), nebo `null`:

| směr | nosič | kdo nese lem | strana |
|---|---|---|---|
| Svisle (`horizontal`) | `first` | všichni kromě posledního | `right` |
| Svisle | `second` | všichni kromě prvního | `left` |
| Vodorovně (`vertical`) | `first` | všichni kromě posledního | `bottom` |
| Vodorovně | `second` | všichni kromě prvního | `top` |

`clean` a `expanded` zůstávají stejné jako bez sváru. Rovnoměrně dál srovnává
pláty včetně přelepu, tedy materiál, který lem na roli spotřebuje.

**Čistá funkce `TE.Grid.printClip(mask, panel, unprinted, k)`** vrátí obdélník,
na který se ořízne grafika: `mask`, ale strana s lemem je od hrany `panel`
posunutá dovnitř o `width × k`. Bez lemu vrátí `mask`. Na té straně proto není
ani spad. Používá ji export i kontrolní pláty.

## 4. Dialog

Panel Přelep a přídavky, za volbou Umístění přelepu:

```
Přelep:              [ 32 ] mm
Umístění přelepu:    ( ) Půl na každou stranu
                     ( ) Celý na levý / horní
                     (•) Celý na pravý / dolní
Z toho bez potisku:  [ 30 ] mm
```

- Pole je aktivní jen u jednostranného přelepu většího než 0, jinak šedé.
- Číslo se píše a kontroluje jako ostatní: přidat do `NUMBER_FIELDS`
  a `NUMBER_CONTROLS`. Kontroluje se jen u jednostranného přelepu většího než 0,
  aby překlep v šedém poli nic neblokoval.
- `TE.Config.getDefaults` dostane `overlapUnprinted: 0`. `TE.Storage.fillDefaults`
  doplní starým předvolbám výchozí hodnotu, **migrace není potřeba**.
- Patří do předvolby: `presetValues` bere všechno kromě měřítka kresby.

**Výška je potřeba změřit před kódem.** Dialog má 836 px, strop laptopu je kolem
850 px a řádek přidá asi 33 px. Pokud levý sloupec nemá rezervu, pole půjde na
řádek k Přelepu, což může dialog o něco rozšířit. Sonda na prázdném Illustratoru
přidá řádek do hotového dialogu 1.2.0 a přečte rozměry; vybere se varianta, která
se vejde do stropu. Zastaralý komentář v `ui.js` o 1178 × 749 px se při tom
opraví na změřený rozměr.

## 5. Export a kontrolní pláty

**Zünd.** Značky se počítají z masky (`buildZundPanel`), a právě v tom je past:
zkrácená maska by je posunula do lemu, kde by se vytiskly do místa sváru
a skončily uvnitř řezu. Proto:

- řez, značky a stránka zůstávají z plné `zundLayout(...).mask` jako dnes, takže
  `pageSizeMm`, `{size}` a `markConflict` se nemění,
- jen obdélník, kterým se ořezává grafika, přichází z `printClip`.

Soubor `_cut` se nemění. Stejné rozdělení potřebuje `TE.Check.geometry`
a kreslení kontrolního plátu.

**Ruční ořez.** Grafiku dnes ořezává jen stránka PDF, maska tu není. Plát s lemem
ji nově dostane, pomocí téže operace jako v Zündu (vytažené do pomocné funkce),
a to až po případném rastrování. Plát bez lemu se nemění ani v jednom objektu.
Červená linka zůstává po obvodu stránky včetně lemu: finišer podle ní řeže
a prázdný pás by jinak neměl vidět.

**Kontrolní pláty** ukážou lem prázdný, přesně jako export.

## 6. Kontroly a hlášky

Všechno v `TE.Validate.check`, kromě informačního řádku, který patří do `refresh`
vedle `INFO_MARKS_CUT`. Klíče anglicky, EN i CS, tón podle kánonu §12.

| klíč | kdy | druh | text (CS) |
|---|---|---|---|
| `ERR_UNPRINTED_BIG` | platí a je větší než přelep | chyba, stopne vše | Část bez potisku (%s mm) nesmí být větší než přelep (%s mm). |
| `WARN_UNPRINTED_WATER` | platí, Vodorovně, lem nese horní plát | upozornění | Přelep nese horní plát, takže dolní leží na něm. Venku může voda zatékat do sváru; obvykle se volí Celý na pravý / dolní. |
| `WARN_UNPRINTED_NO_LINE` | platí, ruční ořez, linka vypnutá | upozornění | Linka je vypnutá: okraj části bez potisku nebude na tisku vidět. |
| `WARN_UNPRINTED_SKIP` | platí, Přeskočit hotové výstupy zapnuté | upozornění | Přeskočit hotové výstupy nepozná změnu části bez potisku a soubor se stejným názvem by zůstal. Po její změně volbu vypněte. |
| `INFO_UNPRINTED` | platí | informace ve Výsledku | Přelep %s mm: %s mm bez potisku, %s mm potisku přes šev. |

Část bez potisku nemění název souboru ani stránku, takže Přeskočit hotové výstupy
by po její změně nechalo starý soubor s inkoustem v místě sváru. Proto třetí
upozornění. Nic se nepřepíná samo. Tip pole (`TIP_UNPRINTED`) řekne, k čemu pole je, že plát
s lemem leží při sváru dole a že přelep 32 s 30 bez potisku nechá 2 mm potisku
jako krytí nespasování.

## 7. Mimo rozsah

| co | proč ne |
|---|---|
| Přestavba dialogu na 685 px, zrušení panelů | Problém nikdo nenaměřil: 836 px se do stropu vejde. Výšku podle kódu určuje hlavně 7 polí Zündu. Kánon předepisuje panel Předvolby a rodina nástrojů panely používá. |
| Režim „technika spoje“ (`finishType`), „na sraz“ | Přelep 0 i dvojitý prořez TE umí dnes. Nový stav by vynutil migraci a skryté hodnoty. |
| Symetrický přelep vynucený pro prořez | Obě vrstvy nesou v přelepu stejný obraz, prořez kdekoli uvnitř dá přesné napojení. Říká to i `TIP_OVERLAP_MODE`. |
| Rysky pro prořez | Čeká na ruční zkoušku: na jedné zakázce je nakreslit a zjistit, jestli je finišeři použijí. V kódu by řešily přídavek 0, viditelnost na tmavém obraze a přepočet délky a tloušťky v 1:N. |
| Vodicí ryska pro svářečku | Hranice potisku je vidět sama. Tenká černá čára u švu by při nedosednutí zůstala na hotové plachtě. |
| Automatické přepnutí nosiče u Vodorovně | Skrytá změna. Stačí upozornění. |
| Vestavěná předvolba pro svár | Hodnoty dílna teprve potvrdí. Předvolbu si uloží sama. |

## 8. Ověření

**Node** (`tests/`, zelené před sloučením):

- `computeTiles` ve všech čtyřech kombinacích z §3: strana, šířka, první a poslední
  plát; symetrický přelep a přelep 0 dávají `null`,
- vlastnostní test: `clean`, `expanded` a řezy jsou se svárem stejné jako bez něj,
- `printClip`: všechny strany, měřítko `k`, bez lemu vrací `mask`,
- `zundLayout` a `pageSizeMm` nezávisí na `overlapUnprinted`,
- `Validate`: větší než přelep, nečíslo, šedé pole nic neblokuje, všechna tři upozornění,
- starý soubor nastavení bez klíče dostane 0, hvězdička u předvolby funguje.

**Sondy v Illustratoru** (na kopiích, jen při prázdném Illustratoru, každý běh
samostatně):

- arch i zeď, ruční ořez i Zünd, Svisle i Vodorovně, výstup 1:10 i 1:1,
  a Large Canvas,
- **exportovat PNG a podívat se** (čísla u geometrie nestačí): pás prázdný
  a správně široký, potisk přes šev, značky na stejných místech jako bez sváru,
- MediaBox a `_cut` stejné jako bez sváru; plát bez lemu stejný jako v 1.2.0.

**Ručně** (nová sekce v `tile-export/docs/manual-test.md`), brány vydání:

- **RIP:** jeden testovací plát v každém RIPu v provozu. Dokumentace neříká, jestli
  některý neořízne prázdný pruh na okraji stránky. Rizikový je hlavně ruční ořez
  s vypnutou linkou.
- **Materiál:** jeden svár se Zündem na skutečné plachtě. Sedí značky, řez, šířka
  pásu a krytí 2 mm? Kam přesně jde tryska, když je u hrany 2 mm potisku?

**Dokumentace:** README, CHANGELOG `[1.3.0]`, nález ve `findings.md`, verze
v `package.json` a `config.js`.

## 9. Otevřené otázky

Nic z toho neblokuje kód, hodnoty jsou v poli:

1. Šířka sváru v dílně: 30 mm je odhad, potvrdí finiš.
2. Potisk přes šev: 1 nebo 2 mm.

## 10. Odkud to je

Podnět: požadavek uživatele, externí rozbor TE 1.2.0 a jeho audit z 2026-11-04.
Z rozboru zůstalo pravidlo stékání vody a maska místo bílého obdélníku; model,
geometrie a návrh dialogu byly nahrazené (§3, §7).

Nepotištěný pás jako část přelepu nebo pás k němu přidaný popisuje dokumentace
[ONYX (Weld Overlap)](https://help.onyxgfx.com/25/ONYXGo/Content/RIP-Queue/Tiling%20Setup%20Tab.htm),
[PrintFactory (Overlap White)](https://support.printfactory.cloud/portal/en/kb/articles/tiling-layout-component)
a [Fiery XF (glue area)](https://help.fiery.com/cws_xf/6.4/en-us/GUID-79C4E7F0-A4FC-40AB-8CB0-6A24C9CFAD7E.html).
Proto v poli stojí „z toho“: ONYX pás vyhrazuje uvnitř přelepu, Fiery ho přidává.
Pevnější svár na nepotištěné straně uvádí
[HP](https://lkc.hp.com/applications/recommendations-on-welding-and-sewing-banners-printed-with-hp-latex),
šířky svaru 20/30/40 mm
[Leister](https://leykom.ro/media/file/W1289/Leister_Plastic-Welding_BR_billboards-tarpaulins_EN.pdf).
