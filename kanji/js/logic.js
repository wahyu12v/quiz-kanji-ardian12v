// ============================================================
// logic.js — Otak Algoritma
// ============================================================

import { CHUNK_SIZE, LEVELS, MODES, NUM_OPTIONS } from './constants.js';
import { shuffleArray, getAnswerAliases, isFuzzyMatch, romajiToHiragana, normalizeText } from './utils.js';
import { getMastery, countMastered, countLearned } from './storage.js';

// =============================================
// FILTER & CHUNKING
// =============================================

export function processData(allData, levelFilter) {
  let filtered;

  if (levelFilter === LEVELS.N5) {
    filtered = allData.filter(k => k.level === 'N5');
  } else if (levelFilter === LEVELS.N4) {
    filtered = allData.filter(k => k.level === 'N4');
  } else {
    const n5 = allData.filter(k => k.level === 'N5').sort((a, b) => a.No - b.No);
    const n4 = allData.filter(k => k.level === 'N4').sort((a, b) => a.No - b.No);
    filtered = [...n5, ...n4];
  }

  const packets = [];
  for (let i = 0; i < filtered.length; i += CHUNK_SIZE) {
    packets.push(filtered.slice(i, i + CHUNK_SIZE));
  }

  return { filtered, packets };
}

export function mergePackets(selectedPackets) {
  return selectedPackets.flat();
}

// =============================================
// PEMBUATAN SOAL
// =============================================

export function buildQuestion(kanji, mode, pool) {
  const question = {
    kanji,
    mode,
    type: mode.startsWith('quiz') ? 'quiz' : 'essay',
    options: null,
    correctKey: '',
    correctAliases: [],
  };

  if (mode === MODES.QUIZ_ARTI || mode === MODES.ESSAY_ARTI) {
    // FIX: handle data entry No.514 yang punya field 'arti' lowercase
    const artiVal = kanji.Arti || kanji.arti || '';
    question.correctKey     = artiVal;
    question.correctAliases = getAnswerAliases(artiVal);
  } else {
    question.correctKey     = kanji.Hiragana;
    question.correctAliases = getAnswerAliases(kanji.Hiragana);
    if (kanji.Romaji) {
      question.correctAliases.push(...getAnswerAliases(kanji.Romaji));
    }
  }

  if (question.type === 'quiz') {
    question.options = buildSmartDistractors(kanji, mode, pool);
  }

  return question;
}

// =============================================
// ULTRA-DECEPTIVE DISTRACTOR ENGINE
// Berlapis 3 tahap:
//   1. Hardcoded semantic traps (antonim, kategori-sama, voiced-pair)
//   2. Precision scoring fonetik/leksikal
//   3. Fallback level+tipe
// =============================================

