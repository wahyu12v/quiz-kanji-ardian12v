import { BATCH_SIZE } from './constants.js';
import { shuffleArray } from './utils.js';
import * as Storage from './storage.js';
import * as Logic from './logic.js';
import * as UI from './ui.js';

// --- VARIABEL GLOBAL ---
let QUESTIONS = [];
let state = null; 

// Modal Instances
let quizModal, memModal, confirmModal, daftarRangeModal, daftarListModal, progressModal, partSelectionModal;
let pendingSessionType = 'quiz'; 

// Penyimpanan Pilihan User
const GLOBAL_SELECTIONS = {}; 

// Flag Animasi (Untuk Auto Next)
let isAnim = false;

// ============================================================
// 1. INISIALISASI
// ============================================================
async function init() {
    try {
        setupModals();
        
        // Pastikan Tombol Kembali MUNCUL saat awal buka web
        toggleMainBackButton(true); 
        
        // Load Data
        const uniqueUrl = 'data/data.json?v=' + new Date().getTime();
        const response = await fetch(uniqueUrl);
        if(!response.ok) throw new Error("Gagal memuat data/data.json");
        QUESTIONS = await response.json();
        
        const totalEl = document.getElementById('totalCount');
        if(totalEl) totalEl.innerText = QUESTIONS.length;
        
        // Generate Tampilan Awal
        generateCheckboxes('rangeListQuiz', 'q');
        generateCheckboxes('rangeListMem', 'm');
        generateCheckboxes('rangeListDaftar', 'd'); 

    } catch(e) { 
        console.error("Error Loading:", e); 
        alert("Gagal memuat data.json. Pastikan file ada dan formatnya benar.");
        toggleMainBackButton(true);
    }
    setupEventListeners();
}

function setupModals() {
    quizModal = new bootstrap.Modal(document.getElementById('quizModal'));
    memModal = new bootstrap.Modal(document.getElementById('memModal'));
    confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    daftarRangeModal = new bootstrap.Modal(document.getElementById('daftarRangeModal'));
    daftarListModal = new bootstrap.Modal(document.getElementById('daftarHafalanModal'));
    progressModal = new bootstrap.Modal(document.getElementById('progressModal'));
    
    const partEl = document.getElementById('partSelectionModal');
    if(partEl) partSelectionModal = new bootstrap.Modal(partEl);
}

function setupEventListeners() {
    document.getElementById('startBtn').onclick = () => { pendingSessionType = 'quiz'; quizModal.show(); };
    document.getElementById('btnTebakHiragana').onclick = () => { pendingSessionType = 'quiz_hiragana'; quizModal.show(); };
    document.getElementById('memorizeBtn').onclick = () => { pendingSessionType = 'mem'; memModal.show(); };
    document.getElementById('btnTulisRomaji').onclick = () => { pendingSessionType = 'write_romaji'; memModal.show(); };
    document.getElementById('daftarHafalanBtn').onclick = () => { daftarRangeModal.show(); };

    document.getElementById('btnCekProgress').onclick = () => {
        const stats = Logic.calculateProgress(QUESTIONS);
        UI.renderProgressModal(stats);
        progressModal.show();
    };

    document.getElementById('quizForm').onsubmit = (e) => { e.preventDefault(); handleStart('rangeListQuiz'); };
    document.getElementById('memForm').onsubmit = (e) => { e.preventDefault(); handleStart('rangeListMem'); };
    document.getElementById('btnShowList').onclick = () => renderDaftarList();

    setupCheckboxHelpers('selectAllQuiz', 'clearAllQuiz', 'rangeListQuiz');
    setupCheckboxHelpers('selectAllMem', 'clearAllMem', 'rangeListMem');
    setupCheckboxHelpers('btnDaftarSelectAll', 'btnDaftarReset', 'rangeListDaftar');

    document.getElementById('confirmSend').onclick = () => {
        confirmModal.hide();
        finishSession();
    };
}

// --- FUNGSI FIX TOMBOL KEMBALI (DENGAN IMPORTANT) ---
function toggleMainBackButton(show) {
    const btnBack = document.getElementById('btn-main-back');
    if(btnBack) {
        if (show) {
            // Gunakan setProperty untuk menimpa class d-flex bootstrap
            btnBack.style.setProperty('display', 'flex', 'important');
        } else {
            btnBack.style.setProperty('display', 'none', 'important');
        }
    }
}

// ============================================================
// 2. LOGIKA SELEKSI BAB & PART
// ============================================================

