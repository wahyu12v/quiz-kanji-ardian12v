import { escapeHtml } from "./utils.js";
import { KEYS, SELECTORS } from "./constants.js";

const area = document.getElementById(SELECTORS.quizArea);

// --- CSS INJECT ---
const style = document.createElement("style");
style.innerHTML = `
    .choice-card-anim { transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s, border-color 0.2s !important; }
    .choice-card-anim:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(13, 110, 253, 0.15) !important; border-color: #0d6efd !important; z-index: 2; }
    .choice-card-anim:active { transform: scale(0.98) translateY(-2px); }
    
    /* PROGRESS STYLES */
    .prog-card { background: #fff; border-radius: 12px; padding: 15px; border: 1px solid #dee2e6; box-shadow: 0 2px 4px rgba(0,0,0,0.02); height: 100%; display: flex; flex-direction: column; }
    .prog-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
    .prog-label { font-size: 0.75rem; color: #6c757d; display: flex; align-items: center; gap: 6px; font-weight: 600; }
    .prog-pct { font-size: 0.75rem; font-weight: bold; }
    .prog-track { flex-grow: 1; height: 6px; background-color: #f1f3f5; border-radius: 3px; margin: 0 8px; overflow: hidden; }
    .prog-fill { height: 100%; border-radius: 3px; }
    .c-blue { color: #0d6efd; } .bg-blue { background-color: #0d6efd; }
    .c-green { color: #198754; } .bg-green { background-color: #198754; }
    .c-orange { color: #fd7e14; } .bg-orange { background-color: #fd7e14; }
    .c-red { color: #dc3545; } .bg-red { background-color: #dc3545; }
    .bab-done { border: 2px solid #198754; background-color: #f0fff4; }

    /* RESULT STYLES (MINIMALIS) */
    .res-item { background: #fff; padding: 12px 15px; border-radius: 10px; border: 1px solid #eee; margin-bottom: 10px; }
    .res-kanji-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .res-kanji-main { font-size: 1.8rem; font-weight: bold; color: #212529; line-height: 1; }
    .res-compare { display: flex; flex-direction: column; gap: 6px; }
    .res-line { padding: 8px 12px; border-radius: 6px; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between; font-weight: 500; }
    .res-wrong { background-color: #ffe3e3; color: #c92a2a; border: 1px solid #ffc9c9; }
    .res-correct { background-color: #d3f9d8; color: #2b8a3e; border: 1px solid #b2f2bb; }
    .res-tag { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.7; margin-right: 8px; font-weight: 700; }
    .res-val { flex-grow: 1; text-align: right; }
    .res-meta { font-size: 0.75rem; color: #868e96; margin-top: 6px; text-align: right; }

    /* --- UPDATE: FONT RESPONSIF UNTUK SOAL --- */
    .q-text-responsive {
        /* Rumus clamp(MIN, IDEAL, MAX) */
        font-size: clamp(1.8rem, 5vw, 3.5rem); 
        line-height: 1.3;
        font-weight: bold;
        color: #0d6efd;
        text-align: center;
        word-wrap: break-word; 
        width: 100%;
    }
`;
document.head.appendChild(style);

// --- HELPER: FORMAT TAMPILAN SOAL (PAKAI CLASS RESPONSIF) ---
// --- HELPER: FORMAT TAMPILAN SOAL (AUTO SIZE) ---
function formatQuestion(text) {
    const len = text.length;
    let fontSize = "5rem"; // Ukuran Default (untuk Kanji/Kata Pendek)

    // Logika Pintar: Makin panjang teks, makin kecil font-nya
    if (len > 30) {
        fontSize = "1.8rem"; // Kalimat sangat panjang
    } else if (len > 15) {
        fontSize = "2.5rem"; // Kalimat sedang (contoh: "Penting / Berharga")
    } else if (len > 6) {
        fontSize = "3.5rem"; // Kata agak panjang (Hiragana majemuk)
    }

    return `<div class="d-flex align-items-center justify-content-center px-2" style="min-height: 120px;">
                <span class="q-text-responsive" style="font-size: ${fontSize} !important; line-height: 1.2;">
                    ${escapeHtml(text)}
                </span>
            </div>`;
}

