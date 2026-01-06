// ui.js - Menangani Tampilan HTML
import { state } from './state.js';
import { playTTS, stopAudio } from './audio.js';
import { selectAnswer, nextQuestion, prevQuestion, showFinishConfirmation } from './logic.js'; // Import logic untuk binding

// --- RENDER MODAL HOME ---
export function renderPackagesInModal() {
    const grid = document.getElementById('modal-package-list');
    if (!grid) return;
    grid.innerHTML = '';

    state.packages.forEach(pkg => {
        const col = document.createElement('div');
        col.className = 'col-md-6';
        col.innerHTML = `
            <div class="package-card h-100 border p-3" style="cursor: pointer; border-radius: 15px; transition: transform 0.2s;" 
                 onclick="window.goToExamPage('${pkg.id}')"
                 onmouseover="this.style.transform='scale(1.02)'; this.style.borderColor='#007bff'"
                 onmouseout="this.style.transform='scale(1)'; this.style.borderColor='#dee2e6'">
                <div class="d-flex align-items-center mb-3">
                    <div class="pkg-icon-box" style="background: ${pkg.color};">
                        <i class="${pkg.icon}"></i>
                    </div>
                    <div style="min-width: 0;">
                        <h6 class="fw-bold mb-1 text-truncate">${pkg.title}</h6>
                        <small class="text-muted d-block" style="line-height: 1.4;">${pkg.subtitle}</small>
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center small mt-auto">
                    <span class="badge bg-light text-dark border">⏱ ${pkg.duration} Menit</span>
                    <span class="text-primary fw-bold">Mulai <i class="fas fa-arrow-right"></i></span>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

// --- RENDER NAVIGASI SECTION ---
export function renderSectionNav(callbackRenderQuestion) {
    const navContainer = document.getElementById('section-nav');
    if(!navContainer) return;
    navContainer.innerHTML = '';

    const shortNames = ["Script", "Conversation", "Listening", "Reading"];
    const icons = ['<i class="fas fa-language me-1"></i>', '<i class="fas fa-comments me-1"></i>', '<i class="fas fa-headphones me-1"></i>', '<i class="fas fa-book-open me-1"></i>'];

    state.sectionMap.forEach((sec, idx) => {
        const btn = document.createElement('button');
        const colorClass = `btn-sect-${idx % 4}`;
        const displayName = shortNames[idx] || sec.name; 
        const iconHtml = icons[idx % 4] || '';

        btn.className = `btn btn-sm rounded-pill px-3 py-2 btn-sect ${colorClass}`;
        btn.innerHTML = `${iconHtml} ${displayName}`;
        btn.onclick = () => {
            state.currentQuestionIndex = sec.startIndex;
            callbackRenderQuestion();
        };
        navContainer.appendChild(btn);
    });
}

// --- RENDER KARTU SOAL ---
export function renderQuestion() {
    const q = state.currentQuestions[state.currentQuestionIndex];
    const container = document.getElementById('question-card-container');
    
    stopAudio(); // Reset audio saat ganti soal

    // Highlight Navigasi Section
    const navBtns = document.querySelectorAll('#section-nav button');
    navBtns.forEach(btn => btn.classList.remove('active'));
    let activeSecIdx = state.sectionMap.findIndex((s, i) => {
        const nextS = state.sectionMap[i+1];
        return state.currentQuestionIndex >= s.startIndex && (!nextS || state.currentQuestionIndex < nextS.startIndex);
    });
    if(navBtns[activeSecIdx]) navBtns[activeSecIdx].classList.add('active');

    // Progress Bar
    const answeredCount = Object.keys(state.userAnswers).length;
    const totalQuestions = state.currentQuestions.length;
    document.getElementById('progress-bar').style.width = `${(answeredCount / totalQuestions) * 100}%`;
    document.getElementById('progress-text').innerText = `${answeredCount}/${totalQuestions} Dijawab`;

    // HTML Audio Player
    let audioHtml = '';
    if (q.type === 'audio') {
        audioHtml = `
            <div id="audio-player-card" class="audio-player-card mb-4">
                <button id="btn-play-audio" class="btn-play-modern"><i class="fas fa-play"></i></button>
                <div class="audio-info">
                    <span id="audio-status-text" class="audio-label">Klik Play</span>
                    <div class="visualizer">
                        <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
                    </div>
                </div>
                <button id="btn-stop-audio" class="btn-stop-modern" title="Stop"><i class="fas fa-stop"></i></button>
            </div>
        `;
    }

    // HTML Options
    let optionsHtml = '';
    q.options.forEach((opt, idx) => {
        const isSelected = state.userAnswers[q.id] === idx ? 'selected' : '';
        optionsHtml += `
            <button class="quiz-option-btn ${isSelected}" onclick="window.selectAnswer(${idx})">
                <div class="opt-label">${String.fromCharCode(65 + idx)}</div>
                <div class="text-start w-100 fw-medium">${opt}</div>
            </button>
        `;
    });

    container.innerHTML = `
        <div class="question-card fade-in">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill border border-primary border-opacity-25">
                    ${q.sectionName}
                </span>
                <span class="text-muted small fw-bold">No. ${state.currentQuestionIndex + 1}</span>
            </div>
            ${audioHtml}
            <div class="question-text mb-4 fs-5" style="line-height: 1.6;">${q.text}</div>
            <div class="options-list d-grid gap-2">${optionsHtml}</div>
        </div>
    `;

    // Bind Event Listener untuk Tombol Audio (karena dibuat via string)
    if (q.type === 'audio') {
        setTimeout(() => {
            const btnPlay = document.getElementById('btn-play-audio');
            const btnStop = document.getElementById('btn-stop-audio');
            if (btnPlay) btnPlay.onclick = function() { playTTS(q.script, this); };
            if (btnStop) btnStop.onclick = function() { stopAudio(); };
        }, 50);
    }

    // Atur Tombol Navigasi Bawah
    document.getElementById('btn-prev').disabled = state.currentQuestionIndex === 0;
    
    if (state.currentQuestionIndex === state.currentQuestions.length - 1) {
        document.getElementById('btn-next').classList.add('hidden');
        document.getElementById('btn-finish').classList.remove('hidden');
    } else {
        document.getElementById('btn-next').classList.remove('hidden');
        document.getElementById('btn-finish').classList.add('hidden');
    }
}