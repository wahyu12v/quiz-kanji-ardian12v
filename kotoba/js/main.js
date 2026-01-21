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

// Penyimpanan Pilihan User (Setiap mode punya set index sendiri)
// Format: { 'rangeListQuiz': Set([1,2,3]), 'rangeListMem': Set([...]) }
const GLOBAL_SELECTIONS = {}; 

// ============================================================
// 1. INISIALISASI
// ============================================================
async function init() {
    try {
        setupModals();
        toggleMainBackButton(true); 
        
        // Load Data dengan cache busting agar selalu fresh
        const uniqueUrl = 'data/data.json?v=' + new Date().getTime();
        const response = await fetch(uniqueUrl);
        if(!response.ok) throw new Error("Gagal memuat data/data.json");
        QUESTIONS = await response.json();
        
        // Update Total Kosakata di UI
        const totalEl = document.getElementById('totalCount');
        if(totalEl) totalEl.innerText = QUESTIONS.length;
        
        // Generate Tampilan Awal (Grid Bab)
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
    // Inisialisasi semua modal Bootstrap
    quizModal = new bootstrap.Modal(document.getElementById('quizModal'));
    memModal = new bootstrap.Modal(document.getElementById('memModal'));
    confirmModal = new bootstrap.Modal(document.getElementById('confirmModal'));
    daftarRangeModal = new bootstrap.Modal(document.getElementById('daftarRangeModal'));
    daftarListModal = new bootstrap.Modal(document.getElementById('daftarHafalanModal'));
    progressModal = new bootstrap.Modal(document.getElementById('progressModal'));
    
    // Modal Part Baru
    const partEl = document.getElementById('partSelectionModal');
    if(partEl) partSelectionModal = new bootstrap.Modal(partEl);
}

function setupEventListeners() {
    // Tombol Menu Utama
    document.getElementById('startBtn').onclick = () => { pendingSessionType = 'quiz'; quizModal.show(); };
    document.getElementById('btnTebakHiragana').onclick = () => { pendingSessionType = 'quiz_hiragana'; quizModal.show(); };
    document.getElementById('memorizeBtn').onclick = () => { pendingSessionType = 'mem'; memModal.show(); };
    document.getElementById('btnTulisRomaji').onclick = () => { pendingSessionType = 'write_romaji'; memModal.show(); };
    document.getElementById('daftarHafalanBtn').onclick = () => { daftarRangeModal.show(); };

    // Tombol Progress
    document.getElementById('btnCekProgress').onclick = () => {
        const stats = Logic.calculateProgress(QUESTIONS);
        UI.renderProgressModal(stats);
        progressModal.show();
    };

    // Tombol di dalam Modal (Start / Tampilkan)
    document.getElementById('quizForm').onsubmit = (e) => { e.preventDefault(); handleStart('rangeListQuiz'); };
    document.getElementById('memForm').onsubmit = (e) => { e.preventDefault(); handleStart('rangeListMem'); };
    document.getElementById('btnShowList').onclick = () => renderDaftarList();

    // Tombol Select All / Reset
    setupCheckboxHelpers('selectAllQuiz', 'clearAllQuiz', 'rangeListQuiz');
    setupCheckboxHelpers('selectAllMem', 'clearAllMem', 'rangeListMem');
    setupCheckboxHelpers('btnDaftarSelectAll', 'btnDaftarReset', 'rangeListDaftar');

    // Tombol Konfirmasi Selesai
    document.getElementById('confirmSend').onclick = () => {
        confirmModal.hide();
        finishSession();
    };
}

function toggleMainBackButton(show) {
    const btnBack = document.getElementById('btn-main-back');
    if(btnBack) btnBack.style.display = show ? 'flex' : 'none';
}

// ============================================================
// 2. LOGIKA SELEKSI BAB & PART (SISTEM BARU)
// ============================================================

// A. Generate Tombol Bab (Grid)
function generateCheckboxes(containerId, prefix) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    // Siapkan penyimpanan set untuk container ini
    if (!GLOBAL_SELECTIONS[containerId]) {
        GLOBAL_SELECTIONS[containerId] = new Set();
    }

    if (QUESTIONS.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3">Data kosong.</div>';
        return;
    }

    // Ambil Bab Unik
    const uniqueBabs = [...new Set(QUESTIONS.map(item => item.bab || "Lainnya"))];

    // Reset container class agar jadi grid
    container.className = 'range-grid-container'; 
    
    uniqueBabs.forEach((babName, index) => {
        // Hitung total kata di bab ini
        const count = QUESTIONS.filter(q => (q.bab || "Lainnya") === babName).length;
        
        const div = document.createElement('div');
        div.className = 'bab-selector-card';
        div.id = `${prefix}_btn_${index}`; // ID Unik Tombol Bab
        div.onclick = () => window.openPartModal(babName, containerId, prefix, index);
        
        div.innerHTML = `
            <strong>${babName}</strong>
            <span class="small text-muted mt-1">${count} Kata</span>
            <span class="badge bg-neon-pink rounded-pill mt-2 d-none" id="${prefix}_badge_${index}" style="font-size:0.6rem">0 Terpilih</span>
        `;
        container.appendChild(div);
        
        // Update UI awal (jika ada seleksi tersimpan sebelumnya)
        // Kita butuh array index untuk bab ini
        const indicesInBab = [];
        QUESTIONS.forEach((q, idx) => { if ((q.bab || "Lainnya") === babName) indicesInBab.push(idx); });
        window.updateBabUI(containerId, prefix, index, indicesInBab);
    });
}

