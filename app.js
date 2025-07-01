/*  app.js – Shoulder Diagnostic Tool (self-contained, ES-module friendly)  */
(async () => {
  /* ---------- 0. Where the JSON lives (edit to your repo path) ---------- */
  const CDN = 'https://cdn.jsdelivr.net/gh/BenOnofrio/shoulder-tool@latest/';

  /* ---------- 1. Pull in both data files ---------- */
  const [LOOKUP, EVIDENCE] = await Promise.all([
    fetch(CDN + 'lookup.json').then(r => r.json()),
    fetch(CDN + 'evidence.json').then(r => r.json())
  ]);

  /* ---------- 2. Find the landing pad ---------- */
  const root = document.getElementById('shoulder-tool-wrapper');
  if (!root) {
    console.error('❌  <div id="shoulder-tool-wrapper"> not found on page');
    return;
  }

  /* ---------- 3. Static label / group lists ---------- */
  const labels = {
    Q1: '❶ Where is your pain felt?',        Q2: '❷ Describe the pain',
    Q3: '❸ Intensity (0-10)',               Q4: '❹ Reactivity',
    Q5: '❺ Aggravating',                    Q6: '❻ Relieving',
    Q7: '❼ History'
  };

  const SOMATIC = [
    'Supraspinatus','Subscapularis','Infraspinatus','Teres Minor/Major',
    'Biceps Brachii (Long Head)','Trapezius','Levator Scapulae','Latissimus Dorsi',
    'Rhomboids','Pectoralis Major','Pectoralis Minor','Serratus Anterior'
  ];

  const CLINICAL = [
    'Rotator Cuff FT Tear','Rotator Cuff Related Shoulder Pain','Frozen Shoulder',
    'Shoulder Instability','Internal Impingement','Cx Nerve Root Impingement',
    'GHJ OA','Labral Tear','SLAP Tear','Thoracic Outlet Syndrome','Calcific Tendinopathy'
  ];

  /* ---------- 4. Render the seven question cards ---------- */
  const questions = Object.keys(LOOKUP);
  const frag      = document.createDocumentFragment();

  questions.forEach(q => {
    const fs   = document.createElement('fieldset');
    fs.innerHTML = `<legend>${labels[q] || q}</legend><div class="option-wrap"></div>`;
    const grid = fs.querySelector('.option-wrap');

    /* unique answer list for this question */
    const opts = new Set();
    Object.values(LOOKUP[q]).forEach(obj =>
      Object.keys(obj).forEach(k => k !== 'Age' && opts.add(k))
    );

    Array.from(opts).sort().forEach(opt => {
      grid.insertAdjacentHTML(
        'beforeend',
        `<label><input type="checkbox" name="${q}" value="${opt}"> ${opt}</label>`
      );
    });

    frag.appendChild(fs);
  });

  /* 5. “Calculate” button + result panel */
const calc     = document.createElement('button');
calc.id        = 'calc';
calc.textContent = 'Calculate';

const results  = document.createElement('div');
results.id     = 'results';

frag.append(calc, results);

  root.appendChild(frag);

  /* ---------- 6. Scoring engine ---------- */
  document.getElementById('calc').addEventListener('click', () => {
    const scores = {};

    questions.forEach(q =>
      document.querySelectorAll(`input[name="${q}"]:checked`).forEach(cb => {
        const choice = cb.value;
        Object.entries(LOOKUP[q]).forEach(([item, weightObj]) => {
          if (choice in weightObj) {
            scores[item] = (scores[item] || 0) + Number(weightObj[choice]);
          }
        });
      })
    );

    const winnerList = (pool, n = 5) =>
      Object.entries(scores)
        .filter(([n]) => pool.includes(n))
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);

    const som = winnerList(SOMATIC);
    const cli = winnerList(CLINICAL);

    const results = document.getElementById('results');
    if (!som.length && !cli.length) {
      results.textContent = 'No matches.';
      return;
    }

    const block = list =>
      '<ol>' + list.map(([item, score]) => {
        const ev  = EVIDENCE[item] || {};
        const sub = ev.subjective ? `<div><em>Subjective:</em> ${ev.subjective}</div>` : '';
        const obj = ev.objective  ? `<div><em>Objective:</em> ${ev.objective}</div>` : '';
        return `<li><strong>${item}</strong> – ${score}${sub}${obj}</li>`;
      }).join('') + '</ol>';

    results.innerHTML =
      (som.length ? `<h2>Top Somatic Sources</h2>${block(som)}` : '') +
      (cli.length ? `<h2>Top Clinical Patterns</h2>${block(cli)}` : '');
  });
})();
