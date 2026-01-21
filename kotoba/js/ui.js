import { escapeHtml } from "./utils.js";
import { KEYS, SELECTORS } from "./constants.js";

const area = document.getElementById(SELECTORS.quizArea);

// ============================================================
// 1. INJECT CSS GLOBAL (Animasi, Font, Confetti)
// ============================================================
// Kita pasang style ini lewat JS agar Anda tidak perlu edit style.css lagi
const style = document.createElement("style");
style.innerHTML = `
    /* Animasi Kartu Pilihan saat di-hover */
    .choice-card-anim { 
        transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s, border-color 0.2s !important; 
    }
    .choice-card-anim:hover { 
        transform: translateY(-5px); 
        box-shadow: 0 10px 20px rgba(244, 114, 182, 0.25) !important; 
        border-color: #f472b6 !important; 
        z-index: 2; 
        background-color: rgba(244, 114, 182, 0.1) !important;
    }
    .choice-card-anim:active { 
        transform: scale(0.98) translateY(-2px); 
    }
    
    /* Font Responsif untuk Soal (Agar teks panjang mengecil otomatis) */
    .q-text-responsive {
        font-size: clamp(1.8rem, 5vw, 3.5rem); 
        line-height: 1.3;
        font-weight: 800;
        color: #ffffff !important;
        text-shadow: 0 0 20px rgba(244, 114, 182, 0.6);
        text-align: center;
        word-wrap: break-word; 
        width: 100%;
    }

    /* Efek Confetti (Hujan Kertas) */
    .confetti {
        position: absolute;
        width: 10px; height: 10px;
        background-color: #f0f;
        animation: fall linear forwards;
        z-index: 9999;
    }
    @keyframes fall {
        to { transform: translateY(100vh) rotate(720deg); }
    }
`;
document.head.appendChild(style);


// ============================================================
// 2. HELPER FUNCTIONS
// ============================================================

// Mengatur ukuran font berdasarkan panjang teks
function formatQuestion(text) {
    const len = text.length;
    let fontSize = "5rem"; 
    if (len > 30) fontSize = "1.8rem";
    else if (len > 15) fontSize = "2.5rem";
    else if (len > 6) fontSize = "3.5rem";

    return `<div class="d-flex align-items-center justify-content-center px-2" style="min-height: 120px;">
                <span class="q-text-responsive" style="font-size: ${fontSize} !important; line-height: 1.2;">
                    ${escapeHtml(text)}
                </span>
            </div>`;
}

// Mengubah kode mode menjadi teks Bahasa Indonesia yang cantik
function formatModeName(type) {
  if (type === "quiz") return "Tebak Arti";
  if (type === "quiz_hiragana") return "Tebak Bacaan";
  if (type === "mem") return "Tulis Arti";
  if (type === "write_romaji") return "Tulis Romaji";
  return type;
}


