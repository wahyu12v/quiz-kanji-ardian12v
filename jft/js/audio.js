// js/audio.js
import { state } from './state.js';

// --- INIT VOICES ---
export function loadSystemVoices() {
    // Coba load suara sistem (hanya untuk cadangan)
    if ('speechSynthesis' in window) {
        state.voices = window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            state.voices = window.speechSynthesis.getVoices();
        };
    }
}

// --- FUNGSI PEMANGGIL DARI HTML ---
export function playCurrentAudio(btnElement) {
    const q = state.currentQuestions[state.currentQuestionIndex];
    if (q && q.type === 'audio') {
        // Ambil script, jika tidak ada ambil text soal
        const textToRead = q.script || q.text; 
        if (textToRead) {
            playTTS(textToRead, btnElement);
        } else {
            alert("Data audio kosong.");
        }
    }
}

// --- MAIN PLAY FUNCTION ---
export function playTTS(text, btnElement) {
    // 1. Reset Audio Sebelumnya
    stopAudio(); 

    const card = document.getElementById('audio-player-card');
    const statusText = document.getElementById('audio-status-text');
    const btnIcon = btnElement ? btnElement.querySelector('i') : null;

    // 2. UI Loading State
    if (btnElement && card) {
        btnElement.disabled = true;
        if(btnIcon) btnIcon.className = 'fas fa-spinner fa-spin';
        if(statusText) statusText.innerText = "Memuat...";
    }

    // Callback: Selesai
    const onComplete = () => {
        if (card) card.classList.remove('active'); 
        if (btnElement) {
            btnElement.disabled = false;
            if(btnIcon) btnIcon.className = 'fas fa-play'; 
        }
        if (statusText) statusText.innerText = "Klik Play";
        state.isPlaying = false;
    };

    // Callback: Bicara (Animasi)
    const onSpeaking = () => {
        if (card) {
            // FIX ANIMASI DESKTOP: Force Reflow
            card.classList.remove('active'); 
            void card.offsetWidth;           
            card.classList.add('active');    
        }
        
        if (btnElement) {
            btnElement.disabled = false; 
            if(btnIcon) btnIcon.className = 'fas fa-volume-high'; 
        }
        if (statusText) statusText.innerText = "Sedang Bicara...";
    };

    // 3. Parsing Text [N][M][F]
    // Hapus tag HTML dulu biar bersih
    const cleanRawText = text.replace(/<[^>]*>/g, '');
    
    const parts = cleanRawText.split(/(\[[NMF]\])/g).filter(s => s.trim().length > 0);
    let currentRole = 'N'; 
    state.audioQueue = [];

    parts.forEach(part => {
        if (part === '[N]' || part === '[M]' || part === '[F]') {
            currentRole = part.replace('[', '').replace(']', '');
        } else {
            state.audioQueue.push({ text: part, role: currentRole });
        }
    });

    if (state.audioQueue.length === 0) state.audioQueue.push({ text: cleanRawText, role: 'N' });

    state.isPlaying = true;
    onSpeaking(); 

    // --- PRIORITAS: SELALU COBA ONLINE DULU ---
    // Google TTS jauh lebih bagus daripada suara robot sistem
    if (navigator.onLine) {
        playOnlineQueue(onComplete);
    } else {
        // Fallback ke Offline jika internet mati
        tryOfflineFallback(null, onComplete);
    }
}

// --- ONLINE PLAYER (Google TTS) ---
function playOnlineQueue(onComplete) {
    const playNextChunk = () => {
        if (state.audioQueue.length === 0 || !state.isPlaying) {
            onComplete();
            return;
        }

        const item = state.audioQueue.shift();
        
        // URL Server Google (pakai client=tw-ob lebih stabil untuk direct link)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(item.text)}&tl=ja&client=tw-ob`;
        
        state.currentAudioObj = new Audio(url);
        
        // PENTING: JANGAN SET CROSSORIGIN DI SINI!
        // state.currentAudioObj.crossOrigin = "anonymous"; <--- INI PENYEBAB ERROR DI DESKTOP

        // Speed Trick untuk beda suara Cowok/Cewek
        if (item.role === 'M') state.currentAudioObj.playbackRate = 0.85; 
        else if (item.role === 'F') state.currentAudioObj.playbackRate = 1.2; 
        else state.currentAudioObj.playbackRate = 1.0;

        // Browser modern butuh ini agar pitch tidak berubah saat speed berubah (opsional)
        if (state.currentAudioObj.mozPreservesPitch !== undefined) state.currentAudioObj.mozPreservesPitch = false;
        if (state.currentAudioObj.preservesPitch !== undefined) state.currentAudioObj.preservesPitch = false;

        state.currentAudioObj.onended = playNextChunk;
        
        state.currentAudioObj.onerror = (e) => { 
            console.warn("Gagal Online, mencoba Offline...", e);
            // Jika gagal load (misal kena blokir), coba pakai suara sistem untuk kalimat ini
            tryOfflineFallback(item, playNextChunk);
        };
        
        const playPromise = state.currentAudioObj.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.error("Autoplay Blocked:", error);
                // Jika diblokir browser, hentikan
                onComplete();
            });
        }
    };
    playNextChunk();
}

// --- OFFLINE HELPER ---
function tryOfflineFallback(item, nextCallback) {
    // Cari suara Jepang di sistem
    let japanVoice = null;
    if ('speechSynthesis' in window) {
        if (state.voices.length === 0) state.voices = window.speechSynthesis.getVoices();
        japanVoice = state.voices.find(v => v.lang === 'ja-JP' || v.lang === 'ja_JP');
    }

    // Jika item null, artinya kita dipanggil dari awal (bukan fallback per kalimat)
    if (!item) {
        if (state.audioQueue.length > 0) {
            const firstItem = state.audioQueue.shift();
            speakSystem(firstItem, japanVoice, () => tryOfflineFallback(null, nextCallback));
        } else {
            nextCallback(); // Selesai
        }
        return;
    }

    // Jika item ada (fallback per kalimat)
    speakSystem(item, japanVoice, nextCallback);
}

function speakSystem(item, voice, callback) {
    if (!voice) {
        console.error("Tidak ada internet & Tidak ada suara Jepang offline.");
        callback();
        return;
    }

    const utterance = new SpeechSynthesisUtterance(item.text);
    utterance.voice = voice;
    utterance.lang = 'ja-JP';
    
    if (item.role === 'M') { utterance.pitch = 0.6; utterance.rate = 0.8; }
    else if (item.role === 'F') { utterance.pitch = 1.3; utterance.rate = 0.9; }
    else { utterance.pitch = 1.0; utterance.rate = 0.85; }

    utterance.onend = callback;
    utterance.onerror = callback;
    window.speechSynthesis.speak(utterance);
}

// --- STOP ---
export function stopAudio() {
    state.isPlaying = false;
    state.audioQueue = []; 
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (state.currentAudioObj) {
        state.currentAudioObj.pause();
        state.currentAudioObj = null;
    }
    
    // Reset UI
    const card = document.getElementById('audio-player-card');
    const btnPlay = document.getElementById('btn-play-audio');
    const btnIcon = btnPlay ? btnPlay.querySelector('i') : null;
    const statusText = document.getElementById('audio-status-text');

    if (card) card.classList.remove('active');
    if (statusText) statusText.innerText = "Klik Play";
    if (btnPlay) {
        btnPlay.disabled = false;
        if(btnIcon) btnIcon.className = 'fas fa-play';
    }
}