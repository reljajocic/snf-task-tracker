# Handoff: Slate 'n' Frame — interni task tracker

## Pregled
Interna web aplikacija (desktop + mobilni) za kreativnu agenciju Slate 'n' Frame (video produkcija, društvene mreže, sadržaj). Tim (Relja, Marko, Uroš, a kasnije i drugi) vidi šta se radi, za kog klijenta, ko radi i do kada. Aplikacija ima i modul **Sadržaj** (raspored objava i dani snimanja, napravljeni po uzoru na postojeće Google Sheets tabele) i **klijentski portal**, gde klijent preko tajnog linka vidi svoj raspored, snimanja i izveštaj, i odobrava skripte i videe.

## O fajlovima dizajna
Fajlovi u ovom paketu su **reference napravljene u HTML-u**: prototipovi koji pokazuju kako aplikacija treba da izgleda i kako se ponaša. To nije produkcijski kod za kopiranje. Zadatak je da se dizajn **ponovo izgradi** u izabranom okruženju (stack bira vlasnik, videti „Otvorene odluke”), sa pravim podacima, rutiranjem i backendom.

Otvori `Task Tracker.dc.html` u browseru. Ekrani su raspoređeni po blokovima (turn 1–7) sa oznakama `1a`, `2b`… Većina prototipa je interaktivna: filteri, prekidači, statusi, odobravanja i promena teme rade.

## Fidelity
**High-fidelity.** Boje, tipografija, razmaci i stanja su konačni. UI treba rekreirati verno, uz dizajn sistem Slate n' Frame (tokeni su dole).

## Otvorene odluke (odlučuje vlasnik, ne pretpostavljati)
- Stack i hosting
- Servis za slanje emailova (login linkom za tim, obaveštenja klijentima)
- Google Drive: samo link ili prava integracija
- Uvoz postojećih tabela (raspored NLG, tabele snimanja)

---

## Formati i jezik
- Ceo UI je na srpskom, latinica, sa č ć š ž đ. Fontovi moraju da učitaju latin-ext podskup (DM Sans iz Google Fonts sa `latin-ext`).
- Datum: **DD.MM.YYYY** (npr. 05.10.2026). U gustim prikazima je dozvoljen skraćeni oblik `05.10.` kad je godina jasna iz konteksta (zaglavlje nedelje, kalendar).
- Nedelja počinje **ponedeljkom**.
- Dani: Ponedeljak, Utorak, Sreda, Četvrtak, Petak, Subota, Nedelja (skraćeno Pon, Uto, Sre, Čet, Pet, Sub, Ned).
- Množina za „dan”: `n % 10 === 1 && n % 100 !== 11 ? 'dan' : 'dana'` („Kasni 1 dan”, „Kasni 3 dana”, „Kasni 21 dan”).
- Relativni rok: `< 0` → „Kasni N dana”, `0` → „Danas”, `1` → „Sutra”, `2–6` → ime dana, inače „Za N dana”. Završeno → „Završeno”.
- Naslovi su VELIKIM SLOVIMA, u display fontu. Ostalo je u sentence case.

---

## Model podataka

**ČlanTima**: id, ime, email, inicijal, boja avatara (bg/fg). Broj članova nije fiksan: sve liste, filteri i statistike se generišu iz tima.
- Relja `#F4A98D`/`#2F2D2E` · Marko `#C3BFAE`/`#2F2D2E` · Uroš `#767071`/`#F4F3ED`

**Klijent**: id, naziv, status (`aktivan | prospekt | pauza | završen`), usluge[], grad, saradnja_od (MM.YYYY), email, instagram, lokacije[], drive_link, portal (vidi dole).

**Projekat**: id, klijent_id, naziv, status, opis, period.

**Zadatak**: id, vrsta (`task | video | podzadatak`), naslov, opis, klijent_id, projekat_id, dodeljeno[] (jedan ili više članova), rok, status, prioritet, tip, drive_link, kreirao, kreirano, izmenjeno.
- status: `za_uraditi | u_toku | ceka_klijenta | gotovo`
- prioritet: `nizak | srednji | visok | hitno`
- tip (samo za `task`): Skripta, Snimanje, Montaža, Revizija, Objava, Sastanak, Administracija, Ostalo

