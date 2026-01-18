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
function formatQuestion(text) {
  return `<div class="d-flex align-items-center justify-content-center px-2" style="min-height: 120px;">
                <span class="q-text-responsive">${escapeHtml(text)}</span>
            </div>`;
}

// --- 1. RENDER QUIZ ---
export function renderQuiz(state, qNo) {
  area.innerHTML = "";
  const idx = state.current;
  const q = state.batch[idx];
  const choices = state.choicesPerQ[idx];
  const isLupa = state.answers[idx] === "Lupa";

  // Ambil Text Utama (Kanji/Hira/Arti)
  const kanjiTxt = String(q[KEYS.kanji] || "").trim();
  const meanTxt = String(q[KEYS.meaning] || "").trim();
  const hiraTxt = String(q[KEYS.hiragana] || "").trim();

  let displayHtml = "";

  // Tentukan apa yang ditampilkan sebagai SOAL berdasarkan mode
  if (state.sessionType === "quiz_hiragana") {
    displayHtml = formatQuestion(meanTxt || hiraTxt);
  } else {
    const textToShow = kanjiTxt || hiraTxt;
    displayHtml = formatQuestion(textToShow);
  }

  let choicesHtml = '<div class="row g-3">';
  choices.forEach((c, i) => {
    const isSelected = state.answers[idx] === i;
    let cardClass = "p-3 shadow-sm border rounded-3 fw-bold choice-card-anim";
    let textClass = "";
    let style = "cursor: pointer; position: relative;";

    if (isSelected) {
      style +=
        "background-color: #0d6efd; border-color: #0d6efd; color: #ffffff !important;";
      textClass = "text-white";
    } else {
      style += "background-color: #fff;";
      textClass =
        state.sessionType === "quiz_hiragana" ? "text-primary" : "text-dark";
    }

    choicesHtml += `
          <div class="col-12"> 
            <div class="${cardClass}" role="button" onclick="window.handleAnswer(${i})" style="${style}">
              <div class="${textClass}" style="font-size: 1.1rem;">${escapeHtml(c.text)}</div>
            </div>
          </div>`;
  });
  choicesHtml += "</div>";

  const card = document.createElement("div");
  card.className = "card card-kanji mb-3 border-0 shadow-sm";
  card.innerHTML = `
      <div class="card-body p-4">
        <div class="d-flex justify-content-between mb-3">
            <h5 class="fw-bold">Soal ${idx + 1} / ${state.batch.length}</h5>
            <small class="text-muted">No Asli: ${q[KEYS.number] || "-"}</small>
        </div>
        ${displayHtml} ${choicesHtml}
        <div class="mt-4 d-flex gap-2 w-100">
            <button class="btn btn-outline-secondary fw-bold flex-grow-1" onclick="window.handlePrev()" ${idx === 0 ? "disabled" : ""}>Sebelumnya</button>
            <button class="btn btn-outline-warning fw-bold flex-grow-1" onclick="window.handleLupa()">${isLupa ? "Ditandai" : "Lupa"}</button>
            ${
              idx < state.batch.length - 1
                ? `<button class="btn btn-outline-primary fw-bold flex-grow-1" onclick="window.handleNext()">Berikutnya</button>`
                : `<button class="btn btn-primary fw-bold flex-grow-1" onclick="window.handleConfirm()">Selesai</button>`
            }
        </div>
      </div>
    `;
  area.appendChild(card);
}

// --- 2. RENDER MEMORY ---
export function renderMem(state, qNo) {
  area.innerHTML = "";
  const idx = state.current;
  const q = state.batch[idx];
  const val = state.answers[idx] === "Lupa" ? "" : state.answers[idx] || "";

  const kanjiTxt = String(q[KEYS.kanji] || "").trim();
  const meanTxt = String(q[KEYS.meaning] || "").trim();
  const hiraTxt = String(q[KEYS.hiragana] || "").trim();

  let displayHtml = "";
  let placeholderTxt = "",
    labelTxt = "";

  if (state.sessionType === "write_romaji") {
    displayHtml = formatQuestion(meanTxt || hiraTxt);
    placeholderTxt = "Ketik Cara Baca (Romaji/Kana)";
    labelTxt = "Ketik Bacaan:";
  } else {
    const textToShow = kanjiTxt || hiraTxt;
    displayHtml = formatQuestion(textToShow);
    placeholderTxt = "Contoh: Ikan, Air";
    labelTxt = "Ketik Arti (Indonesia):";
  }

  const card = document.createElement("div");
  card.className = "card card-kanji mb-3 border-0 shadow-sm";
  card.innerHTML = `
      <div class="card-body p-4">
        <div class="d-flex justify-content-between mb-3">
            <h5 class="fw-bold">Hafalan ${idx + 1} / ${state.batch.length}</h5>
            <small class="text-muted">No Asli: ${q[KEYS.number] || "-"}</small>
        </div>
        ${displayHtml}
        <div class="mt-3">
            <label class="fw-bold text-muted mb-2">${labelTxt}</label>
            <div class="input-group input-group-lg">
                <input type="text" id="memInput" class="form-control border-secondary" placeholder="${placeholderTxt}" autocomplete="off" value="${escapeHtml(val)}" style="font-size: 1.3rem;">
                <button class="btn btn-outline-secondary" type="button" id="btnMic" title="Rekam Suara"><i class="bi bi-mic-fill"></i></button>
            </div>
        </div>
        <div class="mt-4 d-flex gap-2 w-100">
            <button class="btn btn-outline-secondary fw-bold flex-grow-1" onclick="window.handlePrev()" ${idx === 0 ? "disabled" : ""}>Sebelumnya</button>
            <button class="btn btn-outline-warning fw-bold flex-grow-1" onclick="window.handleLupa()">Lupa</button>
            ${idx < state.batch.length - 1 ? `<button class="btn btn-outline-primary fw-bold flex-grow-1" onclick="window.handleNext()">Berikutnya</button>` : `<button class="btn btn-success fw-bold flex-grow-1" onclick="window.handleConfirm()">Selesai</button>`}
        </div>
      </div>
    `;
  area.appendChild(card);

  const inp = document.getElementById("memInput");
  const btnMic = document.getElementById("btnMic");
  inp.focus();
  inp.oninput = (e) => window.handleInput(e.target.value);
  inp.onkeydown = (e) => {
    if (e.key === "Enter") window.handleNextOrSubmit();
  };

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = state.sessionType === "write_romaji" ? "ja-JP" : "id-ID";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    btnMic.onclick = () => {
      try {
        recognition.start();
      } catch (e) {
        recognition.stop();
      }
    };
    recognition.onstart = () => {
      btnMic.classList.remove("btn-outline-secondary");
      btnMic.classList.add("btn-danger");
      btnMic.innerHTML =
        '<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>';
    };
    recognition.onend = () => {
      btnMic.classList.remove("btn-danger");
      btnMic.classList.add("btn-outline-secondary");
      btnMic.innerHTML = '<i class="bi bi-mic-fill"></i>';
      inp.focus();
    };
    recognition.onresult = (event) => {
      let transcript = event.results[0][0].transcript;
      const cleanText = transcript
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
      inp.value = cleanText;
      window.handleInput(cleanText);
    };
  } else {
    btnMic.style.display = "none";
    inp.style.borderRadius = "0.5rem";
  }
}

