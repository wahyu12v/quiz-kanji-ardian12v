// ============================================================
// utils.js — Fungsi Helper Murni (Tanpa Side-Effects DOM)
// ============================================================

/**
 * Mengacak array secara in-place menggunakan algoritma Fisher-Yates.
 * @param {Array} array - Array yang akan diacak.
 * @returns {Array} Array yang sama tapi sudah teracak.
 */
export function shuffleArray(array) {
  const arr = [...array]; // salin agar array asli tidak berubah
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Escape karakter HTML berbahaya agar aman ditampilkan di innerHTML.
 * @param {string} str - String mentah.
 * @returns {string} String yang sudah aman.
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normalisasi teks untuk perbandingan fuzzy:
 * - Lowercase semua
 * - Hilangkan spasi ekstra di depan/belakang
 * - Ganti múltiple spasi dengan satu spasi
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (typeof text !== 'string') return '';
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Hitung jarak Levenshtein antara dua string (untuk fuzzy matching).
 * @param {string} a
 * @param {string} b
 * @returns {number} Jarak edit.
 */
export function levenshteinDistance(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * Fuzzy match: menganggap jawaban benar jika:
 * - Exact match setelah normalisasi, ATAU
 * - Jarak Levenshtein ≤ 2 (untuk kata pendek) / ≤ 3 (untuk kata ≥8 karakter).
 * @param {string} userInput - Input dari user.
 * @param {string|string[]} correctAnswer - Kunci jawaban (bisa array alias).
 * @returns {boolean}
 */
export function isFuzzyMatch(userInput, correctAnswer) {
  const input = normalizeText(userInput);
  if (!input) return false;

  const answers = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];

  for (const ans of answers) {
    const norm = normalizeText(ans);
    if (input === norm) return true;

    // Toleransi typo: maks 2 edit untuk kata < 8 huruf, 3 untuk lebih panjang
    const threshold = norm.length >= 8 ? 3 : 2;
    if (levenshteinDistance(input, norm) <= threshold) return true;
  }
  return false;
}

/**
 * Tabel konversi Romaji sederhana → Hiragana.
 * Digunakan untuk mode essay "Tulis Cara Baca".
 * @param {string} romaji
 * @returns {string} Hiragana yang dikonversi (sebagian).
 */
export function romajiToHiragana(romaji) {
  const map = [
    ['chi','ち'],['tsu','つ'],['shi','し'],['sha','しゃ'],['shu','しゅ'],['sho','しょ'],
    ['chi','ち'],['cha','ちゃ'],['chu','ちゅ'],['cho','ちょ'],
    ['tchi','っち'],['tta','った'],['tte','って'],['tto','っと'],
    ['kka','っか'],['kki','っき'],['kku','っく'],['kke','っけ'],['kko','っこ'],
    ['ssa','っさ'],['ssi','っし'],['ssu','っす'],['sse','っせ'],['sso','っそ'],
    ['ppa','っぱ'],['ppi','っぴ'],['ppu','っぷ'],['ppe','っぺ'],['ppo','っぽ'],
    ['kya','きゃ'],['kyu','きゅ'],['kyo','きょ'],
    ['nya','にゃ'],['nyu','にゅ'],['nyo','にょ'],
    ['mya','みゃ'],['myu','みゅ'],['myo','みょ'],
    ['rya','りゃ'],['ryu','りゅ'],['ryo','りょ'],
    ['hya','ひゃ'],['hyu','ひゅ'],['hyo','ひょ'],
    ['gya','ぎゃ'],['gyu','ぎゅ'],['gyo','ぎょ'],
    ['bya','びゃ'],['byu','びゅ'],['byo','びょ'],
    ['pya','ぴゃ'],['pyu','ぴゅ'],['pyo','ぴょ'],
    ['ja','じゃ'],['ji','じ'],['ju','じゅ'],['jo','じょ'],
    ['za','ざ'],['zi','じ'],['zu','ず'],['ze','ぜ'],['zo','ぞ'],
    ['da','だ'],['di','ぢ'],['du','づ'],['de','で'],['do','ど'],
    ['ba','ば'],['bi','び'],['bu','ぶ'],['be','べ'],['bo','ぼ'],
    ['pa','ぱ'],['pi','ぴ'],['pu','ぷ'],['pe','ぺ'],['po','ぽ'],
    ['ga','が'],['gi','ぎ'],['gu','ぐ'],['ge','げ'],['go','ご'],
    ['na','な'],['ni','に'],['nu','ぬ'],['ne','ね'],['no','の'],
    ['ma','ま'],['mi','み'],['mu','む'],['me','め'],['mo','も'],
    ['ra','ら'],['ri','り'],['ru','る'],['re','れ'],['ro','ろ'],
    ['wa','わ'],['wi','ゐ'],['we','ゑ'],['wo','を'],
    ['ya','や'],['yu','ゆ'],['yo','よ'],
    ['ha','は'],['hi','ひ'],['fu','ふ'],['he','へ'],['ho','ほ'],
    ['fa','ふぁ'],['fi','ふぃ'],['fe','ふぇ'],['fo','ふぉ'],
    ['ka','か'],['ki','き'],['ku','く'],['ke','け'],['ko','こ'],
    ['sa','さ'],['si','し'],['su','す'],['se','せ'],['so','そ'],
    ['ta','た'],['ti','ち'],['tu','つ'],['te','て'],['to','と'],
    ['a','あ'],['i','い'],['u','う'],['e','え'],['o','お'],
    ['n','ん'],
  ];

  let result = romaji.toLowerCase();
  // Ganti double consonant → っ + konsonan
  result = result.replace(/([kstpmgdbzh])\1/g, 'っ$1');

  for (const [r, h] of map) {
    result = result.split(r).join(h);
  }
  return result;
}

/**
 * Ambil semua kemungkinan alias jawaban dari field Arti atau Hiragana.
 * Field Arti kadang mengandung koma → split jadi array.
 * @param {string} field - Nilai field dari data.
 * @returns {string[]} Array semua varian jawaban yang valid.
 */
export function getAnswerAliases(field) {
  if (!field) return [];
  return field.split(/[,/／、]/).map(s => s.trim()).filter(Boolean);
}

/**
 * Format angka menjadi label "XX / YY".
 */
export function formatCounter(current, total) {
  return `${current} / ${total}`;
}

/**
 * Pilih secara acak N item dari array tanpa duplikat.
 * @param {Array} arr - Pool item.
 * @param {number} n - Jumlah item yang diinginkan.
 * @returns {Array}
 */
export function pickRandom(arr, n) {
  return shuffleArray(arr).slice(0, n);
}