// --- 1. RENDER QUIZ (UPDATE: TEMA DARK NEON) ---

export function renderQuiz(state, qNo) {
  const area = document.getElementById(SELECTORS.quizArea);
  area.innerHTML = "";
  
  const idx = state.current;
  const q = state.batch[idx];
  const choices = state.choicesPerQ[idx];
  const isLupa = state.answers[idx] === "Lupa";

  // Ambil Text Utama
  const kanjiTxt = String(q[KEYS.kanji] || "").trim();
  const meanTxt = String(q[KEYS.meaning] || "").trim();
  const hiraTxt = String(q[KEYS.hiragana] || "").trim();

  let displayHtml = "";

  // Tentukan Soal (Tebak Hiragana atau Tebak Arti)
  if (state.sessionType === "quiz_hiragana") {
    displayHtml = formatQuestion(meanTxt || hiraTxt);
  } else {
    displayHtml = formatQuestion(kanjiTxt || hiraTxt);
  }

  // --- Render Pilihan Ganda ---
  let choicesHtml = '<div class="d-grid gap-3">'; 
  
  choices.forEach((c, i) => {
    const isSelected = state.answers[idx] === i;
    
    // Class dinamis: Jika dipilih pakai 'choice-selected', jika tidak 'choice-option'
    let btnClass = isSelected ? "choice-option choice-selected" : "choice-option";
    
    choicesHtml += `
        <div class="${btnClass} d-flex align-items-center justify-content-center text-center p-3" 
             role="button" 
             onclick="window.handleAnswer(${i})">
          <div class="fw-bold" style="font-size: 1.1rem; letter-spacing: 0.5px;">${escapeHtml(c.text)}</div>
        </div>`;
  });
  choicesHtml += "</div>";

  const card = document.createElement("div");
  // Gunakan class 'quiz-card' baru agar gelap
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
                : `<button class="btn btn-success w-100 py-3 fw-bold" onclick="window.handleConfirm()">
                    <i class="bi bi-check-lg d-md-none"></i> <span class="d-none d-md-inline">Selesai</span>
                   </button>`
            }
          </div>
      </div>
    `;
  area.appendChild(card);
}
// --- 2. RENDER MEMORY (UPDATE: TAMPILAN KAPSUL MODERN) ---
export function renderMem(state, qNo) {
  const area = document.getElementById(SELECTORS.quizArea);
  area.innerHTML = "";
  
  const idx = state.current;
  const q = state.batch[idx];
  const val = state.answers[idx] === "Lupa" ? "" : state.answers[idx] || "";
  
  // Ambil Data
  const kanjiTxt = String(q[KEYS.kanji] || "").trim();   // Kanji
  const meanTxt = String(q[KEYS.meaning] || "").trim();  // Arti Indo
  const hiraTxt = String(q[KEYS.hiragana] || "").trim(); // Hiragana

  let displayHtml = "";
  let placeholderTxt = "", labelTxt = "";
  
  // --- LOGIKA TAMPILAN SOAL (SESUAI REQUEST) ---
  
  if (state.sessionType === "write_romaji") {
    // 1. Bagian TULIS ROMAJI -> Soal yang muncul ARTI (Bahasa Indonesia)
    displayHtml = formatQuestion(meanTxt); 
    
    placeholderTxt = "Ketik bahasa Jepangnya...";
    labelTxt = "TERJEMAHKAN KE JEPANG (ROMAJI)";
    
  } else {
    // 2. Bagian TULIS ARTI -> Soal yang muncul HIRAGANA (Bukan Kanji)
    // Jika hiragana kosong, baru fallback ke kanji (opsional)
    displayHtml = formatQuestion(hiraTxt || kanjiTxt);
    
    placeholderTxt = "Ketik artinya...";
    labelTxt = "TERJEMAHKAN KE INDONESIA";
  }

  // --- RENDER KARTU (TEMA DARK NEON) ---
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

  // Setup Input Focus & Mic
  const inp = document.getElementById("memInput");
  const btnMic = document.getElementById("btnMic");
  setTimeout(() => inp.focus(), 100);
  inp.oninput = (e) => window.handleInput(e.target.value);
  inp.onkeydown = (e) => { if (e.key === "Enter") window.handleNextOrSubmit(); };

  // Mic Logic
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

// --- 3. RENDER RESULT (SUDAH DIPERBAIKI: DARK MODE HISTORY) ---
// --- Update Function renderResult di js/ui.js ---

export function renderResult(result, sessionType, wrongIndices = []) {
  const area = document.getElementById(SELECTORS.quizArea);
  area.innerHTML = "";
  
  const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
  let modeLabel = sessionType.includes("quiz") ? "Hasil Quiz" : "Hasil Tes";
  
  // Tentukan warna skor (Hijau jika lulus > 60%, Merah jika gagal)
  const scoreClass = pct >= 60 ? "text-neon-green" : "text-neon-red";

  let html = `
    <div class="res-card p-5 text-center mb-5">
        <h5 class="text-muted fw-bold mb-2 text-uppercase tracking-wider">${modeLabel}</h5>
        
        <h1 class="display-1 fw-black mb-0 ${scoreClass}" style="font-weight: 900; letter-spacing: -2px;">
            ${pct}%
        </h1>
        
        <p class="text-white fs-4 mb-4" style="opacity: 0.9;">Benar ${result.score} dari ${result.total}</p>

        <div class="d-grid gap-3 col-lg-8 mx-auto">
            ${
                wrongIndices.length > 0
                ? `<button class="btn btn-primary-custom w-100 fw-bold py-3 shadow-lg d-flex align-items-center justify-content-center gap-2" onclick="window.handleRetryWrong([${wrongIndices}])">
                     <i class="bi bi-arrow-counterclockwise fs-5"></i> Perbaiki ${wrongIndices.length} Soal Salah
                   </button>`
                : `<div class="p-3 rounded-3 border border-success bg-success bg-opacity-10 text-success fw-bold">
                    <i class="bi bi-trophy-fill me-2"></i> Sempurna! Kerja Bagus.
                   </div>`
            }
            
            <div class="row g-2">
                <div class="col-6">
                    <button class="btn btn-outline-custom w-100 fw-bold py-2" onclick="window.handleRetry()">
                        <i class="bi bi-arrow-repeat me-1"></i> Ulangi
                    </button>
                </div>
                <div class="col-6">
                    <button class="btn btn-outline-secondary w-100 fw-bold py-2 text-white" onclick="window.handleBack()" style="border-color: rgba(255,255,255,0.15);">
                        <i class="bi bi-house me-1"></i> Menu
                    </button>
                </div>
            </div>
        </div>
    </div>`;

  // --- Bagian Detail Jawaban ---
  if (result.details && result.details.length > 0) {
    html += `
        <div class="d-flex align-items-center mb-4 border-bottom border-secondary border-opacity-25 pb-2">
            <i class="bi bi-list-check fs-4 me-2" style="color: var(--neon-pink);"></i>
            <h5 class="fw-bold text-white m-0">Detail Jawaban</h5>
        </div>
    `;

    result.details.forEach((d, i) => {
      const isCorrect = d.isCorrect;
      const userTxt = d.userAns === "Lupa" ? "Lupa" : d.userAns || "-";

      const kanji = (d.q[KEYS.kanji] || "").trim();
      const hira = (d.realHira || "").trim();
      const mean = d.realMean || "";

      let keyAnswer = "";
      let extraInfo = "";

      // Logic tampilan jawaban berdasarkan mode
      if (sessionType === "quiz_hiragana" || sessionType === "write_romaji") {
        keyAnswer = hira;
        extraInfo = mean;
      } else {
        keyAnswer = mean;
        extraInfo = hira;
      }

      const displayKanji = kanji || hira;

      html += `
            <div class="res-item mb-3">
               <div class="d-flex justify-content-between align-items-start mb-2">
                  <div class="res-kanji">${escapeHtml(displayKanji)}</div>
                  ${
                    isCorrect
                      ? '<i class="bi bi-check-circle-fill text-neon-green fs-4"></i>'
                      : '<i class="bi bi-x-circle-fill text-neon-red fs-4"></i>'
                  }
               </div>

               <div class="d-flex flex-column gap-2 mt-2">
                   ${
                     !isCorrect
                       ? `
                   <div class="res-box res-wrong">
                       <span class="res-label">JAWABANMU</span>
                       <span class="res-val">${escapeHtml(userTxt)}</span>
                   </div>`
                       : ""
                   }

                   <div class="res-box res-correct">
                       <span class="res-label">KUNCI JAWABAN</span>
                       <span class="res-val">${escapeHtml(keyAnswer)}</span>
                   </div>
               </div>
               
               <div class="text-end mt-2 pt-2 border-top border-secondary border-opacity-10">
                    <small class="text-muted fst-italic">${escapeHtml(extraInfo)}</small>
               </div>
            </div>`;
    });
  }

  html += `<div class="pb-5"></div>`; // Spacer bawah
  area.innerHTML = html;
  
  if (pct >= 60) launchConfetti();
}
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
    const titleColor = isDone ? "text-success" : "text-dark";
    const col = document.createElement("div");
    col.className = "col-12 col-md-6";
    col.innerHTML = `<div class="${cardClass}"><div class="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom"><span class="fw-bold ${titleColor}" style="font-size: 1.1rem;">${item.bab}</span><span class="badge ${isDone ? "bg-success" : "bg-dark"} rounded-pill" style="font-size: 0.9rem;">Total: ${pctTotal}%</span></div><div class="prog-item"><div class="prog-label c-blue"><i class="bi bi-eye-fill"></i> Tebak Arti</div><div class="prog-track"><div class="prog-fill bg-blue" style="width:${p1}%"></div></div><div class="prog-pct c-blue">${p1}%</div></div><div class="prog-item"><div class="prog-label c-green"><i class="bi bi-translate"></i> Tebak Bacaan</div><div class="prog-track"><div class="prog-fill bg-green" style="width:${p2}%"></div></div><div class="prog-pct c-green">${p2}%</div></div><div class="prog-item"><div class="prog-label c-orange"><i class="bi bi-pencil-fill"></i> Tulis Arti</div><div class="prog-track"><div class="prog-fill bg-orange" style="width:${p3}%"></div></div><div class="prog-pct c-orange">${p3}%</div></div><div class="prog-item"><div class="prog-label c-red"><i class="bi bi-keyboard-fill"></i> Tulis Bacaan</div><div class="prog-track"><div class="prog-fill bg-red" style="width:${p4}%"></div></div><div class="prog-pct c-red">${p4}%</div></div></div>`;
    gridDiv.appendChild(col);
  });
  list.appendChild(gridDiv);
}

function formatModeName(type) {
  if (type === "quiz") return "Tebak Arti";
  if (type === "quiz_hiragana") return "Tebak Bacaan";
  if (type === "mem") return "Tulis Arti";
  if (type === "write_romaji") return "Tulis Bacaan";
  return type;
}

function launchConfetti() {
  const wrap = document.getElementById(SELECTORS.confetti);
  if (!wrap) return;
  for (let i = 0; i < 40; i++) {
    const el = document.createElement("div");
    el.className = "confetti";
    el.style.left = Math.random() * 100 + "vw";
    el.style.backgroundColor = ["#f00", "#0f0", "#00f", "#ff0"][
      Math.floor(Math.random() * 4)
    ];
    el.style.width = "8px";
    el.style.height = "8px";
    el.style.position = "fixed";
    el.style.top = "-10px";
    el.style.animation = `drop ${1 + Math.random() * 2}s linear forwards`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), 3000);
  }
}
