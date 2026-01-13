import { shuffleArray } from './utils.js';
import * as Storage from './storage.js';
import * as Logic from './logic.js';
import * as UI from './ui.js';

let QUESTIONS = [];
let UNIQUE_BABS = []; 
let state = null; 
let quizModal, memModal, confirmModal, daftarRangeModal, daftarListModal;

async function init() {
    try {
        setupModals();
        
        // --- VISIBILITY DEFAULT ---
        // Saat awal buka (Home), tombol Kembali MUNCUL
        toggleMainBackButton(true);

        const uniqueUrl = 'data/data.json?v=' + new Date().getTime();
        const response = await fetch(uniqueUrl);
        
        if(!response.ok) throw new Error(`Gagal memuat ${uniqueUrl}`);
        
        QUESTIONS = await response.json();
        UNIQUE_BABS = [...new Set(QUESTIONS.map(item => item.bab))];

        const totalEl = document.getElementById('totalCount');
        if(totalEl) totalEl.innerText = QUESTIONS.length;
        
        generateCheckboxes('rangeListQuiz', 'q_cb');
        generateCheckboxes('rangeListMem', 'm_cb');
        generateCheckboxes('rangeListDaftar', 'd_cb'); 

    } catch(e) { 
        console.error("Error Loading:", e);
        const area = document.getElementById('quiz-area');
        if(area) area.innerHTML = `<div class="alert alert-danger">Gagal memuat data. Pastikan Live Server aktif.</div>`;
    }
    setupEventListeners();
}

// --- HELPER UNTUK MENGATUR TOMBOL POJOK KANAN ---
function toggleMainBackButton(show) {
    const btnBack = document.getElementById('btn-main-back');
    if (btnBack) {
        if (show) btnBack.classList.remove('d-none');
        else btnBack.classList.add('d-none');
    }
}

function showStopButton() { 
    document.getElementById('btn-stop-quiz')?.classList.remove('d-none');
    // Jika tombol Stop muncul, tombol Kembali harus HILANG
    toggleMainBackButton(false); 
}

function hideStopButton() { 
    document.getElementById('btn-stop-quiz')?.classList.add('d-none');
    // Tombol Stop hilang (berarti selesai/di menu), tombol Kembali MUNCUL LAGI
    // Kecuali jika kita masih di halaman hasil, tapi biasanya dianggap 'selesai'.
    // Kita handle di handleBack() untuk pastinya.
}

function setupModals() {
    const getModal = (id) => document.getElementById(id) ? new bootstrap.Modal(document.getElementById(id)) : null;
    quizModal = getModal('quizModal');
    memModal = getModal('memModal');
    confirmModal = getModal('confirmModal');
    daftarRangeModal = getModal('daftarRangeModal');
    daftarListModal = getModal('daftarHafalanModal');

    // Event Listener Khusus: Saat Modal Daftar Ditutup, Munculkan tombol Kembali lagi
    const daftarModalEl = document.getElementById('daftarHafalanModal');
    if(daftarModalEl) {
        daftarModalEl.addEventListener('hidden.bs.modal', () => {
            toggleMainBackButton(true);
        });
    }
}

function setupEventListeners() {
    const bindClick = (id, modal) => {
        const btn = document.getElementById(id);
        if(btn) btn.onclick = () => modal?.show();
    };

    bindClick('startBtn', quizModal);       
    bindClick('memorizeBtn', memModal);     
    bindClick('daftarHafalanBtn', daftarRangeModal); 
    
    setupCheckboxHelpers('selectAllQuiz', 'clearAllQuiz', 'rangeListQuiz');
    setupCheckboxHelpers('selectAllMem', 'clearAllMem', 'rangeListMem');
    setupCheckboxHelpers('btnDaftarSelectAll', 'btnDaftarReset', 'rangeListDaftar');

    const handleForm = (id, type, listId, modal) => {
        const form = document.getElementById(id);
        if(form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const indices = getCheckedIndices(listId);
                if(indices.length === 0) return alert("Pilih minimal satu Bab!");
                
                // MULAI SESI
                startSession(type, indices);
                modal?.hide();
                
                // ATUR TOMBOL: Munculkan Stop, Sembunyikan Kembali
                showStopButton();
            };
        }
    };

    handleForm('quizForm', 'quiz', 'rangeListQuiz', quizModal);
    handleForm('memForm', 'mem', 'rangeListMem', memModal);

    const btnShowList = document.getElementById('btnShowList');
    if(btnShowList) btnShowList.onclick = () => renderDaftarList();
}

