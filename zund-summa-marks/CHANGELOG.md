# Changelog

Všechny podstatné změny skriptu Zünd & Summa Marks. Formát vychází z
[Keep a Changelog](https://keepachangelog.com/cs/1.1.0/), verzování dle
[SemVer](https://semver.org/lang/cs/).

## [1.0.0] — 2026-06-28

První veřejné vydání (re-baseline). Sjednocení verzí napříč sadou pro open-source
release; funkčně navazuje na interní řadu v26.x (viz níže).

---

> **Poznámka k číslování.** Verze `v26.x` níže patří **interní řadě** před veřejným
> vydáním — čísla jsou historická reference, ne veřejná řada. Veřejná řada začíná
> na 1.0.0.

## Před veřejným vydáním (interní řada)

### v26.5.1 (2026-06) — Hotfix: idempotence Trim vrstvy + nálezy z code review
- **Fix (kritický, regrese v26.5.0):** Top-level vrstva „Trim" se měřila do bounds → každé další spuštění SUMMA s ořezovými linkami zvětšilo artboard. `ZSM.Bounds.get` ji nyní přeskakuje; „Trim" se ani nenabízí v dropdownu vrstev.
- **Fix:** SUMMA běh s vypnutými ořezovými linkami odstraní zastaralou vrstvu „Trim" z předchozího běhu (ZUND ji nechává — patří k SUMMA layoutu).
- **Fix:** `Storage.save` kontroluje open/write/close a vrací úspěch — selhání zápisu už není tiché.
- **Fix (UX):** Psaní víceciferného měřítka nezamkne pole po první číslici; pole 1:N je v live-validaci.
- **Fix (UX):** Po Uložit se tlačítka Uložit/↺ správně deaktivují.
- **Fix:** Názvy předvoleb tvaru `[Text]` jsou rezervované; závorky uvnitř názvu zůstávají povolené.
- **Fix:** Fixed režim neblokuje Generovat kvůli neaktivnímu poli „Mezera od grafiky".
- **Chore:** `ZSM.Config.layerTrim` konstanta; přehláska v patičce; ošetřen `e.line`.

### v26.5.0 (2026-06) — Phase 3: pouze značky + UI polish + crash fix
- **Feat:** Režim **„Pouze značky (neměnit vrstvy)"** — pro dokumenty s už separovanými vrstvami.
- **Feat:** Tlačítko **↺ Revert** vedle dropdownu předvoleb — vrátí aktivní předvolbu na uložené hodnoty.
- **Change:** Ořezové linky (SUMMA) jdou vždy do samostatné top-level vrstvy „Trim" (oba režimy).
- **Change:** Tlačítko **Reset odstraněno** — tovární hodnoty přes `[Výchozí]`, návrat řeší ↺.
- **Fix (kritický, CZ locale):** Falešná `*` u předvoleb s registrační barvou — `canonColor()` normalizuje čtení.
- **Fix (kritický):** Zaseknutý dialog po neplatné hodnotě — `setUIValues` spouští re-validaci.
- **Fix (kritický, C++ crash):** Vytváření top-level „Trim" při aktivním sublayeru shazovalo Illustrator — reset `activeLayer` + commit před `doc.layers.add()`.

### v26.4.0 (2026-05) — Phase 2: manuální měřítko + review-round hardening
- **Feat:** Manuální měřítko 1:N (`scaleN`, 1–10) — `getEffectiveSF()` skládá Large Canvas × scaleN pro core.js i draw.js (oprava: dříve se v 1:10 nezmenšily značky).
- **Fix (prepress-safe):** `getCol` už NEvytváří tiše náhradní spot — chybějící barva → fallback `[Registration]` + neblokující upozornění.
- **Fix (preset robustnost):** chybějící swatch/vrstva se zachová jako „(chybí)"; chybějící cílová vrstva se vytvoří.
- **Fix:** Mazání předvolby vyžaduje potvrzení; silent `catch {}` kolem `Storage.save` sjednoceny do `persistSettings()`.
- **Chore:** `build.sh` version parity guard; artifact-layer kontroly → `ZSM.Bounds.isArtifactLayer`.

### v26.3.2 (2026-05) — Phase 1 patch: 1:10 workflow unblock
- **Fix:** Validace `maxDist` — minimum sníženo 50 → 5 mm (odblokování zmenšeného dokumentu).
- Regresní testy + dokumentace 1:10 workflow.

### v26.3.1 (2026-03)
- Opravy: `endSession()` obnova viditelnosti, `getBounds()` přeskakuje skryté/vodítka, `Storage.save()` try-catch, propagace přejmenování „Graphics", logování v prázdných catch, globální `replace(/,/g, ".")`.
- Migrace: locale-independent default key (`[Výchozí]` → `[Default]`), odstranění `layers[].active`.
- UI: přeuspořádání sloupců Layer → Color, sjednocení spacing.

### v26.3.0 (2026-02-22)
- Přepis namespace `PMA` → `ZSM`; nový `locale.js` (EN/CS, `app.locale` detekce).
- Preset systém (`[Last Settings]`, ochrana `[Default]`); dynamické vrstvy `layers[]`.
- Opravy: `drawRed` pro SUMMA, `markSizeZ/S` fallback; migrace v26.0 → v26.3.

### v26.2.x — v26.0 (2025–2026)
- Viz git history.