**Video** (zadatak sa vrstom `video`) dodatno ima:
- faza: `skripta | snimanje | montaža | revizija | objava` (indeks 0–4; 5 = objavljeno)
- vlasnik (glavna dodeljena osoba), tip_sadržaja (FUN / INFO / GYM / UGC / PROMO; lista je podesiva po klijentu)
- osoba_na_snimku, lokacija, tekst (sekcije: Hook, Lead, Body 1–3, Open loop, CTA 1/2, slobodan tekst), referenca (link), napomena
- snimanje_id + vreme termina, datum_snimanja, termin_objave (datum), status_objave (`za_snimanje | snimljeno | objavljeno | nije_snimljeno`)
- verzije[] (za pregled od strane klijenta), komentari[]

**Podzadatak**: zadatak sa `parent_video_id`. Pravi se ručno, samo kad deo posla radi neko drugi (npr. „Montaža” za Uroša). Ima svoju osobu i rok i vidi se kao kartica na Kanbanu sa oznakom „↳ Naziv videa”.

**DanSnimanja**: id, klijent_id, datum, lokacija, vreme_od/do, ekipa[] (članovi tima), stavke = video zapisi sa `vreme` (termin) i `redni_broj`. Status stavke: `za_snimanje | snimljeno | nije_snimljeno`.

**TerminObjave**: klijent_id, datum. Podrazumevani dani su pon/sre/pet (podesivo po klijentu). Prazan termin = slot bez videa.

**Portal** (po klijentu): aktivan (bool), tajni_token (link `portal…/<klijent>/<token>`, može da se generiše novi, a stari tada prestaje da važi), vidljivost {raspored, snimanja, tekstovi, videi_za_pregled, izveštaj} (interni zadaci i napomene su UVEK skriveni), osobe[] {uloga, email, odobrava|samo_gleda}, log aktivnosti.

**Odobrenje**: objekat (video_verzija | skripta), status (`čeka | odobreno | izmene`), komentar, ime osobe (upisuje se pri prvom odobrenju, jer nema prijave), vreme.

---

## Poslovna pravila
- **Kasni**: rok < danas i status ≠ gotovo. Kartica tada dobija crveni okvir `--red-line`, a rok crveni chip (`--red-bg` / `--red-ink`). Rok danas: chip `--rust-bg` / `--rust-ink`.
- **Početna**:
  - „Danas i zakasnelo”: rok ≤ danas, status ≠ čeka_klijenta, sortirano po roku.
  - „Ove nedelje”: rok u narednih 1–7 dana, grupisano po danu.
  - „Čeka klijenta”: posebna lista, sortirana po tome koliko dugo čeka („Čeka N dana”).
  - Prekidač „Moji / Svi” filtrira ove tri sekcije (Moji = zadaci gde sam među dodeljenima). Statistike („Otvoreno”, po osobi i po klijentu) uvek prikazuju ceo tim.
- **Video tok**: skripta → (dodat na dan snimanja) snimanje → (na setu označen „Snimljeno”) montaža → (podzadaci završeni) revizija, status `ceka_klijenta` → (klijent odobrio) objava → (objavljeno) gotovo.
  - Kad se video na snimanju označi „Snimljeno”, pojavljuje se u rasporedu u listi „Snimljeno, bez termina”, odakle mu se dodeljuje termin.
  - Zadaci od videa sa snimanja prave se **ručno**, ne automatski.
- **Raspored**: termin čiji je datum prošao, a video nije objavljen → status „Nije objavljeno”, crveno.
- **Statusi u portalu** (klijent ne vidi interne statuse ni kašnjenja): objavljeno → „Objavljeno”; čeka odobrenje klijenta → „Čeka vaše odobrenje” (rust); spreman ili snimljen → „Spremno za objavu”; inače → „U pripremi”.
- **Odobravanje skripti ide po snimanju**: klijent dobija ceo dan snimanja (sve skripte), odobrava pojedinačno ili dugmetom „Odobri sve preostale” (preskače one sa traženim izmenama). Video se odobrava pojedinačno, po verziji.
- „Traži izmene” obavezno otvara polje za komentar. Posle slanja status je `izmene` i tim dobija obaveštenje.

