/**
 * Bardienst-rooster voor de toneelvereniging.
 *
 * Opslag: het Google Sheet waaraan dit script gekoppeld is.
 *   - tabblad "Speeldagen":     één rij per voorstelling (Datum, Info)
 *   - tabblad "Inschrijvingen": één rij per naam per dienst
 *   - tabblad "Opmerkingen":    één opmerking per naam
 * De tabbladen worden automatisch aangemaakt bij het eerste gebruik.
 *
 * Snelheid: het rooster wordt een paar minuten in de cache van Google bewaard,
 * zodat niet elke bezoeker het Sheet opnieuw moet lezen. Wie zelf iets in het
 * Sheet aanpast, maakt die cache automatisch leeg (zie onEdit).
 */

// Titel bovenaan de pagina en in het browsertabblad.
const TITEL = 'Bardienst';

// De diensten per speeldag. "nodig" is het aantal mensen dat je minstens zoekt: dat is
// voor jezelf (leden zien dit niet). Meer mensen mogen zich altijd inschrijven.
const FUNCTIES = [
  { id: 'onthaal', naam: 'Onthaal', nodig: 2 },
  { id: 'bar', naam: 'Bar', nodig: 3 },
  { id: 'kassa', naam: 'Kassa', nodig: 1 },
];

// Speeldagen die bij het eerste gebruik in het tabblad "Speeldagen" komen.
// Achteraf pas je ze gewoon aan in het Sheet zelf.
const START_SPEELDAGEN = [
  [new Date(2026, 10, 7), ''],
  [new Date(2026, 10, 13), ''],
  [new Date(2026, 10, 14), ''],
  [new Date(2026, 10, 17), ''],
];

// Link naar een afbeelding van de affiche (leeg laten = geen affiche tonen).
// Voorbeeld met Google Drive: zet de afbeelding in Drive, deel ze met
// "Iedereen met de link", en gebruik
//   'https://drive.google.com/thumbnail?id=HIER_HET_ID&sz=w600'
// Het ID is het stuk tussen /d/ en /view in de deellink.
const AFFICHE_URL = '';

const MAX_NAAM = 40;

// Voorkeur per inschrijving: 'liefst' = helpt graag, 'kan' = kan eventueel ook.
const VOORKEUREN = ['liefst', 'kan'];

// Maximale lengte van de vrije opmerking.
const MAX_OPMERKING = 200;

const CACHE_SLEUTEL = 'rooster-v2';
const CACHE_SECONDEN = 300;

