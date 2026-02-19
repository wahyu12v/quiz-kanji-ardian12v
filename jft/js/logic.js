// js/logic.js
import { state } from './state.js';
import { renderQuestion } from './ui.js';
import { stopAudio } from './audio.js';

export function selectAnswer(idx) {
    const q = state.currentQuestions[state.currentQuestionIndex];
    state.userAnswers[q.id] = idx;

    // UI Feedback Cepat tanpa render ulang
    document.querySelectorAll('.quiz-option-btn').forEach((btn, i) => {
        btn.classList.toggle('selected', i === idx);
    });

    // Update Progress
    const answeredCount = Object.keys(state.userAnswers).length;
    const totalQuestions = state.currentQuestions.length;
    const progressEl = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    if (progressEl) progressEl.style.width = `${(answeredCount / totalQuestions) * 100}%`;
    if (progressText) progressText.innerText = `${answeredCount}/${totalQuestions}`;

    // Auto Next
    if (state.currentQuestionIndex < state.currentQuestions.length - 1) {
        setTimeout(() => nextQuestion(), 220);
    } else {
        setTimeout(() => showFinishConfirmation(), 350);
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
    const timerEl = display ? display.closest('.custom-timer') : null;
    clearInterval(state.timerInterval);

    state.timerInterval = setInterval(() => {
        const m = Math.floor(timer / 60);
        const s = timer % 60;
        if (display) display.textContent = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;

        // Flash merah jika < 5 menit
        if (timerEl) timerEl.classList.toggle('timer-urgent', timer <= 300);

        if (--timer < 0) finishExam(true);
    }, 1000);
}

export function finishExam(isGiveUp) {
    // Tutup modal giveUp jika terbuka
    const giveUpEl = document.getElementById('giveUpModal');
    if (giveUpEl) {
        const m = bootstrap.Modal.getInstance(giveUpEl);
        if (m) m.hide();
    }
    clearInterval(state.timerInterval);
    stopAudio();

    let correctCount = 0;
    let reviewHtml = '';

    state.currentQuestions.forEach((q, idx) => {
        const userAnsIdx = state.userAnswers[q.id];
        const isCorrect  = userAnsIdx === q.answer;
        if (isCorrect) correctCount++;

        const userAnsText = userAnsIdx !== undefined
            ? q.options[userAnsIdx]
            : '<em>Tidak dijawab</em>';
        const correctAnsText = q.options[q.answer];

        const statusBadge = isCorrect
            ? `<span class="badge" style="background:var(--success-bg);color:#15803D;border:1px solid var(--success-border);">✓ Benar</span>`
            : `<span class="badge" style="background:var(--error-bg);color:var(--error);border:1px solid var(--error-border);">✗ Salah</span>`;

        reviewHtml += `
            <div class="review-item ${isCorrect ? 'correct' : 'wrong'}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <small class="fw-bold" style="color:var(--teal);letter-spacing:0.05em;">No. ${idx + 1}</small>
                    ${statusBadge}
                </div>
                <p class="review-q-text mb-3">${q.text}</p>
                <div class="row g-2">
                    <div class="col-12 col-md-6">
                        <div class="review-user-ans">
                            <small class="fw-bold d-block mb-1" style="letter-spacing:0.06em;font-size:0.65rem;opacity:0.7;">JAWABAN KAMU</small>
                            ${userAnsText}
                        </div>
                    </div>
                    <div class="col-12 col-md-6">
                        <div class="review-correct-ans">
                            <small class="fw-bold d-block mb-1" style="letter-spacing:0.06em;font-size:0.65rem;opacity:0.7;">KUNCI JAWABAN</small>
                            ${correctAnsText}
                        </div>
                    </div>
                </div>
            </div>`;
    });

    // Hitung skor JFT (skala 0–250)
    const finalScore = Math.round((correctCount / state.currentQuestions.length) * 250);
    const isPass = finalScore >= 200;

    const scoreEl  = document.getElementById('final-score');
    const statusEl = document.getElementById('pass-status');
    const reviewEl = document.getElementById('exam-review-container');

    if (scoreEl) scoreEl.innerText = finalScore;
    if (statusEl) {
        statusEl.innerText  = isPass ? '合格 LULUS' : '不合格 TIDAK LULUS';
        statusEl.style.color = isPass ? '#fff' : 'rgba(255,255,255,0.85)';
    }
    if (reviewEl) reviewEl.innerHTML = reviewHtml;

    const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
    resultModal.show();
}