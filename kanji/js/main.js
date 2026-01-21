import { BATCH_SIZE, KEYS } from './constants.js'; 
import { shuffleArray, hiraToRomaji } from './utils.js'; // TAMBAHAN: Import hiraToRomaji
import * as Storage from './storage.js';
import * as Logic from './logic.js';
import * as UI from './ui.js';

let QUESTIONS = [];
let state = null; 
let quizModal, memModal, confirmModal, daftarRangeModal, daftarListModal, progressModal;
let pendingSessionType = 'quiz'; 

async function init() {
    try {
        setupModals();
        toggleMainBackButton(true); 
        
        // Cache busting untuk memastikan data selalu fresh
        const uniqueUrl = 'data/kanjiasli.json?v=' + new Date().getTime();
        const response = await fetch(uniqueUrl);
        if(!response.ok) throw new Error("Gagal memuat data/kanjiasli.json");
        QUESTIONS = await response.json();
        
        const totalEl = document.getElementById('totalCount');
        if(totalEl) totalEl.innerText = QUESTIONS.length;
        
        generateCheckboxes('rangeListQuiz', 'q_cb');
        generateCheckboxes('rangeListMem', 'm_cb');
        generateCheckboxes('rangeListDaftar', 'd_cb'); 

    } catch(e) { 
        console.error("Error Loading:", e); 
        toggleMainBackButton(true);
    }
    setupEventListeners();
}

function toggleMainBackButton(show) {
    const btnBack = document.getElementById('btn-main-back');
    if (btnBack) {
        if (show) btnBack.classList.remove('d-none');
        else btnBack.classList.add('d-none');
    }
}

function showStopButton() { 
    const btnStop = document.getElementById('btn-stop-quiz');
    if(btnStop) btnStop.classList.remove('d-none'); 
    toggleMainBackButton(false);
}

function hideStopButton() { 
    const btnStop = document.getElementById('btn-stop-quiz');
    if(btnStop) btnStop.classList.add('d-none'); 
    toggleMainBackButton(true);
}

function setupModals() {
    const getModal = (id) => document.getElementById(id) ? new bootstrap.Modal(document.getElementById(id)) : null;
    quizModal = getModal('quizModal');
    memModal = getModal('memModal');
    confirmModal = getModal('confirmModal');
    daftarRangeModal = getModal('daftarRangeModal');
    daftarListModal = getModal('daftarHafalanModal');
    progressModal = getModal('progressModal');
    
    const daftarEl = document.getElementById('daftarHafalanModal');
    if(daftarEl) {
        daftarEl.addEventListener('hidden.bs.modal', () => { toggleMainBackButton(true); });
    }
    const progEl = document.getElementById('progressModal');
    if(progEl) {
        progEl.addEventListener('hidden.bs.modal', () => { toggleMainBackButton(true); });
    }
}

