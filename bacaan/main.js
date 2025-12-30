let storiesData = [];      
let shortStories = [];     
let longStories = [];      
let currentStoryIndex = 0;
let activeUtterance = null; 
let tempSelectedId = null;  

// --- KONFIGURASI PAGINATION ---
const itemsPerPage = 6; // Jumlah cerita per halaman
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Tampilan Awal
    const exitBtn = document.getElementById("exit-btn");
    const headerBackBtn = document.getElementById("header-back-btn");
    if (exitBtn) exitBtn.classList.remove('d-none');
    if (headerBackBtn) headerBackBtn.classList.add('d-none');

    // 2. INJECT CSS OTOMATIS (Agar Furigana bisa hilang)
    const style = document.createElement('style');
    style.innerHTML = `
        .hide-furigana rt { opacity: 0; transition: opacity 0.3s ease; }
        .page-btn { 
            width: 40px; height: 40px; border-radius: 50%; border: none; 
            background: #f0f2f5; color: #333; font-weight: bold; transition: 0.3s;
        }
        .page-btn:hover { background: #e0e0e0; }
        .page-btn.active { background: #0072FF; color: white; box-shadow: 0 4px 10px rgba(0,114,255,0.3); }
        .page-nav-btn {
            padding: 8px 20px; border-radius: 20px; border: 1px solid #ddd;
            background: white; color: #555; font-weight: 600; transition: 0.3s;
        }
        .page-nav-btn:hover:not(:disabled) { border-color: #0072FF; color: #0072FF; }
        .page-nav-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    `;
    document.head.appendChild(style);

    // 3. FETCH DATA
    fetchAllData();

    // 4. Pancing Audio (PC)
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            console.log("Daftar suara loaded.");
        };
    }
    
    // 5. LISTENERS TOMBOL
    
    // -- Modal Buttons --
    const btnPilihSingkat = document.getElementById("btn-pilih-singkat");
    if(btnPilihSingkat) btnPilihSingkat.addEventListener("click", () => selectVersion('short'));

    const btnPilihPanjang = document.getElementById("btn-pilih-panjang");
    if(btnPilihPanjang) btnPilihPanjang.addEventListener("click", () => selectVersion('long'));

    // -- Navigation Buttons --
    const btnBack = document.getElementById("header-back-btn");
    if (btnBack) btnBack.addEventListener("click", goBack);

    const btnPrev = document.getElementById("btn-prev");
    if (btnPrev) btnPrev.addEventListener("click", prevStory);

    const btnNext = document.getElementById("btn-next");
    if (btnNext) btnNext.addEventListener("click", nextStory);

    // -- Feature Buttons --
    const btnTrans = document.getElementById("toggle-trans-btn");
    if (btnTrans) btnTrans.addEventListener("click", toggleTranslation);
    
    // Tombol Furigana (Posisi Atas)
    const btnFurigana = document.getElementById("toggle-furigana-btn");
    if (btnFurigana) btnFurigana.addEventListener("click", toggleFurigana);

    // -- Audio Buttons --
    const btnAudio = document.getElementById("btn-audio");
    if (btnAudio) btnAudio.addEventListener("click", playAudio);

    const btnStop = document.getElementById("btn-stop");
    if (btnStop) btnStop.addEventListener("click", stopAudio);
});

// --- FUNGSI FETCH DATA ---

function fetchAllData() {
    const spinner = document.getElementById("loading-spinner");

    Promise.all([
        fetch('data.json').then(res => res.json()),           
        fetch('bacaanlengkap.json').then(res => res.json())   
    ])
    .then(([dataSingkat, dataPanjang]) => {
        // [MODIFIKASI] REVERSE DATA (Terbaru Paling Atas)
        shortStories = dataSingkat.reverse();
        longStories = dataPanjang.reverse();
        
        renderStories(); // Render halaman pertama
        
        if (spinner) spinner.style.display = 'none';
    })
    .catch(err => {
        console.error("Gagal memuat data:", err);
        if (spinner) spinner.innerHTML = `<div class="alert alert-danger">Gagal memuat data JSON.</div>`;
    });
}

// --- FUNGSI RENDER DENGAN PAGINATION ---

function renderStories() {
    const gridContainer = document.getElementById("story-grid");
    const paginationContainer = document.getElementById("pagination-container");
    
    if (!gridContainer) return;
    gridContainer.innerHTML = "";
    
    // Hitung Slice Data untuk Halaman Ini
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = shortStories.slice(start, end);
    
    // Render Item
    paginatedItems.forEach(story => {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4 d-flex align-items-stretch";
        // Animasi Fade In sederhana
        col.style.animation = "fadeIn 0.5s ease";
        
        col.innerHTML = `
            <div class="story-card w-100">
                <div class="card-icon-wrapper" style="background: ${story.color}">
                    <i class="${story.icon}"></i>
                </div>
                <div class="card-body-custom text-center">
                    <h5 class="story-title">${story.title}</h5>
                </div>
            </div>`;
        
        col.querySelector('.story-card').addEventListener('click', () => showVersionModal(story.id));
        gridContainer.appendChild(col);
    });

    // Setup Tombol Pagination
    setupPagination(shortStories.length, paginationContainer);
}

