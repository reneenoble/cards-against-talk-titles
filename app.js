// ── Default cards (fallback if cards.txt cannot be fetched) ──────────────
const DEFAULT_CARDS = [
  "The first thing I ever built with _",
  "I tried _ so you don't have to",
  "What actually happens when you _",
  "I built _ and learned _",
  "What surprised me about _",
  "From zero to _",
  "Learning _ the hard way",
  "_ explained like you're new to it",
  "How _ works behind the scenes",
  "The rabbit hole of _",
  "My weird experience with _",
  "How I learned _ by building _",
  "The time I accidentally _",
  "I thought _ would be easy, but then _",
  "Why _ is more fun than it looks",
  "The project that got me hooked on _",
  "_ was confusing until I tried _",
  "What I wish someone had told me about _",
  "I made _ with _ and I'm pretty proud of it",
  "Why _ doesn't have to be scary",
];

const MAX_HAND  = 7;
const INIT_HAND = 5;

let allCards      = [];  // [{ template, tags: string[] }]
let filteredCards = [];  // templates only, filtered by poll
let hand             = [];  // current hand: [ { template, filledValues } ]
let openCardIndex = null;

// ── Parse a single CSV row (handles quoted fields with escaped quotes) ─────
function parseCSVRow(row) {
  const fields = [];
  let i = 0;
  while (i < row.length) {
    if (row[i] === '"') {
      let value = '';
      i++; // skip opening quote
      while (i < row.length) {
        if (row[i] === '"' && row[i + 1] === '"') {
          value += '"';
          i += 2;
        } else if (row[i] === '"') {
          i++; // skip closing quote
          break;
        } else {
          value += row[i];
          i++;
        }
      }
      fields.push(value);
      if (row[i] === ',') i++; // skip delimiter
    } else {
      const next = row.indexOf(',', i);
      if (next === -1) {
        fields.push(row.slice(i));
        break;
      }
      fields.push(row.slice(i, next));
      i = next + 1;
    }
  }
  return fields;
}

// ── Load cards.csv ────────────────────────────────────────────────────────
async function loadCards() {
  try {
    const res  = await fetch('cards.csv');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    allCards = [];
    const lines = text.split('\n');
    for (let n = 1; n < lines.length; n++) {   // skip header row
      const line = lines[n].trim();
      if (!line) continue;
      const [template, tagStr] = parseCSVRow(line);
      if (template) {
        const tags = tagStr ? tagStr.trim().split(/\s+/) : ['new-speaker', 'early-career'];
        allCards.push({ template, tags });
      }
    }
    if (allCards.length === 0) {
      allCards = DEFAULT_CARDS.map(t => ({ template: t, tags: ['new-speaker', 'early-career'] }));
    }
  } catch (_) {
    allCards = DEFAULT_CARDS.map(t => ({ template: t, tags: ['new-speaker', 'early-career'] }));
  }
}

// ── Poll logic ────────────────────────────────────────────────────────────
let pollAnswers = { spoken: null, career: null };

function setupPoll() {
  document.querySelectorAll('.poll-options').forEach(group => {
    const question = group.dataset.question;
    group.querySelectorAll('.poll-option').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.poll-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        pollAnswers[question] = parseInt(btn.dataset.value);
        if (pollAnswers.spoken !== null && pollAnswers.career !== null) {
          document.getElementById('start-btn').disabled = false;
        }
      });
    });
  });

  document.getElementById('start-btn').addEventListener('click', () => {
    const playerTags = new Set(['new-speaker', 'early-career']);
    if (pollAnswers.spoken >= 1) playerTags.add('mid-speaker');
    if (pollAnswers.spoken >= 2) playerTags.add('pro-speaker');
    if (pollAnswers.career >= 2) playerTags.add('mid-career');
    if (pollAnswers.career >= 3) playerTags.add('senior-dev');
    startGame(playerTags);
  });

  document.getElementById('skip-poll').addEventListener('click', () => {
    startGame(new Set(['new-speaker', 'mid-speaker', 'pro-speaker', 'early-career', 'mid-career', 'senior-dev']));
  });

  document.getElementById('change-prefs').addEventListener('click', resetToPoll);
}

