let storiesData = [];      
let shortStories = [];     
let longStories = [];
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

    // Filter Button (Modal)
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

    // Listener Scroll
    window.addEventListener("scroll", handleScrollTopButton);
    // Panggil sekali untuk inisialisasi
    handleScrollTopButton();
});

// --- FITUR: SCROLL BUTTON ANIMATION (RAPAT & SMOOTH) ---
function handleScrollTopButton() {
    const btn = document.getElementById("btn-scroll-top");
    if (!btn) return;

    // Muncul jika scroll > 300px
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
        btn.style.marginLeft = "-15px"; // Tarik agar gap hilang
        btn.style.pointerEvents = "none";
    }
}

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
        shortStories = dataSingkat; 
        longStories = dataPanjang;
        filteredStories = shortStories;
        
        setupCategories();
        renderStories(); 
        
        if (spinner) spinner.style.display = 'none';
    }).catch(err => {
        console.error(err);
        if (spinner) spinner.innerHTML = `<div class="alert alert-danger">Gagal memuat data JSON.</div>`;
    });
}

// --- LOGIKA KATEGORI ---
function setupCategories() {
    const container = document.getElementById("modal-category-list");
    if(!container) return;
    container.innerHTML = "";

    const categories = new Set();
    shortStories.forEach(story => {
        if(story.category) categories.add(story.category);
        else categories.add("Lainnya");
    });

    const categoryList = ["Semua", ...Array.from(categories)];

    categoryList.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = `cat-modal-btn ${cat === currentCategory ? 'active' : ''}`;
        
        const checkIcon = cat === currentCategory ? '<i class="fas fa-check"></i>' : '';
        btn.innerHTML = `<span>${cat}</span> ${checkIcon}`;
        
        btn.addEventListener("click", () => {
            currentCategory = cat;
            currentPage = 1;

            if (cat === "Semua") {
                filteredStories = shortStories;
            } else {
                filteredStories = shortStories.filter(story => 
                    (story.category || "Lainnya") === cat
                );
            }

            const mainBtnText = document.querySelector("#btn-filter-category span");
            if(mainBtnText) mainBtnText.innerText = `Kategori: ${cat}`;

            setupCategories(); 
            renderStories();

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

// --- LOGIKA READER ---

function showVersionModal(id) {
    tempSelectedId = id; 
    const myModal = new bootstrap.Modal(document.getElementById('versionModal'));
    myModal.show();
}

function selectVersion(type) {
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
    
    // Reset Scroll
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const exitBtn = document.getElementById("exit-btn");
    const backBtn = document.getElementById("header-back-btn");
    if(exitBtn) exitBtn.classList.add('d-none');
    if(backBtn) backBtn.classList.remove('d-none');

    // Cek tombol scroll
    handleScrollTopButton();
}

function goBack() {
    stopAudio();
    document.getElementById("reader-view").style.display = 'none';
    document.getElementById("list-view").style.display = 'block';
    
    // Reset tombol scroll
    const scrollBtn = document.getElementById("btn-scroll-top");
    if(scrollBtn) {
        scrollBtn.style.width = "0px";
        scrollBtn.style.marginLeft = "-15px";
        scrollBtn.style.opacity = "0";
    }
    
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
    const btn = document.getElementById("toggle-trans-btn");

    // Cari blok aktif
    let targetBlock = null;
    const blocks = document.querySelectorAll('.sentence-block');
    for (const block of blocks) {
        const rect = block.getBoundingClientRect();
        if (rect.top >= -50 && rect.top < window.innerHeight / 2) {
            targetBlock = block;
            break; 
        }
    }
    if (!targetBlock && blocks.length > 0) {
         for (const block of blocks) {
            if (block.getBoundingClientRect().bottom > 0) {
                targetBlock = block;
                break;
            }
         }
    }

    // Toggle
    container.classList.toggle("show-translation");
    const isActive = container.classList.contains("show-translation");
    setButtonStyle("icon-trans", isActive);

    // Scroll Pintar
    if (targetBlock) {
        if (isActive) {
            setTimeout(() => {
                const transEl = targetBlock.querySelector('.id-translation');
                if (transEl) transEl.scrollIntoView({behavior: "smooth", block: "center"});
            }, 100);
        } else {
            setTimeout(() => {
                const jpEl = targetBlock.querySelector('.jp-sentence');
                if (jpEl) jpEl.scrollIntoView({behavior: "smooth", block: "center"});
            }, 50);
        }
    }
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
    if (currentStoryIndex > 0) openStory(storiesData[currentStoryIndex - 1].id);
}

function nextStory() {
    if (currentStoryIndex < storiesData.length - 1) openStory(storiesData[currentStoryIndex + 1].id);
}