function setupPagination(totalItems, container) {
    container.innerHTML = "";
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return; // Tidak perlu pagination jika cuma 1 halaman

    // Tombol PREV
    const prevBtn = document.createElement("button");
    prevBtn.className = "page-nav-btn";
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            renderStories();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    container.appendChild(prevBtn);

    // Info Halaman (Page 1 of X)
    const pageInfo = document.createElement("span");
    pageInfo.className = "fw-bold text-muted mx-2";
    pageInfo.innerText = `Hal ${currentPage} / ${totalPages}`;
    container.appendChild(pageInfo);

    // Tombol NEXT
    const nextBtn = document.createElement("button");
    nextBtn.className = "page-nav-btn";
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderStories();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };
    container.appendChild(nextBtn);
}

// --- LOGIKA MODAL ---

function showVersionModal(id) {
    tempSelectedId = id; 
    const myModal = new bootstrap.Modal(document.getElementById('versionModal'));
    myModal.show();
}

function selectVersion(type) {
    if (type === 'short') {
        storiesData = shortStories;
        console.log("Mode: Versi Singkat");
    } else {
        storiesData = longStories;
        console.log("Mode: Versi Panjang");
    }
    openStory(tempSelectedId);
}

// --- UTILITIES ---

function parseTemplate(text) {
    if (!text) return "";
    return text.replace(/\[\[(.*?)\|(.*?)\]\]/g, (match, kanji, furigana) => {
        return `<ruby>${kanji}<rt>${furigana}</rt></ruby>`;
    });
}

// --- LOGIKA READER ---

function openStory(id) {
    currentStoryIndex = storiesData.findIndex(s => s.id === id);
    const story = storiesData[currentStoryIndex];
    
    if (!story) return;

    stopAudio(); 
    updateNavButtons();
    
    // [RESET] Kembalikan Furigana setiap ganti cerita
    const textBox = document.getElementById("reader-text");
    textBox.classList.remove("hide-furigana");
    
    const btnFurigana = document.getElementById("toggle-furigana-btn");
    if(btnFurigana) {
        btnFurigana.innerHTML = '<i class="fas fa-eye-slash"></i> <span>Furigana</span>';
        btnFurigana.style.opacity = "1";
    }

    // Setup Header UI
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

    // Isi Konten
    document.getElementById("reader-title").innerText = story.title;
    textBox.innerHTML = parseTemplate(story.template);
    
    // Reset Terjemahan
    const transBox = document.getElementById("reader-translation");
    if(transBox) {
        transBox.innerText = story.translation;
        transBox.style.display = 'none';
    }
    const transBtn = document.getElementById("toggle-trans-btn");
    if(transBtn) transBtn.innerHTML = '<i class="fas fa-language"></i> Tampilkan Terjemahan';

    // Pindah View
    document.getElementById("list-view").style.display = 'none';
    document.getElementById("pagination-container").style.display = 'none'; // Sembunyikan pagination
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
    document.getElementById("pagination-container").style.display = 'flex'; // Munculkan pagination lagi
    
    const exitBtn = document.getElementById("exit-btn");
    const backBtn = document.getElementById("header-back-btn");
    if(exitBtn) exitBtn.classList.remove('d-none');
    if(backBtn) backBtn.classList.add('d-none');
}

// --- FITUR TERJEMAHAN & FURIGANA ---

function toggleTranslation() {
    const transBox = document.getElementById("reader-translation");
    const btn = document.getElementById("toggle-trans-btn");
    if (transBox.style.display === 'none') {
        transBox.style.display = 'block';
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> Tutup Terjemahan';
    } else {
        transBox.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-language"></i> Tampilkan Terjemahan';
    }
}

function toggleFurigana() {
    const textBox = document.getElementById("reader-text");
    const btn = document.getElementById("toggle-furigana-btn");
    
    // Toggle class
    textBox.classList.toggle("hide-furigana");

    // Update Teks & Icon Tombol
    if (textBox.classList.contains("hide-furigana")) {
        // Mode Sembunyi -> Tombol Mata Terbuka (Siap Munculkan)
        btn.innerHTML = '<i class="fas fa-eye"></i> <span>Furigana</span>';
        btn.style.opacity = "0.7"; 
    } else {
        // Mode Tampil -> Tombol Mata Dicoret (Siap Sembunyikan)
        btn.innerHTML = '<i class="fas fa-eye-slash"></i> <span>Furigana</span>';
        btn.style.opacity = "1";
    }
}

// --- LOGIKA AUDIO ---

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

// --- LOGIKA NAVIGASI ---

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