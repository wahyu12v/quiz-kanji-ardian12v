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
// --- 2. INISIALISASI ---
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // --- LOGIKA LOAD PAKET DINAMIS ---
        // Ambil pilihan dari LocalStorage
        const packageId = localStorage.getItem('jft_package_id') || ""; 
        
        // Tentukan nama file berdasarkan struktur folder kamu
        // Paket 1 -> jft_questions.json
        // Paket 2 -> jft_questions2.json
        // dst...
        let fileName = 'jft_questions.json'; // Default
        if (packageId !== "" && packageId !== "1") {
            fileName = `jft_questions${packageId}.json`;
        }

        console.log("Memuat Paket:", fileName); // Untuk debugging

        // Tampilkan info paket di layar (Opsional, agar user tau)
        const headerTitle = document.querySelector('.cbt-header h6');
        if(headerTitle) {
            const pkgName = packageId === "" || packageId === "1" ? "1" : packageId;
            headerTitle.innerHTML = `JFT-Basic <span class="badge bg-warning text-dark">A2</span> <span class="badge bg-primary">Paket ${pkgName}</span>`;
        }

        // Fetch file yang sesuai
        const response = await fetch(`data/${fileName}`);
        
        if (!response.ok) throw new Error(`Gagal memuat soal (${fileName}). Pastikan file ada.`);
        let rawData = await response.json();
        
        // Sorting Soal
        allQuestions = rawData.sort((a, b) => {
            return (SECTION_ORDER[a.section] || 99) - (SECTION_ORDER[b.section] || 99);
        });

        startTimer();
        loadQuestion(0);
    } catch (error) { 
        alert("Terjadi Kesalahan: " + error.message); 
        console.error(error);
    }
});

// --- FITUR: LOMPAT SECTION ---
window.jumpToSection = (sectionName) => {
    stopAllAudio();
    const targetIndex = allQuestions.findIndex(q => q.section === sectionName);
    if (targetIndex !== -1) {
        currentIdx = targetIndex;
        loadQuestion(currentIdx);
    } else {
        alert("Section ini tidak memiliki soal.");
    }
};

// --- FITUR: KONFIRMASI STOP ---
window.confirmStop = () => {
    const stopModal = new bootstrap.Modal(document.getElementById('stopModal'));
    stopModal.show();
}

// --- LOAD SOAL ---
function loadQuestion(index) {
    elBtnPrev.disabled = (index === 0);
    elBtnNext.textContent = (index === allQuestions.length - 1) ? "Selesai" : "Berikutnya";
    
    // --- PERUBAHAN UTAMA DI SINI ---
    // Hapus logika disable. Tombol Next SELALU AKTIF.
    elBtnNext.disabled = false; 

    elProgress.textContent = `Soal ${index + 1}/${allQuestions.length}`;
    const progressPercent = ((index + 1) / allQuestions.length) * 100;
    elProgressBar.style.width = `${progressPercent}%`;

    const q = allQuestions[index];
    
    // Label Section & Warna
    let sectionLabel = q.section.toUpperCase();
    let badgeClass = "bg-primary";
    if(q.section === 'vocabulary') { sectionLabel = "VOCAB"; badgeClass = "bg-info text-dark"; }
    if(q.section === 'conversation') { sectionLabel = "CONVERSATION"; badgeClass = "bg-success"; }
    if(q.section === 'listening') { sectionLabel = "LISTENING"; badgeClass = "bg-danger"; }
    if(q.section === 'reading') { sectionLabel = "READING"; badgeClass = "bg-warning text-dark"; }
    
    elSection.textContent = sectionLabel;
    elSection.className = `section-badge ${badgeClass} text-white rounded`;

    // Audio Logic
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

// --- AUDIO ENGINE ---
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

    elAudio.play().catch(error => { });
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
        btn.className = 'btn choice-btn w-100 text-start d-flex align-items-center p-3 mb-2';
        btn.style.border = "1px solid #dee2e6";
        btn.style.borderRadius = "8px";
        btn.style.background = "white";
        
        let markContent = ["A", "B", "C", "D"][i] || "";
        
        if (savedAnswer === i) {
            btn.classList.add('selected');
            btn.style.borderColor = "#0d6efd";
            btn.style.backgroundColor = "#e7f1ff";
            btn.innerHTML = `<span class="badge bg-primary me-3 p-2 rounded-circle"><i class="bi bi-check"></i></span> ${choice}`;
        } else {
            btn.innerHTML = `<span class="badge bg-light text-dark border me-3 p-2 rounded-circle" style="width:30px">${markContent}</span> ${choice}`;
        }
        
        btn.onclick = () => {
            userAnswers[currentIdx] = i;
            renderChoices(q); 
            // Tidak perlu enable tombol di sini karena sudah enable dari awal
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

// --- SELESAI & PEMBAHASAN ---
window.finishExam = () => {
    clearInterval(timerInterval);
    stopAllAudio();
    
    const stopModalEl = document.getElementById('stopModal');
    const stopModal = bootstrap.Modal.getInstance(stopModalEl);
    if (stopModal) stopModal.hide();

    let correctCount = 0;
    const reviewContainer = document.getElementById('reviewContainer');
    reviewContainer.innerHTML = ""; 

    allQuestions.forEach((q, i) => {
        const userAnswer = userAnswers[i];
        const isCorrect = (userAnswer === q.correctAnswer);
        if (isCorrect) correctCount++;

        // Logika Tampilan Jika TIDAK DIJAWAB
        let userLabel = "<span class='text-danger fst-italic'>Tidak Dijawab</span>";
        if (userAnswer !== undefined) {
            userLabel = q.choices[userAnswer];
        }
        
        const correctLabel = q.choices[q.correctAnswer];
        
        const reviewItem = document.createElement('div');
        reviewItem.className = `review-item ${isCorrect ? 'correct' : 'wrong'}`;
        
        reviewItem.innerHTML = `
            <div class="review-badge badge ${isCorrect ? 'bg-success' : 'bg-danger'}">
                ${isCorrect ? 'Benar' : 'Salah'}
            </div>
            <p class="small text-muted mb-1">Soal No. ${i + 1} (${q.section.toUpperCase()})</p>
            <div class="review-question">${q.question.replace(/\n/g, "<br>")}</div>
            <hr class="my-2">
            <div class="small">
                <div>Jawaban Kamu: <strong>${userLabel}</strong></div>
                ${!isCorrect ? `<div class="text-success">Jawaban Benar: <strong>${correctLabel}</strong></div>` : ''}
            </div>
        `;
        reviewContainer.appendChild(reviewItem);
    });

    const finalScore = Math.round((correctCount / allQuestions.length) * 250);
    document.getElementById('finalScore').textContent = finalScore;
    
    const scoreCircle = document.querySelector('.score-circle');
    const percentage = (finalScore / 250) * 100;
    scoreCircle.style.background = `conic-gradient(#0d6efd 0% ${percentage}%, #e9ecef ${percentage}% 100%)`;

    const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
    resultModal.show();
}