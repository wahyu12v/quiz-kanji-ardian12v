let storiesData = [];      
let shortStories = [];     
let longStories = [];
// Variable Filtering
let filteredStories = [];       
let currentCategory = 'Semua';

let currentStoryIndex = 0;
let activeUtterance = null; 
let tempSelectedId = null;  

const itemsPerPage = 6; 
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
    // 1. Setup UI
    const exitBtn = document.getElementById("exit-btn");
    const headerBackBtn = document.getElementById("header-back-btn");
    if (exitBtn) exitBtn.classList.remove('d-none');
    if (headerBackBtn) headerBackBtn.classList.add('d-none');

    // 2. Fetch Data
    fetchAllData();

    // 3. Init Audio
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => console.log("Voices loaded");
    }
    
    // --- LISTENERS ---
    const btnPilihSingkat = document.getElementById("btn-pilih-singkat");
    if(btnPilihSingkat) btnPilihSingkat.addEventListener("click", () => selectVersion('short'));

    const btnPilihPanjang = document.getElementById("btn-pilih-panjang");
    if(btnPilihPanjang) btnPilihPanjang.addEventListener("click", () => selectVersion('long'));

    const btnBack = document.getElementById("header-back-btn");
    if (btnBack) btnBack.addEventListener("click", goBack);

    const btnPrev = document.getElementById("btn-prev");
    if (btnPrev) btnPrev.addEventListener("click", prevStory);

    const btnNext = document.getElementById("btn-next");
    if (btnNext) btnNext.addEventListener("click", nextStory);

    // Filter Button (Memicu Modal)
    const btnFilter = document.getElementById("btn-filter-category");
    if (btnFilter) {
        btnFilter.addEventListener("click", () => {
            const catModal = new bootstrap.Modal(document.getElementById('categoryModal'));
            catModal.show();
        });
    }

    // Dock Buttons
    const btnAudio = document.getElementById("btn-audio");
    if (btnAudio) btnAudio.addEventListener("click", playAudio);

    const btnStop = document.getElementById("btn-stop");
    if (btnStop) btnStop.addEventListener("click", stopAudio);

    const btnTrans = document.getElementById("toggle-trans-btn");
    if (btnTrans) btnTrans.addEventListener("click", toggleTranslation);
    
    const btnFurigana = document.getElementById("toggle-furigana-btn");
    if (btnFurigana) btnFurigana.addEventListener("click", toggleFurigana);
});

// --- HELPER STYLE ---
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

// --- FETCH DATA ---
function fetchAllData() {
    const spinner = document.getElementById("loading-spinner");
    Promise.all([
        fetch('data.json').then(res => res.json()),           
        fetch('bacaanlengkap.json').then(res => res.json())   
    ]).then(([dataSingkat, dataPanjang]) => {
        // Data sesuai urutan asli JSON
        shortStories = dataSingkat; 
        longStories = dataPanjang;
        
        // Inisialisasi Filter
        filteredStories = shortStories;
        
        // Setup Kategori (Dalam Modal) & Render
        setupCategories();
        renderStories(); 
        
        if (spinner) spinner.style.display = 'none';
    }).catch(err => {
        console.error(err);
        if (spinner) spinner.innerHTML = `<div class="alert alert-danger">Gagal memuat data JSON.</div>`;
    });
}

