# Bardienst-rooster

Een webpagina waar leden van de toneelvereniging hun naam invullen voor de
diensten waar ze kunnen: **Onthaal**, **Bar** en **Kassa**. Per dienst kunnen
meerdere mensen zich opgeven. Je leden hebben geen account nodig: een link is genoeg.

Alles wordt opgeslagen in een Google Sheet. Daar kan je ook zelf de speeldagen
aanpassen en alle inschrijvingen bekijken.

![Voorbeeld](voorbeeld-computer.png)

## Installatie (±10 minuten, eenmalig)

1. Ga naar [sheets.new](https://sheets.new) en maak een nieuw Google Sheet,
   bijvoorbeeld *Bardienst 2026*.
2. Kies in het menu **Extensies → Apps Script**.
3. Vervang de inhoud van `Code.gs` door de inhoud van [`Code.gs`](Code.gs) uit deze map.
4. Klik links naast **Bestanden** op **+ → HTML**, noem het bestand `index`
   (zonder `.html`) en plak de inhoud van [`index.html`](index.html) erin.
5. Klik op **Opslaan** (diskette-icoon).
6. Klik rechtsboven op **Implementeren → Nieuwe implementatie**.
   - Type (tandwieltje): **Web-app**
   - Uitvoeren als: **Ik**
   - Wie heeft toegang: **Iedereen**
7. Klik op **Implementeren** en geef toestemming. Google waarschuwt dat de app
   "niet geverifieerd" is: kies **Geavanceerd → Ga naar … (onveilig)**. Dat is
   normaal voor je eigen script.
8. Kopieer de **URL van de web-app** (eindigt op `/exec`). Die link stuur je naar
   je leden, bijvoorbeeld via mail of WhatsApp.

Bij de eerste keer openen maakt het script twee tabbladen aan in je Sheet:

| Tabblad          | Wat staat erin                                                        |
|------------------|-----------------------------------------------------------------------|
| `Speeldagen`     | Eén rij per voorstelling: datum en optionele info (bv. "Première").   |
| `Inschrijvingen` | Wie zich voor welke dienst op welke dag heeft ingeschreven.           |
| `Opmerkingen`    | De vrije opmerking (max. 200 tekens) van elke persoon.                |

Het rooster wordt tot 5 minuten in de cache van Google bewaard, zodat de pagina
snel laadt. Pas je zelf iets aan in het Sheet, dan wordt die cache automatisch
leeggemaakt.

## Aanpassen

- **Speeldagen toevoegen of wijzigen**: pas het tabblad `Speeldagen` aan (datum
  in kolom A). De webpagina toont automatisch de nieuwe lijst. Voorbije dagen
  worden grijs weergegeven.
- **Andere diensten**: pas `FUNCTIES` bovenaan `Code.gs` aan (het getal `nodig`
  is alleen voor jezelf; leden zien het niet). Klik daarna op **Implementeren → Implementaties beheren →
  potloodje → Versie: Nieuwe versie → Implementeren**, zodat de link hetzelfde blijft.
- **Titel**: pas `TITEL` aan in `Code.gs`.
- **Nieuw seizoen**: maak het tabblad `Inschrijvingen` leeg (behalve de kopregel)
  en zet de nieuwe datums in `Speeldagen`.

## Hoe werkt het voor leden

Alles staat op één pagina, onder elkaar:

1. Bovenaan een korte uitleg, daarna het veld **Jouw naam** (wordt onthouden op
   hun toestel). Zolang er geen naam is, zijn de knoppen gedempt.
2. Daarna alle speelavonden, elk met de rollen onthaal, bar en kassa. Per rol
   kiezen ze **Ik help graag (voorkeur)** of **Ik kan eventueel ook**. Meerdere
   avonden en rollen mag. Kunnen ze niet, dan duiden ze niets aan. Nog eens
   klikken haalt een keuze weg.
3. Onderaan één vrij **opmerkingenveld** (max. 200 tekens, optioneel). Het wordt
   bewaard als ze het veld verlaten, of met de knop **Opmerking bewaren**.

Keuzes worden meteen bewaard. **Leden zien alleen hun eigen keuzes**, nooit die
van anderen, en ook geen aantallen: de pagina krijgt van de server alleen de
keuzes van de ingevulde naam. Jij ziet alles in het Sheet. In het tabblad
`Inschrijvingen` staat de keuze in de kolom `Voorkeur` als `liefst` (voorkeur) of
`kan` (eventueel). Opmerkingen staan in het tabblad `Opmerkingen`. Een naam moet
minstens één letter bevatten (dus niet "0" of "..."). Voorbije speelavonden
worden niet meer getoond.

Let op: een naam is geen wachtwoord. Wie exact dezelfde naam intypt, ziet en
wijzigt de keuzes van die naam. Voor een toneelvereniging is dat meestal oké.

## Uitproberen zonder installatie

Open `index.html` gewoon in je browser. Je ziet dan een voorbeeldweergave met
verzonnen namen. Die wordt niet opgeslagen.
