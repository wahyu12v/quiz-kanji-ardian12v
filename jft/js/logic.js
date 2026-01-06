// logic.js - Logika Ujian & Scoring
import { state } from './state.js';
import { renderQuestion } from './ui.js';
import { stopAudio } from './audio.js';

export function selectAnswer(idx) {
    const q = state.currentQuestions[state.currentQuestionIndex];
    state.userAnswers[q.id] = idx; 

    // Update UI Visual (Biar gak render ulang full satu halaman)
    const allBtns = document.querySelectorAll('.quiz-option-btn');
    allBtns.forEach((btn, i) => {
        if (i === idx) btn.classList.add('selected');
        else btn.classList.remove('selected');
    });

    // Update Progress
    const answeredCount = Object.keys(state.userAnswers).length;
    const totalQuestions = state.currentQuestions.length;
    document.getElementById('progress-bar').style.width = `${(answeredCount / totalQuestions) * 100}%`;
    document.getElementById('progress-text').innerText = `${answeredCount}/${totalQuestions} Dijawab`;

    // Auto Next
    if (state.currentQuestionIndex < state.currentQuestions.length - 1) {
        setTimeout(() => { nextQuestion(); }, 150); 
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
    const giveUpModal = bootstrap.Modal.getInstance(giveUpModalEl);
    if (giveUpModal) giveUpModal.hide();

    clearInterval(state.timerInterval);
    stopAudio();
    
    let correctCount = 0;
    let reviewHtml = '';

    state.currentQuestions.forEach((q, idx) => {
        const userAnsIdx = state.userAnswers[q.id];
        const isCorrect = userAnsIdx === q.answer;
        if (isCorrect) correctCount++;

        const statusBadge = isCorrect 
            ? `<span class="badge bg-success"><i class="fas fa-check"></i> Benar</span>` 
            : `<span class="badge bg-danger"><i class="fas fa-times"></i> Salah</span>`;

        const userAnsText = userAnsIdx !== undefined ? q.options[userAnsIdx] : '<span class="text-muted">Tidak dijawab</span>';
        const correctAnsText = q.options[q.answer];

        reviewHtml += `
            <div class="col-12">
                <div class="p-3 border rounded bg-light">
                    <div class="d-flex justify-content-between mb-2">
                        <strong>No. ${idx + 1} (${q.sectionName})</strong>
                        ${statusBadge}
                    </div>
                    <p class="mb-2 text-dark fw-bold">${q.text}</p>
                    ${q.translation ? `<p class="mb-2 text-muted small"><i class="fas fa-language"></i> Arti: ${q.translation}</p>` : ''}
                    <div class="row g-2 mt-3 text-small" style="font-size: 0.9rem;">
                        <div class="col-md-6">
                            <div class="p-2 border rounded ${isCorrect ? 'bg-success-subtle border-success' : 'bg-danger-subtle border-danger'}">
                                <small class="d-block fw-bold mb-1">Jawaban Kamu:</small>
                                ${userAnsText}
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="p-2 border rounded bg-primary-subtle border-primary">
                                <small class="d-block fw-bold mb-1">Kunci Jawaban:</small>
                                ${correctAnsText}
                            </div>
                        </div>
                    </div>
                    ${q.explanation ? `<div class="mt-2 p-2 bg-white border rounded small text-muted"><i class="fas fa-info-circle text-primary"></i> <strong>Penjelasan:</strong> ${q.explanation}</div>` : ''}
                </div>
            </div>
        `;
    });

    const finalScore = Math.round((correctCount / state.currentQuestions.length) * 250);
    const isPass = finalScore >= 200;

    document.getElementById('final-score').innerText = finalScore;
    const statusEl = document.getElementById('pass-status');
    
    if (isPass) {
        statusEl.innerText = "LULUS (合格)";
        statusEl.className = "fw-bold mb-2 text-success";
        document.querySelector('.score-circle').style.border = "8px solid #28a745";
    } else {
        statusEl.innerText = "TIDAK LULUS (不合格)";
        statusEl.className = "fw-bold mb-2 text-danger";
        document.querySelector('.score-circle').style.border = "8px solid #dc3545";
    }

    document.getElementById('exam-review-container').innerHTML = reviewHtml;
    const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
    resultModal.show();
}