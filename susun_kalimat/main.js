import { fetchData, shuffleArray, parseFurigana } from './js/utils.js';

// --- VARIABLES ---
let allStories = [];
let questionQueue = [];
let currentQIndex = 0;
let currentQuestions = [];
let currentWords = []; 
let lives = 20;
let answeredHistory = [];

let gameState = 'CHECK'; // 'CHECK' atau 'NEXT'
let storyModalInstance, giveUpModalInstance, resultModalInstance;

// --- DOM ELEMENTS ---
const elements = {
    startView: document.getElementById('start-view'),
    gameView: document.getElementById('game-view'),
    navBackBtn: document.getElementById('nav-back-btn'),
    
    // Header
    livesCount: document.getElementById('lives-count'),
    progressBar: document.getElementById('progress-bar'),
    
    // Game
    questionText: document.getElementById('question-text'),
    answerArea: document.getElementById('answer-area'),
    wordBank: document.getElementById('word-bank'),
    feedbackArea: document.getElementById('feedback-area'),
    feedbackTitle: document.getElementById('feedback-title'),
    feedbackContent: document.getElementById('feedback-content'),
    
    // Buttons
    actionBtn: document.getElementById('action-btn'),
    btnQuit: document.getElementById('btn-quit'),
    btnConfirmQuit: document.getElementById('btn-confirm-quit'),

    // Modals
    storyListContainer: document.getElementById('story-list-container'),
    storyModal: document.getElementById('storyModal'),
    giveUpModal: document.getElementById('giveUpModal'),
    resultModal: document.getElementById('resultModal'),
    
    // Result
    finalLives: document.getElementById('final-lives'),
    reviewContainer: document.getElementById('exam-review-container'),
    resultTitle: document.getElementById('result-title'),
    totalQBadge: document.getElementById('total-q-badge')
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

// --- GAME LOGIC ---
window.selectStory = function(index) {
    const selectedStory = allStories[index];
    currentQuestions = selectedStory.questions;
    
    if (!currentQuestions || currentQuestions.length === 0) return alert("Soal kosong.");
    
    questionQueue = currentQuestions.map((_, i) => i);
    lives = 20;
    answeredHistory = [];
    
    storyModalInstance.hide();
    startGame();
};

function startGame() {
    elements.startView.classList.add('d-none');
    elements.gameView.classList.remove('d-none');
    elements.gameView.classList.add('fade-in');
    
    if(elements.navBackBtn) elements.navBackBtn.style.display = 'none';

    updateHeaderUI();
    loadNextQuestion();
}

function updateHeaderUI() {
    elements.livesCount.textContent = lives;
    const totalStart = currentQuestions.length;
    const correctCount = answeredHistory.filter(a => a.isCorrect).length;
    const progress = (correctCount / totalStart) * 100;
    elements.progressBar.style.width = `${progress}%`;
}

function loadNextQuestion() {
    if (questionQueue.length === 0) {
        finishGame(true);
        return;
    }
    
    currentQIndex = questionQueue[0]; 
    const data = currentQuestions[currentQIndex];
    
    currentWords = [];
    gameState = 'CHECK';
    
    // RESET TAMPILAN WORD BANK AGAR MUNCUL LAGI
    elements.wordBank.style.display = 'flex';
    elements.wordBank.style.removeProperty('margin');
    elements.wordBank.style.removeProperty('padding');

    elements.actionBtn.textContent = "PERIKSA";
    elements.actionBtn.style.background = "white";
    elements.actionBtn.style.color = "#0d6efd";
    
    elements.feedbackArea.style.display = 'none';
    elements.answerArea.innerHTML = '<div class="placeholder-text">Klik kata di bawah untuk menyusun...</div>';
    
    elements.questionText.innerHTML = parseFurigana(data.question);

    elements.wordBank.innerHTML = '';
    const shuffledParts = shuffleArray(data.parts); 

    shuffledParts.forEach((word) => {
        const btn = document.createElement('button');
        btn.className = 'word-chip';
        btn.dataset.raw = word; 
        btn.innerHTML = parseFurigana(word);
        btn.onclick = () => moveToAnswer(word, btn);
        elements.wordBank.appendChild(btn);
    });
    
    checkWordBankStatus();
}

function moveToAnswer(word, bankBtn) {
    if (gameState !== 'CHECK') return;

    const placeholder = elements.answerArea.querySelector('.placeholder-text');
    if (placeholder) placeholder.remove();

    const ansChip = document.createElement('button');
    ansChip.className = 'word-chip';
    ansChip.innerHTML = parseFurigana(word);
    
    ansChip.onclick = () => {
        if (gameState !== 'CHECK') return;
        ansChip.remove();
        
        const idx = currentWords.indexOf(word);
        if (idx > -1) currentWords.splice(idx, 1);
        
        bankBtn.classList.remove('used');
        checkWordBankStatus(); // Cek lagi jika tombol kembali
        
        if (currentWords.length === 0) {
            elements.answerArea.innerHTML = '<div class="placeholder-text">Klik kata di bawah untuk menyusun...</div>';
        }
    };

    elements.answerArea.appendChild(ansChip);
    bankBtn.classList.add('used');
    currentWords.push(word);
    
    checkWordBankStatus(); // Cek status setelah klik
}

// FUNGSI INI MEMBUAT SLOT KATA HILANG TOTAL JIKA KOSONG
function checkWordBankStatus() {
    const bankButtons = Array.from(elements.wordBank.children);
    const allUsed = bankButtons.every(btn => btn.classList.contains('used'));
    
    if (allUsed) {
        elements.wordBank.style.display = 'none';
        elements.wordBank.style.margin = '0';
        elements.wordBank.style.padding = '0';
    } else {
        elements.wordBank.style.display = 'flex';
        elements.wordBank.style.removeProperty('margin');
        elements.wordBank.style.removeProperty('padding');
    }
}

elements.actionBtn.addEventListener('click', () => {
    if (gameState === 'CHECK') {
        checkAnswer();
    } else {
        loadNextQuestion();
    }
});

function checkAnswer() {
    if (currentWords.length === 0) return;

    const data = currentQuestions[currentQIndex];
    const cleanCorrect = data.correct_sentence.replace(/\[\[(.*?)\|(.*?)\]\]/g, '$1').replace(/\s+/g, '');
    const cleanUser = currentWords.join('').replace(/\[\[(.*?)\|(.*?)\]\]/g, '$1').replace(/\s+/g, '');
    const isCorrect = (cleanUser === cleanCorrect);
    
    elements.feedbackArea.style.display = 'block';
    
    if (isCorrect) {
        elements.feedbackArea.style.backgroundColor = '#d1e7dd';
        elements.feedbackArea.style.color = '#0f5132';
        elements.feedbackTitle.innerHTML = '<i class="fas fa-check-circle me-2"></i>Benar!';
        elements.feedbackContent.innerHTML = `Arti: <i>"${data.translation}"</i>`;
        
        elements.actionBtn.textContent = "LANJUT";
        elements.actionBtn.style.background = "#198754";
        elements.actionBtn.style.color = "white";
        
        questionQueue.shift(); 
        
        answeredHistory.push({
            q: data.question,
            ans: currentWords.join(''),
            correct: data.correct_sentence,
            translation: data.translation,
            isCorrect: true
        });

    } else {
        lives--;
        updateHeaderUI();
        
        elements.feedbackArea.style.backgroundColor = '#f8d7da';
        elements.feedbackArea.style.color = '#842029';
        elements.feedbackTitle.innerHTML = '<i class="fas fa-times-circle me-2"></i>Salah!';
        elements.feedbackContent.innerHTML = `Jawaban benar: <b>${parseFurigana(data.correct_sentence)}</b>`;
        
        elements.actionBtn.textContent = "LANJUT";
        elements.actionBtn.style.background = "#dc3545";
        elements.actionBtn.style.color = "white";
        
        const currentQ = questionQueue.shift();
        questionQueue.push(currentQ);
        
        answeredHistory.push({
            q: data.question,
            ans: currentWords.join(''),
            correct: data.correct_sentence,
            translation: data.translation,
            isCorrect: false
        });
        
        if (lives <= 0) {
            finishGame(false);
            return;
        }
    }
    gameState = 'NEXT';
    updateHeaderUI();
}

function finishGame(isWin) {
    if (isWin) {
        elements.resultTitle.textContent = "Latihan Selesai! 🎉";
        elements.resultTitle.className = "modal-title fw-bold text-success";
    } else {
        elements.resultTitle.textContent = "Nyawa Habis! 💔";
        elements.resultTitle.className = "modal-title fw-bold text-danger";
    }
    
    elements.finalLives.textContent = lives;
    elements.reviewContainer.innerHTML = '';
    
    currentQuestions.forEach((q) => {
        const lastEntry = answeredHistory.filter(h => h.q === q.question).pop();
        let statusClass = "review-card";
        let statusIcon = "fa-minus text-secondary";
        let userAnsText = "(Belum dijawab)";
        
        if (lastEntry) {
            if (lastEntry.isCorrect) {
                statusClass += " correct";
                statusIcon = "fa-check-circle text-success";
                userAnsText = parseFurigana(lastEntry.ans);
            } else {
                statusClass += " wrong";
                statusIcon = "fa-times-circle text-danger";
                userAnsText = parseFurigana(lastEntry.ans);
            }
        } else {
            statusClass += " wrong";
        }

        const item = document.createElement('div');
        item.className = statusClass;
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-start mb-2">
                <h6 class="fw-bold text-dark mb-0">${parseFurigana(q.question)}</h6>
                <i class="fas ${statusIcon} fs-4"></i>
            </div>
            <div class="small text-muted mb-2">Jawaban Kamu: <span class="fw-bold text-dark">${userAnsText}</span></div>
            <div class="small text-muted">Kunci: <span class="fw-bold text-primary">${parseFurigana(q.correct_sentence)}</span></div>
            <div class="small text-secondary fst-italic mt-1">${q.translation}</div>
        `;
        elements.reviewContainer.appendChild(item);
    });

    resultModalInstance.show();
}

elements.btnQuit.addEventListener('click', () => giveUpModalInstance.show());
elements.btnConfirmQuit.addEventListener('click', () => {
    giveUpModalInstance.hide();
    finishGame(false);
});