import { BATCH_SIZE } from './constants.js';
import { shuffleArray } from './utils.js';
import * as Storage from './storage.js';
import * as Logic from './logic.js';
import * as UI from './ui.js';

let QUESTIONS = [];
let state = null; 

// --- BOOTSTRAP MODAL INSTANCES ---
// Kita inisialisasi nanti di dalam init() agar elemen DOM pasti sudah ada
let quizModal, memModal, confirmModal, daftarRangeModal, daftarListModal;

// --- INITIALIZATION ---
async function init() {
    try {
        // 1. Setup Modals
        setupModals();

        // 2. Fetch Data (Cache Busting)
        const uniqueUrl = 'kanjiasli.json?v=' + new Date().getTime();
        const response = await fetch(uniqueUrl);
        if(!response.ok) throw new Error("File kanjiasli.json tidak ditemukan!");
        
        QUESTIONS = await response.json();
        
        // 3. Update UI Total Data
        const totalEl = document.getElementById('totalCount');
        if(totalEl) totalEl.innerText = QUESTIONS.length;
        
        // 4. Generate Checkboxes
        generateCheckboxes('rangeListQuiz', 'q_cb');
        generateCheckboxes('rangeListMem', 'm_cb');
        generateCheckboxes('rangeListDaftar', 'd_cb'); // Penting untuk menu Daftar

        // 5. Update Dropdown JFT
        updateJftDropdown();
        
    } catch(e) { 
        console.error("Error Loading:", e);
        // Jangan alert error jika hanya masalah minor rendering
    }
    
    setupEventListeners();
}

function setupModals() {
    // Helper aman untuk inisialisasi modal
    const getModal = (id) => document.getElementById(id) ? new bootstrap.Modal(document.getElementById(id)) : null;
    
    quizModal = getModal('quizModal');
    memModal = getModal('memModal');
    confirmModal = getModal('confirmModal');
    daftarRangeModal = getModal('daftarRangeModal');
    daftarListModal = getModal('daftarHafalanModal');
}

function setupEventListeners() {
    // Tombol Menu Utama
    if(document.getElementById('startBtn')) 
        document.getElementById('startBtn').onclick = () => quizModal?.show();
    
    if(document.getElementById('memorizeBtn')) 
        document.getElementById('memorizeBtn').onclick = () => memModal?.show();

    if(document.getElementById('daftarHafalanBtn')) 
        document.getElementById('daftarHafalanBtn').onclick = () => daftarRangeModal?.show();
    
    // Helpers Checkbox (Pilih Semua / Reset)
    setupCheckboxHelpers('selectAllQuiz', 'clearAllQuiz', 'rangeListQuiz');
    setupCheckboxHelpers('selectAllMem', 'clearAllMem', 'rangeListMem');
    setupCheckboxHelpers('btnDaftarSelectAll', 'btnDaftarReset', 'rangeListDaftar');

    // FORM SUBMIT: Quiz
    const quizForm = document.getElementById('quizForm');
    if(quizForm) {
        quizForm.onsubmit = (e) => {
            e.preventDefault();
            const indices = getCheckedIndices('rangeListQuiz');
            if(indices.length === 0) return alert("Pilih minimal satu paket!");
            startSession('quiz', indices);
            quizModal?.hide();
            showStopButton();
        };
    }
    
    // FORM SUBMIT: Hafalan
    const memForm = document.getElementById('memForm');
    if(memForm) {
        memForm.onsubmit = (e) => {
            e.preventDefault();
            const indices = getCheckedIndices('rangeListMem');
            if(indices.length === 0) return alert("Pilih minimal satu paket!");
            startSession('mem', indices);
            memModal?.hide();
            showStopButton();
        };
    }

    // TOMBOL "TAMPILKAN" DI MENU DAFTAR
    const btnShowList = document.getElementById('btnShowList');
    if(btnShowList) {
        btnShowList.onclick = () => {
             renderDaftarList(); 
        };
    }
}

// --- FUNGSI RENDER DAFTAR (FIXED) ---
function renderDaftarList() {
    const indices = getCheckedIndices('rangeListDaftar');
    if(indices.length === 0) return alert("Pilih minimal satu paket untuk ditampilkan.");
    
    // 1. Tutup Modal Pilihan
    daftarRangeModal?.hide();

    // 2. Render Isi Daftar
    const listContainer = document.getElementById('daftarList');
    if(listContainer) {
        listContainer.innerHTML = '';
        
        indices.forEach(idx => {
            const item = QUESTIONS[idx];
            if(!item) return;

            // Buat HTML Kartu
            const card = document.createElement('div');
            card.className = 'kanji-card-small shadow-sm'; 
            card.innerHTML = `
                <div class="k-char">${item.Kanji || item.kanji || '?'}</div>
                <div class="k-info">
                    <div class="k-read text-dark">${item.Hiragana || item.hiragana || '-'}</div>
                    <div class="k-mean text-muted small">${item.Arti || item.arti || item.meaning || ''}</div>
                </div>
            `;
            listContainer.appendChild(card);
        });
    }

    // 3. Buka Modal Hasil (Beri jeda sedikit agar transisi mulus)
    setTimeout(() => {
        daftarListModal?.show();
    }, 300);
}

// --- GENERATORS & HELPERS ---

