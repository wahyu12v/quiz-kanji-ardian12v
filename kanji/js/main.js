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
        toggleMainBackButton(true);

        // Load data kanji
        const uniqueUrl = 'data/kanjiasli.json?v=' + new Date().getTime();
        const response  = await fetch(uniqueUrl);
        if (!response.ok) throw new Error("Gagal memuat data/kanjiasli.json");
        QUESTIONS = await response.json();

        const totalEl = document.getElementById('totalCount');
        if (totalEl) totalEl.innerText = QUESTIONS.length;

        generateCheckboxes('rangeListQuiz',   'q');
        generateCheckboxes('rangeListMem',    'm');
        generateCheckboxes('rangeListDaftar', 'd');

    } catch (e) {
        console.error("Error Loading:", e);
        alert("Gagal memuat kanjiasli.json. Pastikan file ada di folder data/ dan formatnya benar.");
        toggleMainBackButton(true);
    }
    setupEventListeners();
}

function setupModals() {
    quizModal        = new bootstrap.Modal(document.getElementById('quizModal'));
    memModal         = new bootstrap.Modal(document.getElementById('memModal'));
    confirmModal     = new bootstrap.Modal(document.getElementById('confirmModal'));
    daftarRangeModal = new bootstrap.Modal(document.getElementById('daftarRangeModal'));
    daftarListModal  = new bootstrap.Modal(document.getElementById('daftarHafalanModal'));
    progressModal    = new bootstrap.Modal(document.getElementById('progressModal'));

    const partEl = document.getElementById('partSelectionModal');
    if (partEl) partSelectionModal = new bootstrap.Modal(partEl);
}

function setupEventListeners() {
    document.getElementById('startBtn').onclick           = () => { pendingSessionType = 'quiz';          quizModal.show(); };
    document.getElementById('btnTebakCaraBaca').onclick   = () => { pendingSessionType = 'quiz_hiragana'; quizModal.show(); };
    document.getElementById('memorizeBtn').onclick        = () => { pendingSessionType = 'mem';           memModal.show();  };
    document.getElementById('btnTulisRomaji').onclick     = () => { pendingSessionType = 'write_romaji';  memModal.show();  };
    document.getElementById('daftarHafalanBtn').onclick   = () => { daftarRangeModal.show(); };

    document.getElementById('btnCekProgress').onclick = () => {
        const stats = Logic.calculateProgress(QUESTIONS);
        UI.renderProgressModal(stats);
        progressModal.show();
    };

    document.getElementById('quizForm').onsubmit = (e) => { e.preventDefault(); handleStart('rangeListQuiz'); };
    document.getElementById('memForm').onsubmit  = (e) => { e.preventDefault(); handleStart('rangeListMem');  };
    document.getElementById('btnShowList').onclick = () => renderDaftarList();

    setupCheckboxHelpers('selectAllQuiz',      'clearAllQuiz',      'rangeListQuiz');
    setupCheckboxHelpers('selectAllMem',        'clearAllMem',       'rangeListMem');
    setupCheckboxHelpers('btnDaftarSelectAll',  'btnDaftarReset',    'rangeListDaftar');

    document.getElementById('confirmSend').onclick = () => {
        confirmModal.hide();
        finishSession();
    };
}

function toggleMainBackButton(show) {
    const btnBack = document.getElementById('btn-main-back');
    if (btnBack) {
        if (show) btnBack.style.setProperty('display', 'flex', 'important');
        else      btnBack.style.setProperty('display', 'none', 'important');
    }
}


// ============================================================
// 2. LOGIKA SELEKSI LEVEL & PART
// ============================================================

function generateCheckboxes(containerId, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    if (!GLOBAL_SELECTIONS[containerId]) GLOBAL_SELECTIONS[containerId] = new Set();

    if (QUESTIONS.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3">Data kosong.</div>';
        return;
    }

    // Kelompokkan berdasarkan level (N5, N4, dst.)
    const uniqueLevels = [...new Set(QUESTIONS.map(item => item.level || "Lainnya"))].sort();
    container.className = 'range-grid-container';

    uniqueLevels.forEach((levelName, index) => {
        const count = QUESTIONS.filter(q => (q.level || "Lainnya") === levelName).length;

        const div = document.createElement('div');
        div.className = 'bab-selector-card';
        div.id = `${prefix}_btn_${index}`;
        div.onclick = () => window.openPartModal(levelName, containerId, prefix, index);

        div.innerHTML = `
            <strong>Level ${levelName}</strong>
            <span class="small text-muted mt-1">${count} Kanji</span>
            <span class="badge rounded-pill mt-2 d-none" id="${prefix}_badge_${index}" style="font-size:0.6rem; background: var(--teal, #0D9488); color: white;">0 Terpilih</span>
        `;
        container.appendChild(div);

        const indicesInLevel = [];
        QUESTIONS.forEach((q, idx) => { if ((q.level || "Lainnya") === levelName) indicesInLevel.push(idx); });
        window.updateBabUI(containerId, prefix, index, indicesInLevel);
    });
}

