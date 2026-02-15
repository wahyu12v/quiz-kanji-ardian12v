// ============================================================
// storage.js — CRUD ke localStorage
// ============================================================

import { LS_KEYS } from './constants.js';

// =====================
// MASTERY (Hafal Mati)
// =====================

/**
 * Ambil semua data mastery dari localStorage.
 * Format: { [kanjiNo]: { quiz_arti: bool, quiz_baca: bool, essay_arti: bool, essay_baca: bool } }
 * @returns {Object}
 */
export function getMastery() {
  try {
    const raw = localStorage.getItem(LS_KEYS.MASTERY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Update status mastery untuk satu kanji pada satu mode.
 * @param {number|string} kanjiNo - Nomor kanji (key).
 * @param {string} mode - Nama mode (lihat MODES di constants.js).
 * @param {boolean} isCorrect - Apakah dijawab benar.
 */
export function updateMastery(kanjiNo, mode, isCorrect) {
  const mastery = getMastery();
  const key = String(kanjiNo);
  if (!mastery[key]) {
    mastery[key] = {
      quiz_arti:  false,
      quiz_baca:  false,
      essay_arti: false,
      essay_baca: false,
    };
  }
  // Mastery hanya diberikan saat benar; tidak pernah di-reset otomatis ke false
  if (isCorrect) {
    mastery[key][mode] = true;
  }
  try {
    localStorage.setItem(LS_KEYS.MASTERY, JSON.stringify(mastery));
  } catch (e) {
    console.warn('Storage penuh atau error:', e);
  }
}

/**
 * Cek apakah sebuah kanji sudah "Mastered" di semua 4 mode.
 * @param {number|string} kanjiNo
 * @returns {boolean}
 */
export function isMastered(kanjiNo) {
  const mastery = getMastery();
  const key = String(kanjiNo);
  const m = mastery[key];
  if (!m) return false;
  return m.quiz_arti && m.quiz_baca && m.essay_arti && m.essay_baca;
}

/**
 * Hitung jumlah kanji yang sudah mastered dari list tertentu.
 * @param {Array} kanjiList - Array kanji object dengan field No.
 * @returns {number}
 */
export function countMastered(kanjiList) {
  return kanjiList.filter(k => isMastered(k.No)).length;
}

/**
 * Reset seluruh data mastery (hati-hati!).
 */
export function resetAllMastery() {
  localStorage.removeItem(LS_KEYS.MASTERY);
}

// =====================
// HISTORY SESI UJIAN
// =====================

/**
 * Simpan satu sesi hasil ujian ke history.
 * @param {Object} sessionData - { mode, level, total, correct, wrongItems[], timestamp }
 */
export function saveSession(sessionData) {
  try {
    const history = getHistory();
    history.unshift({ ...sessionData, timestamp: Date.now() }); // simpan di depan
    // Batasi history maks 50 entri agar tidak membengkak
    if (history.length > 50) history.length = 50;
    localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.warn('Gagal menyimpan history:', e);
  }
}

/**
 * Ambil semua history sesi.
 * @returns {Array}
 */
export function getHistory() {
  try {
    const raw = localStorage.getItem(LS_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Hapus semua history.
 */
export function clearHistory() {
  localStorage.removeItem(LS_KEYS.HISTORY);
}

// =====================
// PREFERENSI USER
// =====================

/**
 * Simpan preferensi level terakhir user.
 * @param {string} level - 'N5', 'N4', atau 'ALL'.
 */
export function saveLevelPref(level) {
  try {
    localStorage.setItem(LS_KEYS.LEVEL_PREF, level);
  } catch { /* ignore */ }
}

/**
 * Ambil preferensi level terakhir user.
 * @returns {string} Level tersimpan atau 'N5' sebagai default.
 */
export function getLevelPref() {
  return localStorage.getItem(LS_KEYS.LEVEL_PREF) || 'N5';
}
