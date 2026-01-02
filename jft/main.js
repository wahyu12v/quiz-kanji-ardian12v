let currentPackage = null;
let timerInterval;
let userAnswers = {};
let totalDuration = 0; // dalam detik

// Konstanta Nilai JFT
const MAX_SCORE = 250;
const PASS_SCORE = 200;

// 1. LOAD DATA SAAT WEB DIBUKA
document.addEventListener("DOMContentLoaded", () => {
    fetch('soaljft.json')
        .then(response => response.json())
        .then(data => {
            renderPackages(data.packages);
        })
        .catch(err => console.error("Gagal memuat soal:", err));
});

// 2. RENDER DAFTAR PAKET DI HOME
function renderPackages(packages) {
    const listContainer = document.getElementById('package-list');
    listContainer.innerHTML = '';

    packages.forEach(pkg => {
        // Cek apakah paket punya soal
        const isDisabled = pkg.sections.length === 0 ? 'style="opacity:0.6; pointer-events:none;"' : '';
        const btnText = pkg.sections.length === 0 ? 'Segera Hadir' : 'Mulai Ujian';

        const card = `
            <div class="col-md-5">
                <div class="package-card" ${isDisabled} onclick="startExam('${pkg.id}')">
                    <h5>${pkg.title}</h5>
                    <p class="small mb-2">${pkg.description}</p>
                    <div class="d-flex justify-content-between align-items-center">
                        <span class="badge bg-light text-dark">⏱ ${pkg.duration_minutes} Menit</span>
                        <span class="fw-bold">▶ ${btnText}</span>
                    </div>
                </div>
            </div>
        `;
        listContainer.innerHTML += card;
        
        // Simpan data paket di window object untuk akses global sementara
        window[`pkg_${pkg.id}`] = pkg;
    });
}

// 3. MULAI UJIAN
function startExam(packageId) {
    currentPackage = window[`pkg_${packageId}`];
    if (!currentPackage) return;

    // UI Switching
    document.getElementById('home-screen').style.display = 'none';
    document.getElementById('exam-screen').style.display = 'block';
    document.getElementById('exam-navbar').style.display = 'flex';
    document.body.style.backgroundColor = "#f4f6f9"; // Reset background ke abu-abu

    // Render Soal
    renderQuestions(currentPackage.sections);

    // Start Timer
    startTimer(currentPackage.duration_minutes);
}

// 4. RENDER SOAL KE LAYAR
function renderQuestions(sections) {
    const container = document.getElementById('questions-container');
    container.innerHTML = '';

    sections.forEach((section, sIndex) => {
        // Judul Bagian (Vocabulary, Listening, dll)
        container.innerHTML += `<h4 class="section-title">${section.name}</h4>`;

        section.questions.forEach((q, qIndex) => {
            let mediaContent = '';

            // Jika Tipe Listening -> Tampilkan Tombol Play (TTS)
            if (q.type === 'listening') {
                mediaContent = `
                    <button class="btn btn-warning btn-sm mb-3" onclick="playAudio('${q.audio_script.replace(/'/g, "\\'")}')">
                        🔊 Putar Audio
                    </button>
                `;
            }

            // Jika Tipe Image -> Tampilkan Placeholder Gambar
            if (q.type === 'image') {
                mediaContent = `
                    <div class="bg-secondary text-white p-4 text-center mb-3 rounded">
                        ${q.image_placeholder || '[GAMBAR SOAL]'}
                    </div>
                `;
            }

            // Render Opsi Jawaban
            let optionsHtml = '';
            q.options.forEach((opt, oIndex) => {
                optionsHtml += `
                    <div class="form-check">
                        <input class="form-check-input" type="radio" 
                               name="q_${sIndex}_${qIndex}" 
                               id="opt_${sIndex}_${qIndex}_${oIndex}" 
                               value="${oIndex}"
                               onchange="saveAnswer('${sIndex}_${qIndex}', ${oIndex})">
                        <label class="form-check-label" for="opt_${sIndex}_${qIndex}_${oIndex}">
                            ${opt}
                        </label>
                    </div>
                `;
            });

            // Kartu Soal Lengkap
            const questionCard = `
                <div class="question-card">
                    <p class="fw-bold mb-2">Soal No. ${qIndex + 1}</p>
                    ${mediaContent}
                    <p class="mb-3">${q.question}</p>
                    <div class="options-group">
                        ${optionsHtml}
                    </div>
                </div>
            `;
            container.innerHTML += questionCard;
        });
    });
}

