// ============================================================
// GESTIONE CAMPI - Google Apps Script JSON API
// Oliveto | v3.0
// ============================================================

const SHEETS = {
  CAMPI: 'Campi',
  LAVORAZIONI: 'Lavorazioni',
  COSTI: 'Costi',
  RACCOLTA: 'Raccolta'
};

const SECRET_TOKEN = 'oliveto_gall_2025';

// ============================================================
// ENTRY POINT — API JSON via GET
// ============================================================

function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    if (e.parameter.token !== SECRET_TOKEN) {
      output.setContent(JSON.stringify({ error: 'Unauthorized' }));
      return output;
    }

    const action = e.parameter.action;
    let result;

    switch (action) {
      case 'getCampi':         result = getCampi(); break;
      case 'getLavorazioni':   result = getLavorazioni(); break;
      case 'getCosti':         result = getCosti(); break;
      case 'getRaccolte':      result = getRaccolte(); break;
      case 'getOverview':      result = getOverviewData(); break;
      case 'saveCampo':        result = saveCampo(JSON.parse(e.parameter.data)); break;
      case 'deleteCampo':      result = deleteCampo(+e.parameter.rowId); break;
      case 'saveLavorazione':  result = saveLavorazione(JSON.parse(e.parameter.data)); break;
      case 'deleteLavorazione':result = deleteLavorazione(+e.parameter.rowId); break;
      case 'saveCosto':        result = saveCosto(JSON.parse(e.parameter.data)); break;
      case 'deleteCosto':      result = deleteCosto(+e.parameter.rowId); break;
      case 'saveRaccolta':     result = saveRaccolta(JSON.parse(e.parameter.data)); break;
      case 'deleteRaccolta':   result = deleteRaccolta(+e.parameter.rowId); break;
      case 'setup':            result = setupSheets(); break;
      default: result = { error: 'Unknown action: ' + action };
    }

    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }));
  }

  return output;
}

// ============================================================
// SETUP FOGLI
// ============================================================

function setupSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const config = [
    { name: SHEETS.CAMPI,       headers: ['Nome Campo','Ettari','N. Piante','Varieta Olivo','Anno Impianto','Comune / Localita','Note'],                                                    color:'#2E7D32' },
    { name: SHEETS.LAVORAZIONI, headers: ['Data','Campo','Tipo Operazione','Descrizione / Note','Prodotto Usato','Quantita','Unita','Operatore','Costo €'],                                  color:'#1565C0' },
    { name: SHEETS.COSTI,       headers: ['Data','Campo','Categoria','Descrizione','Quantita','Unita','Costo Unitario €','Totale €','Fornitore','Note'],                                      color:'#6A1B9A' },
    { name: SHEETS.RACCOLTA,    headers: ['Anno','Campo','Data Inizio','Data Fine','KG Raccolti','KG / Ha','Destinazione','Note'],                                                            color:'#E65100' }
  ];
  config.forEach(c => {
    let s = ss.getSheetByName(c.name);
    if (!s) s = ss.insertSheet(c.name);
    const r = s.getRange(1, 1, 1, c.headers.length);
    r.setValues([c.headers]).setBackground(c.color).setFontColor('#FFF').setFontWeight('bold');
    s.setFrozenRows(1);
  });
  return { success: true };
}

// ============================================================
// HELPERS
// ============================================================

function getSheet(name) {
  const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!s) setupSheets();
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
}

function sheetRows(name, cols) {
  const s = getSheet(name);
  if (s.getLastRow() <= 1) return [];
  return s.getRange(2, 1, s.getLastRow() - 1, cols).getValues();
}

function fmtDate(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d) ? '' : Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function toDate(s) {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d) ? '' : d;
}

// ============================================================
// CAMPI
// ============================================================

function getCampi() {
  return sheetRows(SHEETS.CAMPI, 7)
    .filter(r => r[0] !== '')
    .map((r, i) => ({ id: i+2, nome:r[0], ettari:r[1], numPiante:r[2], varieta:r[3], annoImpianto:r[4], comune:r[5], note:r[6] }));
}

function saveCampo(c) {
  const s = getSheet(SHEETS.CAMPI);
  const row = [c.nome, c.ettari||'', c.numPiante||'', c.varieta||'', c.annoImpianto||'', c.comune||'', c.note||''];
  if (c.id) s.getRange(c.id, 1, 1, row.length).setValues([row]);
  else s.getRange(s.getLastRow()+1, 1, 1, row.length).setValues([row]);
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
  return sheetRows(SHEETS.LAVORAZIONI, 9)
    .filter(r => r[0] !== '')
    .map((r, i) => ({ id:i+2, data:fmtDate(r[0]), campo:r[1], tipo:r[2], descrizione:r[3], prodotto:r[4], quantita:r[5], unita:r[6], operatore:r[7], costo:r[8] }));
}

