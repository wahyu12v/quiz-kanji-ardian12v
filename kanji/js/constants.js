// ============================================================
// constants.js — Konfigurasi Statis Aplikasi Kanji Mastery
// ============================================================

// --- Key untuk localStorage ---
export const LS_KEYS = {
  MASTERY:    'kanji_mastery_v1',
  HISTORY:    'kanji_history_v1',
  LEVEL_PREF: 'kanji_level_pref_v1',
};

// --- Ukuran Paket (Chunking) ---
export const CHUNK_SIZE = 20;

// --- Mode Ujian ---
export const MODES = {
  QUIZ_ARTI:  'quiz_arti',
  QUIZ_BACA:  'quiz_baca',
  ESSAY_ARTI: 'essay_arti',
  ESSAY_BACA: 'essay_baca',
  DISPLAY:    'display',     // [BARU] Mode lihat/hafal sebelum latihan
};

// --- Label mode ujian ---
export const MODE_LABELS = {
  quiz_arti:  'Tebak Arti',
  quiz_baca:  'Tebak Cara Baca',
  essay_arti: 'Tulis Arti',
  essay_baca: 'Tulis Cara Baca',
  display:    'Lihat & Hafal',
};

// --- Filter Level ---
export const LEVELS = {
  N5:  'N5',
  N4:  'N4',
  ALL: 'ALL',
};

// --- ID Elemen DOM Utama ---
export const DOM_IDS = {
  // Dashboard
  APP_CONTAINER:        'app-container',
  TOTAL_KANJI_BADGE:    'total-kanji-badge',
  LEVEL_FILTER_GROUP:   'level-filter-group',

  // Layar
  SCREEN_DASHBOARD:     'screen-dashboard',
  SCREEN_QUIZ:          'screen-quiz',
  SCREEN_RESULT:        'screen-result',
  SCREEN_PROGRESS:      'screen-progress',
  SCREEN_DISPLAY:       'screen-display',   // [BARU]

  // Modal Paket
  MODAL_PAKET:          'modal-paket',
  MODAL_PAKET_TITLE:    'modal-paket-title',
  PAKET_LIST:           'paket-list',
  BTN_PILIH_SEMUA:      'btn-pilih-semua',
  BTN_RESET_PAKET:      'btn-reset-paket',
  BTN_MULAI:            'btn-mulai',

  // Quiz
  QUIZ_COUNTER:         'quiz-counter',
  QUIZ_NO_ASLI:         'quiz-no-asli',
  QUIZ_KANJI:           'quiz-kanji',
  QUIZ_INPUT_AREA:      'quiz-input-area',
  BTN_PREV:             'btn-prev',
  BTN_LUPA:             'btn-lupa',
  BTN_NEXT:             'btn-next',
  BTN_STOP:             'btn-stop',
  FEEDBACK_OVERLAY:     'feedback-overlay',

  // Hasil
  RESULT_SCORE:         'result-score',
  RESULT_SCORE_LABEL:   'result-score-label',
  RESULT_LIST:          'result-list',
  BTN_RETRY_ALL:        'btn-retry-all',
  BTN_RETRY_WRONG:      'btn-retry-wrong',
  BTN_TO_MENU:          'btn-to-menu',
  WRONG_COUNT_BADGE:    'wrong-count-badge',

  // Progress
  PROGRESS_CONTENT:     'progress-content',
  BTN_CLOSE_PROGRESS:   'btn-close-progress',

  // Display / Lihat Kanji [BARU]
  DISPLAY_COUNTER:      'display-counter',
  DISPLAY_KANJI:        'display-kanji',
  DISPLAY_HIRAGANA:     'display-hiragana',
  DISPLAY_ROMAJI:       'display-romaji',
  DISPLAY_ARTI:         'display-arti',
  DISPLAY_TYPE:         'display-type',
  DISPLAY_REVEAL:       'display-reveal',
  BTN_DISPLAY_PREV:     'btn-display-prev',
  BTN_DISPLAY_NEXT:     'btn-display-next',
  BTN_DISPLAY_CLOSE:    'btn-display-close',
};

// --- Pesan Error ---
export const MESSAGES = {
  DATA_LOAD_ERROR:    'Gagal memuat data Kanji. Pastikan file data/kanjiasli.json tersedia.',
  NO_PAKET_SELECTED:  'Pilih minimal satu paket sebelum memulai!',
  EMPTY_ANSWER:       'Jawaban tidak boleh kosong!',
};

// --- Jumlah pilihan ganda ---
export const NUM_OPTIONS = 4;
