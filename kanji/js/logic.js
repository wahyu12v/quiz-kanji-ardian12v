// ============================================================
// logic.js — Otak Algoritma
// ============================================================

import { CHUNK_SIZE, LEVELS, MODES, NUM_OPTIONS } from './constants.js';
import { shuffleArray, getAnswerAliases, isFuzzyMatch, romajiToHiragana, normalizeText } from './utils.js';
import { getMastery, countMastered } from './storage.js';

// =============================================
// FILTER & CHUNKING
// =============================================

export function processData(allData, levelFilter) {
  let filtered;

  if (levelFilter === LEVELS.N5) {
    filtered = allData.filter(k => k.level === 'N5');
  } else if (levelFilter === LEVELS.N4) {
    filtered = allData.filter(k => k.level === 'N4');
  } else {
    const n5 = allData.filter(k => k.level === 'N5').sort((a, b) => a.No - b.No);
    const n4 = allData.filter(k => k.level === 'N4').sort((a, b) => a.No - b.No);
    filtered = [...n5, ...n4];
  }

  const packets = [];
  for (let i = 0; i < filtered.length; i += CHUNK_SIZE) {
    packets.push(filtered.slice(i, i + CHUNK_SIZE));
  }

  return { filtered, packets };
}

export function mergePackets(selectedPackets) {
  return selectedPackets.flat();
}

// =============================================
// PEMBUATAN SOAL
// =============================================

export function buildQuestion(kanji, mode, pool) {
  const question = {
    kanji,
    mode,
    type: mode.startsWith('quiz') ? 'quiz' : 'essay',
    options: null,
    correctKey: '',
    correctAliases: [],
  };

  if (mode === MODES.QUIZ_ARTI || mode === MODES.ESSAY_ARTI) {
    // FIX: handle data entry No.514 yang punya field 'arti' lowercase
    const artiVal = kanji.Arti || kanji.arti || '';
    question.correctKey     = artiVal;
    question.correctAliases = getAnswerAliases(artiVal);
  } else {
    question.correctKey     = kanji.Hiragana;
    question.correctAliases = getAnswerAliases(kanji.Hiragana);
    if (kanji.Romaji) {
      question.correctAliases.push(...getAnswerAliases(kanji.Romaji));
    }
  }

  if (question.type === 'quiz') {
    question.options = buildSmartDistractors(kanji, mode, pool);
  }

  return question;
}

// =============================================
// SMART DISTRACTOR — Menjebak tapi fair
// Bug fix: shuffleArray returns NEW array, assign hasilnya kembali
// =============================================