window.openPartModal = function(levelName, containerId, prefix, levelIndex) {
    const modalTitle     = document.getElementById('partModalTitle');
    const modalSubtitle  = document.getElementById('partModalSubtitle');
    const modalContainer = document.getElementById('partListContainer');
    if (!modalTitle || !modalContainer) return;

    modalTitle.innerText = `Level ${levelName}`;

    const indicesInLevel = [];
    QUESTIONS.forEach((q, idx) => { if ((q.level || "Lainnya") === levelName) indicesInLevel.push(idx); });

    const totalWords   = indicesInLevel.length;
    const MAX_PER_PART = 25;
    let totalParts = Math.ceil(totalWords / MAX_PER_PART);
    if (totalWords <= 35) totalParts = 1;

    if (modalSubtitle) modalSubtitle.innerText = `${totalWords} Kanji · ${totalParts} Bagian`;

    // Fungsi re-render grid (dipanggil ulang saat select all / reset)
    function renderGrid() {
        modalContainer.innerHTML = '';

        // Tombol aksi cepat
        const actionRow = document.createElement('div');
        actionRow.className = 'd-flex gap-2 mb-3';
        actionRow.innerHTML = `
            <button type="button" class="btn btn-sm btn-light border px-3 rounded-pill fw-medium flex-fill"
                    onclick="window._partSelectAll('${containerId}', [${indicesInLevel}], [${Array.from({length: totalParts}, (_, i) => i)}], ${totalWords}, ${MAX_PER_PART})">
                <i class="bi bi-check-all me-1"></i> Pilih Semua
            </button>
            <button type="button" class="btn btn-sm btn-light border px-3 rounded-pill fw-medium flex-fill"
                    onclick="window._partReset('${containerId}', [${indicesInLevel}])">
                <i class="bi bi-x-lg me-1"></i> Reset
            </button>
        `;
        modalContainer.appendChild(actionRow);

        // Grid kartu part
        const grid = document.createElement('div');
        grid.className = 'part-grid';

        for (let i = 0; i < totalParts; i++) {
            const start      = i * MAX_PER_PART;
            const end        = start + MAX_PER_PART;
            const chunk      = indicesInLevel.slice(start, end);
            const currentSet = GLOBAL_SELECTIONS[containerId];
            const isChecked  = chunk.some(idx => currentSet.has(idx));
            const partLabel  = totalParts > 1 ? `Part ${i + 1}` : `Full`;
            const count      = chunk.length;

            const card = document.createElement('div');
            card.className = `part-grid-card ${isChecked ? 'part-grid-card--active' : ''}`;
            card.id = `pgc_${containerId}_${i}`;
            card.innerHTML = `
                <input class="d-none" type="checkbox" id="chk_part_${containerId}_${i}"
                       ${isChecked ? 'checked' : ''}>
                <div class="part-grid-label">${partLabel}</div>
                <div class="part-grid-count">${count} Kanji</div>
            `;
            card.onclick = () => {
                const chk     = document.getElementById(`chk_part_${containerId}_${i}`);
                const nowCheck = !chk.checked;
                chk.checked   = nowCheck;
                const set     = GLOBAL_SELECTIONS[containerId];
                chunk.forEach(idx => { if (nowCheck) set.add(idx); else set.delete(idx); });

                // Update tampilan card ini saja
                card.classList.toggle('part-grid-card--active', nowCheck);
                card.querySelector('.part-grid-check').classList.toggle('invisible', !nowCheck);
            };
            grid.appendChild(card);
        }
        modalContainer.appendChild(grid);
    }

    // Helper: pilih semua part
    window._partSelectAll = function(cId, allIndices, partIndices, tw, maxPP) {
        const set = GLOBAL_SELECTIONS[cId];
        allIndices.forEach(idx => set.add(idx));
        renderGrid();
    };

    // Helper: reset semua part
    window._partReset = function(cId, allIndices) {
        const set = GLOBAL_SELECTIONS[cId];
        allIndices.forEach(idx => set.delete(idx));
        renderGrid();
    };

    renderGrid();

    const el = document.getElementById('partSelectionModal');
    const handler = () => {
        window.updateBabUI(containerId, prefix, levelIndex, indicesInLevel);
        el.removeEventListener('hidden.bs.modal', handler);
    };
    el.addEventListener('hidden.bs.modal', handler);
    partSelectionModal?.show();
}

