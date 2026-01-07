// --- MODAL PILIHAN VERSI ---
function showVersionChoiceModal(storyObj) {
    tempSelectedId = storyObj.id; 

    const btnShort = document.getElementById("btn-choice-short");
    const badgeShort = document.getElementById("badge-short-missing");
    
    // Setup Tombol Short
    if (storyObj.hasShort) {
        btnShort.style.opacity = "1"; btnShort.style.cursor = "pointer";
        btnShort.style.borderColor = "#0072FF"; btnShort.style.color = "#0072FF";
        btnShort.disabled = false; badgeShort.style.display = 'none';
        btnShort.onclick = () => openStoryVersion('short'); 
    } else {
        btnShort.style.opacity = "0.5"; btnShort.style.cursor = "not-allowed";
        btnShort.style.borderColor = "#ccc"; btnShort.style.color = "#999";
        btnShort.disabled = true; badgeShort.style.display = 'inline-block';
        btnShort.onclick = null;
    }

    // Setup Tombol Long
    const btnLong = document.getElementById("btn-choice-long");
    const badgeLong = document.getElementById("badge-long-missing");

    if (storyObj.hasLong) {
        btnLong.style.opacity = "1"; btnLong.style.cursor = "pointer";
        btnLong.style.background = "linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)";
        btnLong.disabled = false; badgeLong.style.display = 'none';
        btnLong.onclick = () => openStoryVersion('long'); 
    } else {
        btnLong.style.opacity = "0.5"; btnLong.style.cursor = "not-allowed";
        btnLong.style.background = "#e9ecef"; btnLong.style.color = "#999";
        btnLong.style.boxShadow = "none";
        btnLong.disabled = true; badgeLong.style.display = 'inline-block';
        btnLong.onclick = null;
    }

    const myModal = new bootstrap.Modal(document.getElementById('versionChoiceModal'));
    myModal.show();
}

function openStoryVersion(type) {
    const modalEl = document.getElementById('versionChoiceModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if(modalInstance) modalInstance.hide();

    let storyData = (type === 'short') ? shortStoriesMap[tempSelectedId] : longStoriesMap[tempSelectedId];

    if (!storyData) {
        alert("Terjadi kesalahan: Data cerita tidak ditemukan.");
        return;
    }

    currentStoryIndex = combinedStories.findIndex(s => s.id == tempSelectedId);
    renderReaderView(storyData);
}

// --- READER VIEW ---
function renderReaderView(story) {
    stopAudio(); 
    resetControls(); 

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

    const contentContainer = document.getElementById("interlinear-content");
    contentContainer.innerHTML = ""; 

    const jpParagraphs = (story.template || "").split(/\n+/).filter(s => s.trim().length > 0);
    const idParagraphs = (story.translation || "").split(/\n+/).filter(s => s.trim().length > 0);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });

    toggleHeaderButtons(true);
    handleScrollTopButton();
}

function goBack() {
    stopAudio();
    document.getElementById("reader-view").style.display = 'none';
    document.getElementById("list-view").style.display = 'block';
    toggleHeaderButtons(false);
}

// Helper untuk UI Reader
function toggleHeaderButtons(isReading) {
    const exitBtn = document.getElementById("exit-btn");
    const backBtn = document.getElementById("header-back-btn");
    const scrollBtn = document.getElementById("btn-scroll-top");

    if (isReading) {
        if(exitBtn) exitBtn.classList.add('d-none');
        if(backBtn) backBtn.classList.remove('d-none');
    } else {
        if(exitBtn) exitBtn.classList.remove('d-none');
        if(backBtn) backBtn.classList.add('d-none');
        if(scrollBtn) {
            scrollBtn.style.width = "0px";
            scrollBtn.style.marginLeft = "-15px";
            scrollBtn.style.opacity = "0";
        }
    }
}

function resetControls() {
    const container = document.getElementById("interlinear-content");
    container.classList.remove("show-translation");
    container.classList.remove("hide-furigana");
    setButtonStyle("icon-trans", false);
    setButtonStyle("icon-furigana", false);
    const btnFurigana = document.getElementById("toggle-furigana-btn");
    if(btnFurigana) btnFurigana.querySelector("i").className = "fas fa-eye-slash"; 
}

// --- FUNGSI SCROLL PINTAR (FINAL FIX) ---
function toggleTranslation() {
    const container = document.getElementById("interlinear-content");
    
    // 1. KUNCI TARGET DULU SEBELUM LAYOUT BERUBAH
    // Cari blok mana yang "Paling Banyak Terlihat" (Dominan) di layar saat ini.
    const blocks = document.querySelectorAll('.sentence-block');
    let targetBlock = null;
    let maxVisibleHeight = 0;
    const viewHeight = window.innerHeight;

    blocks.forEach(block => {
        const rect = block.getBoundingClientRect();
        
        // Hitung berapa pixel tinggi blok ini yang nampil di layar
        const visibleTop = Math.max(0, rect.top);
        const visibleBottom = Math.min(viewHeight, rect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);

        // Siapa yang paling banyak tampil, dialah yang kita kunci
        if (visibleHeight > maxVisibleHeight) {
            maxVisibleHeight = visibleHeight;
            targetBlock = block;
        }
    });

    // 2. BARU UBAH TAMPILAN (Expand/Collapse)
    container.classList.toggle("show-translation");
    const isActive = container.classList.contains("show-translation");
    setButtonStyle("icon-trans", isActive);

    // 3. JIKA ADA TARGET TADI, KEJAR DIA!
    if (isActive && targetBlock) {
        const transEl = targetBlock.querySelector('.id-translation');
        if (transEl) {
            // Kasih jeda sedikit agar layout selesai render dulu
            setTimeout(() => {
                transEl.scrollIntoView({ behavior: "smooth", block: "center" });
                
                // Efek Highlight
                transEl.style.transition = "background-color 0.5s";
                transEl.style.backgroundColor = "#fffde7"; // Kuning lembut
                setTimeout(() => { transEl.style.backgroundColor = "#f4f9ff"; }, 800);
            }, 100); 
        }
    }
}

function toggleFurigana() {
    const container = document.getElementById("interlinear-content");
    const btn = document.getElementById("toggle-furigana-btn");
    container.classList.toggle("hide-furigana");
    const isHidden = container.classList.contains("hide-furigana");
    setButtonStyle("icon-furigana", isHidden, 'purple');
    btn.querySelector("i").className = isHidden ? "fas fa-eye" : "fas fa-eye-slash"; 
}

function prevStory() {
    if (currentStoryIndex > 0) showVersionChoiceModal(combinedStories[currentStoryIndex - 1]);
}

function nextStory() {
    if (currentStoryIndex < combinedStories.length - 1) showVersionChoiceModal(combinedStories[currentStoryIndex + 1]);
}