// Peta jebakan semantik: jawaban benar -> [pilihan menjebak]
const TRAPS = {
  'besar':['kecil','luas','banyak'],'kecil':['besar','sedikit','pendek'],
  'baru':['lama, usang','bekas','tua'],'lama, usang':['baru','modern','usang'],
  'mahal':['murah','hemat','berharga'],'murah':['mahal','terjangkau','gratis'],
  'panjang':['pendek','singkat','kecil'],'pendek':['panjang','tinggi','besar'],
  'banyak':['sedikit','kurang','jarang'],'sedikit':['banyak','cukup','melimpah'],
  'tinggi':['rendah','pendek','bawah'],'rendah':['tinggi','atas','mahal'],
  'panas':['dingin (benda)','dingin (suhu)','sejuk'],
  'panas (cuaca)':['dingin (suhu)','sejuk','dingin (benda)'],
  'dingin (benda)':['panas','hangat','panas (cuaca)'],
  'dingin (suhu)':['panas (cuaca)','hangat','panas'],
  'terang':['gelap','redup','suram'],'gelap':['terang','cerah','benderang'],
  'kuat':['lemah','rapuh','lembut'],'lemah':['kuat','tangguh','keras'],
  'luas':['sempit','kecil','terbatas'],'jauh':['dekat','sekitar sini','tidak jauh'],
  'berat':['ringan','enteng','kecil'],'berat, sulit':['mudah','ringan','santai'],
  'ringan':['berat','susah','padat'],'sulit':['mudah','gampang','ringan'],
  'sehat':['sakit','lemah','lelah'],'bahagia':['sedih','khawatir','kegelisahan'],
  'khawatir':['bahagia','tenang','santai'],'tenang':['sibuk','ramai','khawatir'],
  'sibuk':['santai','tenang','bebas'],'muda':['tua','lama, usang','senior'],
  'bahaya':['aman','keselamatan','tenang'],'keselamatan':['bahaya','risiko','ancaman'],
  'benar':['salah','keliru','jelek'],'manis':['pedas','asin','pahit'],
  'pedas':['manis','tawar','hambar'],'praktis':['tidak praktis','ribet','susah'],
  'tidak praktis':['praktis','mudah','nyaman'],'istimewa':['biasa','sama','umum'],
  'sama':['berbeda','istimewa','lain'],'penting':['tidak penting','biasa','sepele'],
  'mengantuk':['bersemangat','segar','sehat'],
  'suka':['tidak begitu suka, berat','benci','kurang suka'],
  'tidak begitu suka, berat':['suka','senang','gembira'],
  'pandai':['tidak begitu suka, berat','gagal','sulit'],
  'ramah':['kasar','cuek','dingin (benda)'],'cepat':['lambat','pelan','lama'],
  'bernuansa Jepang':['bersejarah','modern','internasional'],
  'bersejarah':['bernuansa Jepang','modern','baru'],
  'Senin':['Selasa','Minggu','Rabu'],'Selasa':['Senin','Rabu','Kamis'],
  'Rabu':['Selasa','Kamis','Senin'],'Kamis':['Rabu','Jumat','Selasa'],
  'Jumat':['Kamis','Sabtu','Rabu'],'Sabtu':['Jumat','Minggu','Kamis'],
  'Minggu':['Sabtu','Senin','Jumat'],
  'timur':['barat','utara','selatan'],'barat':['timur','selatan','utara'],
  'utara':['selatan','timur','barat'],'selatan':['utara','barat','timur'],
  'pintu timur':['pintu barat','pintu utara','pintu selatan'],
  'pintu barat':['pintu timur','pintu selatan','pintu utara'],
  'pintu utara':['pintu selatan','pintu timur','pintu barat'],
  'pintu selatan':['pintu utara','pintu barat','pintu timur'],
  'jam':['menit','detik','waktu'],'menit':['jam','detik','setengah'],
  'setengah':['seperempat','menit','jam'],
  'tahun':['bulan','minggu','hari'],'bulan':['minggu','tahun','tanggal'],
  'minggu':['bulan','hari','tanggal'],
  'minggu lalu':['minggu depan','minggu ini','bulan lalu'],
  'minggu ini':['minggu lalu','minggu depan','hari ini'],
  'minggu depan':['minggu ini','minggu lalu','bulan depan'],
  'hari ini':['kemarin','besok','tadi'],
  'kemarin':['hari ini','besok','tadi'],'besok':['kemarin','hari ini','lusa'],
  'makan':['minum','memasak','mencicipi'],
  'minum':['makan','meminum obat','mencicipi'],
  'membaca':['menulis','melihat','mendengarkan'],
  'menulis':['membaca','menggambar','mencatat'],
  'melihat':['mendengarkan','membaca','menonton'],
  'mendengarkan':['melihat','membaca','berbicara'],
  'membeli':['menjual','meminjam','membayar'],
  'menjual':['membeli','menukar','memberikan'],
  'pergi':['pulang','datang','berangkat'],
  'pulang':['pergi','berangkat','datang'],
  'datang':['pergi','pulang','berangkat'],
  'berkata':['berbicara','bertanya','menjawab'],
  'berbicara':['berkata','mendengarkan','bertanya'],
  'bangun tidur':['tidur','istirahat','berbaring'],
  'tidur':['bangun tidur','istirahat','berbaring'],
  'libur, istirahat':['bekerja','sibuk','aktif'],
  'bekerja':['libur, istirahat','bermain','belajar'],
  'berjalan':['berlari','berhenti','naik'],
  'berlari':['berjalan','berhenti','terbang'],
  'naik':['turun','berjalan','berhenti'],
  'turun':['naik','masuk','berangkat'],
  'masuk':['keluar','pergi keluar rumah','datang'],
  'keluar':['masuk','datang','pulang'],
  'pergi keluar rumah':['masuk','pulang','datang'],
  'membawa pergi':['membawa','menerima','mengambil'],
  'menggunakan':['meminjam','membeli','menyimpan'],
  'meminjam':['meminjamkan','menggunakan','mengambil'],
  'mengirim':['menerima','mengambil','membawa'],
  'menerima':['mengirim','memberikan','mengambil'],
  'bertemu':['berpisah','menunggu','memanggil'],
  'menunggu':['bertemu','berhenti','istirahat'],
  'berhenti':['mulai','berjalan','lanjut'],
  'mulai':['selesai','berhenti','batal'],
  'selesai':['mulai','lanjut','belum'],
  'membuat':['merusak','membuang','memperbaiki'],
  'memasukkan':['mengeluarkan','mengambil','membuang'],
  'berkumpul':['berpencar','berpisah','pergi'],
  'memesan':['membatalkan','membeli','meminjam'],
  'menyetir':['naik','berjalan','berhenti'],
  'menyanyi':['berbicara','bermain','menari'],
  'belajar':['mengajarkan','bermain','istirahat'],
  'mengajarkan':['belajar','bertanya','menjawab'],
  'tinggal':['pergi','pindah','datang'],
  'pindah':['tinggal','menetap','datang'],
  'memakai pakaian':['melepas','berganti','mandi'],
  'berenang':['tenggelam','berjalan','berlari'],
  'tolong':['meminta','menolak','menyuruh'],
  'rasa':['bau','suara','warna'],
  'kaki':['tangan','kepala','badan'],
  'listrik':['cuaca','gas','air'],
  'cuaca':['listrik','suhu','musim'],
  'kota':['desa','daerah','negara'],
  'mulut':['pintu','telinga','hidung'],
  'makanan barat':['masakan Jepang','makanan lokal','masakan tradisional'],
};

