#!/usr/bin/env node
// Logga una rilevazione mosca nel foglio Mosca dell'app Campi.
// Pensato per il flusso: Tommaso scrive nel gruppo WA → Luca gira il messaggio
// a Claude → Claude registra qui.
//
// Uso:  node log-mosca.mjs <campo> <catture> [data YYYY-MM-DD] [nota...]
// Es.:  node log-mosca.mjs Omas 5
//       node log-mosca.mjs Casa 0 2026-07-02 trappola da sostituire
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxzuyO-9JOAiKyx3zwOidpFV0L1Gpse5NoEO1ZGFigPprow18Xeb4qq8cWR6GmvqkzbPA/exec';
const TOKEN   = 'oliveto_gall_2025';

// alias nomi corti → nome campo registrato
const ALIAS = { omas: 'Omas Viviani Baroncini', casa: 'Casa' };

const [, , campoArg, catture, ...rest] = process.argv;
if (!campoArg || catture === undefined) {
  console.error('Uso: node log-mosca.mjs <campo> <catture> [data YYYY-MM-DD] [nota...]');
  process.exit(1);
}

let data, note;
if (/^\d{4}-\d{2}-\d{2}$/.test(rest[0] || '')) { data = rest[0]; note = rest.slice(1).join(' '); }
else { const d = new Date(); data = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; note = rest.join(' '); }

const campo = ALIAS[campoArg.toLowerCase()] || campoArg;

function isoWeek(s) {
  const d = new Date(s);
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day);
  const ys = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil((((x - ys) / 86400000) + 1) / 7);
}

const row = { data, campo, settimana: isoWeek(data), catture, trappola: 'Cromotropica gialla', noteBollettino: note || '' };
const u = new URL(GAS_URL);
u.searchParams.set('action', 'saveMosca'); u.searchParams.set('token', TOKEN); u.searchParams.set('data', JSON.stringify(row));
const j = await (await fetch(u, { redirect: 'follow' })).json();
console.log(j.success
  ? `OK → ${campo} | ${data} (sett.${row.settimana}) | ${catture} catture${note ? ' | ' + note : ''}`
  : `ERR: ${j.error}`);