function startGame(playerTags) {
  filteredCards = allCards
    .filter(c => c.tags.some(tag => playerTags.has(tag)))
    .map(c => c.template);
  if (filteredCards.length === 0) {
    filteredCards = allCards.map(c => c.template);
  }
  document.getElementById('poll-screen').style.display = 'none';
  document.getElementById('game-screen').classList.add('is-active');
  dealHand(INIT_HAND);
}

function resetToPoll() {
  document.getElementById('game-screen').classList.remove('is-active');
  document.getElementById('poll-screen').style.display = '';
  hand = [];
  document.getElementById('hand').innerHTML = '';
}

// ── Utility: Fisher-Yates shuffle ─────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Deal a fresh hand of `n` cards ────────────────────────────────────────
function dealHand(n) {
  const picked = shuffle(filteredCards).slice(0, n);
  hand = picked.map(template => ({ template, filledValues: [] }));
  renderHand();
}

// ── Draw one more card ────────────────────────────────────────────────────
function drawCard() {
  if (hand.length >= MAX_HAND) {
    dealHand(INIT_HAND);
    return;
  }
  const inHand    = new Set(hand.map(c => c.template));
  const available = filteredCards.filter(c => !inHand.has(c));
  const pool      = available.length > 0 ? available : filteredCards;
  const template  = pool[Math.floor(Math.random() * pool.length)];
  hand.push({ template, filledValues: [] });
  renderHand();
}

// ── Render the hand ───────────────────────────────────────────────────────
function renderHand() {
  const handEl  = document.getElementById('hand');
  const drawBtn = document.getElementById('draw-btn');
  const countEl = document.getElementById('card-count');

  countEl.textContent = `${hand.length} / ${MAX_HAND} cards`;
  drawBtn.textContent = hand.length >= MAX_HAND
    ? 'Get a Whole New Hand'
    : 'Draw a Card';

  handEl.innerHTML = '';
  hand.forEach((card, idx) => {
    handEl.appendChild(buildCardEl(card, idx));
  });
}

// ── Build a card DOM element ──────────────────────────────────────────────
function buildCardEl(card, idx) {
  const el = document.createElement('div');
  el.className = 'card' + (card.filledValues.length > 0 ? ' is-filled' : '');
  el.setAttribute('role', 'button');
  el.setAttribute('tabindex', '0');
  el.setAttribute('aria-label', 'Click to fill in this card');

  const bodyEl = document.createElement('div');
  bodyEl.className = 'card-body';
  bodyEl.innerHTML = cardHTML(card);

  const footerEl = document.createElement('div');
  footerEl.className = 'card-footer';
  footerEl.textContent = 'Cards Against Talk Titles';

  el.appendChild(bodyEl);
  el.appendChild(footerEl);

  const activate = () => openModal(idx);
  el.addEventListener('click', activate);
  el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); } });

  return el;
}

// ── Render card text (hand view) ──────────────────────────────────────────
function cardHTML(card) {
  const parts = card.template.split('_');
  const blanks = parts.length - 1;
  if (blanks === 0) {
    return escHtml(card.template);
  }

  return parts.map((part, i) => {
    let out = escHtml(part);
    if (i < blanks) {
      const val = card.filledValues[i];
      if (val) {
        out += `<span class="card-filled-value">${escHtml(val)}</span>`;
      } else {
        out += `<span class="card-blank" aria-hidden="true"></span>`;
      }
    }
    return out;
  }).join('');
}

