// js/logic.js
import { state } from './state.js';
import { renderQuestion } from './ui.js';
import { stopAudio } from './audio.js';

export function selectAnswer(idx) {
    const q = state.currentQuestions[state.currentQuestionIndex];
    state.userAnswers[q.id] = idx; 

    // UI Feedback Cepat tanpa render ulang
    const allBtns = document.querySelectorAll('.quiz-option-btn');
    allBtns.forEach((btn, i) => {
        if (i === idx) btn.classList.add('selected');
        else btn.classList.remove('selected');
    });

    // Update Progress
    const answeredCount = Object.keys(state.userAnswers).length;
    const totalQuestions = state.currentQuestions.length;
    document.getElementById('progress-bar').style.width = `${(answeredCount / totalQuestions) * 100}%`;
    document.getElementById('progress-text').innerText = `${answeredCount}/${totalQuestions}`;

    // Auto Next
    if (state.currentQuestionIndex < state.currentQuestions.length - 1) {
        setTimeout(() => { nextQuestion(); }, 200); 
    } else {
        showFinishConfirmation();
    }
}

export function nextQuestion() {
    if (state.currentQuestionIndex < state.currentQuestions.length - 1) {
        state.currentQuestionIndex++;
        renderQuestion();
    }
}

export function prevQuestion() {
    if (state.currentQuestionIndex > 0) {
        state.currentQuestionIndex--;
        renderQuestion();
    }
}

export function showFinishConfirmation() {
    const modal = new bootstrap.Modal(document.getElementById('giveUpModal'));
    modal.show();
}

export function startTimer(durationSeconds) {
    let timer = durationSeconds;
    const display = document.getElementById('timer-display');
    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        const m = Math.floor(timer / 60);
        const s = timer % 60;
        display.textContent = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
        if (--timer < 0) {
            finishExam(true);
        }
    }, 1000);
}

export function finishExam(isGiveUp) {
    const giveUpModalEl = document.getElementById('giveUpModal');
    if (giveUpModalEl) {
        const giveUpModal = bootstrap.Modal.getInstance(giveUpModalEl);
        if (giveUpModal) giveUpModal.hide();
    }
    clearInterval(state.timerInterval);
    stopAudio();
    
    let correctCount = 0;
    let reviewHtml = '';

    state.currentQuestions.forEach((q, idx) => {
        const userAnsIdx = state.userAnswers[q.id];
        const isCorrect = userAnsIdx === q.answer;
        if (isCorrect) correctCount++;
        const statusBadge = isCorrect ? `<span class="badge bg-success">Benar</span>` : `<span class="badge bg-danger">Salah</span>`;
        const userAnsText = userAnsIdx !== undefined ? q.options[userAnsIdx] : 'Tidak dijawab';
        const correctAnsText = q.options[q.answer];

        // TAMPILAN REVIEW GELAP
        reviewHtml += `
            <div class="col-12">
                <div class="p-4 rounded-4 mb-4" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);">
                    <div class="d-flex justify-content-between mb-3">
                        <strong class="text-info">No. ${idx + 1}</strong>
                        ${statusBadge}
                    </div>
                    <p class="mb-3 text-white fw-bold">${q.text}</p>
                    <div class="row g-3 small text-white">
                        <div class="col-md-6"><div class="p-2 rounded border border-danger bg-danger bg-opacity-10">Jawab: ${userAnsText}</div></div>
                        <div class="col-md-6"><div class="p-2 rounded border border-info bg-info bg-opacity-10">Kunci: ${correctAnsText}</div></div>
                    </div>
                </div>
            </div>`;
    });

    const finalScore = Math.round((correctCount / state.currentQuestions.length) * 250);
    const isPass = finalScore >= 200;
    document.getElementById('final-score').innerText = finalScore;
    const statusEl = document.getElementById('pass-status');
    
    if (isPass) {
        statusEl.innerText = "LULUS (合格)";
        statusEl.className = "fw-bold mb-2 text-success";
    } else {
        statusEl.innerText = "TIDAK LULUS (不合格)";
        statusEl.className = "fw-bold mb-2 text-danger";
    }

    document.getElementById('exam-review-container').innerHTML = reviewHtml;
    const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
    resultModal.show();
}