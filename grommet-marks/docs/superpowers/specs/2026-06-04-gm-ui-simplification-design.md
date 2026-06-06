# Grommet Marks v4.2.0 — UI Simplification

> Cyklus 3. Zjednodušení dialogu + oprava dvou reálných vad viditelných
> v Illustratoru (neviditelný text validace, roztřepený panel Vzhled).

---

## Cíl

Zjednodušit dialog a sjednotit ho dál se ZSM:

1. Tvar značky natvrdo kruh (odstranit volbu Kruh/Čtverec).
2. Revert (↺) ve stylu ZSM místo samostatného tlačítka Reset.
3. Oprava barvení live-validace (text v platných polích je na tmavém UI neviditelný).
4. Zarovnání dropdownů v panelu Vzhled.

Výsledek: GM v4.2.0 — bez breaking změny persistence.

---

## 1. Tvar → natvrdo kruh

**Proč:** Oka jsou kruhová; čtvercová značka se v praxi nepoužívá. (Kříž by dával
smysl, ale to je samostatný budoucí feature — geometrie + kreslení — mimo tento cyklus.)

**Změny:**
- `src/ui.js`: odstranit radio `roundRB`/`squareRB` a `SHAPE_LABEL` z panelu Značka.
  Panel pak: `Měrné jednotky | Velikost`.
- `gatherAll()`: `isRound: true` napevno (ne ze zrušeného controlu).
- `applyAll()`: řádky nastavující `roundRB.value`/`squareRB.value` odstranit.
- Pole `isRound` **zůstává** v settings (vždy `true`) → žádná migrace, staré
  presety se prostě kreslí jako kruh.
- `process()` v `main.js` se nemění (čte `cfg.isRound`, dostane vždy true).
- Locale: `SHAPE_LABEL`, `ROUND`, `SQUARE`, `TIP_SHAPE_ROUND`, `TIP_SHAPE_SQUARE`
  → odstranit (osiřelé po zrušení controlu) z EN i CS.

---

## 2. Revert (↺) místo Reset — vzor ZSM

**Sémantika (přesně jako ZSM `btnRevert`):** zahodit neuložené změny a znovu
načíst **aktivní preset** v jeho uložené podobě.

**Změny:**
- `src/ui.js` preset panel: přidat malé tlačítko `"↺"` (preferredSize `[30, 24]`)
  **hned za rozbalovač `loadDDL`, před tlačítko Uložit** (drží se u dropdownu jako
  v ZSM), `helpTip = GM.L.TIP_REVERT`.
- Aktivní **jen když má aktivní preset neuložené změny** (`GM.UIState.isModified`)
  — řízeno v `refreshModifiedIndicator()` vedle `saveBtn.enabled`.
- onClick → `applyAll(pData.presets[pData.activePreset])` + `refreshModifiedIndicator()`.
  Na `[Výchozí]` (neměnný = tovární) tím revert = návrat k defaultům.
- **Odstranit** footer tlačítko `resetBtn`, jeho onClick **i `spacer` skupinu**.
  Footer pak: `footerGrp.alignment = ["right", "center"]` s `Storno | Generovat`
  vpravo (shoduje se s BRE, které Reset nemá).
- Locale: přidat `TIP_REVERT` (EN+CS). Odstranit osiřelé `BTN_RESET`/`TIP_RESET`.

**Pozn. k stávajícímu chování:** GM na startu načítá `[Last Settings]`, ale
`activePreset` ukazuje na `[Výchozí]`. Pokud se liší, dialog se otevře jako
„modified" (hvězdička, revert aktivní) — revert pak načte `[Výchozí]`. To je
korektní a shodné se ZSM.

---

## 3. Oprava barvení live-validace (neviditelný text)

**Problém:** `paintField()` barví **platná** pole černě `[0,0,0,1]`. Na tmavém
Illustrator UI je černý text na tmavém poli neviditelný (viz otisk: `7`, `10`, `3`).

**Oprava (přenos ZSM `markFieldValidity`):**
- Při prvním vykreslení uložit *výchozí* barvu pole: `et._gmDefPen = g.foregroundColor || null`.
- **Platné** → obnovit `et._gmDefPen` (fallback světle šedá `[0.75,0.75,0.75,1]`).
- **Neplatné** → červená `[0.90,0.20,0.20,1]`.
- Vše ve stávajícím try/catch (graphics nemusí být „realised").

---

## 4. Zarovnání panelu Vzhled

**Problém:** `Vrstva:` (prostý popisek) vs `Výplň:`/`Obrys:` (checkboxy) mají
různou šířku a nikdo nemá pevný label sloupec → dropdowny začínají na různých X
(viz otisk: Vrstva dropdown ~30px vlevo od ostatních).

**Oprava:** sjednotit levý sloupec na pevnou šířku, aby `Vrstva`/`Výplň`/`Obrys`
dropdowny i pole `Tloušťka` byly svisle zarovnané:
- `Vrstva:` statictext → `preferredSize.width = LABEL_W`.
- `Výplň:` a `Obrys:` checkbox → `preferredSize.width = LABEL_W` (stejná hodnota).
- `Tloušťka:` statictext → `preferredSize.width = LABEL_W`.
- `LABEL_W` zvolit tak, aby pojal nejdelší (`Měrné jednotky:` je v jiném panelu;
  zde nejdelší je `Výplň:`/`Obrys:`/`Vrstva:`/`Tloušťka:`) — cca **70 px**.

---

## Verze

**v4.2.0** — MINOR (UI změny, bez breaking persistence; `isRound` zachováno).
Bump v `package.json`, `src/constants.js`, `tools/build.sh` (version-drift guard
to ohlídá).

---

## Testy

- `tests/test_ui_dialog.js`:
  - **Odstranit** test Round/Square exkluzivity a `isRound` přepínání.
  - **Přidat** test: revert tlačítko existuje; je zašedlé bez změn; po změně
    pole je aktivní; klik vrátí hodnoty na uložený preset.
  - Upravit: `gatherAll().isRound === true` vždy.
- Mock harness (`mock_scriptui.js`) beze změny.
- `npm run verify` zelené.

---

## Mimo scope (budoucí)
- Tvar **kříž** (vlastní cyklus: geometrie + `placeMark` kreslení + UI).

---

*Schváleno: 2026-06-04*
