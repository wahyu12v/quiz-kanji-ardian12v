// Kunci Penyimpanan — Kanji Apps
const HISTORY_KEY = 'kanji_apps_history';
const TEMP_KEY    = 'kanji_apps_temp';
const MASTERY_KEY = 'kanji_apps_mastery';

// --- HISTORY (RIWAYAT TES) ---
export function saveToHistory(score, total, type, levelList) {
    const history = getHistory();
    let labelType = type;
    if      (type === 'quiz')          labelType = 'Tebak Arti';
    else if (type === 'quiz_hiragana') labelType = 'Tebak Cara Baca';
    else if (type === 'mem')           labelType = 'Tulis Arti';
    else if (type === 'write_romaji')  labelType = 'Tulis Romaji';

    const entry = {
        date:       new Date().toLocaleString('id-ID', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        score:      score,
        total:      total,
        type:       labelType,
        packages:   levelList || '-',
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
// Struktur: { "0": { "quiz": true, "mem": false, ... }, "1": { ... }, ... }
export function saveMastery(results, sessionType) {
    const mastery = getMastery();
    results.forEach(item => {
        const uniqueId = item.originalIndex;
        if (uniqueId !== undefined && item.isCorrect) {
            if (!mastery[uniqueId]) mastery[uniqueId] = {};
            mastery[uniqueId][sessionType] = true;
        }
    });
    localStorage.setItem(MASTERY_KEY, JSON.stringify(mastery));
}

export function getMastery() {
    try { return JSON.parse(localStorage.getItem(MASTERY_KEY) || "{}"); } catch (e) { return {}; }
}

// --- TEMP ---
export function saveTemp(state) { localStorage.setItem(TEMP_KEY, JSON.stringify(state)); }
export function loadTemp()      { try { return JSON.parse(localStorage.getItem(TEMP_KEY)); } catch (e) { return null; } }
export function clearTemp()     { localStorage.removeItem(TEMP_KEY); }
