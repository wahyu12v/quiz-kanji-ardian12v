// import { KEYS } from './constants.js';
// import { shuffleArray, extractHiraganaSubstrings, normalizeRomaji, hiraToRomaji } from './utils.js';

// export function buildChoices(orderIndices, allQuestions) {
//   // 1. Kumpulkan semua kemungkinan jawaban unik dari database
//   const uniquePool = [];
//   const seen = new Set();
//   allQuestions.forEach(q => {
//     const val = { meaning: String(q[KEYS.meaning]||'').trim(), hiragana: String(q[KEYS.hiragana]||'').trim() };
//     if(val.meaning && !seen.has(val.meaning+val.hiragana)) {
//         seen.add(val.meaning+val.hiragana);
//         uniquePool.push(val);
//     }
//   });

//   // 2. Buat pilihan untuk setiap soal
//   return orderIndices.map(idx => {
//       const q = allQuestions[idx];
//       const correct = { meaning: String(q[KEYS.meaning]||'').trim(), hiragana: String(q[KEYS.hiragana]||'').trim() };
      
//       const kanjiHiraParts = extractHiraganaSubstrings(String(q[KEYS.kanji]||''));
      
//       let distractors = uniquePool.filter(o => {
//           if (o.meaning === correct.meaning) return false;
//           if (kanjiHiraParts.some(part => o.hiragana.includes(part))) return false;
//           return true;
//       });

//       shuffleArray(distractors);
//       const choices = [correct, ...distractors.slice(0, 3)];
//       return shuffleArray(choices);
//   });
// }

// export function gradeSession(state, allQuestions) {
//     let correct = 0;
//     const results = state.batch.map((q, i) => {
//         const origIdx = state.orderIndices[i];
//         const hira = String(q[KEYS.hiragana]||'').trim();
//         const mean = String(q[KEYS.meaning]||'').trim();
        
//         let isCorrect = false;
//         let userAns = null;

//         if (state.sessionType === 'quiz') {
//             const choiceIdx = state.answers[i];
//             const choices = state.choicesPerQ[i];
//             if (choiceIdx !== null && choiceIdx !== 'Lupa') {
//                 const choice = choices[choiceIdx];
//                 if (choice && choice.meaning === mean && choice.hiragana === hira) isCorrect = true;
//                 userAns = choice;
//             } else {
//                 userAns = choiceIdx;
//             }
//         } else {
//             const raw = state.answers[i] || '';
//             const normUser = normalizeRomaji(raw);
//             const normTrue = normalizeRomaji(hiraToRomaji(hira));
//             if (raw && raw !== 'Lupa' && normUser === normTrue) isCorrect = true;
//             userAns = raw;
//         }

//         if (isCorrect) correct++;
//         return { q, isCorrect, userAns, realHira: hira, realMean: mean, romTrue: hiraToRomaji(hira) };
//     });
    
//     return { score: correct, total: state.batch.length, details: results };
// }





import { KEYS } from './constants.js';
import { normalizeRomaji, hiraToRomaji } from './utils.js';

// --- FUNGSI PENGACAK INTERNAL (Agar Pasti Berhasil) ---
function internalShuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// 1. KUMPULAN TEMA MANUAL
const MANUAL_THEMES = {
    ANGKA: ["satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "seratus", "seribu"],
    ARAH: ["atas", "bawah", "kiri", "kanan", "depan", "belakang", "luar", "dalam", "tengah", "utara", "selatan", "barat", "timur"],
    KERJA: ["pergi", "datang", "pulang", "makan", "minum", "melihat", "mendengar", "berbicara", "menulis", "membaca", "istirahat", "belajar", "masuk", "keluar"],
    ALAM: ["gunung", "sungai", "matahari", "bulan", "api", "air", "pohon", "tanah", "langit", "bintang", "angin", "hujan"],
    ORANG: ["ayah", "ibu", "kakak", "adik", "teman", "orang", "anak", "guru", "murid"],
    WAKTU: ["sekarang", "hari ini", "besok", "kemarin", "pagi", "siang", "malam", "tahun", "bulan", "minggu", "jam"],
    SIFAT: ["besar", "kecil", "baru", "lama", "putih", "merah", "biru", "hitam", "murah", "mahal", "tinggi", "rendah"]
};

export function buildChoices(orderIndices, allQuestions) {
  // Buat pool cadangan dari database JSON
  const globalPool = allQuestions.map(q => ({
    meaning: String(q[KEYS.meaning] || '').trim().toLowerCase(),
    hiragana: String(q[KEYS.hiragana] || '').trim()
  })).filter(v => v.meaning !== "");

  return orderIndices.map(idx => {
    const q = allQuestions[idx];
    const correctMeaning = String(q[KEYS.meaning] || '').trim().toLowerCase();
    const correct = { meaning: correctMeaning, hiragana: String(q[KEYS.hiragana] || '').trim() };

    // Tentukan Tema
    let themePool = [];
    for (let key in MANUAL_THEMES) {
      if (MANUAL_THEMES[key].includes(correctMeaning)) {
        themePool = [...MANUAL_THEMES[key]];
        break;
      }
    }

    let candidates = [];
    if (themePool.length > 4) {
      candidates = themePool.filter(m => m !== correctMeaning).map(m => ({ meaning: m, hiragana: "" }));
    } else {
      candidates = [...globalPool].filter(v => v.meaning !== correctMeaning);
    }

    // --- PENGACAKAN TOTAL ---
    internalShuffle(candidates); // Acak siapa yang jadi pilihan salah
    
    const distractors = candidates.slice(0, 3);
    const finalChoices = [correct, ...distractors];
    
    return internalShuffle(finalChoices); // Acak posisi tombol (A, B, C, D)
  });
}

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
        if (choice && choice.meaning === mean) isCorrect = true;
        userAnsStr = choice ? choice.meaning : "Lupa";
      }
    } else {
      const raw = state.answers[i] || '';
      const normUser = normalizeRomaji(raw);
      const normTrue = normalizeRomaji(hiraToRomaji(hira));
      if (raw && raw !== 'Lupa' && normUser === normTrue) isCorrect = true;
      userAnsStr = raw;
    }

    if (isCorrect) correctCount++;
    return { q, isCorrect, userAns: userAnsStr, realHira: hira, realMean: mean, romTrue: hiraToRomaji(hira) };
  });
  return { score: correctCount, total: state.batch.length, details: results };
}