// B. Buka Modal Pilih Part
window.openPartModal = function(babName, containerId, prefix, babIndex) {
    const modalTitle = document.getElementById('partModalTitle');
    const modalContainer = document.getElementById('partListContainer');
    if(!modalTitle || !modalContainer) return;

    modalTitle.innerText = `Pilih Bagian: ${babName}`;
    modalContainer.innerHTML = '';

    // Cari index soal yang termasuk Bab ini
    const indicesInBab = [];
    QUESTIONS.forEach((q, idx) => {
        if ((q.bab || "Lainnya") === babName) indicesInBab.push(idx);
    });

    const totalWords = indicesInBab.length;
    const MAX_PER_PART = 25; 
    let totalParts = Math.ceil(totalWords / MAX_PER_PART);
    if (totalWords <= 35) totalParts = 1; // Toleransi, kalau cuma 35 kata jadikan 1 part

    // Buat Checkbox per Part
    for (let i = 0; i < totalParts; i++) {
        const start = i * MAX_PER_PART;
        const end = start + MAX_PER_PART;
        const chunk = indicesInBab.slice(start, end); // Array index soal asli untuk part ini

        // Cek status seleksi saat ini
        const currentSet = GLOBAL_SELECTIONS[containerId];
        // Part dianggap terpilih jika setidaknya satu item di dalamnya terpilih (atau logika 'some' diganti 'every' jika mau strict)
        // Kita pakai 'some' agar jika user select all lalu uncheck satu, part tetap terlihat aktif
        const isChecked = chunk.some(idx => currentSet.has(idx));

        const partLabel = totalParts > 1 ? `Part ${i + 1}` : `Full Paket`;
        const rangeLabel = `(${chunk.length} Kata)`;

        const div = document.createElement('div');
        div.className = 'form-check p-0 mb-2';
        
        // Simpan array chunk dalam atribut onclick agar mudah
        div.innerHTML = `
            <input class="form-check-input d-none" type="checkbox" id="chk_part_${i}" 
                   ${isChecked ? 'checked' : ''} onchange="window.togglePartSelection('${containerId}', this.checked, [${chunk}])">
            <label class="part-option w-100" for="chk_part_${i}">
                <div class="d-flex align-items-center gap-2">
                    <span class="part-option-label">${partLabel}</span>
                    <small class="text-muted fw-normal">${rangeLabel}</small>
                </div>
                <i class="bi bi-check-circle-fill text-neon-pink check-icon ${isChecked ? '' : 'd-none'}"></i>
            </label>
        `;
        modalContainer.appendChild(div);
    }

    // Event listener saat modal part ditutup: Update UI Tombol Bab Utama
    const el = document.getElementById('partSelectionModal');
    // Hapus listener lama biar gak numpuk (opsional, tapi bootstrap handle 'hidden' event global)
    // Cara bersih: buat handler khusus
    const handler = () => {
        window.updateBabUI(containerId, prefix, babIndex, indicesInBab);
        el.removeEventListener('hidden.bs.modal', handler);
    };
    el.addEventListener('hidden.bs.modal', handler);

    partSelectionModal?.show();
}

// C. Toggle Seleksi Part (Simpan ke Set Global)
window.togglePartSelection = function(containerId, isChecked, indicesArray) {
    const set = GLOBAL_SELECTIONS[containerId];
    indicesArray.forEach(idx => {
        if (isChecked) set.add(idx);
        else set.delete(idx);
    });
    
    // Update visual icon centang di modal realtime
    const checkbox = event.target;
    const icon = checkbox.nextElementSibling.querySelector('.check-icon');
    const label = checkbox.nextElementSibling.querySelector('.part-option-label');
    
    if(isChecked) {
        icon.classList.remove('d-none');
        label.style.color = '#f472b6';
        label.style.fontWeight = 'bold';
    } else {
        icon.classList.add('d-none');
        label.style.color = '';
        label.style.fontWeight = 'normal';
    }
}

