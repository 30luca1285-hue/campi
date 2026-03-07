// ============================================================
// GESTIONE CAMPI - Google Apps Script JSON API
// Oliveto | v4.0
// ============================================================

const SHEETS = {
  CAMPI:       'Campi',
  LAVORAZIONI: 'Lavorazioni',
  COSTI:       'Costi',
  RACCOLTA:    'Raccolta',
  ENTRATE:     'PAC-Biologico',
  APPUNTI:     'Appunti',
  MOSCA:       'Mosca'
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
      case 'getCampi':          result = getCampi(); break;
      case 'getLavorazioni':    result = getLavorazioni(); break;
      case 'getCosti':          result = getCosti(); break;
      case 'getRaccolte':       result = getRaccolte(); break;
      case 'getOverview':       result = getOverviewData(); break;
      case 'saveCampo':         result = saveCampo(JSON.parse(e.parameter.data)); break;
      case 'deleteCampo':       result = deleteCampo(+e.parameter.rowId); break;
      case 'saveLavorazione':   result = saveLavorazione(JSON.parse(e.parameter.data)); break;
      case 'deleteLavorazione': result = deleteLavorazione(+e.parameter.rowId); break;
      case 'saveCosto':         result = saveCosto(JSON.parse(e.parameter.data)); break;
      case 'deleteCosto':       result = deleteCosto(+e.parameter.rowId); break;
      case 'saveRaccolta':      result = saveRaccolta(JSON.parse(e.parameter.data)); break;
      case 'deleteRaccolta':    result = deleteRaccolta(+e.parameter.rowId); break;
      case 'getEntrate':        result = getEntrate(); break;
      case 'saveEntrata':       result = saveEntrata(JSON.parse(e.parameter.data)); break;
      case 'deleteEntrata':     result = deleteEntrata(+e.parameter.rowId); break;
      case 'getAppunti':        result = getAppunti(); break;
      case 'deleteAppunto':     result = deleteAppunto(+e.parameter.rowId); break;
      case 'getMosca':          result = getMosca(); break;
      case 'saveMosca':         result = saveMoscaEntry(JSON.parse(e.parameter.data)); break;
      case 'deleteMosca':       result = deleteMoscaEntry(+e.parameter.rowId); break;
      case 'setup':             result = setupSheets(); break;
      default: result = { error: 'Unknown action: ' + action };
    }

    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }));
  }

  return output;
}

