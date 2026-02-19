// --- MODAL PILIHAN VERSI ---
function showVersionChoiceModal(storyObj) {
    tempSelectedId = storyObj.id;

    const btnShort  = document.getElementById("btn-choice-short");
    const badgeShort = document.getElementById("badge-short-missing");

    if (storyObj.hasShort) {
        btnShort.disabled               = false;
        btnShort.style.opacity          = "1";
        btnShort.style.cursor           = "pointer";
        badgeShort.style.display        = 'none';
        btnShort.onclick                = () => openStoryVersion('short');
    } else {
        btnShort.disabled               = true;
        btnShort.style.opacity          = "0.5";
        btnShort.style.cursor           = "not-allowed";
        badgeShort.style.display        = 'inline-block';
        btnShort.onclick                = null;
    }

    const btnLong  = document.getElementById("btn-choice-long");
    const badgeLong = document.getElementById("badge-long-missing");

    if (storyObj.hasLong) {
        btnLong.disabled                = false;
        btnLong.style.opacity           = "1";
        btnLong.style.cursor            = "pointer";
        badgeLong.style.display         = 'none';
        btnLong.onclick                 = () => openStoryVersion('long');
    } else {
        btnLong.disabled                = true;
        btnLong.style.opacity           = "0.5";
        btnLong.style.cursor            = "not-allowed";
        badgeLong.style.display         = 'inline-block';
        btnLong.onclick                 = null;
    }

    const myModal = new bootstrap.Modal(document.getElementById('versionChoiceModal'));
    myModal.show();
}

function openStoryVersion(type) {
    const modalEl = document.getElementById('versionChoiceModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();

    const storyData = (type === 'short') ? shortStoriesMap[tempSelectedId] : longStoriesMap[tempSelectedId];
    if (!storyData) { alert("Data cerita tidak ditemukan."); return; }

    currentStoryIndex = combinedStories.findIndex(s => s.id == tempSelectedId);
    renderReaderView(storyData);
}

// --- READER VIEW ---
function renderReaderView(story) {
    stopAudio();
    resetControls();

    // Setup hero icon
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
        // Warna dari data JSON tetap dipakai untuk background icon saja
        iconWrapper.style.background = story.color
            ? `linear-gradient(135deg, ${story.color}22 0%, var(--teal-dim) 100%)`
            : 'var(--teal-dim)';
        iconWrapper.innerHTML = `<i class="${story.icon}"></i>`;
        iconWrapper.style.display = 'flex';
    }

    // Judul
    document.getElementById("reader-title").innerText = story.title;

    // Konten interlinear
    const contentContainer = document.getElementById("interlinear-content");
    contentContainer.innerHTML = "";

    const jpParagraphs = (story.template || "").split(/\n+/).filter(s => s.trim().length > 0);
    const idParagraphs = (story.translation || "").split(/\n+/).filter(s => s.trim().length > 0);
    const maxCount = Math.max(jpParagraphs.length, idParagraphs.length);

    for (let i = 0; i < maxCount; i++) {
        const jpText = jpParagraphs[i] || "";
        const idText = idParagraphs[i] || "";

        if (jpText || idText) {
            const block = document.createElement("div");
            block.className = "sentence-block";
            block.innerHTML = `
                <div class="jp-sentence">${parseRuby(jpText)}</div>
                <div class="id-translation">${idText}</div>
            `;
            contentContainer.appendChild(block);
        }
    }

    // Switch view
    document.getElementById("list-view").style.display   = 'none';
    document.getElementById("reader-view").style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });

    toggleHeaderButtons(true);
    handleScrollTopButton();
}

function goBack() {
    stopAudio();
    document.getElementById("reader-view").style.display = 'none';
    document.getElementById("list-view").style.display   = 'block';
    toggleHeaderButtons(false);
}

// --- HELPER UI ---
function toggleHeaderButtons(isReading) {
    const exitBtn  = document.getElementById("exit-btn");
    const backBtn  = document.getElementById("header-back-btn");

    if (isReading) {
        if (exitBtn)  exitBtn.classList.add('d-none');
        if (backBtn)  backBtn.classList.remove('d-none');
    } else {
        if (exitBtn)  exitBtn.classList.remove('d-none');
        if (backBtn)  backBtn.classList.add('d-none');
        // btn-scroll-top selalu tampil, dikontrol CSS
    }
}

function resetControls() {
    const container = document.getElementById("interlinear-content");
    container.classList.remove("show-translation");
    container.classList.remove("hide-furigana");
    setButtonStyle("icon-trans", false);
    setButtonStyle("icon-furigana", false);

    const btnFurigana = document.getElementById("toggle-furigana-btn");
    if (btnFurigana) {
        const ico = btnFurigana.querySelector("i");
        if (ico) ico.className = "bi bi-eye-slash-fill";
    }
}

// --- TOGGLE TERJEMAHAN (SCROLL SMART) ---
function toggleTranslation() {
    const container = document.getElementById("interlinear-content");

    // Cari blok paling terlihat
    const blocks = document.querySelectorAll('.sentence-block');
    let targetBlock = null;
    let maxVisibleHeight = 0;
    const viewHeight = window.innerHeight;

    blocks.forEach(block => {
        const rect = block.getBoundingClientRect();
        const visibleHeight = Math.max(0, Math.min(viewHeight, rect.bottom) - Math.max(0, rect.top));
        if (visibleHeight > maxVisibleHeight) {
            maxVisibleHeight = visibleHeight;
            targetBlock = block;
        }
    });

    container.classList.toggle("show-translation");
    const isActive = container.classList.contains("show-translation");
    setButtonStyle("icon-trans", isActive);

    if (isActive && targetBlock) {
        const transEl = targetBlock.querySelector('.id-translation');
        if (transEl) {
            setTimeout(() => {
                transEl.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 100);
        }
    }
}

function toggleFurigana() {
    const container = document.getElementById("interlinear-content");
    const btn = document.getElementById("toggle-furigana-btn");

    container.classList.toggle("hide-furigana");
    const isHidden = container.classList.contains("hide-furigana");

    setButtonStyle("icon-furigana", isHidden);

    if (btn) {
        const ico = btn.querySelector("i");
        if (ico) ico.className = isHidden ? "bi bi-eye-fill" : "bi bi-eye-slash-fill";
    }
}

function prevStory() {
    if (currentStoryIndex > 0) showVersionChoiceModal(combinedStories[currentStoryIndex - 1]);
}

function nextStory() {
    if (currentStoryIndex < combinedStories.length - 1) showVersionChoiceModal(combinedStories[currentStoryIndex + 1]);
}