function generateCheckboxes(containerId, prefix) {
    const container = document.getElementById(containerId);
    if(!container) return; 
    
    container.innerHTML = '';
    const totalBatches = Math.ceil(QUESTIONS.length / BATCH_SIZE);

    for(let i=0; i<totalBatches; i++) {
        const start = i * BATCH_SIZE + 1;
        const end = Math.min((i + 1) * BATCH_SIZE, QUESTIONS.length);
        
        const div = document.createElement('div');
        div.className = 'form-check position-relative'; 
        div.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${i}" id="${prefix}_${i}">
            <label class="form-check-label w-100 stretched-link" for="${prefix}_${i}">
               <strong>Paket ${i+1}</strong> <br>
               <span class="small text-muted">No ${start}-${end}</span>
            </label>
        `;
        container.appendChild(div);
    }
}

function setupCheckboxHelpers(btnAllId, btnClearId, containerId) {
    const btnAll = document.getElementById(btnAllId);
    const btnClear = document.getElementById(btnClearId);
    
    if(btnAll) btnAll.onclick = () => document.querySelectorAll(`#${containerId} input[type=checkbox]`).forEach(cb => cb.checked = true);
    if(btnClear) btnClear.onclick = () => document.querySelectorAll(`#${containerId} input[type=checkbox]`).forEach(cb => cb.checked = false);
}

// Export global untuk aksesibilitas jika perlu
window.getCheckedIndices = function(containerId) {
    const checkedBoxes = document.querySelectorAll(`#${containerId} input[type=checkbox]:checked`);
    let allIndices = [];
    checkedBoxes.forEach(cb => {
        const batchIdx = parseInt(cb.value);
        for(let i=batchIdx*BATCH_SIZE; i<Math.min((batchIdx+1)*BATCH_SIZE, QUESTIONS.length); i++) {
            allIndices.push(i);
        }
    });
    return allIndices;
}

// --- UPDATE DROPDOWN JFT ---
function updateJftDropdown() {
    const select = document.getElementById('examPackageSelect');
    if(!select) return;
    select.innerHTML = ''; 
    const totalBatches = Math.ceil(QUESTIONS.length / 60); 
    for(let i=0; i<totalBatches; i++) {
        const start = i * 60 + 1;
        const end = Math.min((i + 1) * 60, QUESTIONS.length);
        const option = document.createElement('option');
        option.value = (i+1).toString();
        option.text = `Paket Ujian ${i+1} (No ${start}-${end})`;
        select.appendChild(option);
    }
}

// --- SESSION LOGIC (QUIZ & MEM) ---
function startSession(type, indices) {
    state = {
        sessionType: type,
        orderIndices: shuffleArray(indices),
        current: 0,
        answers: Array(indices.length).fill(null),
        choicesPerQ: null
    };
    state.batch = state.orderIndices.map(i => QUESTIONS[i]);
    if(type === 'quiz') state.choicesPerQ = Logic.buildChoices(state.orderIndices, QUESTIONS);
    renderCurrent();
}

function renderCurrent() {
    if(!state) return;
    if(state.sessionType === 'quiz') UI.renderQuiz(state, state.current);
    else UI.renderMem(state, state.current);
}

// --- GLOBAL HANDLERS (Diperlukan oleh HTML onclick) ---
window.handleAnswer = (idx) => {
    state.answers[state.current] = idx;
    Storage.saveTemp(state);
    setTimeout(() => { if(state.current < state.batch.length - 1) { state.current++; renderCurrent(); } }, 200);
};
window.handleInput = (val) => { state.answers[state.current] = val; Storage.saveTemp(state); };
window.handleNext = () => { if(state.current < state.batch.length - 1) { state.current++; renderCurrent(); } };
window.handlePrev = () => { if(state.current > 0) { state.current--; renderCurrent(); } };
window.handleLupa = () => { state.answers[state.current] = 'Lupa'; Storage.saveTemp(state); window.handleNext(); };
window.handleNextOrSubmit = () => { if(state.current < state.batch.length - 1) window.handleNext(); else window.handleConfirm(); };

window.handleConfirm = () => {
    const answered = state.answers.filter(a => a!==null && a!=="").length;
    const summaryEl = document.getElementById('confirmSummary');
    if(summaryEl) summaryEl.innerText = `Terjawab: ${answered} / ${state.batch.length}`;
    
    const sendBtn = document.getElementById('confirmSend');
    if(sendBtn) {
        const newBtn = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(newBtn, sendBtn);
        newBtn.onclick = () => { confirmModal?.hide(); finishSession(); };
    }
    confirmModal?.show();
};

window.handleRetry = () => { state.answers.fill(null); state.current = 0; renderCurrent(); };
window.handleBack = () => { Storage.clearTemp(); window.location.href = 'index.html'; };

function finishSession() {
    const result = Logic.gradeSession(state, QUESTIONS);
    Storage.clearTemp();
    UI.renderResult(result, state.sessionType === 'quiz');
    hideStopButton();
}

// --- MANAJEMEN TOMBOL BERHENTI ---
function showStopButton() { document.getElementById('btn-stop-quiz')?.classList.remove('d-none'); }
function hideStopButton() { document.getElementById('btn-stop-quiz')?.classList.add('d-none'); }

window.executeStopQuiz = function() {
    const modalEl = document.getElementById('stopQuizModal');
    if(modalEl) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.hide();
    }
    finishSession(); 
};

// Start App
init();