// D. Update UI Tombol Bab (Warna Pink jika ada isi)
window.updateBabUI = function(containerId, prefix, babIndex, indicesInBab) {
    const set = GLOBAL_SELECTIONS[containerId];
    const btn = document.getElementById(`${prefix}_btn_${babIndex}`);
    const badge = document.getElementById(`${prefix}_badge_${babIndex}`);
    
    if(!btn || !badge) return;

    // Hitung berapa item di bab ini yang terpilih
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

// E. Ambil Index Terpilih (Untuk memulai game)
window.getCheckedIndices = function(containerId) {
    const set = GLOBAL_SELECTIONS[containerId];
    if (!set) return [];
    return Array.from(set).sort((a, b) => a - b);
}

// F. Tombol Select All / Reset Global
function setupCheckboxHelpers(btnAllId, btnClearId, containerId) {
    const btnAll = document.getElementById(btnAllId);
    const btnClear = document.getElementById(btnClearId);

    if(btnAll) btnAll.onclick = () => {
        // Pilih semua index
        const allIndices = QUESTIONS.map((_, i) => i);
        GLOBAL_SELECTIONS[containerId] = new Set(allIndices);
        
        // Refresh UI Bab (Re-generate biar update semua status)
        const prefix = containerId === 'rangeListQuiz' ? 'q' : (containerId === 'rangeListMem' ? 'm' : 'd');
        generateCheckboxes(containerId, prefix);
    };

    if(btnClear) btnClear.onclick = () => {
        GLOBAL_SELECTIONS[containerId] = new Set();
        
        // Refresh UI Bab
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
    toggleMainBackButton(false); 
    const selectedQ = indices.map(i => QUESTIONS[i]);
    // Acak urutan soal
    const shuffled = shuffleArray([...selectedQ]); 

    // Siapkan State
    state = {
        sessionType: type,
        batch: shuffled,
        current: 0,
        answers: new Array(shuffled.length).fill(null),
        orderIndices: indices // Simpan index asli untuk retry
    };

    // Jika Quiz, siapkan pilihan ganda di awal
    if (type.includes('quiz')) {
        const globalIndices = shuffled.map(q => QUESTIONS.indexOf(q));
        state.choicesPerQ = Logic.buildChoices(globalIndices, QUESTIONS, type);
    }

    renderCurrent();
    
    // Tampilkan tombol stop
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

// --- Event Handlers Game ---

window.handleAnswer = (choiceIndex) => {
    state.answers[state.current] = choiceIndex;
    renderCurrent();
};

window.handleNext = () => {
    if (state.current < state.batch.length - 1) {
        state.current++;
        renderCurrent();
    }
};

window.handleNextOrSubmit = () => {
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
    window.handleNext();
};

window.handleConfirm = () => {
    // Cek jawaban kosong
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
    // Handler Tombol Berhenti (Force Finish)
    const stopModalEl = document.getElementById('stopQuizModal');
    const stopModal = bootstrap.Modal.getInstance(stopModalEl);
    stopModal.hide();
    finishSession();
}

window.handleBack = () => { 
    Storage.clearTemp(); 
    // Reset state tampilan
    document.getElementById('quiz-area').innerHTML = ''; 
    document.location.reload(); // Reload bersih
};

function finishSession() {
    const result = Logic.gradeSession(state, QUESTIONS);
    
    // Simpan Progress (Mastery)
    Storage.saveMastery(result.details, state.sessionType);

    // Simpan History
    const uniqueBabs = [...new Set(state.batch.map(item => item.bab || "Default"))].sort();
    const packagesStr = uniqueBabs.join(', ');
    Storage.saveToHistory(result.score, result.total, state.sessionType, packagesStr);
    
    // Cari soal yang salah untuk fitur Retry
    const wrongIndices = [];
    result.details.forEach((item, i) => {
        if (!item.isCorrect || state.answers[i] === 'Lupa') {
            // Kita butuh index asli dari soal ini di QUESTIONS
            // Item.q adalah object soalnya. Cari indexnya di QUESTIONS global.
            const originalIdx = QUESTIONS.indexOf(item.q);
            if(originalIdx !== -1) wrongIndices.push(originalIdx);
        }
    });

    Storage.clearTemp();
    UI.renderResult(result, state.sessionType, wrongIndices);
    
    const btnStop = document.getElementById('btn-stop-quiz');
    if(btnStop) btnStop.classList.add('d-none'); 
}

window.handleRetry = () => {
    // Ulangi dengan soal yang sama persis
    // Ambil index dari batch saat ini
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
    toggleMainBackButton(false);

    const listContainer = document.getElementById('daftarList');
    if(listContainer) {
        listContainer.innerHTML = '';
        // Layout Grid Responsif
        listContainer.className = 'row row-cols-2 row-cols-md-3 row-cols-lg-4 row-cols-xl-5 g-3'; 

        indices.forEach(idx => {
            const item = QUESTIONS[idx];
            if(!item) return;
            const kanji = String(item.jepang || '?').trim();
            const kana = String(item.kana || '-').trim();
            const showKana = kanji !== kana;
            
            // Auto size font
            let fontSizeClass = 'fs-1';
            if (kanji.length > 4) fontSizeClass = 'fs-2';
            if (kanji.length > 6) fontSizeClass = 'fs-3';
            if (kanji.length > 10) fontSizeClass = 'fs-5';

            const colDiv = document.createElement('div');
            colDiv.className = 'col';
            
            // Render Kartu Daftar (Sesuai tema Dark Neon)
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

// Jalankan Init
window.onload = init;