function saveLavorazione(l) {
  const s = getSheet(SHEETS.LAVORAZIONI);
  const row = [toDate(l.data), l.campo, l.tipo, l.descrizione||'', l.prodotto||'', l.quantita||'', l.unita||'', l.operatore||'', l.costo||''];
  if (l.id) { s.getRange(l.id, 1, 1, row.length).setValues([row]); }
  else {
    const nr = s.getLastRow()+1;
    s.getRange(nr, 1, 1, row.length).setValues([row]);
    s.getRange(nr, 1).setNumberFormat('dd/mm/yyyy');
    s.getRange(nr, 9).setNumberFormat('€#,##0.00');
  }
  return { success: true };
}

function deleteLavorazione(rowId) { getSheet(SHEETS.LAVORAZIONI).deleteRow(rowId); return { success: true }; }

// ============================================================
// COSTI
// ============================================================

function getCosti() {
  return sheetRows(SHEETS.COSTI, 10)
    .filter(r => r[0] !== '')
    .map((r, i) => ({ id:i+2, data:fmtDate(r[0]), campo:r[1], categoria:r[2], descrizione:r[3], quantita:r[4], unita:r[5], costoUnitario:r[6], totale:r[7], fornitore:r[8], note:r[9] }));
}

function saveCosto(c) {
  const s = getSheet(SHEETS.COSTI);
  const qty = parseFloat(c.quantita)||0, unit = parseFloat(c.costoUnitario)||0;
  const row = [toDate(c.data), c.campo, c.categoria, c.descrizione||'', qty, c.unita||'', unit, qty*unit, c.fornitore||'', c.note||''];
  if (c.id) { s.getRange(c.id, 1, 1, row.length).setValues([row]); }
  else {
    const nr = s.getLastRow()+1;
    s.getRange(nr, 1, 1, row.length).setValues([row]);
    s.getRange(nr, 1).setNumberFormat('dd/mm/yyyy');
    s.getRange(nr, 7, 1, 2).setNumberFormat('€#,##0.00');
  }
  return { success: true };
}

function deleteCosto(rowId) { getSheet(SHEETS.COSTI).deleteRow(rowId); return { success: true }; }

// ============================================================
// RACCOLTA
// ============================================================

function getRaccolte() {
  return sheetRows(SHEETS.RACCOLTA, 8)
    .filter(r => r[0] !== '')
    .map((r, i) => ({ id:i+2, anno:r[0], campo:r[1], dataInizio:fmtDate(r[2]), dataFine:fmtDate(r[3]), kg:r[4], kgHa:r[5], destinazione:r[6], note:r[7] }));
}

function saveRaccolta(r) {
  const s = getSheet(SHEETS.RACCOLTA);
  const row = [r.anno||new Date().getFullYear(), r.campo, toDate(r.dataInizio), toDate(r.dataFine), r.kg||'', r.kgHa||'', r.destinazione||'', r.note||''];
  if (r.id) { s.getRange(r.id, 1, 1, row.length).setValues([row]); }
  else {
    const nr = s.getLastRow()+1;
    s.getRange(nr, 1, 1, row.length).setValues([row]);
    s.getRange(nr, 3, 1, 2).setNumberFormat('dd/mm/yyyy');
  }
  return { success: true };
}

function deleteRaccolta(rowId) { getSheet(SHEETS.RACCOLTA).deleteRow(rowId); return { success: true }; }

// ============================================================
// OVERVIEW
// ============================================================

function getOverviewData() {
  const campi = getCampi(), lav = getLavorazioni(), costi = getCosti(), racc = getRaccolte();
  const anno = new Date().getFullYear();
  return campi.map(c => {
    const lc = lav.filter(l => l.campo === c.nome);
    const costiAnno = costi.filter(x => x.campo===c.nome && x.data && new Date(x.data).getFullYear()===anno)
                          .reduce((s,x)=>s+(parseFloat(x.totale)||0), 0);
    const ur = racc.filter(r=>r.campo===c.nome).sort((a,b)=>b.anno-a.anno)[0]||null;
    return { ...c,
      ultimaPotatura:    ultimaData(lc,'Potatura'),
      ultimoTrattamento: ultimaData(lc,'Trattamento Fitosanitario'),
      ultimaConcimazione:ultimaData(lc,'Concimazione'),
      costiAnno,
      ultimaRaccolta: ur ? { anno:ur.anno, kg:ur.kg } : null
    };
  });
}

function ultimaData(lav, tipo) {
  const f = lav.filter(l=>l.tipo===tipo&&l.data).sort((a,b)=>new Date(b.data)-new Date(a.data));
  return f.length ? f[0].data : null;
}

// ============================================================
// MENU FOGLIO
// ============================================================

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Gestione Campi')
    .addItem('Setup fogli (prima volta)', 'runSetup')
    .addToUi();
}

function runSetup() {
  setupSheets();
  SpreadsheetApp.getUi().alert('Fogli pronti.');
}
