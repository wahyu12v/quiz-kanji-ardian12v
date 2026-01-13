import { KEYS } from './constants.js';
import { shuffleArray, normalizeRomaji, hiraToRomaji } from './utils.js';

/**
 * Membangun Pilihan Ganda (Menggunakan Arti Indonesia)
 */
export function buildChoices(orderIndices, allQuestions) {
  return orderIndices.map(idx => {
    const q = allQuestions[idx];
    
    // AMBIL ARTI (Cek huruf besar/kecil agar aman)
    // Prioritas: KEYS.meaning ("Arti") -> "arti" -> "indo"
    const correctMean = String(q[KEYS.meaning] || q['arti'] || q['indo'] || '').trim();
    const correctOption = { meaning: correctMean }; 

    // AMBIL PENGECOH DARI ARTI SOAL LAIN
    let allCandidates = allQuestions
        .map(item => String(item[KEYS.meaning] || item['arti'] || item['indo'] || '').trim())
        .filter(m => m !== "" && m !== correctMean);

    // Acak kandidat pengecoh
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
 * PERBAIKAN: 
 * 1. Mode Quiz -> Cek Arti (Bukan Hiragana)
 * 2. Mode Hafalan -> Cek Arti (Bukan Romaji) + Logika "Nyerempet Benar"
 */
export function gradeSession(state, allQuestions) {
    let correctCount = 0;
    const results = state.batch.map((q, i) => {
        // AMBIL DATA KUNCI
        const hira = String(q[KEYS.hiragana] || q['hiragana'] || '').trim(); 
        const mean = String(q[KEYS.meaning] || q['arti'] || q['indo'] || '').trim(); 
        
        let isCorrect = false;
        let userAnsStr = "Lupa";

        if (state.sessionType === 'quiz') {
            // --- MODE QUIZ (PILIHAN GANDA) ---
            const choiceIdx = state.answers[i];
            const choices = state.choicesPerQ[i];
            
            if (choiceIdx !== null && choiceIdx !== 'Lupa') {
                const choice = choices[choiceIdx];
                // PERBAIKAN: Bandingkan dengan ARTI (mean), bukan hira
                if (choice && choice.meaning === mean) {
                    isCorrect = true;
                }
                userAnsStr = choice ? choice.meaning : "Lupa";
            }
        } else {
            // --- MODE HAFALAN (TULIS ARTI) ---
            const raw = state.answers[i] || '';
            const userAns = raw.toLowerCase().trim();
            
            // 1. Pisahkan kunci jawaban (jika ada "/" atau ",")
            //    Contoh: "Sapaan / Panggilan" -> ["sapaan", "panggilan"]
            const validAnswers = mean.toLowerCase().split(/[\/,]/).map(s => s.trim());
            
            if (raw && raw !== 'Lupa' && userAns.length > 0) {
                // LOGIKA BARU: JAWABAN FLEKSIBEL (PARTIAL MATCH)
                isCorrect = validAnswers.some(key => {
                    // Jika kunci jawaban pendek (<3 huruf), harus sama persis biar aman
                    if (key.length < 3) return key === userAns;

                    // Jika jawaban user terlalu pendek (<2 huruf), harus sama persis
                    if (userAns.length < 2) return key === userAns;

                    // Cek Bolak Balik: 
                    // 1. Apakah Jawaban User ada di dalam Kunci? (Misal: key="Makan nasi", user="makan")
                    // 2. Apakah Kunci ada di dalam Jawaban User? (Misal: key="Anak", user="Anak kecil")
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

// Fungsi acak internal
function internalShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
