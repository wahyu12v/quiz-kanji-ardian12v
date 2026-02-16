// ============================================================
// storage.js — CRUD ke localStorage
// ============================================================

import { LS_KEYS } from './constants.js';

// =====================
// MASTERY — Sistem Baru: per-kanji, track berapa mode sudah benar
// Progress = jumlah kanji yang pernah dijawab benar minimal 1 mode / total
// =====================

export function getMastery() {
  try {
    const raw = localStorage.getItem(LS_KEYS.MASTERY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Update mastery: mode apapun yang dijawab benar akan ditandai.
 * Mastery tidak pernah di-reset ke false secara otomatis.
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
      correctCount: 0, // berapa mode yang sudah pernah benar
    };
  }
  if (isCorrect && !mastery[key][mode]) {
    mastery[key][mode] = true;
    // Hitung ulang correctCount
    const modes = ['quiz_arti','quiz_baca','essay_arti','essay_baca'];
    mastery[key].correctCount = modes.filter(m => mastery[key][m]).length;
  }
  try {
    localStorage.setItem(LS_KEYS.MASTERY, JSON.stringify(mastery));
  } catch (e) {
    console.warn('Storage error:', e);
  }
}

/**
 * Kanji dianggap "sudah dipelajari" jika PERNAH dijawab benar di minimal 1 mode.
 * Kanji dianggap "mastered" jika sudah benar di semua 4 mode.
 */
export function isLearned(kanjiNo) {
  const mastery = getMastery();
  const m = mastery[String(kanjiNo)];
  if (!m) return false;
  return m.quiz_arti || m.quiz_baca || m.essay_arti || m.essay_baca;
}

export function isMastered(kanjiNo) {
  const mastery = getMastery();
  const m = mastery[String(kanjiNo)];
  if (!m) return false;
  return m.quiz_arti && m.quiz_baca && m.essay_arti && m.essay_baca;
}

export function countLearned(kanjiList) {
  return kanjiList.filter(k => isLearned(k.No)).length;
}

export function countMastered(kanjiList) {
  return kanjiList.filter(k => isMastered(k.No)).length;
}

export function resetAllMastery() {
  localStorage.removeItem(LS_KEYS.MASTERY);
}

// =====================
// HISTORY
// =====================

export function saveSession(sessionData) {
  try {
    const history = getHistory();
    history.unshift({ ...sessionData, timestamp: Date.now() });
    if (history.length > 50) history.length = 50;
    localStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.warn('Gagal menyimpan history:', e);
  }
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(LS_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearHistory() {
  localStorage.removeItem(LS_KEYS.HISTORY);
}

// =====================
// PREFERENSI
// =====================

export function saveLevelPref(level) {
  try { localStorage.setItem(LS_KEYS.LEVEL_PREF, level); } catch { }
}

export function getLevelPref() {
  return localStorage.getItem(LS_KEYS.LEVEL_PREF) || 'N5';
}