function doGet() {
  // Het rooster gaat meteen mee in de pagina: dat scheelt een extra aanvraag bij het openen.
  const t = HtmlService.createTemplateFromFile('index');
  // Zonder naam: geen enkele inschrijving. Leden krijgen later alleen hun eigen keuzes.
  t.begin = JSON.stringify(publiekVoor_(rooster_(), '')).replace(/</g, '\\u003c');
  return t.evaluate()
    .setTitle(TITEL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Wordt automatisch uitgevoerd als iemand het Sheet met de hand aanpast.
function onEdit() {
  CacheService.getScriptCache().remove(CACHE_SLEUTEL);
}

function sheets_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  let dagen = ss.getSheetByName('Speeldagen');
  if (!dagen) {
    dagen = ss.insertSheet('Speeldagen');
    dagen.getRange(1, 1, 1, 2).setValues([['Datum', 'Info (optioneel, bv. "Première" of "20u")']]).setFontWeight('bold');
    dagen.getRange('A:A').setNumberFormat('dd/mm/yyyy');
    dagen.getRange(2, 1, START_SPEELDAGEN.length, 2).setValues(START_SPEELDAGEN);
    dagen.setFrozenRows(1);
    dagen.setColumnWidth(1, 120);
    dagen.setColumnWidth(2, 320);
  }

  let ins = ss.getSheetByName('Inschrijvingen');
  if (!ins) {
    ins = ss.insertSheet('Inschrijvingen');
    ins.getRange('A:D').setNumberFormat('@');
    ins.getRange(1, 1, 1, 5).setValues([['Id', 'Datum', 'Functie', 'Naam', 'Ingeschreven op']]).setFontWeight('bold');
    ins.setFrozenRows(1);
  }
  // Kolom Voorkeur (ook voor Sheets die vóór deze kolom bestonden).
  if (ins.getRange(1, 6).getValue() === '') {
    ins.getRange('F:F').setNumberFormat('@');
    ins.getRange(1, 6).setValue('Voorkeur').setFontWeight('bold');
  }

  return { ss: ss, dagen: dagen, ins: ins };
}

function dagKey_(waarde, tz) {
  if (waarde instanceof Date) return Utilities.formatDate(waarde, tz, 'yyyy-MM-dd');
  return String(waarde || '').trim();
}

// Een geldige naam bevat minstens één letter (dus niet "0" of "...").
function geldigeNaam_(naam) {
  return /\p{L}/u.test(String(naam || ''));
}

function schoonNaam_(naam) {
  naam = String(naam || '').replace(/\s+/g, ' ').trim();
  if (!naam) throw new Error('Vul eerst je naam in.');
  if (!geldigeNaam_(naam)) throw new Error('Je naam moet minstens één letter bevatten.');
  if (naam.length > MAX_NAAM) throw new Error('Je naam mag maximaal ' + MAX_NAAM + ' tekens lang zijn.');
  return naam;
}

// Het volledige rooster met ALLE inschrijvingen, uit de cache als het kan.
// Dit gaat nooit rechtstreeks naar de pagina: gebruik publiekVoor_.
function rooster_() {
  const c = CacheService.getScriptCache().get(CACHE_SLEUTEL);
  return c ? JSON.parse(c) : leesData_();
}

// Wat een lid te zien krijgt: de speeldagen, de diensten en alleen de eigen keuzes.
// Inschrijvingen van anderen en aantallen verlaten de server nooit.
function publiekVoor_(data, naam) {
  const n = geldigeNaam_(naam) ? String(naam).replace(/\s+/g, ' ').trim().toLowerCase() : '';
  return {
    titel: data.titel,
    affiche: data.affiche,
    functies: data.functies.map(function (f) { return { id: f.id, naam: f.naam }; }),
    dagen: data.dagen,
    inschrijvingen: n ? data.inschrijvingen.filter(function (i) { return i.naam.toLowerCase() === n; }) : [],
    vandaag: Utilities.formatDate(new Date(), data.tz, 'yyyy-MM-dd'),
  };
}

// De pagina vraagt dit op met de ingevulde naam.
function getData(naam) {
  return publiekVoor_(rooster_(), naam);
}

// Leest het rooster rechtstreeks uit het Sheet en zet het in de cache.
function leesData_() {
  const s = sheets_();
  const tz = s.ss.getSpreadsheetTimeZone();

  const nDagen = s.dagen.getLastRow() - 1;
  const dagen = (nDagen > 0 ? s.dagen.getRange(2, 1, nDagen, 2).getValues() : [])
    .filter(function (r) { return r[0] instanceof Date; })
    .map(function (r) { return { key: dagKey_(r[0], tz), info: String(r[1] || '').trim() }; })
    .sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });

  const nIns = s.ins.getLastRow() - 1;
  const inschrijvingen = (nIns > 0 ? s.ins.getRange(2, 1, nIns, 6).getValues() : [])
    .filter(function (r) { return r[0] && r[3]; })
    .map(function (r) {
      return {
        id: String(r[0]), dag: dagKey_(r[1], tz), functie: String(r[2]), naam: String(r[3]),
        voorkeur: String(r[5]) === 'liefst' ? 'liefst' : 'kan',
      };
    });

  const data = {
    titel: TITEL,
    affiche: AFFICHE_URL,
    functies: FUNCTIES,
    dagen: dagen,
    inschrijvingen: inschrijvingen,
    tz: tz,
  };
  bewaarInCache_(data);
  return data;
}

function bewaarInCache_(data) {
  try {
    CacheService.getScriptCache().put(CACHE_SLEUTEL, JSON.stringify(data), CACHE_SECONDEN);
  } catch (e) {
    // Te groot voor de cache: dan lezen we gewoon telkens uit het Sheet.
  }
}

function rijVanId_(ins, id) {
  const n = ins.getLastRow() - 1;
  if (n <= 0) return -1;
  const ids = ins.getRange(2, 1, n, 1).getValues();
  for (let r = 0; r < ids.length; r++) {
    if (String(ids[r][0]) === String(id)) return r + 2;
  }
  return -1;
}