function generateCheckboxes(containerId, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    if (!GLOBAL_SELECTIONS[containerId]) {
        GLOBAL_SELECTIONS[containerId] = new Set();
    }

    if (QUESTIONS.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3">Data kosong.</div>';
        return;
    }

    const uniqueBabs = [...new Set(QUESTIONS.map(item => item.bab || "Lainnya"))];
    container.className = 'range-grid-container'; 
    
    uniqueBabs.forEach((babName, index) => {
        const count = QUESTIONS.filter(q => (q.bab || "Lainnya") === babName).length;
        
        const div = document.createElement('div');
        div.className = 'bab-selector-card';
        div.id = `${prefix}_btn_${index}`; 
        div.onclick = () => window.openPartModal(babName, containerId, prefix, index);
        
        div.innerHTML = `
            <strong>${babName}</strong>
            <span class="small text-muted mt-1">${count} Kata</span>
            <span class="badge rounded-pill mt-2 d-none" id="${prefix}_badge_${index}" style="font-size:0.6rem; background: var(--teal, #0D9488); color: white;">0 Terpilih</span>
        `;
        container.appendChild(div);
        
        const indicesInBab = [];
        QUESTIONS.forEach((q, idx) => { if ((q.bab || "Lainnya") === babName) indicesInBab.push(idx); });
        window.updateBabUI(containerId, prefix, index, indicesInBab);
    });
}

window.openPartModal = function(babName, containerId, prefix, babIndex) {
    const modalTitle = document.getElementById('partModalTitle');
    const modalContainer = document.getElementById('partListContainer');
    if(!modalTitle || !modalContainer) return;

    modalTitle.innerText = `Pilih Bagian: ${babName}`;
    modalContainer.innerHTML = '';

    const indicesInBab = [];
    QUESTIONS.forEach((q, idx) => {
        if ((q.bab || "Lainnya") === babName) indicesInBab.push(idx);
    });

    const totalWords = indicesInBab.length;
    const MAX_PER_PART = 25; 
    let totalParts = Math.ceil(totalWords / MAX_PER_PART);
    if (totalWords <= 35) totalParts = 1;

    for (let i = 0; i < totalParts; i++) {
        const start = i * MAX_PER_PART;
        const end = start + MAX_PER_PART;
        const chunk = indicesInBab.slice(start, end); 

        const currentSet = GLOBAL_SELECTIONS[containerId];
        const isChecked = chunk.some(idx => currentSet.has(idx));

        const partLabel = totalParts > 1 ? `Part ${i + 1}` : `Full Paket`;
        const rangeLabel = `(${chunk.length} Kata)`;

        const div = document.createElement('div');
        div.className = 'form-check p-0 mb-2';
        
        div.innerHTML = `
            <input class="form-check-input d-none" type="checkbox" id="chk_part_${i}" 
                   ${isChecked ? 'checked' : ''} onchange="window.togglePartSelection('${containerId}', this.checked, [${chunk}])">
            <label class="part-option w-100" for="chk_part_${i}">
                <div class="d-flex align-items-center gap-2">
                    <span class="part-option-label">${partLabel}</span>
                    <small class="text-muted fw-normal">${rangeLabel}</small>
                </div>
                <i class="bi bi-check-circle-fill check-icon ${isChecked ? '' : 'd-none'}" style="color: var(--teal, #0D9488);"></i>
            </label>
        `;
        modalContainer.appendChild(div);
    }

    const el = document.getElementById('partSelectionModal');
    const handler = () => {
        window.updateBabUI(containerId, prefix, babIndex, indicesInBab);
        el.removeEventListener('hidden.bs.modal', handler);
    };
    el.addEventListener('hidden.bs.modal', handler);

    partSelectionModal?.show();
}

window.togglePartSelection = function(containerId, isChecked, indicesArray) {
    const set = GLOBAL_SELECTIONS[containerId];
    indicesArray.forEach(idx => {
        if (isChecked) set.add(idx);
        else set.delete(idx);
    });
    
    const checkbox = event.target;
    const icon = checkbox.nextElementSibling.querySelector('.check-icon');
    const label = checkbox.nextElementSibling.querySelector('.part-option-label');
    
    if(isChecked) {
        icon.classList.remove('d-none');
        label.style.color = '#0D9488';
        label.style.fontWeight = 'bold';
    } else {
        icon.classList.add('d-none');
        label.style.color = '';
        label.style.fontWeight = 'normal';
    }
}

