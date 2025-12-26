import { STORIES } from '../data/stories.js';

let currentStoryIndex = 0;
let selectedSlot = null; 

export function initStoryMode() {
    renderStoryList();
}

// 1. MENU UTAMA
function renderStoryList() {
    const container = document.getElementById('story-container');
    if (!container) return;

    container.innerHTML = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <h4 style="font-weight: 800; color: #1e293b; margin-bottom: 0.2rem;">Story Mode</h4>
            <p style="color: #64748b; font-size: 0.85rem;">Susun kalimat dan hafalkan kanjinya!</p>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 15px; padding: 5px; max-height: 70vh; overflow-y: auto;">
            ${STORIES.map((story, index) => `
                <div onclick="window.loadStory(${index})" 
                     style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; cursor: pointer; display: flex; flex-direction: column; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05);"
                     onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'" 
                     onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 1px 2px rgba(0,0,0,0.05)'">
                    
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                        <div style="background: #e0f2fe; color: #0369a1; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; border-radius: 8px;">
                            <i class="bi bi-book-fill" style="font-size: 1rem;"></i>
                        </div>
                        <div style="border: 1px solid #0ea5e9; color: #0ea5e9; border-radius: 20px; padding: 1px 10px; font-size: 0.7rem; font-weight: 600;">
                            Story #${index + 1}
                        </div>
                    </div>

                    <div style="flex-grow: 1;">
                        <div style="font-weight: 800; font-size: 1rem; color: #0f172a; margin-bottom: 5px;">${story.title}</div>
                        <div style="color: #64748b; font-size: 0.8rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">
                            ${story.translation}
                        </div>
                    </div>

                    <div style="border-top: 1px dashed #f1f5f9; margin: 12px 0;"></div>

                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 700; color: #334155; font-size: 0.8rem;">Mulai</span>
                        <div style="background: #2563eb; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem;">
                            <i class="bi bi-play-fill"></i>
                        </div>
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

    const matches = [...story.template.matchAll(/\[\[(.*?)\|(.*?)\]\]/g)];
    const totalItems = matches.length;
    const countToHide = Math.min(totalItems, 15);
    let indicesToHide = new Set();
    while(indicesToHide.size < countToHide) {
        indicesToHide.add(Math.floor(Math.random() * totalItems));
    }

    let itemCounter = 0;
    let wordBank = [];
    let htmlContent = story.template.replace(/\[\[(.*?)\|(.*?)\]\]/g, (match, kanji, hira) => {
        const currentIdx = itemCounter++;
        if (indicesToHide.has(currentIdx)) {
            wordBank.push({ kanji, hira, id: currentIdx });
            return `<span class="story-slot" onclick="handleSlotClick(this)" data-kanji="${kanji}" data-hira="${hira}" data-filled="false" 
                    style="display: inline-flex; flex-direction: column-reverse; align-items: center; min-width: 50px; border-bottom: 2px solid #cbd5e1; margin: 0 4px; vertical-align: baseline; cursor: pointer; transition: all 0.2s; position: relative; bottom: -2px;"></span>`;
        } else {
            return `<ruby>${kanji}<rt style="font-size: 0.5em;">${hira}</rt></ruby>`;
        }
    });

    const shuffledBank = [...wordBank].sort(() => Math.random() - 0.5);
    const imageHTML = story.image ? `
        <div style="width: 100%; height: 160px; border-radius: 10px; overflow: hidden; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); flex-shrink: 0;">
            <img src="${story.image}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
        </div>` : '';

    const styleBlock = `
    <style>
        .game-layout-responsive { display: flex; flex-direction: column; gap: 15px; height: 80vh; }
        .game-col-story { flex: 1; overflow-y: auto; min-height: 0; }
        .game-col-interaction { flex-shrink: 0; max-height: 40vh; display: flex; flex-direction: column; }
        @media (min-width: 768px) {
            .game-layout-responsive { display: grid; grid-template-columns: 1fr 320px; height: 75vh; max-height: 550px; }
            .game-col-interaction { height: 100%; max-height: none; }
        }
        .result-grid { display: flex; flex-direction: column; gap: 20px; height: 80vh; overflow-y: auto; }
        @media (min-width: 992px) {
            .result-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; overflow-y: hidden; }
            .result-col-scroll { overflow-y: auto; height: 100%; padding-right: 10px; }
        }
    </style>`;

    container.innerHTML = `
        ${styleBlock}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="window.backToStoryList()" style="font-size: 0.75rem;">
                <i class="bi bi-arrow-left me-1"></i> Kembali
            </button>
            <span class="badge bg-primary px-3 py-1 rounded-pill text-truncate" style="font-size: 0.75rem; max-width: 200px;">${story.title}</span>
        </div>
        
        <div class="game-layout-responsive">
            <div class="game-col-story">
                <div class="story-card-container" id="story-text-area" style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #f1f5f9; box-shadow: 0 2px 10px rgba(0,0,0,0.02);">
                    ${imageHTML}
                    <div style="font-size: 1.3rem; line-height: 2.8; color: #1e293b; text-align: justify; padding-bottom: 20px;">
                        ${htmlContent}
                    </div>
                </div>
            </div>
            
            <div class="game-col-interaction" id="interaction-area" style="background: #f8fafc; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0; overflow: hidden;">
                <h6 style="font-weight: 800; text-align: center; color: #2563eb; margin-bottom: 1rem; font-size: 0.75rem; letter-spacing: 0.5px;">BANK KATA (15)</h6>
                <div id="word-bank" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; align-content: flex-start; overflow-y: auto; flex-grow: 1; padding-bottom: 10px;">
                    ${shuffledBank.map((item) => `
                        <button id="word-btn-${item.id}" class="choice-chip" 
                                style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; min-width: 65px; flex: 1 0 auto; max-width: 100px; transition: all 0.2s;"
                                onmouseover="this.style.borderColor='#3b82f6'; this.style.backgroundColor='#eff6ff'"
                                onmouseout="if(!this.classList.contains('used')){this.style.borderColor='#e2e8f0'; this.style.backgroundColor='white'}"
                                onclick="fillSlot(this, '${item.kanji}', '${item.hira}')">
                            <div style="font-weight: 700; font-size: 1rem; color: #0f172a;">${item.kanji}</div>
                            <div style="font-size: 0.6rem; color: #64748b;">${item.hira}</div>
                        </button>
                    `).join('')}
                </div>
                <div style="margin-top: auto; padding-top: 1rem; display: grid;">
                    <button class="btn btn-success btn-lg fw-bold rounded-pill py-3 shadow-sm" onclick="checkStoryCompletion()">
                        Cek Jawaban <i class="bi bi-check-circle-fill ms-2"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
};

window.backToStoryList = () => renderStoryList();

window.handleSlotClick = (element) => {
    if (element.dataset.filled === "true") {
        const btnId = element.dataset.sourceBtnId;
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.classList.remove('used');
            btn.style.display = 'flex';
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'auto';
        }
        element.innerHTML = "";
        element.dataset.filled = "false";
        element.style.backgroundColor = "transparent";
    }
    document.querySelectorAll('.story-slot').forEach(el => {
        el.style.backgroundColor = "transparent";
        el.style.borderBottomColor = "#cbd5e1";
    });
    element.style.backgroundColor = "#eff6ff";
    element.style.borderBottomColor = "#3b82f6";
    selectedSlot = element;
};

