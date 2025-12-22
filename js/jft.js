// Konfigurasi Global
let allQuestions = [];
let currentIdx = 0;
let userAnswers = {}; 
let timerInterval;
let totalTime = 60 * 60; 
let availableVoices = [];

const SECTION_ORDER = {
    "vocabulary": 1,
    "conversation": 2,
    "listening": 3,
    "reading": 4
};

// DOM Elements
const elQuestionText = document.getElementById('questionText');
const elChoices = document.getElementById('choicesContainer');
const elBtnNext = document.getElementById('btnNext');
const elBtnPrev = document.getElementById('btnPrev');
const elProgress = document.getElementById('questionProgress');
const elProgressBar = document.getElementById('progressBar');
const elSection = document.getElementById('sectionName');
const elTimer = document.getElementById('timerDisplay');
const elListeningOverlay = document.getElementById('listeningOverlay');
const elQuestionContent = document.getElementById('questionContent');
const elAudio = document.getElementById('examAudio');

// --- LOAD SUARA ---
function loadVoices() { 
    availableVoices = window.speechSynthesis.getVoices(); 
}
loadVoices();
if (speechSynthesis.onvoiceschanged !== undefined) { 
    speechSynthesis.onvoiceschanged = loadVoices; 
}

// --- INISIALISASI ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('data/jft_questions.json');
        if (!response.ok) throw new Error("Gagal memuat soal");
        let rawData = await response.json();
        
        allQuestions = rawData.sort((a, b) => {
            return (SECTION_ORDER[a.section] || 99) - (SECTION_ORDER[b.section] || 99);
        });

        startTimer();
        loadQuestion(0);
    } catch (error) { console.error(error); }
});

// --- FITUR BARU: LOMPAT SECTION ---
window.jumpToSection = (sectionName) => {
    // 1. Matikan audio jika sedang jalan
    stopAllAudio();

    // 2. Cari soal pertama dari section yang dituju
    // findIndex akan mencari urutan pertama yang cocok
    const targetIndex = allQuestions.findIndex(q => q.section === sectionName);
    
    if (targetIndex !== -1) {
        currentIdx = targetIndex;
        loadQuestion(currentIdx);
    } else {
        alert("Section ini tidak memiliki soal.");
    }
};

// --- LOAD SOAL ---
function loadQuestion(index) {
    elBtnPrev.disabled = (index === 0);
    elBtnNext.textContent = (index === allQuestions.length - 1) ? "Selesai / Finish" : "Berikutnya";
    
    // Aktifkan Next jika sudah pernah dijawab
    elBtnNext.disabled = (userAnswers[index] === undefined);

    elProgress.textContent = `Soal ${index + 1} dari ${allQuestions.length}`;
    const progressPercent = ((index + 1) / allQuestions.length) * 100;
    elProgressBar.style.width = `${progressPercent}%`;

    const q = allQuestions[index];
    
    // Label Section & Warna
    let sectionLabel = q.section.toUpperCase();
    let badgeClass = "bg-primary";
    if(q.section === 'vocabulary') { sectionLabel = "Script & Vocabulary"; badgeClass = "bg-info text-dark"; }
    if(q.section === 'conversation') { sectionLabel = "Expression & Conversation"; badgeClass = "bg-success"; }
    if(q.section === 'listening') { sectionLabel = "Listening Comprehension"; badgeClass = "bg-danger"; }
    if(q.section === 'reading') { sectionLabel = "Reading Comprehension"; badgeClass = "bg-warning text-dark"; }
    
    elSection.textContent = sectionLabel;
    elSection.className = `section-badge ${badgeClass} text-white`;

    // --- LOGIKA AUDIO (Dipertahankan) ---
    if (q.section === 'listening') {
        elQuestionContent.style.display = 'none';
        elListeningOverlay.style.display = 'block'; 
        stopAllAudio();

        if (q.script) {
            setTimeout(() => {
                playSmartAudio(q.script, () => {
                    elListeningOverlay.style.display = 'none';
                    elQuestionContent.style.display = 'block';
                    renderChoices(q);
                });
            }, 500);
        } else {
            elListeningOverlay.style.display = 'none';
            elQuestionContent.style.display = 'block';
            renderChoices(q);
        }
    } else {
        stopAllAudio();
        elListeningOverlay.style.display = 'none';
        elQuestionContent.style.display = 'block';
        renderChoices(q);
    }
}

