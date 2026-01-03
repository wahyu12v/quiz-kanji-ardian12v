let packages = [];
let currentPackage = null;
let currentQuestions = []; 
let currentQuestionIndex = 0;
let userAnswers = {}; 
let timerInterval;
let sectionMap = []; 
let voices = [];
let audioQueue = []; 
let isPlaying = false; 
let currentAudioObj = null;

// -- INIT --
document.addEventListener("DOMContentLoaded", () => {
    loadSystemVoices();

    fetch('soaljft.json')
        .then(res => res.json())
        .then(data => {
            packages = data.packages;
            
            if (document.getElementById('modal-package-list')) {
                renderPackagesInModal(); 
            } else if (document.getElementById('question-card-container')) {
                initExamPage(); 
            }
        })
        .catch(err => console.error("Gagal load JSON:", err));
});

function loadSystemVoices() {
    if ('speechSynthesis' in window) {
        voices = window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            voices = window.speechSynthesis.getVoices();
        };
    }
}

// ---------------------------------------------
// LOGIKA AUDIO PLAYER (MODERN UI + VISUALIZER)
// ---------------------------------------------
function playTTS(text, btnElement) {
    stopAudio(); // Reset dulu

    const card = document.getElementById('audio-player-card');
    const statusText = document.getElementById('audio-status-text');
    const btnIcon = btnElement ? btnElement.querySelector('i') : null;

    // 1. STATE: LOADING
    if (btnElement && card) {
        btnElement.disabled = true;
        if(btnIcon) {
            btnIcon.className = 'fas fa-spinner fa-spin'; // Icon loading
        }
        if(statusText) statusText.innerText = "Memuat...";
    }

    // Fungsi Saat Selesai / Reset UI
    const onComplete = () => {
        if (card) card.classList.remove('active'); // Matikan animasi
        if (btnElement) {
            btnElement.disabled = false;
            if(btnIcon) btnIcon.className = 'fas fa-play'; // Balik icon play
        }
        if (statusText) statusText.innerText = "Klik Play";
        isPlaying = false;
    };

    // Fungsi Saat Mulai Bicara (Visualizer On)
    const onSpeaking = () => {
        if (card) card.classList.add('active'); // Nyalakan animasi gelombang
        if (btnElement) {
            btnElement.disabled = false; 
            if(btnIcon) btnIcon.className = 'fas fa-volume-high'; // Icon suara
        }
        if (statusText) statusText.innerText = "Sedang Bicara...";
    };

    // --- PARSING TEXT ([N][M][F]) ---
    const parts = text.split(/(\[[NMF]\])/g).filter(s => s.trim().length > 0);
    let currentRole = 'N'; 
    audioQueue = [];

    parts.forEach(part => {
        if (part === '[N]' || part === '[M]' || part === '[F]') {
            currentRole = part.replace('[', '').replace(']', '');
        } else {
            audioQueue.push({ text: part, role: currentRole });
        }
    });

    if (audioQueue.length === 0) audioQueue.push({ text: text, role: 'N' });

    isPlaying = true;
    onSpeaking(); // Trigger visual

    // --- CEK AUDIO ENGINE ---
    let japanVoice = null;
    if ('speechSynthesis' in window) {
        if (voices.length === 0) voices = window.speechSynthesis.getVoices();
        japanVoice = voices.find(v => v.lang === 'ja-JP' || v.lang === 'ja_JP');
    }

    if (japanVoice) {
        // Mode Offline (Pitch Shift - Suara Asli Beda)
        console.log("Mode: Offline");
        playOfflineQueue(japanVoice, onComplete);
    } else {
        // Mode Online (Speed Trick - Manipulasi Kecepatan)
        console.log("Mode: Online");
        playOnlineQueue(onComplete);
    }
}

// OFFLINE PLAYER
function playOfflineQueue(voice, onComplete) {
    const playNext = () => {
        if (audioQueue.length === 0 || !isPlaying) {
            onComplete();
            return;
        }

        const item = audioQueue.shift();
        const utterance = new SpeechSynthesisUtterance(item.text);
        utterance.voice = voice;
        utterance.lang = 'ja-JP';
        
        // Pitch Control
        if (item.role === 'M') { utterance.pitch = 0.6; utterance.rate = 0.8; }
        else if (item.role === 'F') { utterance.pitch = 1.3; utterance.rate = 0.9; }
        else { utterance.pitch = 1.0; utterance.rate = 0.85; }

        utterance.onend = playNext;
        utterance.onerror = (e) => {
            console.error("Offline Error", e);
            playNext();
        };
        window.speechSynthesis.speak(utterance);
    };
    playNext();
}

