import { KEYS } from './constants.js';
import { hiraToRomaji } from './utils.js';
import { getMastery } from './storage.js';

function internalShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function getSimilarityScore(target, candidate) {
    if (!target || !candidate) return 0;
    let score = 0;
    const lenDiff = Math.abs(target.length - candidate.length);
    if (lenDiff === 0) score += 30; else if (lenDiff === 1) score += 10; else score -= 50;
    if (target[0] === candidate[0]) score += 25;
    if (target.slice(-1) === candidate.slice(-1)) score += 15;
    if (target.length > 1 && candidate.length > 1 && target[1] === candidate[1]) score += 10;
    let sharedChars = 0;
    for (let char of candidate) { if (target.includes(char)) sharedChars++; }
    score += (sharedChars * 2);
    return score;
}

// --- ALGORITMA LEVENSHTEIN (MENGHITUNG JARAK TYPO) ---
function levenshtein(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function checkFuzzyAnswer(userRaw, dbValueString) {
    if (!userRaw || userRaw === 'Lupa') return false;
    const user = userRaw.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
    const candidates = dbValueString.toLowerCase().split(/[\/,]/).map(s => s.trim()).filter(s => s);

    return candidates.some(target => {
        const cleanTarget = target.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");
        if (user === cleanTarget) return true;
        if (user.length >= 3 && cleanTarget.includes(user)) return true;
        const dist = levenshtein(user, cleanTarget);
        const tolerance = Math.max(1, Math.floor(cleanTarget.length / 4));
        if (dist <= tolerance) return true;
        return false;
    });
}

// --- BUILD CHOICES ---
export function buildChoices(orderIndices, allQuestions, mode = 'quiz') {
  return orderIndices.map(idx => {
    const q = allQuestions[idx];
    let correctVal;
    let rawPool;

    if (mode === 'quiz_hiragana') {
        // Mode Tebak Cara Baca -> Pilihan: HIRAGANA
        correctVal = String(q[KEYS.hiragana] || '').trim();
        rawPool = allQuestions.map(item => String(item[KEYS.hiragana] || '').trim());
    } else {
        // Mode Tebak Arti (Default) -> Pilihan: ARTI INDONESIA
        correctVal = String(q[KEYS.meaning] || '').trim();
        rawPool = allQuestions.map(item => String(item[KEYS.meaning] || '').trim());
    }

    const correctOption = { text: correctVal, isCorrect: true };

    let uniquePool = [...new Set(rawPool)];
    let pool = uniquePool.filter(val => val !== "" && val !== correctVal);

    let scoredPool = pool.map(candidate => ({ text: candidate, score: getSimilarityScore(correctVal, candidate) }));
    scoredPool.sort((a, b) => b.score - a.score);
    let topDistractors = scoredPool.slice(0, 3).map(item => ({ text: item.text, isCorrect: false }));

    if (topDistractors.length < 3) {
        const needed = 3 - topDistractors.length;
        const usedTexts = topDistractors.map(d => d.text);
        const leftovers = pool.filter(p => !usedTexts.includes(p));
        internalShuffle(leftovers);
        leftovers.slice(0, needed).forEach(t => topDistractors.push({ text: t, isCorrect: false }));
    }
    const finalChoices = [correctOption, ...topDistractors];
    return internalShuffle(finalChoices);
  });
}

export function gradeSession(state, allQuestions) {
    let correctCount = 0;
    const results = state.batch.map((q, i) => {
        const originalIndex = allQuestions.indexOf(q);
        // Gunakan KEYS (huruf kapital) sesuai struktur JSON kanji
        const hira     = String(q[KEYS.hiragana] || '').trim();
        const mean     = String(q[KEYS.meaning]  || '').trim();
        const romajiDB = String(q['Romaji']      || '').trim();

        let isCorrect = false;
        let userAnsStr = "Lupa";

        if (state.sessionType.includes('quiz')) {
            const choiceIdx = state.answers[i];
            const choices   = state.choicesPerQ[i];
            if (choiceIdx !== null && choiceIdx !== 'Lupa') {
                const choice = choices[choiceIdx];
                if (choice && choice.isCorrect) isCorrect = true;
                userAnsStr = choice ? choice.text : "Lupa";
            }
        } else {
            const raw = state.answers[i] || '';
            userAnsStr = raw === 'Lupa' ? 'Lupa' : raw;
            if (userAnsStr !== 'Lupa') {
                if (state.sessionType === 'write_romaji') {
                    const validKeys = romajiDB + " / " + hira;
                    isCorrect = checkFuzzyAnswer(raw, validKeys);
                } else {
                    isCorrect = checkFuzzyAnswer(raw, mean);
                }
            }
        }

        if (isCorrect) correctCount++;
        return { q, isCorrect, userAns: userAnsStr, realHira: hira, realMean: mean, realRomaji: romajiDB, originalIndex };
    });
    return { score: correctCount, total: state.batch.length, details: results };
}

export function calculateProgress(allQuestions) {
    const mastery  = getMastery();
    const babStats = {};

    allQuestions.forEach((q, idx) => {
        // Gunakan field 'level' sebagai pengelompokan (N5, N4, dst.)
        const levelName = q.level || "Lainnya";
        if (!babStats[levelName]) {
            babStats[levelName] = { totalWords: 0, modes: { quiz: 0, quiz_hiragana: 0, mem: 0, write_romaji: 0 } };
        }
        babStats[levelName].totalWords++;

        if (mastery[idx]) {
            if (mastery[idx].quiz)          babStats[levelName].modes.quiz++;
            if (mastery[idx].quiz_hiragana) babStats[levelName].modes.quiz_hiragana++;
            if (mastery[idx].mem)           babStats[levelName].modes.mem++;
            if (mastery[idx].write_romaji)  babStats[levelName].modes.write_romaji++;
        }
    });

    const finalReport = Object.keys(babStats).sort().map(level => {
        const data       = babStats[level];
        const totalWords = data.totalWords;
        const totalSlots = totalWords * 4;

        const sumMastered = data.modes.quiz + data.modes.quiz_hiragana + data.modes.mem + data.modes.write_romaji;
        const totalPct    = totalSlots > 0 ? Math.round((sumMastered / totalSlots) * 100) : 0;
        const getModePct  = (val) => totalWords > 0 ? Math.round((val / totalWords) * 100) : 0;

        return {
            bab: level,
            totalPct,
            detail: {
                tebakArti:    getModePct(data.modes.quiz),
                tebakCaraBaca: getModePct(data.modes.quiz_hiragana),
                tulisArti:    getModePct(data.modes.mem),
                tulisRomaji:  getModePct(data.modes.write_romaji)
            }
        };
    });

    return finalReport;
}