function generateCheckboxes(containerId, prefix) {
    const container = document.getElementById(containerId);
    if(!container) return; 
    container.innerHTML = '';
    
    if (QUESTIONS.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3">Data kosong.</div>';
        return;
    }

    UNIQUE_BABS.forEach((babName, index) => {
        const count = QUESTIONS.filter(q => q.bab === babName).length;
        const div = document.createElement('div');
        div.className = 'form-check position-relative'; 
        div.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${index}" id="${prefix}_${index}">
            <label class="form-check-label w-100 stretched-link" for="${prefix}_${index}">
                <strong>${babName}</strong>
                <span class="small text-muted">${count} Kata</span>
            </label>
        `;
        container.appendChild(div);
    });
}

window.getCheckedIndices = function(containerId) {
    const checkedBoxes = document.querySelectorAll(`#${containerId} input[type=checkbox]:checked`);
    let allIndices = [];
    const selectedBabNames = Array.from(checkedBoxes).map(cb => UNIQUE_BABS[parseInt(cb.value)]);
    QUESTIONS.forEach((item, index) => {
        if (selectedBabNames.includes(item.bab)) {
            allIndices.push(index);
        }
    });
    return allIndices;
}

// --- LOGIKA DAFTAR KOTOBA ---
function renderDaftarList() {
    const indices = getCheckedIndices('rangeListDaftar');
    if(indices.length === 0) return alert("Pilih minimal satu paket.");
    
    daftarRangeModal?.hide();
    
    // SAAT LIHAT DATA: Sembunyikan Tombol Kembali (Sesuai Request)
    toggleMainBackButton(false);

    const listContainer = document.getElementById('daftarList');
    if(listContainer) {
        listContainer.innerHTML = '';
        indices.forEach(idx => {
            const item = QUESTIONS[idx];
            if(!item) return;
            const card = document.createElement('div');
            card.className = 'kanji-card-small shadow-sm text-center p-2'; 
            card.innerHTML = `
                <div class="mb-1"><span class="badge bg-light text-dark border">${item.bab || '-'}</span></div>
                <div class="k-char fw-bold text-primary">${item.jepang || '?'}</div>
                <div class="k-info">
                    <div class="k-read text-dark fw-bold">${item.kana || '-'}</div>
                    <div class="k-romaji text-danger fw-bold" style="font-size: 0.9rem; margin: 2px 0;">
                        ${item.romaji || '-'}
                    </div>
                    <div class="k-mean text-secondary small border-top pt-1 mt-1">${item.indo || ''}</div>
                </div>`;
            listContainer.appendChild(card);
        });
    }
    setTimeout(() => { daftarListModal?.show(); }, 300);
}

function setupCheckboxHelpers(btnAllId, btnClearId, containerId) {
    const btnAll = document.getElementById(btnAllId);
    const btnClear = document.getElementById(btnClearId);
    if(btnAll) btnAll.onclick = () => document.querySelectorAll(`#${containerId} input[type=checkbox]`).forEach(cb => cb.checked = true);
    if(btnClear) btnClear.onclick = () => document.querySelectorAll(`#${containerId} input[type=checkbox]`).forEach(cb => cb.checked = false);
}

function startSession(type, indices) {
    state = { sessionType: type, orderIndices: shuffleArray(indices), current: 0, answers: Array(indices.length).fill(null), choicesPerQ: null };
    state.batch = state.orderIndices.map(i => QUESTIONS[i]);
    if(type === 'quiz') state.choicesPerQ = Logic.buildChoices(state.orderIndices, QUESTIONS);
    renderCurrent();
}

function renderCurrent() {
    if(!state) return;
    if(state.sessionType === 'quiz') UI.renderQuiz(state, state.current);
    else UI.renderMem(state, state.current);
}

window.handleAnswer = (idx) => { state.answers[state.current] = idx; Storage.saveTemp(state); setTimeout(() => { if(state.current < state.batch.length - 1) { state.current++; renderCurrent(); } }, 200); };
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

// SAAT KLIK 'MENU UTAMA' (KEMBALI KE HOME)
window.handleBack = () => { 
    Storage.clearTemp(); 
    window.location.href = 'index.html'; // Refresh halaman
    // Secara teknis halaman reload, jadi tombol kembali akan muncul otomatis via init()
};

function finishSession() {
    const result = Logic.gradeSession(state, QUESTIONS);
    Storage.saveToHistory(result.score, result.total, state.sessionType);
    
    const wrongIndices = [];
    result.details.forEach((item, i) => {
        if (!item.isCorrect || state.answers[i] === 'Lupa') {
            wrongIndices.push(state.orderIndices[i]);
        }
    });

    Storage.clearTemp();
    UI.renderResult(result, state.sessionType === 'quiz', wrongIndices);
    hideStopButton(); 
    // Catatan: Di halaman Hasil, tombol Kembali belum muncul (karena belum di Home).
    // Tombol baru muncul saat user klik "Menu Utama".
}

window.handleRetryWrong = (indices) => {
    if (!indices || indices.length === 0) return;
    startSession(state.sessionType, indices);
    showStopButton(); 
};

window.executeStopQuiz = function() {
    const modalEl = document.getElementById('stopQuizModal');
    if(modalEl) { const m = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl); m.hide(); }
    finishSession(); 
};

init();