// ============================================================
// ENTRY POINT — API JSON via POST (upload foto)
// ============================================================

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    const payload = JSON.parse(e.postData.contents);
    if (payload.token !== SECRET_TOKEN) {
      output.setContent(JSON.stringify({ error: 'Unauthorized' }));
      return output;
    }
    let result;
    switch (payload.action) {
      case 'saveAppunto':    result = saveAppunto(payload.data); break;
      case 'uploadFattura':  result = uploadFattura(payload.data); break;
      default: result = { error: 'Unknown action: ' + payload.action };
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
    { name: SHEETS.CAMPI,       headers: ['Nome Campo','Ettari','N. Piante','Varieta Olivo','(non usato)','Comune / Localita','Note','Latitudine','Longitudine','Costo Affitto €','Scadenza Affitto','Data Pagamento Affitto'], color:'#2E7D32' },
    { name: SHEETS.LAVORAZIONI, headers: ['Data','Campo','Tipo Operazione','Descrizione / Note','Prodotto Usato','Quantita','Unita','Operatore','Costo €'],                                                         color:'#1565C0' },
    { name: SHEETS.COSTI,       headers: ['Data','Campo','Categoria','Descrizione','Quantita','Unita','Costo Unitario €','Totale €','Fornitore','Note','Foto URL'],                                                 color:'#6A1B9A' },
    { name: SHEETS.RACCOLTA,    headers: ['Anno','Campo','Data Inizio','Data Fine','KG Raccolti','KG / Ha','Destinazione','Note'],                                                                                  color:'#E65100' },
    { name: SHEETS.ENTRATE,     headers: ['Anno','Campo','Tipo','Descrizione','Importo €','Note'],                                                                                                                  color:'#0D47A1' },
    { name: SHEETS.APPUNTI,     headers: ['Data / Ora','Campo','Testo / Appunto','Foto URL','Latitudine','Longitudine'],                                                                                           color:'#37474F' },
    { name: SHEETS.MOSCA,       headers: ['Data','Campo','Settimana','N. Catture','Tipo Trappola','Note Bollettino'],                                                                                              color:'#BF360C' }
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(name);
  if (!s) { setupSheets(); s = ss.getSheetByName(name); }
  return s;
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

function fmtDateTime(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d) ? '' : Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

// ============================================================
// DRIVE — upload file generico (usato da Appunti e Fatture)
// ============================================================

function uploadFileToDrive(base64Data, filename, folderName) {
  const base64 = base64Data.split(',')[1];
  const bytes  = Utilities.base64Decode(base64);
  const blob   = Utilities.newBlob(bytes, 'image/jpeg', filename);
  const iter   = DriveApp.getFoldersByName(folderName);
  const folder = iter.hasNext() ? iter.next() : DriveApp.createFolder(folderName);
  const file   = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

// ============================================================
// CAMPI
// ============================================================

function getCampi() {
  return sheetRows(SHEETS.CAMPI, 12)
    .filter(r => r[0] !== '')
    .map((r, i) => ({
      id: i+2, nome:r[0], ettari:(r[1] instanceof Date || r[1]==='') ? '' : (parseFloat(r[1])||''), numPiante:r[2], varieta:r[3], annoImpianto:r[4], comune:r[5], note:r[6],
      lat: (r[7] instanceof Date || !r[7]) ? '' : String(r[7]),
      lon: (r[8] instanceof Date || !r[8]) ? '' : String(r[8]),
      affitto: (r[9] !== '' && r[9] != null) ? (parseFloat(r[9])||'') : '',
      scadenzaAffitto:  r[10] ? fmtDate(r[10]) : '',
      pagamentoAffitto: r[11] ? fmtDate(r[11]) : ''
    }));
}

function saveCampo(c) {
  const s      = getSheet(SHEETS.CAMPI);
  const latVal = c.lat ? parseFloat(c.lat) : '';
  const lonVal = c.lon ? parseFloat(c.lon) : '';
  const ettVal     = (c.ettari !== '' && c.ettari != null) ? parseFloat(c.ettari) : '';
  const affittoVal = (c.affitto !== '' && c.affitto != null) ? parseFloat(c.affitto) : '';
  const scadVal  = c.scadenzaAffitto   ? toDate(c.scadenzaAffitto)   : '';
  const pagVal   = c.pagamentoAffitto  ? toDate(c.pagamentoAffitto)  : '';
  const row    = [c.nome, ettVal, c.numPiante||'', c.varieta||'', c.annoImpianto||'', c.comune||'', c.note||'', latVal, lonVal, affittoVal, scadVal, pagVal];
  const rowNum = c.id ? c.id : s.getLastRow() + 1;
  s.getRange(rowNum, 1, 1, row.length).setValues([row]);
  if (ettVal !== '') s.getRange(rowNum, 2, 1, 1).setNumberFormat('0.00');
  if (latVal !== '') s.getRange(rowNum, 8, 1, 2).setNumberFormat('0.000000');
  if (affittoVal !== '') s.getRange(rowNum, 10, 1, 1).setNumberFormat('€#,##0.00');
  // scrivi scadenza esplicitamente per evitare problemi di tipo cella
  const scadCell = s.getRange(rowNum, 11);
  scadCell.setNumberFormat('dd/mm/yyyy');
  scadCell.setValue(scadVal || '');
  const pagCell = s.getRange(rowNum, 12);
  pagCell.setNumberFormat('dd/mm/yyyy');
  pagCell.setValue(pagVal || '');
  SpreadsheetApp.flush();
  return { success: true };
}

function deleteCampo(rowId) { getSheet(SHEETS.CAMPI).deleteRow(rowId); return { success: true }; }

// ============================================================
// LAVORAZIONI
// ============================================================

function getLavorazioni() {
  return sheetRows(SHEETS.LAVORAZIONI, 9)
    .filter(r => r[0] !== '')
    .map((r, i) => ({ id:i+2, data:fmtDate(r[0]), campo:r[1], tipo:r[2], descrizione:r[3], prodotto:r[4], quantita:r[5], unita:r[6], operatore:r[7], costo:r[8] }));
}

function saveLavorazione(l) {
  const s   = getSheet(SHEETS.LAVORAZIONI);
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
// COSTI  (col 11 = Foto URL)
// ============================================================

function getCosti() {
  return sheetRows(SHEETS.COSTI, 11)
    .filter(r => r[0] !== '')
    .map((r, i) => ({ id:i+2, data:fmtDate(r[0]), campo:r[1], categoria:r[2], descrizione:r[3], quantita:r[4], unita:r[5], costoUnitario:r[6], totale:r[7], fornitore:r[8], note:r[9], fotoUrl:r[10]||'' }));
}

function saveCosto(c) {
  const s    = getSheet(SHEETS.COSTI);
  const qty  = parseFloat(c.quantita)||0, unit = parseFloat(c.costoUnitario)||0;
  const row  = [toDate(c.data), c.campo, c.categoria, c.descrizione||'', qty, c.unita||'', unit, qty*unit, c.fornitore||'', c.note||'', c.fotoUrl||''];
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

// Upload foto fattura su Drive, cartella "Fatture Oliveto"
function uploadFattura(data) {
  if (!data || !data.foto) return { error: 'Nessuna foto' };
  const ts  = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const url = uploadFileToDrive(data.foto, 'fattura_' + ts + '.jpg', 'Fatture Oliveto');
  return { success: true, url };
}

// ============================================================
// RACCOLTA
// ============================================================

function getRaccolte() {
  return sheetRows(SHEETS.RACCOLTA, 8)
    .filter(r => r[0] !== '')
    .map((r, i) => ({ id:i+2, anno:r[0], campo:r[1], dataInizio:fmtDate(r[2]), dataFine:fmtDate(r[3]), kg:r[4], kgHa:r[5], destinazione:r[6], note:r[7] }));
}

function saveRaccolta(r) {
  const s   = getSheet(SHEETS.RACCOLTA);
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
// ENTRATE PAC / BIOLOGICO
// ============================================================

function getEntrate() {
  return sheetRows(SHEETS.ENTRATE, 6)
    .filter(r => r[0] !== '')
    .map((r, i) => ({ id: i+2, anno: r[0], campo: r[1], tipo: r[2], descrizione: r[3], importo: r[4], note: r[5] }));
}

function saveEntrata(e) {
  const s   = getSheet(SHEETS.ENTRATE);
  const row = [e.anno || new Date().getFullYear(), e.campo || '', e.tipo || '', e.descrizione || '', parseFloat(e.importo) || 0, e.note || ''];
  if (e.id) { s.getRange(e.id, 1, 1, row.length).setValues([row]); }
  else {
    const nr = s.getLastRow() + 1;
    s.getRange(nr, 1, 1, row.length).setValues([row]);
    s.getRange(nr, 5).setNumberFormat('€#,##0.00');
  }
  return { success: true };
}

function deleteEntrata(rowId) { getSheet(SHEETS.ENTRATE).deleteRow(rowId); return { success: true }; }

// ============================================================
// APPUNTI CAMPO (foto + voce + GPS)
// ============================================================

function getAppunti() {
  return sheetRows(SHEETS.APPUNTI, 6)
    .filter(r => r[0] !== '')
    .map((r, i) => ({
      id: i+2, data: fmtDateTime(r[0]), campo: r[1], testo: r[2], fotoUrl: r[3],
      lat: (r[4] instanceof Date || isNaN(parseFloat(r[4]))) ? '' : String(r[4]),
      lon: (r[5] instanceof Date || isNaN(parseFloat(r[5]))) ? '' : String(r[5])
    }));
}

function saveAppunto(data) {
  const s = getSheet(SHEETS.APPUNTI);
  let fotoUrl = '';
  if (data.foto) {
    const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
    fotoUrl  = uploadFileToDrive(data.foto, 'foto_' + ts + '.jpg', 'Appunti Oliveto');
  }
  const latVal = data.lat ? parseFloat(data.lat) : '';
  const lonVal = data.lon ? parseFloat(data.lon) : '';
  const row = [new Date(), data.campo || '', data.testo || '', fotoUrl, latVal, lonVal];
  const nr  = s.getLastRow() + 1;
  s.getRange(nr, 1, 1, row.length).setValues([row]);
  s.getRange(nr, 1).setNumberFormat('dd/mm/yyyy hh:mm');
  if (latVal !== '') s.getRange(nr, 5, 1, 2).setNumberFormat('0.000000');
  return { success: true };
}

function deleteAppunto(rowId) { getSheet(SHEETS.APPUNTI).deleteRow(rowId); return { success: true }; }

// ============================================================
// MONITORAGGIO MOSCA OLIVO
// ============================================================

function getMosca() {
  return sheetRows(SHEETS.MOSCA, 6)
    .filter(r => r[0] !== '')
    .map((r, i) => ({ id: i+2, data: fmtDate(r[0]), campo: r[1], settimana: r[2], catture: r[3], trappola: r[4], noteBollettino: r[5] }));
}

function saveMoscaEntry(m) {
  const s   = getSheet(SHEETS.MOSCA);
  const row = [toDate(m.data), m.campo, m.settimana||'', parseFloat(m.catture)||0, m.trappola||'', m.noteBollettino||''];
  if (m.id) { s.getRange(m.id, 1, 1, row.length).setValues([row]); }
  else {
    const nr = s.getLastRow() + 1;
    s.getRange(nr, 1, 1, row.length).setValues([row]);
    s.getRange(nr, 1).setNumberFormat('dd/mm/yyyy');
  }
  return { success: true };
}

function deleteMoscaEntry(rowId) { getSheet(SHEETS.MOSCA).deleteRow(rowId); return { success: true }; }

// ============================================================
// OVERVIEW
// ============================================================

function getOverviewData() {
  const campi = getCampi(), lav = getLavorazioni(), costi = getCosti(), racc = getRaccolte(), entrate = getEntrate();
  const anno  = new Date().getFullYear();

  const campiData = campi.map(c => {
    const lc       = lav.filter(l => l.campo.trim() === c.nome.trim());
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

  const catMap = {};
  costi.filter(x => x.data && new Date(x.data).getFullYear()===anno).forEach(x => {
    const cat = x.categoria || 'Altro';
    catMap[cat] = (catMap[cat] || 0) + (parseFloat(x.totale) || 0);
  });
  const costiPerCategoria = Object.entries(catMap)
    .map(([categoria, totale]) => ({ categoria, totale }))
    .sort((a,b) => b.totale - a.totale);

  const entrateAnno = entrate.filter(e => +e.anno === anno).reduce((s,e) => s+(parseFloat(e.importo)||0), 0);

  const anniRacc = racc.map(r => +r.anno).filter(Boolean);
  let raccoltaRiepilogo = null;
  if (anniRacc.length) {
    const ultimoAnno = Math.max(...anniRacc);
    const raccUltime = racc.filter(r => +r.anno === ultimoAnno);
    const totKg      = raccUltime.reduce((s,r) => s+(parseFloat(r.kg)||0), 0);
    raccoltaRiepilogo = {
      anno: ultimoAnno, totKg,
      stimaOlio: Math.round(totKg * 0.15),
      perCampo: raccUltime.map(r => ({ campo: r.campo, kg: parseFloat(r.kg)||0 }))
    };
  }

  return { campi: campiData, costiPerCategoria, entrateAnno, raccoltaRiepilogo };
}

function ultimaData(lav, tipo) {
  const f = lav.filter(l=>l.tipo.trim()===tipo&&l.data).sort((a,b)=>new Date(b.data)-new Date(a.data));
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
