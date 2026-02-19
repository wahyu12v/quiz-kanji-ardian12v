import { escapeHtml } from "./utils.js";
import { KEYS, SELECTORS } from "./constants.js";

const area = document.getElementById(SELECTORS.quizArea);

// ============================================================
// 1. INJECT CSS GLOBAL (Font Responsive, Animasi, Confetti)
// ============================================================
const style = document.createElement("style");
style.innerHTML = `
    /* --- 1. ANIMASI KARTU PILIHAN --- */
    .choice-card-anim { 
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important; 
    }
    .choice-card-anim:hover { 
        transform: translateY(-4px); 
        box-shadow: 0 8px 20px rgba(13, 148, 136, 0.2) !important; 
        border-color: #0D9488 !important; 
        z-index: 5; 
        background-color: rgba(13, 148, 136, 0.08) !important;
    }
    .choice-card-anim:active { 
        transform: scale(0.98); 
    }
    
    /* --- 2. LOGIKA UKURAN FONT (MOBILE FRIENDLY) --- */
    .q-text-base {
        font-weight: 800;
        color: #1E293B !important;
        text-shadow: none;
        text-align: center;
        width: 100%;
        line-height: 1.4;
        word-wrap: break-word;       
        overflow-wrap: break-word;
    }

    /* Ukuran Besar (1-4 Karakter) */
    .q-size-lg {
        font-size: clamp(4rem, 18vw, 6.5rem) !important; 
    }

    /* Ukuran Sedang (5-12 Karakter) */
    .q-size-md {
        font-size: clamp(2.2rem, 10vw, 3.5rem) !important;
    }

    /* Ukuran Kecil (>12 Karakter) */
    .q-size-sm {
        font-size: clamp(1.4rem, 6vw, 2rem) !important;
        font-weight: 700 !important;
    }

    /* --- 3. CONFETTI FULL SCREEN (FIXED) --- */
    .confetti {
        position: fixed; 
        top: -20px;
        width: 10px; height: 10px;
        z-index: 10000;
        pointer-events: none;
        border-radius: 3px;
        animation: fall linear forwards;
    }
    @keyframes fall {
        to { transform: translateY(110vh) rotate(720deg); }
    }
`;
document.head.appendChild(style);


// ============================================================
// 2. HELPER FUNCTIONS
// ============================================================

// Fungsi Pintar menentukan ukuran font berdasarkan panjang teks
function formatQuestion(text) {
    const len = text.length;
    let sizeClass = "";

    if (len <= 4) {
        sizeClass = "q-size-lg"; // Besar
    } else if (len <= 12) {
        sizeClass = "q-size-md"; // Sedang
    } else {
        sizeClass = "q-size-sm"; // Kecil (Muat Banyak)
    }

    // Min-height 150px agar area soal stabil tidak naik turun
    return `<div class="d-flex align-items-center justify-content-center px-3" style="min-height: 150px;">
                <span class="q-text-base ${sizeClass}">
                    ${escapeHtml(text)}
                </span>
            </div>`;
}

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

  const kanjiTxt = String(q[KEYS.kanji] || "").trim();
  const meanTxt = String(q[KEYS.meaning] || "").trim();
  const hiraTxt = String(q[KEYS.hiragana] || "").trim();

  let displayHtml = "";

  // --- LOGIKA SOAL ---
  if (state.sessionType === "quiz_hiragana") {
    // Mode Tebak Hiragana -> Soal: INDONESIA
    displayHtml = formatQuestion(meanTxt);
  } else {
    // Mode Tebak Arti -> Soal: HIRAGANA (bukan Kanji)
    displayHtml = formatQuestion(hiraTxt || kanjiTxt);
  }

  let choicesHtml = '<div class="d-grid gap-3">'; 
  choices.forEach((c, i) => {
    const isSelected = state.answers[idx] === i;
    let btnClass = isSelected ? "choice-option choice-selected" : "choice-option choice-card-anim";
    
    choicesHtml += `
        <div class="${btnClass} d-flex align-items-center justify-content-center text-center p-3" 
             role="button" 
             onclick="window.handleAnswer(${i})">
          <div class="fw-bold" style="font-size: 1.1rem; letter-spacing: 0.5px;">${escapeHtml(c.text)}</div>
        </div>`;
  });
  choicesHtml += "</div>";

  const card = document.createElement("div");
  card.className = "quiz-card p-4 h-100 d-flex flex-column";
  
  card.innerHTML = `
      <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom border-secondary border-opacity-25">
          <span class="badge badge-neon px-3 py-2">Soal ${idx + 1} / ${state.batch.length}</span>
          <small class="text-muted fw-bold">#${q[KEYS.number] || "-"}</small>
      </div>
      
      <div class="flex-grow-1 d-flex align-items-center justify-content-center py-2">
        ${displayHtml} 
      </div>
      
      <div class="mb-4">${choicesHtml}</div>

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
                ? `<button class="btn btn-primary-custom w-100 py-3 fw-bold" onclick="window.handleNext()">Berikutnya</button>`
                : `<button class="btn btn-success w-100 py-3 fw-bold" onclick="window.handleConfirm()">Selesai</button>`
            }
          </div>
      </div>
    `;
  area.appendChild(card);
}


