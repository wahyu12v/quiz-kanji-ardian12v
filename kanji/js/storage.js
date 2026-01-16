const TEMP_KEY = "kanji_app_temp_session";
const STATS_KEY = "kanji_app_history"; 

export function saveTemp(state) {
  const payload = {
    sessionType: state.sessionType,
    orderIndices: state.orderIndices,
    answers: state.answers,
    current: state.current
  };
  try { localStorage.setItem(TEMP_KEY, JSON.stringify(payload)); } catch (e) {}
}

export function loadTemp() {
    try { return JSON.parse(localStorage.getItem(TEMP_KEY) || 'null'); } catch(e) { return null; }
}

export function clearTemp() { localStorage.removeItem(TEMP_KEY); }

// --- FITUR RIWAYAT DENGAN DETAIL PAKET ---
export function saveToHistory(score, total, type, packets = "") {
    try {
        let history = JSON.parse(localStorage.getItem("kanji_app_history") || "[]");
        const entry = {
            date: new Date().toLocaleString('id-ID'),
            score: score,
            total: total,
            type: type === 'quiz' ? 'Quiz' : 'Hafalan',
            packets: packets, // Menyimpan detail paket (Contoh: "Paket 1, Paket 2")
            percentage: Math.round((score / total) * 100)
        };
        history.unshift(entry);
        if (history.length > 20) history.pop();
        localStorage.setItem("kanji_app_history", JSON.stringify(history));
    } catch (e) { console.error("Gagal simpan riwayat", e); }
}

export function getHistory() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY) || "[]"); } catch (e) { return []; }
}