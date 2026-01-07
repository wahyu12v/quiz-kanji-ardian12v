import { fetchData, shuffleArray } from './js/utils.js';

// --- VARIABLES ---
let allStories = [];
let currentQuestions = [];
let currentIndex = 0;
let currentWords = []; 
let userAnswers = []; // Simpan jawaban user
let storyModalInstance, giveUpModalInstance, resultModalInstance;

// --- DOM ELEMENTS ---
const elements = {
    startView: document.getElementById('start-view'),
    gameView: document.getElementById('game-view'),
    
    // Buttons
    btnQuit: document.getElementById('btn-quit'), // Tombol Bendera
    btnConfirmQuit: document.getElementById('btn-confirm-quit'), // Tombol Merah di Modal
    nextBtn: document.getElementById('next-btn'),

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
    // 1. Init Modals
    try {
        if(elements.storyModal) storyModalInstance = new bootstrap.Modal(elements.storyModal);
        if(elements.giveUpModal) giveUpModalInstance = new bootstrap.Modal(elements.giveUpModal);
        if(elements.resultModal) resultModalInstance = new bootstrap.Modal(elements.resultModal);
    } catch (e) { console.error("Bootstrap Error:", e); }

    // 2. Load Data
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
    
    currentIndex = 0;
    userAnswers = [];
    elements.qTotal.textContent = currentQuestions.length;
    loadQuestion();
}

function loadQuestion() {
    const data = currentQuestions[currentIndex];
    currentWords = [];
    
    // Reset UI
    elements.answerArea.innerHTML = '<div class="placeholder-text">Klik kata di bawah untuk menyusun...</div>';
    elements.answerArea.className = 'answer-area'; 
    elements.qCurrent.textContent = currentIndex + 1;
    elements.questionText.textContent = `"${data.question}"`;
    
    const progress = ((currentIndex) / currentQuestions.length) * 100;
    elements.progressBar.style.width = `${progress}%`;

    // Word Bank
    elements.wordBank.innerHTML = '';
    const shuffledParts = shuffleArray(data.parts); // Pastikan utils.js ada

    shuffledParts.forEach((word) => {
        const btn = document.createElement('button');
        btn.className = 'word-chip';
        btn.textContent = word;
        btn.onclick = () => moveToAnswer(word, btn);
        elements.wordBank.appendChild(btn);
    });
}

function moveToAnswer(word, bankBtn) {
    const placeholder = elements.answerArea.querySelector('.placeholder-text');
    if (placeholder) placeholder.remove();

    const ansChip = document.createElement('button');
    ansChip.className = 'word-chip';
    ansChip.textContent = word;
    ansChip.onclick = () => {
        ansChip.remove();
        bankBtn.classList.remove('used');
        const idx = currentWords.lastIndexOf(word);
        if (idx > -1) currentWords.splice(idx, 1);
        if (currentWords.length === 0) elements.answerArea.innerHTML = '<div class="placeholder-text">Klik kata...</div>';
    };

    elements.answerArea.appendChild(ansChip);
    bankBtn.classList.add('used');
    currentWords.push(word);
}

// --- NAVIGATION & FINISH ---

// 1. Simpan Jawaban & Lanjut
elements.nextBtn.addEventListener('click', () => {
    saveCurrentAnswer();
    currentIndex++;
    if (currentIndex < currentQuestions.length) {
        loadQuestion();
    } else {
        finishGame();
    }
});

function saveCurrentAnswer() {
    const data = currentQuestions[currentIndex];
    const userSentence = currentWords.join(''); // Gabungkan kata tanpa spasi
    const isCorrect = (userSentence === data.correct_sentence);

    userAnswers.push({
        id: data.id,
        qText: data.question,
        userAns: userSentence,
        correctAns: data.correct_sentence,
        translation: data.translation,
        isCorrect: isCorrect
    });
}

// 2. Tombol Bendera (Menyerah) -> Muncul Modal
elements.btnQuit.addEventListener('click', () => {
    giveUpModalInstance.show();
});

// 3. Konfirmasi Menyerah -> Finish Game
elements.btnConfirmQuit.addEventListener('click', () => {
    giveUpModalInstance.hide();
    saveCurrentAnswer(); // Simpan progres terakhir
    finishGame();
});

// 4. Hitung Nilai & Tampilkan Rapor
function finishGame() {
    let score = 0;
    elements.reviewContainer.innerHTML = '';

    // Aktifkan tooltip bootstrap pada elemen baru (opsional, agar rapi)
    const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltips.forEach(t => new bootstrap.Tooltip(t));

    currentQuestions.forEach((q, index) => {
        const answer = userAnswers.find(a => a.id === q.id);
        
        let userText = "(Tidak dijawab)";
        let isCorrect = false;
        // Class dasar untuk kartu review baru
        let cardClass = "review-card wrong"; 
        let icon = "fa-times-circle text-danger fs-3";
        let userBoxClass = "bg-danger-subtle text-danger-emphasis border border-danger-subtle";

        if (answer) {
            userText = answer.userAns || "(Kosong)";
            if (answer.isCorrect) {
                isCorrect = true;
                score++;
                cardClass = "review-card correct";
                icon = "fa-check-circle text-success fs-3";
                userBoxClass = "bg-success-subtle text-success-emphasis border border-success-subtle";
            }
        }

        // Render Item Pembahasan dengan Layout Baru yang Lega
        const item = document.createElement('div');
        item.className = cardClass; // Gunakan class baru dari CSS

        // Menggunakan Grid Bootstrap (Row/Col) agar rapi
        item.innerHTML = `
            <div class="d-flex justify-content-between align-items-start mb-4">
                <div>
                    <span class="badge bg-light text-secondary mb-2">Soal ${index + 1}</span>
                    <h6 class="fw-bold text-dark mb-0" style="line-height: 1.4;">"${q.question}"</h6>
                </div>
                <div class="ms-3">
                    <i class="fas ${icon}"></i>
                </div>
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

    // Tampilkan Skor Akhir
    const finalScoreVal = Math.round((score / currentQuestions.length) * 100);
    elements.finalScore.textContent = finalScoreVal;
    
    // Warna skor berdasarkan nilai
    elements.finalScore.classList.remove('text-primary', 'text-success', 'text-danger');
    if(finalScoreVal >= 80) elements.finalScore.classList.add('text-success');
    else if(finalScoreVal < 60) elements.finalScore.classList.add('text-danger');
    else elements.finalScore.classList.add('text-primary');
    
    // Tampilkan Modal Hasil
    resultModalInstance.show();
}