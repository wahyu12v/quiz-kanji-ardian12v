// audio.js - Logika Audio Canggih
import { state } from './state.js';

// --- INIT VOICES ---
export function loadSystemVoices() {
    if ('speechSynthesis' in window) {
        state.voices = window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            state.voices = window.speechSynthesis.getVoices();
        };
    }
}

// --- MAIN PLAY FUNCTION ---
export function playTTS(text, btnElement) {
    stopAudio(); 

    const card = document.getElementById('audio-player-card');
    const statusText = document.getElementById('audio-status-text');
    const btnIcon = btnElement ? btnElement.querySelector('i') : null;

    // 1. STATE: LOADING
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

    // Callback: Bicara
    const onSpeaking = () => {
        if (card) card.classList.add('active'); 
        if (btnElement) {
            btnElement.disabled = false; 
            if(btnIcon) btnIcon.className = 'fas fa-volume-high'; 
        }
        if (statusText) statusText.innerText = "Sedang Bicara...";
    };

    // Parsing Text
    const parts = text.split(/(\[[NMF]\])/g).filter(s => s.trim().length > 0);
    let currentRole = 'N'; 
    state.audioQueue = [];

    parts.forEach(part => {
        if (part === '[N]' || part === '[M]' || part === '[F]') {
            currentRole = part.replace('[', '').replace(']', '');
        } else {
            state.audioQueue.push({ text: part, role: currentRole });
        }
    });

    if (state.audioQueue.length === 0) state.audioQueue.push({ text: text, role: 'N' });

    state.isPlaying = true;
    onSpeaking(); 

    // Cek Engine
    let japanVoice = null;
    if ('speechSynthesis' in window) {
        if (state.voices.length === 0) state.voices = window.speechSynthesis.getVoices();
        japanVoice = state.voices.find(v => v.lang === 'ja-JP' || v.lang === 'ja_JP');
    }

    if (japanVoice) {
        console.log("Mode: Offline");
        playOfflineQueue(japanVoice, onComplete);
    } else {
        console.log("Mode: Online");
        playOnlineQueue(onComplete);
    }
}

// --- OFFLINE PLAYER ---
function playOfflineQueue(voice, onComplete) {
    const playNext = () => {
        if (state.audioQueue.length === 0 || !state.isPlaying) {
            onComplete();
            return;
        }

        const item = state.audioQueue.shift();
        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.voice = voice;
        utterance.lang = 'ja-JP';
        
        if (item.role === 'M') { utterance.pitch = 0.6; utterance.rate = 0.8; }
        else if (item.role === 'F') { utterance.pitch = 1.3; utterance.rate = 0.9; }
        else { utterance.pitch = 1.0; utterance.rate = 0.85; }

        utterance.onend = playNext;
        utterance.onerror = (e) => { console.error("Offline Error", e); playNext(); };
        window.speechSynthesis.speak(utterance);
    };
    playNext();
}

// --- ONLINE PLAYER ---
function playOnlineQueue(onComplete) {
    const playNextChunk = () => {
        if (state.audioQueue.length === 0 || !state.isPlaying) {
            onComplete();
            return;
        }

        const item = state.audioQueue.shift();
        const chunks = item.text.match(/[^。！？、]+[。！？、]*/g) || [item.text];
        let subQueue = chunks.map(c => ({ text: c, role: item.role }));
        
        const playSubQueue = () => {
            if (subQueue.length === 0) {
                playNextChunk();
                return;
            }
            
            const subItem = subQueue.shift();
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(subItem.text)}&tl=ja&client=tw-ob`;
            
            state.currentAudioObj = new Audio(url);
            
            if (subItem.role === 'M') state.currentAudioObj.playbackRate = 0.85; 
            else if (subItem.role === 'F') state.currentAudioObj.playbackRate = 1.15; 
            else state.currentAudioObj.playbackRate = 1.0;

            if (state.currentAudioObj.mozPreservesPitch !== undefined) state.currentAudioObj.mozPreservesPitch = false;
            state.currentAudioObj.onended = playSubQueue;
            state.currentAudioObj.onerror = (e) => { console.warn("Skip chunk", e); playSubQueue(); };
            
            state.currentAudioObj.play().catch(e => { console.error("Audio blocked", e); onComplete(); });
        };
        playSubQueue();
    };
    playNextChunk();
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