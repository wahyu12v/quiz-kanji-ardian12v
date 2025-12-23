import { BATCH_SIZE } from './constants.js';
import { shuffleArray } from './utils.js';
import * as Storage from './storage.js';
import * as Logic from './logic.js';
import * as UI from './ui.js';
// IMPORT BARU: Story Mode
import * as Story from './story.js'; 

let QUESTIONS = [];
let state = null; 
let quizModal, memModal, confirmModal, daftarRangeModal, daftarListModal, storyModal;

async function init() {
    try {
        setupModals();

        // 1. Fetch Data
        const uniqueUrl = 'kanjiasli.json?v=' + new Date().getTime();
        const response = await fetch(uniqueUrl);
        if(!response.ok) throw new Error("File kanjiasli.json tidak ditemukan!");
        QUESTIONS = await response.json();
        
        // 2. Update Total
        const totalEl = document.getElementById('totalCount');
        if(totalEl) totalEl.innerText = QUESTIONS.length;
        
        // 3. Generate Checkboxes
        generateCheckboxes('rangeListQuiz', 'q_cb');
        generateCheckboxes('rangeListMem', 'm_cb');
        generateCheckboxes('rangeListDaftar', 'd_cb'); 

        // 4. Update JFT
        updateJftDropdown();

        // 5. INIT STORY MODE (Kirim data pertanyaan ke story.js)
        Story.initStoryMode(QUESTIONS);
        
    } catch(e) { console.error("Error Loading:", e); }
    
    setupEventListeners();
}

function setupModals() {
    const getModal = (id) => document.getElementById(id) ? new bootstrap.Modal(document.getElementById(id)) : null;
    quizModal = getModal('quizModal');
    memModal = getModal('memModal');
    confirmModal = getModal('confirmModal');
    daftarRangeModal = getModal('daftarRangeModal');
    daftarListModal = getModal('daftarHafalanModal');
    // Init Modal Story
    storyModal = getModal('storyModal');
}

function setupEventListeners() {
    const bindClick = (id, modal) => {
        const btn = document.getElementById(id);
        if(btn) btn.onclick = () => modal?.show();
    };

    bindClick('startBtn', quizModal);
    bindClick('memorizeBtn', memModal);
    bindClick('daftarHafalanBtn', daftarRangeModal);
    // Bind Tombol Story
    bindClick('storyBtn', storyModal);
    
    setupCheckboxHelpers('selectAllQuiz', 'clearAllQuiz', 'rangeListQuiz');
    setupCheckboxHelpers('selectAllMem', 'clearAllMem', 'rangeListMem');
    setupCheckboxHelpers('btnDaftarSelectAll', 'btnDaftarReset', 'rangeListDaftar');

    const handleForm = (id, type, listId, modal) => {
        const form = document.getElementById(id);
        if(form) {
            form.onsubmit = (e) => {
                e.preventDefault();
                const indices = getCheckedIndices(listId);
                if(indices.length === 0) return alert("Pilih minimal satu paket!");
                startSession(type, indices);
                modal?.hide();
                showStopButton();
            };
        }
    };

    handleForm('quizForm', 'quiz', 'rangeListQuiz', quizModal);
    handleForm('memForm', 'mem', 'rangeListMem', memModal);

    const btnShowList = document.getElementById('btnShowList');
    if(btnShowList) btnShowList.onclick = () => renderDaftarList();
}

// ... (SISA KODE main.js SAMA SEPERTI SEBELUMNYA, TIDAK PERLU DIUBAH) ...
// (Function updateJftDropdown, generateCheckboxes, renderDaftarList, dll, biarkan sama)
// ...
// ...

function updateJftDropdown() {
    const select = document.getElementById('examPackageSelect');
    if(!select) return;
    select.innerHTML = ''; 
    for(let i=1; i<=10; i++) {
        const option = document.createElement('option');
        option.value = i.toString();
        option.text = `Paket Ujian ${i}`;
        select.appendChild(option);
    }
}

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
        div.innerHTML = `<input class="form-check-input" type="checkbox" value="${i}" id="${prefix}_${i}"><label class="form-check-label w-100 stretched-link" for="${prefix}_${i}"><strong>Paket ${i+1}</strong> <br><span class="small text-muted">No ${start}-${end}</span></label>`;
        container.appendChild(div);
    }
}

function renderDaftarList() {
    const indices = getCheckedIndices('rangeListDaftar');
    if(indices.length === 0) return alert("Pilih minimal satu paket.");
    daftarRangeModal?.hide();
    const listContainer = document.getElementById('daftarList');
    if(listContainer) {
        listContainer.innerHTML = '';
        indices.forEach(idx => {
            const item = QUESTIONS[idx];
            if(!item) return;
            const card = document.createElement('div');
            card.className = 'kanji-card-small shadow-sm'; 
            card.innerHTML = `<div class="k-char">${item.Kanji || item.kanji || '?'}</div><div class="k-info"><div class="k-read text-dark">${item.Hiragana || item.hiragana || '-'}</div><div class="k-mean text-muted small">${item.Arti || item.arti || item.meaning || ''}</div></div>`;
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
window.handleBack = () => { Storage.clearTemp(); window.location.href = 'index.html'; };

function finishSession() {
    const result = Logic.gradeSession(state, QUESTIONS);
    Storage.clearTemp();
    UI.renderResult(result, state.sessionType === 'quiz');
    hideStopButton();
}
function showStopButton() { document.getElementById('btn-stop-quiz')?.classList.remove('d-none'); }
function hideStopButton() { document.getElementById('btn-stop-quiz')?.classList.add('d-none'); }
window.executeStopQuiz = function() {
    const modalEl = document.getElementById('stopQuizModal');
    if(modalEl) { const m = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl); m.hide(); }
    finishSession(); 
};

init();