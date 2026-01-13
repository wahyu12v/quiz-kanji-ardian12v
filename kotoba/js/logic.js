import { KEYS } from './constants.js';
import { shuffleArray, normalizeRomaji, hiraToRomaji } from './utils.js';

/**
 * Membangun Pilihan Ganda (Arti Indonesia)
 */
export function buildChoices(orderIndices, allQuestions) {
  return orderIndices.map(idx => {
    const q = allQuestions[idx];
    const correctMean = String(q[KEYS.meaning] || q['arti'] || '').trim();
    const correctOption = { meaning: correctMean }; 

    let allCandidates = allQuestions
        .map(item => String(item[KEYS.meaning] || item['arti'] || '').trim())
        .filter(m => m !== "" && m !== correctMean);

    internalShuffle(allCandidates);

    const distractors = [];
    const seen = new Set();
    for (const m of allCandidates) {
        if (!seen.has(m)) {
            seen.add(m);
            distractors.push({ meaning: m });
        }
        if (distractors.length >= 3) break;
    }

    const finalChoices = [correctOption, ...distractors];
    return internalShuffle(finalChoices);
  });
}

/**
 * Fungsi Penilaian (Grading)
 * PERBAIKAN: Menggunakan pencocokan parsial agar jawaban tidak lengkap tetap benar.
 */
export function gradeSession(state, allQuestions) {
    let correctCount = 0;
    const results = state.batch.map((q, i) => {
        const hira = String(q[KEYS.hiragana] || '').trim(); 
        const mean = String(q[KEYS.meaning] || q['arti'] || '').trim(); 
        
        let isCorrect = false;
        let userAnsStr = "Lupa";

        if (state.sessionType === 'quiz') {
            const choiceIdx = state.answers[i];
            const choices = state.choicesPerQ[i];
            
            if (choiceIdx !== null && choiceIdx !== 'Lupa') {
                const choice = choices[choiceIdx];
                if (choice && choice.meaning === mean) {
                    isCorrect = true;
                }
                userAnsStr = choice ? choice.meaning : "Lupa";
            }
        } else {
            // --- MODE HAFALAN (ESSAY/KETIK) ---
            const raw = state.answers[i] || '';
            const userAns = raw.toLowerCase().trim();
            
            // Pisahkan kunci jawaban (misal: "makan / memakan" menjadi ["makan", "memakan"])
            const validAnswers = mean.toLowerCase().split(/[\/,]/).map(s => s.trim());
            
            if (raw && raw !== 'Lupa' && userAns !== "") {
                // LOGIKA BARU: Cek apakah jawaban user ada di dalam salah satu kunci 
                // ATAU salah satu kunci mengandung jawaban user.
                // Contoh: Kunci "Sapaan akrab", User jawab "Sapaan" -> BENAR.
                isCorrect = validAnswers.some(key => 
                    key.includes(userAns) || userAns.includes(key)
                );
            }
            userAnsStr = raw;
        }

        if (isCorrect) correctCount++;
        
        return { 
            q, 
            isCorrect, 
            userAns: userAnsStr, 
            realHira: hira, 
            realMean: mean, 
            romTrue: hiraToRomaji(hira) 
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