// --- LOGIKA KATEGORI (MODAL VERSION) ---
function setupCategories() {
    const container = document.getElementById("modal-category-list");
    if(!container) return;
    container.innerHTML = "";

    // 1. Ambil kategori unik
    const categories = new Set();
    shortStories.forEach(story => {
        if(story.category) categories.add(story.category);
        else categories.add("Lainnya");
    });

    // 2. Buat List + 'Semua'
    const categoryList = ["Semua", ...Array.from(categories)];

    // 3. Render Tombol ke dalam MODAL
    categoryList.forEach(cat => {
        const btn = document.createElement("button");
        // Cek apakah ini kategori yang sedang aktif
        btn.className = `cat-modal-btn ${cat === currentCategory ? 'active' : ''}`;
        
        // Tambahkan Ikon Check jika aktif (opsional, biar keren)
        const checkIcon = cat === currentCategory ? '<i class="fas fa-check"></i>' : '';
        btn.innerHTML = `<span>${cat}</span> ${checkIcon}`;
        
        btn.addEventListener("click", () => {
            // 1. Set Kategori Aktif
            currentCategory = cat;
            currentPage = 1;

            // 2. Filter Data
            if (cat === "Semua") {
                filteredStories = shortStories;
            } else {
                filteredStories = shortStories.filter(story => 
                    (story.category || "Lainnya") === cat
                );
            }

            // 3. Update Tombol Pemicu Utama (Teksnya diganti)
            const mainBtnText = document.querySelector("#btn-filter-category span");
            if(mainBtnText) mainBtnText.innerText = `Kategori: ${cat}`;

            // 4. Render Ulang Modal (biar status active/check icon pindah)
            setupCategories(); 

            // 5. Render Ulang Cerita
            renderStories();

            // 6. Tutup Modal Otomatis
            const modalEl = document.getElementById('categoryModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if(modalInstance) modalInstance.hide();
        });

        container.appendChild(btn);
    });
}

// --- RENDER STORIES ---
function renderStories() {
    const gridContainer = document.getElementById("story-grid");
    const paginationContainer = document.getElementById("pagination-container");
    if (!gridContainer) return;
    gridContainer.innerHTML = "";
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredStories.slice(start, end);
    
    // Animasi Fade
    gridContainer.style.opacity = '0';
    setTimeout(() => { gridContainer.style.opacity = '1'; }, 50);

    if (paginatedItems.length === 0) {
        gridContainer.innerHTML = `<div class="col-12 text-center text-muted py-5">Tidak ada cerita di kategori ini.</div>`;
        paginationContainer.innerHTML = "";
        return;
    }

    paginatedItems.forEach(story => {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4 d-flex align-items-stretch";
        col.style.transition = "all 0.3s ease";
        
        col.innerHTML = `
            <div class="story-card w-100">
                <div class="card-icon-wrapper" style="background: ${story.color}">
                    <i class="${story.icon}"></i>
                </div>
                <div class="card-body-custom text-center">
                    <h5 class="story-title">${story.title}</h5>
                    <span class="badge rounded-pill bg-light text-dark mt-2" style="font-weight:normal; font-size:0.7rem; border:1px solid #eee;">
                        ${story.category || 'Lainnya'}
                    </span>
                </div>
            </div>`;
        col.querySelector('.story-card').addEventListener('click', () => showVersionModal(story.id));
        gridContainer.appendChild(col);
    });

    setupPagination(filteredStories.length, paginationContainer);
}

function setupPagination(totalItems, container) {
    if(!container) return;
    container.innerHTML = "";
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const prevBtn = document.createElement("button");
    prevBtn.className = "page-nav-btn";
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderStories(); window.scrollTo({ top: 0, behavior: 'smooth' }); }};
    container.appendChild(prevBtn);

    const pageInfo = document.createElement("span");
    pageInfo.className = "fw-bold text-muted mx-2";
    pageInfo.style.fontSize = "0.9rem";
    pageInfo.innerText = `Hal ${currentPage} / ${totalPages}`;
    container.appendChild(pageInfo);

    const nextBtn = document.createElement("button");
    nextBtn.className = "page-nav-btn";
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; renderStories(); window.scrollTo({ top: 0, behavior: 'smooth' }); }};
    container.appendChild(nextBtn);
}

// --- LOGIKA READER (MODE BLOK PARAGRAF + ENTER) ---

function showVersionModal(id) {
    tempSelectedId = id; 
    const myModal = new bootstrap.Modal(document.getElementById('versionModal'));
    myModal.show();
}

function selectVersion(type) {
    // Ambil data lengkap (shortStories/longStories) agar tidak terpengaruh filter
    if (type === 'short') {
        storiesData = shortStories;
    } else {
        storiesData = longStories;
    }
    openStory(tempSelectedId);
}

function parseRuby(text) {
    if (!text) return "";
    return text.replace(/\[\[(.*?)\|(.*?)\]\]/g, (match, kanji, furigana) => {
        return `<ruby>${kanji}<rt>${furigana}</rt></ruby>`;
    });
}

