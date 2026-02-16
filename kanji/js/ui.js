// ============================================================
// ui.js — Manipulasi DOM, Rendering, Animasi
// ============================================================

import { DOM_IDS, MODES, LEVELS } from './constants.js';
import { escapeHTML } from './utils.js';
import { getMastery, isLearned, isMastered } from './storage.js';

// =============================================
// HELPERS DOM
// =============================================

export const $ = (id) => document.getElementById(id);

export function show(id) {
  const el = $(id); if (el) el.classList.remove('d-none');
}

export function hide(id) {
  const el = $(id); if (el) el.classList.add('d-none');
}

export function setHTML(id, html) {
  const el = $(id); if (el) el.innerHTML = html;
}

export function setText(id, text) {
  const el = $(id); if (el) el.textContent = text;
}

export function setDisabled(id, disabled) {
  const el = $(id); if (el) el.disabled = disabled;
}

// =============================================
// NAVIGASI LAYAR
// =============================================

const ALL_SCREENS = [
  DOM_IDS.SCREEN_DASHBOARD,
  DOM_IDS.SCREEN_QUIZ,
  DOM_IDS.SCREEN_RESULT,
  DOM_IDS.SCREEN_PROGRESS,
  DOM_IDS.SCREEN_DISPLAY,
];

export function showScreen(screenId) {
  ALL_SCREENS.forEach(id => {
    const el = $(id);
    if (!el) return;
    if (id === screenId) {
      el.classList.remove('d-none');
      el.classList.add('screen-active');
    } else {
      el.classList.add('d-none');
      el.classList.remove('screen-active');
    }
  });
}

// =============================================
// DASHBOARD
// =============================================

export function updateTotalBadge(count, level) {
  const el = $(DOM_IDS.TOTAL_KANJI_BADGE);
  if (!el) return;
  const label = level === LEVELS.ALL ? 'Gabungan' : level;
  el.innerHTML = `<span class="badge-num">${count}</span> Kanji ${label} tersedia`;
}

// =============================================
// MODAL PAKET — Grid Card
// =============================================

