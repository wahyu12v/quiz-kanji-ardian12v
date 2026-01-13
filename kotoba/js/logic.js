import { KEYS } from './constants.js';
import { shuffleArray, normalizeRomaji } from './utils.js';

/**
 * Membangun Pilihan Ganda (Tebak Arti)
 * Mengambil distractors (pengecoh) dari arti soal lain.
 */
export function buildChoices(orderIndices, allQuestions) {
  return orderIndices.map(idx => {
    const q = allQuestions[idx];
    
    // Jawaban Benar (Arti Bahasa Indonesia)
    const correctMeaning = String(q[KEYS.meaning] || '').trim();
    const correctOption = { meaning: correctMeaning }; 

    // 1. KUMPULKAN KANDIDAT PENGECOH
    let allCandidates = allQuestions
        .map(item => String(item[KEYS.meaning] || '').trim())
        .filter(m => m !== "" && m !== correctMeaning);

    // 2. ACAK KANDIDAT
    internalShuffle(allCandidates);

    // 3. PILIH 3 PENGECOH UNIK
    const distractors = [];
    const seen = new Set();

    for (const m of allCandidates) {
        if (!seen.has(m)) {
            seen.add(m);
            distractors.push({ meaning: m });
        }
        if (distractors.length >= 3) break;
    }

    // 4. GABUNGKAN (1 Benar + 3 Salah)
    const finalChoices = [correctOption, ...distractors];

    // 5. ACAK POSISI
    return internalShuffle(finalChoices);
  });
}

/**
 * Fungsi Penilaian
 * Quiz: Cocokkan Arti
 * Essay: Cocokkan Romaji
 */
export function gradeSession(state, allQuestions) {
    let correctCount = 0;
    const results = state.batch.map((q, i) => {
        // Data Kunci
        const soal = String(q[KEYS.kanji] || '').trim(); 
        const arti = String(q[KEYS.meaning] || '').trim();
        const kana = String(q[KEYS.hiragana] || '').trim();
        const kunciRomaji = String(q[KEYS.romaji] || '').trim();
        
        let isCorrect = false;
        let userAnsStr = "Lupa";

        if (state.sessionType === 'quiz') {
            const choiceIdx = state.answers[i];
            const choices = state.choicesPerQ[i];
            
            if (choiceIdx !== null && choiceIdx !== 'Lupa') {
                const choice = choices[choiceIdx];
                // Cek apakah arti yang dipilih benar
                if (choice && choice.meaning === arti) {
                    isCorrect = true;
                }
                userAnsStr = choice ? choice.meaning : "Lupa";
            }
        } else {
            // Mode Essay (Ketik Romaji)
            const raw = state.answers[i] || '';
            const normUser = normalizeRomaji(raw);
            const normTrue = normalizeRomaji(kunciRomaji);
            
            if (raw && raw !== 'Lupa' && normUser === normTrue) isCorrect = true;
            userAnsStr = raw;
        }

        if (isCorrect) correctCount++;
        return { 
            q, 
            isCorrect, 
            userAns: userAnsStr, 
            realHira: kana, // Ditampilkan di hasil
            realMean: arti, 
            romTrue: kunciRomaji 
        };
    });
    
    return { score: correctCount, total: state.batch.length, details: results };
}

function internalShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}