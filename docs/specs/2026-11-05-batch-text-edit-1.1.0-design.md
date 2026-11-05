# Návrh — Batch Text Edit 1.1.0: hranice Do, pořadí po aršících, zbylé proměnné

Nástroj: `batch-text-edit`, namespace `BTE`.
Navazuje na [návrh 1.0](2026-10-29-batch-text-edit-design.md); co tu není,
platí podle něj.

Datum: 2026-11-05 · Stav: **návrh**, čeká na schválení

Vzniklo z oponentury tezí, které uživatel nechal vypracovat v Gemini
(2026-10-31), z auditu těch tezí proti kódu 1.0.0 (2026-11-04)
a z rozhodnutí uživatele 2026-11-05. Přidává tři drobnosti z finálního
review 1.0.0 (M1, M5, M6).

---

## 1. Proč

- **Do vypadá jako hranice, ale je jen kontrola.** Při prvním testu
  uživatel zadal Od 1, Do 20 a čekal 20 čísel. Skript očísloval všechny
  prvky a jen varoval, jak to chtělo rozhodnutí 8 návrhu 1.0. Popisek
  „Do“ slibuje víc, než pole dělá.
- **Arch z aršíků nejde očíslovat jedním během.** Na archu z 20 aršíků po
  12 samolepkách dostane levý horní aršík čísla 1, 2, 3, 13, 14, 15, 25…
  (test 2026-10-29, §4.3 návrhu 1.0). Souvislá řada po aršících dnes
  znamená 20 běhů a 20× ručně posunout Od.
- **Zbylá proměnná se nehlásí.** Když řetěz nechá v textu `{kód}`, ukáže
  to náhled jen v řádku prvku. Holá závorka na tiskovém archu je chyba,
  a s hranicí Do bude častější.

## 2. Rozhodnutí

Číslování navazuje na tabulku návrhu 1.0.

| # | rozhodnutí | kdo |
|---|---|---|
| 19 | Do je konec řady. Prvek, jehož číslo by Do překročilo, zůstane v kroku beze změny; nová řada (Znovu po, nový aršík) začne znovu na Od. Nahrazuje rozhodnutí 8 | uživatel 2026-11-05 (hranice; „konec řady, ne kroku“ po příkladu s aršíky) |
| 20 | Pořadí Po aršících jako výslovná volba s nápovědou. Aršík = skupina přímo nad skupinou prvku. Nahrazuje rozhodnutí 13; anti-cíl „pořadí podle neviditelné struktury“ platí dál pro výchozí stav, protože volba je vypnutá a zapnutá ukáže aršík v náhledu | uživatel 2026-11-05 (volba, nápověda, „univerzální a hlavně spolehlivé“); definice aršíku **moje volba** podle auditu |
| 21 | Proměnné, které zůstanou po posledním kroku, jen ohlásit ⚠; Použít zůstane aktivní | uživatel 2026-11-05 (bez námitky k návrhu „jen upozornit“) |
| 22 | Víc bloků v jednom běhu (cíl kroku, rozsah indexů) ne. Dál víc běhů s výběrem bloku, rozhodnutí 3 platí | uživatel 2026-11-05 |
| 23 | Seznam hodnot, kroky Vložit a Ořezat, filtr náhledu a dialog do 720 px zůstávají v §12 návrhu 1.0 | **moje volba** podle auditu; žádná zakázka o ně zatím nežádá |
| 24 | Číslovat má volbu Znovu od začátku v každém aršíku; platí jen s Pořadím po aršících | uživatel 2026-11-05 |

## 3. Do jako hranice

### 3.1 Pravidlo

Hodnota prvku s pořadím *i* se počítá dál podle §5.3 návrhu 1.0 (Od,
Krok, Opakovat, Znovu po); u volby v každém aršíku je *i* pořadí v aršíku
(§3.4). Nově:

- **Do je konec řady.** Prvek dostane číslo jen tehdy, když jeho hodnota
  nepřekročí Do ve směru Kroku: pro Krok ≥ 0 musí být hodnota ≤ Do, pro
  Krok < 0 hodnota ≥ Do. Prvek za hranicí zůstane v tomto kroku beze
  změny.
