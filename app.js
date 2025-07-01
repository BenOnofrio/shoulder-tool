/* app.js – Shoulder Diagnostic Tool (browser-only, no build step) */
(async () => {
  /* ---------- 0. HTML landing pad ---------- */
  const root = document.getElementById('shoulder-tool-wrapper');
  if (!root) return console.error('❌  <div id="shoulder-tool-wrapper"> not found');

  /* ---------- 1. Pull in the data ---------- */
  const [LOOKUP, EVIDENCE] = await Promise.all([
    fetch('lookup.json').then(r => r.json()),
    fetch('evidence.json').then(r => r.json())
  ]);

  /* ---------- 2. Static label / group lists ---------- */
  const labels = {
    Q1: '❶ Where is your pain felt?',
    Q2: '❷ Describe the pain',
    Q3: '❸ Intensity (0-10)',
    Q4: '❹ Reactivity',
    Q5: '❺ Aggravating',
    Q6: '❻ Relieving',
    Q7: '❼ History'
  };

  const SOMATIC  = [
    'Supraspinatus','Subscapularis','Infraspinatus','Teres Minor/Major',
    'Biceps Brachii (Long Head)','Trapezius','Levator Scapulae','Latissimus Dorsi',
    'Rhomboids','Pectoralis Major','Pectoralis Minor','Serratus Anterior'
  ];

  const CLINICAL = [
    'Rotator Cuff FT Tear','Rotator Cuff Related Shoulder Pain','Frozen Shoulder',
    'Shoulder Instability','Internal Impingement','Cx Nerve Root Impingement',
    'GHJ OA','Labral Tear','SLAP Tear','Thoracic Outlet Syndrome','Calcific Tendinopathy'
  ];

  /* ---------- 3. Render the seven question cards ---------- */
  const questions = Object.keys(LOOKUP);
  const frag = document.createDocumentFragment();

  questions.forEach(q => {
    const fs    = document.createElement('fieldset');
    const lgnd  = document.createElement('legend');
    lgnd.textContent = labels[q] || q;
    fs.appendChild(lgnd);

    const grid  = document.createElement('div');
    grid.className = 'option-wrap';
    fs.appendChild(grid);

    /* gather & sort unique answer options for this question */
    const opts = new Set();
    Object.values(LOOKUP[q]).forEach(obj =>
      Object.keys(obj).forEach(k => k !== 'Age' && opts.add(k))
    );

    Array.from(opts).sort().forEach(opt => {
      const label = document.createElement('label');
      const cb    = document.createElement('input');
      cb.type  = 'checkbox';
      cb.name  = q;
      cb.value = opt;
      label.append(cb, ` ${opt}`);
      grid.appendChild(label);
    });

    frag.appendChild(fs);
  });

  /* ---------- 4. “Calculate” button + result panel ---------- */
  const btn = document.createElement('button');
  btn.id = 'calc';
  btn.textContent = 'Calculate';
  const results = document.createElement('div');
  results.id = 'results';

  frag.append(btn, results);
  root.appendChild(frag);

  /* ---------- 5. Scoring engine ---------- */
  btn.addEventListener('click', () => {
    const scores = {};

    questions.forEach(q =>
      document
        .querySelectorAll(`input[name="${q}"]:checked`)
        .forEach(cb => {
          const choice = cb.value;
          Object.entries(LOOKUP[q]).forEach(([item, weightObj]) => {
            if (choice in weightObj)
              scores[item] = (scores[item] || 0) + Number(weightObj[choice]);
          });
        })
    );

    const top = (pool, n = 5) =>
      Object.entries(scores)
        .filter(([name]) => pool.includes(name))
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);

    const som   = top(SOMATIC);
    const clin  = top(CLINICAL);

    if (!som.length && !clin.length) {
      results.textContent = 'No matches.';
      return;
    }

    const build = list =>
      `<ol>` +
      list
        .map(([item, score]) => {
          const ev  = EVIDENCE[item] || {};
          const sub = ev.subjective ? `<div><em>Subjective:</em> ${ev.subjective}</div>` : '';
          const obj = ev.objective  ? `<div><em>Objective:</em> ${ev.objective}</div>` : '';
          return `<li><strong>${item}</strong> – ${score}${sub}${obj}</li>`;
        })
        .join('') +
      `</ol>`;

    results.innerHTML =
      (som.length  ? `<h2>Top Somatic Sources</h2>${build(som)}`  : '') +
      (clin.length ? `<h2>Top Clinical Patterns</h2>${build(clin)}` : '');
  });
})();