// ============================================================
// 4. RENDER MEMORY (ISIAN)
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
    displayHtml = formatQuestion(meanTxt); 
    placeholderTxt = "Ketik bahasa Jepangnya...";
    labelTxt = "TERJEMAHKAN KE JEPANG (ROMAJI)";
  } else {
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
          <div class="mem-label mb-3">${labelTxt}</div>
          
          <div class="position-relative">
              <input type="text" id="memInput" 
                     class="mem-input form-control text-center fs-4 fw-bold py-3"
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
            <button class="btn btn-outline-custom w-100 py-3 fw-bold h-100" onclick="window.handlePrev()" ${idx === 0 ? "disabled" : ""}>Kembali</button>
          </div>
          <div class="col-4">
            <button class="btn btn-outline-warning w-100 py-3 fw-bold h-100" onclick="window.handleLupa()">Lupa</button>
          </div>
          <div class="col-4">
            ${
              idx < state.batch.length - 1
                ? `<button class="btn btn-primary-custom w-100 py-3 fw-bold h-100" onclick="window.handleNext()">Lanjut</button>`
                : `<button class="btn btn-success w-100 py-3 fw-bold h-100" onclick="window.handleConfirm()">Selesai</button>`
            }
          </div>
      </div>
  `;
  area.appendChild(card);

  const inp = document.getElementById("memInput");
  const btnMic = document.getElementById("btnMic");
  setTimeout(() => inp.focus(), 100);
  inp.oninput = (e) => window.handleInput(e.target.value);
  inp.onkeydown = (e) => { if (e.key === "Enter") window.handleNextOrSubmit(); };

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
// 5. RENDER RESULT
// ============================================================
export function renderResult(result, sessionType, wrongIndices = []) {
  area.innerHTML = "";
  const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
  let modeLabel = formatModeName(sessionType); 
  const scoreClass = pct >= 60 ? "text-neon-green" : "text-neon-red";

  let html = `
    <div class="res-card p-5 text-center mb-5">
        <h5 class="text-muted fw-bold mb-2 text-uppercase tracking-wider">${modeLabel}</h5>
        <h1 class="display-1 fw-black mb-0 ${scoreClass}" style="font-weight: 900;">${pct}%</h1>
        <p class="text-secondary fs-4 mb-4" style="opacity: 0.9;">Benar ${result.score} dari ${result.total}</p>

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
                <div class="col-6"><button class="btn btn-outline-custom w-100 fw-bold py-2" onclick="window.handleBack()">Menu Utama</button></div>
            </div>
        </div>
    </div>`;

  if (result.details && result.details.length > 0) {
    html += `<h5 class="fw-bold mb-3 mt-4" style="color: var(--text-primary, #1E293B);">Detail Jawaban</h5>`;
    result.details.forEach((d) => {
      const isCorrect = d.isCorrect;
      const userTxt = d.userAns === "Lupa" ? "Lupa" : d.userAns || "-";
      
      const kanji = (d.q[KEYS.kanji] || "").trim();
      const hira = (d.realHira || "").trim();
      const mean = d.realMean || "";
      const romaji = d.q['romaji'] || ""; 

      let mainText = ""; 
      let correctAns = "";
      
      if (sessionType === "quiz_hiragana") {
          mainText = mean;      
          correctAns = hira;    
      } else if (sessionType === "quiz" || sessionType === "mem") {
          mainText = hira || kanji; 
          correctAns = mean;        
      } else if (sessionType === "write_romaji") {
          mainText = mean;                
          correctAns = `${romaji} / ${hira}`; 
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
  
  if (pct >= 60) launchConfetti();
}


// ============================================================
// 6. RENDER PROGRESS
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
    const cardClass = isDone ? "prog-card bab-done" : "prog-card";
    const badgeClass = isDone ? "bg-success text-white" : "bg-light text-secondary border";

    const col = document.createElement("div");
    col.className = "col-12 col-md-6";
    col.innerHTML = `
        <div class="${cardClass} p-3 h-100 d-flex flex-column justify-content-center">
            <div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                <span class="fw-bold fs-5" style="color: var(--text-primary, #1E293B);">${escapeHtml(item.bab)}</span>
                <span class="badge ${badgeClass} rounded-pill px-3">Total: ${pctTotal}%</span>
            </div>
            <div class="d-flex flex-column gap-3">
                <div class="prog-item"><div class="d-flex justify-content-between mb-1"><span class="prog-label"><i class="bi bi-eye-fill me-2"></i> Tebak Arti</span><span class="prog-val" style="color: var(--teal, #0D9488); font-weight:700;">${p1}%</span></div><div class="progress prog-track" style="height: 6px;"><div class="progress-bar" style="width: ${p1}%; background: var(--teal, #0D9488);"></div></div></div>
                <div class="prog-item"><div class="d-flex justify-content-between mb-1"><span class="prog-label"><i class="bi bi-translate me-2"></i> Tebak Bacaan</span><span class="prog-val" style="color: #22C55E; font-weight:700;">${p2}%</span></div><div class="progress prog-track" style="height: 6px;"><div class="progress-bar bg-success" style="width: ${p2}%"></div></div></div>
                <div class="prog-item"><div class="d-flex justify-content-between mb-1"><span class="prog-label"><i class="bi bi-pencil-fill me-2"></i> Tulis Arti</span><span class="prog-val" style="color: #F59E0B; font-weight:700;">${p3}%</span></div><div class="progress prog-track" style="height: 6px;"><div class="progress-bar" style="width: ${p3}%; background: #F59E0B;"></div></div></div>
                <div class="prog-item"><div class="d-flex justify-content-between mb-1"><span class="prog-label"><i class="bi bi-keyboard-fill me-2"></i> Tulis Romaji</span><span class="prog-val" style="color: var(--indigo, #6366F1); font-weight:700;">${p4}%</span></div><div class="progress prog-track" style="height: 6px;"><div class="progress-bar" style="width: ${p4}%; background: var(--indigo, #6366F1);"></div></div></div>
            </div>
        </div>`;
    gridDiv.appendChild(col);
  });
  list.appendChild(gridDiv);
}


// ============================================================
// 7. FUNGSI CONFETTI (FULL SCREEN - FIXED)
// ============================================================
function launchConfetti() {
  const count = 70;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("div");
    el.className = "confetti";
    el.style.left = Math.random() * 100 + "vw"; 
    
    const colors = ["#f472b6", "#3b82f6", "#4ade80", "#facc15", "#ffffff"];
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    
    el.style.animationDuration = (2 + Math.random() * 3) + "s";
    el.style.animationDelay = (Math.random() * 1.5) + "s";
    
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  }
}