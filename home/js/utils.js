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

export function normalizeRomaji(s) {
  if (!s) return "";
  let str = String(s).toLowerCase().replace(/[^a-zō]/g, "");
  str = str.replace(/ō/g, "ou").replace(/si/g, "shi").replace(/ti/g, "chi")
           .replace(/tu/g, "tsu").replace(/hu/g, "fu").replace(/zi/g, "ji")
           .replace(/ou/g, "ou").replace(/nn/g, "n");
  return str.replace(/(.)\1{2,}/g, "$1");
}

export function hiraToRomaji(hira) {
  if (!hira) return "";
  hira = String(hira).trim().replace(/[\s、。・,\.]/g, "");
  const yoon = {きゃ:'kya',きゅ:'kyu',きょ:'kyo',しゃ:'sha',しゅ:'shu',しょ:'sho',ちゃ:'cha',ちゅ:'chu',ちょ:'cho',にゃ:'nya',にゅ:'nyu',にょ:'nyo',ひゃ:'hya',ひゅ:'hyu',ひょ:'hyo',みゃ:'mya',みゅ:'myu',みょ:'myo',りゃ:'rya',りゅ:'ryu',りょ:'ryo',ぎゃ:'gya',ぎゅ:'gyu',ぎょ:'gyo',じゃ:'ja',じゅ:'ju',じょ:'jo',びゃ:'bya',びゅ:'byu',びょ:'byo',ぴゃ:'pya',ぴゅ:'pyu',ぴょ:'pyo',ふゃ:'fya',ふゅ:'fyu',ふょ:'fyo',ゔぁ:'va',ゔぃ:'vi',ゔぇ:'ve',ゔぉ:'vo'};
  const base = {あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po',ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',や:'ya',ゆ:'yu',よ:'yo',ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',を:'o',ん:'n',ぁ:'a',ぃ:'i',ぅ:'u',ぇ:'e',ぉ:'o',ゔ:'vu'};

  let out = '';
  for (let i = 0; i < hira.length; i++) {
    const ch = hira[i];
    if (ch === 'っ' || ch === 'ッ') {
      const next = hira[i + 1] || '';
      const pair = next + (hira[i + 2] || '');
      const rom = yoon[pair] || base[next] || '';
      if (rom) out += rom[0];
      continue;
    }
    const two = ch + (hira[i + 1] || '');
    if (yoon[two]) { out += yoon[two]; i++; continue; }
    if (ch === 'ん') {
      const next = hira[i + 1] || '';
      if ('あいうえおやゆよ'.includes(next)) out += "n'";
      else if ('bmp'.includes((base[next] || '')[0])) out += 'm';
      else out += 'n';
      continue;
    }
    if (base[ch]) { out += base[ch]; continue; }
    if (ch === 'ー') {
        const last = out.slice(-1);
        if ('aiueo'.includes(last)) out += last;
    }
  }
  return out;
}

export function extractHiraganaSubstrings(s) {
    if (!s) return [];
    return (s.match(/[\u3040-\u309F]+/g) || []).map(r=>r.trim()).filter(r=>r.length>0);
}