---

## Navigacija
- **Desktop**: levi sidebar širine 240px (`--side`). Logo, pa stavke: Početna, Kanban, Kalendar, Lista zadataka, Klijenti, pa naslov grupe „SADRŽAJ”: Raspored objava, Snimanja. Aktivna stavka: pozadina `--chip`, levo narandžasta traka 3×18px. Dole su promena teme i korisnik.
- **Mobilni**: donja traka visine 84px sa 5 stavki: Početna, Zadaci (Kanban + Lista), Sadržaj, Kalendar, Klijenti. Aktivna stavka ima narandžastu traku 18×3px iznad labele.
- **„+ Novi zadatak”**: na desktopu u zaglavlju svakog ekrana (DS Button primary, sm), na mobilnom kao plutajuće dugme 64×64, `#EA693A`, desno 20px, 100px od dna.
- **Portal**: zaseban izgled. Gornja traka 72px: logo × naziv klijenta, tabovi Početna / Raspored / Snimanja / Izveštaji (aktivni tab je podvučen narandžastom linijom od 2px). Na mobilnom su ista 4 taba dole.

---

## Ekrani (oznake iz `Task Tracker.dc.html`)
Važi za sve: desktop okvir je 1440×900, mobilni 390×844. Mobilni dodirni ciljevi su najmanje 44px, a glavne akcije 56px.

