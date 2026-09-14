# Zpráva — rovnoměrné plátování

Podklad k rozhodnutí, jestli a jak do `tile-export` doplnit dělení na **stejně
široké pláty**. Datum: 2026-09-14.

---

## 1. Co dnes nástroj dělá

Režim „počet plátů" dělí rovnoměrně **čistý formát**, a přelep se přidává až
potom. Výsledek jsou pláty, které stejné nejsou. Naměřeno na grafice 3000 mm,
3 pláty, přelep 20 mm, bez přídavků:

| režim přelepu | tiskové šířky plátů |
|---|---|
| symetricky | 1010 \| **1020** \| 1010 mm |
| jednostranně | 1020 \| 1020 \| **1000** mm |

Součet je v obou případech 3040 mm. Čisté šířky přitom stejné jsou —
1000 mm třikrát. Viz oprava v §7.

**Je to překvapivé chování.** Uživatel, který zadá „3 pláty", přirozeně čeká tři
stejné — ne tři různé. Rozdíl je tím větší, čím větší je přelep a čím méně je
plátů: při dvou plátech a přelepu 50 mm se liší o celých 50 mm.

## 2. Je požadavek legitimní?

**Ano, ale ne univerzálně — a ten rozdíl stojí za pozornost.**

**U tapet a nástěnných grafik ano.** RIPy to umí: pro tapetové pruhy „equal
panels can be set with overlap on both sides"
([Caldera / Onyx diskuse](https://www.signs101.com/threads/tiling-wall-graphics-tips.160859/),
[Caldera Tiling](https://helpdesk.caldera.com/hc/en-us/articles/4402691987985-Tiling-Tile-Edition)).
Tapetový svět počítá v pruzích konstantní šířky — standardní pruh je 24"
a počet pruhů se určuje dělením šířky stěny šířkou pruhu
([Spoonflower](https://www.spoonflower.com/en/learn/how-to/measure-for-wallpaper),
[James Dunlop](https://www.jamesdunloptextiles.com/journal/tips-how-to/how-to-calculate-wallpaper-requirements)).
Stejné pruhy tam nejsou estetický rozmar: usnadňují montáž, spotřebu materiálu
lze počítat jedním číslem a při doobjednávce sedí.

**U polepů a bannerů ne nutně.** Profesionálové z oboru upřednostňují
praktičnost před uniformitou — *„Make them only so wide that they are easy to
install"*
([Signs101](https://www.signs101.com/threads/tiling-wall-graphics-tips.160859/)).
Šířku diktuje role, montážník a dosah rukou, ne symetrie.

**Závěr:** je to legitimní požadavek pro část zakázek, ne pro všechny. Nesmí se
tedy stát jedinou možností — ale je to rozumné **výchozí** chování, protože je
to to, co zadání „n plátů" slibuje.

## 3. Matematika

Označení: `L` čistá délka, `n` počet plátů, `o` přelep, `aL`/`aR` přídavky na
krajích.

Celková rozvinutá délka materiálu je čistá délka plus všechny přelepy plus
krajní přídavky. Vnitřních švů je `n − 1`:

```
W = (L + aL + aR + (n − 1) · o) / n
```

Pozice řezů, symetrický přelep:

```
c₁ = W − o/2 − aL
cᵢ = cᵢ₋₁ + W − o          pro i = 2 … n−1
```

Jednostranný přelep se liší jen prvním řezem — `c₁ = W − o − aL`.

**Ověřeno prototypem** proti `TE.Grid.computeTiles`, tedy proti skutečné
geometrii plátů, ne proti vlastnímu výpočtu:

| případ | W dle vzorce | skutečné šířky |
|---|---|---|
| 3 pláty, 3000 mm, přelep 20, symetricky | 1013,33 | 1013,33 × 3 |
| totéž jednostranně | 1013,33 | 1013,33 × 3 |
| 5 plátů, 3000 mm, přelep 20 | 616,00 | 616,00 × 5 |
| 3 pláty, přelep 20, přídavky 40/40 | 1040,00 | 1040,00 × 3 |
| 4 pláty, 2700 mm, přelep 50 | 712,50 | 712,50 × 4 |
| **2 pláty, 3000 mm, přelep 0** | **1500,00** | **1500,00 × 2** |

Poslední řádek je pro rozhodnutí klíčový: **při nulovém přelepu dává vzorec
přesně totéž co dnešní implementace.** Rovnoměrné pláty nejsou alternativa —
jsou to zobecnění, které se pro `o = 0` zredukuje na současné chování.

To má praktický důsledek: **desky (forex, kapa), které se plátují bez přelepu,
se změnou nedotkne vůbec.**

## 4. Jak to zařadit

### a) Nahradit současný „počet plátů" — doporučeno

Režim „počet plátů" by počítal rovnoměrné pláty. Trojice voleb by pak dávala
čistý smysl:

| volba | co zaručuje |
|---|---|
| počet plátů | *n* **stejných** plátů |
| šířka plátu | pláty zadané šířky, poslední kratší |
| vodítka | švy tam, kam je položíš |

Každá volba odpovídá jinému zadání zakázky. Dnešní chování neodpovídá žádnému:
nedá ani stejné pláty, ani zadanou šířku.

**Riziko:** změní výsledky uložených presetů s nenulovým přelepem. Je ale
minimální — nástroj je čerstvý, v1.0.0 vznikla včera a ještě není odeslaná na
remote. Desky s přelepem 0 se nezmění vůbec.

### b) Přidat jako čtvrtý režim

Dropdown by měl „počet plátů" a „počet plátů (stejné)". Nic se nerozbije, ale
uživatel musí vědět, čím se ty dvě liší — a rozdíl je jemný a snadno
přehlédnutelný. Platí se srozumitelností za zpětnou kompatibilitu, kterou
nikdo nepotřebuje.

### c) Zaškrtávátko „stejné pláty" u režimu počet

Nejmenší zásah do kódu, ale nejhorší UX: vzniká stav, který je potřeba
vysvětlit, a výchozí hodnota stejně musí být zvolena. Je to varianta (a) nebo
(b) se schovaným rozhodnutím.

## 5. Doporučení

**Nahradit (varianta a).** Důvody v pořadí podle váhy:

1. **Dnešní chování neplní žádné zadání.** Nedá stejné pláty ani pláty zadané
   šířky. Je to vedlejší produkt implementace, ne návrhové rozhodnutí.
2. **Pro desky se nic nemění** — při přelepu 0 jsou oba výpočty totožné.
3. **Menší UI.** Tři volby místo čtyř, každá s jasným slibem.
4. **Riziko regrese je teď nejnižší, jaké kdy bude.** Nástroj je nový
   a nepublikovaný.

Kdo potřebuje konkrétní šířku plátu, má na to režim „šířka plátu"; kdo potřebuje
šev na konkrétním místě, má vodítka. Rovnoměrné pláty tak zaplní jediné místo,
které dnes chybí.

## 6. Co bude potřeba změnit

- `TE.Grid.computeCuts`, větev `count` — nový vzorec, závislý na `overlap`
  a `overlapMode`, které dnes nečte.
- Testy `test_grid_cuts.js` — očekávané pozice řezů se změní.
- Property test „přelep sousedů je přesně zadaný" platí dál; přibude
  **nová vlastnost: všechny pláty mají stejnou šířku**, což je silnější
  a snadno ověřitelný invariant.
- README a CHANGELOG — popsat, co režim „počet plátů" slibuje.

Odhad: jde o jednu funkci a její testy, ne o zásah do architektury.

---

## 7. Oprava — dvě definice „stejných plátů" (2026-09-14, po implementaci)

Zpráva výše má v §5 vadný první důvod. Stojí tam, že dřívější chování
„neplní žádné zadání". **Není to pravda.** Dřívější chování dávalo stejné
**čisté** šířky (1000/1000/1000 mm) a různé tiskové; nová implementace dává
stejné **tiskové** šířky a různé čisté. Obě definice odpovídají reálnému
zadání a rozhodovalo se tedy mezi nimi, ne mezi chybou a opravou.

Naměřeno na produkčním kódu, grafika 3000 mm, 3 pláty, přelep 20 mm:

| | tisková šířka | čistá šířka |
|---|---|---|
| dřívější chování | 1010 \| 1020 \| 1010 | 1000 \| 1000 \| 1000 |
| nynější, symetricky | 1013,3 × 3 | 1003,3 \| 993,3 \| 1003,3 |
| nynější, jednostranně | 1013,3 × 3 | 993,3 \| 993,3 \| 1013,3 |

**Obojí naráz nejde.** Krajní plát má jeden šev, vnitřní dva; při konstantní
tiskové šířce musí krajní nést víc motivu. Jedinou výjimkou je nulový přelep,
kde obě definice splynou.

**Volba zůstává na tiskové šířce.** Červená linka leží na MediaBoxu, takže
tisková šířka je to, co finišer řeže a co se objedná z role — a právě ta má být
předvídatelná. Ale je to volba, ne oprava, a v README, CHANGELOGu i v dokumentaci
`TE.Grid.equalCuts` je teď pojmenovaná.

**Rovnoměrnost platí v obou režimech přelepu.** Jednostranný přelep ji neruší:
posune se šev o půl přelepu (vodorovně řez na 993,3 místo 1003,3, svisle na
1013,3 — opačným směrem, protože přelep nese druhý konec osy), tiskové šířky
zůstanou stejné. Ověřeno property testem, 500 běhů, obě orientace, oba režimy.

Tím padá i vzorec v §3: `c₁ = W − o − aL` platí jen vodorovně. Svisle nese
přelep horní plát, tedy **vysoký** konec vzestupné osy, takže plát na nízkém
konci nenese nic a `c₁ = W − aB`. Tuhle asymetrii odhalil až property test
během implementace (n = 2, přelep 1: pláty se lišily přesně o dvojnásobek
přelepu).