- **Nová řada začne znovu na Od** a končí zase na Do: u Znovu po po daném
  počtu prvků, u volby v každém aršíku v dalším aršíku. Bez nové řady
  zůstane beze změny celý zbytek kroku.
- **Díry:** hodnoty v řadě jen rostou (Krok ≥ 0) nebo jen klesají
  (Krok < 0), takže uvnitř řady díra nevznikne; za hranicí je vždy jen
  konec řady. Mezi řadami zůstanou prvky za Do beze změny a hláška je
  spočítá (§3.2).
- **Prázdné Do** = bez hranice, jako v 1.0.
- **Od už za hranicí** (Od 10, Do 5, Krok 1; nebo Krok 0 a Od > Do): ✗
  „Od je za hranicí Do, krok by nic neočísloval.“ Zablokuje Použít, protože
  krok, který mlčky nic neudělá, je skoro jistě překlep.
- **Krok 0:** všechny hodnoty jsou Od; když Od nepřekročí Do, očísluje se
  vše.
- **Formát písmen:** Do je celé číslo jako Od (Do 26 = Z), beze změny.

### 3.2 Hlášky

Obě jsou ⚠ a Použít zůstane aktivní.

- **Řada skončila na Do:** „Do 20: číslo dostalo 20 prvků, 220 zůstane beze
  změny.“ Počty jsou součtem přes všechny řady a jdou přes `L.count` podle
  kánonu. Nahrazuje „Prvků je o N víc.“
- **Řada nedošla k Do:** jedna řada beze změny proti 1.0: „Poslední číslo
  vyjde 24, v poli Do je 30.“ a při Opakovat 1 a prázdném Znovu po „Chybí
  6 prvků.“ U volby v každém aršíku jedna souhrnná hláška: „Ve 2 aršících
  řada nedojde k Do 10.“

U Kde „První číslo v prvku“, Jiný text a Regulární výraz si prvky za
hranicí nechají původní text, tedy i staré číslo, a na archu může vzniknout
dvojí číslo. Bez závorek nic jiného nehlídá (§5), proto hláška říká počet
výslovně.

### 3.3 Důsledky

- **Navazující krok:** v prvcích za hranicí proměnná zůstane, takže ji další
  krok najde a nabídka Kde ukáže jejich počet. Krok 1 Číslovat `{n}` Od 1
  Do 60 a krok 2 Číslovat `{n}` Od 1 očísluje zbylých 180 prvků od 1. Je to
  vedlejší důsledek, ne nová funkce. Bloky s různými kódy dál řeší výběr
  bloku (rozhodnutí 22), protože dva nezávisle omezené kroky se rozejdou,
  jakmile jednomu prvku chybí jedna z proměnných.
- **Předvolby z 1.0.0** s vyplněným Do dřív varovaly a teď zastaví. Formát
  předvolby se nemění. Náhled to ukáže před zápisem a CHANGELOG to řekne.
- **Nápověda** `TIP_TO`: „Nepovinné: poslední číslo řady. Prvky, na které
  číslo nezbude, zůstanou beze změny a náhled je ohlásí.“

### 3.4 Znovu v každém aršíku

- **Zaškrtávátko „v každém aršíku“** vedle pole Znovu od začátku po
  v editoru kroku Číslovat. Ukládá se do kroku pod klíčem `perSheet`;
  krok z 1.0.0 bez klíče = vypnuto.
- **Zapnuté:** počítadlo začne v každém aršíku znovu, takže první prvek
  aršíku dostane Od a Do ukončí řadu v každém aršíku zvlášť. Funguje
  i u aršíků s různým počtem prvků, kde Znovu po selže. Prvky mimo aršík
  (na konci, §4.2) tvoří jednu poslední řadu.
- **Se Znovu po zároveň:** Znovu po počítá prvky uvnitř aršíku.
- **Bez Pořadí po aršících** je zaškrtávátko šedé a krok ho nepoužije. Když
  ho má zapnuté předvolba a Po aršících vypnuté, ⚠ „Krok 2: v každém aršíku
  platí jen s Pořadím po aršících.“
- **Nápověda:** „Řada začne v každém aršíku znovu na Od a skončí na Do.
  Platí jen s Pořadím po aršících.“
