/**
 * Bardienst-rooster voor de toneelvereniging.
 *
 * Opslag: het Google Sheet waaraan dit script gekoppeld is.
 *   - tabblad "Speeldagen":     één rij per voorstelling (Datum, Info)
 *   - tabblad "Inschrijvingen": één rij per naam per dienst
 * Beide tabbladen worden automatisch aangemaakt bij het eerste gebruik.
 */

// Titel bovenaan de pagina en in het browsertabblad.
const TITEL = 'Bardienst';

// De diensten per speeldag en hoeveel mensen er minstens nodig zijn.
// Meer mensen mogen zich altijd inschrijven.
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

const MAX_NAAM = 40;

function doGet() {
  sheets_();
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle(TITEL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
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

  return { ss: ss, dagen: dagen, ins: ins };
}

function dagKey_(waarde, tz) {
  if (waarde instanceof Date) return Utilities.formatDate(waarde, tz, 'yyyy-MM-dd');
  return String(waarde || '').trim();
}

function getData() {
  const s = sheets_();
  const tz = s.ss.getSpreadsheetTimeZone();

  const nDagen = s.dagen.getLastRow() - 1;
  const dagen = (nDagen > 0 ? s.dagen.getRange(2, 1, nDagen, 2).getValues() : [])
    .filter(function (r) { return r[0] instanceof Date; })
    .map(function (r) { return { key: dagKey_(r[0], tz), info: String(r[1] || '').trim() }; })
    .sort(function (a, b) { return a.key < b.key ? -1 : a.key > b.key ? 1 : 0; });

  const nIns = s.ins.getLastRow() - 1;
  const inschrijvingen = (nIns > 0 ? s.ins.getRange(2, 1, nIns, 4).getValues() : [])
    .filter(function (r) { return r[0] && r[3]; })
    .map(function (r) {
      return { id: String(r[0]), dag: dagKey_(r[1], tz), functie: String(r[2]), naam: String(r[3]) };
    });

  return {
    titel: TITEL,
    functies: FUNCTIES,
    dagen: dagen,
    inschrijvingen: inschrijvingen,
    vandaag: Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd'),
  };
}

function addSignup(dag, functie, naam) {
  naam = String(naam || '').replace(/\s+/g, ' ').trim();
  if (!naam) throw new Error('Vul eerst je naam in.');
  if (naam.length > MAX_NAAM) throw new Error('Je naam mag maximaal ' + MAX_NAAM + ' tekens lang zijn.');
  if (!FUNCTIES.some(function (f) { return f.id === functie; })) throw new Error('Onbekende dienst.');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = getData();
    if (!data.dagen.some(function (d) { return d.key === dag; })) {
      throw new Error('Deze speeldag bestaat niet meer. Vernieuw de pagina.');
    }
    const alIngeschreven = data.inschrijvingen.some(function (i) {
      return i.dag === dag && i.functie === functie && i.naam.toLowerCase() === naam.toLowerCase();
    });
    if (!alIngeschreven) {
      sheets_().ins.appendRow([Utilities.getUuid(), dag, functie, naam, new Date()]);
      SpreadsheetApp.flush();
    }
  } finally {
    lock.releaseLock();
  }
  return getData();
}

function removeSignup(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ins = sheets_().ins;
    const n = ins.getLastRow() - 1;
    if (n > 0) {
      const ids = ins.getRange(2, 1, n, 1).getValues();
      for (let r = ids.length - 1; r >= 0; r--) {
        if (String(ids[r][0]) === String(id)) {
          ins.deleteRow(r + 2);
          break;
        }
      }
    }
  } finally {
    lock.releaseLock();
  }
  return getData();
}