// --- 3. RENDER RESULT (SUDAH DIPERBAIKI: DARK MODE HISTORY) ---
// --- 3. RENDER RESULT (VERSI BERSIH - TANPA RIWAYAT) ---
export function renderResult(result, sessionType, wrongIndices = []) {
  area.innerHTML = "";
  const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
  
  // KITA HAPUS BAGIAN PENGAMBILAN DATA HISTORY DARI SINI
  
  let modeLabel = sessionType.includes("quiz") ? "Hasil Quiz" : "Hasil Tes";

  let html = `
    <div class="card shadow-sm border-0 mb-4">
      <div class="card-body">
        
        <div class="text-center mb-4">
          <h4 class="fw-bold">${modeLabel}</h4>
          <h1 class="display-3 fw-bold ${pct > 60 ? "text-success" : "text-danger"}">${pct}%</h1>
          <p class="text-muted">Skor: ${result.score} / ${result.total}</p>
        </div>

        <div class="d-grid gap-2 mb-4">
          <div class="row g-2">
            <div class="col-6"><button class="btn btn-outline-primary w-100 fw-bold py-2" onclick="window.handleRetry()">Ulangi Semua</button></div>
            <div class="col-6"><button class="btn btn-dark w-100 fw-bold py-2" onclick="window.handleBack()">Menu Utama</button></div>
          </div>
          ${
            wrongIndices.length > 0
              ? `<button class="btn btn-danger btn-lg shadow-sm fw-bold mt-2" onclick="window.handleRetryWrong([${wrongIndices}])"><i class="bi bi-arrow-counterclockwise me-2"></i> Perbaiki ${wrongIndices.length} Soal Salah</button>`
              : `<div class="alert alert-success text-center py-2 fw-bold"><i class="bi bi-stars me-2"></i>Sempurna!</div>`
          }
        </div>
        
        </div>
    </div>`;

  // BAGIAN DETAIL JAWABAN (TETAP ADA)
  if (result.details && result.details.length > 0) {
    html += `<h6 class="fw-bold mb-3 mt-4 text-dark"><i class="bi bi-list-check me-2"></i>Detail Jawaban</h6>`;

    result.details.forEach((d, i) => {
      const isCorrect = d.isCorrect;
      const userTxt = d.userAns === "Lupa" ? "Lupa" : d.userAns || "-";

      const kanji = (d.q[KEYS.kanji] || "").trim();
      const hira = (d.realHira || "").trim();
      const mean = d.realMean || "";

      let keyAnswer = "";
      let extraInfo = "";

      if (sessionType === "quiz_hiragana" || sessionType === "write_romaji") {
        keyAnswer = hira;
        extraInfo = mean;
      } else {
        keyAnswer = mean;
        extraInfo = hira;
      }

      const displayKanji = kanji || hira;

      html += `
            <div class="res-item">
               <div class="res-kanji-row">
                  <div class="res-kanji-main">${escapeHtml(displayKanji)}</div>
                  ${
                    isCorrect
                      ? '<i class="bi bi-check-circle-fill text-success fs-4"></i>'
                      : '<i class="bi bi-x-circle-fill text-danger fs-4"></i>'
                  }
               </div>

               <div class="res-compare">
                   ${
                     !isCorrect
                       ? `
                   <div class="res-line res-wrong">
                       <span class="res-tag">KAMU</span>
                       <span class="res-val">${escapeHtml(userTxt)}</span>
                   </div>`
                       : ""
                   }

                   <div class="res-line res-correct">
                       <span class="res-tag">BENAR</span>
                       <span class="res-val fw-bold">${escapeHtml(keyAnswer)}</span>
                   </div>
               </div>
               
               <div class="res-meta">${escapeHtml(extraInfo)}</div>
            </div>`;
    });
  }

  html += `</div>`;
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
