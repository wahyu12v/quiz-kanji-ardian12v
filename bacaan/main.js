let storiesData = [];
let currentStoryIndex = 0; // Untuk melacak posisi cerita

document.addEventListener("DOMContentLoaded", () => {
    // Setup Tampilan Awal
    const exitBtn = document.getElementById("exit-btn");
    const headerBackBtn = document.getElementById("header-back-btn");

    if (exitBtn) exitBtn.classList.remove('d-none');
    if (headerBackBtn) headerBackBtn.classList.add('d-none');

    fetchStories();
    
    // --- Listeners Dasar ---
    const btnBack = document.getElementById("header-back-btn");
    if (btnBack) btnBack.addEventListener("click", goBack);

    const btnTrans = document.getElementById("toggle-trans-btn");
    if (btnTrans) btnTrans.addEventListener("click", toggleTranslation);
    
    // --- Listeners Audio & Navigasi ---
    const btnAudio = document.getElementById("btn-audio");
    if (btnAudio) btnAudio.addEventListener("click", playAudio);

    // Listener Tombol Stop (Pastikan tombol ini ada di HTML Anda)
    const btnStop = document.getElementById("btn-stop");
    if (btnStop) btnStop.addEventListener("click", stopAudio);

    const btnPrev = document.getElementById("btn-prev");
    if (btnPrev) btnPrev.addEventListener("click", prevStory);

    const btnNext = document.getElementById("btn-next");
    if (btnNext) btnNext.addEventListener("click", nextStory);
});

// --- FUNGSI FETCH & RENDER (TIDAK DIUBAH) ---

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
            if (spinner) spinner.style.display = 'none';
        })
        .catch(error => {
            console.error('Error:', error);
            if (spinner) spinner.innerHTML = `<div class="alert alert-danger">Gagal memuat data (Gunakan Live Server).</div>`;
        });
}

function renderStories(stories) {
    const gridContainer = document.getElementById("story-grid");
    if (!gridContainer) return;
    
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

// --- LOGIKA UTAMA (TIDAK DIUBAH, KECUALI STOP AUDIO) ---

function openStory(id) {
    // Simpan index cerita yang sedang dibuka
    currentStoryIndex = storiesData.findIndex(s => s.id === id);
    const story = storiesData[currentStoryIndex];
    
    if (!story) return;

    // Update Tombol Navigasi
    updateNavButtons();
    
    // PENTING: Matikan suara saat ganti cerita
    stopAudio();

    // --- SETUP HEADER ---
    const readerImg = document.getElementById("reader-img");
    if (readerImg) readerImg.style.display = 'none';

    let iconWrapper = document.getElementById("reader-icon-wrapper");
    // Jika wrapper belum ada, buat baru
    if (!iconWrapper && readerImg) {
        iconWrapper = document.createElement("div");
        iconWrapper.id = "reader-icon-wrapper";
        iconWrapper.className = "reader-hero-icon";
        readerImg.parentNode.insertBefore(iconWrapper, readerImg);
    }
    
    if (iconWrapper) {
        iconWrapper.style.background = story.color;
        iconWrapper.innerHTML = `<i class="${story.icon}"></i>`;
        iconWrapper.style.display = 'flex';
    }

    // --- ISI KONTEN ---
    document.getElementById("reader-title").innerText = story.title;
    document.getElementById("reader-text").innerHTML = parseTemplate(story.template);
    
    const transBox = document.getElementById("reader-translation");
    if (transBox) {
        transBox.innerText = story.translation;
        transBox.style.display = 'none';
    }
    
    const transBtn = document.getElementById("toggle-trans-btn");
    if (transBtn) {
        transBtn.innerHTML = '<i class="fas fa-language me-2"></i> Tampilkan Terjemahan';
    }

    // Pindah Halaman
    document.getElementById("list-view").style.display = 'none';
    document.getElementById("reader-view").style.display = 'block';
    
    const exitBtn = document.getElementById("exit-btn");
    const backBtn = document.getElementById("header-back-btn");
    if (exitBtn) exitBtn.classList.add('d-none');
    if (backBtn) backBtn.classList.remove('d-none');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
    stopAudio(); // Stop suara pas kembali
    document.getElementById("reader-view").style.display = 'none';
    document.getElementById("list-view").style.display = 'block';
    
    const exitBtn = document.getElementById("exit-btn");
    const backBtn = document.getElementById("header-back-btn");
    if (exitBtn) exitBtn.classList.remove('d-none');
    if (backBtn) backBtn.classList.add('d-none');
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

// --- LOGIKA AUDIO (DIPERBAIKI UNTUK PC & STOP) ---

// Fungsi Helper: Menunggu daftar suara dimuat (Fix untuk PC Chrome/Edge)
function getVoicesPromise() {
    return new Promise((resolve) => {
        let voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve(voices);
        } else {
            // Jika suara belum siap (array kosong), tunggu event ini
            window.speechSynthesis.onvoiceschanged = () => {
                resolve(window.speechSynthesis.getVoices());
            };
        }
    });
}

async function playAudio() {
    const story = storiesData[currentStoryIndex];
    if (!story) return;

    // 1. Matikan suara sebelumnya jika ada
    stopAudio();

    // 2. Bersihkan teks (Ambil Kanji saja, buang Furigana)
    const cleanText = story.template.replace(/\[\[(.*?)\|.*?\]\]/g, "$1");

    if ('speechSynthesis' in window) {
        // 3. Tunggu sampai browser siap memberikan daftar suara
        const voices = await getVoicesPromise();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        
        // 4. Paksa Bahasa Jepang
        utterance.lang = 'ja-JP'; 
        
        // 5. Coba cari suara Jepang asli (Google / Microsoft / Apple)
        // Agar tidak membaca angka dalam bahasa Inggris
        const japanVoice = voices.find(v => v.lang === 'ja-JP' || v.name.includes('Japan') || v.name.includes('Google日本語'));
        
        if (japanVoice) {
            utterance.voice = japanVoice;
        }

        utterance.rate = 0.9; // Kecepatan sedikit lambat
        
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

// --- LOGIKA TOMBOL NAVIGASI (TIDAK DIUBAH) ---

function updateNavButtons() {
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");

    if (!btnPrev || !btnNext) return;

    // Cek Tombol Prev
    if (currentStoryIndex === 0) {
        btnPrev.classList.add("disabled"); 
    } else {
        btnPrev.classList.remove("disabled");
    }

    // Cek Tombol Next
    if (currentStoryIndex === storiesData.length - 1) {
        btnNext.classList.add("disabled"); 
        btnNext.innerHTML = 'Selesai';
    } else {
        btnNext.classList.remove("disabled");
        btnNext.innerHTML = 'Selanjutnya ';
    }
}

function prevStory() {
    if (currentStoryIndex > 0) {
        // Ambil ID dari index sebelumnya
        const prevId = storiesData[currentStoryIndex - 1].id;
        openStory(prevId);
    }
}

function nextStory() {
    if (currentStoryIndex < storiesData.length - 1) {
        // Ambil ID dari index setelahnya
        const nextId = storiesData[currentStoryIndex + 1].id;
        openStory(nextId);
    }
}