window.updateBabUI = function(containerId, prefix, babIndex, indicesInBab) {
    const set = GLOBAL_SELECTIONS[containerId];
    const btn = document.getElementById(`${prefix}_btn_${babIndex}`);
    const badge = document.getElementById(`${prefix}_badge_${babIndex}`);
    
    if(!btn || !badge) return;

    let countSelected = 0;
    indicesInBab.forEach(idx => {
        if (set.has(idx)) countSelected++;
    });

    if (countSelected > 0) {
        btn.classList.add('has-selection');
        badge.classList.remove('d-none');
        badge.innerText = `${countSelected} Terpilih`;
    } else {
        btn.classList.remove('has-selection');
        badge.classList.add('d-none');
    }
}

window.getCheckedIndices = function(containerId) {
    const set = GLOBAL_SELECTIONS[containerId];
    if (!set) return [];
    return Array.from(set).sort((a, b) => a - b);
}

function setupCheckboxHelpers(btnAllId, btnClearId, containerId) {
    const btnAll = document.getElementById(btnAllId);
    const btnClear = document.getElementById(btnClearId);

    if(btnAll) btnAll.onclick = () => {
        const allIndices = QUESTIONS.map((_, i) => i);
        GLOBAL_SELECTIONS[containerId] = new Set(allIndices);
        const prefix = containerId === 'rangeListQuiz' ? 'q' : (containerId === 'rangeListMem' ? 'm' : 'd');
        generateCheckboxes(containerId, prefix);
    };

    if(btnClear) btnClear.onclick = () => {
        GLOBAL_SELECTIONS[containerId] = new Set();
        const prefix = containerId === 'rangeListQuiz' ? 'q' : (containerId === 'rangeListMem' ? 'm' : 'd');
        generateCheckboxes(containerId, prefix);
    };
}


// ============================================================
// 3. LOGIKA GAME & SESI
// ============================================================

function handleStart(rangeId) {
    const indices = window.getCheckedIndices(rangeId);
    if (indices.length === 0) {
        alert("Pilih setidaknya satu paket atau part!");
        return;
    }
    quizModal.hide();
    memModal.hide();
    startSession(pendingSessionType, indices);
}

function startSession(type, indices) {
    // 1. HILANGKAN TOMBOL KEMBALI SECARA PAKSA
    toggleMainBackButton(false); 
    
    const selectedQ = indices.map(i => QUESTIONS[i]);
    const shuffled = shuffleArray([...selectedQ]); 

    state = {
        sessionType: type,
        batch: shuffled,
        current: 0,
        answers: new Array(shuffled.length).fill(null),
        orderIndices: indices 
    };

    if (type.includes('quiz')) {
        const globalIndices = shuffled.map(q => QUESTIONS.indexOf(q));
        state.choicesPerQ = Logic.buildChoices(globalIndices, QUESTIONS, type);
    }

    isAnim = false; // Reset flag animasi
    renderCurrent();
    
    // TAMPILKAN TOMBOL BERHENTI (MERAH)
    const btnStop = document.getElementById('btn-stop-quiz');
    if(btnStop) btnStop.classList.remove('d-none');
}

function renderCurrent() {
    if (state.sessionType.includes('quiz')) {
        UI.renderQuiz(state, state.current);
    } else {
        UI.renderMem(state, state.current);
    }
}

// --- UPDATE: EVENT HANDLERS (AUTO NEXT) ---

window.handleAnswer = (choiceIndex) => {
    // 1. Cek apakah sedang transisi?
    if (isAnim) return; 

    // 2. Simpan Jawaban
    state.answers[state.current] = choiceIndex;
    renderCurrent(); // Update UI biar tombol terpilih menyala
    
    // 3. Set Flag & Mulai Timer Auto Next
    isAnim = true;
    setTimeout(() => {
        if (state.current < state.batch.length - 1) {
            state.current++;
            renderCurrent();
        } else {
            window.handleConfirm(); // Jika soal habis, tampilkan konfirmasi
        }
        isAnim = false; // Buka kunci interaksi
    }, 400); // Jeda 0.4 detik (cukup cepat tapi smooth)
};

window.handleNext = () => {
    if (state.current < state.batch.length - 1) {
        state.current++;
        renderCurrent();
    }
};

window.handleNextOrSubmit = () => {
    // Dipanggil saat tekan ENTER di mode Tulis
    if (state.current < state.batch.length - 1) {
        window.handleNext();
    } else {
        window.handleConfirm();
    }
};

window.handleInput = (text) => {
    state.answers[state.current] = text;
};

