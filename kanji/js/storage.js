// Kunci Penyimpanan
const HISTORY_KEY = 'kotoba_apps_history';
const TEMP_KEY = 'kotoba_apps_temp';
const MASTERY_KEY = 'kotoba_apps_mastery'; // Kunci baru untuk progress

// --- HISTORY (RIWAYAT TES) ---
export function saveToHistory(score, total, type, babList) {
    const history = getHistory();
    let labelType = type;
    if (type === 'quiz') labelType = 'Tebak Arti';
    else if (type === 'quiz_hiragana') labelType = 'Tebak Hiragana';
    else if (type === 'mem') labelType = 'Tulis Arti';
    else if (type === 'write_romaji') labelType = 'Tulis Romaji';
    
    const entry = {
        date: new Date().toLocaleString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        score: score,
        total: total,
        type: labelType, 
        packages: babList || '-', 
        percentage: total > 0 ? Math.round((score / total) * 100) : 0
    };
    history.unshift(entry);
    if (history.length > 20) history.pop();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch (e) { return []; }
}

// --- MASTERY (PROGRESS HAFALAN) ---
// Struktur: { "index_0": { "quiz": true, "mem": false ... }, "index_1": ... }
export function saveMastery(results, sessionType) {
    const mastery = getMastery();
    
    results.forEach((item, index) => {
        // Kita gunakan index soal asli sebagai ID unik
        // Pastikan 'q' memiliki properti referensi ke index asli di QUESTIONS global
        // Di logic.js nanti kita pastikan item.originalIndex terbawa
        const uniqueId = item.originalIndex; 
        
        if (uniqueId !== undefined && item.isCorrect) {
            if (!mastery[uniqueId]) mastery[uniqueId] = {};
            mastery[uniqueId][sessionType] = true; // Tandai mode ini sudah pernah benar
        }
    });
    
    localStorage.setItem(MASTERY_KEY, JSON.stringify(mastery));
}

export function getMastery() {
    try { return JSON.parse(localStorage.getItem(MASTERY_KEY) || "{}"); } catch (e) { return {}; }
}

// --- TEMP ---
export function saveTemp(state) { localStorage.setItem(TEMP_KEY, JSON.stringify(state)); }
export function loadTemp() { try { return JSON.parse(localStorage.getItem(TEMP_KEY)); } catch (e) { return null; } }
export function clearTemp() { localStorage.removeItem(TEMP_KEY); }