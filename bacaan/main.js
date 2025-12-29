let storiesData = [];
let currentStoryIndex = 0;
let activeUtterance = null; // Variabel Global (Wajib untuk PC)

document.addEventListener("DOMContentLoaded", () => {
    // 1. Tampilan Awal
    const exitBtn = document.getElementById("exit-btn");
    const headerBackBtn = document.getElementById("header-back-btn");
    if (exitBtn) exitBtn.classList.remove('d-none');
    if (headerBackBtn) headerBackBtn.classList.add('d-none');

    // 2. Fetch Data
    fetchStories();

    // 3. TRIK PC: Pancing muat suara di background (Sejak awal buka web)
    // Kita tidak menunggu di tombol, tapi memuatnya sekarang.
    if ('speechSynthesis' in window) {
        window.speechSynthesis.getVoices();
        // Chrome PC butuh trigger ini agar list suara terisi
        window.speechSynthesis.onvoiceschanged = () => {
            console.log("Daftar suara berhasil dimuat di background.");
        };
    }
    
    // 4. Listeners Tombol
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

// --- FUNGSI FETCH & RENDER ---

function fetchStories() {
    const spinner = document.getElementById("loading-spinner");
    fetch('bacaanlengkap.json')
        .then(res => {
            if (!res.ok) throw new Error("Gagal mengambil data.");
            return res.json();
        })
        .then(data => {
            storiesData = data;
            renderStories(data);
            if (spinner) spinner.style.display = 'none';
        })
        .catch(err => {
            console.error(err);
            if (spinner) spinner.innerHTML = `<div class="alert alert-danger">Gagal memuat data.</div>`;
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

// --- LOGIKA AUDIO (MOBILE FRIENDLY) ---

function playAudio() {
    const story = storiesData[currentStoryIndex];
    if (!story) return;

    // 1. Matikan audio sebelumnya
    stopAudio();

    // 2. Bersihkan teks
    const cleanText = story.template.replace(/\[\[(.*?)\|.*?\]\]/g, "$1");

    if (!('speechSynthesis' in window)) {
        alert("Browser tidak mendukung suara.");
        return;
    }

    // 3. BUAT OBJEK SUARA LANGSUNG (Jangan pakai await/setTimeout di sini!)
    // HP akan memblokir jika ada delay.
    activeUtterance = new SpeechSynthesisUtterance(cleanText);
    
    // 4. Setting Bahasa (Kunci agar HP otomatis pilih suara Jepang)
    activeUtterance.lang = 'ja-JP'; 
    activeUtterance.rate = 0.9;

    // 5. Cek Suara (Opsional untuk PC)
    // Kita ambil suara yang SUDAH ada saja. Jangan menunggu.
    const voices = window.speechSynthesis.getVoices();
    const japanVoice = voices.find(v => v.lang === 'ja-JP' || v.name.includes('Japan'));
    
    // Jika ketemu suara spesifik (biasanya di PC), pakai itu.
    // Jika tidak (biasanya di HP), biarkan default tapi 'lang' sudah diset Jepang.
    if (japanVoice) {
        activeUtterance.voice = japanVoice;
    }

    // 6. EKSEKUSI
    window.speechSynthesis.speak(activeUtterance);

    // Fix Bug iOS/Android kadang perlu 'resume' jika macet
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

function openStory(id) {
    currentStoryIndex = storiesData.findIndex(s => s.id === id);
    const story = storiesData[currentStoryIndex];
    if (!story) return;

    stopAudio(); 

    updateNavButtons();
    
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