| Oznaka | Ekran | Napomena |
|---|---|---|
| 1a / 1b | Početna | 2 kolone: levo „Danas i zakasnelo” + „Ove nedelje”, desno 340px „Otvoreno” + „Čeka klijenta”. Mobilni: segmentirani prekidač, statistike, sekcije, statistika po klijentu. |
| 1c / 1d | Kanban (osnovni) | **Zameniti verzijama 4a / 4e** (iste kolone, plus video kartice i filter po vrsti). |
| 2a | Raspored objava, tabela | Grupisano po nedeljama („Nedelja N” + opseg datuma), samo termini pon/sre/pet. Klik na red otvara tekst videa u 4 kolone. Prazni termini: „Slobodan termin · + Dodeli video”. Na dnu: „Snimljeno, bez termina”. Kolone: Datum, Naslov, Tip, Osoba, Lokacija, Status, Snimljeno. |
| 2b | Raspored, kalendar | Mesečna mreža 7 kolona (Pon–Ned) sa oznakom nedelje N5–N9. Kartica objave: tačka statusa + tip + naslov (do 2 reda) + osoba. Desno 260px: „Bez termina” (prevlačenje na dan). |
| 2c | Raspored, mobilni | Lista / Kalendar. U kalendaru tap na dan prikazuje objave tog dana. |
| 2d | Snimanje, desktop | Zaglavlje: klijent · lokacija, datum, „Kopiraj link za snimane”. Traka napretka + ekipa. Levo stavke grupisane po terminu (vreme u display fontu + osoba, „Sada” chip). Desno 440px ceo tekst izabranog videa + Snimljeno / Nije snimljeno. |
| 2e | Snimanje, mobilni (na setu) | Kartica trenutnog termina (rust okvir), dugmad visine 56px. Zatim „Sledeće” sa brzim čekiranjem i sklopljeni „Završeni termini”. |
| 3a | Detalji zadatka | Bočni panel 600px preko zatamnjene table (`rgba(28,26,27,.62)`). Polja se menjaju na mestu: Status, Prioritet, Dodeljeno (više osoba), Rok (popover kalendar + brzi izbor), Klijent, Projekat (zavisi od klijenta), Tip, Google Drive, Opis. Čuva se automatski. |
| 3b | Novi zadatak | Modal 760px. „Sačuvaj zadatak” je onemogućen dok naslov nije unet. Brzi rokovi: Danas, Sutra, Ponedeljak, Za 7 dana. |
| 3c / 3d | Detalji / novi zadatak, mobilni | Krupni chipovi, red „Rok” otvara bottom sheet sa kalendarom. Stalna akcija dole: „Označi kao gotovo” / „Sačuvaj zadatak”. |
| 4c | Dijagram toka videa | Referenca za logiku, nije ekran u aplikaciji. |
| 4a / 4e | Kanban | Kolone Za uraditi / U toku / Čeka klijenta / Gotovo. Filteri: Sve / Samo video / Ostalo, i po osobi. Video kartica: oznaka „VIDEO”, traka 5 faza (završene `--ink2`, trenutna `#EA693A`, buduće `--line2`) i labela „Montaža · 3/5”. Na mobilnom su kolone tabovi. |
| 4b / 4d | Detalji videa | Stepper 5 faza (klik menja fazu) + „Prebaci u: …”. Mreža: osoba na snimku, lokacija, snimanje, objava. Podzadaci sa čekiranjem, tekst, referenca, Drive. |
| 5a / 5b | Lista zadataka | Filteri (osoba, klijent, status, prioritet, tip) kao pill-select, aktivni su istaknuti. „Poništi filtere”, prekidač „Prikaži završene”, sortiranje klikom na „Rok ↑/↓”. Na mobilnom su kartice, chipovi osoba i panel „Filteri · N”. |
| 5c / 5d | Kalendar zadataka | Mesec / Nedelja, rok bojen po prioritetu, zakasnelo crveno, vikend `--chip`. Na mobilnom: nedeljna traka ili mesečna mreža sa tačkama + lista izabranog dana. |
| 6a / 6c | Klijenti | Tabovi po statusu sa brojem. Kolone: Klijent (inicijali u kvadratu 38px), Status, Usluge (chipovi), Otvoreno (+ „N kasni”), Sledeći rok, Saradnja od. |
| 6b / 6d | Stranica klijenta | Zaglavlje sa statusom i uslugama. Levo zadaci (Otvoreni / Završeni) i projekti, desno kontakt i prečice (Raspored, Snimanja, Drive). |
| 6e / 6f | Login | Prijava linkom na email (bez lozinke), pa ekran „Proveri email” (link važi 15 min). Levi panel: `#1C1A1B`, grain, rust glow, ikonica blende 420px koja rotira (60s, linear). |
| 7a / 7e | Portal, početna | „Čeka vaše odobrenje” (video kartica + kartica „Skripte za snimanje” sa napretkom), sledeće objave, sledeće snimanje, izveštaj za mesec (ukupno i po tipu). |
| 7b | Portal, raspored | Kao 2a, ali sa klijentskim statusima. Red koji čeka odobrenje ima `--rust-bg` i „Pogledaj →”. |
| 7c / 7f | Portal, odobrenje videa | Vertikalni player 9:16 (400×640), verzije, tekst, komentar tima, „Odobri” / „Traži izmene” sa komentarom, potvrda i „Poništi”. |
| 7g / 7h | Portal, skripte za snimanje | Tabela svih skripti dana snimanja, red se otvara klikom. Po redu Izmene / Odobri, gore napredak i „Odobri sve preostale (N)”. |
| 7d | Naš ekran: podešavanje portala | Prekidač „Portal aktivan”, tajni link (Kopiraj / Napravi novi), vidljivost po modulu (interno je uvek skriveno), osobe kod klijenta, poslednja aktivnost. |

---

## Design tokeni

### Fontovi
- Display: **Uni Neue Black** (900), uppercase, line-height 0.96–1.1. Fajl `assets/fonts/UniNeueBlack.otf` je u dizajn sistemu. Ima č ć š ž đ.
- Telo: **DM Sans** 400/500/600/700 (Google Fonts, sa latin-ext).
- Skala u aplikaciji: H1 stranice 44px desktop / 30–34px mobilni; naslov sekcije 20px (mobilni 17–19); naslov nedelje 15px; telo 15px (mobilni 16–17); labela 13px; eyebrow 11–13px 600, letter-spacing .14em, uppercase.

