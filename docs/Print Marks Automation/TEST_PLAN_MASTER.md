# MASTER TEST PROTOKOL (v25.2+)
**Filozofie:** Tento dokument slouží k harmonizaci reality skriptu s vašimi potřebami. Pokud se skript chová "přesně podle zadání", ale pro vás je to v praxi špatně, uveďte to v sekci **MŮJ POŽADAVEK**.

---

## 🏗️ TC-00: PŘÍPRAVA DAT
**Akce:** Spusťte `Scripts/Tools/Generate_Test_Grid.jsx`.
**Teoretický předpoklad (Skript):** Vytvoří se mřížka 10x10 samolepek s ořezem a maskami pro simulaci reálného archu.

*   **Reálný Výsledek / Stav:** [ OK ]
*   **MŮJ POŽADAVEK (Jak to chci já):**
    > 

---

## 🧠 SEKCE 1: UI, PAMĚŤ A LOGIKA

### [1.1] Persistence (Paměť nastavení)
**Akce:** Změňte libovolnou hodnotu (např. Top Margin na 99) -> OK -> Spusťte skript znovu.
**Teoretický předpoklad (Skript):** Skript si načte z `settings.json` hodnotu 99 a zobrazí ji v poli.

*   **Reálný Výsledek / Hodnota:** [ OK ]
*   **MŮJ POŽADAVEK (Jak to chci já):**
    > Vypadá že skript si pamatuje hodnoty. Chci aby si pamatoval i stav zámků.

### [1.2] Inteligentní Přepínání Módů
**Akce:** Přepněte mode z Echo na Summa. Pak zpět na Echo.
**Teoretický předpoklad (Skript):** Při Summě se "Zakládací okraje" samy zaškrtnou. Při návratu na Echo se samy odškrtnou.

*   **Reálný Výsledek / Stav:** [ OK ]
*   **MŮJ POŽADAVEK (Jak to chci já):**
    > Toto chování je v pořádku, zakládací okraje se týkají pouze plotteru Summa.

---

## 📏 SEKCE 2: GEOMETRIE A PŘESNOST (Měření)

### [2.1] Summa OPOS - Odsazení středu
**Akce:** Mód Summa, Calc: Resize. Změřte vzdálenost od hrany grafiky ke STŘEDU čtvercové značky.
**Teoretický předpoklad (Skript):** Výsledek musí být přesně 10.00mm.

*   **Reálný Výsledek / Hodnota:** [ 10 ] mm
*   **MŮJ POŽADAVEK (Jak to chci já):**
    > Toto je v pořádku. V dokumantci výrobce je to uvedeno jako minimální vzdálenost.

### [2.2] Hybrid - Mezera mezi systémy
**Akce:** Mód Hybrid, Calc: Resize. Změřte mezeru mezi hranou čtverce (Summa) a hranou kruhu (Echo).
**Teoretický předpoklad (Skript):** Mezera (čistý prostor) musí být přesně 5.00mm.

*   **Reálný Výsledek / Hodnota:** [ 5 ] mm
*   **MŮJ POŽADAVEK (Jak to chci já):**
    > To je v pořádku 5mm mezeru mezi systém jsem zvolil jeko bezpečnou minimální vzdálenost.

### [2.3] Feed Margins - Čisté okraje
**Akce:** Zapněte Feed, Top: 70mm, Bottom: 50mm. Změřte vzdálenost od grafiky k okraji plátna (Artboardu).
**Teoretický předpoklad (Skript):** Nahoře bude přesně 70mm a dole 50mm čistého bílého místa.

*   **Reálný Výsledek / Hodnota:** [ nahoře je 70 a dole 50 ] mm
*   **MŮJ POŽADAVEK (Jak to chci já):**
    > Okraje jsou v pořádku jen linka mezi značkami nyní není striktně mezi značkami, ale nevím proč je umísěná pod nimi. Zadáno odsazení strředu 10 a mezera značky orkaj 0..

---

## 🖼️ SEKCE 3: ARTBOARD A VRSTVY

### [3.1] Fix Mode (Zachování plátna)
**Akce:** Calc: Fix (Artboard).
**Teoretický předpoklad (Skript):** Rozměr plátna se nezmění ani o setinu mm. Z značky se vykreslí dovnitř.

*   **Reálný Výsledek / Stav:** [ OK ]
*   **MŮJ POŽADAVEK (Jak to chci já):**
    > Fix logiku bych zachoval pouze ECHO módu nebo ji úplně zrušil. Správně by měla být aktivní, možnost zadávat hodnotu posunu buď mezi okrajem, nebo jen mezi grafikou a ne obě zároveň.

### [3.2] Resize Mode (Obepínání s maskami)
**Akce:** Calc: Resize. Použijte grafiku s přesahy maskovanou ořezem.
**Teoretický předpoklad (Skript):** Skript najde `geometricBounds` (střed cesty) ořezu a ignoruje grafiku "pod maskou".

*   **Reálný Výsledek / Stav:** [ OK ]
*   **MŮJ POŽADAVEK (Jak to chci já):**
    > vypadá že je vše v pořádku.

### [3.3] Třídění do Vrstev
**Akce:** Sledujte panel Vrstvy.
**Teoretický předpoklad (Skript):** Objekty s barvou "Cut" jsou v "Thru-cut", objekty "Kiss-cut" v "Kiss-cut". Nevznikají duplicity jako "Thru-cut 2".

*   **Reálný Výsledek / Stav:** [ OK ]
*   **MŮJ POŽADAVEK (Jak to chci já):**
    > Funguje v pořádku.

---

**Podpis testera:** Ladislav Osvald
**Datum:** [ 24.1.2026 ]
