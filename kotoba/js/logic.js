import { KEYS } from './constants.js';
import { hiraToRomaji } from './utils.js';

// --- FUNGSI ACAK ARRAY ---
function internalShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * 1. MEMBANGUN PILIHAN GANDA (QUIZ)
 * Target: Menampilkan ARTI INDONESIA sebagai pilihan.
 */
export function buildChoices(orderIndices, allQuestions) {
  return orderIndices.map(idx => {
    const q = allQuestions[idx];
    
    // AMBIL ARTI (Cek berbagai key agar aman)
    const correctMean = String(q[KEYS.meaning] || q['arti'] || q['indo'] || '').trim();
    const correctOption = { meaning: correctMean }; 

    // AMBIL PENGECOH (Arti dari soal lain)
    let allCandidates = allQuestions
        .map(item => String(item[KEYS.meaning] || item['arti'] || item['indo'] || '').trim())
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
 * 2. PENILAIAN (GRADING)
 * Target: Cek Arti Indonesia (Flexible Match).
 */
export function gradeSession(state, allQuestions) {
    let correctCount = 0;
    const results = state.batch.map((q, i) => {
        // AMBIL DATA
        const hira = String(q[KEYS.hiragana] || q['kana'] || '').trim(); 
        const mean = String(q[KEYS.meaning] || q['indo'] || '').trim(); 
        
        let isCorrect = false;
        let userAnsStr = "Lupa";

        if (state.sessionType === 'quiz') {
            // --- MODE QUIZ (PILIHAN GANDA) ---
            const choiceIdx = state.answers[i];
            const choices = state.choicesPerQ[i];
            
            if (choiceIdx !== null && choiceIdx !== 'Lupa') {
                const choice = choices[choiceIdx];
                // Bandingkan Pilihan User vs Arti Benar
                if (choice && choice.meaning === mean) {
                    isCorrect = true;
                }
                userAnsStr = choice ? choice.meaning : "Lupa";
            }
        } else {
            // --- MODE HAFALAN (TULIS ARTI) ---
            const raw = state.answers[i] || '';
            const userAns = raw.toLowerCase().trim();
            
            // Siapkan Kunci Jawaban (Pisahkan jika ada "/" atau ",")
            const validAnswers = mean.toLowerCase().split(/[\/,]/).map(s => s.trim());
            
            if (raw && raw !== 'Lupa' && userAns.length > 0) {
                // LOGIKA FLEXIBLE MATCH (Nyerempet Benar)
                isCorrect = validAnswers.some(key => {
                    // 1. Kunci pendek (<3 huruf)? Harus sama persis.
                    if (key.length < 3) return key === userAns;
                    // 2. Jawaban user pendek (<2 huruf)? Harus sama persis.
                    if (userAns.length < 2) return key === userAns;
                    
                    // 3. Cek apakah jawaban user ada di dalam kunci (atau sebaliknya)
                    return key.includes(userAns) || userAns.includes(key);
                });
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