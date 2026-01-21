// main.js - Entry Point
import { state } from './js/state.js';
import { loadSystemVoices, playCurrentAudio, stopAudio } from './js/audio.js';
import { renderPackagesInModal, renderQuestion, renderSectionNav } from './js/ui.js';
import { startTimer, selectAnswer, nextQuestion, prevQuestion, showFinishConfirmation, finishExam } from './js/logic.js';

// --- GLOBAL BINDING (WAJIB) ---
// Membuat fungsi tersedia untuk onclick="..." di HTML
window.selectAnswer = selectAnswer;
window.nextQuestion = nextQuestion;
window.prevQuestion = prevQuestion;
window.showFinishConfirmation = showFinishConfirmation;
window.finishExam = finishExam;
window.playCurrentAudio = playCurrentAudio; // Fix Audio
window.stopAudio = stopAudio;
window.goToExamPage = (pkgId) => {
    window.location.href = `ujian.html?packageId=${pkgId}`;
};

document.addEventListener("DOMContentLoaded", () => {
    loadSystemVoices();

    fetch('soaljft.json')
        .then(res => res.json())
        .then(data => {
            state.packages = data.packages;
            
            if (document.getElementById('modal-package-list')) {
                renderPackagesInModal(); 
            } else if (document.getElementById('question-card-container')) {
                initExamPage(); 
            }
        })
        .catch(err => console.error("Gagal load JSON:", err));
});

function initExamPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const pkgId = urlParams.get('packageId');
    if (!pkgId) { window.location.href = 'index.html'; return; }
    
    const pkg = state.packages.find(p => p.id === pkgId);
    state.currentPackage = pkg;
    document.getElementById('package-name-display').innerText = pkg.title;

    state.currentQuestions = [];
    state.sectionMap = [];
    let qCounter = 0;
    pkg.sections.forEach(sec => {
        state.sectionMap.push({ name: sec.name, startIndex: qCounter });
        sec.questions.forEach(q => { q.sectionName = sec.name; state.currentQuestions.push(q); qCounter++; });
    });

    renderSectionNav(renderQuestion); 
    state.currentQuestionIndex = 0;
    startTimer(pkg.duration * 60);
    renderQuestion();
}