export function shuffleArray(a) {
  const arr = [...a];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// HAPUS normalizeRomaji yang lama, GANTI DENGAN KONVERTER ASLI INI:
export function hiraToRomaji(str) {
  if (!str) return "";

  // Mapping Hiragana ke Romaji
  const map = {
    'あ':'a', 'い':'i', 'う':'u', 'え':'e', 'お':'o',
    'か':'ka', 'き':'ki', 'く':'ku', 'け':'ke', 'こ':'ko',
    'さ':'sa', 'し':'shi', 'す':'su', 'せ':'se', 'そ':'so',
    'た':'ta', 'ち':'chi', 'つ':'tsu', 'て':'te', 'と':'to',
    'な':'na', 'に':'ni', 'ぬ':'nu', 'ね':'ne', 'の':'no',
    'は':'ha', 'ひ':'hi', 'ふ':'fu', 'へ':'he', 'ほ':'ho',
    'ま':'ma', 'み':'mi', 'む':'mu', 'め':'me', 'も':'mo',
    'や':'ya', 'ゆ':'yu', 'よ':'yo',
    'ら':'ra', 'り':'ri', 'る':'ru', 'れ':'re', 'ろ':'ro',
    'わ':'wa', 'を':'wo', 'ん':'n',
    
    // Dakuten
    'が':'ga', 'ぎ':'gi', 'ぐ':'gu', 'げ':'ge', 'ご':'go',
    'ざ':'za', 'じ':'ji', 'ず':'zu', 'ぜ':'ze', 'ぞ':'zo',
    'だ':'da', 'ぢ':'ji', 'づ':'zu', 'で':'de', 'ど':'do',
    'ば':'ba', 'び':'bi', 'ぶ':'bu', 'べ':'be', 'ぼ':'bo',
    'ぱ':'pa', 'ぴ':'pi', 'ぷ':'pu', 'ぺ':'pe', 'ぽ':'po',
    
    // Kombinasi (Yoon)
    'きゃ':'kya', 'きゅ':'kyu', 'きょ':'kyo',
    'しゃ':'sha', 'しゅ':'shu', 'しょ':'sho',
    'ちゃ':'cha', 'ちゅ':'chu', 'ちょ':'cho',
    'にゃ':'nya', 'にゅ':'nyu', 'にょ':'nyo',
    'ひゃ':'hya', 'ひゅ':'hyu', 'ひょ':'hyo',
    'みゃ':'mya', 'みゅ':'myu', 'みょ':'myo',
    'りゃ':'rya', 'りゅ':'ryu', 'りょ':'ryo',
    'ぎゃ':'gya', 'ぎゅ':'gyu', 'ぎょ':'gyo',
    'じゃ':'ja', 'じゅ':'ju', 'じょ':'jo',
    'びゃ':'bya', 'びゅ':'byu', 'びょ':'byo',
    'ぴゃ':'pya', 'ぴゅ':'pyu', 'ぴょ':'pyo'
  };

  let res = '';
  let i = 0;
  while (i < str.length) {
    // 1. Cek Kombinasi 2 Huruf (Contoh: きゃ -> kya)
    let twoChars = str.substr(i, 2);
    if (map[twoChars]) {
      res += map[twoChars];
      i += 2;
      continue;
    }

    // 2. Cek Small Tsu (っ) -> Double Consonant (Contoh: がっこう -> gakkou)
    if (str[i] === 'っ') {
      let nextChar = str[i+1];
      if (nextChar) {
        // Cek apakah nextChar adalah huruf biasa atau kombinasi
        let nextMap = map[str.substr(i+1, 2)] || map[nextChar];
        if (nextMap) {
          res += nextMap[0]; // Ambil huruf depan dari romaji berikutnya (k dari ka)
          i++; // Lewati 'っ'
          continue;
        }
      }
    }

    // 3. Cek Huruf Biasa
    let char = str[i];
    if (map[char]) {
      res += map[char];
    } else {
      // Jika karakter latin/spasi/simbol, biarkan saja
      res += char;
    }
    i++;
  }
  
  return res;
}

// Biarkan fungsi ini kosong/alias agar tidak error jika dipanggil logic lama
export function normalizeRomaji(s) {
    return hiraToRomaji(s);
}