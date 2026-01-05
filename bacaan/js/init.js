// js/init.js

// Kita bungkus dalam fungsi bernama 'mulaiAplikasi'
function mulaiAplikasi() {
    console.log("Aplikasi dimulai...");

    // 1. Setup UI Awal
    if (typeof toggleHeaderButtons === "function") {
        toggleHeaderButtons(false);
    }

    // 2. Fetch Data
    if (typeof fetchAllData === "function") {
        fetchAllData();
    }

    // 3. Init Audio Support
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
    }
    
    // --- CONNECT ALL BUTTONS ---
    const btnBack = document.getElementById("header-back-btn");
    if (btnBack) btnBack.addEventListener("click", goBack);

    const btnPrev = document.getElementById("btn-prev");
    if (btnPrev) btnPrev.addEventListener("click", prevStory);

    const btnNext = document.getElementById("btn-next");
    if (btnNext) btnNext.addEventListener("click", nextStory);

    const btnFilter = document.getElementById("btn-filter-category");
    if (btnFilter) {
        btnFilter.addEventListener("click", () => {
            // Pastikan bootstrap sudah ada
            if (typeof bootstrap !== 'undefined') {
                const catModal = new bootstrap.Modal(document.getElementById('categoryModal'));
                catModal.show();
            } else {
                console.error("Bootstrap belum dimuat!");
            }
        });
    }

    const searchInput = document.getElementById("input-cari");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearchQuery = e.target.value.toLowerCase();
            applyFilters(); 
        });
    }

    const btnAudio = document.getElementById("btn-audio");
    if (btnAudio) btnAudio.addEventListener("click", playAudio);

    const btnStop = document.getElementById("btn-stop");
    if (btnStop) btnStop.addEventListener("click", stopAudio);

    const btnTrans = document.getElementById("toggle-trans-btn");
    if (btnTrans) btnTrans.addEventListener("click", toggleTranslation);
    
    const btnFurigana = document.getElementById("toggle-furigana-btn");
    if (btnFurigana) btnFurigana.addEventListener("click", toggleFurigana);

    window.addEventListener("scroll", handleScrollTopButton);
    
    // Listener Modal
    const btnShort = document.getElementById("btn-choice-short");
    if (btnShort) btnShort.addEventListener("click", () => openStoryVersion('short'));

    const btnLong = document.getElementById("btn-choice-long");
    if (btnLong) btnLong.addEventListener("click", () => openStoryVersion('long'));
}