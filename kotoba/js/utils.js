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
  // Fungsi ini opsional untuk kotoba, tapi dibiarkan agar tidak error
  // jika ada logic yang memanggilnya.
  if (!hira) return "";
  return normalizeRomaji(hira); // Fallback sederhana
}