window.handlePrev = () => {
    if (state.current > 0) {
        state.current--;
        renderCurrent();
    }
};

window.handleLupa = () => {
    state.answers[state.current] = "Lupa";
    // Lupa juga langsung next otomatis
    window.handleNext();
};

window.handleConfirm = () => {
    let emptyCount = 0;
    state.answers.forEach(a => {
        if (a === null || a === undefined || a === "") emptyCount++;
    });

    const summary = document.getElementById('confirmSummary');
    if (summary) {
        summary.innerHTML = emptyCount > 0 
            ? `<span class="text-danger fw-bold">${emptyCount} soal belum dijawab!</span>`
            : "Semua soal sudah dijawab.";
    }
    confirmModal.show();
};

window.executeStopQuiz = () => {
    const stopModalEl = document.getElementById('stopQuizModal');
    const stopModal = bootstrap.Modal.getInstance(stopModalEl);
    stopModal.hide();
    finishSession();
}

window.handleBack = () => { 
    Storage.clearTemp(); 
    document.getElementById('quiz-area').innerHTML = ''; 
    document.location.reload(); 
};

function finishSession() {
    const result = Logic.gradeSession(state, QUESTIONS);
    Storage.saveMastery(result.details, state.sessionType);

    const uniqueBabs = [...new Set(state.batch.map(item => item.bab || "Default"))].sort();
    const packagesStr = uniqueBabs.join(', ');

    Storage.saveToHistory(result.score, result.total, state.sessionType, packagesStr);
    
    const wrongIndices = [];
    result.details.forEach((item, i) => {
        if (!item.isCorrect || state.answers[i] === 'Lupa') {
            const originalIdx = QUESTIONS.indexOf(item.q);
            if(originalIdx !== -1) wrongIndices.push(originalIdx);
        }
    });

    Storage.clearTemp();
    UI.renderResult(result, state.sessionType, wrongIndices);
    
    // HILANGKAN TOMBOL BERHENTI (MERAH)
    const btnStop = document.getElementById('btn-stop-quiz');
    if(btnStop) btnStop.classList.add('d-none'); 
    
    // PENTING: TOMBOL KEMBALI TETAP DISEMBUNYIKAN
    // (Akan otomatis muncul lagi hanya jika user menekan tombol 'Menu Utama' di UI Result yang memicu handleBack/reload)
}

window.handleRetry = () => {
    const indices = state.batch.map(q => QUESTIONS.indexOf(q));
    startSession(state.sessionType, indices);
};

window.handleRetryWrong = (indices) => {
    if (!indices || indices.length === 0) return;
    startSession(state.sessionType, indices);
};

// ============================================================
// 4. DAFTAR HAFALAN (VIEWER)
// ============================================================
function renderDaftarList() {
    const indices = window.getCheckedIndices('rangeListDaftar');
    if(indices.length === 0) return alert("Pilih minimal satu paket.");
    
    daftarRangeModal?.hide();
    
    // HILANGKAN TOMBOL KEMBALI
    toggleMainBackButton(false);

    const listContainer = document.getElementById('daftarList');
    if(listContainer) {
        listContainer.innerHTML = '';
        listContainer.className = 'row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-3'; 

        indices.forEach(idx => {
            const item = QUESTIONS[idx];
            if(!item) return;
            const kanji = String(item.jepang || '?').trim();
            const kana = String(item.kana || '-').trim();
            const showKana = kanji !== kana;
            
            let fontSizeClass = 'fs-1';
            if (kanji.length > 4) fontSizeClass = 'fs-2';
            if (kanji.length > 6) fontSizeClass = 'fs-3';
            if (kanji.length > 10) fontSizeClass = 'fs-5';

            const colDiv = document.createElement('div');
            colDiv.className = 'col';
            
            colDiv.innerHTML = `
                <div class="kotoba-card h-100 p-3 d-flex flex-column align-items-center text-center justify-content-center">
                    <div class="mb-1 w-100">
                        <span class="badge-neon">${item.bab || 'Umum'}</span>
                    </div>
                    
                    <div class="k-char ${fontSizeClass}">${kanji}</div>
                    
                    <div class="w-100">
                        ${showKana ? `<div class="k-read">${kana}</div>` : ''}
                        <div class="k-romaji">${item.romaji || '-'}</div>
                    </div>
                    
                    <div class="k-mean">${item.indo || ''}</div>
                </div>`;
            listContainer.appendChild(colDiv);
        });
    }
    setTimeout(() => { daftarListModal?.show(); }, 300);
}

window.onload = init;