window.togglePartSelection = function(containerId, isChecked, indicesArray) {
    const set = GLOBAL_SELECTIONS[containerId];
    indicesArray.forEach(idx => {
        if (isChecked) set.add(idx);
        else           set.delete(idx);
    });

    const checkbox = event.target;
    const icon  = checkbox.nextElementSibling.querySelector('.check-icon');
    const label = checkbox.nextElementSibling.querySelector('.part-option-label');

    if (isChecked) {
        icon.classList.remove('d-none');
        label.style.color      = '#0D9488';
        label.style.fontWeight = 'bold';
    } else {
        icon.classList.add('d-none');
        label.style.color      = '';
        label.style.fontWeight = 'normal';
    }
}

window.updateBabUI = function(containerId, prefix, levelIndex, indicesInLevel) {
    const set   = GLOBAL_SELECTIONS[containerId];
    const btn   = document.getElementById(`${prefix}_btn_${levelIndex}`);
    const badge = document.getElementById(`${prefix}_badge_${levelIndex}`);
    if (!btn || !badge) return;

    let countSelected = 0;
    indicesInLevel.forEach(idx => { if (set.has(idx)) countSelected++; });

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
    const btnAll   = document.getElementById(btnAllId);
    const btnClear = document.getElementById(btnClearId);

    if (btnAll) btnAll.onclick = () => {
        GLOBAL_SELECTIONS[containerId] = new Set(QUESTIONS.map((_, i) => i));
        const prefix = containerId === 'rangeListQuiz' ? 'q' : (containerId === 'rangeListMem' ? 'm' : 'd');
        generateCheckboxes(containerId, prefix);
    };

    if (btnClear) btnClear.onclick = () => {
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
        alert("Pilih setidaknya satu level atau part!");
        return;
    }
    quizModal.hide();
    memModal.hide();
    startSession(pendingSessionType, indices);
}

function startSession(type, indices) {
    toggleMainBackButton(false);

    const selectedQ = indices.map(i => QUESTIONS[i]);
    const shuffled  = shuffleArray([...selectedQ]);

    state = {
        sessionType:  type,
        batch:        shuffled,
        current:      0,
        answers:      new Array(shuffled.length).fill(null),
        orderIndices: indices
    };

    if (type.includes('quiz')) {
        const globalIndices = shuffled.map(q => QUESTIONS.indexOf(q));
        state.choicesPerQ   = Logic.buildChoices(globalIndices, QUESTIONS, type);
    }

    isAnim = false;
    renderCurrent();

    const btnStop = document.getElementById('btn-stop-quiz');
    if (btnStop) btnStop.classList.remove('d-none');
}

function renderCurrent() {
    if (state.sessionType.includes('quiz')) {
        UI.renderQuiz(state, state.current);
    } else {
        UI.renderMem(state, state.current);
    }
}

// --- EVENT HANDLERS ---

window.handleAnswer = (choiceIndex) => {
    if (isAnim) return;

    // 1. Simpan jawaban & update UI (highlight pilihan)
    state.answers[state.current] = choiceIndex;
    renderCurrent();

    // 2. Tunggu sebentar (beri waktu lihat highlight), lalu ganti soal
    isAnim = true;
    setTimeout(() => {
        if (state.current < state.batch.length - 1) {
            state.current++;
            renderCurrent(); // card-enter animation otomatis aktif
        } else {
            window.handleConfirm();
        }
        isAnim = false;
    }, 500); // 500ms: cukup untuk lihat highlight, tidak terasa lama
};

window.handleNext = () => {
    if (state.current < state.batch.length - 1) {
        state.current++;
        renderCurrent();
    }
};