export function renderPacketList(packets, modeLabel) {
  setText(DOM_IDS.MODAL_PAKET_TITLE, `Pilih Paket — ${modeLabel}`);
  const container = $(DOM_IDS.PAKET_LIST);
  if (!container) return;

  if (packets.length === 0) {
    container.innerHTML = `<p style="text-align:center;padding:1.5rem;color:var(--c4);font-size:.875rem;">Tidak ada data tersedia.</p>`;
    return;
  }

  const mastery = getMastery();
  let html = '<div class="paket-grid">';

  packets.forEach((packet, idx) => {
    const firstNo  = packet[0].No;
    const lastNo   = packet[packet.length - 1].No;
    const count    = packet.length;
    const packetId = `packet-${idx}`;

    const masteredCount = packet.filter(k => {
      const m = mastery[String(k.No)];
      return m && m.quiz_arti && m.quiz_baca && m.essay_arti && m.essay_baca;
    }).length;

    const pct      = Math.round((masteredCount / count) * 100);
    const barClass = pct === 100 ? 'bar-full' : pct >= 50 ? 'bar-mid' : 'bar-low';

    html += `
      <div class="paket-card" data-index="${idx}">
        <input class="paket-check-hidden" type="checkbox" id="${packetId}" value="${idx}">
        <label class="paket-card-label" for="${packetId}">
          <div class="paket-card-top">
            <span class="paket-card-num">P${idx + 1}</span>
            <span class="paket-card-check-icon">✓</span>
          </div>
          <div class="paket-card-range">${firstNo}–${lastNo}</div>
          <div class="paket-card-count">${count} kanji</div>
          <div class="paket-mini-bar">
            <div class="paket-mini-fill ${barClass}" style="width:${pct}%"></div>
          </div>
          <div class="paket-card-mastered">${masteredCount}/${count}</div>
        </label>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

// =============================================
// LAYAR QUIZ
// =============================================

export function renderQuestion(question, current, total, savedAnswer = null) {
  setText(DOM_IDS.QUIZ_COUNTER, `${current} / ${total}`);
  setText(DOM_IDS.QUIZ_NO_ASLI, `No.${question.kanji.No} · ${question.kanji.level} · ${question.kanji.type}`);

  setHTML(DOM_IDS.QUIZ_KANJI,
    `<span class="q-text-responsive">${escapeHTML(question.kanji.Kanji)}</span>`);

  const inputArea = $(DOM_IDS.QUIZ_INPUT_AREA);
  if (!inputArea) return;

  if (question.type === 'quiz') {
    renderQuizOptions(inputArea, question.options, savedAnswer);
  } else {
    renderEssayInput(inputArea, question.mode, savedAnswer);
  }

  setDisabled(DOM_IDS.BTN_PREV, current === 1);
}

function renderQuizOptions(container, options, savedAnswer) {
  // FIX: opsi dirender sebagai data-value yang EXACT match string asli
  let html = '<div class="options-grid">';
  options.forEach((opt, i) => {
    const sel    = savedAnswer === opt ? 'selected' : '';
    const letter = ['A', 'B', 'C', 'D'][i];
    html += `
      <button class="option-btn ${sel}" data-value="${escapeHTML(opt)}">
        <span class="opt-letter">${letter}</span>
        <span class="opt-text">${escapeHTML(opt)}</span>
      </button>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

function renderEssayInput(container, mode, savedAnswer) {
  const ph = mode === MODES.ESSAY_ARTI
    ? 'Ketik arti dalam Bahasa Indonesia…'
    : 'Ketik cara baca (Romaji atau Hiragana)…';

  container.innerHTML = `
    <div class="essay-wrapper">
      <input type="text" id="essay-input" class="essay-input"
             placeholder="${ph}" value="${escapeHTML(savedAnswer || '')}"
             autocomplete="off" autocorrect="off" spellcheck="false">
      <div class="essay-hint">Tekan Enter untuk lanjut ke soal berikutnya</div>
    </div>`;

  setTimeout(() => {
    const inp = document.getElementById('essay-input');
    if (inp) inp.focus();
  }, 50);
}

export function showFeedback(isCorrect, callback) {
  if (callback) setTimeout(callback, 120);
}

export function highlightOptions() {
  // Tidak highlight — semua hasil tampil di akhir
  document.querySelectorAll('.option-btn').forEach(btn => { btn.disabled = true; });
}

// =============================================
// LAYAR HASIL
// =============================================

export function renderResult(results, score) {
  // ---- Score area ----
  const scoreEl = $(DOM_IDS.RESULT_SCORE);
  if (scoreEl) {
    const emoji = score.percentage === 100 ? '🏆'
                : score.percentage >= 80   ? '⭐'
                : score.percentage >= 50   ? '💪'
                : '📚';

    const colorClass = score.percentage >= 80 ? 'score-great'
                     : score.percentage >= 50 ? 'score-ok'
                     : 'score-low';

    scoreEl.innerHTML = `
      <div class="score-hero ${colorClass}">
        <div class="score-emoji">${emoji}</div>
        <div class="score-big">${score.percentage}<span class="score-pct-sign">%</span></div>
        <div class="score-detail">${score.correct} benar &nbsp;·&nbsp; ${score.total - score.correct} salah &nbsp;·&nbsp; ${score.total} soal</div>
      </div>`;
  }

  // ---- Pembahasan ----
  const listEl = $(DOM_IDS.RESULT_LIST);
  if (!listEl) return;

  // Hitung salah untuk header
  const wrongCount = results.filter(r => !r.isCorrect).length;

  let html = `
    <div class="result-section-head">
      <span class="result-section-title">Pembahasan</span>
      <span class="result-section-meta">${score.correct} ✓ &nbsp; ${wrongCount} ✗</span>
    </div>
    <div class="result-list-wrap">`;

  results.forEach((r, idx) => {
    if (!r || !r.question) return;

    const { question, isCorrect, userAnswer } = r;
    const k    = question.kanji;
    const arti = k.Arti || k.arti || '—';

    let jawaban, info;
    if (question.mode === MODES.QUIZ_ARTI || question.mode === MODES.ESSAY_ARTI) {
      jawaban = arti;
      info    = `${k.Hiragana} · ${k.Romaji}`;
    } else {
      jawaban = k.Hiragana;
      info    = `${k.Romaji} · ${arti}`;
    }

    html += `
      <div class="res-item ${isCorrect ? 'res-correct-item' : 'res-wrong-item'}">
        <div class="res-header">
          <div class="res-kanji-wrap">
            <span class="res-num">${idx + 1}</span>
            <span class="res-kanji">${escapeHTML(k.Kanji)}</span>
          </div>
          <div class="res-badge ${isCorrect ? 'res-badge-correct' : 'res-badge-wrong'}">
            ${isCorrect ? '✓ Benar' : '✗ Salah'}
          </div>
        </div>

        ${!isCorrect && userAnswer && userAnswer !== '(tidak dijawab)' && userAnswer !== '(lupa)' ? `
        <div class="res-row res-row-wrong">
          <span class="res-row-label">Jawabanmu</span>
          <span class="res-row-val res-wrong-val">${escapeHTML(userAnswer)}</span>
        </div>` : ''}

        <div class="res-row res-row-correct">
          <span class="res-row-label">Seharusnya</span>
          <span class="res-row-val res-correct-val">${escapeHTML(jawaban)}</span>
        </div>

        <div class="res-info-row">
          <span class="res-kanji-big">${escapeHTML(k.Kanji)}</span>
          <span class="res-info-text">${escapeHTML(info)}</span>
          <span class="res-level-tag">${escapeHTML(k.level)}</span>
        </div>
      </div>`;
  });

  html += '</div>';
  listEl.innerHTML = html;

  // Tombol perbaiki soal salah
  if (wrongCount > 0) {
    setText(DOM_IDS.WRONG_COUNT_BADGE, wrongCount);
    show(DOM_IDS.BTN_RETRY_WRONG);
  } else {
    hide(DOM_IDS.BTN_RETRY_WRONG);
  }
}

// =============================================
// LAYAR PROGRESS — Sistem sederhana: pernah benar = sudah dipelajari
// =============================================

export function renderProgress(allData, levelFilter, stats) {
  const container = $(DOM_IDS.PROGRESS_CONTENT);
  if (!container) return;

  const mastery    = getMastery();
  const MODES_LIST = ['quiz_arti', 'quiz_baca', 'essay_arti', 'essay_baca'];
  const MODE_ICON  = { quiz_arti: '👁', quiz_baca: '👂', essay_arti: '✍️', essay_baca: '🔤' };

  let list;
  if (levelFilter === LEVELS.N5)      list = allData.filter(k => k.level === 'N5');
  else if (levelFilter === LEVELS.N4) list = allData.filter(k => k.level === 'N4');
  else                                list = allData;

  const stat     = levelFilter === LEVELS.ALL ? stats.ALL : stats[levelFilter];
  const learned  = stat.learned  ?? stat.mastered ?? 0;
  const mastered = stat.mastered ?? 0;
  const pct      = stat.percentage ?? 0;

  let html = `
    <div class="prog-summary-card">
      <div class="prog-summary-row">
        <div class="prog-summary-num">${pct}%</div>
        <div class="prog-summary-label">Dipelajari</div>
      </div>
      <div class="prog-summary-divider"></div>
      <div class="prog-summary-row">
        <div class="prog-summary-num prog-num-green">${learned}</div>
        <div class="prog-summary-label">Sudah benar</div>
      </div>
      <div class="prog-summary-divider"></div>
      <div class="prog-summary-row">
        <div class="prog-summary-num prog-num-teal">${mastered}</div>
        <div class="prog-summary-label">4-mode hafal</div>
      </div>
      <div class="prog-summary-divider"></div>
      <div class="prog-summary-row">
        <div class="prog-summary-num prog-num-dim">${stat.total - learned}</div>
        <div class="prog-summary-label">Belum</div>
      </div>
    </div>

    <div class="prog-bar-outer">
      <div class="prog-bar-fill" style="width:${pct}%"></div>
    </div>
    <div class="prog-bar-hint">Progress naik setiap kali kamu benar menjawab kanji baru</div>

    <div class="progress-list">`;

  list.forEach(k => {
    const m         = mastery[String(k.No)] || {};
    const learned_k = MODES_LIST.some(md => m[md]);
    const master_k  = MODES_LIST.every(md => m[md]);
    const doneCount = MODES_LIST.filter(md => m[md]).length;

    html += `
      <div class="prog-item ${master_k ? 'prog-mastered' : learned_k ? 'prog-learned' : ''}">
        <span class="prog-kanji">${escapeHTML(k.Kanji)}</span>
        <div class="prog-item-middle">
          <span class="prog-arti">${escapeHTML(k.Arti || k.arti || '')}</span>
          ${learned_k ? `<span class="prog-done-count">${doneCount}/4</span>` : ''}
        </div>
        <div class="prog-modes">
          ${MODES_LIST.map(md => `
            <span class="prog-mode-dot ${m[md] ? 'done' : ''}" title="${md}">${MODE_ICON[md]}</span>
          `).join('')}
        </div>
      </div>`;
  });

  html += '</div>';
  container.innerHTML = html;
}

// =============================================
// LAYAR DISPLAY / LIHAT & HAFAL
// =============================================

export function renderDisplayCard(kanji, current, total) {
  setText(DOM_IDS.DISPLAY_COUNTER, `${current} / ${total}`);

  setHTML(DOM_IDS.DISPLAY_KANJI,
    `<span class="q-text-responsive">${escapeHTML(kanji.Kanji)}</span>`);

  // Langsung tampilkan info — tidak perlu tombol reveal
  const artiVal = kanji.Arti || kanji.arti || '—';
  setHTML(DOM_IDS.DISPLAY_REVEAL, `
    <div class="display-info-row">
      <span class="display-info-label">読み方</span>
      <span class="display-info-val display-hira">${escapeHTML(kanji.Hiragana)}</span>
    </div>
    <div class="display-info-row">
      <span class="display-info-label">Romaji</span>
      <span class="display-info-val display-romaji-val">${escapeHTML(kanji.Romaji || '—')}</span>
    </div>
    <div class="display-info-row">
      <span class="display-info-label">Arti</span>
      <span class="display-info-val display-arti-val">${escapeHTML(artiVal)}</span>
    </div>
    <div class="display-info-row">
      <span class="display-info-label">Tipe</span>
      <span class="display-type-badge">${escapeHTML(kanji.type)} · ${escapeHTML(kanji.level)}</span>
    </div>
  `);

  // Langsung tampilkan panel, sembunyikan tombol reveal
  const revealEl  = $(DOM_IDS.DISPLAY_REVEAL);
  const revealBtn = document.getElementById('btn-display-reveal');
  if (revealEl)  revealEl.classList.remove('d-none');
  if (revealBtn) revealBtn.classList.add('d-none');

  setDisabled(DOM_IDS.BTN_DISPLAY_PREV, current === 1);
  setDisabled(DOM_IDS.BTN_DISPLAY_NEXT, current === total);
}

// =============================================
// TOAST
// =============================================

export function showToast(message, type = 'info') {
  const old = document.getElementById('app-toast');
  if (old) old.remove();

  const toast       = document.createElement('div');
  toast.id          = 'app-toast';
  toast.className   = `app-toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add('toast-show'), 10);
  setTimeout(() => {
    toast.classList.remove('toast-show');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}
