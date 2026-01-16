import { KEYS } from './constants.js';
import { hiraToRomaji } from './utils.js';
import { getMastery } from './storage.js'; // Import getMastery

// --- FUNGSI ACAK ---
function internalShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// --- HELPER SKOR KEMIRIPAN ---
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

// --- BUILD CHOICES ---
export function buildChoices(orderIndices, allQuestions, mode = 'quiz') {
  return orderIndices.map(idx => {
    const q = allQuestions[idx];
    let correctVal;
    if (mode === 'quiz_hiragana') correctVal = String(q[KEYS.hiragana] || q['kana'] || '').trim();
    else correctVal = String(q[KEYS.meaning] || q['arti'] || q['indo'] || '').trim();

    const correctOption = { text: correctVal, isCorrect: true }; 
    let rawPool = allQuestions.map(item => {
        if (mode === 'quiz_hiragana') return String(item[KEYS.hiragana] || item['kana'] || '').trim();
        return String(item[KEYS.meaning] || item['arti'] || item['indo'] || '').trim();
    });
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

// --- GRADE SESSION (Update: Sertakan Original Index) ---
export function gradeSession(state, allQuestions) {
    let correctCount = 0;
    const results = state.batch.map((q, i) => {
        // Ambil index asli dari pertanyaan ini di database utama (allQuestions)
        // Kita cari berdasarkan referensi object atau ID jika ada. 
        // Karena 'q' adalah referensi dari allQuestions, kita bisa pakai indexOf
        const originalIndex = allQuestions.indexOf(q); 

        const hira = String(q[KEYS.hiragana] || q['kana'] || '').trim(); 
        const mean = String(q[KEYS.meaning] || q['indo'] || '').trim(); 
        const romajiDB = String(q['romaji'] || '').trim(); 
        
        let isCorrect = false;
        let userAnsStr = "Lupa";

        if (state.sessionType.includes('quiz')) {
            const choiceIdx = state.answers[i];
            const choices = state.choicesPerQ[i];
            if (choiceIdx !== null && choiceIdx !== 'Lupa') {
                const choice = choices[choiceIdx];
                if (choice && choice.isCorrect) isCorrect = true;
                userAnsStr = choice ? choice.text : "Lupa";
            }
        } else {
            const raw = state.answers[i] || '';
            if (raw && raw !== 'Lupa') {
                if (state.sessionType === 'write_romaji') {
                    const cleanRomaji = (text) => text ? text.toLowerCase().replace(/\[.*?\]/g, '').replace(/[~～]/g, '').trim() : "";
                    if (cleanRomaji(romajiDB) === cleanRomaji(raw)) isCorrect = true;
                } else {
                    const userAns = raw.toLowerCase().trim();
                    const validAnswers = mean.toLowerCase().split(/[\/,]/).map(s => s.trim());
                    isCorrect = validAnswers.some(key => {
                        if (key.length < 3) return key === userAns;
                        if (userAns.length < 2) return key === userAns;
                        return key.includes(userAns) || userAns.includes(key);
                    });
                }
            }
            userAnsStr = raw;
        }

        if (isCorrect) correctCount++;
        
        return { 
            q, isCorrect, userAns: userAnsStr, 
            realHira: hira, realMean: mean, realRomaji: romajiDB, 
            romTrue: hiraToRomaji(hira),
            originalIndex: originalIndex // PENTING UNTUK SAVE PROGRESS
        };
    });
    
    return { score: correctCount, total: state.batch.length, details: results };
}

// --- NEW: HITUNG PROGRESS PER BAB ---
export function calculateProgress(allQuestions) {
    const mastery = getMastery();
    const babStats = {};

    // 1. Kelompokkan Data per Bab
    allQuestions.forEach((q, idx) => {
        const babName = q.bab || "Lainnya";
        if (!babStats[babName]) {
            babStats[babName] = { totalWords: 0, modes: { quiz:0, quiz_hiragana:0, mem:0, write_romaji:0 } };
        }
        babStats[babName].totalWords++;

        // Cek status mastery untuk kata ini (idx)
        if (mastery[idx]) {
            if (mastery[idx].quiz) babStats[babName].modes.quiz++;
            if (mastery[idx].quiz_hiragana) babStats[babName].modes.quiz_hiragana++;
            if (mastery[idx].mem) babStats[babName].modes.mem++;
            if (mastery[idx].write_romaji) babStats[babName].modes.write_romaji++;
        }
    });

    // 2. Hitung Persentase
    // Total slot per bab = totalWords * 4 (karena ada 4 mode)
    const finalReport = Object.keys(babStats).map(bab => {
        const data = babStats[bab];
        const totalSlots = data.totalWords * 4; // 100% jika semua mode benar
        
        const sumMastered = data.modes.quiz + data.modes.quiz_hiragana + data.modes.mem + data.modes.write_romaji;
        const totalPct = Math.round((sumMastered / totalSlots) * 100);

        // Hitung Kontribusi per Mode (Sesuai request user: total semua mode = 100%)
        // Rumus: (Jumlah Benar Mode X / Total Slot Semua Mode) * 100
        const getContrib = (val) => Math.round((val / totalSlots) * 100);

        return {
            bab: bab,
            totalPct: totalPct,
            detail: {
                tebakArti: getContrib(data.modes.quiz),
                tebakHiragana: getContrib(data.modes.quiz_hiragana),
                tulisArti: getContrib(data.modes.mem),
                tulisRomaji: getContrib(data.modes.write_romaji)
            }
        };
    });

    return finalReport;
}