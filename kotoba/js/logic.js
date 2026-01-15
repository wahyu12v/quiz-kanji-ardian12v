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

// --- HELPER: BERSIHKAN ROMAJI (Hapus [] dan ~) ---
function cleanRomaji(text) {
    if (!text) return "";
    return text
        .toLowerCase()
        .replace(/\[.*?\]/g, '') // Hapus [isi kurung]
        .replace(/[~～]/g, '')   // Hapus ~
        .trim();
}

/**
 * 1. MEMBANGUN PILIHAN GANDA 
 * Mendukung mode 'quiz' (Tebak Arti) dan 'quiz_hiragana' (Tebak Hiragana Mirip)
 */
export function buildChoices(orderIndices, allQuestions, mode = 'quiz') {
  return orderIndices.map(idx => {
    const q = allQuestions[idx];
    
    let correctVal, allCandidates, keyToCompare;

    if (mode === 'quiz_hiragana') {
        // --- MODE TEBAK HIRAGANA (PILIHAN MIRIP) ---
        // Jawaban Benar = Kana
        correctVal = String(q[KEYS.hiragana] || q['kana'] || '').trim();
        keyToCompare = KEYS.hiragana;
        
        // Ambil semua kemungkinan Hiragana lain
        const pool = allQuestions.map(item => String(item[KEYS.hiragana] || item['kana'] || '').trim());
        
        // **ALGORITMA PENGECOH MIRIP**
        // Cari kata yang akhiran hurufnya SAMA (Rhyming) atau Panjangnya SAMA
        const correctEnd = correctVal.slice(-1); // Huruf terakhir
        
        let similarCandidates = pool.filter(c => 
            c !== "" && c !== correctVal && 
            (c.endsWith(correctEnd) || Math.abs(c.length - correctVal.length) <= 1)
        );

        // Jika tidak cukup kandidat mirip, ambil acak dari sisa pool
        if (similarCandidates.length < 3) {
            const others = pool.filter(c => c !== "" && c !== correctVal && !similarCandidates.includes(c));
            internalShuffle(others);
            similarCandidates = [...similarCandidates, ...others];
        }

        allCandidates = similarCandidates;

    } else {
        // --- MODE STANDARD (TEBAK ARTI) ---
        correctVal = String(q[KEYS.meaning] || q['arti'] || q['indo'] || '').trim();
        keyToCompare = KEYS.meaning; // Fallback key handled inside map if needed, but simple string is ok
        
        // Ambil semua arti lain
        allCandidates = allQuestions
            .map(item => String(item[KEYS.meaning] || item['arti'] || item['indo'] || '').trim())
            .filter(m => m !== "" && m !== correctVal);
    }

    const correctOption = { text: correctVal, isCorrect: true }; 

    // Acak kandidat
    internalShuffle(allCandidates);

    const distractors = [];
    const seen = new Set();
    for (const m of allCandidates) {
        if (!seen.has(m)) {
            seen.add(m);
            distractors.push({ text: m, isCorrect: false });
        }
        if (distractors.length >= 3) break;
    }

    const finalChoices = [correctOption, ...distractors];
    return internalShuffle(finalChoices);
  });
}

/**
 * 2. PENILAIAN (GRADING)
 * Mendukung: Tebak Arti, Tebak Hiragana, Tulis Arti, Tulis Romaji
 */
export function gradeSession(state, allQuestions) {
    let correctCount = 0;
    const results = state.batch.map((q, i) => {
        
        const hira = String(q[KEYS.hiragana] || q['kana'] || '').trim(); 
        const mean = String(q[KEYS.meaning] || q['indo'] || '').trim(); 
        const romajiDB = String(q['romaji'] || '').trim(); // Ambil Romaji dari DB
        
        let isCorrect = false;
        let userAnsStr = "Lupa";

        if (state.sessionType.includes('quiz')) {
            // --- MODE PILIHAN GANDA (Arti & Hiragana) ---
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
            // --- MODE ESSAY (Tulis Arti & Tulis Romaji) ---
            const raw = state.answers[i] || '';
            
            if (raw && raw !== 'Lupa') {
                if (state.sessionType === 'write_romaji') {
                    // --- MODE TULIS ROMAJI ---
                    // Bersihkan Jawaban DB dan User dari simbol [] dan ~
                    const cleanDB = cleanRomaji(romajiDB);
                    const cleanUser = cleanRomaji(raw);
                    
                    // Bandingkan
                    if (cleanDB === cleanUser) isCorrect = true;

                } else {
                    // --- MODE TULIS ARTI (STANDARD) ---
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
            realRomaji: romajiDB, // Untuk display hasil
            romTrue: hiraToRomaji(hira) 
        };
    });
    
    return { score: correctCount, total: state.batch.length, details: results };
}