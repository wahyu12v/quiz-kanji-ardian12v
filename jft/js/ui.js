// js/ui.js
import { state } from './state.js';
import { stopAudio } from './audio.js';

// --- RENDER MODAL HOME ---
export function renderPackagesInModal() {
    const grid = document.getElementById('modal-package-list');
    if (!grid) return;
    grid.innerHTML = '';

    state.packages.forEach(pkg => {
        const col = document.createElement('div');
        col.className = 'col-md-6';

        // Map icon FontAwesome → Bootstrap Icons
        const iconMap = {
            'fas fa-scroll':     'bi bi-file-text-fill',
            'fas fa-comments':   'bi bi-chat-dots-fill',
            'fas fa-headphones': 'bi bi-headphones',
            'fas fa-book-open':  'bi bi-book-fill',
            'fas fa-edit':       'bi bi-pencil-square',
            'fas fa-language':   'bi bi-translate',
        };
        const biIcon = iconMap[pkg.icon] || 'bi bi-journal-text';

        col.innerHTML = `
            <div class="package-card h-100 p-4 rounded-4"
                 onclick="window.goToExamPage('${pkg.id}')">
                <div class="d-flex align-items-center gap-3 mb-3">
                    <div class="pkg-icon-box">
                        <i class="${biIcon}"></i>
                    </div>
                    <div>
                        <h5 class="pkg-title mb-0">${pkg.title}</h5>
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center pt-3"
                     style="border-top: 1px solid var(--border);">
                    <span class="pkg-duration-badge">
                        <i class="bi bi-clock me-1"></i>${pkg.duration} Menit
                    </span>
                    <span class="text-muted" style="font-size:0.78rem;">
                        <i class="bi bi-arrow-right-circle-fill" style="color:var(--teal)"></i>
                    </span>
                </div>
            </div>`;
        grid.appendChild(col);
    });
}

// --- RENDER NAVIGASI SECTION ---
export function renderSectionNav(callbackRenderQuestion) {
    const navContainer = document.getElementById('section-nav');
    if (!navContainer) return;
    navContainer.innerHTML = '';

    const shortNames = ['Script', 'Conv', 'Listen', 'Read'];
    const biIcons = [
        'bi bi-file-text me-1',
        'bi bi-chat-dots me-1',
        'bi bi-headphones me-1',
        'bi bi-book me-1'
    ];

    state.sectionMap.forEach((sec, idx) => {
        const btn = document.createElement('button');
        const iconClass = biIcons[idx % 4] || '';
        btn.className = 'btn btn-sm btn-sect px-3 py-2';
        btn.innerHTML = `<i class="${iconClass}"></i>${shortNames[idx] || sec.name}`;

        btn.onclick = () => {
            state.currentQuestionIndex = sec.startIndex;
            if (typeof callbackRenderQuestion === 'function') callbackRenderQuestion();
        };
        navContainer.appendChild(btn);
    });
}

// --- RENDER SOAL ---
export function renderQuestion() {
    const q = state.currentQuestions[state.currentQuestionIndex];
    const container = document.getElementById('question-card-container');

    stopAudio();

    // Highlight Section Nav
    const navBtns = document.querySelectorAll('#section-nav button');
    navBtns.forEach(btn => btn.classList.remove('active'));
    let activeSecIdx = state.sectionMap.findIndex((s, i) => {
        const nextS = state.sectionMap[i + 1];
        return state.currentQuestionIndex >= s.startIndex &&
               (!nextS || state.currentQuestionIndex < nextS.startIndex);
    });
    if (navBtns[activeSecIdx]) navBtns[activeSecIdx].classList.add('active');

    // Progress
    const answeredCount = Object.keys(state.userAnswers).length;
    const totalQuestions = state.currentQuestions.length;
    const progressEl = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    if (progressEl) progressEl.style.width = `${(answeredCount / totalQuestions) * 100}%`;
    if (progressText) progressText.innerText = `${answeredCount}/${totalQuestions}`;

    // Audio HTML
    let audioHtml = '';
    if (q.type === 'audio') {
        audioHtml = `
            <div id="audio-player-card" class="audio-player-card mb-4 d-flex align-items-center gap-3">
                <button id="btn-play-audio"
                        class="btn-play-modern rounded-circle d-flex align-items-center justify-content-center"
                        style="width:50px; height:50px;"
                        onclick="window.playCurrentAudio(this)">
                    <i class="bi bi-play-fill fs-5"></i>
                </button>
                <div class="audio-info flex-grow-1">
                    <span id="audio-status-text" class="audio-label d-block mb-1">KLIK PLAY</span>
                    <div class="visualizer d-flex gap-1" style="height:20px; align-items:flex-end;">
                        <div class="wave-bar rounded"></div>
                        <div class="wave-bar rounded"></div>
                        <div class="wave-bar rounded"></div>
                        <div class="wave-bar rounded"></div>
                        <div class="wave-bar rounded"></div>
                    </div>
                </div>
                <button class="btn-stop-audio-pill"
                        onclick="window.stopAudio()"
                        title="Stop Audio">
                    <i class="bi bi-stop-fill"></i>
                </button>
            </div>`;
    }

    // Options HTML
    let optionsHtml = '';
    q.options.forEach((opt, idx) => {
        const isSelected = state.userAnswers[q.id] === idx ? 'selected' : '';
        optionsHtml += `
            <button class="quiz-option-btn p-3 mb-3 d-flex align-items-center ${isSelected}"
                    onclick="window.selectAnswer(${idx})">
                <div class="opt-label me-3">${String.fromCharCode(65 + idx)}</div>
                <div class="fw-medium">${opt}</div>
            </button>`;
    });

    // Render kartu soal
    container.innerHTML = `
        <div class="question-card fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4 pb-3"
                 style="border-bottom: 1px solid var(--border);">
                <span class="badge-section text-uppercase">${q.sectionName}</span>
                <span class="question-num-label">SOAL ${state.currentQuestionIndex + 1} / ${state.currentQuestions.length}</span>
            </div>
            ${audioHtml}
            <div class="question-text mb-4">${q.text}</div>
            <div class="options-list">${optionsHtml}</div>
        </div>`;

    // Update tombol navigasi
    const btnPrev   = document.getElementById('btn-prev');
    const btnNext   = document.getElementById('btn-next');
    const btnFinish = document.getElementById('btn-finish');

    if (btnPrev)   btnPrev.disabled = state.currentQuestionIndex === 0;

    const isLast = state.currentQuestionIndex === state.currentQuestions.length - 1;
    if (btnNext)   btnNext.classList.toggle('hidden', isLast);
    if (btnFinish) btnFinish.classList.toggle('hidden', !isLast);
}