// ONLINE PLAYER
function playOnlineQueue(onComplete) {
    const playNextChunk = () => {
        if (audioQueue.length === 0 || !isPlaying) {
            onComplete();
            return;
        }

        const item = audioQueue.shift();
        // Pecah kalimat panjang agar tidak ditolak Google
        const chunks = item.text.match(/[^。！？、]+[。！？、]*/g) || [item.text];
        let subQueue = chunks.map(c => ({ text: c, role: item.role }));
        
        const playSubQueue = () => {
            if (subQueue.length === 0) {
                playNextChunk();
                return;
            }
            
            const subItem = subQueue.shift();
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(subItem.text)}&tl=ja&client=tw-ob`;
            
            currentAudioObj = new Audio(url);
            
            // Speed Trick untuk beda suara
            if (subItem.role === 'M') currentAudioObj.playbackRate = 0.85; // Berat
            else if (subItem.role === 'F') currentAudioObj.playbackRate = 1.15; // Cempreng
            else currentAudioObj.playbackRate = 1.0;

            // Browser compatibility for pitch preservation
            if (currentAudioObj.mozPreservesPitch !== undefined) currentAudioObj.mozPreservesPitch = false;
            if (currentAudioObj.preservesPitch !== undefined) currentAudioObj.preservesPitch = false;

            currentAudioObj.onended = playSubQueue;
            currentAudioObj.onerror = (e) => {
                console.warn("Skip chunk error", e);
                playSubQueue();
            };
            
            currentAudioObj.play().catch(e => {
                console.error("Audio blocked", e);
                onComplete();
            });
        };
        playSubQueue();
    };
    playNextChunk();
}

function stopAudio() {
    isPlaying = false;
    audioQueue = []; 
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    if (currentAudioObj) {
        currentAudioObj.pause();
        currentAudioObj = null;
    }
    
    // Reset UI ke kondisi awal
    const card = document.getElementById('audio-player-card');
    const btnPlay = document.getElementById('btn-play-audio');
    const btnIcon = btnPlay ? btnPlay.querySelector('i') : null;
    const statusText = document.getElementById('audio-status-text');

    if (card) card.classList.remove('active');
    if (statusText) statusText.innerText = "Klik Play";
    if (btnPlay) {
        btnPlay.disabled = false;
        if(btnIcon) btnIcon.className = 'fas fa-play';
    }
}

// ---------------------------------------------
// RENDER & UI
// ---------------------------------------------
function renderQuestion() {
    const q = currentQuestions[currentQuestionIndex];
    const container = document.getElementById('question-card-container');
    
    stopAudio();

    // Highlight Navigasi
    const navBtns = document.querySelectorAll('#section-nav button');
    navBtns.forEach(btn => btn.classList.remove('active'));
    let activeSecIdx = sectionMap.findIndex((s, i) => {
        const nextS = sectionMap[i+1];
        return currentQuestionIndex >= s.startIndex && (!nextS || currentQuestionIndex < nextS.startIndex);
    });
    if(navBtns[activeSecIdx]) navBtns[activeSecIdx].classList.add('active');

    // Progress Bar
    const answeredCount = Object.keys(userAnswers).length;
    const totalQuestions = currentQuestions.length;
    document.getElementById('progress-bar').style.width = `${(answeredCount / totalQuestions) * 100}%`;
    document.getElementById('progress-text').innerText = `${answeredCount}/${totalQuestions} Dijawab`;

    // --- RENDER AUDIO PLAYER (MODERN CARD) ---
    let audioHtml = '';
    if (q.type === 'audio') {
        audioHtml = `
            <div id="audio-player-card" class="audio-player-card mb-4">
                <button id="btn-play-audio" class="btn-play-modern">
                    <i class="fas fa-play"></i>
                </button>

                <div class="audio-info">
                    <span id="audio-status-text" class="audio-label">Klik Play</span>
                    <div class="visualizer">
                        <div class="wave-bar"></div>
                        <div class="wave-bar"></div>
                        <div class="wave-bar"></div>
                        <div class="wave-bar"></div>
                        <div class="wave-bar"></div>
                    </div>
                </div>

                <button id="btn-stop-audio" class="btn-stop-modern" title="Stop">
                    <i class="fas fa-stop"></i>
                </button>
            </div>
        `;
    }

    let optionsHtml = '';
    q.options.forEach((opt, idx) => {
        const isSelected = userAnswers[q.id] === idx ? 'selected' : '';
        optionsHtml += `
            <button class="quiz-option-btn ${isSelected}" onclick="selectAnswer(${idx})">
                <div class="opt-label">${String.fromCharCode(65 + idx)}</div>
                <div class="text-start w-100 fw-medium">${opt}</div>
            </button>
        `;
    });

    container.innerHTML = `
        <div class="question-card fade-in">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill border border-primary border-opacity-25">
                    ${q.sectionName}
                </span>
                <span class="text-muted small fw-bold">No. ${currentQuestionIndex + 1}</span>
            </div>
            ${audioHtml}
            <div class="question-text mb-4 fs-5" style="line-height: 1.6;">
                ${q.text}
            </div>
            <div class="options-list d-grid gap-2">
                ${optionsHtml}
            </div>
        </div>
    `;

    // Pasang Event Listener Audio
    if (q.type === 'audio') {
        setTimeout(() => {
            const btnPlay = document.getElementById('btn-play-audio');
            const btnStop = document.getElementById('btn-stop-audio');
            if (btnPlay) {
                btnPlay.onclick = function() {
                    playTTS(q.script, this); // 'this' adalah tombol play
                };
            }
            if (btnStop) {
                btnStop.onclick = function() {
                    stopAudio();
                };
            }
        }, 50);
    }

    document.getElementById('btn-prev').disabled = currentQuestionIndex === 0;
    
    if (currentQuestionIndex === currentQuestions.length - 1) {
        document.getElementById('btn-next').classList.add('hidden');
        document.getElementById('btn-finish').classList.remove('hidden');
    } else {
        document.getElementById('btn-next').classList.remove('hidden');
        document.getElementById('btn-finish').classList.add('hidden');
    }
}

// ---------------------------------------------
// NAVIGATION & SCORING
// ---------------------------------------------
function renderPackagesInModal() {
    const grid = document.getElementById('modal-package-list');
    if (!grid) return;
    grid.innerHTML = '';

    packages.forEach(pkg => {
        const col = document.createElement('div');
        col.className = 'col-md-6';
        col.innerHTML = `
            <div class="package-card h-100 border p-3" style="cursor: pointer; border-radius: 15px; transition: transform 0.2s;" 
                 onclick="goToExamPage('${pkg.id}')"
                 onmouseover="this.style.transform='scale(1.02)'; this.style.borderColor='#007bff'"
                 onmouseout="this.style.transform='scale(1)'; this.style.borderColor='#dee2e6'">
                <div class="d-flex align-items-center mb-3">
                    <div style="width: 50px; height: 50px; background: ${pkg.color}; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.5rem; margin-right: 15px;">
                        <i class="${pkg.icon}"></i>
                    </div>
                    <div>
                        <h6 class="fw-bold mb-0">${pkg.title}</h6>
                        <small class="text-muted">${pkg.subtitle}</small>
                    </div>
                </div>
                <div class="d-flex justify-content-between align-items-center small">
                    <span class="badge bg-light text-dark border">⏱ ${pkg.duration} Menit</span>
                    <span class="text-primary fw-bold">Mulai <i class="fas fa-arrow-right"></i></span>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

function goToExamPage(pkgId) {
    window.location.href = `ujian.html?packageId=${pkgId}`;
}

function initExamPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const pkgId = urlParams.get('packageId');

    if (!pkgId) { alert("Paket tidak ditemukan!"); window.location.href = 'index.html'; return; }
    const pkg = packages.find(p => p.id === pkgId);
    if (!pkg) { alert("Data paket error."); window.location.href = 'index.html'; return; }

    currentPackage = pkg;
    document.getElementById('package-name-display').innerText = pkg.title;

    currentQuestions = [];
    sectionMap = [];
    let qCounter = 0;

    pkg.sections.forEach(sec => {
        sectionMap.push({ name: sec.name, startIndex: qCounter });
        sec.questions.forEach(q => {
            q.sectionName = sec.name; 
            currentQuestions.push(q);
            qCounter++;
        });
    });

    renderSectionNav();
    currentQuestionIndex = 0;
    userAnswers = {};
    startTimer(pkg.duration * 60);
    renderQuestion();
}

function renderSectionNav() {
    const navContainer = document.getElementById('section-nav');
    if(!navContainer) return;
    navContainer.innerHTML = '';

    const shortNames = ["Script", "Conversation", "Listening", "Reading"];
    const icons = [
        '<i class="fas fa-font me-1"></i>',       
        '<i class="fas fa-comments me-1"></i>',   
        '<i class="fas fa-headphones me-1"></i>', 
        '<i class="fas fa-book-open me-1"></i>'   
    ];

    sectionMap.forEach((sec, idx) => {
        const btn = document.createElement('button');
        const colorClass = `btn-sect-${idx % 4}`;
        const displayName = shortNames[idx] || sec.name; 
        const iconHtml = icons[idx % 4] || '';

        btn.className = `btn btn-sm rounded-pill px-3 py-2 btn-sect ${colorClass}`;
        btn.innerHTML = `${iconHtml} ${displayName}`;
        btn.onclick = () => {
            currentQuestionIndex = sec.startIndex;
            renderQuestion();
        };
        navContainer.appendChild(btn);
    });
}

function selectAnswer(idx) {
    const q = currentQuestions[currentQuestionIndex];
    userAnswers[q.id] = idx; 

    // Visual Feedback (Update Class tanpa render ulang)
    const allBtns = document.querySelectorAll('.quiz-option-btn');
    allBtns.forEach((btn, i) => {
        if (i === idx) btn.classList.add('selected');
        else btn.classList.remove('selected');
    });

    // Update Progress Bar
    const answeredCount = Object.keys(userAnswers).length;
    const totalQuestions = currentQuestions.length;
    document.getElementById('progress-bar').style.width = `${(answeredCount / totalQuestions) * 100}%`;
    document.getElementById('progress-text').innerText = `${answeredCount}/${totalQuestions} Dijawab`;

    // Pindah Otomatis (Cepat)
    if (currentQuestionIndex < currentQuestions.length - 1) {
        setTimeout(() => {
            nextQuestion();
        }, 150); 
    } else {
        showFinishConfirmation();
    }
}

function nextQuestion() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        renderQuestion();
    }
}

