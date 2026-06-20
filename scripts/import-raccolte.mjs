#!/usr/bin/env node
// Import storico raccolte per anno nel foglio Raccolta dell'app.
// Regole (Luca 20/06): solo NOSTRI campi, produzione TOTALE 100%, terzi esclusi,
// "nostre" = Casa, zero = non raccolto (saltato). Resa% e kg/ha calcolati.
// Uso: node scripts/import-raccolte.mjs <anno>
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxzuyO-9JOAiKyx3zwOidpFV0L1Gpse5NoEO1ZGFigPprow18Xeb4qq8cWR6GmvqkzbPA/exec';
const TOKEN   = 'oliveto_gall_2025';

// [campo registrato, kg olive (totale), kg olio, nota]
const DATA = {
  2024: [
    ['Girolimini',            18271, 1944, ''],
    ['Fiorentini',            13850, 1450, ''],
    ['Casa',                  12625, 1194, "da voce 'nostre' — annata eccezionale"],
    ['Torresi C',             10587, 1042, ''],
    ['Omas Viviani Baroncini', 8306,  988, ''],
    ['Nardini Maia',           6430,  750, ''],
    ['Frati',                  6347,  613, ''],
    ['Torresi P',              5981,  655, ''],
    ['Tonino Menghini',        5829,  595, ''],
    ['Schiavoni',              5270,  546, ''],
    ['Andreoni',               2909,  436, ''],
  ],
  2023: [
    ['Torresi C',  12902, 1857, ''],
    ['Fiorentini',  4226,  860, ''],
    ['Girolimini',  2910,  379, ''],
    ['Casa',        1658,  205, "da voce 'nostre'"],
    ['Torresi P',    252,   41, ''],
  ],
  2022: [
    ['Tonino Menghini', 9917, 1380, ''],
    ['Omas Viviani Baroncini', 8757, 1072, ''],
    ['Casa',            6994,  836, "da voce 'nostre'"],
    ['Torresi C',       5576,  798, ''],
    ['Frati',           2984,  423, ''],
    ['Fiorentini',      2751,  401, ''],
    ['Torresi P',       2415,  387, ''],
    ['Schiavoni',        394,   45, ''],
  ],
  2021: [
    ['Fiorentini',      20221, 2639, ''],
    ['Torresi C',       10571, 1420, ''],
    ['Tonino Menghini',  8154, 1087, ''],
    ['Schiavoni',        5880,  635, ''],
    ['Casa',             5182,  583, "da voce 'nostre'"],
    ['Andreoni',         4030,  420, "da voce 'maurizio paterno'"],
    ['Omas Viviani Baroncini', 3341, 452, ''],
    ['Torresi P',        2356,  290, ''],
    ['Frati',            1000,  110, ''],
  ],
  // NB: 2021 "ildo montecassiano" (3181 olive / 476 olio, 100% ns) NON importato:
  // campo non più tra i nostri. Da decidere con Luca se aggiungerlo come campo storico.
};

const api = async (action, params) => {
  const u = new URL(GAS_URL);
  u.searchParams.set('action', action); u.searchParams.set('token', TOKEN);
  for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, typeof v === 'object' ? JSON.stringify(v) : v);
  return (await fetch(u, { redirect: 'follow' })).json();
};

(async () => {
  const anno = +process.argv[2];
  const rows = DATA[anno];
  if (!rows) { console.error('Anno non disponibile:', anno, '— disponibili:', Object.keys(DATA).join(', ')); process.exit(1); }
  const campi = await api('getCampi');
  const ettari = Object.fromEntries(campi.map(c => [c.nome, parseFloat(c.ettari) || 0]));
  for (const [campo, olive, olio, note] of rows) {
    const resa = olive ? +(olio / olive * 100).toFixed(2) : '';
    const ha = ettari[campo] || 0;
    const kgHa = ha ? Math.round(olive / ha) : '';
    const r = await api('saveRaccolta', { data: { anno, campo, kgOlive: olive, kgOlio: olio, resa, kgHa, note } });
    console.log(`${r.success ? 'OK ' : 'ERR'} ${anno} ${campo.padEnd(22)} ${olive} olive | ${olio} olio | ${resa}% | ${kgHa} kg/ha`);
  }
  console.log(`\nFatto ${anno} (${rows.length} campi).`);
})();