// ── Modal: open ───────────────────────────────────────────────────────────
function openModal(idx) {
  openCardIndex = idx;
  const card   = hand[idx];
  const parts  = card.template.split('_');
  const blanks = parts.length - 1;

  // Build input fields
  const fillEl = document.getElementById('fill-inputs');
  fillEl.innerHTML = '';
  const inputs = [];

  for (let i = 0; i < blanks; i++) {
    const group = document.createElement('div');
    group.className = 'fill-group';

    const label = document.createElement('label');
    label.setAttribute('for', `blank-${i}`);
    label.textContent = `Blank ${i + 1}`;

    const input = document.createElement('input');
    input.type        = 'text';
    input.id          = `blank-${i}`;
    input.placeholder = 'Fill in the blank\u2026';
    input.value       = card.filledValues[i] || '';

    group.appendChild(label);
    group.appendChild(input);
    fillEl.appendChild(group);
    inputs.push(input);
  }

  // Live preview
  function updatePreview() {
    const preview = document.getElementById('modal-preview');
    preview.innerHTML = previewHTML(parts, inputs);
  }

  inputs.forEach(inp => inp.addEventListener('input', updatePreview));
  updatePreview();

  // Copy button
  document.getElementById('copy-btn').onclick = () => {
    const values  = inputs.map(i => i.value.trim());
    const fullTitle = parts.map((p, i) => p + (i < blanks ? (values[i] || '____') : '')).join('');

    // Save filled values back to hand card
    hand[openCardIndex].filledValues = values;
    renderHand();

    navigator.clipboard.writeText(fullTitle).catch(() => {
      // Clipboard API unavailable – show the title text so user can copy manually
      const fb = document.getElementById('copy-feedback');
      fb.textContent = fullTitle;
      fb.title = 'Select and copy this text';
      fb.style.userSelect = 'text';
      fb.style.cursor = 'text';
    });

    const fb = document.getElementById('copy-feedback');
    fb.classList.add('is-visible');
    setTimeout(() => fb.classList.remove('is-visible'), 2200);
  };

  // Open overlay
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.add('is-open');
  if (inputs.length > 0) {
    inputs[0].focus();
  } else {
    document.getElementById('copy-btn').focus();
  }
}

// ── Modal: preview HTML ───────────────────────────────────────────────────
function previewHTML(parts, inputs) {
  const blanks = parts.length - 1;
  return parts.map((part, i) => {
    let out = escHtml(part);
    if (i < blanks) {
      const val = inputs[i] ? inputs[i].value.trim() : '';
      if (val) {
        out += `<span class="preview-value">${escHtml(val)}</span>`;
      } else {
        out += `<span class="preview-blank" aria-hidden="true"></span>`;
      }
    }
    return out;
  }).join('');
}

// ── Modal: close ──────────────────────────────────────────────────────────
function closeModal() {
  document.getElementById('modal-overlay').classList.remove('is-open');
  document.getElementById('copy-feedback').classList.remove('is-visible');
  openCardIndex = null;
}