// Zet de keuze van deze persoon voor deze dienst:
// voorkeur 'liefst' of 'kan' = inschrijven of aanpassen, '' = weghalen.
function setKeuze(dag, functie, naam, voorkeur) {
  naam = schoonNaam_(naam);
  if (voorkeur && VOORKEUREN.indexOf(voorkeur) < 0) throw new Error('Onbekende keuze.');
  if (!FUNCTIES.some(function (f) { return f.id === functie; })) throw new Error('Onbekende dienst.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = leesData_();
    if (!data.dagen.some(function (d) { return d.key === dag; })) {
      throw new Error('Deze speeldag bestaat niet meer. Vernieuw de pagina.');
    }
    const bestaand = data.inschrijvingen.filter(function (i) {
      return i.dag === dag && i.functie === functie && i.naam.toLowerCase() === naam.toLowerCase();
    })[0];
    const ins = sheets_().ins;

    if (!voorkeur) {
      if (bestaand) {
        const rij = rijVanId_(ins, bestaand.id);
        if (rij > 0) ins.deleteRow(rij);
        data.inschrijvingen = data.inschrijvingen.filter(function (i) { return i !== bestaand; });
      }
    } else if (!bestaand) {
      const id = Utilities.getUuid();
      ins.appendRow([id, dag, functie, naam, new Date(), voorkeur]);
      data.inschrijvingen.push({ id: id, dag: dag, functie: functie, naam: naam, voorkeur: voorkeur });
    } else if (bestaand.voorkeur !== voorkeur) {
      const rij = rijVanId_(ins, bestaand.id);
      if (rij > 0) ins.getRange(rij, 6).setValue(voorkeur);
      bestaand.voorkeur = voorkeur;
    }
    SpreadsheetApp.flush();
    bewaarInCache_(data);
    return publiekVoor_(data, naam);
  } finally {
    lock.releaseLock();
  }
}

// ---------- Opmerking: één per persoon, voor de hele bardienst ----------
// Tabblad "Opmerkingen" (Naam, Opmerking, Laatst gewijzigd).
// Iedereen krijgt alleen zijn eigen opmerking terug; alles staat in het Sheet.

function opmerkingenSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Opmerkingen');
  // Een oudere versie had hier een opmerking per avond (eerste kolom "Datum"): die laten we ongemoeid.
  if (sh && sh.getRange(1, 1).getValue() === 'Datum') {
    sh.setName('Opmerkingen per avond (oud)');
    sh = null;
  }
  if (!sh) {
    sh = ss.insertSheet('Opmerkingen');
    // Tekstopmaak, zodat bv. "=..." nooit als formule gelezen wordt.
    sh.getRange('A:B').setNumberFormat('@');
    sh.getRange(1, 1, 1, 3).setValues([['Naam', 'Opmerking', 'Laatst gewijzigd']]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(2, 460);
  }
  return sh;
}

function rijVanNaam_(sh, naam) {
  const n = sh.getLastRow() - 1;
  if (n <= 0) return -1;
  const namen = sh.getRange(2, 1, n, 1).getValues();
  for (let r = 0; r < namen.length; r++) {
    if (String(namen[r][0]).toLowerCase() === naam.toLowerCase()) return r + 2;
  }
  return -1;
}

function getMijnOpmerking(naam) {
  naam = String(naam || '').replace(/\s+/g, ' ').trim();
  if (!geldigeNaam_(naam)) return '';
  const sh = opmerkingenSheet_();
  const rij = rijVanNaam_(sh, naam);
  return rij > 0 ? String(sh.getRange(rij, 2).getValue()) : '';
}

// Bewaart de opmerking van deze persoon; een lege opmerking wist ze.
function setOpmerking(naam, tekst) {
  naam = schoonNaam_(naam);
  tekst = String(tekst || '').trim();
  if (tekst.length > MAX_OPMERKING) throw new Error('Je opmerking mag maximaal ' + MAX_OPMERKING + ' tekens lang zijn.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = opmerkingenSheet_();
    const rij = rijVanNaam_(sh, naam);
    if (!tekst) {
      if (rij > 0) sh.deleteRow(rij);
    } else if (rij > 0) {
      sh.getRange(rij, 2, 1, 2).setValues([[tekst, new Date()]]);
    } else {
      sh.appendRow([naam, tekst, new Date()]);
    }
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  return tekst;
}