// Voiced/unvoiced map
const VOICED = (() => {
  const p=[['か','が'],['き','ぎ'],['く','ぐ'],['け','げ'],['こ','ご'],
           ['さ','ざ'],['し','じ'],['す','ず'],['せ','ぜ'],['そ','ぞ'],
           ['た','だ'],['ち','ぢ'],['つ','づ'],['て','で'],['と','ど'],
           ['は','ば'],['ひ','び'],['ふ','ぶ'],['へ','べ'],['ほ','ぼ'],
           ['は','ぱ'],['ひ','ぴ'],['ふ','ぷ'],['へ','ぺ'],['ほ','ぽ']];
  const m={};p.forEach(([u,v])=>{m[u]=v;m[v]=u;});return m;
})();

function buildSmartDistractors(kanji, mode, pool) {
  const isArti        = mode === MODES.QUIZ_ARTI;
  const getField      = (k) => isArti ? (k.Arti || k.arti || '') : (k.Hiragana || '');
  const correctAnswer = getField(kanji);
  const correctNorm   = normalizeText(correctAnswer);
  const need          = NUM_OPTIONS - 1;

  // TAHAP 1: Semantic / voiced trap
  const trapVals  = [];
  const usedNorms = new Set([correctNorm]);

  if (isArti) {
    const targets = TRAPS[correctAnswer] || TRAPS[correctNorm] || [];
    for (const t of targets) {
      const tn = normalizeText(t);
      if (usedNorms.has(tn)) continue;
      const inPool = pool.find(k => normalizeText(k.Arti || k.arti || '') === tn);
      trapVals.push(inPool ? getField(inPool) : t);
      usedNorms.add(tn);
      if (trapVals.length >= need) break;
    }
  } else {
    // Voiced-pair: identik kecuali 1-2 mora voiced/unvoiced
    for (const k of pool) {
      if (k.No === kanji.No) continue;
      const val = getField(k);
      if (!val || val.length !== correctAnswer.length) continue;
      let diff = 0, allVP = true;
      for (let i = 0; i < val.length; i++) {
        if (val[i] !== correctAnswer[i]) { diff++; if (VOICED[val[i]] !== correctAnswer[i]) allVP = false; }
      }
      if (diff >= 1 && diff <= 2 && allVP) {
        const vn = normalizeText(val);
        if (!usedNorms.has(vn)) { usedNorms.add(vn); trapVals.push(val); }
      }
      if (trapVals.length >= need) break;
    }
  }

  // TAHAP 2: Precision scoring
  const candidates = [];
  for (const k of pool) {
    if (k.No === kanji.No) continue;
    const val  = getField(k);
    const norm = normalizeText(val);
    if (!val || usedNorms.has(norm)) continue;
    usedNorms.add(norm);
    let s = 0;
    if (isArti) {
      const ld = Math.abs(val.length - correctAnswer.length);
      s += Math.max(0, 16 - ld * 2);
      for (let i = 0; i < Math.min(norm.length, correctNorm.length, 6); i++) {
        if (norm[i] === correctNorm[i]) s += 7; else break;
      }
      const rn = [...norm].reverse().join('');
      const rc = [...correctNorm].reverse().join('');
      for (let i = 0; i < Math.min(rn.length, rc.length, 4); i++) {
        if (rn[i] === rc[i]) s += 5; else break;
      }
      const vw = norm.split(/[\s,/\-]+/).filter(w=>w.length>1);
      const cw = correctNorm.split(/[\s,/\-]+/).filter(w=>w.length>1);
      if (vw.length === cw.length) s += 8;
      const pfx = ['ber','me','di','ter','ke','meng','men','mem','pe','per'];
      const cp  = pfx.find(p=>correctNorm.startsWith(p));
      const vp  = pfx.find(p=>norm.startsWith(p));
      if (cp && vp && cp === vp) s += 14;
      vw.forEach(w => {
        if (cw.includes(w)) s += 12;
        else if (cw.some(c=>c.length>3&&(c.includes(w)||w.includes(c)))) s += 6;
      });
      if (k.type  === kanji.type)  s += 16;
      if (k.level === kanji.level) s += 5;
    } else {
      for (let i = 0; i < Math.min(val.length, correctAnswer.length); i++) {
        if (val[i] === correctAnswer[i]) s += 11;
        else if (VOICED[val[i]] === correctAnswer[i]) s += 8;
        else break;
      }
      const ld = Math.abs(val.length - correctAnswer.length);
      s += Math.max(0, 14 - ld * 4);
      for (let i = 1; i <= Math.min(val.length, correctAnswer.length, 3); i++) {
        if (val[val.length-i] === correctAnswer[correctAnswer.length-i]) s += 6; else break;
      }
      if (val.replace(/[っー]/g,'') === correctAnswer.replace(/[っー]/g,'')) s += 28;
      if (val.length === correctAnswer.length) {
        for (let i = 0; i < val.length; i++) {
          if (val[i] === correctAnswer[i]) s += 3;
          else if (VOICED[val[i]] === correctAnswer[i]) s += 2;
        }
      }
      if (k.type  === kanji.type)  s += 12;
      if (k.level === kanji.level) s += 5;
    }
    candidates.push({ val, score: s });
  }
  candidates.sort((a, b) => b.score - a.score);

  // TAHAP 3: Gabung + fill
  const final = [...trapVals];
  for (const c of candidates) {
    if (final.length >= need) break;
    if (!final.includes(c.val)) final.push(c.val);
  }
  for (const k of pool) {
    if (final.length >= need) break;
    const val = getField(k);
    if (val && val !== correctAnswer && !final.includes(val)) final.push(val);
  }

  return shuffleArray([correctAnswer, ...final.slice(0, need)]);
}


