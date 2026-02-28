// ============================================================
// GESTIONE CAMPI - Google Apps Script (Web App)
// Oliveto | v2.0
// ============================================================

const SHEETS = {
  CAMPI: 'Campi',
  LAVORAZIONI: 'Lavorazioni',
  COSTI: 'Costi',
  RACCOLTA: 'Raccolta'
};

// Struttura colonne Campi:
// 1:Nome | 2:Ettari | 3:N.Piante | 4:Varietà | 5:Anno | 6:Comune | 7:Note

// ============================================================
// WEB APP ENTRY POINT
// ============================================================

function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Gestione Oliveto')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
// SETUP FOGLI
// ============================================================

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const config = [
    {
      name: SHEETS.CAMPI,
      headers: ['Nome Campo', 'Ettari', 'N. Piante', 'Varieta Olivo', 'Anno Impianto', 'Comune / Localita', 'Note'],
      color: '#2E7D32'
    },
    {
      name: SHEETS.LAVORAZIONI,
      headers: ['Data', 'Campo', 'Tipo Operazione', 'Descrizione / Note', 'Prodotto Usato', 'Quantita', 'Unita', 'Operatore', 'Costo €'],
      color: '#1565C0'
    },
    {
      name: SHEETS.COSTI,
      headers: ['Data', 'Campo', 'Categoria', 'Descrizione', 'Quantita', 'Unita', 'Costo Unitario €', 'Totale €', 'Fornitore', 'Note'],
      color: '#6A1B9A'
    },
    {
      name: SHEETS.RACCOLTA,
      headers: ['Anno', 'Campo', 'Data Inizio', 'Data Fine', 'KG Raccolti', 'KG / Ha', 'Destinazione', 'Note'],
      color: '#E65100'
    }
  ];

  config.forEach(c => {
    let sheet = ss.getSheetByName(c.name);
    if (!sheet) sheet = ss.insertSheet(c.name);
    const hr = sheet.getRange(1, 1, 1, c.headers.length);
    hr.setValues([c.headers]);
    hr.setBackground(c.color).setFontColor('#FFFFFF').setFontWeight('bold');
    sheet.setFrozenRows(1);
  });

  return { success: true, message: 'Fogli creati correttamente.' };
}

// ============================================================
// HELPERS
// ============================================================

function getSheet(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    setupSheets();
    sheet = ss.getSheetByName(name);
  }
  return sheet;
}

function sheetRows(name, numCols) {
  const sheet = getSheet(name);
  if (sheet.getLastRow() <= 1) return [];
  return sheet.getRange(2, 1, sheet.getLastRow() - 1, numCols).getValues();
}

function fmtDate(val) {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d)) return '';
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function toDate(str) {
  if (!str) return '';
  const d = new Date(str);
  return isNaN(d) ? '' : d;
}

// ============================================================
// CAMPI
// ============================================================

function getCampi() {
  const rows = sheetRows(SHEETS.CAMPI, 7);
  return rows
    .filter(r => r[0] !== '')
    .map((r, i) => ({
      id: i + 2,
      nome: r[0],
      ettari: r[1],
      numPiante: r[2],
      varieta: r[3],
      annoImpianto: r[4],
      comune: r[5],
      note: r[6]
    }));
}

function saveCampo(c) {
  const sheet = getSheet(SHEETS.CAMPI);
  const row = [c.nome, c.ettari || '', c.numPiante || '', c.varieta || '', c.annoImpianto || '', c.comune || '', c.note || ''];
  if (c.id) {
    sheet.getRange(c.id, 1, 1, row.length).setValues([row]);
  } else {
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  }
  return { success: true };
}

function deleteCampo(rowId) {
  getSheet(SHEETS.CAMPI).deleteRow(rowId);
  return { success: true };
}

// ============================================================
// LAVORAZIONI
// ============================================================

function getLavorazioni() {
  const rows = sheetRows(SHEETS.LAVORAZIONI, 9);
  return rows
    .filter(r => r[0] !== '')
    .map((r, i) => ({
      id: i + 2,
      data: fmtDate(r[0]),
      campo: r[1],
      tipo: r[2],
      descrizione: r[3],
      prodotto: r[4],
      quantita: r[5],
      unita: r[6],
      operatore: r[7],
      costo: r[8]
    }));
}

function saveLavorazione(l) {
  const sheet = getSheet(SHEETS.LAVORAZIONI);
  const row = [toDate(l.data), l.campo, l.tipo, l.descrizione || '', l.prodotto || '', l.quantita || '', l.unita || '', l.operatore || '', l.costo || ''];
  if (l.id) {
    sheet.getRange(l.id, 1, 1, row.length).setValues([row]);
  } else {
    const nr = sheet.getLastRow() + 1;
    sheet.getRange(nr, 1, 1, row.length).setValues([row]);
    sheet.getRange(nr, 1).setNumberFormat('dd/mm/yyyy');
    sheet.getRange(nr, 9).setNumberFormat('€#,##0.00');
  }
  return { success: true };
}

function deleteLavorazione(rowId) {
  getSheet(SHEETS.LAVORAZIONI).deleteRow(rowId);
  return { success: true };
}

