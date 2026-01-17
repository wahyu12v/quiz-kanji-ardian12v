// js/audio.js
import { state } from './state.js';

export function loadSystemVoices() {
    if ('speechSynthesis' in window) {
        state.voices = window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            state.voices = window.speechSynthesis.getVoices();
        };
    }
}

export function playCurrentAudio(btnElement) {
    const q = state.currentQuestions[state.currentQuestionIndex];
    if (q && q.type === 'audio') {
        const text = q.script || q.text; // Fallback ke text jika script kosong
        playTTS(text, btnElement);
    }
}

export function playTTS(text, btnElement) {
    stopAudio(); 

    const card = document.getElementById('audio-player-card');
    const statusText = document.getElementById('audio-status-text');
    const btnIcon = btnElement ? btnElement.querySelector('i') : null;

    if (btnElement && card) {
        btnElement.disabled = true;
        if(btnIcon) btnIcon.className = 'fas fa-spinner fa-spin';
        if(statusText) statusText.innerText = "Memuat...";
    }

    const onComplete = () => {
        if (card) card.classList.remove('active'); 
        if (btnElement) {
            btnElement.disabled = false;
            if(btnIcon) btnIcon.className = 'fas fa-play'; 
        }
        if (statusText) statusText.innerText = "Klik Play";
        state.isPlaying = false;
    };

    const onSpeaking = () => {
        if (card) card.classList.add('active'); 
        if (btnElement) {
            btnElement.disabled = false; 
            if(btnIcon) btnIcon.className = 'fas fa-volume-high'; 
        }
        if (statusText) statusText.innerText = "Sedang Bicara...";
    };

    // Parsing [N][M][F]
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

    // ENGINE SELECTION
    let japanVoice = null;
    if ('speechSynthesis' in window) {
        if (state.voices.length === 0) state.voices = window.speechSynthesis.getVoices();
        japanVoice = state.voices.find(v => v.lang === 'ja-JP' || v.lang === 'ja_JP');
    }

    if (japanVoice) {
        playOfflineQueue(japanVoice, onComplete);
    } else {
        playOnlineQueue(onComplete);
    }
}

function playOnlineQueue(onComplete) {
    const playNextChunk = () => {
        if (state.audioQueue.length === 0 || !state.isPlaying) {
            onComplete();
            return;
        }

        const item = state.audioQueue.shift();
        const cleanText = item.text.replace(/<[^>]*>/g, ''); 
        // PAKE SERVER GTX (LEBIH STABIL)
        const url = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=ja&q=${encodeURIComponent(cleanText)}`;
        
        state.currentAudioObj = new Audio(url);
        
        if (item.role === 'M') state.currentAudioObj.playbackRate = 0.85; 
        else if (item.role === 'F') state.currentAudioObj.playbackRate = 1.2; 
        else state.currentAudioObj.playbackRate = 1.0;

        state.currentAudioObj.onended = playNextChunk;
        state.currentAudioObj.onerror = (e) => { console.warn("Audio Error", e); playNextChunk(); };
        state.currentAudioObj.play().catch(e => { console.error("Blocked", e); onComplete(); });
    };
    playNextChunk();
}

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
        utterance.onerror = playNext;
        window.speechSynthesis.speak(utterance);
    };
    playNext();
}

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
    const statusText = document.getElementById('audio-status-text');
    if (card) card.classList.remove('active');
    if (statusText) statusText.innerText = "Klik Play";
    if (btnPlay) {
        btnPlay.disabled = false;
        btnPlay.innerHTML = '<i class="fas fa-play"></i>';
    }
}