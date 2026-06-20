#!/usr/bin/env node
// Importa la raccolta 2025 (dal foglio riepilogo del file "raccolta olive 2025.xlsx")
// nel foglio Raccolta dell'app. Resa% e kg/ha calcolati. Solo i campi che hanno raccolto.
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxzuyO-9JOAiKyx3zwOidpFV0L1Gpse5NoEO1ZGFigPprow18Xeb4qq8cWR6GmvqkzbPA/exec';
const TOKEN   = 'oliveto_gall_2025';

// anno, campo (nome registrato), kg olive (totale 100%), kg olio
const ROWS = [
  [2025, 'Tonino Menghini', 7726, 1153],
  [2025, 'Fiorentini',      3855, 583],
  [2025, 'Girolimini',      2548, 383],
  [2025, 'Torresi P',       2472, 351],
  [2025, 'Torresi C',        784,  91],
];

const api = async (action, params) => {
  const u = new URL(GAS_URL);
  u.searchParams.set('action', action); u.searchParams.set('token', TOKEN);
  for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v);
  return (await fetch(u, { redirect: 'follow' })).json();
};

(async () => {
  const campi = await api('getCampi');
  const ettari = Object.fromEntries(campi.map(c => [c.nome, parseFloat(c.ettari) || 0]));
  for (const [anno, campo, olive, olio] of ROWS) {
    const resa = olive ? +(olio / olive * 100).toFixed(2) : '';
    const ha = ettari[campo] || 0;
    const kgHa = ha ? Math.round(olive / ha) : '';
    const r = await api('saveRaccolta', { data: { anno, campo, kgOlive: olive, kgOlio: olio, resa, kgHa, note: '' } });
    console.log(`${r.success ? 'OK ' : 'ERR'} ${anno} ${campo.padEnd(18)} olive ${olive} | olio ${olio} | resa ${resa}% | ${kgHa} kg/ha (ha ${ha})`);
  }
  console.log('\nFatto.');
})();