function setupEventListeners() {
    const bindClick = (id, modal, type) => {
        const btn = document.getElementById(id);
        if(btn) btn.onclick = () => {
            pendingSessionType = type; 
            if(id === 'startBtn') document.querySelector('#quizModal .modal-title').innerText = "Mulai Tebak Arti Kanji";
            if(id === 'btnTebakHiragana') document.querySelector('#quizModal .modal-title').innerText = "Mulai Tebak Cara Baca";
            if(id === 'memorizeBtn') document.querySelector('#memModal .modal-title').innerText = "Mulai Tulis Arti Kanji";
            if(id === 'btnTulisRomaji') document.querySelector('#memModal .modal-title').innerText = "Mulai Tulis Cara Baca";
            modal?.show();
        };
    };

    bindClick('startBtn', quizModal, 'quiz');
    bindClick('memorizeBtn', memModal, 'mem');
    bindClick('btnTebakHiragana', quizModal, 'quiz_hiragana');
    bindClick('btnTulisRomaji', memModal, 'write_romaji');
    bindClick('daftarHafalanBtn', daftarRangeModal, null); 
    
    const btnProg = document.getElementById('btnCekProgress');
    if(btnProg) {
        btnProg.onclick = () => {
            toggleMainBackButton(false);
            const stats = Logic.calculateProgress(QUESTIONS);
            UI.renderProgressModal(stats);
            progressModal?.show();
        };
    }
    
    setupCheckboxHelpers('selectAllQuiz', 'clearAllQuiz', 'rangeListQuiz');
    setupCheckboxHelpers('selectAllMem', 'clearAllMem', 'rangeListMem');
    setupCheckboxHelpers('btnDaftarSelectAll', 'btnDaftarReset', 'rangeListDaftar');

    const handleForm = (id, listId, modal) => {
        const form = document.getElementById(id);
        if(form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const indices = getCheckedIndices(listId);
                if(indices.length === 0) return alert("Pilih minimal satu paket!");
                
                modal?.hide();
                showStopButton(); 

                setTimeout(() => {
                    startSession(pendingSessionType, indices);
                }, 100);
            };
        }
    };

    handleForm('quizForm', 'rangeListQuiz', quizModal);
    handleForm('memForm', 'rangeListMem', memModal);

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

    const chunkSize = 20; 
    const totalChunks = Math.ceil(QUESTIONS.length / chunkSize);

    for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, QUESTIONS.length);
        const count = end - start;
        const label = `No. ${start + 1} - ${end}`;

        const div = document.createElement('div');
        div.className = 'form-check position-relative'; 
        
        div.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${i}" id="${prefix}_${i}" data-start="${start}" data-end="${end}">
            <label class="form-check-label w-100 stretched-link" for="${prefix}_${i}">
                <strong>${label}</strong> <br>
                <span class="small text-muted">${count} Kanji</span>
            </label>
        `;
        container.appendChild(div);
    }
}

// --- FUNGSI RENDER DAFTAR (DIPERBARUI: ADA ROMAJI) ---
function renderDaftarList() {
    const indices = getCheckedIndices('rangeListDaftar');
    if(indices.length === 0) return alert("Pilih minimal satu paket.");
    daftarRangeModal?.hide();
    toggleMainBackButton(false);

    const listContainer = document.getElementById('daftarList');
    if(listContainer) {
        listContainer.innerHTML = '';
        listContainer.className = 'kanji-list-grid'; // Pakai class Grid CSS kita

        indices.forEach(idx => {
            const item = QUESTIONS[idx];
            if(!item) return;
            
            const kanji = String(item[KEYS.kanji] || '?').trim();
            const kana = String(item[KEYS.hiragana] || '-').trim();
            const arti = String(item[KEYS.meaning] || '').trim();
            
            // Generate Romaji Otomatis
            const romaji = hiraToRomaji(kana);

            const paketNum = Math.floor(idx / 20) + 1;

            const colDiv = document.createElement('div');
            colDiv.className = 'kanji-card-small'; // Pakai class Card CSS kita
            colDiv.innerHTML = `
                <div class="mb-2"><span class="badge rounded-pill">Paket ${paketNum}</span></div>
                <div class="k-char">${kanji}</div>
                
                <div class="w-100">
                    <div class="k-read">${kana}</div>
                    <div class="k-romaji small fst-italic" style="margin-bottom: 5px;">${romaji}</div>
                    
                    <div class="k-mean">${arti}</div>
                </div>
            `;
            listContainer.appendChild(colDiv);
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

window.getCheckedIndices = function(containerId) {
    const checkedBoxes = document.querySelectorAll(`#${containerId} input[type=checkbox]:checked`);
    let allIndices = [];

    checkedBoxes.forEach(cb => {
        const start = parseInt(cb.getAttribute('data-start'));
        const end = parseInt(cb.getAttribute('data-end'));
        for (let i = start; i < end; i++) {
            allIndices.push(i);
        }
    });

    return allIndices;
}

function startSession(type, indices) {
    state = { sessionType: type, orderIndices: shuffleArray(indices), current: 0, answers: Array(indices.length).fill(null), choicesPerQ: null };
    state.batch = state.orderIndices.map(i => QUESTIONS[i]);
    
    if(type === 'quiz' || type === 'quiz_hiragana') {
        state.choicesPerQ = Logic.buildChoices(state.orderIndices, QUESTIONS, type);
    }
    renderCurrent();
}

function renderCurrent() {
    if(!state) return;
    if(state.sessionType === 'quiz' || state.sessionType === 'quiz_hiragana') {
        UI.renderQuiz(state, state.current);
    } else {
        UI.renderMem(state, state.current);
    }
}

window.handleAnswer = (idx) => { 
    state.answers[state.current] = idx; 
    Storage.saveTemp(state);
    renderCurrent(); 
    setTimeout(() => { 
        if(state.current < state.batch.length - 1) { 
            state.current++; 
            renderCurrent(); 
        } 
    }, 200); 
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
    Storage.saveMastery(result.details, state.sessionType);

    const usedPackets = new Set();
    state.batch.forEach(item => {
        const idx = QUESTIONS.indexOf(item);
        if(idx >= 0) {
            const pkt = Math.floor(idx / 20) + 1;
            usedPackets.add(`Paket ${pkt}`);
        }
    });
    
    const sortedPackets = [...usedPackets].sort((a, b) => {
        const numA = parseInt(a.replace('Paket ', ''));
        const numB = parseInt(b.replace('Paket ', ''));
        return numA - numB;
    });
    const packagesStr = sortedPackets.join(', ');

    Storage.saveToHistory(result.score, result.total, state.sessionType, packagesStr);
    
    const wrongIndices = [];
    result.details.forEach((item, i) => {
        if (!item.isCorrect || state.answers[i] === 'Lupa') {
            wrongIndices.push(state.orderIndices[i]);
        }
    });

    Storage.clearTemp();
    UI.renderResult(result, state.sessionType, wrongIndices);
    
    const btnStop = document.getElementById('btn-stop-quiz');
    if(btnStop) btnStop.classList.add('d-none'); 
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