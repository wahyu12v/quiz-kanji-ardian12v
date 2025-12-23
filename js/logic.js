


// import { KEYS } from './constants.js';
// import { normalizeRomaji, hiraToRomaji } from './utils.js';

// // --- FUNGSI PENGACAK INTERNAL (Agar Pasti Berhasil) ---
// function internalShuffle(array) {
//   for (let i = array.length - 1; i > 0; i--) {
//     const j = Math.floor(Math.random() * (i + 1));
//     [array[i], array[j]] = [array[j], array[i]];
//   }
//   return array;
// }

// // 1. KUMPULAN TEMA MANUAL
// const MANUAL_THEMES = {
//     ANGKA: ["satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "seratus", "seribu"],
//     ARAH: ["atas", "bawah", "kiri", "kanan", "depan", "belakang", "luar", "dalam", "tengah", "utara", "selatan", "barat", "timur"],
//     KERJA: ["pergi", "datang", "pulang", "makan", "minum", "melihat", "mendengar", "berbicara", "menulis", "membaca", "istirahat", "belajar", "masuk", "keluar"],
//     ALAM: ["gunung", "sungai", "matahari", "bulan", "api", "air", "pohon", "tanah", "langit", "bintang", "angin", "hujan"],
//     ORANG: ["ayah", "ibu", "kakak", "adik", "teman", "orang", "anak", "guru", "murid"],
//     WAKTU: ["sekarang", "hari ini", "besok", "kemarin", "pagi", "siang", "malam", "tahun", "bulan", "minggu", "jam"],
//     SIFAT: ["besar", "kecil", "baru", "lama", "putih", "merah", "biru", "hitam", "murah", "mahal", "tinggi", "rendah"]
// };

// export function buildChoices(orderIndices, allQuestions) {
//   // Buat pool cadangan dari database JSON
//   const globalPool = allQuestions.map(q => ({
//     meaning: String(q[KEYS.meaning] || '').trim().toLowerCase(),
//     hiragana: String(q[KEYS.hiragana] || '').trim()
//   })).filter(v => v.meaning !== "");

//   return orderIndices.map(idx => {
//     const q = allQuestions[idx];
//     const correctMeaning = String(q[KEYS.meaning] || '').trim().toLowerCase();
//     const correct = { meaning: correctMeaning, hiragana: String(q[KEYS.hiragana] || '').trim() };

//     // Tentukan Tema
//     let themePool = [];
//     for (let key in MANUAL_THEMES) {
//       if (MANUAL_THEMES[key].includes(correctMeaning)) {
//         themePool = [...MANUAL_THEMES[key]];
//         break;
//       }
//     }

//     let candidates = [];
//     if (themePool.length > 4) {
//       candidates = themePool.filter(m => m !== correctMeaning).map(m => ({ meaning: m, hiragana: "" }));
//     } else {
//       candidates = [...globalPool].filter(v => v.meaning !== correctMeaning);
//     }

//     // --- PENGACAKAN TOTAL ---
//     internalShuffle(candidates); // Acak siapa yang jadi pilihan salah
    
//     const distractors = candidates.slice(0, 3);
//     const finalChoices = [correct, ...distractors];
    
//     return internalShuffle(finalChoices); // Acak posisi tombol (A, B, C, D)
//   });
// }

// export function gradeSession(state, allQuestions) {
//   let correctCount = 0;
//   const results = state.batch.map((q, i) => {
//     const hira = String(q[KEYS.hiragana] || '').trim();
//     const mean = String(q[KEYS.meaning] || '').trim().toLowerCase();
//     let isCorrect = false;
//     let userAnsStr = "Lupa";

//     if (state.sessionType === 'quiz') {
//       const choiceIdx = state.answers[i];
//       const choices = state.choicesPerQ[i];
//       if (choiceIdx !== null && choiceIdx !== 'Lupa') {
//         const choice = choices[choiceIdx];
//         if (choice && choice.meaning === mean) isCorrect = true;
//         userAnsStr = choice ? choice.meaning : "Lupa";
//       }
//     } else {
//       const raw = state.answers[i] || '';
//       const normUser = normalizeRomaji(raw);
//       const normTrue = normalizeRomaji(hiraToRomaji(hira));
//       if (raw && raw !== 'Lupa' && normUser === normTrue) isCorrect = true;
//       userAnsStr = raw;
//     }

//     if (isCorrect) correctCount++;
//     return { q, isCorrect, userAns: userAnsStr, realHira: hira, realMean: mean, romTrue: hiraToRomaji(hira) };
//   });
//   return { score: correctCount, total: state.batch.length, details: results };
// }


import { KEYS } from './constants.js';
import { shuffleArray, normalizeRomaji, hiraToRomaji } from './utils.js';

// KITA HAPUS MANUAL_THEMES AGAR MURNI DARI DATASET JSON

/**
 * Membangun Pilihan Ganda (Hiragana)
 * Mengambil distractors secara acak langsung dari dataset JSON
 */
export function buildChoices(orderIndices, allQuestions) {
  return orderIndices.map(idx => {
    const q = allQuestions[idx];
    // Jawaban Benar (Kunci)
    const correctHira = String(q[KEYS.hiragana] || '').trim();
    
    // Format objek jawaban benar
    const correctOption = { meaning: correctHira }; 

    // 1. KUMPULKAN KANDIDAT DARI DATASET JSON
    // Ambil semua hiragana dari soal lain, kecuali soal ini
    let allCandidates = allQuestions
        .map(item => String(item[KEYS.hiragana] || '').trim())
        .filter(h => h !== "" && h !== correctHira);

    // 2. ACAK KANDIDAT (SHUFFLE)
    internalShuffle(allCandidates);

    // 3. PILIH 3 PENGECOH UNIK
    // Gunakan Set untuk mencegah ada hiragana kembar jika di JSON ada duplikat
    const distractors = [];
    const seen = new Set();

    for (const hira of allCandidates) {
        if (!seen.has(hira)) {
            seen.add(hira);
            distractors.push({ meaning: hira });
        }
        // Berhenti jika sudah dapat 3 pengecoh
        if (distractors.length >= 3) break;
    }

    // 4. GABUNGKAN (1 Benar + 3 Salah)
    const finalChoices = [correctOption, ...distractors];

    // 5. ACAK POSISI TOMBOL
    return internalShuffle(finalChoices);
  });
}

/**
 * Fungsi Penilaian (Grading)
 * Mencocokkan Pilihan User (Hiragana) vs Kunci Jawaban (Hiragana)
 */
export function gradeSession(state, allQuestions) {
    let correctCount = 0;
    const results = state.batch.map((q, i) => {
        // Data Kunci
        const hira = String(q[KEYS.hiragana] || '').trim(); 
        const mean = String(q[KEYS.meaning] || '').trim().toLowerCase();
        
        let isCorrect = false;
        let userAnsStr = "Lupa";

        if (state.sessionType === 'quiz') {
            const choiceIdx = state.answers[i];
            const choices = state.choicesPerQ[i];
            
            if (choiceIdx !== null && choiceIdx !== 'Lupa') {
                const choice = choices[choiceIdx];
                
                // CEK JAWABAN: Bandingkan Hiragana pilihan user dengan Hiragana soal
                if (choice && choice.meaning === hira) {
                    isCorrect = true;
                }
                userAnsStr = choice ? choice.meaning : "Lupa";
            }
        } else {
            // Mode Essay (Tetap pakai Romaji untuk mengetik)
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

// Fungsi Pengacak Internal (Fisher-Yates Shuffle)
// Biar tidak tergantung file utils.js jika ada error di sana
function internalShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}