// ============================================================
// MONITORAGGIO MOSCA OLIVO — Google Form per il dipendente
// File ISOLATO (non tocca gestione_campi.js) — creato 20/06/2026
//
// COSA FA
//  - setupFormMosca(): crea UNA VOLTA un Google Form dedicato al dipendente
//    per annotare le catture settimanali in campo dal telefono, e installa
//    un trigger onFormSubmit che scrive in automatico nel foglio "Mosca"
//    nel formato dell'app: Data | Campo | Settimana | N.Catture | Tipo Trappola | Note.
//  - onFormSubmitMosca(e): handler del trigger (gira come Luca, scrive nel foglio).
//
// PRIMA VOLTA (una sola)
//  1. clasp push                          (carica questo file)
//  2. Apri l'editor Apps Script del progetto Campi
//  3. Seleziona la funzione  setupFormMosca  e premi  ▶ Esegui
//  4. Autorizza i nuovi permessi (Moduli + Trigger) quando richiesto
//  5. Nel log di esecuzione trovi l'URL del Form da girare al dipendente
//
// NB: NON serve "clasp deploy". La web-app che usi ogni giorno resta sul suo
//     deployment attuale e non cambia scope. Questo codice gira a HEAD.
// ============================================================

// >>> CAMPI DA MONITORARE — confermati da Luca 20/06/2026 <<<
// Solo 2: gli unici che monitoriamo davvero con le trappole.
const CAMPI_MONITORATI = [
  'Casa',                    // Castelfidardo
  'Omas Viviani Baroncini'   // Sirolo
];

const TIPO_TRAPPOLA_DEFAULT = 'Cromotropica gialla';
const FORM_TITLE = 'Monitoraggio Mosca Olivo — Olio Galluzzi 2026';
const PROP_FORM_ID = 'MOSCA_FORM_ID';

function setupFormMosca() {
  const props = PropertiesService.getScriptProperties();

  // Idempotenza: riusa il form se esiste già (niente duplicati)
  let form = null;
  const existingId = props.getProperty(PROP_FORM_ID);
  if (existingId) {
    try { form = FormApp.openById(existingId); }
    catch (err) { props.deleteProperty(PROP_FORM_ID); } // id non più valido: si ricrea
  }

  if (!form) {
    form = creaForm_();
    props.setProperty(PROP_FORM_ID, form.getId());
  }

  ensureTriggerMosca_(form); // auto-ripara: crea il trigger solo se manca

  const info = { formId: form.getId(), formUrl: form.getPublishedUrl(), editUrl: form.getEditUrl() };
  Logger.log('FORM PRONTO ✔\n' + JSON.stringify(info, null, 2));
  return info;
}

// Crea il trigger onFormSubmit solo se non esiste già per questo form
function ensureTriggerMosca_(form) {
  const exists = ScriptApp.getProjectTriggers().some(t =>
    t.getHandlerFunction() === 'onFormSubmitMosca' && t.getTriggerSourceId() === form.getId());
  if (!exists) ScriptApp.newTrigger('onFormSubmitMosca').forForm(form).onFormSubmit().create();
}

function creaForm_() {
  if (!CAMPI_MONITORATI.length) {
    throw new Error('CAMPI_MONITORATI è vuoto: inserisci i campi prima di eseguire.');
  }

  const form = FormApp.create(FORM_TITLE)
    .setDescription(
      'Monitoraggio settimanale mosca olivo (Bactrocera oleae) — trappole cromotropiche gialle.\n' +
      'Per ogni trappola controllata: scegli il campo, la data del controllo e quante mosche hai contato.\n' +
      'Fai un invio separato per ogni campo. Grazie!'
    )
    .setCollectEmail(false)
    .setAllowResponseEdits(false)
    .setProgressBar(false)
    .setShowLinkToRespondAgain(true);

  // 1) Campo (obbligatorio) — solo i campi monitorati, così non sbaglia
  form.addMultipleChoiceItem()
    .setTitle('Campo')
    .setHelpText('Quale oliveto stai controllando')
    .setChoiceValues(CAMPI_MONITORATI)
    .setRequired(true);

  // 2) Data del controllo (obbligatorio)
  form.addDateItem()
    .setTitle('Data del controllo')
    .setRequired(true);

  // 3) N. mosche catturate (obbligatorio, solo numero)
  const numItem = form.addTextItem()
    .setTitle('N. mosche catturate')
    .setHelpText('Quante mosche conti sulla trappola — solo numero (es. 0, 3, 12)')
    .setRequired(true);
  numItem.setValidation(
    FormApp.createTextValidation().setHelpText('Inserisci un numero (es. 0, 3, 12)').requireNumber().build()
  );

  // 4) Note (opzionale)
  form.addParagraphTextItem()
    .setTitle('Note (opzionale)')
    .setHelpText('Es. trappola da sostituire, presenza di adulti, meteo…')
    .setRequired(false);

  return form;
}

function onFormSubmitMosca(e) {
  try {
    let campo = '', dataStr = '', catture = '', note = '';
    e.response.getItemResponses().forEach(it => {
      const t = it.getItem().getTitle();
      const r = it.getResponse();
      if (t === 'Campo') campo = r;
      else if (t === 'Data del controllo') dataStr = r;
      else if (t.indexOf('mosche catturate') !== -1) catture = r;
      else if (t.indexOf('Note') !== -1) note = r;
    });

    const data = parseFormDate(dataStr);
    const settimana = isoWeek(data);

    const s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Mosca');
    if (!s) return;
    const row = [data, campo, settimana, parseFloat(catture) || 0, TIPO_TRAPPOLA_DEFAULT, note || ''];
    const nr = s.getLastRow() + 1;
    s.getRange(nr, 1, 1, row.length).setValues([row]);
    s.getRange(nr, 1).setNumberFormat('dd/mm/yyyy');
  } catch (err) {
    Logger.log('onFormSubmitMosca error: ' + err.message); // non blocca il submit del dipendente
  }
}

function parseFormDate(str) {
  if (!str) return new Date();
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})$/); // Forms Date item → "yyyy-mm-dd"
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(str);
  return isNaN(d) ? new Date() : d;
}

function isoWeek(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil((((x - yearStart) / 86400000) + 1) / 7);
}
