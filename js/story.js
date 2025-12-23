import { STORIES } from '../data/stories.js';

let allQuestions = []; 
let currentStoryIndex = 0;
let selectedSlot = null; 

export function initStoryMode(questionsData) {
    allQuestions = questionsData;
    renderStoryList();
}

// =========================================
// 1. MENU UTAMA (DAFTAR CERITA)
// =========================================
function renderStoryList() {
    const container = document.getElementById('story-container');
    if (!container) return;

    container.innerHTML = `
        <div class="text-center mb-4">
            <h4 class="fw-bold">Pilih Cerita</h4>
            <p class="text-muted">Pilih topik untuk memulai latihan!</p>
        </div>
        
        <div class="story-list-grid">
            ${STORIES.map((story, index) => `
                <div class="story-card-item" onclick="window.loadStory(${index})">
                    <div class="d-flex justify-content-between align-items-start">
                        <div class="card-icon-wrapper"><i class="bi bi-book-fill"></i></div>
                        <span class="badge bg-light text-info border border-info-subtle rounded-pill" style="font-size: 0.7em">Story #${index + 1}</span>
                    </div>
                    <div>
                        <div class="story-card-title">${story.title}</div>
                        <div class="story-card-desc text-truncate">${story.translation}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// =========================================
// 2. LOAD GAMEPLAY (TAMPILAN SOAL)
// =========================================
window.loadStory = (index) => {
    currentStoryIndex = index;
    const story = STORIES[index];
    const container = document.getElementById('story-container');
    selectedSlot = null;

    // A. Parse Template (Ubah {123} jadi Slot Kosong)
    let htmlContent = story.template.replace(/\{(\d+)\}/g, (match, id) => {
        const kanjiData = allQuestions.find(q => q.No == id);
        if (!kanjiData) return `[Error]`;
        // Slot kosong yang bisa diklik
        return `<span class="story-slot" onclick="handleSlotClick(this)" data-answer="${id}" data-filled="false"></span>`;
    });

    // B. Siapkan Bank Kata
    const idsInStory = story.template.match(/\{(\d+)\}/g).map(s => s.replace(/\{|\}/g, ''));
    let choices = idsInStory.map(id => allQuestions.find(q => q.No == id));
    // Tambahkan index unik agar tombol bisa dilacak
    let choicesWithIndex = choices.map((item, idx) => ({ item, originalIdx: idx }));
    // Acak urutan
    choicesWithIndex.sort(() => Math.random() - 0.5);

    // C. Render UI Gameplay
    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 fw-bold" onclick="window.backToStoryList()">
                <i class="bi bi-arrow-left me-1"></i> Kembali
            </button>
            <span class="badge bg-info bg-gradient px-3 py-2 rounded-pill text-truncate" style="max-width: 200px;">${story.title}</span>
        </div>

        <div class="story-card-container mb-3">
            <div class="story-card-header d-flex align-items-center gap-2">
                <i class="bi bi-pencil-square"></i> <span>Lengkapi Cerita</span>
            </div>
            <div class="story-card-body text-center">
                ${htmlContent}
            </div>
            <div class="story-card-footer text-center bg-white">
                <small class="text-muted fw-medium fst-italic">Isi semua bagian yang kosong.</small>
            </div>
        </div>

        <div id="interaction-area">
            <div class="text-center mb-2">
                <small class="text-muted fw-bold text-uppercase" style="font-size: 0.7rem; letter-spacing: 1px;">Bank Kata</small>
            </div>
            
            <div id="word-bank" class="bank-container">
                ${choicesWithIndex.map((entry, idx) => `
                    <button id="word-btn-${idx}" class="choice-chip" 
                        onclick="fillSlot(this, ${entry.item.No}, '${entry.item.Kanji}', '${entry.item.Hiragana}')">
                        <div class="lead fw-bold mb-0" style="font-size: 1.1rem;">${entry.item.Kanji}</div>
                        <div style="font-size: 0.7rem; color: #64748b;">${entry.item.Hiragana}</div>
                    </button>
                `).join('')}
            </div>
            
            <div class="mt-3 d-grid">
                <button class="btn btn-info text-white fw-bold shadow-sm py-2 rounded-3" onclick="checkStoryCompletion()">
                    Selesai & Cek Jawaban <i class="bi bi-check-circle-fill ms-2"></i>
                </button>
            </div>
        </div>
    `;
}

window.backToStoryList = () => { renderStoryList(); }

// =========================================
// 3. LOGIKA INTERAKSI (DUOLINGO STYLE)
// =========================================

// A. Handle Klik pada Slot
window.handleSlotClick = (element) => {
    // Jika game sudah selesai, slot tidak bisa diklik lagi
    if (document.querySelector('.story-card-container').classList.contains('finished')) return;

    // Bersihkan efek merah/hijau jika user ingin mengoreksi sebelum submit
    element.classList.remove('slot-correct', 'slot-wrong');

    // Jika slot sudah terisi -> Kembalikan kata ke bank
    if (element.dataset.filled === "true") {
        returnWordToBank(element);
        return;
    }

    // Jika slot kosong -> Jadikan aktif (selected)
    document.querySelectorAll('.story-slot').forEach(el => el.classList.remove('active-slot'));
    element.classList.add('active-slot');
    selectedSlot = element;
}

// B. Isi Slot (Pindah dari Bank ke Slot)
window.fillSlot = (btnElement, id, kanji, hiragana) => {
    // Cari slot aktif, atau slot kosong pertama
    if (!selectedSlot) {
        const firstEmpty = document.querySelector('.story-slot[data-filled="false"]');
        if (firstEmpty) selectedSlot = firstEmpty;
        else return; // Tidak ada slot kosong
    }

    // Isi HTML Slot (Flexbox susun atas-bawah)
    selectedSlot.innerHTML = `<div class="tile-furigana">${hiragana}</div><div class="tile-kanji">${kanji}</div>`;
    
    // Simpan Data
    selectedSlot.dataset.userAnswer = id;
    selectedSlot.dataset.filled = "true";
    selectedSlot.dataset.sourceBtnId = btnElement.id; // Simpan ID tombol asal

    // Update Tampilan
    selectedSlot.classList.remove('active-slot');
    selectedSlot.classList.add('filled-slot');

    // Sembunyikan Tombol di Bank (display: none via class .used)
    btnElement.classList.add('used'); 

    // Reset Seleksi
    selectedSlot = null;
    
    // Otomatis pilih slot kosong berikutnya (UX Friendly)
    const nextEmpty = document.querySelector('.story-slot[data-filled="false"]');
    if (nextEmpty) handleSlotClick(nextEmpty);
}

// C. Kembalikan Kata (Pindah dari Slot ke Bank)
window.returnWordToBank = (slotElement) => {
    const btnId = slotElement.dataset.sourceBtnId;
    const btnElement = document.getElementById(btnId);

    // Munculkan kembali tombol di bank
    if (btnElement) {
        btnElement.classList.remove('used');
    }

    // Kosongkan Slot
    slotElement.innerHTML = "";
    slotElement.dataset.filled = "false";
    slotElement.dataset.userAnswer = "";
    slotElement.dataset.sourceBtnId = "";
    
    // Hapus semua class status
    slotElement.classList.remove('filled-slot', 'slot-correct', 'slot-wrong');
    slotElement.style.borderBottom = "";

    // Jadikan slot ini aktif kembali
    handleSlotClick(slotElement);
}

// =========================================
// 4. CEK HASIL & PEMBAHASAN (IN-PAGE)
// =========================================
window.checkStoryCompletion = () => {
    const slots = document.querySelectorAll('.story-slot');
    let emptyCount = 0;
    
    // Cek apakah masih ada yang kosong
    slots.forEach(slot => { if (slot.dataset.filled === "false") emptyCount++; });

    if (emptyCount > 0) {
        alert(`Masih ada ${emptyCount} bagian yang kosong! Lengkapi dulu ya.`);
        return;
    }

    // Kunci Cerita (Disable interaksi)
    document.querySelector('.story-card-container').classList.add('finished');

    let mistakesHTML = "";
    let correctCount = 0;

    // Loop setiap slot untuk validasi
    slots.forEach((slot, index) => {
        const correctId = slot.dataset.answer;
        const userId = slot.dataset.userAnswer;
        
        // Ambil detail kanji untuk ditampilkan di pembahasan
        const correctItem = allQuestions.find(q => q.No == correctId);
        const userItem = allQuestions.find(q => q.No == userId);

        if (correctId == userId) {
            correctCount++;
            slot.classList.add('slot-correct'); // Warna Hijau di cerita
        } else {
            slot.classList.add('slot-wrong'); // Warna Merah di cerita
            
            // Tambahkan Kartu Kesalahan ke Grid
            mistakesHTML += `
                <div class="correction-card">
                    <div class="corr-header">
                        <span class="corr-label">Kesalahan #${index + 1}</span>
                        <i class="bi bi-x-circle-fill text-danger"></i>
                    </div>
                    
                    <div class="mb-3">
                        <small class="text-muted d-block mb-1" style="font-size: 0.75rem;">Jawaban Kamu:</small>
                        <div class="bg-danger bg-opacity-10 text-danger border border-danger rounded px-2 py-1 fw-bold">
                            ${userItem ? userItem.Kanji : '?'}
                        </div>
                    </div>

                    <div>
                        <small class="text-muted d-block mb-1" style="font-size: 0.75rem;">Seharusnya:</small>
                        <div class="d-flex align-items-center gap-2 bg-success bg-opacity-10 text-success border border-success rounded px-2 py-2">
                            <i class="bi bi-check-lg fs-4"></i>
                            <div style="line-height: 1.1;">
                                <div class="fw-bold fs-5">${correctItem.Kanji}</div>
                                <div style="font-size: 0.7rem;">${correctItem.Hiragana}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    // --- RENDER HASIL (MENGGANTIKAN BANK KATA) ---
    const interactionArea = document.getElementById('interaction-area');
    const currentStory = STORIES[currentStoryIndex];
    
    // Header Pesan (Sempurna / Belum)
    let feedbackHeader = "";
    if (correctCount === slots.length) {
        feedbackHeader = `<div class="alert alert-success fw-bold text-center shadow-sm mb-4"><i class="bi bi-trophy-fill me-2"></i>Sempurna! Semua Benar!</div>`;
    } else {
        feedbackHeader = `<div class="alert alert-warning fw-bold text-center text-dark shadow-sm border-warning mb-4"><i class="bi bi-exclamation-triangle-fill me-2"></i>Ada ${slots.length - correctCount} Kesalahan.</div>`;
    }

    // Grid Pembahasan (Hanya muncul jika ada salah)
    const correctionsSection = mistakesHTML 
        ? `<h6 class="fw-bold text-danger mt-4 mb-2"><i class="bi bi-wrench-adjustable me-2"></i>Perbaikan:</h6>
           <div class="correction-list-grid"> ${mistakesHTML} </div>` 
        : '';

    // Ganti isi HTML area bawah
    interactionArea.innerHTML = `
        <div class="result-container bg-light-subtle p-4 rounded-4 border border-info shadow-sm" style="animation: fadeIn 0.5s;">
            ${feedbackHeader}

            <div>
                <h6 class="fw-bold text-info"><i class="bi bi-translate me-2"></i>Arti Cerita:</h6>
                <div class="p-3 bg-white rounded-3 border fst-italic text-secondary shadow-sm">
                    "${currentStory.translation}"
                </div>
            </div>

            ${correctionsSection}

            <div class="d-grid gap-2 mt-5 d-md-flex justify-content-center">
                <button class="btn btn-outline-info fw-bold rounded-pill px-4 py-2" onclick="window.loadStory(${currentStoryIndex})">
                    <i class="bi bi-arrow-counterclockwise me-2"></i> Ulangi
                </button>
                <button class="btn btn-info fw-bold rounded-pill px-4 py-2" onclick="window.backToStoryList()">
                    <i class="bi bi-grid-fill me-2"></i> Pilih Cerita Lain
                </button>
            </div>
        </div>
    `;
    
    // Scroll otomatis ke hasil
    interactionArea.scrollIntoView({ behavior: 'smooth' });
}