- **Příklad:** 20 aršíků po 12, Od 1, Do 10 → v každém aršíku 1–10, dvě
  samolepky na aršík beze změny, ⚠ „Do 10: číslo dostalo 200 prvků, 40
  zůstane beze změny.“

## 4. Pořadí po aršících

### 4.1 Co je aršík

- **Aršík je nejbližší skupina nad skupinou prvku.** Příprava dat:
  samolepka = skupina se svými texty (Cmd+G), aršík = skupina samolepek
  (Cmd+G). Celý arch může, ale nemusí být seskupený.
- **Libovolná hloubka:** u aršíku v aršíku rozhoduje ten nejbližší nad
  prvkem.
- **Ořezová skupina** se počítá jako skupina, takže aršík s maskou je
  aršík. Hranice aršíku se počítají jako hranice prvku (§4.3 návrhu 1.0:
  maska, sjednocení dětí).
- **Prvek bez aršíku:** skupina prvku leží přímo ve vrstvě, nebo jde
  o geometrický prvek či samotný text (§4.2 návrhu 1.0).
- Pravidlo prvku se nemění: texty, které leží přímo v aršíku bez vlastní
  skupiny, jsou dál jeden prvek, tedy celý aršík (README, Co je prvek).

### 4.2 Řazení

- **Volba vypnutá** (výchozí): beze změny proti 1.0.
- **Volba zapnutá:**
  1. Aršíky se seřadí podle svých hranic stejným Pořadím (Po řádcích /
     Po sloupcích, pravidla §4.3 návrhu 1.0, tolerance z mediánu aršíků).
  2. Prvky uvnitř každého aršíku se seřadí stejným Pořadím, s tolerancí
     z mediánu prvků toho aršíku.
  3. Prvky bez aršíku přijdou až za poslední aršík, mezi sebou podle
     Pořadí. Smíšené velikosti by jinak rozbily toleranci řádků.
  4. Shoda: rozhodne `tie` jako v 1.0; aršík nese nejmenší `tie` svých
     prvků.
- **Číslování jde přes aršíky souvisle:** aršík 1 dostane 1–12, aršík 2
  13–24 a tak dál. Řadu od Od v každém aršíku zvlášť zapíná krok Číslovat
  volbou v každém aršíku (§3.4).
- **Přepnutí volby jen přeřadí prvky**, nečte znovu dokument (jako změna
  Pořadí přes `BTE.Scope.reorder`). Aršík každého prvku se proto zjistí
  už při čtení rozsahu.

### 4.3 Co uživatel vidí

- **Ovládání:** zaškrtávátko **Po aršících** vedle Pořadí v panelu Rozsah.
  Ukládá se do předvolby spolu s Pořadím pod klíčem `bySheet`; předvolba
  z 1.0.0 bez klíče = vypnuto.
- **Nápověda** (nejvýš dvě věty podle kánonu): „Aršík je skupina, ve které
  leží skupiny prvků; číslování projde celý aršík, než přejde na další.
  Aršíky i prvky v nich jdou podle Pořadí, prvky mimo aršík až na konec.“
- **Náhled:** se zapnutou volbou ukáže sloupec # aršík a pořadí, např.
  `3 · 25`; vypnutá volba ukáže `25` jako dnes. Šířku ověří sonda dialogu;
  když se nevejde, přibude samostatný sloupec Aršík (**moje volba**, §10).
- **Souhrn rozsahu:** „240 prvků ve 20 aršících“.
- **Hlášky ⚠** (jen se zapnutou volbou, Použít zůstane):
  - „Žádný prvek neleží v aršíku; pořadí je stejné jako bez volby.“
  - „Každý aršík má jen jeden prvek; zkontrolujte, jestli jsou samolepky
    seskupené zvlášť.“ Typicky jde o samolepku s maskou, kde se jako aršík
    chytí její vlastní ořezová skupina.
  - „5 prvků neleží v aršíku, přijdou na konec.“

### 4.4 Spolehlivost

- **Sonda jen pro čtení** (0 otevřených dokumentů uživatele) na třech
  souborech uživatele z 2026-10-29. U aršíků 3×4 čeká 20 aršíků po 12
  a čísla 1–12 v levém horním aršíku. Skupina a bez skupin musí dát pořadí
  shodné s 1.0.
