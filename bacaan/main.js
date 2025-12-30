let storiesData = [];      // Ini adalah data yang AKTIF digunakan (bisa singkat, bisa panjang)
let shortStories = [];     // Simpanan data singkat
let longStories = [];      // Simpanan data panjang
let currentStoryIndex = 0;
let activeUtterance = null; 
let tempSelectedId = null; // Untuk menyimpan ID sementara saat Modal muncul

document.addEventListener("DOMContentLoaded", () => {
    // 1. Tampilan Awal
    const exitBtn = document.getElementById("exit-btn");
    const headerBackBtn = document.getElementById("header-back-btn");
    if (exitBtn) exitBtn.classList.remove('d-none');
    if (headerBackBtn) headerBackBtn.classList.add('d-none');

    // 2. FETCH KEDUA DATA SEKALIGUS
    fetchAllData();

    // 3. Pancing Audio (PC)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            console.log("Daftar suara loaded.");
        };
    }
    
    // 4. Listeners Tombol
    // -- Listener Modal --
    document.getElementById("btn-pilih-singkat").addEventListener("click", () => selectVersion('short'));
    document.getElementById("btn-pilih-panjang").addEventListener("click", () => selectVersion('long'));

    // -- Listener Lainnya --
    const btnBack = document.getElementById("header-back-btn");
    if (btnBack) btnBack.addEventListener("click", goBack);

    const btnTrans = document.getElementById("toggle-trans-btn");
    if (btnTrans) btnTrans.addEventListener("click", toggleTranslation);
    
    const btnAudio = document.getElementById("btn-audio");
    if (btnAudio) btnAudio.addEventListener("click", playAudio);

    const btnStop = document.getElementById("btn-stop");
    if (btnStop) btnStop.addEventListener("click", stopAudio);

    const btnPrev = document.getElementById("btn-prev");
    if (btnPrev) btnPrev.addEventListener("click", prevStory);

    const btnNext = document.getElementById("btn-next");
    if (btnNext) btnNext.addEventListener("click", nextStory);
});

// --- FUNGSI FETCH BARU (LOAD 2 FILE) ---

function fetchAllData() {
    const spinner = document.getElementById("loading-spinner");

    // Kita load kedua file secara bersamaan
    Promise.all([
        fetch('data.json').then(res => res.json()),           // Data Singkat
        fetch('bacaanlengkap.json').then(res => res.json())   // Data Panjang
    ])
    .then(([dataSingkat, dataPanjang]) => {
        shortStories = dataSingkat;
        longStories = dataPanjang;
        
        // Default tampilan awal pakai list dari data singkat (karena judul/icon sama)
        renderStories(shortStories);
        
        if (spinner) spinner.style.display = 'none';
    })
    .catch(err => {
        console.error("Gagal memuat data:", err);
        if (spinner) spinner.innerHTML = `<div class="alert alert-danger">Gagal memuat data JSON. Cek nama file!</div>`;
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
            </div>`;
        
        // UBAHAN PENTING: Saat diklik, BUKAN openStory, tapi showModal
        col.querySelector('.story-card').addEventListener('click', () => showVersionModal(story.id));
        
        gridContainer.appendChild(col);
    });
}

// --- LOGIKA MODAL & PEMILIHAN VERSI ---

function showVersionModal(id) {
    tempSelectedId = id; // Simpan ID cerita yang diklik
    // Panggil Modal Bootstrap
    const myModal = new bootstrap.Modal(document.getElementById('versionModal'));
    myModal.show();
}

function selectVersion(type) {
    // Tentukan data mana yang akan aktif dipakai
    if (type === 'short') {
        storiesData = shortStories;
        console.log("Mode: Versi Singkat");
    } else {
        storiesData = longStories;
        console.log("Mode: Versi Panjang");
    }

    // Buka cerita berdasarkan ID yang disimpan tadi
    openStory(tempSelectedId);
}

// --- UTILITIES ---

function parseTemplate(text) {
    if (!text) return "";
    return text.replace(/\[\[(.*?)\|(.*?)\]\]/g, (match, kanji, furigana) => {
        return `<ruby>${kanji}<rt>${furigana}</rt></ruby>`;
    });
}

// --- LOGIKA AUDIO (TETAP) ---

function playAudio() {
    const story = storiesData[currentStoryIndex];
    if (!story) return;

    stopAudio();
    const cleanText = story.template.replace(/\[\[(.*?)\|.*?\]\]/g, "$1");

    if (!('speechSynthesis' in window)) {
        alert("Browser tidak mendukung suara.");
        return;
    }

    activeUtterance = new SpeechSynthesisUtterance(cleanText);
    activeUtterance.lang = 'ja-JP'; 
    activeUtterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const japanVoice = voices.find(v => v.lang === 'ja-JP' || v.name.includes('Japan'));
    
    if (japanVoice) {
        activeUtterance.voice = japanVoice;
    }

    window.speechSynthesis.speak(activeUtterance);

    if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
    }
}

function stopAudio() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}

// --- LOGIKA NAVIGASI (TETAP) ---

function openStory(id) {
    // Cari index berdasarkan ID di dalam storiesData (yang sudah dipilih singkat/panjang)
    currentStoryIndex = storiesData.findIndex(s => s.id === id);
    const story = storiesData[currentStoryIndex];
    
    if (!story) return; // Error handling jika ID beda

    stopAudio(); 
    updateNavButtons();
    
    // Setup Header Icon
    const readerImg = document.getElementById("reader-img");
    if (readerImg) readerImg.style.display = 'none';

    let iconWrapper = document.getElementById("reader-icon-wrapper");
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

    document.getElementById("reader-title").innerText = story.title;
    document.getElementById("reader-text").innerHTML = parseTemplate(story.template);
    
    const transBox = document.getElementById("reader-translation");
    if(transBox) {
        transBox.innerText = story.translation;
        transBox.style.display = 'none';
    }
    const transBtn = document.getElementById("toggle-trans-btn");
    if(transBtn) transBtn.innerHTML = '<i class="fas fa-language me-2"></i> Tampilkan Terjemahan';

    document.getElementById("list-view").style.display = 'none';
    document.getElementById("reader-view").style.display = 'block';
    
    const exitBtn = document.getElementById("exit-btn");
    const backBtn = document.getElementById("header-back-btn");
    if(exitBtn) exitBtn.classList.add('d-none');
    if(backBtn) backBtn.classList.remove('d-none');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
    stopAudio();
    document.getElementById("reader-view").style.display = 'none';
    document.getElementById("list-view").style.display = 'block';
    
    const exitBtn = document.getElementById("exit-btn");
    const backBtn = document.getElementById("header-back-btn");
    if(exitBtn) exitBtn.classList.remove('d-none');
    if(backBtn) backBtn.classList.add('d-none');
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

function updateNavButtons() {
    const btnPrev = document.getElementById("btn-prev");
    const btnNext = document.getElementById("btn-next");
    if (!btnPrev || !btnNext) return;

    if (currentStoryIndex === 0) btnPrev.classList.add("disabled");
    else btnPrev.classList.remove("disabled");

    if (currentStoryIndex === storiesData.length - 1) {
        btnNext.classList.add("disabled");
        btnNext.innerHTML = 'Selesai';
    } else {
        btnNext.classList.remove("disabled");
        btnNext.innerHTML = 'Selanjutnya ';
    }
}

function prevStory() {
    if (currentStoryIndex > 0) openStory(storiesData[currentStoryIndex - 1].id);
}

function nextStory() {
    if (currentStoryIndex < storiesData.length - 1) openStory(storiesData[currentStoryIndex + 1].id);
}