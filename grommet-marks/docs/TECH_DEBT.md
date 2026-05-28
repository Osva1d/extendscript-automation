# Tech Debt — Grommet Marks

> Záznamy o kompromisech, vizuálních fixech a strukturálních problémech
> které nebyly opraveny správně z důvodu priority nebo rozsahu.
> Každá položka obsahuje popis problému, správné řešení a kontext rozhodnutí.

---

## TD-001 — Mirror checkbox mimo panel (strukturální)

**Závažnost:** Střední
**Stav:** ✅ Vyřešeno ve v4.1.0
**Soubor:** `src/ui.js` — `buildDialog()`

**Popis:**
`bottomMirrorCB` a `rightMirrorCB` jsou umístěny mimo panel který ovládají.
Aktuálně jsou obaleny skupinou s `margins = [12, 4, 0, 0]` pro vizuální zarovnání
s obsahem panelu pod nimi. Vazba "toto tlačítko ovládá tento panel" není zřejmá
ze struktury — uživatel ji musí dedukovat z kontextu.

**Správné řešení:**
Checkbox přesunout dovnitř `buildEdgePanel()` jako první item, s `──────` oddělovačem
před ostatními controls. `buildEdgePanel()` by přijímala volitelný `mirrorLabel` parametr.
Při `mirror = true` jsou ostatní controls disabled — celá logika je vizuálně obsažena
v jednom panelu.

**Vzor:** InDesign / Logic Pro — control který gate-uje sekci patří DO té sekce.

**Řešení (v4.1.0):** `buildEdgePanel()` nyní přijímá volitelné parametry
`mirrorLabel`/`mirrorTip`. Pokud jsou předány (dolní/pravá hrana), mirror
checkbox se vykreslí jako první prvek uvnitř edge skupiny; při zapnutí mirror
se ostatní controls skupiny disablují. Celá logika je vizuálně obsažena
v jedné sekci.

---

## TD-002 — Bez undo groupingu (funkční)

**Závažnost:** Střední
**Stav:** ⏸ Odloženo (mimo scope v4.1.0)
**Soubor:** `src/main.js` — `process()`

**Popis:**
Značky jsou umísťovány jednotlivě přes `placeMark()`. Každá vytvoří samostatný undo krok.
Pro typický layout (4 hrany × 10 značek) musí uživatel stisknout Cmd+Z 40×.

**Správné řešení:**
Obalit celý `process()` do `app.doScript()` nebo jiného mechanismu undo groupingu,
pokud to cílová verze Illustratoru podporuje. Alternativně dokumentovat jako známé omezení.

**Proč nebylo opraveno:** `app.doScript()` v ExtendScriptu nemá stabilní podporu
across verzí Illustratoru. Vyžaduje testování na cílových verzích.

**Rozhodnutí (cyklus 2):** Záměrně odloženo. Illustrator nemá spolehlivé
cross-version API pro seskupení undo kroků; zařazení do UI-zaměřeného releasu
v4.1.0 by přidalo nejistotu za malý zisk. Zůstává sledováno zde.

---

## TD-003 — Mirror checkbox neobnovuje předchozí stav (UX)

**Závažnost:** Nízká
**Stav:** ✅ Vyřešeno ve v4.1.0
**Soubor:** `src/ui.js` — `buildEdgePanel()`

**Popis:**
Při zapnutí mirror checkboxu je `bottomUI.cb.value` vynucen na `false`.
Po vypnutí mirror se checkbox neobnoví do předchozího stavu — uživatel ho musí
znovu zapnout ručně.

**Řešení (v4.1.0):** `buildEdgePanel()` drží v closure `_prevEnabled`. Při
zapnutí mirror se uloží aktuální `cb.value` a vynutí `false`; při vypnutí se
`cb.value` obnoví z `_prevEnabled`.

---

*Poslední aktualizace: 2026-05-28*