function prevQuestion() {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        renderQuestion();
    }
}

function showFinishConfirmation() {
    const modal = new bootstrap.Modal(document.getElementById('giveUpModal'));
    document.querySelector('#giveUpModal h4').innerText = "Selesai Ujian?";
    document.querySelector('#giveUpModal p').innerText = "Apakah kamu yakin sudah mengisi semua soal?";
    const btnAction = document.querySelector('#giveUpModal .btn-danger');
    btnAction.innerText = "Ya, Selesai";
    btnAction.classList.replace('btn-danger', 'btn-success');
    btnAction.onclick = () => finishExam(false);
    modal.show();
}

function startTimer(durationSeconds) {
    let timer = durationSeconds;
    const display = document.getElementById('timer-display');
    
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const m = Math.floor(timer / 60);
        const s = timer % 60;
        display.textContent = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
        if (--timer < 0) {
            finishExam(true);
        }
    }, 1000);
}

function finishExam(isGiveUp) {
    const giveUpModalEl = document.getElementById('giveUpModal');
    const giveUpModal = bootstrap.Modal.getInstance(giveUpModalEl);
    if (giveUpModal) giveUpModal.hide();

    clearInterval(timerInterval);
    stopAudio();
    
    let correctCount = 0;
    let reviewHtml = '';

    currentQuestions.forEach((q, idx) => {
        const userAnsIdx = userAnswers[q.id];
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

                    ${q.explanation ? `
                        <div class="mt-2 p-2 bg-white border rounded small text-muted">
                            <i class="fas fa-info-circle text-primary"></i> <strong>Penjelasan:</strong> ${q.explanation}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    });

    const finalScore = Math.round((correctCount / currentQuestions.length) * 250);
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