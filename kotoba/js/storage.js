// Kunci Penyimpanan Utama
const HISTORY_KEY = 'kotoba_apps_history';
const TEMP_KEY = 'kotoba_apps_temp';

// PERBAIKAN: Menambah parameter 'babList' untuk menyimpan nama paket
export function saveToHistory(score, total, type, babList) {
    const history = getHistory();
    
    const entry = {
        date: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        score: score,
        total: total,
        type: type === 'quiz' ? 'Tebak Arti' : 'Tulis Arti',
        packages: babList || '-', // Simpan nama bab/paket disini
        percentage: total > 0 ? Math.round((score / total) * 100) : 0
    };
    
    // Masukkan ke paling atas (terbaru)
    history.unshift(entry);
    
    // Batasi hanya menyimpan 20 riwayat terakhir
    if (history.length > 20) history.pop();
    
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch (e) {
        return [];
    }
}

export function saveTemp(state) {
    localStorage.setItem(TEMP_KEY, JSON.stringify(state));
}

export function loadTemp() {
    try {
        return JSON.parse(localStorage.getItem(TEMP_KEY));
    } catch (e) {
        return null;
    }
}

export function clearTemp() {
    localStorage.removeItem(TEMP_KEY);
}