### Boje: tamna tema (podrazumevana)
```
--bg #2F2D2E   --side #1C1A1B   --surf #3B3839   --surf2 #454142
--line rgba(244,243,237,.10)   --line2 rgba(244,243,237,.18)
--ink #F4F3ED  --ink2 rgba(244,243,237,.70)  --ink3 rgba(244,243,237,.48)
--chip rgba(244,243,237,.07)
--red-bg rgba(224,71,58,.18)  --red-ink #F58A78  --red-line rgba(224,71,58,.55)
--rust-bg rgba(234,105,58,.16) --rust-ink #F09A78
--seg #F4F3ED  --seg-ink #2F2D2E   (aktivni segment/chip)
```
### Boje: svetla tema
```
--bg #F4F3ED   --side #EAE8DE   --surf #FCFCF9   --surf2 #FFFFFF
--line rgba(47,45,46,.10)   --line2 rgba(47,45,46,.20)
--ink #2F2D2E  --ink2 rgba(47,45,46,.72)  --ink3 rgba(47,45,46,.52)
--chip rgba(47,45,46,.05)
--red-bg rgba(224,71,58,.12)  --red-ink #B3301F  --red-line rgba(179,48,31,.45)
--rust-bg rgba(234,105,58,.14) --rust-ink #9E4021
--seg #2F2D2E  --seg-ink #F4F3ED   logo: filter brightness(.19)
```
Akcenat: `#EA693A` (CTA, aktivna navigacija, „danas”, trenutna faza). Koristiti ga štedljivo.

### Semantičke boje (iste u obe teme)
- Prioritet (kvadratić 8–9px, radius 2): Nizak `#8F898A` · Srednji `#5B8EC2` · Visok `#EA693A` · Hitno `#E0473A`
- Status zadatka (tačka): Za uraditi `#A9A496` · U toku `#4FA3A5` · Čeka klijenta `#D6A93E` · Gotovo `#6FAE7B`
- Status videa / objave: Za snimanje `#A9A496` · Snimljeno `#4FA3A5` · Objavljeno `#6FAE7B` · Nije snimljeno / Nije objavljeno `#E0473A`
- Status klijenta: Aktivan `#6FAE7B` · Prospekt `#EE8560` · Pauza `#D6A93E` · Završen `#8F898A`

Plava, crvena, tirkizna, žuta i zelena su dodate na zahtev vlasnika i izlaze iz osnovne palete brenda od 3 boje. Namerno su prigušene.

### Oblici i razmaci
- Radius: kartice 8px (mobilni 10px), dugmad i inputi 6–8px, chipovi i pilule su potpuno zaobljeni, avatar je krug. Okvir mobilnog prototipa (32px) nije deo UI-a.
- Okviri: hairline od 1px (`--line` / `--line2`). Senke samo na overlay-ima (`0 16px 40px rgba(0,0,0,.4)`) i FAB-u.
- Padding sadržaja: desktop 40px horizontalno, mobilni 20px. Razmak između sekcija 36–40px, između kartica 8–12px.
- Avatari: 26–32px, inicijal 600, preklapanje -8px sa prstenom 2px u boji pozadine.
- Oznaka tipa: 11px 600, letter-spacing .08em, padding 4×6, okvir `--line2`, radius 3.

### Pokret
- Prelazi su kratki: `--dur-fast` / `--ease-standard` iz dizajn sistema, bez bounce efekata.
- Brend ikonica u loginu: `snf-spin-slow` 60s linear infinite. Ikonica „pulse” pored „Čeka klijenta”: `snf-pulse-scale` 2.4s.

---

## Assets
- `assets/logo-off-white.png`: logo (na svetloj temi `filter: brightness(.19)`)
- `assets/icons/pulse-rust.png`, `assets/icons/aperture-rust.png`: brend ikonice (dizajn sistem)
- `assets/grain.png`: tekstura zrna filma (login)
- `assets/gritty-bw.png`: **placeholder** za poster videa u portalu. Zameniti pravim thumbnail-om ili playerom.
- Dizajn sistem: `_ds/slate-n-frame-design-system-…/` (tokeni, fontovi, `_ds_bundle.js` sa komponentama Button, AnimatedIcon itd.)

## Fajlovi
- `Task Tracker.dc.html`: svi ekrani i interaktivni prototip (otvoriti u browseru; zahteva `support.js` i `_ds/` pored sebe)
- `support.js`: runtime za prototip (samo za pregled, ne prenositi)

## Primer podataka
Podaci u prototipu su realistični, ali izmišljeni: kontakt NoLimit Gym-a, brojevi u izveštaju, deo zadataka. Naslovi videa, osobe i lokacije su preuzeti iz postojećih NLG tabela. „Danas” u prototipu je petak, 02.10.2026.
