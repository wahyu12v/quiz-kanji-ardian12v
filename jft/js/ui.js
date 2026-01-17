// js/ui.js
import { state } from './state.js';
import { stopAudio } from './audio.js'; // Hanya butuh stopAudio

// --- RENDER MODAL HOME ---
export function renderPackagesInModal() {
    const grid = document.getElementById('modal-package-list');
    if (!grid) return;
    grid.innerHTML = '';

    state.packages.forEach(pkg => {
        const col = document.createElement('div');
        col.className = 'col-md-6';
        // Perhatikan onclick: memanggil window.goToExamPage
        col.innerHTML = `
            <div class="package-card h-100 p-4 rounded-4" style="cursor: pointer;" 
                 onclick="window.goToExamPage('${pkg.id}')">
                <div class="d-flex align-items-center mb-3">
                    <div class="pkg-icon-box me-3 d-flex align-items-center justify-content-center rounded-3" 
                         style="width:50px; height:50px; font-size:1.5rem; background: rgba(0, 210, 255, 0.15); color: #00d2ff; border: 1px solid rgba(0, 210, 255, 0.3);">
                        <i class="${pkg.icon}"></i>
                    </div>
                    <div>
                        <h5 class="fw-bold mb-1 text-white">${pkg.title}</h5>
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25">
                    <span class="badge bg-dark border border-secondary text-secondary">⏱ ${pkg.duration} Menit</span>
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

    const shortNames = ["Script", "Conv", "Listen", "Read"];
    const icons = ['<i class="fas fa-language me-1"></i>', '<i class="fas fa-comments me-1"></i>', '<i class="fas fa-headphones me-1"></i>', '<i class="fas fa-book-open me-1"></i>'];

    state.sectionMap.forEach((sec, idx) => {
        const btn = document.createElement('button');
        const iconHtml = icons[idx % 4] || '';
        btn.className = `btn btn-sm rounded-pill px-3 py-2 btn-sect me-2 mb-2`;
        btn.innerHTML = `${iconHtml} ${shortNames[idx] || sec.name}`;
        
        btn.onclick = () => {
            state.currentQuestionIndex = sec.startIndex;
            if(typeof callbackRenderQuestion === 'function') callbackRenderQuestion();
        };
        navContainer.appendChild(btn);
    });
}

// --- RENDER SOAL ---
export function renderQuestion() {
    const q = state.currentQuestions[state.currentQuestionIndex];
    const container = document.getElementById('question-card-container');
    
    stopAudio(); 

    // Highlight Nav
    const navBtns = document.querySelectorAll('#section-nav button');
    navBtns.forEach(btn => btn.classList.remove('active'));
    let activeSecIdx = state.sectionMap.findIndex((s, i) => {
        const nextS = state.sectionMap[i+1];
        return state.currentQuestionIndex >= s.startIndex && (!nextS || state.currentQuestionIndex < nextS.startIndex);
    });
    if(navBtns[activeSecIdx]) navBtns[activeSecIdx].classList.add('active');

    // Progress
    const answeredCount = Object.keys(state.userAnswers).length;
    const totalQuestions = state.currentQuestions.length;
    document.getElementById('progress-bar').style.width = `${(answeredCount / totalQuestions) * 100}%`;
    document.getElementById('progress-text').innerText = `${answeredCount}/${totalQuestions}`;

    // Audio HTML (PENTING: onclick memanggil window.playCurrentAudio)
    let audioHtml = '';
    if (q.type === 'audio') {
        audioHtml = `
            <div id="audio-player-card" class="audio-player-card mb-4 d-flex align-items-center gap-3">
                <button id="btn-play-audio" class="btn-play-modern rounded-circle d-flex align-items-center justify-content-center border-0" style="width:50px; height:50px;" 
                    onclick="window.playCurrentAudio(this)">
                    <i class="fas fa-play"></i>
                </button>
                <div class="audio-info flex-grow-1">
                    <span id="audio-status-text" class="audio-label d-block small fw-bold text-secondary mb-1">KLIK PLAY</span>
                    <div class="visualizer d-flex gap-1" style="height:20px;">
                        <div class="wave-bar w-1 rounded"></div><div class="wave-bar w-1 rounded"></div>
                        <div class="wave-bar w-1 rounded"></div><div class="wave-bar w-1 rounded"></div>
                        <div class="wave-bar w-1 rounded"></div>
                    </div>
                </div>
                <button id="btn-stop-audio" class="btn btn-outline-danger btn-sm rounded-circle" style="width:36px; height:36px;" 
                    onclick="window.stopAudio()">
                    <i class="fas fa-stop"></i>
                </button>
            </div>
        `;
    }

    // Options HTML (PENTING: onclick memanggil window.selectAnswer)
    let optionsHtml = '';
    q.options.forEach((opt, idx) => {
        const isSelected = state.userAnswers[q.id] === idx ? 'selected' : '';
        optionsHtml += `
            <button class="quiz-option-btn w-100 text-start p-3 mb-3 rounded-3 d-flex align-items-center ${isSelected}" onclick="window.selectAnswer(${idx})">
                <div class="opt-label rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold" style="width:35px; height:35px; flex-shrink:0;">
                    ${String.fromCharCode(65 + idx)}
                </div>
                <div class="fw-medium">${opt}</div>
            </button>
        `;
    });

    container.innerHTML = `
        <div class="question-card fade-in">
            <div class="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom border-secondary border-opacity-25">
                <span class="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-25 px-3 py-2 rounded-pill">${q.sectionName}</span>
                <span class="text-secondary small fw-bold">SOAL ${state.currentQuestionIndex + 1} / ${state.currentQuestions.length}</span>
            </div>
            ${audioHtml}
            <div class="question-text mb-4" style="line-height: 1.8;">${q.text}</div>
            <div class="options-list">${optionsHtml}</div>
        </div>
    `;

    // Button States
    document.getElementById('btn-prev').disabled = state.currentQuestionIndex === 0;
    if (state.currentQuestionIndex === state.currentQuestions.length - 1) {
        document.getElementById('btn-next').classList.add('hidden');
        document.getElementById('btn-finish').classList.remove('hidden');
    } else {
        document.getElementById('btn-next').classList.remove('hidden');
        document.getElementById('btn-finish').classList.add('hidden');
    }
}