window.handleNextOrSubmit = () => {
    if (state.current < state.batch.length - 1) window.handleNext();
    else window.handleConfirm();
};

window.handleInput = (text) => { state.answers[state.current] = text; };

window.handlePrev = () => {
    if (state.current > 0) {
        state.current--;
        renderCurrent();
    }
};

window.handleLupa = () => {
    state.answers[state.current] = "Lupa";
    window.handleNext();
};

window.handleConfirm = () => {
    let emptyCount = 0;
    state.answers.forEach(a => { if (a === null || a === undefined || a === "") emptyCount++; });

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
    const stopModal   = bootstrap.Modal.getInstance(stopModalEl);
    stopModal.hide();
    finishSession();
}

window.handleBack = () => {
    Storage.clearTemp();
    document.getElementById('quiz-area').innerHTML = '';
    document.location.reload();
};

function finishSession() {
    const result      = Logic.gradeSession(state, QUESTIONS);
    Storage.saveMastery(result.details, state.sessionType);

    const uniqueLevels = [...new Set(state.batch.map(item => item.level || "N5"))].sort();
    Storage.saveToHistory(result.score, result.total, state.sessionType, uniqueLevels.join(', '));

    const wrongIndices = [];
    result.details.forEach((item, i) => {
        if (!item.isCorrect || state.answers[i] === 'Lupa') {
            const originalIdx = QUESTIONS.indexOf(item.q);
            if (originalIdx !== -1) wrongIndices.push(originalIdx);
        }
    });

    Storage.clearTemp();
    UI.renderResult(result, state.sessionType, wrongIndices);

    const btnStop = document.getElementById('btn-stop-quiz');
    if (btnStop) btnStop.classList.add('d-none');
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
// 4. DAFTAR KANJI (VIEWER)
// ============================================================

function renderDaftarList() {
    const indices = window.getCheckedIndices('rangeListDaftar');
    if (indices.length === 0) return alert("Pilih minimal satu level.");

    daftarRangeModal?.hide();
    toggleMainBackButton(false);

    const listContainer = document.getElementById('daftarList');
    if (listContainer) {
        listContainer.innerHTML = '';
        listContainer.className = 'row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-3';

        indices.forEach(idx => {
            const item = QUESTIONS[idx];
            if (!item) return;

            const kanji    = String(item.Kanji    || '?').trim();
            const hiragana = String(item.Hiragana || '-').trim();
            const romaji   = String(item.Romaji   || '-').trim();
            const arti     = String(item.Arti     || '' ).trim();
            const type     = item.type  || '';
            const level    = item.level || '';

            const showHira = kanji !== hiragana;

            // Ukuran font berdasar panjang kanji
            let fontSizeClass = 'fs-1';
            if (kanji.length > 4)  fontSizeClass = 'fs-2';
            if (kanji.length > 6)  fontSizeClass = 'fs-3';
            if (kanji.length > 10) fontSizeClass = 'fs-5';

            // Badge warna per type
            const typeColorMap = {
                benda: 'background:#E0F2FE;color:#0369A1;',
                kerja: 'background:#DCFCE7;color:#15803D;',
                sifat: 'background:#FEF9C3;color:#A16207;'
            };
            const typeBadgeStyle = typeColorMap[type] || 'background:#F1F5F9;color:#475569;';

            const colDiv = document.createElement('div');
            colDiv.className = 'col';
            colDiv.innerHTML = `
                <div class="kotoba-card h-100 p-3 d-flex flex-column align-items-center text-center justify-content-center">
                    <div class="mb-1 w-100 d-flex justify-content-center gap-1 flex-wrap">
                        <span class="badge rounded-pill px-2 py-1" style="font-size:0.6rem;${typeBadgeStyle}">${type}</span>
                        <span class="badge-neon" style="font-size:0.6rem;">${level}</span>
                    </div>

                    <div class="k-char ${fontSizeClass}">${kanji}</div>

                    <div class="w-100">
                        ${showHira ? `<div class="k-read">${hiragana}</div>` : ''}
                        <div class="k-romaji">${romaji}</div>
                    </div>

                    <div class="k-mean">${arti}</div>
                </div>`;
            listContainer.appendChild(colDiv);
        });
    }
    setTimeout(() => { daftarListModal?.show(); }, 300);
}

window.onload = init;