// --- AUDIO ENGINE (Dipertahankan) ---
function playSmartAudio(text, onEndCallback) {
    if (availableVoices.length === 0) availableVoices = window.speechSynthesis.getVoices();
    const jaVoice = availableVoices.find(v => v.lang.includes('ja') || v.name.includes('Japan'));

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP'; 
    utterance.rate = 0.9;
    if (jaVoice) utterance.voice = jaVoice;

    let offlineSuccess = false;
    utterance.onstart = () => { offlineSuccess = true; };
    utterance.onend = () => { if (onEndCallback) onEndCallback(); };
    utterance.onerror = (e) => { 
        if (!offlineSuccess) playOnlineAudio(text, onEndCallback);
    };

    try {
        window.speechSynthesis.speak(utterance);
        setTimeout(() => {
            if (!window.speechSynthesis.speaking && !offlineSuccess) {
                window.speechSynthesis.cancel();
                playOnlineAudio(text, onEndCallback);
            }
        }, 2000);
    } catch (err) {
        playOnlineAudio(text, onEndCallback);
    }
}

function playOnlineAudio(text, onEndCallback) {
    const encodedText = encodeURIComponent(text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=ja&client=dict-chrome-ex`;
    
    elAudio.src = url;
    elAudio.style.display = 'none';
    elAudio.onend = () => { if (onEndCallback) onEndCallback(); };
    elAudio.onerror = (e) => { if (onEndCallback) onEndCallback(); };

    const playPromise = elAudio.play();
    if (playPromise !== undefined) {
        playPromise.catch(error => { });
    }
}

function stopAllAudio() {
    window.speechSynthesis.cancel();
    elAudio.pause();
    elAudio.currentTime = 0;
}

// --- RENDER PILIHAN ---
function renderChoices(q) {
    elQuestionText.innerHTML = q.question.replace(/\n/g, "<br>");
    elChoices.innerHTML = '';
    const savedAnswer = userAnswers[currentIdx];

    q.choices.forEach((choice, i) => {
        const btn = document.createElement('button');
        btn.className = 'btn choice-btn w-100 text-start d-flex align-items-center';
        
        let markContent = ["A", "B", "C", "D"][i] || "";

        if (savedAnswer === i) {
            btn.classList.add('selected');
            btn.innerHTML = `<span class="choice-mark"><i class="bi bi-check-lg"></i></span> ${choice}`;
        } else {
            btn.innerHTML = `<span class="choice-mark">${markContent}</span> ${choice}`;
        }
        
        btn.onclick = () => {
            document.querySelectorAll('.choice-btn').forEach((b, idx) => {
                b.classList.remove('selected');
                let char = ["A", "B", "C", "D"][idx];
                b.querySelector('.choice-mark').innerHTML = char;
            });
            
            btn.classList.add('selected');
            btn.querySelector('.choice-mark').innerHTML = `<i class="bi bi-check-lg"></i>`;
            
            userAnswers[currentIdx] = i;
            elBtnNext.disabled = false;
        };
        elChoices.appendChild(btn);
    });
}

// --- NAVIGASI ---
elBtnNext.onclick = () => {
    stopAllAudio();
    if (currentIdx < allQuestions.length - 1) {
        currentIdx++;
        loadQuestion(currentIdx);
    } else {
        finishExam();
    }
};

elBtnPrev.onclick = () => {
    stopAllAudio();
    if (currentIdx > 0) {
        currentIdx--;
        loadQuestion(currentIdx);
    }
};

function startTimer() {
    timerInterval = setInterval(() => {
        totalTime--;
        const m = Math.floor(totalTime / 60);
        const s = totalTime % 60;
        elTimer.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        if (totalTime <= 0) { clearInterval(timerInterval); finishExam(); }
    }, 1000);
}

function finishExam() {
    clearInterval(timerInterval);
    stopAllAudio();
    
    let correctCount = 0;
    allQuestions.forEach((q, i) => {
        if (userAnswers[i] === q.correctAnswer) { correctCount++; }
    });

    const finalScore = Math.round((correctCount / allQuestions.length) * 250);
    document.getElementById('finalScore').textContent = finalScore;
    
    const scoreCircle = document.querySelector('.score-circle');
    const percentage = (finalScore / 250) * 100;
    scoreCircle.style.background = `conic-gradient(#0d6efd 0% ${percentage}%, #e9ecef ${percentage}% 100%)`;

    const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
    resultModal.show();
}