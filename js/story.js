import { STORIES } from '../data/stories.js';

let allQuestions = []; 
let currentStoryIndex = 0;
let selectedSlot = null; 

export function initStoryMode(questionsData) {
    allQuestions = questionsData;
    renderStoryList();
}

// 1. MENU UTAMA
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
                        <span class="badge bg-light text-primary border border-primary-subtle rounded-pill" style="font-size: 0.7em">Story #${index + 1}</span>
                    </div>
                    <div>
                        <div class="story-card-title">${story.title}</div>
                        <div class="story-card-desc text-truncate">${story.translation}</div>
                    </div>
                    <div class="story-card-footer-action">
                        <small class="text-muted fw-bold" style="font-size: 0.75rem">Mulai</small>
                        <span class="badge bg-primary rounded-pill px-3"><i class="bi bi-play-fill"></i></span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// 2. LOAD GAMEPLAY
window.loadStory = (index) => {
    currentStoryIndex = index;
    const story = STORIES[index];
    const container = document.getElementById('story-container');
    selectedSlot = null;

    // Logika Partial Blanks
    const allMatches = [...story.template.matchAll(/\{(\d+)\}/g)];
    const totalCandidates = allMatches.length;
    const maxSlots = 7; 
    const countToHide = Math.min(Math.ceil(totalCandidates * 0.6), maxSlots);

    let indicesToHide = new Set();
    while(indicesToHide.size < countToHide && indicesToHide.size < totalCandidates) {
        const r = Math.floor(Math.random() * totalCandidates);
        indicesToHide.add(r);
    }

    let matchCounter = 0;
    let targetIds = []; 
    let htmlContent = story.template.replace(/\{(\d+)\}/g, (match, id) => {
        const kanjiData = allQuestions.find(q => q.No == id);
        if (!kanjiData) return `[Error]`;
        const shouldHide = indicesToHide.has(matchCounter);
        matchCounter++;
        if (shouldHide) {
            targetIds.push(id);
            return `<span class="story-slot" onclick="handleSlotClick(this)" data-answer="${id}" data-filled="false"></span>`;
        } else {
            return `<ruby>${kanjiData.Kanji}<rt>${kanjiData.Hiragana}</rt></ruby>`;
        }
    });

    let choices = targetIds.map(id => allQuestions.find(q => q.No == id));
    let choicesWithIndex = choices.map((item, idx) => ({ item, originalIdx: idx }));
    choicesWithIndex.sort(() => Math.random() - 0.5);

    // Render UI
const imageHTML = story.image ? `
        <div class="story-image-wrapper">
            <img src="${story.image}" alt="${story.title}" loading="lazy" 
                 class="rounded-4 shadow-sm"
                 onload="this.classList.add('loaded'); this.parentElement.style.animation='none'">
        </div>
    ` : '';

    container.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <button class="btn btn-sm btn-outline-secondary rounded-pill px-3 fw-bold" onclick="window.backToStoryList()">
                <i class="bi bi-arrow-left me-1"></i> Kembali
            </button>
            <span class="badge bg-primary bg-gradient px-3 py-2 rounded-pill text-truncate" style="max-width: 300px;">${story.title}</span>
        </div>

        <div class="game-layout-wrapper">
            <div class="game-col-story">
                <div class="story-card-container mb-0 h-auto border-0 shadow-none">
                    <div class="story-card-body text-center pt-0">
                        ${imageHTML}
                        <div class="mt-3 text-start px-2" style="font-size: 1.35rem; line-height: 2.3;">
                            ${htmlContent}
                        </div>
                    </div>
                </div>
            </div>

            <div class="game-col-interaction" id="interaction-area">
                <div class="text-center mb-3">
                    <h6 class="fw-bold text-uppercase text-primary ls-1" style="font-size: 0.8rem; letter-spacing: 1px;">
                        <i class="bi bi-grid-3x3-gap-fill me-2"></i>Bank Kata
                    </h6>
                    <small class="text-muted">Lengkapi ${targetIds.length} bagian kosong</small>
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
                <div class="mt-auto pt-4 d-grid">
                    <button class="btn btn-success btn-lg fw-bold shadow-sm rounded-pill" onclick="checkStoryCompletion()">
                        Selesai & Cek <i class="bi bi-check-circle-fill ms-2"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

window.backToStoryList = () => { renderStoryList(); }

window.handleSlotClick = (element) => {
    if (document.querySelector('.story-card-container') && document.querySelector('.story-card-container').classList.contains('finished')) return;
    element.classList.remove('slot-correct', 'slot-wrong');
    if (element.dataset.filled === "true") {
        returnWordToBank(element);
        return;
    }
    document.querySelectorAll('.story-slot').forEach(el => el.classList.remove('active-slot'));
    element.classList.add('active-slot');
    selectedSlot = element;
}

window.fillSlot = (btnElement, id, kanji, hiragana) => {
    if (!selectedSlot) {
        const firstEmpty = document.querySelector('.story-slot[data-filled="false"]');
        if (firstEmpty) selectedSlot = firstEmpty; else return; 
    }
    selectedSlot.innerHTML = `<div class="tile-furigana">${hiragana}</div><div class="tile-kanji">${kanji}</div>`;
    selectedSlot.dataset.userAnswer = id;
    selectedSlot.dataset.filled = "true";
    selectedSlot.dataset.sourceBtnId = btnElement.id;
    selectedSlot.classList.remove('active-slot');
    selectedSlot.classList.add('filled-slot');
    btnElement.classList.add('used'); 
    selectedSlot = null;
    const nextEmpty = document.querySelector('.story-slot[data-filled="false"]');
    if (nextEmpty) handleSlotClick(nextEmpty);
}

window.returnWordToBank = (slotElement) => {
    const btnId = slotElement.dataset.sourceBtnId;
    const btnElement = document.getElementById(btnId);
    if (btnElement) btnElement.classList.remove('used');
    slotElement.innerHTML = "";
    slotElement.dataset.filled = "false";
    slotElement.dataset.userAnswer = "";
    slotElement.dataset.sourceBtnId = "";
    slotElement.classList.remove('filled-slot', 'slot-correct', 'slot-wrong');
    slotElement.style.borderBottom = "";
    handleSlotClick(slotElement);
}

window.checkStoryCompletion = () => {
    const slots = document.querySelectorAll('.story-slot');
    let emptyCount = 0;
    slots.forEach(slot => { if (slot.dataset.filled === "false") emptyCount++; });

    if (emptyCount > 0) {
        alert(`Masih ada ${emptyCount} bagian yang kosong!`);
        return;
    }

    const containerEl = document.querySelector('.story-card-container');
    if(containerEl) containerEl.classList.add('finished');
    
    let mistakesHTML = "";
    let correctCount = 0;

    slots.forEach((slot, index) => {
        const correctId = slot.dataset.answer;
        const userId = slot.dataset.userAnswer;
        const correctItem = allQuestions.find(q => q.No == correctId);
        const userItem = allQuestions.find(q => q.No == userId);

        if (correctId == userId) {
            correctCount++;
            slot.classList.add('slot-correct');
        } else {
            slot.classList.add('slot-wrong');
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

    const interactionArea = document.getElementById('interaction-area');
    const currentStory = STORIES[currentStoryIndex];
    
    let feedbackHeader = "";
    if (correctCount === slots.length) {
        feedbackHeader = `<div class="alert alert-success fw-bold text-center shadow-sm mb-3"><i class="bi bi-trophy-fill me-2"></i>Sempurna!</div>`;
    } else {
        feedbackHeader = `<div class="alert alert-warning fw-bold text-center text-dark shadow-sm border-warning mb-3"><i class="bi bi-exclamation-triangle-fill me-2"></i>${slots.length - correctCount} Salah</div>`;
    }

    const correctionsSection = mistakesHTML 
        ? `<h6 class="fw-bold text-danger mt-3 mb-2 small">Perbaikan:</h6>
           <div class="correction-list-grid" style="grid-template-columns: 1fr;"> ${mistakesHTML} </div>` 
        : '';

    interactionArea.innerHTML = `
        <div class="d-flex flex-column h-100" style="animation: fadeIn 0.5s;">
            ${feedbackHeader}
            <div class="flex-grow-1 overflow-auto pe-1" style="max-height: 50vh;">
                <h6 class="fw-bold text-primary small"><i class="bi bi-translate me-2"></i>Arti Cerita:</h6>
                <div class="p-3 bg-white rounded-3 border fst-italic text-secondary shadow-sm mb-3" style="font-size: 0.9rem;">
                    "${currentStory.translation}"
                </div>
                ${correctionsSection}
            </div>
            <div class="d-grid gap-2 mt-3">
                <button class="btn btn-outline-primary fw-bold rounded-pill" onclick="window.loadStory(${currentStoryIndex})">
                    <i class="bi bi-arrow-counterclockwise me-2"></i> Ulangi
                </button>
                <button class="btn btn-primary fw-bold rounded-pill" onclick="window.backToStoryList()">
                    <i class="bi bi-grid-fill me-2"></i> Menu
                </button>
            </div>
        </div>
    `;
}