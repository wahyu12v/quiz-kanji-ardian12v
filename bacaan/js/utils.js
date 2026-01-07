// --- AUDIO SYSTEM ---
let isPlaying = false; // Status audio

function playAudio() {
    const btnAudio = document.getElementById("btn-audio");
    const icon = btnAudio ? btnAudio.querySelector("i") : null;
    const label = document.getElementById("label-audio");

    // 1. LOGIKA TOGGLE: Jika sedang bicara, maka STOP.
    if (isPlaying || window.speechSynthesis.speaking) {
        stopAudio();
        return; 
    }

    // 2. Jika tidak, maka PUTAR.
    const contentContainer = document.getElementById("interlinear-content");
    if (!contentContainer) return;

    const jpSentences = contentContainer.querySelectorAll('.jp-sentence');
    let fullText = "";

    jpSentences.forEach(el => {
        const clone = el.cloneNode(true);
        const rts = clone.querySelectorAll('rt');
        rts.forEach(rt => rt.remove()); 
        fullText += clone.textContent + " ";
    });

    if (!fullText.trim()) return;

    if (!('speechSynthesis' in window)) {
        alert("Browser tidak mendukung suara.");
        return;
    }

    // Reset sebelum mulai
    window.speechSynthesis.cancel();

    activeUtterance = new SpeechSynthesisUtterance(fullText);
    activeUtterance.lang = 'ja-JP'; 
    activeUtterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const japanVoice = voices.find(v => v.lang === 'ja-JP' || v.name.includes('Japan'));
    if (japanVoice) activeUtterance.voice = japanVoice;

    // -- UPDATE TAMPILAN JADI TOMBOL STOP (Tanpa ubah CSS aneh-aneh) --
    isPlaying = true;
    setButtonStyle("icon-audio", true); // Pakai style aktif yang lama
    
    if (icon) {
        icon.className = "fas fa-stop"; // Ganti ikon jadi kotak
        icon.style.marginLeft = "0";
    }
    if (label) label.innerText = "Stop"; // Ganti teks jadi Stop

    activeUtterance.onend = () => {
        stopAudio(); // Reset otomatis kalau selesai
    };

    window.speechSynthesis.speak(activeUtterance);
}

function stopAudio() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    
    // -- KEMBALIKAN TAMPILAN JADI TOMBOL PLAY --
    isPlaying = false;
    setButtonStyle("icon-audio", false); // Matikan style aktif
    
    const btnAudio = document.getElementById("btn-audio");
    const label = document.getElementById("label-audio");
    
    if(btnAudio) {
        const icon = btnAudio.querySelector("i");
        if(icon) {
            icon.className = "fas fa-play"; // Balik jadi segitiga
            icon.style.marginLeft = "3px";
        }
    }
    if(label) label.innerText = "Dengar";
}

// --- HELPER STYLES (TIDAK DIUBAH, SESUAI ASLINYA) ---
function setButtonStyle(iconId, isActive, colorType = 'blue') {
    const iconEl = document.getElementById(iconId);
    if (!iconEl) return;
    if (isActive) {
        if (colorType === 'blue') {
            iconEl.style.background = 'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)';
            iconEl.style.boxShadow = '0 6px 15px rgba(0, 114, 255, 0.4)';
        } else if (colorType === 'purple') {
            iconEl.style.background = 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)';
            iconEl.style.boxShadow = '0 6px 15px rgba(161, 140, 209, 0.4)';
        }
        iconEl.style.color = 'white';
        iconEl.style.transform = 'scale(1.1) translateY(-2px)'; 
    } else {
        iconEl.style.background = '#f0f2f5';
        iconEl.style.color = '#555';
        iconEl.style.boxShadow = 'none';
        iconEl.style.transform = 'scale(1) translateY(0)';
    }
}

function handleScrollTopButton() {
    const btn = document.getElementById("btn-scroll-top");
    if (!btn) return;
    if (window.scrollY > 300) {
        btn.style.width = "45px"; 
        btn.style.opacity = "1";
        btn.style.transform = "scale(1)";
        btn.style.marginLeft = "0px"; 
        btn.style.pointerEvents = "auto";
    } else {
        btn.style.width = "0px";
        btn.style.opacity = "0";
        btn.style.transform = "scale(0)";
        btn.style.marginLeft = "-15px"; 
        btn.style.pointerEvents = "none";
    }
}

function parseRuby(text) {
    if (!text) return "";
    return text.replace(/\[\[(.*?)\|(.*?)\]\]/g, (match, kanji, furigana) => {
        return `<ruby>${kanji}<rt>${furigana}</rt></ruby>`;
    });
}