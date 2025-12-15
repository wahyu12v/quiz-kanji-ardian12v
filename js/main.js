import { BATCH_SIZE, SELECTORS } from './constants.js';
import { shuffleArray } from './utils.js';
import * as Storage from './storage.js';
import * as Logic from './logic.js';
import * as UI from './ui.js';

let QUESTIONS = [];
let state = null; 

// --- BOOTSTRAP INIT ---
const quizModal = new bootstrap.Modal(document.getElementById('quizModal'));
const memModal = new bootstrap.Modal(document.getElementById('memModal'));
const confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));

// --- INITIALIZATION ---
async function init() {
    try {
        // 1. Fetch Data
        QUESTIONS = await fetch('questions.json').then(r => r.json());
        
        // 2. Tampilkan Total Data di Hero Section
        const totalEl = document.getElementById('totalCount');
        if(totalEl) totalEl.innerText = QUESTIONS.length;
        
        // 3. Generate Checkbox Kartu untuk Quiz & Hafalan
        generateCheckboxes('rangeListQuiz', 'q_cb');
        generateCheckboxes('rangeListMem', 'm_cb');
        
    } catch(e) { 
        console.error("Gagal load data questions.json", e);
    }
    
    // --- EVENT LISTENERS ---
    
    // Tombol Utama di Halaman Depan
    document.getElementById('startBtn').onclick = () => quizModal.show();
    document.getElementById('memorizeBtn').onclick = () => memModal.show();
    
    // Tombol Helper (Pilih Semua / Reset) di dalam Modal
    setupCheckboxHelpers('selectAllQuiz', 'clearAllQuiz', 'rangeListQuiz');
    setupCheckboxHelpers('selectAllMem', 'clearAllMem', 'rangeListMem');

    // Submit Form Quiz
    document.getElementById('quizForm').onsubmit = (e) => {
        e.preventDefault();
        const indices = getCheckedIndices('rangeListQuiz');
        if(indices.length === 0) return alert("Pilih minimal satu paket soal!");
        
        startSession('quiz', indices);
        quizModal.hide();
    };
    
    // Submit Form Hafalan
    document.getElementById('memForm').onsubmit = (e) => {
        e.preventDefault();
        const indices = getCheckedIndices('rangeListMem');
        if(indices.length === 0) return alert("Pilih minimal satu paket soal!");

        startSession('mem', indices);
        memModal.hide();
    };
}

// --- LOGIC GENERATE CHECKBOX KARTU ---
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
    
    if(btnAll) {
        btnAll.onclick = () => {
            document.querySelectorAll(`#${containerId} input[type=checkbox]`).forEach(cb => cb.checked = true);
        };
    }
    if(btnClear) {
        btnClear.onclick = () => {
            document.querySelectorAll(`#${containerId} input[type=checkbox]`).forEach(cb => cb.checked = false);
        };
    }
}

function getCheckedIndices(containerId) {
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

// --- SESSION MANAGEMENT ---
function startSession(type, indices) {
    state = {
        sessionType: type,
        orderIndices: shuffleArray(indices),
        current: 0,
        answers: Array(indices.length).fill(null),
        choicesPerQ: null
    };
    
    state.batch = state.orderIndices.map(i => QUESTIONS[i]);
    
    if(type === 'quiz') {
        state.choicesPerQ = Logic.buildChoices(state.orderIndices, QUESTIONS);
    }

    renderCurrent();
}

function renderCurrent() {
    if(!state) return;
    if(state.sessionType === 'quiz') {
        UI.renderQuiz(state, state.current);
    } else {
        UI.renderMem(state, state.current);
    }
}

// --- GLOBAL HANDLERS ---

window.handleAnswer = (idx) => {
    state.answers[state.current] = idx;
    Storage.saveTemp(state);
    setTimeout(() => {
        if(state.current < state.batch.length - 1) { 
            state.current++; 
            renderCurrent(); 
        }
    }, 200);
};

window.handleInput = (val) => {
    state.answers[state.current] = val;
    Storage.saveTemp(state);
};

window.handleNext = () => {
    if(state.current < state.batch.length - 1) { 
        state.current++; 
        renderCurrent(); 
    }
};

window.handlePrev = () => {
    if(state.current > 0) { 
        state.current--; 
        renderCurrent(); 
    }
};

window.handleLupa = () => {
    state.answers[state.current] = 'Lupa';
    Storage.saveTemp(state);
    window.handleNext();
};

window.handleNextOrSubmit = () => {
    if(state.current < state.batch.length - 1) window.handleNext();
    else window.handleConfirm();
};

window.handleConfirm = () => {
    const answered = state.answers.filter(a => a!==null && a!=="").length;
    document.getElementById('confirmSummary').innerText = `Terjawab: ${answered} / ${state.batch.length}`;
    
    const sendBtn = document.getElementById('confirmSend');
    const newBtn = sendBtn.cloneNode(true);
    sendBtn.parentNode.replaceChild(newBtn, sendBtn);
    
    newBtn.onclick = () => {
        confirmModal.hide();
        finishSession();
    };
    
    confirmModal.show();
};

window.handleRetry = () => {
    state.answers.fill(null);
    state.current = 0;
    renderCurrent();
};

// --- UPDATE DI SINI: FUNGSI KEMBALI KE MENU ---
window.handleBack = () => {
    // Hapus data sementara agar bersih
    Storage.clearTemp();
    
    // Redirect langsung ke index.html (Reload halaman)
    window.location.href = 'index.html';
};

// --- FINISH SESSION ---
function finishSession() {
    const result = Logic.gradeSession(state, QUESTIONS);
    Storage.clearTemp();
    UI.renderResult(result, state.sessionType === 'quiz');
}

init();