function buildSmartDistractors(kanji, mode, pool) {
  const isArti        = mode === MODES.QUIZ_ARTI;
  const getField      = (k) => isArti ? (k.Arti || k.arti || '') : (k.Hiragana || '');
  const correctAnswer = getField(kanji);
  const correctNorm   = normalizeText(correctAnswer);

  // Hitung skor kedekatan untuk setiap kandidat
  const scoreCandidate = (k) => {
    const val  = getField(k);
    const norm = normalizeText(val);
    let s = 0;

    if (isArti) {
      // Kedekatan panjang kata
      const lenDiff = Math.abs(val.length - correctAnswer.length);
      s += Math.max(0, 12 - lenDiff * 2);
      // Prefiks 2 karakter sama → sangat menjebak
      if (norm.slice(0, 2) === correctNorm.slice(0, 2)) s += 10;
      else if (norm[0] === correctNorm[0]) s += 5;
      // Jumlah kata sama (frasa mirip)
      if (val.split(' ').length === correctAnswer.split(' ').length) s += 4;
      // Sufiks sama ("membeli" vs "menjual")
      if (norm.slice(-2) === correctNorm.slice(-2)) s += 6;
      // Kata yang overlap (misal "pergi" vs "pergi-pergi")
      const wordSet = new Set(correctAnswer.toLowerCase().split(/[\s,/\-]+/));
      val.toLowerCase().split(/[\s,/\-]+/).forEach(w => {
        if (w.length > 2 && wordSet.has(w)) s += 8;
      });
    } else {
      // Hiragana: mora awal identik = paling menjebak
      if (val.length >= 3 && val.slice(0, 3) === correctAnswer.slice(0, 3)) s += 14;
      else if (val.length >= 2 && val.slice(0, 2) === correctAnswer.slice(0, 2)) s += 10;
      else if (val[0] === correctAnswer[0]) s += 6;
      // Panjang mora mirip
      const lenDiff = Math.abs(val.length - correctAnswer.length);
      s += Math.max(0, 10 - lenDiff * 2);
      // Akhiran sama
      if (val.length >= 2 && val.slice(-2) === correctAnswer.slice(-2)) s += 5;
    }

    // Tipe & level sama → konteks lebih relevan
    if (k.type  === kanji.type)  s += 6;
    if (k.level === kanji.level) s += 4;

    return s;
  };

  // Kumpulkan semua kandidat unik dari pool
  const seen       = new Set([correctNorm]);
  const candidates = [];

  for (const k of pool) {
    if (k.No === kanji.No) continue;
    const val  = getField(k);
    const norm = normalizeText(val);
    if (seen.has(norm)) continue;
    seen.add(norm);
    candidates.push({ val, score: scoreCandidate(k) });
  }

  // Sort descending by score
  candidates.sort((a, b) => b.score - a.score);

  // Ambil top pool (2x kebutuhan) lalu acak — FIX: gunakan hasil return shuffleArray
  const topN        = Math.min(candidates.length, Math.max((NUM_OPTIONS - 1) * 2, 6));
  const topShuffled = shuffleArray(candidates.slice(0, topN)); // FIX: assign result
  const distractors = topShuffled.slice(0, NUM_OPTIONS - 1).map(c => c.val);

  // Fallback jika distractor kurang dari 3
  if (distractors.length < NUM_OPTIONS - 1) {
    for (const c of candidates.slice(topN)) {
      if (distractors.length >= NUM_OPTIONS - 1) break;
      distractors.push(c.val);
    }
  }

  // Gabung & acak final
  return shuffleArray([correctAnswer, ...distractors]);
}

export function buildAllQuestions(kanjiList, mode, fullPool) {
  return kanjiList.map(kanji => buildQuestion(kanji, mode, fullPool));
}

// =============================================
// PENILAIAN JAWABAN
// =============================================

export function gradeAnswer(question, userAnswer) {
  const input = (userAnswer || '').trim();

  if (question.type === 'quiz') {
    // Gunakan normalizeText agar trim + lowercase tidak jadi masalah
    const isCorrect = normalizeText(input) === normalizeText(question.correctKey);
    return { isCorrect, userAnswer: input };
  }

  // Essay: fuzzy match
  let isCorrect = isFuzzyMatch(input, question.correctAliases);

  if (!isCorrect && question.mode === MODES.ESSAY_BACA) {
    const converted = romajiToHiragana(input);
    isCorrect = isFuzzyMatch(converted, question.correctAliases);
  }

  return { isCorrect, userAnswer: input };
}

// =============================================
// PROGRESS & STATISTIK
// =============================================

export function calculateProgress(kanjiList) {
  const total      = kanjiList.length;
  const mastered   = countMastered(kanjiList);
  const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
  return { total, mastered, percentage };
}

export function getAllProgressStats(allData) {
  const n5List = allData.filter(k => k.level === 'N5');
  const n4List = allData.filter(k => k.level === 'N4');
  return {
    N5:  calculateProgress(n5List),
    N4:  calculateProgress(n4List),
    ALL: calculateProgress(allData),
  };
}

export function calcScore(results) {
  const total      = results.length;
  const correct    = results.filter(r => r.isCorrect).length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percentage };
}

export function getWrongKanjiList(results) {
  return results.filter(r => !r.isCorrect).map(r => r.question.kanji);
}