export function buildAllQuestions(kanjiList, mode, fullPool) {
  return kanjiList.map(kanji => buildQuestion(kanji, mode, fullPool));
}

// =============================================
// PENILAIAN JAWABAN
// =============================================

export function gradeAnswer(question, userAnswer) {
  const input = (userAnswer || '').trim();

  if (question.type === 'quiz') {
    // Gunakan normalizeText agar trim + lowercase tidak jadi masalah
    const isCorrect = normalizeText(input) === normalizeText(question.correctKey);
    return { isCorrect, userAnswer: input };
  }

  // Essay: fuzzy match
  let isCorrect = isFuzzyMatch(input, question.correctAliases);

  if (!isCorrect && question.mode === MODES.ESSAY_BACA) {
    const converted = romajiToHiragana(input);
    isCorrect = isFuzzyMatch(converted, question.correctAliases);
  }

  return { isCorrect, userAnswer: input };
}

// =============================================
// PROGRESS & STATISTIK
// Progress = kanji yang sudah pernah dijawab benar di minimal 1 mode
// Mastered  = kanji yang sudah benar di semua 4 mode
// =============================================

export function calculateProgress(kanjiList) {
  const total    = kanjiList.length;
  const learned  = countLearned(kanjiList);   // sudah pernah benar ≥1 mode
  const mastered = countMastered(kanjiList);  // sudah benar semua 4 mode
  const percentage = total > 0 ? Math.round((learned / total) * 100) : 0;
  return { total, learned, mastered, percentage };
}

export function getAllProgressStats(allData) {
  const n5List = allData.filter(k => k.level === 'N5');
  const n4List = allData.filter(k => k.level === 'N4');
  return {
    N5:  calculateProgress(n5List),
    N4:  calculateProgress(n4List),
    ALL: calculateProgress(allData),
  };
}

export function calcScore(results) {
  const total      = results.length;
  const correct    = results.filter(r => r.isCorrect).length;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  return { correct, total, percentage };
}

export function getWrongKanjiList(results) {
  return results.filter(r => !r.isCorrect).map(r => r.question.kanji);
}
