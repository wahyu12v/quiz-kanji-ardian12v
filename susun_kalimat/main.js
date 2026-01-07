
import { fetchData, shuffleArray } from './js/utils.js';

// --- VARIABLES ---
let allStories = [];
let currentQuestions = [];
let currentIndex = 0;
let currentWords = []; 
let userAnswers = []; 
let storyModalInstance, giveUpModalInstance, resultModalInstance;

// --- DOM ELEMENTS ---
const elements = {
    startView: document.getElementById('start-view'),
    gameView: document.getElementById('game-view'),
    
    // Navbar Back Button (PERBAIKAN)
    navBackBtn: document.getElementById('nav-back-btn'), 

    // Buttons Game
    btnQuit: document.getElementById('btn-quit'),
    btnConfirmQuit: document.getElementById('btn-confirm-quit'),
    nextBtn: document.getElementById('next-btn'),
    prevBtn: document.getElementById('prev-btn'),

    // Modals
    storyListContainer: document.getElementById('story-list-container'),
    storyModal: document.getElementById('storyModal'),
    giveUpModal: document.getElementById('giveUpModal'),
    resultModal: document.getElementById('resultModal'),
    
    // Game UI
    qCurrent: document.getElementById('q-current'),
    qTotal: document.getElementById('q-total'),
    totalQBadge: document.getElementById('total-q-badge'),
    progressBar: document.getElementById('progress-bar'),
    questionText: document.getElementById('question-text'),
    answerArea: document.getElementById('answer-area'),
    wordBank: document.getElementById('word-bank'),
    
    // Result UI
    finalScore: document.getElementById('final-score'),
    reviewContainer: document.getElementById('exam-review-container')
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        if(elements.storyModal) storyModalInstance = new bootstrap.Modal(elements.storyModal);
        if(elements.giveUpModal) giveUpModalInstance = new bootstrap.Modal(elements.giveUpModal);
        if(elements.resultModal) resultModalInstance = new bootstrap.Modal(elements.resultModal);
    } catch (e) { console.error("Bootstrap Error:", e); }

    allStories = await fetchData('data.json');
    if (allStories && allStories.length > 0) {
        if(elements.totalQBadge) elements.totalQBadge.textContent = `${allStories.length}`;
        renderStoryList();
    }
});

function renderStoryList() {
    elements.storyListContainer.innerHTML = '';
    allStories.forEach((story, index) => {
        const col = document.createElement('div');
        col.className = 'col-md-6';
        col.innerHTML = `
            <button class="story-card-btn" onclick="window.selectStory(${index})">
                <div class="story-icon-box"><i class="fas ${story.icon || 'fa-book'}"></i></div>
                <div class="story-info">
                    <h6>${story.title}</h6>
                    <p>${story.description}</p>
                    <span class="badge bg-light text-secondary border mt-2">${story.questions.length} Soal</span>
                </div>
            </button>`;
        elements.storyListContainer.appendChild(col);
    });
}

// --- START GAME LOGIC ---
window.selectStory = function(index) {
    const selectedStory = allStories[index];
    currentQuestions = selectedStory.questions;
    
    if (!currentQuestions || currentQuestions.length === 0) return alert("Soal kosong.");
    
    storyModalInstance.hide();
    startGame();
};

function startGame() {
    elements.startView.classList.add('d-none');
    elements.gameView.classList.remove('d-none');
    elements.gameView.classList.add('fade-in');
    
    // PERBAIKAN: Sembunyikan tombol kembali di Navbar saat game mulai
    if(elements.navBackBtn) {
        elements.navBackBtn.style.display = 'none';
    }

    currentIndex = 0;
    userAnswers = new Array(currentQuestions.length).fill(null);
    
    elements.qTotal.textContent = currentQuestions.length;
    loadQuestion();
}

function loadQuestion() {
    const data = currentQuestions[currentIndex];
    
    if (userAnswers[currentIndex]) {
        currentWords = [...userAnswers[currentIndex].words];
    } else {
        currentWords = [];
    }
    
    elements.qCurrent.textContent = currentIndex + 1;
    elements.questionText.innerHTML = data.question; 
    
    const progress = ((currentIndex) / currentQuestions.length) * 100;
    elements.progressBar.style.width = `${progress}%`;

    renderAnswerArea();

    elements.wordBank.innerHTML = '';
    let partsToRender = data.parts; 
    const shuffledParts = shuffleArray([...partsToRender]); 

    shuffledParts.forEach((word) => {
        const btn = document.createElement('button');
        btn.className = 'word-chip';
        btn.textContent = word;
        btn.onclick = () => moveToAnswer(word, btn);
        elements.wordBank.appendChild(btn);
    });
    
    syncBankStatus();

    elements.prevBtn.disabled = (currentIndex === 0);
    
    if (currentIndex === currentQuestions.length - 1) {
        elements.nextBtn.innerHTML = 'Simpan & Selesai <i class="fas fa-check-circle ms-2"></i>';
    } else {
        elements.nextBtn.innerHTML = 'Simpan & Lanjut <i class="fas fa-chevron-right ms-2"></i>';
    }
}

