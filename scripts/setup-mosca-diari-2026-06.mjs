#!/usr/bin/env node
// ============================================================
// Ricognizione oliveti 19/06/2026 → Diari + predisposizione Mosca
// One-shot: scrive 13 appunti diario (verbatim) e 5 righe di
// predisposizione monitoraggio mosca (cromotropica gialla).
// Run UNA volta:  node scripts/setup-mosca-diari-2026-06.mjs
// ============================================================

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxzuyO-9JOAiKyx3zwOidpFV0L1Gpse5NoEO1ZGFigPprow18Xeb4qq8cWR6GmvqkzbPA/exec';
const TOKEN   = 'oliveto_gall_2025';

// --- Diari: [campoRegistrato, testo verbatim] ---
const DIARI = [
  ['Torresi C',              'Ricognizione 19/06/2026: ok'],
  ['Torresi P',              'Ricognizione 19/06/2026: ok'],
  ['Girolimini',             'Ricognizione 19/06/2026: 5%, fare analisi, niente soldi'],
  ['Fiorentini',             'Ricognizione 19/06/2026: 10%, niente soldi'],
  ['Tonino Menghini',        'Ricognizione 19/06/2026: 5%, niente soldi'],
  ['Schiavoni',              'Ricognizione 19/06/2026 (= "Passatempo"): pendenza niente; in pianura in caso solo Spintor-Fly'],
  ['Frati',                  'Ricognizione 19/06/2026: niente'],
  ['Andreoni',               'Ricognizione 19/06/2026: niente'],
  ['Omas Viviani Baroncini', 'Ricognizione 19/06/2026: sotto ok + monitoraggio, anche sopra ok'],
  ['Leandrini',              'Ricognizione 19/06/2026: niente'],
  ['Nardini Maia',           'Ricognizione 19/06/2026: sotto ok, trattare'],
  ['Casa',                   "Ricognizione 19/06/2026: c'e' da raccogliere; da monitorare (insieme a Omas)"],
  ['Babini',                 'Ricognizione 19/06/2026: niente da raccogliere'],
];

// --- Mosca: campi da predisporre al monitoraggio ---
const MOSCA_CAMPI = ['Casa', 'Omas Viviani Baroncini', 'Nardini Maia', 'Torresi C', 'Torresi P'];
const DATA_PREDISP = '2026-06-19';
const TRAPPOLA = 'Cromotropica gialla';
const NOTA_PREDISP = 'Predisposizione — campo da monitorare (ricognizione 19/06). Trappole da installare.';

function isoWeek(d) {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(x.getUTCFullYear(), 0, 1));
  return Math.ceil((((x - yearStart) / 86400000) + 1) / 7);
}

async function postAppunto(campo, testo) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token: TOKEN, action: 'saveAppunto', data: { campo, testo } }),
    redirect: 'follow',
  });
  return res.json();
}

async function saveMosca(row) {
  const url = `${GAS_URL}?action=saveMosca&token=${TOKEN}&data=${encodeURIComponent(JSON.stringify(row))}`;
  const res = await fetch(url, { redirect: 'follow' });
  return res.json();
}

(async () => {
  const settimana = isoWeek(new Date(DATA_PREDISP));
  console.log(`Settimana ISO per ${DATA_PREDISP}: ${settimana}\n`);

  console.log('=== DIARI ===');
  for (const [campo, testo] of DIARI) {
    try {
      const r = await postAppunto(campo, testo);
      console.log(`${r.success ? 'OK ' : 'ERR'} ${campo.padEnd(24)} ${r.error || ''}`);
    } catch (e) { console.log(`ERR ${campo.padEnd(24)} ${e.message}`); }
  }

  console.log('\n=== MOSCA (predisposizione) ===');
  for (const campo of MOSCA_CAMPI) {
    const row = { data: DATA_PREDISP, campo, settimana, catture: 0, trappola: TRAPPOLA, noteBollettino: NOTA_PREDISP };
    try {
      const r = await saveMosca(row);
      console.log(`${r.success ? 'OK ' : 'ERR'} ${campo.padEnd(24)} ${r.error || ''}`);
    } catch (e) { console.log(`ERR ${campo.padEnd(24)} ${e.message}`); }
  }
  console.log('\nFatto.');
})();
