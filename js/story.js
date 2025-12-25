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
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 15px; padding: 5px; max-height: 70vh; overflow-y: auto;">
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
                    style="display: inline-flex; flex-direction: column-reverse; min-width: 50px; border-bottom: 2px solid #cbd5e1; margin: 0 4px; vertical-align: baseline; cursor: pointer; transition: all 0.2s; position: relative; bottom: -2px;"></span>`;
        } else {
            return `<ruby>${kanji}<rt style="font-size: 0.5em;">${hira}</rt></ruby>`;
        }
    });

    const shuffledBank = [...wordBank].sort(() => Math.random() - 0.5);

    const imageHTML = story.image ? `
        <div style="width: 100%; height: 160px; border-radius: 10px; overflow: hidden; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <img src="${story.image}" style="width: 100%; height: 100%; object-fit: cover; display: block;">
        </div>` : '';

    container.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="window.backToStoryList()" style="font-size: 0.75rem;">
                <i class="bi bi-arrow-left me-1"></i> Kembali
            </button>
            <span class="badge bg-primary px-3 py-1 rounded-pill" style="font-size: 0.75rem;">${story.title}</span>
        </div>
        
        <div class="game-layout-wrapper" style="display: grid; grid-template-columns: 1fr 260px; gap: 15px; height: 75vh; max-height: 520px;">
            <div class="game-col-story" style="overflow-y: auto; padding-right: 5px;">
                <div class="story-card-container" id="story-text-area" style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #f1f5f9; box-shadow: 0 2px 10px rgba(0,0,0,0.02);">
                    ${imageHTML}
                    <div style="font-size: 1.3rem; line-height: 2.8; color: #1e293b; text-align: justify; padding-bottom: 20px;">
                        ${htmlContent}
                    </div>
                </div>
            </div>
            
            <div class="game-col-interaction" id="interaction-area" style="background: #f8fafc; border-radius: 12px; padding: 15px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; overflow: hidden;">
                <h6 style="font-weight: 800; text-align: center; color: #2563eb; margin-bottom: 1rem; font-size: 0.75rem; letter-spacing: 0.5px;">BANK KATA (15)</h6>
                <div id="word-bank" style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; overflow-y: auto; flex-grow: 1; padding-bottom: 10px;">
                    ${shuffledBank.map((item) => `
                        <button id="word-btn-${item.id}" class="choice-chip" 
                                style="background: white; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; cursor: pointer; display: flex; flex-direction: column; align-items: center; min-width: 65px; transition: all 0.2s;"
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
    if (document.getElementById('story-text-area').classList.contains('finished')) return;
    if (element.dataset.filled === "true") {
        const btnId = element.dataset.sourceBtnId;
        const btn = document.getElementById(btnId);
        if (btn) { btn.classList.remove('used'); btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; }
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
    btnElement.style.opacity = "0.3";
    btnElement.style.pointerEvents = "none";
    
    selectedSlot.style.backgroundColor = "transparent";
    selectedSlot.style.borderBottomColor = "#cbd5e1";
    selectedSlot = null;

    const nextEmpty = document.querySelector('.story-slot[data-filled="false"]');
    if(nextEmpty) window.handleSlotClick(nextEmpty);
};