function syncBankStatus() {
    const bankButtons = Array.from(elements.wordBank.children);
    bankButtons.forEach(b => b.classList.remove('used'));
    
    const tempWords = [...currentWords];
    tempWords.forEach(word => {
        const targetBtn = bankButtons.find(b => b.textContent === word && !b.classList.contains('used'));
        if (targetBtn) {
            targetBtn.classList.add('used');
        }
    });
}

function renderAnswerArea() {
    elements.answerArea.innerHTML = '';
    
    if (currentWords.length === 0) {
        elements.answerArea.innerHTML = '<div class="placeholder-text">Klik kata di bawah untuk menyusun...</div>';
        return;
    }

    currentWords.forEach(word => {
        const ansChip = document.createElement('button');
        ansChip.className = 'word-chip';
        ansChip.textContent = word;
        ansChip.onclick = () => {
            const idx = currentWords.indexOf(word);
            if (idx > -1) currentWords.splice(idx, 1);
            
            renderAnswerArea();
            syncBankStatus();
        };
        elements.answerArea.appendChild(ansChip);
    });
}

function moveToAnswer(word, bankBtn) {
    if (bankBtn.classList.contains('used')) return;

    currentWords.push(word);
    bankBtn.classList.add('used');
    renderAnswerArea();
}

// --- NAVIGATION & FINISH ---

function saveCurrentAnswer() {
    const data = currentQuestions[currentIndex];
    const userSentence = currentWords.join(''); 
    const isCorrect = (userSentence === data.correct_sentence);

    userAnswers[currentIndex] = {
        id: data.id,
        words: [...currentWords], 
        userAns: userSentence,
        correctAns: data.correct_sentence,
        translation: data.translation,
        isCorrect: isCorrect
    };
}

elements.nextBtn.addEventListener('click', () => {
    saveCurrentAnswer();
    if (currentIndex < currentQuestions.length - 1) {
        currentIndex++;
        loadQuestion();
    } else {
        finishGame();
    }
});

elements.prevBtn.addEventListener('click', () => {
    saveCurrentAnswer(); 
    if (currentIndex > 0) {
        currentIndex--;
        loadQuestion();
    }
});

elements.btnQuit.addEventListener('click', () => {
    giveUpModalInstance.show();
});

elements.btnConfirmQuit.addEventListener('click', () => {
    giveUpModalInstance.hide();
    saveCurrentAnswer(); 
    finishGame();
});

function finishGame() {
    let score = 0;
    elements.reviewContainer.innerHTML = '';

    currentQuestions.forEach((q, index) => {
        const answer = userAnswers[index];
        
        let userText = "(Tidak dijawab)";
        let isCorrect = false;
        let cardClass = "review-card wrong"; 
        let icon = "fa-times-circle text-danger fs-3";
        let userBoxClass = "bg-danger-subtle";

        if (answer) {
            userText = answer.userAns || "(Kosong)";
            if (answer.isCorrect) {
                isCorrect = true;
                score++;
                cardClass = "review-card correct";
                icon = "fa-check-circle text-success fs-3";
                userBoxClass = "bg-success-subtle";
            }
        }

        const item = document.createElement('div');
        item.className = cardClass;
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-start mb-4">
                <div>
                    <span class="badge bg-light text-secondary mb-2">Soal ${index + 1}</span>
                    <h6 class="fw-bold text-dark mb-0" style="line-height: 1.4;">"${q.question}"</h6>
                </div>
                <div class="ms-3"><i class="fas ${icon}"></i></div>
            </div>
            <div class="row g-3">
                <div class="col-md-6">
                    <span class="answer-label">Jawaban Kamu</span>
                    <div class="answer-box ${userBoxClass}">
                        ${userText}
                    </div>
                </div>
                <div class="col-md-6">
                    <span class="answer-label">Kunci Jawaban</span>
                    <div class="answer-box bg-light text-dark border">
                        ${q.correct_sentence}
                    </div>
                    <div class="mt-2 small text-muted d-flex align-items-start gap-2">
                        <i class="fas fa-language mt-1"></i>
                        <span class="fst-italic">${q.translation}</span>
                    </div>
                </div>
            </div>
        `;
        elements.reviewContainer.appendChild(item);
    });

    const finalScoreVal = Math.round((score / currentQuestions.length) * 100);
    elements.finalScore.textContent = finalScoreVal;
    
    elements.finalScore.classList.remove('text-primary', 'text-success', 'text-danger');
    if(finalScoreVal >= 80) elements.finalScore.classList.add('text-success');
    else if(finalScoreVal < 60) elements.finalScore.classList.add('text-danger');
    else elements.finalScore.classList.add('text-primary');
    
    resultModalInstance.show();
}