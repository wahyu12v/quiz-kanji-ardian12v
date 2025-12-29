let storiesData = [];
let currentStoryIndex = 0; // Untuk melacak posisi cerita

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("exit-btn").classList.remove('d-none');
    document.getElementById("header-back-btn").classList.add('d-none');

    fetchStories();
    
    // Listeners Dasar
    document.getElementById("header-back-btn").addEventListener("click", goBack);
    document.getElementById("toggle-trans-btn").addEventListener("click", toggleTranslation);
    
    // Listeners Baru (Audio & Navigasi)
    document.getElementById("btn-audio").addEventListener("click", playAudio);
    document.getElementById("btn-prev").addEventListener("click", prevStory);
    document.getElementById("btn-next").addEventListener("click", nextStory);
});

// --- FUNGSI FETCH & RENDER ---

function fetchStories() {
    const spinner = document.getElementById("loading-spinner");

    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error("Gagal mengambil data.");
            return response.json();
        })
        .then(data => {
            storiesData = data;
            renderStories(data);
            spinner.style.display = 'none';
        })
        .catch(error => {
            console.error('Error:', error);
            spinner.innerHTML = `<div class="alert alert-danger">Gagal memuat data (Gunakan Live Server).</div>`;
        });
}

function renderStories(stories) {
    const gridContainer = document.getElementById("story-grid");
    gridContainer.innerHTML = "";

    stories.forEach(story => {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4 d-flex align-items-stretch";
        
        col.innerHTML = `
            <div class="story-card w-100">
                <div class="card-icon-wrapper" style="background: ${story.color}">
                    <i class="${story.icon}"></i>
                </div>
                <div class="card-body-custom text-center">
                    <h5 class="story-title">${story.title}</h5>
                </div>
            </div>
        `;
        
        col.querySelector('.story-card').addEventListener('click', () => openStory(story.id));
        gridContainer.appendChild(col);
    });
}

function parseTemplate(text) {
    if (!text) return "";
    return text.replace(/\[\[(.*?)\|(.*?)\]\]/g, (match, kanji, furigana) => {
        return `<ruby>${kanji}<rt>${furigana}</rt></ruby>`;
    });
}

// --- LOGIKA UTAMA ---

function openStory(id) {
    // Simpan index cerita yang sedang dibuka
    currentStoryIndex = storiesData.findIndex(s => s.id === id);
    const story = storiesData[currentStoryIndex];
    
    if (!story) return;

    // Update Tombol Navigasi (Aktif/Nonaktif)
    updateNavButtons();
    
    // Stop audio jika ada yang sedang berjalan
    stopAudio();

    // --- SETUP HEADER ---
    const readerImg = document.getElementById("reader-img");
    readerImg.style.display = 'none';

    let iconWrapper = document.getElementById("reader-icon-wrapper");
    if (!iconWrapper) {
        iconWrapper = document.createElement("div");
        iconWrapper.id = "reader-icon-wrapper";
        iconWrapper.className = "reader-hero-icon";
        readerImg.parentNode.insertBefore(iconWrapper, readerImg);
    }
    
    iconWrapper.style.background = story.color;
    iconWrapper.innerHTML = `<i class="${story.icon}"></i>`;
    iconWrapper.style.display = 'flex';

    // --- ISI KONTEN ---
    document.getElementById("reader-title").innerText = story.title;
    document.getElementById("reader-text").innerHTML = parseTemplate(story.template);
    document.getElementById("reader-translation").innerText = story.translation;
    
    // Reset Tampilan
    document.getElementById("reader-translation").style.display = 'none';
    document.getElementById("toggle-trans-btn").innerHTML = '<i class="fas fa-language me-2"></i> Tampilkan Terjemahan';

    // Pindah Halaman
    document.getElementById("list-view").style.display = 'none';
    document.getElementById("reader-view").style.display = 'block';
    
    document.getElementById("exit-btn").classList.add('d-none');
    document.getElementById("header-back-btn").classList.remove('d-none');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
    stopAudio(); // Stop suara pas kembali
    document.getElementById("reader-view").style.display = 'none';
    document.getElementById("list-view").style.display = 'block';
    
    document.getElementById("exit-btn").classList.remove('d-none');
    document.getElementById("header-back-btn").classList.add('d-none');
}

function toggleTranslation() {
    const transBox = document.getElementById("reader-translation");
    const btn = document.getElementById("toggle-trans-btn");
    
    if (transBox.style.display === 'none') {
        transBox.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-eye-slash me-2"></i> Tutup Terjemahan';
    } else {
        transBox.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-language me-2"></i> Tampilkan Terjemahan';
    }
}

// --- LOGIKA AUDIO (TEXT TO SPEECH) ---

function playAudio() {
    const story = storiesData[currentStoryIndex];
    if (!story) return;

    // Bersihkan teks dari format [[Kanji|Furigana]] agar dibaca lancar
    // Regex ini mengambil "Kanji" dan membuang "|Furigana"
    const cleanText = story.template.replace(/\[\[(.*?)\|.*?\]\]/g, "$1");

    if ('speechSynthesis' in window) {
        // Stop jika ada suara sebelumnya
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'ja-JP'; // Bahasa Jepang
        utterance.rate = 0.9; // Kecepatan sedikit lambat agar jelas
        
        window.speechSynthesis.speak(utterance);
    } else {
        alert("Browser Anda tidak mendukung fitur suara.");
    }
}

function stopAudio() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}

// --- LOGIKA TOMBOL NAVIGASI ---

function updateNavButtons() {
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");

    // Cek Tombol Prev
    if (currentStoryIndex === 0) {
        btnPrev.classList.add("disabled"); // Matikan jika cerita pertama
    } else {
        btnPrev.classList.remove("disabled");
    }

    // Cek Tombol Next
    if (currentStoryIndex === storiesData.length - 1) {
        btnNext.classList.add("disabled"); // Matikan jika cerita terakhir
        btnNext.innerHTML = 'Selesai <i class="fas fa-check ms-2"></i>';
    } else {
        btnNext.classList.remove("disabled");
        btnNext.innerHTML = 'Selanjutnya <i class="fas fa-arrow-right ms-2"></i>';
    }
}

function prevStory() {
    if (currentStoryIndex > 0) {
        const prevId = storiesData[currentStoryIndex - 1].id;
        openStory(prevId);
    }
}

function nextStory() {
    if (currentStoryIndex < storiesData.length - 1) {
        const nextId = storiesData[currentStoryIndex + 1].id;
        openStory(nextId);
    }
}