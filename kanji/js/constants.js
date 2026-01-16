// --- KONFIGURASI KUNCI DATA JSON ---
export const KEYS = {
    // Sesuaikan dengan Key di file kanjiasli.json
    kanji: 'Kanji',
    hiragana: 'Hiragana', // Ini untuk Cara Baca (Kunyomi/Onyomi)
    romaji: 'Romaji',
    meaning: 'Arti',
    
    // Pengelompokan (Ganti 'bab' jadi 'level' karena di JSON adanya level N5/N4)
    group: 'level', 
    
    // ID Unik
    number: 'No' 
};

export const BATCH_SIZE = 10;

export const SELECTORS = {
    quizArea: 'quiz-area',
    confetti: 'confetti-wrapper'
};