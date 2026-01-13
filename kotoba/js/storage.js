const TEMP_KEY = "kotoba_app_temp_session";
const STATS_KEY = "kotoba_app_history"; 

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

export function saveToHistory(score, total, type, packets = "") {
    try {
        let history = JSON.parse(localStorage.getItem(STATS_KEY) || "[]");
        const entry = {
            date: new Date().toLocaleString('id-ID'),
            score: score,
            total: total,
            type: type === 'quiz' ? 'Quiz Arti' : 'Tulis Romaji',
            packets: packets,
            percentage: Math.round((score / total) * 100)
        };
        history.unshift(entry);
        if (history.length > 20) history.pop();
        localStorage.setItem(STATS_KEY, JSON.stringify(history));
    } catch (e) { console.error("Gagal simpan riwayat", e); }
}

export function getHistory() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY) || "[]"); } catch (e) { return []; }
}