// 5. FITUR: SIMPAN JAWABAN SEMENTARA
function saveAnswer(questionId, answerIndex) {
    userAnswers[questionId] = answerIndex;
}

// 6. FITUR: TEXT TO SPEECH (Browser Built-in)
function playAudio(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP'; // Set bahasa Jepang
    utterance.rate = 0.9; // Sedikit diperlambat agar jelas
    window.speechSynthesis.speak(utterance);
}

// 7. TIMER LOGIC
function startTimer(minutes) {
    totalDuration = minutes * 60;
    const display = document.getElementById('timer-display');
    
    timerInterval = setInterval(() => {
        let m = Math.floor(totalDuration / 60);
        let s = totalDuration % 60;
        
        // Format 00:00
        m = m < 10 ? '0' + m : m;
        s = s < 10 ? '0' + s : s;
        
        display.innerText = `${m}:${s}`;
        
        if (totalDuration <= 0) {
            finishExam(true); // Waktu habis = auto finish
        } else {
            totalDuration--;
        }
    }, 1000);
}

// 8. SELESAI UJIAN & HITUNG SKOR (JFT LOGIC)
function finishExam(isGiveUp) {
    clearInterval(timerInterval);
    
    if (isGiveUp && !confirm("Apakah kamu yakin ingin menyerah? Nilai akan langsung dihitung.")) {
        startTimer(totalDuration / 60); // Resume timer jika cancel
        return;
    }

    // Hitung Skor
    let totalQuestions = 0;
    let correctCount = 0;
    let reviewHtml = '';

    currentPackage.sections.forEach((section, sIndex) => {
        section.questions.forEach((q, qIndex) => {
            totalQuestions++;
            const qKey = `${sIndex}_${qIndex}`;
            const userAnswer = userAnswers[qKey];
            const isCorrect = userAnswer === q.answer;

            if (isCorrect) correctCount++;

            // Buat HTML Pembahasan
            const statusColor = isCorrect ? 'text-success' : 'text-danger';
            const statusText = isCorrect ? 'BENAR' : 'SALAH';
            const userAnsText = userAnswer !== undefined ? q.options[userAnswer] : 'Tidak dijawab';
            const correctAnsText = q.options[q.answer];

            reviewHtml += `
                <div class="accordion-item">
                    <h2 class="accordion-header">
                        <button class="accordion-button collapsed ${statusColor}" type="button" data-bs-toggle="collapse" data-bs-target="#review_${qKey}">
                            No. ${qIndex + 1} (${section.name}) - ${statusText}
                        </button>
                    </h2>
                    <div id="review_${qKey}" class="accordion-collapse collapse">
                        <div class="accordion-body text-start">
                            <p><strong>Soal:</strong> ${q.question}</p>
                            <p><strong>Jawaban Kamu:</strong> ${userAnsText}</p>
                            <p><strong>Kunci Jawaban:</strong> <span class="text-success fw-bold">${correctAnsText}</span></p>
                            <div class="alert alert-info small">
                                💡 <strong>Penjelasan:</strong> ${q.explanation || '-'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    });

    // Rumus Konversi Skor ke Skala JFT (0 - 250)
    // Rumus: (Benar / Total Soal) * 250
    let finalScore = Math.round((correctCount / totalQuestions) * 250);
    
    // Tampilkan Modal
    const scoreText = document.getElementById('score-text');
    const statusBadge = document.getElementById('status-badge');
    const accordion = document.getElementById('accordionReview');

    scoreText.innerText = finalScore;
    accordion.innerHTML = reviewHtml;

    if (finalScore >= PASS_SCORE) {
        scoreText.classList.add('text-success');
        scoreText.classList.remove('text-danger');
        statusBadge.className = 'badge bg-success fs-5 mb-3';
        statusBadge.innerText = 'LULUS (合格)';
    } else {
        scoreText.classList.add('text-danger');
        scoreText.classList.remove('text-success');
        statusBadge.className = 'badge bg-danger fs-5 mb-3';
        statusBadge.innerText = 'TIDAK LULUS (不合格)';
    }

    // Tampilkan Modal Bootstrap
    const resultModal = new bootstrap.Modal(document.getElementById('resultModal'));
    resultModal.show();
}