- **Syntetické případy:** aršík s maskou, aršík v aršíku, smíšený arch
  (část prvků mimo aršík), aršík s jedním prvkem, výběr jednoho aršíku.
- **Node testy:** Order nad aršíky, smíšené prvky, `tie`, reorder s volbou
  a bez ní.
- **Výkon:** druhé řazení jde nad desítkami aršíků a je zanedbatelné;
  ověří se na 240 prvcích.

## 5. Zbylé proměnné

- Po posledním kroku najde nástroj proměnné, které v konečném textu
  zůstaly (`BTE.Vars.list` nad posledním stavem, pravidlo proměnné z 1.0).
- **⚠ „Po posledním kroku zůstává {n} ve 220 prvcích.“** Jedna hláška na
  proměnnou, nejvýš tři, pak „a další (N)“. Ukáže se v seznamu hlášek, ve
  stavovém řádku a v Souhrnu po zápisu.
- **Použít zůstane aktivní** (rozhodnutí 21): druhý běh může proměnnou
  nahradit záměrně a složené závorky můžou být běžný text.
- Texty bez závorek tato kontrola nehlídá; tam chrání jen hláška hranice
  Do (§3.2).

## 6. Drobnosti z review 1.0.0

- **M1:** hláška o neočekávané chybě radí Cmd+Z, i když se nic nezapsalo
  (selhání při čtení dokumentu nebo v kontrole před zápisem). Nově se řídí
  tím, zda zápis začal: před prvním zápisem řekne „Dokument nebyl změněn.“
  Test v `test_main.js`.
- **M5:** pokyn „potvrďte Použít znovu“ se ukáže jen tehdy, když je Použít
  po přepočtu aktivní.
- **M6:** `guard()` nejdřív zašedí tlačítka a pak kreslí stav. Vyhozená
  hodnota, která není Error, se ukáže přes `String()`, ne jako „undefined“.

## 7. Co se nemění

Rozsah, pravidlo prvku, kroky Nahradit a Velikost písmen, zápis a záruky
(§7 návrhu 1.0: náhled = zápis, kontrola po zápisu, jedno Zpět), velikost
dialogu a formát předvoleb kromě klíčů `bySheet` a `perSheet`.

**Verze:** změna Do je změna chování, kterou si předvolba z 1.0.0 přenese.
Podle SemVer by obhájila i 2.0.0. Navrhuji 1.1.0: 1.0.0 je dva dny venku,
používá ho jen autor a náhled změnu ukáže před každým zápisem. CHANGELOG ji
uvede v sekci Změněno.

## 8. Ověření

- **Node:**
  - `steps`: hranice Do pro Krok kladný, záporný a 0, Opakovat, Znovu po
    (každá řada končí na Do), písmena, Od za Do ✗ a obě hlášky;
  - `steps`: v každém aršíku s aršíky různé velikosti, se Znovu po,
    s prvky mimo aršík jako poslední řadou a bez Pořadí po aršících ⚠;
  - `order` a `scope`: aršíky (§4.4);
  - `ui_model`: zbylé proměnné, hlášky aršíků a plurály;
  - `storage`: chybějící `bySheet` a `perSheet` = vypnuto;
  - `main`: M1;
  - ES3 sken.
- **Sondy:**
  - scope: aršíky na souborech uživatele (§4.4);
  - dialog: šířka sloupce #, zaškrtávátko v řádku Pořadí v CS i EN,
    rozměr dál 1008×768.
- **Ruční test:** `manual-test.md` dostane oddíly Do jako hranice, Po
  aršících a Znovu v každém aršíku na souboru aršíky 3×4 a Zbylé
  proměnné. Brány vydání: 4.1, 4.2, 6.3–6.5 jako v 1.0.0 (dotkne se jich
  M1 a M5) a nově hranice Do, pořadí po aršících a řada v každém aršíku.

## 9. Později

Doplněk k §12 návrhu 1.0:

- Cíl kroku (aršík, rozsah prvků), rozhodnutí 22.
- Ze seznamu, Vložit, Ořezat; filtr náhledu „jen změněné“; dialog do
  720 px pro obrazovky 1366×768.

## 10. Otevřené

- **Tvar sloupce #:** `3 · 25`, nebo samostatný sloupec Aršík. Rozhodne
  sonda dialogu (šířka v CS i EN).
