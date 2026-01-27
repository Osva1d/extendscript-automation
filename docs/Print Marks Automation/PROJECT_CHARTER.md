# PROJECT CHARTER: Zund & Summa Automation
> **Status:** Released (As-Built Specification)
> **Skript:** Illustrator_Zund_Summa_Marks.jsx (v26.3)
> **Platforma:** Adobe Illustrator (ExtendScript ES3)

---

## 1. Definice Komponent (Hardware Specs)

### A. Značka ZUND
*   **Tvar:** Kružnice (Circle).
*   **Průměr:** `5 mm` (Poloměr `2.5 mm`).
*   **Orientace:** Vlevo dole asymetrická značka.
    *   **Vzdálenost:** `100 mm` (Čistá mezera / Visual Gap).
    *   *Implementace:* Offset středu = 100 mm + 5 mm = 105 mm.

### B. Značka SUMMA
*   **Tvar:** Čtverec (Square).
*   **Velikost:** `3 mm` x `3 mm` (Polovina `1.5 mm`).
*   **Geometrie:**
    *   **Osa X (Boční):** Střed značky je `10.0 mm` od hrany grafiky. (Vizuální mezera `8.5 mm`).
    *   **Osa Y (Výšková):** Střed značky je `11.5 mm` od hrany grafiky. (Vizuální mezera `10.0 mm`).
    *   **OPOS Bar:** Šířka rovna šířce grafiky. Vizuální mezera pod grafikou `10.0 mm`.

---

## 2. Matematická Logika (Výpočet Artboardu)

**Princip:** Artboard se vypočítává relativně k pozicím značek, které jsou ukotveny ke grafice.

### A. Výpočet Hran (Feed Logic)
1.  **Horní Hrana (Top):**
    *   Od horní hrany horní značky se přičte hodnota `Horní výjezd`.
2.  **Spodní Hrana (Bottom):**
    *   Od spodní hrany spodní značky se odečte hodnota `Spodní nájezd`.
3.  **Fixace Grafiky:**
    *   Používá se 4-prvkové pole pro Rect `[L, T, R, B]`, kde T a B jsou vypočteny absolutně, čímž se zamezuje "plavání" obsahu.

---

## 3. Uživatelské Rozhraní (UI)

Rozhraní je konsolidováno do jednoho okna o šířce **350px**. Panely jsou fixní, mění se pouze viditelnost řádků.

### A. Názvosloví (Labels)
*   **ZUND:**
    *   "Mezera od grafiky:"
    *   "Mezera od okraje:"
    *   "Rozteč značek:"
*   **SUMMA:**
    *   "Mezera od okraje:" (Only Outer Gap applies)
    *   "Rozteč značek:"
    *   "Horní výjezd (Top):"
    *   "Spodní nájezd (Bottom):"
    *   "Přidat ořezové linky" (Checkbox)

### B. Logika Vrstev (UI)
*   **Thru-cut:** Checkbox + Název barvy (Default: "cut").
*   **Kiss-cut:** Checkbox + Název barvy.
*   *Chování:* Zund defaultně zapíná Thru-cut, Summa/Hybrid defaultně zapíná Kiss-cut.

---

## 4. Správa Vrstev (Layer Engine)

### A. Ořezové Vrstvy (Thru/Kiss)
*   Tvoří se **POUZE** pokud je checkbox v UI zaškrtnutý.
*   Pokud není nalezena barva definovaná v textovém poli, skript vypíše varování, ale pokračuje.
*   Řazení: `Regmarks` (Top) -> `Thru-cut` -> `Kiss-cut`.

### B. Grafická Vrstva (Graphics)
*   Skript **nevytváří** novou vrstvu "Graphics" na vrchu.
*   **Algoritmus:**
    1.  Najde nejspodnější vrstvu v dokumentu.
    2.  Přejmenuje ji na `Graphics`.
    3.  Odemkne ji a zviditelní.
    4.  Přesune ji dospodu (`SendToBack`).
    5.  Pokud jsou aktivní **Červené linky**, nakreslí je přímo do této vrstvy.
