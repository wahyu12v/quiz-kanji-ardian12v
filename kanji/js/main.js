// ============================================================
// main.js — Entry Point, State Global, Event Listeners
// ============================================================

import { DOM_IDS, MODES, MODE_LABELS, LEVELS, MESSAGES } from './constants.js';
import { shuffleArray } from './utils.js';
import { saveLevelPref, getLevelPref, updateMastery, saveSession } from './storage.js';
import {
  processData, mergePackets, buildAllQuestions,
  gradeAnswer, calcScore, getWrongKanjiList, getAllProgressStats
} from './logic.js';
import {
  $, show, hide, showScreen, updateTotalBadge,
  renderPacketList, renderQuestion, renderResult,
  renderProgress, showFeedback, highlightOptions,
  showToast, renderDisplayCard
} from './ui.js';

// =============================================
// STATE GLOBAL
// =============================================
const state = {
  allData:       [],
  currentLevel:  'N5',
  filteredData:  [],
  packets:       [],
  currentMode:   null,
  questions:     [],
  currentQIndex: 0,
  answers:       [],
  pendingAnswer: null,
  isRetryMode:   false,
  displayList:   [],
  displayIndex:  0,
};

// =============================================
// MODAL KONFIRMASI CUSTOM (ganti browser confirm)
// =============================================

/**
 * Tampilkan modal konfirmasi kustom (pengganti window.confirm).
 * @param {Object} opts - { title, message, okLabel, cancelLabel, onOk }
 */