function openStory(id) {
    currentStoryIndex = storiesData.findIndex(s => s.id === id);
    const story = storiesData[currentStoryIndex];
    if (!story) return;

    stopAudio(); 
    resetControls(); 

    // Header Setup
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

    // === RENDER BLOK PARAGRAF ===
    const contentContainer = document.getElementById("interlinear-content");
    contentContainer.innerHTML = ""; 

    const jpParagraphs = story.template.split(/\n+/).filter(s => s.trim().length > 0);
    const idParagraphs = story.translation.split(/\n+/).filter(s => s.trim().length > 0);
    const maxCount = Math.max(jpParagraphs.length, idParagraphs.length);

    for (let i = 0; i < maxCount; i++) {
        let jpText = jpParagraphs[i] || "";
        let idText = idParagraphs[i] || "";

        if (jpText || idText) {
            const block = document.createElement("div");
            block.className = "sentence-block"; 
            block.style.marginBottom = "30px"; 

            block.innerHTML = `
                <div class="jp-sentence" style="text-align: justify;">${parseRuby(jpText)}</div>
                <div class="id-translation" style="text-align: justify; margin-top: 10px;">${idText}</div>
            `;
            contentContainer.appendChild(block);
        }
    }

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

// --- CONTROLS ---
function resetControls() {
    const container = document.getElementById("interlinear-content");
    container.classList.remove("show-translation");
    container.classList.remove("hide-furigana");
    setButtonStyle("icon-trans", false);
    setButtonStyle("icon-furigana", false);
    const btnFurigana = document.getElementById("toggle-furigana-btn");
    btnFurigana.querySelector("i").className = "fas fa-eye-slash"; 
}

function toggleTranslation() {
    const container = document.getElementById("interlinear-content");
    container.classList.toggle("show-translation");
    setButtonStyle("icon-trans", container.classList.contains("show-translation"));
}

function toggleFurigana() {
    const container = document.getElementById("interlinear-content");
    const btn = document.getElementById("toggle-furigana-btn");
    const icon = btn.querySelector("i");
    
    container.classList.toggle("hide-furigana");
    if(container.classList.contains("hide-furigana")) {
        setButtonStyle("icon-furigana", true, 'purple');
        icon.className = "fas fa-eye"; 
    } else {
        setButtonStyle("icon-furigana", false);
        icon.className = "fas fa-eye-slash"; 
    }
}

// --- AUDIO ---
function playAudio() {
    const story = storiesData[currentStoryIndex];
    if (!story) return;
    stopAudio();
    
    let cleanText = story.template.replace(/\[\[(.*?)\|.*?\]\]/g, "$1");
    cleanText = cleanText.replace(/\n/g, " ");

    if (!('speechSynthesis' in window)) {
        alert("Browser tidak mendukung suara.");
        return;
    }

    activeUtterance = new SpeechSynthesisUtterance(cleanText);
    activeUtterance.lang = 'ja-JP'; 
    activeUtterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const japanVoice = voices.find(v => v.lang === 'ja-JP' || v.name.includes('Japan'));
    if (japanVoice) activeUtterance.voice = japanVoice;

    setButtonStyle("icon-audio", true); 
    const btnAudio = document.getElementById("btn-audio");
    btnAudio.querySelector("i").className = "fas fa-volume-up";

    activeUtterance.onend = () => {
        setButtonStyle("icon-audio", false); 
        btnAudio.querySelector("i").className = "fas fa-play";
    };

    window.speechSynthesis.speak(activeUtterance);
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
}

function stopAudio() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setButtonStyle("icon-audio", false);
    document.getElementById("btn-audio").querySelector("i").className = "fas fa-play";
    
    const iconStop = document.getElementById("icon-stop");
    if(iconStop) {
        iconStop.style.transform = "scale(0.9)";
        setTimeout(() => iconStop.style.transform = "scale(1)", 150);
    }
}

// --- NAVIGASI CERITA ---
function prevStory() {
    // Navigasi menggunakan array storiesData (sumber lengkap)
    // agar saat baca, user bisa next ke cerita lain walau beda kategori
    if (currentStoryIndex > 0) openStory(storiesData[currentStoryIndex - 1].id);
}

function nextStory() {
    if (currentStoryIndex < storiesData.length - 1) openStory(storiesData[currentStoryIndex + 1].id);
}