// ============================================================
// 3. RENDER QUIZ (PILIHAN GANDA)
// ============================================================
export function renderQuiz(state, qNo) {
  area.innerHTML = "";
  const idx = state.current;
  const q = state.batch[idx];
  const choices = state.choicesPerQ[idx];
  const isLupa = state.answers[idx] === "Lupa";

  // Ambil data soal
  const kanjiTxt = String(q[KEYS.kanji] || "").trim();
  const meanTxt = String(q[KEYS.meaning] || "").trim();
  const hiraTxt = String(q[KEYS.hiragana] || "").trim();

  let displayHtml = "";

  // --- LOGIKA TAMPILAN SOAL (SESUAI REQUEST TERBARU) ---
  if (state.sessionType === "quiz_hiragana") {
    // Mode: Tebak Hiragana
    // SOAL = BAHASA INDONESIA
    displayHtml = formatQuestion(meanTxt);
  } else {
    // Mode: Tebak Arti
    // SOAL = HIRAGANA (Kalau kosong baru Kanji)
    displayHtml = formatQuestion(hiraTxt || kanjiTxt);
  }

  // Generate Tombol Pilihan
  let choicesHtml = '<div class="d-grid gap-3">'; 
  choices.forEach((c, i) => {
    const isSelected = state.answers[idx] === i;
    // Tambahkan class 'choice-card-anim' agar ada efek hover/animasi
    let btnClass = isSelected ? "choice-option choice-selected" : "choice-option choice-card-anim";
    
    choicesHtml += `
        <div class="${btnClass} d-flex align-items-center justify-content-center text-center p-3" 
             role="button" 
             onclick="window.handleAnswer(${i})">
          <div class="fw-bold" style="font-size: 1.1rem; letter-spacing: 0.5px;">${escapeHtml(c.text)}</div>
        </div>`;
  });
  choicesHtml += "</div>";

  // Render Kartu Utama
  const card = document.createElement("div");
  card.className = "quiz-card p-4 h-100 d-flex flex-column";
  
  card.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom border-secondary border-opacity-25">
          <span class="badge badge-neon px-3 py-2">Soal ${idx + 1} / ${state.batch.length}</span>
          <small class="text-muted fw-bold">#${q[KEYS.number] || "-"}</small>
      </div>
      
      <div class="flex-grow-1 d-flex align-items-center justify-content-center py-4">
        ${displayHtml} 
      </div>
      
      <div class="mb-4">
        ${choicesHtml}
      </div>

      <div class="row g-2 mt-auto">
          <div class="col-4">
             <button class="btn btn-outline-custom w-100 py-3 fw-bold" onclick="window.handlePrev()" ${idx === 0 ? "disabled" : ""}>
                <i class="bi bi-arrow-left d-md-none"></i> <span class="d-none d-md-inline">Sebelumnya</span>
             </button>
          </div>
          <div class="col-4">
             <button class="btn btn-outline-warning w-100 py-3 fw-bold" onclick="window.handleLupa()">
                <i class="bi bi-question-lg d-md-none"></i> <span class="d-none d-md-inline">${isLupa ? "Ditandai" : "Lupa"}</span>
             </button>
          </div>
          <div class="col-4">
            ${
              idx < state.batch.length - 1
                ? `<button class="btn btn-primary-custom w-100 py-3 fw-bold" onclick="window.handleNext()">
                    <i class="bi bi-arrow-right d-md-none"></i> <span class="d-none d-md-inline">Berikutnya</span>
                   </button>`
                : `<button class="btn btn-outline-success w-100 py-3 fw-bold" onclick="window.handleConfirm()">
                    <i class="bi bi-check-lg d-md-none"></i> <span class="d-none d-md-inline">Selesai</span>
                   </button>`
            }
          </div>
      </div>
    `;
  area.appendChild(card);
}


// ============================================================
// 4. RENDER MEMORY (ISIAN: TULIS ARTI / TULIS ROMAJI)
// ============================================================
export function renderMem(state, qNo) {
  area.innerHTML = "";
  const idx = state.current;
  const q = state.batch[idx];
  const val = state.answers[idx] === "Lupa" ? "" : state.answers[idx] || "";
  
  const kanjiTxt = String(q[KEYS.kanji] || "").trim();
  const meanTxt = String(q[KEYS.meaning] || "").trim();
  const hiraTxt = String(q[KEYS.hiragana] || "").trim();

  let displayHtml = "";
  let placeholderTxt = "", labelTxt = "";
  
  // --- LOGIKA SOAL ISIAN ---
  if (state.sessionType === "write_romaji") {
    // Mode: Tulis Romaji
    // Soal: INDONESIA -> Jawab: Romaji/Jepang
    displayHtml = formatQuestion(meanTxt); 
    placeholderTxt = "Ketik bahasa Jepangnya...";
    labelTxt = "TERJEMAHKAN KE JEPANG (ROMAJI)";
  } else {
    // Mode: Tulis Arti
    // Soal: HIRAGANA (atau Kanji) -> Jawab: Indo
    displayHtml = formatQuestion(hiraTxt || kanjiTxt);
    placeholderTxt = "Ketik artinya...";
    labelTxt = "TERJEMAHKAN KE INDONESIA";
  }

  const card = document.createElement("div");
  card.className = "mem-card p-4 d-flex flex-column align-items-center justify-content-center h-100";
  
  card.innerHTML = `
      <div class="d-flex justify-content-between align-items-center w-100 mb-3 border-bottom border-secondary border-opacity-25 pb-3">
          <span class="badge badge-neon px-3 py-2">Soal ${idx + 1} / ${state.batch.length}</span>
          <small class="text-muted fw-bold">#${q[KEYS.number] || "-"}</small>
      </div>
      
      <div class="flex-grow-1 d-flex flex-column align-items-center justify-content-center text-center my-3 w-100">
          ${displayHtml}
      </div>

      <div class="w-100 text-center mb-4" style="max-width: 600px;">
          <div class="mem-label mb-3" style="color: var(--neon-pink);">${labelTxt}</div>
          
          <div class="position-relative">
              <input type="text" id="memInput" 
                     class="mem-input form-control text-center"
                     placeholder="${placeholderTxt}" 
                     autocomplete="off" 
                     spellcheck="false" 
                     value="${escapeHtml(val)}">
              
              <div id="btnMic" class="mic-icon-wrapper" role="button" title="Rekam Suara">
                  <i class="bi bi-mic-fill"></i>
              </div>
          </div>
      </div>

      <div class="row g-2 w-100" style="max-width: 600px;">
          <div class="col-4">
            <button class="btn btn-outline-custom w-100 py-3 fw-bold h-100" onclick="window.handlePrev()" ${idx === 0 ? "disabled" : ""}>
                <i class="bi bi-arrow-left d-md-none"></i> <span class="d-none d-md-inline">Kembali</span>
            </button>
          </div>
          <div class="col-4">
            <button class="btn btn-outline-warning w-100 py-3 fw-bold h-100" onclick="window.handleLupa()">
                <i class="bi bi-question-lg d-md-none"></i> <span class="d-none d-md-inline">Lupa</span>
            </button>
          </div>
          <div class="col-4">
            ${
              idx < state.batch.length - 1
                ? `<button class="btn btn-primary-custom w-100 py-3 fw-bold h-100" onclick="window.handleNext()">
                     <i class="bi bi-arrow-right d-md-none"></i> <span class="d-none d-md-inline">Lanjut</span>
                   </button>`
                : `<button class="btn btn-success w-100 py-3 fw-bold h-100" onclick="window.handleConfirm()">
                     <i class="bi bi-check-lg d-md-none"></i> <span class="d-none d-md-inline">Selesai</span>
                   </button>`
            }
          </div>
      </div>
  `;
  area.appendChild(card);

  // Focus & Mic Events
  const inp = document.getElementById("memInput");
  const btnMic = document.getElementById("btnMic");
  setTimeout(() => inp.focus(), 100);
  inp.oninput = (e) => window.handleInput(e.target.value);
  inp.onkeydown = (e) => { if (e.key === "Enter") window.handleNextOrSubmit(); };

  // Mic Logic (Deteksi Bahasa)
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = state.sessionType === "write_romaji" ? "ja-JP" : "id-ID";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    btnMic.onclick = () => { try { recognition.start(); } catch (e) { recognition.stop(); } };
    recognition.onstart = () => { btnMic.classList.add("recording"); };
    recognition.onend = () => { btnMic.classList.remove("recording"); inp.focus(); };
    recognition.onresult = (event) => {
      let transcript = event.results[0][0].transcript;
      const cleanText = transcript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
      inp.value = cleanText;
      window.handleInput(cleanText);
    };
  } else {
    btnMic.style.display = "none";
  }
}


// ============================================================
// 5. RENDER RESULT (HASIL AKHIR & PEMBAHASAN)
// ============================================================
export function renderResult(result, sessionType, wrongIndices = []) {
  area.innerHTML = "";
  const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
  
  // Gunakan nama mode yang cantik (bukan 'quiz')
  let modeLabel = formatModeName(sessionType); 
  const scoreClass = pct >= 60 ? "text-neon-green" : "text-neon-red";

  let html = `
    <div class="res-card p-5 text-center mb-5">
        <h5 class="text-muted fw-bold mb-2 text-uppercase tracking-wider">${modeLabel}</h5>
        <h1 class="display-1 fw-black mb-0 ${scoreClass}" style="font-weight: 900;">${pct}%</h1>
        <p class="text-white fs-4 mb-4" style="opacity: 0.9;">Benar ${result.score} dari ${result.total}</p>

        <div class="d-grid gap-3 col-lg-8 mx-auto">
            ${
                wrongIndices.length > 0
                ? `<button class="btn btn-primary-custom w-100 fw-bold py-3 shadow-lg" onclick="window.handleRetryWrong([${wrongIndices}])">
                     <i class="bi bi-arrow-counterclockwise fs-5"></i> Perbaiki ${wrongIndices.length} Soal Salah
                   </button>`
                : `<div class="p-3 rounded-3 border border-success bg-success bg-opacity-10 text-success fw-bold">Sempurna!</div>`
            }
            <div class="row g-2">
                <div class="col-6"><button class="btn btn-outline-custom w-100 fw-bold py-2" onclick="window.handleRetry()">Ulangi</button></div>
                <div class="col-6"><button class="btn btn-outline-secondary w-100 fw-bold py-2 text-white" onclick="window.handleBack()">Menu Utama</button></div>
            </div>
        </div>
    </div>`;

  // Render Detail Jawaban (Pembahasan)
  if (result.details && result.details.length > 0) {
    html += `<h5 class="fw-bold text-white mb-3 mt-4">Detail Jawaban</h5>`;
    result.details.forEach((d) => {
      const isCorrect = d.isCorrect;
      const userTxt = d.userAns === "Lupa" ? "Lupa" : d.userAns || "-";
      
      const kanji = (d.q[KEYS.kanji] || "").trim();
      const hira = (d.realHira || "").trim();
      const mean = d.realMean || "";
      const romaji = d.q['romaji'] || ""; 

      let mainText = ""; 
      let correctAns = "";
      
      // --- LOGIKA TAMPILAN PEMBAHASAN (SESUAI REQUEST) ---
      if (sessionType === "quiz_hiragana") {
          // Tebak Hiragana -> Soal tadi INDO. Kunci Jawabannya HIRAGANA.
          mainText = mean;      // Kolom Kiri: Soal (Indo)
          correctAns = hira;    // Kolom Kanan: Jawaban Benar (Hiragana)
      
      } else if (sessionType === "quiz" || sessionType === "mem") {
          // Tebak Arti / Tulis Arti -> Soal tadi HIRAGANA. Kunci Jawabannya INDO.
          mainText = hira || kanji; // Kolom Kiri: Soal (Hiragana)
          correctAns = mean;        // Kolom Kanan: Jawaban Benar (Indo)
      
      } else if (sessionType === "write_romaji") {
          // Tulis Romaji -> Soal tadi INDO. Kunci Jawabannya ROMAJI & HIRAGANA.
          mainText = mean;                // Kolom Kiri: Soal (Indo)
          correctAns = `${romaji} / ${hira}`; // Kolom Kanan: Jawaban Benar
      }

      html += `
            <div class="res-item mb-3">
               <div class="d-flex justify-content-between align-items-center mb-2">
                  <div class="res-kanji fs-3">${escapeHtml(mainText)}</div>
                  ${isCorrect ? '<i class="bi bi-check-circle-fill text-neon-green fs-3"></i>' : '<i class="bi bi-x-circle-fill text-neon-red fs-3"></i>'}
               </div>
               <div class="d-flex flex-column gap-2">
                   ${!isCorrect ? `<div class="res-box res-wrong"><span class="res-label">KAMU</span><span class="res-val">${escapeHtml(userTxt)}</span></div>` : ""}
                   <div class="res-box res-correct"><span class="res-label">BENAR</span><span class="res-val">${escapeHtml(correctAns)}</span></div>
               </div>
            </div>`;
    });
  }
  area.innerHTML = html + `<div class="pb-5"></div>`;
  
  // Trigger Confetti jika skor bagus
  if (pct >= 60) launchConfetti();
}


// ============================================================
// 6. RENDER PROGRESS (KARTU STATISTIK DI MODAL)
// ============================================================
export function renderProgressModal(stats) {
  const list = document.getElementById("progressList");
  if (!list) return;
  list.innerHTML = "";
  const gridDiv = document.createElement("div");
  gridDiv.className = "row g-3";
  
  stats.forEach((item) => {
    const pctTotal = item.totalPct;
    const p1 = item.detail.tebakArti;
    const p2 = item.detail.tebakHiragana;
    const p3 = item.detail.tulisArti;
    const p4 = item.detail.tulisRomaji;
    
    const isDone = pctTotal === 100;
    const cardClass = isDone ? "prog-card prog-done" : "prog-card";
    const badgeClass = isDone ? "bg-neon-green text-black" : "bg-dark-subtle text-white";

    const col = document.createElement("div");
    col.className = "col-12 col-md-6";
    col.innerHTML = `
        <div class="${cardClass} p-3 h-100 d-flex flex-column justify-content-center">
            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary border-opacity-25">
                <span class="fw-bold text-white fs-5">${escapeHtml(item.bab)}</span>
                <span class="badge ${badgeClass} rounded-pill px-3">Total: ${pctTotal}%</span>
            </div>
            <div class="d-flex flex-column gap-3">
                <div class="prog-item">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="prog-label text-neon-blue"><i class="bi bi-eye-fill me-2"></i> Tebak Arti</span>
                        <span class="prog-val text-white">${p1}%</span>
                    </div>
                    <div class="progress" style="height: 6px; background: rgba(255,255,255,0.1);"><div class="progress-bar bg-neon-blue" style="width: ${p1}%"></div></div>
                </div>
                <div class="prog-item">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="prog-label text-neon-green"><i class="bi bi-translate me-2"></i> Tebak Bacaan</span>
                        <span class="prog-val text-white">${p2}%</span>
                    </div>
                    <div class="progress" style="height: 6px; background: rgba(255,255,255,0.1);"><div class="progress-bar bg-neon-green" style="width: ${p2}%"></div></div>
                </div>
                <div class="prog-item">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="prog-label text-neon-yellow"><i class="bi bi-pencil-fill me-2"></i> Tulis Arti</span>
                        <span class="prog-val text-white">${p3}%</span>
                    </div>
                    <div class="progress" style="height: 6px; background: rgba(255,255,255,0.1);"><div class="progress-bar bg-neon-yellow" style="width: ${p3}%"></div></div>
                </div>
                <div class="prog-item">
                    <div class="d-flex justify-content-between mb-1">
                        <span class="prog-label text-neon-pink"><i class="bi bi-keyboard-fill me-2"></i> Tulis Romaji</span>
                        <span class="prog-val text-white">${p4}%</span>
                    </div>
                    <div class="progress" style="height: 6px; background: rgba(255,255,255,0.1);"><div class="progress-bar bg-neon-pink" style="width: ${p4}%"></div></div>
                </div>
            </div>
        </div>`;
    gridDiv.appendChild(col);
  });
  list.appendChild(gridDiv);
}


// ============================================================
// 7. FUNGSI PEMANIS (CONFETTI)
// ============================================================
function launchConfetti() {
  const wrap = document.getElementById(SELECTORS.confetti);
  if (!wrap) return;
  wrap.innerHTML = ""; // Bersihkan confetti lama
  
  // Buat 50 partikel kertas jatuh
  for (let i = 0; i < 50; i++) {
    const el = document.createElement("div");
    el.className = "confetti";
    // Posisi horizontal acak
    el.style.left = Math.random() * 100 + "vw";
    // Warna warni neon
    const colors = ["#f472b6", "#3b82f6", "#4ade80", "#facc15", "#ffffff"];
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    // Kecepatan acak
    el.style.animationDuration = (2 + Math.random() * 3) + "s";
    el.style.animationDelay = (Math.random() * 2) + "s";
    
    wrap.appendChild(el);
    
    // Hapus elemen setelah animasi selesai agar ringan
    setTimeout(() => el.remove(), 5000);
  }
}