function showConfirmModal({ title, message, okLabel = 'Ya', cancelLabel = 'Batal', onOk }) {
  // Hapus modal lama jika ada
  const old = document.getElementById('confirm-modal-wrapper');
  if (old) old.remove();

  const wrapper = document.createElement('div');
  wrapper.id    = 'confirm-modal-wrapper';
  wrapper.className = 'confirm-modal-backdrop';
  wrapper.innerHTML = `
    <div class="confirm-modal-box" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div class="confirm-modal-header">
        <div class="confirm-modal-icon">⚠️</div>
        <h2 class="confirm-modal-title" id="confirm-title">${title}</h2>
      </div>
      <div class="confirm-modal-body">
        <p class="confirm-modal-msg">${message}</p>
      </div>
      <div class="confirm-modal-footer">
        <button class="btn-confirm-cancel" id="confirm-cancel">${cancelLabel}</button>
        <button class="btn-confirm-ok" id="confirm-ok">${okLabel}</button>
      </div>
    </div>`;

  document.body.appendChild(wrapper);

  // Focus tombol Cancel secara default (safer UX)
  setTimeout(() => {
    const cancelBtn = document.getElementById('confirm-cancel');
    if (cancelBtn) cancelBtn.focus();
  }, 50);

  const close = () => wrapper.remove();

  document.getElementById('confirm-cancel').addEventListener('click', close);
  document.getElementById('confirm-ok').addEventListener('click', () => {
    close();
    if (onOk) onOk();
  });

  // Klik backdrop untuk cancel
  wrapper.addEventListener('click', (e) => {
    if (e.target === wrapper) close();
  });

  // ESC untuk cancel
  const escHandler = (e) => {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
}

// =============================================
// INISIALISASI
// =============================================

async function init() {
  try {
    const res = await fetch('./data/kanjiasli.json');
    if (!res.ok) throw new Error('HTTP error ' + res.status);
    state.allData = await res.json();

    state.currentLevel = getLevelPref();
    setLevelUI(state.currentLevel);
    refreshFilteredData();
    showScreen(DOM_IDS.SCREEN_DASHBOARD);
    attachEventListeners();

  } catch (err) {
    console.error(err);
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;height:100vh;padding:2rem;text-align:center">
        <div>
          <p style="font-size:3rem">⚠️</p>
          <p style="color:#c0392b;font-size:1.1rem">${MESSAGES.DATA_LOAD_ERROR}</p>
          <p style="color:#9e968e;font-size:.9rem">${err.message}</p>
        </div>
      </div>`;
  }
}

// =============================================
// FILTER & REFRESH
// =============================================

function refreshFilteredData() {
  const { filtered, packets } = processData(state.allData, state.currentLevel);
  state.filteredData = filtered;
  state.packets      = packets;
  updateTotalBadge(filtered.length, state.currentLevel);
}

function setLevelUI(level) {
  document.querySelectorAll('input[name="level-filter"]').forEach(r => {
    r.checked = r.value === level;
  });
}

// =============================================
// BUKA MODAL PAKET
// =============================================

function openPacketModal(mode) {
  state.currentMode = mode;
  renderPacketList(state.packets, MODE_LABELS[mode]);

  const modal = bootstrap.Modal.getOrCreateInstance($(DOM_IDS.MODAL_PAKET));
  modal.show();
}

// =============================================
// MULAI SESI UJIAN
// =============================================

function startSession(kanjiList, mode) {
  if (!kanjiList || kanjiList.length === 0) {
    showToast('Tidak ada kanji untuk diujikan!', 'warning');
    return;
  }

  const shuffled      = shuffleArray(kanjiList);
  state.questions     = buildAllQuestions(shuffled, mode, state.filteredData);
  state.answers       = new Array(state.questions.length).fill(null);
  state.currentQIndex = 0;
  state.pendingAnswer = null;

  showScreen(DOM_IDS.SCREEN_QUIZ);
  show(DOM_IDS.BTN_STOP);
  renderCurrentQuestion();
}

function renderCurrentQuestion() {
  const q       = state.questions[state.currentQIndex];
  const saved   = state.answers[state.currentQIndex];
  const savedAns = saved ? saved.userAnswer : null;
  renderQuestion(q, state.currentQIndex + 1, state.questions.length, savedAns);

  // Update progress bar
  updateQuizProgressBar();
}

function updateQuizProgressBar() {
  const fill = document.getElementById('quiz-progress-fill');
  if (fill) {
    const pct = ((state.currentQIndex) / state.questions.length) * 100;
    fill.style.width = pct + '%';
  }
}

// =============================================
// NAVIGASI SOAL
// [DIUBAH] Auto-next setelah pilih, tanpa tampilkan benar/salah
// =============================================

function goNext() {
  const answered = collectCurrentAnswer();

  if (answered !== null) {
    const q      = state.questions[state.currentQIndex];
    const result = gradeAnswer(q, answered);
    state.answers[state.currentQIndex] = { ...result, question: q };
    updateMastery(q.kanji.No, q.mode, result.isCorrect);

    // Langsung pindah tanpa feedback warna
    setTimeout(() => {
      if (state.currentQIndex < state.questions.length - 1) {
        state.currentQIndex++;
        state.pendingAnswer = null;
        renderCurrentQuestion();
      } else {
        finishSession();
      }
    }, 120);
  } else {
    showToast(MESSAGES.EMPTY_ANSWER, 'warning');
  }
}

function goPrev() {
  if (state.currentQIndex > 0) {
    const answered = collectCurrentAnswer();
    if (answered !== null) {
      const q      = state.questions[state.currentQIndex];
      const result = gradeAnswer(q, answered);
      state.answers[state.currentQIndex] = { ...result, question: q };
      updateMastery(q.kanji.No, q.mode, result.isCorrect);
    }
    state.currentQIndex--;
    state.pendingAnswer = null;
    renderCurrentQuestion();
  }
}

function markLupa() {
  const q = state.questions[state.currentQIndex];
  state.answers[state.currentQIndex] = {
    isCorrect:  false,
    userAnswer: '(lupa)',
    question:   q,
  };
  updateMastery(q.kanji.No, q.mode, false);

  setTimeout(() => {
    if (state.currentQIndex < state.questions.length - 1) {
      state.currentQIndex++;
      state.pendingAnswer = null;
      renderCurrentQuestion();
    } else {
      finishSession();
    }
  }, 120);
}

function collectCurrentAnswer() {
  const q = state.questions[state.currentQIndex];
  if (q.type === 'quiz') {
    return state.pendingAnswer || null;
  } else {
    const input = document.getElementById('essay-input');
    return (input && input.value.trim()) ? input.value.trim() : null;
  }
}

// =============================================
// SELESAI SESI
// =============================================

function finishSession() {
  state.questions.forEach((q, i) => {
    if (!state.answers[i]) {
      state.answers[i] = { isCorrect: false, userAnswer: '(tidak dijawab)', question: q };
      updateMastery(q.kanji.No, q.mode, false);
    }
  });

  const score = calcScore(state.answers);
  saveSession({
    mode:       state.currentMode,
    level:      state.currentLevel,
    total:      score.total,
    correct:    score.correct,
    wrongItems: getWrongKanjiList(state.answers).map(k => k.No),
  });

  hide(DOM_IDS.BTN_STOP);
  renderResult(state.answers, score);
  showScreen(DOM_IDS.SCREEN_RESULT);
}

// =============================================
// MODE DISPLAY
// =============================================

function startDisplay(kanjiList) {
  if (!kanjiList || kanjiList.length === 0) {
    showToast('Tidak ada kanji!', 'warning');
    return;
  }
  state.displayList  = kanjiList;
  state.displayIndex = 0;
  showScreen(DOM_IDS.SCREEN_DISPLAY);
  renderCurrentDisplay();
}

function renderCurrentDisplay() {
  const kanji = state.displayList[state.displayIndex];
  renderDisplayCard(kanji, state.displayIndex + 1, state.displayList.length);
}

// =============================================
// EVENT LISTENERS
// =============================================

function attachEventListeners() {

  // Filter Level
  document.querySelectorAll('input[name="level-filter"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.currentLevel = e.target.value;
      saveLevelPref(state.currentLevel);
      refreshFilteredData();
    });
  });

  // Tombol Mode Ujian
  const modeButtons = {
    'btn-mode-quiz-arti':  MODES.QUIZ_ARTI,
    'btn-mode-quiz-baca':  MODES.QUIZ_BACA,
    'btn-mode-essay-arti': MODES.ESSAY_ARTI,
    'btn-mode-essay-baca': MODES.ESSAY_BACA,
  };
  Object.entries(modeButtons).forEach(([id, mode]) => {
    const btn = $(id);
    if (btn) btn.addEventListener('click', () => openPacketModal(mode));
  });

  // Tombol Lihat & Hafal
  const btnDisplay = $('btn-mode-display');
  if (btnDisplay) btnDisplay.addEventListener('click', () => openPacketModal(MODES.DISPLAY));

  // Tombol Cek Progress
  const btnProgress = $('btn-cek-progress');
  if (btnProgress) btnProgress.addEventListener('click', openProgress);

  // Modal: Pilih Semua
  const btnPilihSemua = $(DOM_IDS.BTN_PILIH_SEMUA);
  if (btnPilihSemua) btnPilihSemua.addEventListener('click', () => {
    document.querySelectorAll('.paket-check-hidden').forEach(cb => {
      cb.checked = true;
      cb.closest('.paket-card')?.classList.add('paket-card-selected');
    });
  });

  // Modal: Reset
  const btnReset = $(DOM_IDS.BTN_RESET_PAKET);
  if (btnReset) btnReset.addEventListener('click', () => {
    document.querySelectorAll('.paket-check-hidden').forEach(cb => {
      cb.checked = false;
      cb.closest('.paket-card')?.classList.remove('paket-card-selected');
    });
  });

  // Modal: Toggle card saat checkbox berubah
  const paketList = $(DOM_IDS.PAKET_LIST);
  if (paketList) {
    paketList.addEventListener('change', (e) => {
      if (e.target.classList.contains('paket-check-hidden')) {
        const card = e.target.closest('.paket-card');
        if (card) card.classList.toggle('paket-card-selected', e.target.checked);
      }
    });
  }

  // Modal: Mulai
  const btnMulai = $(DOM_IDS.BTN_MULAI);
  if (btnMulai) btnMulai.addEventListener('click', () => {
    const checked = [...document.querySelectorAll('.paket-check-hidden:checked')];
    if (checked.length === 0) {
      showToast(MESSAGES.NO_PAKET_SELECTED, 'warning');
      return;
    }
    const selectedPackets = checked.map(cb => state.packets[parseInt(cb.value)]);
    const kanjiList       = mergePackets(selectedPackets);
    const modal           = bootstrap.Modal.getInstance($(DOM_IDS.MODAL_PAKET));
    if (modal) modal.hide();

    setTimeout(() => {
      if (state.currentMode === MODES.DISPLAY) {
        startDisplay(kanjiList);
      } else {
        startSession(kanjiList, state.currentMode);
      }
    }, 300);
  });

  // Quiz: Klik pilihan ganda → flash singkat lalu auto-next
  const quizScreen = $(DOM_IDS.SCREEN_QUIZ);
  if (quizScreen) {
    quizScreen.addEventListener('click', (e) => {
      const btn = e.target.closest('.option-btn');
      if (btn && !btn.disabled) {
        // Nonaktifkan semua tombol segera agar tidak double-click
        document.querySelectorAll('.option-btn').forEach(b => {
          b.disabled = true;
          b.classList.remove('selected');
        });
        btn.classList.add('selected', 'opt-flash');
        state.pendingAnswer = btn.dataset.value;
        // Delay 350ms agar user melihat pilihannya sebelum lanjut
        setTimeout(() => {
          btn.classList.remove('opt-flash');
          goNext();
        }, 350);
      }
    });
  }

  // Quiz: Enter di essay input
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const screen = $(DOM_IDS.SCREEN_QUIZ);
      if (screen && !screen.classList.contains('d-none')) {
        goNext();
      }
    }
  });

  // Navigasi Quiz
  const btnPrev = $(DOM_IDS.BTN_PREV);
  const btnNext = $(DOM_IDS.BTN_NEXT);
  const btnLupa = $(DOM_IDS.BTN_LUPA);
  if (btnPrev) btnPrev.addEventListener('click', goPrev);
  if (btnNext) btnNext.addEventListener('click', goNext);
  if (btnLupa) btnLupa.addEventListener('click', markLupa);

  // Tombol Stop → konfirmasi → tampilkan hasil (soal belum dijawab = salah)
  const btnStop = $(DOM_IDS.BTN_STOP);
  if (btnStop) btnStop.addEventListener('click', () => {
    showConfirmModal({
      title:       'Berhenti Ujian?',
      message:     'Soal yang belum dijawab akan dianggap salah. Pembahasan tetap ditampilkan.',
      okLabel:     'Lihat Hasil',
      cancelLabel: 'Lanjutkan',
      onOk: () => {
        finishSession(); // langsung finishSession — soal kosong otomatis jadi salah
      },
    });
  });

  // Hasil
  const btnRetryAll = $(DOM_IDS.BTN_RETRY_ALL);
  if (btnRetryAll) btnRetryAll.addEventListener('click', () => {
    startSession(state.questions.map(q => q.kanji), state.currentMode);
  });

  const btnRetryWrong = $(DOM_IDS.BTN_RETRY_WRONG);
  if (btnRetryWrong) btnRetryWrong.addEventListener('click', () => {
    const wrongList = getWrongKanjiList(state.answers);
    if (wrongList.length === 0) return;
    startSession(wrongList, state.currentMode);
  });

  const btnToMenu = $(DOM_IDS.BTN_TO_MENU);
  if (btnToMenu) btnToMenu.addEventListener('click', () => showScreen(DOM_IDS.SCREEN_DASHBOARD));

  // Progress
  const btnCloseProgress = $(DOM_IDS.BTN_CLOSE_PROGRESS);
  if (btnCloseProgress) btnCloseProgress.addEventListener('click', () => showScreen(DOM_IDS.SCREEN_DASHBOARD));

  // Display: Navigasi
  const btnDisplayPrev  = $(DOM_IDS.BTN_DISPLAY_PREV);
  const btnDisplayNext  = $(DOM_IDS.BTN_DISPLAY_NEXT);
  const btnDisplayClose = $(DOM_IDS.BTN_DISPLAY_CLOSE);

  if (btnDisplayPrev) btnDisplayPrev.addEventListener('click', () => {
    if (state.displayIndex > 0) {
      state.displayIndex--;
      renderCurrentDisplay();
    }
  });

  if (btnDisplayNext) btnDisplayNext.addEventListener('click', () => {
    if (state.displayIndex < state.displayList.length - 1) {
      state.displayIndex++;
      renderCurrentDisplay();
    } else {
      showToast('Semua kanji sudah dilihat! Saatnya ujian 💪', 'success');
      setTimeout(() => showScreen(DOM_IDS.SCREEN_DASHBOARD), 900);
    }
  });

  if (btnDisplayClose) btnDisplayClose.addEventListener('click', () => showScreen(DOM_IDS.SCREEN_DASHBOARD));

  // Display: Tombol Reveal
  const displayScreen = $(DOM_IDS.SCREEN_DISPLAY);
  if (displayScreen) {
    displayScreen.addEventListener('click', (e) => {
      const revealBtn = e.target.closest('#btn-display-reveal');
      if (revealBtn) {
        const revealEl = $(DOM_IDS.DISPLAY_REVEAL);
        if (revealEl) revealEl.classList.remove('d-none');
        revealBtn.classList.add('d-none');
      }
    });
  }
}

// =============================================
// PROGRESS
// =============================================

function openProgress() {
  const stats = getAllProgressStats(state.allData);
  renderProgress(state.allData, state.currentLevel, stats);
  showScreen(DOM_IDS.SCREEN_PROGRESS);
}

// =============================================
// JALANKAN
// =============================================
document.addEventListener('DOMContentLoaded', init);