window.fillSlot = (btnElement, kanji, hira) => {
    if (!selectedSlot) selectedSlot = document.querySelector('.story-slot[data-filled="false"]');
    if (!selectedSlot) return;

    selectedSlot.innerHTML = `<ruby style="margin-bottom: -4px;">${kanji}<rt style="font-size: 0.55em; color: #64748b; line-height: 1;">${hira}</rt></ruby>`;
    selectedSlot.dataset.userKanji = kanji;
    selectedSlot.dataset.filled = "true";
    selectedSlot.dataset.sourceBtnId = btnElement.id;
    
    btnElement.classList.add('used');
    btnElement.style.display = 'none'; 
    
    selectedSlot.style.backgroundColor = "transparent";
    selectedSlot.style.borderBottomColor = "#cbd5e1";
    selectedSlot = null;

    const nextEmpty = document.querySelector('.story-slot[data-filled="false"]');
    if(nextEmpty) window.handleSlotClick(nextEmpty);
};

// 3. HALAMAN HASIL (UPDATED: 4 Kolom)
window.checkStoryCompletion = () => {
    const slots = document.querySelectorAll('.story-slot');
    let correct = 0;
    let mistakesHTML = "";
    const story = STORIES[currentStoryIndex];
    const storyTextArea = document.getElementById('story-text-area');
    
    slots.forEach((slot, index) => {
        const correctKanji = slot.dataset.kanji;
        const userKanji = slot.dataset.userKanji;
        const hira = slot.dataset.hira;

        slot.onclick = null;
        slot.style.cursor = "default";

        if (correctKanji === userKanji) {
            correct++;
            slot.style.borderBottom = "2px solid #22c55e"; 
            slot.style.color = "#15803d";
        } else {
            slot.style.borderBottom = "2px solid #ef4444"; 
            slot.style.color = "#b91c1c";
            
            // --- BAGIAN INI SUDAH DIUPDATE ---
            // col-lg-3 digunakan agar layout menjadi 4 kolom
            mistakesHTML += `
                <div class="col-12 col-md-6 col-lg-3">
                    <div class="card h-100 shadow-sm border-0 position-relative" style="border-left: 6px solid #dc3545 !important;">
                        <div class="card-body d-flex flex-column">
                            
                            <div class="d-flex justify-content-between align-items-start mb-2">
                                <span class="text-danger fw-bold text-uppercase" style="font-size: 0.75rem;">
                                    SALAH #${index + 1}
                                </span>
                            </div>

                            <div class="text-center mb-3 flex-grow-1 d-flex align-items-center justify-content-center">
                                <h1 class="display-5 fw-bold mb-0 text-dark" style="word-break: break-all;">${correctKanji}</h1>
                            </div>

                            <div class="bg-light border rounded p-2 text-center mb-2">
                                <small class="text-muted d-block" style="font-size: 0.7rem;">Jawaban Kamu:</small>
                                <span class="text-danger fw-bold fs-6">
                                    ${userKanji || '<i style="opacity:0.6;">(Kosong)</i>'}
                                </span>
                            </div>

                            <div class="alert alert-success d-flex align-items-center p-2 mb-0 justify-content-center text-center" role="alert">
                                <div>
                                    <small class="d-block text-success opacity-75" style="line-height: 1; font-size: 0.7rem;">Seharusnya:</small>
                                    <strong class="text-dark" style="font-size: 0.9rem;">
                                        <ruby>${correctKanji}<rt style="font-size: 0.7em;">${hira}</rt></ruby>
                                    </strong>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            `;
        }
    });

    const finalStoryHTML = storyTextArea.innerHTML;
    const scorePct = Math.round((correct / slots.length) * 100);
    const container = document.getElementById('story-container');

    container.innerHTML = `
        <div class="animate__animated animate__fadeIn p-2" style="height: 100%;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #e2e8f0; padding-bottom: 15px;">
                <div>
                    <h2 style="font-weight: 800; color: ${scorePct >= 80 ? '#22c55e' : '#f59e0b'}; margin: 0; line-height: 1;">${scorePct}%</h2>
                    <span style="font-size: 0.8rem; color: #64748b;">${correct}/${slots.length} Benar</span>
                </div>
                <div style="text-align: right;">
                    <div style="padding: 5px 15px; background: ${scorePct === 100 ? '#dcfce7' : '#fef9c3'}; color: ${scorePct === 100 ? '#15803d' : '#854d0e'}; border-radius: 50px; font-weight: 800; font-size: 0.8rem;">
                        ${scorePct === 100 ? 'SEMPURNA!' : 'SELESAI'}
                    </div>
                </div>
            </div>

            <div class="result-grid">
                <div class="result-col-scroll">
                    <h6 style="font-weight: 800; color: #334155; margin-bottom: 10px; font-size: 0.8rem; text-transform: uppercase;">
                        <i class="bi bi-file-text-fill me-2"></i>Hasil Pengerjaan
                    </h6>
                    <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 2px 10px rgba(0,0,0,0.02); font-size: 1.25rem; line-height: 2.6; color: #1e293b; text-align: justify;">
                        ${finalStoryHTML}
                    </div>
                </div>

                <div class="result-col-scroll">
                    <h6 style="font-weight: 800; color: #3b82f6; margin-bottom: 10px; font-size: 0.8rem; text-transform: uppercase; margin-top: 20px;">
                        <i class="bi bi-translate me-2"></i>Terjemahan
                    </h6>
                    <div style="background: #f8fafc; border-radius: 10px; padding: 15px; border: 1px solid #e2e8f0; font-size: 0.9rem; color: #475569; font-style: italic; line-height: 1.6; margin-bottom: 20px;">
                        "${story.translation}"
                    </div>

                    ${mistakesHTML ? `
                        <h6 style="font-weight: 800; color: #ef4444; margin-bottom: 15px; font-size: 0.8rem; text-transform: uppercase;">
                            <i class="bi bi-exclamation-triangle-fill me-2"></i>Perbaikan (${slots.length - correct})
                        </h6>
                        <div class="row g-3"> ${mistakesHTML}
                        </div>
                    ` : `
                        <div class="alert alert-success text-center fw-bold"><i class="bi bi-stars me-2"></i>Tidak ada kesalahan!</div>
                    `}
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 30px; margin-bottom: 20px;">
                        <button class="btn btn-outline-primary btn-lg fw-bold rounded-pill" onclick="window.loadStory(${currentStoryIndex})">
                            <i class="bi bi-arrow-repeat"></i> Ulangi
                        </button>
                        <button class="btn btn-primary btn-lg fw-bold rounded-pill shadow-sm" onclick="window.backToStoryList()">
                            <i class="bi bi-grid-fill"></i> Menu
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
};