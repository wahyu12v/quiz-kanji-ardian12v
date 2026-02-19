// --- AUDIO SYSTEM ---
let isPlaying = false;

function playAudio() {
    const btnAudio = document.getElementById("btn-audio");
    const icon = btnAudio ? btnAudio.querySelector("i") : null;
    const label = document.getElementById("label-audio");

    if (isPlaying || window.speechSynthesis.speaking) {
        stopAudio();
        return;
    }

    const contentContainer = document.getElementById("interlinear-content");
    if (!contentContainer) return;

    const jpSentences = contentContainer.querySelectorAll(".jp-sentence");
    let fullText = "";
    jpSentences.forEach(el => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll("rt").forEach(rt => rt.remove());
        fullText += clone.textContent + " ";
    });

    if (!fullText.trim()) return;
    if (!("speechSynthesis" in window)) { alert("Browser tidak mendukung suara."); return; }

    window.speechSynthesis.cancel();
    activeUtterance = new SpeechSynthesisUtterance(fullText);
    activeUtterance.lang = "ja-JP";
    activeUtterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const japanVoice = voices.find(v => v.lang === "ja-JP" || v.name.includes("Japan"));
    if (japanVoice) activeUtterance.voice = japanVoice;

    isPlaying = true;
    setButtonStyle("icon-audio", true, "audio");
    if (icon) { icon.className = "bi bi-stop-fill"; }
    if (label) label.innerText = "Stop";

    activeUtterance.onend = () => { stopAudio(); };
    window.speechSynthesis.speak(activeUtterance);
}

function stopAudio() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    isPlaying = false;
    setButtonStyle("icon-audio", false);

    const btnAudio = document.getElementById("btn-audio");
    const label = document.getElementById("label-audio");
    if (btnAudio) {
        const icon = btnAudio.querySelector("i");
        if (icon) icon.className = "bi bi-play-fill";
        btnAudio.classList.remove("label-active");
    }
    if (label) label.innerText = "Dengar";
}

// --- HELPER STYLES — pakai class dock-active ---
function setButtonStyle(iconId, isActive, colorType) {
    const iconEl = document.getElementById(iconId);
    if (!iconEl) return;

    // Tentukan button parent untuk label-active
    const btnMap = {
        "icon-trans":    "toggle-trans-btn",
        "icon-furigana": "toggle-furigana-btn",
        "icon-audio":    "btn-audio"
    };
    const btnId = btnMap[iconId];
    const btnEl = btnId ? document.getElementById(btnId) : null;

    if (isActive) {
        iconEl.classList.add("dock-active");
        if (btnEl) btnEl.classList.add("label-active");
    } else {
        iconEl.classList.remove("dock-active");
        if (btnEl) btnEl.classList.remove("label-active");
    }
}

// --- SCROLL TO TOP — selalu tampil, warna berubah saat scroll ---
function handleScrollTopButton() {
    const iconUp = document.getElementById("icon-up");
    if (!iconUp) return;
    if (window.scrollY > 300) {
        iconUp.classList.add("dock-active");
    } else {
        iconUp.classList.remove("dock-active");
    }
}

// --- PARSE RUBY ---
function parseRuby(text) {
    if (!text) return "";
    return text.replace(/\[\[(.*?)\|(.*?)\]\]/g, (match, kanji, furigana) => {
        return `<ruby>${kanji}<rt>${furigana}</rt></ruby>`;
    });
}