// ── HTML escape ───────────────────────────────────────────────────────────
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Render card to canvas as PNG blob ─────────────────────────────────────
function renderCardToCanvas(parts, values) {
  const scale   = 2;            // retina sharpness
  const W       = 680 * scale;
  const pad     = 30 * scale;
  const font    = `bold ${18 * scale}px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
  const footFont = `600 ${5.5 * scale}px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
  const lineH   = 28 * scale;

  // --- Pre-measure to determine card height ---
  const measure = document.createElement('canvas').getContext('2d');
  measure.font = font;
  const maxTextW = W - pad * 2;

  // Build word list with styling info
  const words = [];
  parts.forEach((part, i) => {
    part.split(/(\s+)/).filter(Boolean).forEach(w => words.push({ text: w, filled: false }));
    if (i < parts.length - 1) {
      const val = values[i] ? values[i].trim() : '';
      words.push({ text: val || '____', filled: !!val });
    }
  });

  // Word-wrap
  const lines = [];
  let curLine = [];
  let curW = 0;
  words.forEach(w => {
    const ww = measure.measureText(w.text).width;
    if (curLine.length > 0 && curW + ww > maxTextW) {
      lines.push(curLine);
      curLine = [];
      curW = 0;
    }
    curLine.push(w);
    curW += ww;
  });
  if (curLine.length) lines.push(curLine);

  const textH  = lines.length * lineH;
  const footH  = 20 * scale;
  const minH   = 360 * scale;   // landscape minimum height
  const H      = Math.max(minH, pad + textH + footH + pad);

  // --- Draw ---
  const cvs = document.createElement('canvas');
  cvs.width  = W;
  cvs.height = H;
  const ctx  = cvs.getContext('2d');

  // Card background
  const r = 10 * scale;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(W - r, 0);
  ctx.quadraticCurveTo(W, 0, W, r);
  ctx.lineTo(W, H - r);
  ctx.quadraticCurveTo(W, H, W - r, H);
  ctx.lineTo(r, H);
  ctx.quadraticCurveTo(0, H, 0, H - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();

  // Text
  ctx.font = font;
  ctx.textBaseline = 'top';

  lines.forEach((line, li) => {
    let x = pad;
    const y = pad + li * lineH;
    line.forEach(w => {
      if (w.filled) {
        ctx.fillStyle = '#8AC007';
        ctx.save();
        ctx.font = `bold italic ${18 * scale}px 'Helvetica Neue', Helvetica, Arial, sans-serif`;
        ctx.fillText(w.text, x, y);
        const tw = ctx.measureText(w.text).width;
        // Dotted underline
        ctx.strokeStyle = '#8AC007';
        ctx.lineWidth = 1 * scale;
        ctx.setLineDash([2 * scale, 2 * scale]);
        ctx.beginPath();
        ctx.moveTo(x, y + 20 * scale);
        ctx.lineTo(x + tw, y + 20 * scale);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
        x += tw;
      } else if (w.text === '____') {
        // Blank line
        const blankW = 60 * scale;
        ctx.fillStyle = '#000';
        ctx.lineWidth = 2 * scale;
        ctx.strokeStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(x, y + 20 * scale);
        ctx.lineTo(x + blankW, y + 20 * scale);
        ctx.stroke();
        x += blankW;
      } else {
        ctx.fillStyle = '#000';
        ctx.fillText(w.text, x, y);
        x += ctx.measureText(w.text).width;
      }
    });
  });

  // Footer
  ctx.font = footFont;
  ctx.fillStyle = '#777';
  ctx.textBaseline = 'bottom';
  const footText = 'CARDS AGAINST TALK TITLES';
  const ftW = ctx.measureText(footText).width;
  ctx.fillText(footText, W - pad - ftW, H - pad * 0.6);

  return new Promise(resolve => cvs.toBlob(resolve, 'image/png'));
}

// ── Event listeners ───────────────────────────────────────────────────────
document.getElementById('draw-btn').addEventListener('click', drawCard);
document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

document.getElementById('copy-img-btn').addEventListener('click', async () => {
  if (openCardIndex === null) return;
  const card   = hand[openCardIndex];
  const parts  = card.template.split('_');
  const blanks = parts.length - 1;
  const inputs = [...document.querySelectorAll('#fill-inputs input')];
  const values = inputs.map(i => i.value.trim());

  // Save filled values
  hand[openCardIndex].filledValues = values;
  renderHand();

  const fb = document.getElementById('copy-feedback');
  try {
    const blob = await renderCardToCanvas(parts, values);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    fb.textContent = '✓ Image copied!';
  } catch (_) {
    // Fallback: download image instead
    const blob = await renderCardToCanvas(parts, values);
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'talk-title-card.png';
    a.click();
    URL.revokeObjectURL(url);
    fb.textContent = '✓ Image downloaded!';
  }
  fb.classList.add('is-visible');
  setTimeout(() => {
    fb.classList.remove('is-visible');
    fb.textContent = '✓ Copied!';
  }, 2200);
});

// ── Bootstrap ─────────────────────────────────────────────────────────────
setupPoll();
loadCards();
