// js/utils.js

/**
 * Mengambil data JSON
 * @param {string} url - Lokasi file json
 */
export async function fetchData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Gagal mengambil data:", error);
        return [];
    }
}

/**
 * Mengacak urutan array (Fisher-Yates Shuffle)
 * @param {Array} array 
 */
export function shuffleArray(array) {
    // Copy array agar data asli tidak rusak
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}