// --- BAGIAN HASIL (Terjemahan Full) ---
window.checkStoryCompletion = () => {
    const slots = document.querySelectorAll('.story-slot');
    let correct = 0;
    let mistakesHTML = "";

    slots.forEach((slot, index) => {
        const correctKanji = slot.dataset.kanji;
        const userKanji = slot.dataset.userKanji;
        const hira = slot.dataset.hira;

        if (correctKanji === userKanji) {
            correct++;
            slot.style.borderBottom = "2px solid #22c55e"; // Garis Hijau
            slot.style.color = "#15803d";
        } else {
            slot.style.borderBottom = "2px solid #ef4444"; // Garis Merah
            slot.style.color = "#b91c1c";
            
            mistakesHTML += `
                <div style="background: white; border: 1px solid #e2e8f0; border-left: 4px solid #ef4444; border-radius: 8px; padding: 12px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <span style="font-size: 0.7rem; font-weight: 800; color: #ef4444; text-transform: uppercase;">Kesalahan #${index + 1}</span>
                        <i class="bi bi-x-circle-fill" style="color: #ef4444; font-size: 0.8rem;"></i>
                    </div>
                    <div style="margin-bottom: 8px;">
                        <small style="color: #64748b; font-size: 0.7rem; display: block; margin-bottom: 2px;">Jawaban Kamu:</small>
                        <div style="color: #ef4444; font-weight: 700; background: #fef2f2; border-radius: 4px; padding: 4px 8px; font-size: 0.9rem; border: 1px solid #fee2e2;">
                            ${userKanji || '<span style="font-style: italic; opacity: 0.5;">(Kosong)</span>'}
                        </div>
                    </div>
                    <div>
                        <small style="color: #64748b; font-size: 0.7rem; display: block; margin-bottom: 2px;">Seharusnya:</small>
                        <div style="color: #15803d; font-weight: 700; background: #f0fdf4; border-radius: 4px; padding: 4px 8px; font-size: 1rem; border: 1px solid #dcfce7; display: flex; align-items: center; gap: 8px;">
                            <i class="bi bi-check-lg" style="font-size: 1.1rem;"></i>
                            <ruby>${correctKanji}<rt style="font-size: 0.5em;">${hira}</rt></ruby>
                        </div>
                    </div>
                </div>
            `;
        }
    });

    document.getElementById('story-text-area').classList.add('finished');
    const interactionArea = document.getElementById('interaction-area');
    const story = STORIES[currentStoryIndex];
    const scorePct = Math.round((correct / slots.length) * 100);

    interactionArea.innerHTML = `
        <div style="display: flex; flex-direction: column; h-100; animation: fadeIn 0.4s;">
            <div style="background: ${scorePct === 100 ? '#dcfce7' : '#fef9c3'}; border-radius: 10px; padding: 12px; text-align: center; margin-bottom: 15px; border: 1px solid ${scorePct === 100 ? '#22c55e' : '#facc15'};">
                <h6 style="margin: 0; font-weight: 800; color: ${scorePct === 100 ? '#15803d' : '#854d0e'};">
                    <i class="bi ${scorePct === 100 ? 'bi-trophy-fill' : 'bi-exclamation-triangle-fill'} me-2"></i>
                    ${scorePct === 100 ? 'Sempurna!' : (slots.length - correct) + ' Salah'}
                </h6>
                <div style="font-size: 0.8rem; font-weight: 600; opacity: 0.7;">Skor: ${scorePct}% Benar</div>
            </div>

            <div style="flex-grow: 1; overflow-y: auto; padding-right: 5px; max-height: 320px;">
                <div style="margin-bottom: 15px;">
                    <h6 style="font-size: 0.7rem; font-weight: 800; color: #2563eb; text-transform: uppercase; margin-bottom: 6px;">Terjemahan Cerita:</h6>
                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; font-size: 0.8rem; color: #475569; font-style: italic; line-height: 1.5; shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        "${story.translation}"
                    </div>
                </div>

                ${mistakesHTML ? `
                    <h6 style="font-size: 0.7rem; font-weight: 800; color: #ef4444; text-transform: uppercase; margin-bottom: 8px;">Perbaikan:</h6>
                    ${mistakesHTML}
                ` : ''}
            </div>

            <div style="margin-top: auto; padding-top: 15px; border-top: 1px solid #e2e8f0; display: grid; gap: 8px;">
                <button class="btn btn-outline-primary btn-sm fw-bold rounded-pill py-2" onclick="window.loadStory(${currentStoryIndex})">
                    <i class="bi bi-arrow-counterclockwise me-1"></i> Ulangi
                </button>
                <button class="btn btn-primary btn-sm fw-bold rounded-pill py-2 shadow-sm" onclick="window.backToStoryList()">
                    <i class="bi bi-grid-fill me-1"></i> Menu Utama
                </button>
            </div>
        </div>
    `;
};