// ============================================================
// COSTI
// ============================================================

function getCosti() {
  const rows = sheetRows(SHEETS.COSTI, 10);
  return rows
    .filter(r => r[0] !== '')
    .map((r, i) => ({
      id: i + 2,
      data: fmtDate(r[0]),
      campo: r[1],
      categoria: r[2],
      descrizione: r[3],
      quantita: r[4],
      unita: r[5],
      costoUnitario: r[6],
      totale: r[7],
      fornitore: r[8],
      note: r[9]
    }));
}

function saveCosto(c) {
  const sheet = getSheet(SHEETS.COSTI);
  const qty = parseFloat(c.quantita) || 0;
  const unit = parseFloat(c.costoUnitario) || 0;
  const row = [toDate(c.data), c.campo, c.categoria, c.descrizione || '', qty, c.unita || '', unit, qty * unit, c.fornitore || '', c.note || ''];
  if (c.id) {
    sheet.getRange(c.id, 1, 1, row.length).setValues([row]);
  } else {
    const nr = sheet.getLastRow() + 1;
    sheet.getRange(nr, 1, 1, row.length).setValues([row]);
    sheet.getRange(nr, 1).setNumberFormat('dd/mm/yyyy');
    sheet.getRange(nr, 7, 1, 2).setNumberFormat('€#,##0.00');
  }
  return { success: true };
}

function deleteCosto(rowId) {
  getSheet(SHEETS.COSTI).deleteRow(rowId);
  return { success: true };
}

// ============================================================
// RACCOLTA
// ============================================================

function getRaccolte() {
  const rows = sheetRows(SHEETS.RACCOLTA, 8);
  return rows
    .filter(r => r[0] !== '')
    .map((r, i) => ({
      id: i + 2,
      anno: r[0],
      campo: r[1],
      dataInizio: fmtDate(r[2]),
      dataFine: fmtDate(r[3]),
      kg: r[4],
      kgHa: r[5],
      destinazione: r[6],
      note: r[7]
    }));
}

function saveRaccolta(r) {
  const sheet = getSheet(SHEETS.RACCOLTA);
  const row = [r.anno || new Date().getFullYear(), r.campo, toDate(r.dataInizio), toDate(r.dataFine), r.kg || '', r.kgHa || '', r.destinazione || '', r.note || ''];
  if (r.id) {
    sheet.getRange(r.id, 1, 1, row.length).setValues([row]);
  } else {
    const nr = sheet.getLastRow() + 1;
    sheet.getRange(nr, 1, 1, row.length).setValues([row]);
    sheet.getRange(nr, 3, 1, 2).setNumberFormat('dd/mm/yyyy');
  }
  return { success: true };
}

function deleteRaccolta(rowId) {
  getSheet(SHEETS.RACCOLTA).deleteRow(rowId);
  return { success: true };
}

// ============================================================
// OVERVIEW DATA
// ============================================================

function getOverviewData() {
  const campi = getCampi();
  const lavorazioni = getLavorazioni();
  const costi = getCosti();
  const raccolte = getRaccolte();
  const annoCorrente = new Date().getFullYear();

  return campi.map(campo => {
    const lavCampo = lavorazioni.filter(l => l.campo === campo.nome);

    const ultimaPotatura = ultimaData(lavCampo, 'Potatura');
    const ultimoTrattamento = ultimaData(lavCampo, 'Trattamento Fitosanitario');
    const ultimaConcimazione = ultimaData(lavCampo, 'Concimazione');

    const costiAnno = costi
      .filter(c => c.campo === campo.nome && c.data && new Date(c.data).getFullYear() === annoCorrente)
      .reduce((s, c) => s + (parseFloat(c.totale) || 0), 0);

    const raccolteCampo = raccolte
      .filter(r => r.campo === campo.nome)
      .sort((a, b) => b.anno - a.anno);
    const ultimaRaccolta = raccolteCampo[0] || null;

    return {
      ...campo,
      ultimaPotatura,
      ultimoTrattamento,
      ultimaConcimazione,
      costiAnno,
      ultimaRaccolta: ultimaRaccolta ? { anno: ultimaRaccolta.anno, kg: ultimaRaccolta.kg } : null
    };
  });
}

function ultimaData(lavorazioni, tipo) {
  const filtered = lavorazioni
    .filter(l => l.tipo === tipo && l.data)
    .sort((a, b) => new Date(b.data) - new Date(a.data));
  return filtered.length > 0 ? filtered[0].data : null;
}

// ============================================================
// MENU FOGLIO (accesso rapido all'url della web app)
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Gestione Campi')
    .addItem('Apri applicazione web', 'mostraUrlWebApp')
    .addSeparator()
    .addItem('Setup fogli (prima volta)', 'runSetup')
    .addToUi();
}

function runSetup() {
  setupSheets();
  SpreadsheetApp.getUi().alert('Fogli creati correttamente.');
}

function mostraUrlWebApp() {
  SpreadsheetApp.getUi().alert(
    'Apri la web app',
    'Vai su:\nEstensioni → Apps Script → Distribuisci → Gestisci distribuzioni\nper trovare il link della web app.',
    SpreadsheetApp.getUi().ButtonSet.OK
  );
}
