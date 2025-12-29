let storiesData = [];
let currentStoryText = ""; // Simpan teks bersih untuk audio
let isSpeaking = false;    // Status suara

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("exit-btn").classList.remove('d-none');
    document.getElementById("header-back-btn").classList.add('d-none');
    fetchStories();
    
    document.getElementById("header-back-btn").addEventListener("click", goBack);
    document.getElementById("toggle-trans-btn").addEventListener("click", toggleTranslation);
    document.getElementById("play-audio-btn").addEventListener("click", toggleAudio); // Listener Audio
});

function fetchStories() {
    const spinner = document.getElementById("loading-spinner");
    fetch('data.json')
        .then(res => res.json())
        .then(data => {
            storiesData = data;
            renderStories(data);
            spinner.style.display = 'none';
        });
}

function renderStories(stories) {
    const gridContainer = document.getElementById("story-grid");
    gridContainer.innerHTML = "";
    stories.forEach(story => {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4";
        col.innerHTML = `
            <div class="card h-100 border-0 shadow-sm rounded-4 story-card" style="cursor: pointer; transition: transform 0.2s;">
                <div class="d-flex align-items-center justify-content-center text-white rounded-top-4" style="height: 160px; background: ${story.color}; font-size: 3.5rem;">
                    <i class="${story.icon}"></i>
                </div>
                <div class="card-body text-center p-4">
                    <h5 class="fw-bold text-dark m-0">${story.title}</h5>
                </div>
            </div>`;
        
        const card = col.querySelector('.story-card');
        card.onmouseover = () => card.style.transform = "translateY(-5px)";
        card.onmouseout = () => card.style.transform = "translateY(0)";
        card.onclick = () => openStory(story.id);

        gridContainer.appendChild(col);
    });
}

function parseTemplate(text) {
    if (!text) return "";
    let processed = text.replace(/\[\[(.*?)\|(.*?)\]\]/g, `<ruby>$1<rt>$2</rt></ruby>`);
    return processed.replace(/。/g, '。<br><br>');
}

// Fungsi membersihkan teks untuk dibaca Robot (Hapus Furigana)
function cleanTextForSpeech(text) {
    // Ubah [[Kanji|Furigana]] menjadi Kanji saja
    // Contoh: [[私|わたし]] -> 私
    return text.replace(/\[\[(.*?)\|(.*?)\]\]/g, "$1");
}

function formatTranslation(text) {
    if (!text) return "";
    return text.replace(/\. /g, '.<br><br>');
}

function openStory(id) {
    const story = storiesData.find(s => s.id === id);
    if (!story) return;

    // Siapkan teks bersih untuk audio
    currentStoryText = cleanTextForSpeech(story.template);
    stopAudio(); // Matikan suara jika ada yang sedang jalan

    const hero = document.getElementById("reader-hero");
    hero.style.background = story.color;
    hero.innerHTML = `<i class="${story.icon}" style="font-size: 5rem; text-shadow: 0 4px 10px rgba(0,0,0,0.1);"></i>`;

    document.getElementById("reader-title").innerText = story.title;
    document.getElementById("reader-text").innerHTML = parseTemplate(story.template);
    document.getElementById("reader-translation").innerHTML = formatTranslation(story.translation);
    
    // Reset Tombol
    const transBox = document.getElementById("reader-translation");
    const btnTrans = document.getElementById("toggle-trans-btn");
    transBox.classList.add("d-none");
    btnTrans.innerHTML = '<i class="fas fa-language me-2"></i> Arti';

    document.getElementById("list-view").classList.add("d-none");
    document.getElementById("reader-view").classList.remove("d-none");
    document.getElementById("exit-btn").classList.add('d-none');
    document.getElementById("header-back-btn").classList.remove('d-none');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleTranslation() {
    const box = document.getElementById("reader-translation");
    const btn = document.getElementById("toggle-trans-btn");
    
    if (box.classList.contains("d-none")) {
        box.classList.remove("d-none");
        btn.innerHTML = '<i class="fas fa-eye-slash me-2"></i> Tutup';
    } else {
        box.classList.add("d-none");
        btn.innerHTML = '<i class="fas fa-language me-2"></i> Arti';
    }
}

// --- LOGIKA AUDIO ---
function toggleAudio() {
    const btn = document.getElementById("play-audio-btn");

    if (isSpeaking) {
        stopAudio();
    } else {
        playAudio(currentStoryText);
        btn.innerHTML = '<i class="fas fa-stop me-2"></i> Stop';
        btn.classList.remove("btn-warning");
        btn.classList.add("btn-danger");
        isSpeaking = true;
    }
}

function playAudio(text) {
    if (!text) return;

    // Cek apakah browser mendukung
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP'; // Bahasa Jepang
        utterance.rate = 0.9;     // Kecepatan sedikit lambat biar jelas
        utterance.pitch = 1;

        // Saat selesai bicara
        utterance.onend = function() {
            resetAudioButton();
        };

        window.speechSynthesis.speak(utterance);
    } else {
        alert("Browser kamu tidak mendukung fitur suara.");
    }
}

function stopAudio() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    resetAudioButton();
}

function resetAudioButton() {
    const btn = document.getElementById("play-audio-btn");
    btn.innerHTML = '<i class="fas fa-volume-up me-2"></i> Dengar';
    btn.classList.remove("btn-danger");
    btn.classList.add("btn-warning");
    isSpeaking = false;
}

function goBack() {
    stopAudio(); // Matikan suara saat kembali
    document.getElementById("reader-view").classList.add("d-none");
    document.getElementById("list-view").classList.remove("d-none");
    document.getElementById("exit-btn").classList.remove('d-none');
    document.getElementById("header-back-btn").classList.add('d-none');
}