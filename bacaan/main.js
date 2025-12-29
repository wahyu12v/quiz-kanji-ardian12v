let storiesData = [];

document.addEventListener("DOMContentLoaded", () => {
    // Navigasi Awal: Tampilkan Exit, Sembunyikan Back
    document.getElementById("exit-btn").classList.remove('d-none');
    document.getElementById("header-back-btn").classList.add('d-none');

    fetchStories();
    
    // Listeners
    document.getElementById("header-back-btn").addEventListener("click", goBack);
    document.getElementById("toggle-trans-btn").addEventListener("click", toggleTranslation);
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
        
        // RENDER KARTU DENGAN IKON & BACKGROUND GRADASI
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

// --- LOGIKA NAVIGASI ---

function openStory(id) {
    const story = storiesData.find(s => s.id === id);
    if (!story) return;

    // --- SETUP HEADER READER (IKON) ---
    const readerImg = document.getElementById("reader-img");
    readerImg.style.display = 'none'; // Sembunyikan elemen gambar asli

    // Cek apakah wrapper ikon sudah ada, jika belum buat baru
    let iconWrapper = document.getElementById("reader-icon-wrapper");
    if (!iconWrapper) {
        iconWrapper = document.createElement("div");
        iconWrapper.id = "reader-icon-wrapper";
        iconWrapper.className = "reader-hero-icon";
        // Masukkan sebelum elemen gambar
        readerImg.parentNode.insertBefore(iconWrapper, readerImg);
    }
    
    // Update Tampilan Ikon Reader
    iconWrapper.style.background = story.color;
    iconWrapper.innerHTML = `<i class="${story.icon}"></i>`;
    iconWrapper.style.display = 'flex';
    // ----------------------------------

    document.getElementById("reader-title").innerText = story.title;
    document.getElementById("reader-text").innerHTML = parseTemplate(story.template);
    document.getElementById("reader-translation").innerText = story.translation;
    
    // Reset State
    document.getElementById("reader-translation").style.display = 'none';
    document.getElementById("toggle-trans-btn").innerHTML = '<i class="fas fa-language me-2"></i> Tampilkan Terjemahan';

    // Switch View
    document.getElementById("list-view").style.display = 'none';
    document.getElementById("reader-view").style.display = 'block';
    
    // Switch Tombol Navigasi
    document.getElementById("exit-btn").classList.add('d-none');
    document.getElementById("header-back-btn").classList.remove('d-none');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
    document.getElementById("reader-view").style.display = 'none';
    document.getElementById("list-view").style.display = 'block';
    
    // Switch Tombol Navigasi
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