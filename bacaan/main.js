let storiesData = [];

document.addEventListener("DOMContentLoaded", () => {
    // Pastikan state awal: Tombol Exit MUNCUL, Tombol Back-to-List SEMBUNYI
    document.getElementById("exit-btn").classList.remove('d-none');
    document.getElementById("header-back-btn").classList.add('d-none');

    fetchStories();
    
    // Event listener
    document.getElementById("header-back-btn").addEventListener("click", goBack);
    document.getElementById("toggle-trans-btn").addEventListener("click", toggleTranslation);
});

// --- FUNGSI UTAMA ---

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
        
        col.innerHTML = `
            <div class="story-card w-100">
                <div class="card-img-wrapper skeleton">
                    <img src="${story.image}" class="card-img-top" alt="${story.title}" loading="lazy" onload="this.parentElement.classList.remove('skeleton')">
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

// --- INTERAKSI ---

function openStory(id) {
    const story = storiesData.find(s => s.id === id);
    if (!story) return;

    const readerImg = document.getElementById("reader-img");
    readerImg.parentElement.classList.add('skeleton');
    readerImg.src = story.image;
    readerImg.onload = function() { this.parentElement.classList.remove('skeleton'); };

    document.getElementById("reader-title").innerText = story.title;
    document.getElementById("reader-text").innerHTML = parseTemplate(story.template);
    document.getElementById("reader-translation").innerText = story.translation;
    
    // Reset View
    document.getElementById("reader-translation").style.display = 'none';
    document.getElementById("toggle-trans-btn").innerHTML = '<i class="fas fa-language me-2"></i> Tampilkan Terjemahan';

    // Pindah Tampilan ke Reader
    document.getElementById("list-view").style.display = 'none';
    document.getElementById("reader-view").style.display = 'block';
    
    // LOGIKA TOMBOL: Sembunyikan "Exit", Tampilkan "Back to List"
    document.getElementById("exit-btn").classList.add('d-none');
    document.getElementById("header-back-btn").classList.remove('d-none');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goBack() {
    // Pindah Tampilan ke List
    document.getElementById("reader-view").style.display = 'none';
    document.getElementById("list-view").style.display = 'block';
    
    // LOGIKA TOMBOL: Tampilkan "Exit", Sembunyikan "Back to List"
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