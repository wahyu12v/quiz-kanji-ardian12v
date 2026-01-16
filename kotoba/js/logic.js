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

// --- HELPER: HITUNG SKOR KEMIRIPAN (ALGORITMA PENJEBAK) ---
function getSimilarityScore(target, candidate) {
    if (!target || !candidate) return 0;
    let score = 0;

    // 1. Cek Panjang Karakter
    const lenDiff = Math.abs(target.length - candidate.length);
    if (lenDiff === 0) score += 30;       
    else if (lenDiff === 1) score += 10;  
    else score -= 50;                     

    // 2. Cek Huruf Depan
    if (target[0] === candidate[0]) score += 25;

    // 3. Cek Huruf Belakang (Rhyming)
    if (target.slice(-1) === candidate.slice(-1)) score += 15;

    // 4. Cek Huruf Ke-2
    if (target.length > 1 && candidate.length > 1 && target[1] === candidate[1]) score += 10;

    // 5. Cek Kandungan Huruf
    let sharedChars = 0;
    for (let char of candidate) {
        if (target.includes(char)) sharedChars++;
    }
    score += (sharedChars * 2);

    return score;
}

/**
 * 1. MEMBANGUN PILIHAN GANDA (ANTI DUPLIKAT)
 */
export function buildChoices(orderIndices, allQuestions, mode = 'quiz') {
  return orderIndices.map(idx => {
    const q = allQuestions[idx];
    
    let correctVal, keyToCompare;

    // Tentukan Kunci Jawaban Benar berdasarkan Mode
    if (mode === 'quiz_hiragana') {
        correctVal = String(q[KEYS.hiragana] || q['kana'] || '').trim();
    } else {
        correctVal = String(q[KEYS.meaning] || q['arti'] || q['indo'] || '').trim();
    }

    const correctOption = { text: correctVal, isCorrect: true }; 

    // --- ALGORITMA PENGECOH + ANTI DUPLIKAT ---
    
    // 1. Ambil semua kemungkinan jawaban lain (Raw)
    let rawPool = allQuestions.map(item => {
        if (mode === 'quiz_hiragana') return String(item[KEYS.hiragana] || item['kana'] || '').trim();
        return String(item[KEYS.meaning] || item['arti'] || item['indo'] || '').trim();
    });

    // 2. FILTER DUPLIKAT MENGGUNAKAN SET (PENTING!)
    // Ini memastikan 'pool' hanya berisi kata-kata unik, tidak ada yang kembar.
    let uniquePool = [...new Set(rawPool)];

    // 3. Hapus jawaban benar dari pool & Hapus string kosong
    let pool = uniquePool.filter(val => val !== "" && val !== correctVal);

    // 4. Beri Nilai Kemiripan
    let scoredPool = pool.map(candidate => {
        return {
            text: candidate,
            score: getSimilarityScore(correctVal, candidate)
        };
    });

    // 5. Urutkan dari Skor Tertinggi (Paling Mirip)
    scoredPool.sort((a, b) => b.score - a.score);

    // 6. Ambil 3 Teratas
    let topDistractors = scoredPool.slice(0, 3).map(item => ({ text: item.text, isCorrect: false }));

    // Jika database kecil (<4 soal), ambil acak sisa
    if (topDistractors.length < 3) {
        const needed = 3 - topDistractors.length;
        const usedTexts = topDistractors.map(d => d.text);
        // Ambil dari pool yang belum terpakai
        const leftovers = pool.filter(p => !usedTexts.includes(p));
        internalShuffle(leftovers);
        leftovers.slice(0, needed).forEach(t => topDistractors.push({ text: t, isCorrect: false }));
    }

    // Gabungkan & Acak Posisi
    const finalChoices = [correctOption, ...topDistractors];
    return internalShuffle(finalChoices);
  });
}

/**
 * 2. PENILAIAN (GRADING)
 */
export function gradeSession(state, allQuestions) {
    let correctCount = 0;
    const results = state.batch.map((q, i) => {
        
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
                if (choice && choice.isCorrect) {
                    isCorrect = true;
                }
                userAnsStr = choice ? choice.text : "Lupa";
            }
        } else {
            const raw = state.answers[i] || '';
            
            if (raw && raw !== 'Lupa') {
                if (state.sessionType === 'write_romaji') {
                    const cleanRomaji = (text) => text ? text.toLowerCase().replace(/\[.*?\]/g, '').replace(/[~～]/g, '').trim() : "";
                    const cleanDB = cleanRomaji(romajiDB);
                    const cleanUser = cleanRomaji(raw);
                    if (cleanDB === cleanUser) isCorrect = true;
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
            q, 
            isCorrect, 
            userAns: userAnsStr, 
            realHira: hira, 
            realMean: mean, 
            realRomaji: romajiDB, 
            romTrue: hiraToRomaji(hira) 
        };
    });
    
    return { score: correctCount, total: state.batch.length, details: results };
}