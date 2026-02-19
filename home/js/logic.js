import { KEYS } from './constants.js';
import { shuffleArray, normalizeRomaji, hiraToRomaji } from './utils.js';

/**
 * Membangun Pilihan Ganda (Hiragana) dengan Logika "NO MERCY SUFFIX"
 * Prioritas Mutlak: Akhiran (Suffix) HARUS SAMA jika stok kata tersedia.
 */
export function buildChoices(orderIndices, allQuestions) {
  return orderIndices.map(idx => {
    const q = allQuestions[idx];
    
    // 1. Jawaban Benar
    const correctHira = String(q[KEYS.hiragana] || '').trim();
    const correctOption = { meaning: correctHira }; 
    
    // Identifikasi Pola Kunci
    const correctSuffix = correctHira.slice(-1); // Huruf terakhir
    const hasTilde = correctHira.includes('～');

    // 2. SIAPKAN POOL KANDIDAT
    let rawCandidates = allQuestions
        .map(item => String(item[KEYS.hiragana] || '').trim())
        .filter(h => h !== "" && h !== correctHira);
    
    const uniquePool = [...new Set(rawCandidates)];

    // 3. PISAHKAN KANDIDAT MENJADI 2 KELOMPOK
    let primaryPool = [];   // Kelompok Prioritas (Akhiran Sama)
    let secondaryPool = []; // Kelompok Cadangan (Akhiran Beda)

    uniquePool.forEach(candidate => {
        let isMatch = false;

        // Aturan Tilde "～"
        if (hasTilde) {
            isMatch = candidate.includes('～');
        } 
        // Aturan Suffix Biasa (bi, i, su, dll)
        else {
            isMatch = candidate.endsWith(correctSuffix);
        }

        if (isMatch) primaryPool.push(candidate);
        else secondaryPool.push(candidate);
    });

    // 4. FUNGSI SCORING KEMIRIPAN (Dipakai untuk memilih yang terbaik dari pool)
    const calculateEvilScore = (candidate) => {
        let score = 0;
        // Panjang Karakter (Makin mirip makin tinggi)
        const lenDiff = Math.abs(candidate.length - correctHira.length);
        if (lenDiff === 0) score += 40;       // Panjang sama persis (+40)
        else if (lenDiff === 1) score += 15;  // Beda 1 huruf (+15)
        else score -= 10;

        // Huruf Depan Sama
        if (candidate[0] === correctHira[0]) score += 20;

        // Overlap Karakter Tengah
        const minLen = Math.min(candidate.length, correctHira.length);
        for (let i = 0; i < minLen; i++) {
            if (candidate[i] === correctHira[i]) score += 5;
        }
        return score;
    };

    // 5. SELEKSI PENGECOH
    let finalDistractors = [];

    // SKENARIO A: Stok "Akhiran Sama" Cukup (>= 3 kata)
    // Kita HANYA akan mengambil dari Primary Pool. Pengecoh yang akhirannya beda DIBUANG.
    if (primaryPool.length >= 3) {
        // Urutkan berdasarkan skor kemiripan (Cari yang paling mirip di antara yang akhirannya sama)
        const scoredPrimary = primaryPool.map(c => ({ word: c, score: calculateEvilScore(c) }));
        scoredPrimary.sort((a, b) => b.score - a.score);
        
        // Ambil 10 teratas (agar variatif saat diacak), lalu pilih 3
        let topSelection = scoredPrimary.slice(0, 10).map(i => i.word);
        internalShuffle(topSelection);
        finalDistractors = topSelection.slice(0, 3);
    } 
    
    // SKENARIO B: Stok "Akhiran Sama" Kurang (< 3 kata)
    // Terpaksa ambil semua yang ada di Primary, sisanya ambil dari Secondary yang paling mirip.
    else {
        finalDistractors = [...primaryPool]; // Ambil semua yang akhirannya sama

        // Cari tambahan dari Secondary Pool
        const scoredSecondary = secondaryPool.map(c => ({ word: c, score: calculateEvilScore(c) }));
        scoredSecondary.sort((a, b) => b.score - a.score); // Cari yang paling mirip visualnya

        const needed = 3 - finalDistractors.length;
        // Ambil kandidat terbaik dari secondary
        let bestBackups = scoredSecondary.slice(0, 15).map(i => i.word);
        internalShuffle(bestBackups);
        
        finalDistractors = [...finalDistractors, ...bestBackups.slice(0, needed)];
    }

    // 6. FINALISASI
    const selectedChoices = finalDistractors.slice(0, 3).map(h => ({ meaning: h }));
    const finalChoices = [correctOption, ...selectedChoices];
    return internalShuffle(finalChoices);
  });
}

/**
 * Fungsi Penilaian (Grading)
 */
export function gradeSession(state, allQuestions) {
    let correctCount = 0;
    const results = state.batch.map((q, i) => {
        const hira = String(q[KEYS.hiragana] || '').trim(); 
        const mean = String(q[KEYS.meaning] || '').trim().toLowerCase();
        
        let isCorrect = false;
        let userAnsStr = "Lupa";

        if (state.sessionType === 'quiz') {
            const choiceIdx = state.answers[i];
            const choices = state.choicesPerQ[i];
            
            if (choiceIdx !== null && choiceIdx !== 'Lupa') {
                const choice = choices[choiceIdx];
                if (choice && choice.meaning === hira) {
                    isCorrect = true;
                }
                userAnsStr = choice ? choice.meaning : "Lupa";
            }
        } else {
            // Mode Essay (Romaji)
            const raw = state.answers[i] || '';
            const normUser = normalizeRomaji(raw);
            const normTrue = normalizeRomaji(hiraToRomaji(hira));
            if (raw && raw !== 'Lupa' && normUser === normTrue) isCorrect = true;
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

// Fungsi Pengacak Internal
function internalShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}