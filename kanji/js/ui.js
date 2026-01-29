import { escapeHtml } from './utils.js';
import { KEYS, SELECTORS } from './constants.js';

const area = document.getElementById(SELECTORS.quizArea);

// --- CSS INJECT (DIPERBARUI KE DARK/GLASS THEME) ---
// Kita ubah style bawaan JS agar langsung gelap (Dark Mode) tanpa perlu ditimpa CSS luar
const style = document.createElement('style');
style.innerHTML = `
    .choice-card-anim { transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s, border-color 0.2s !important; }
    .choice-card-anim:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(13, 110, 253, 0.15) !important; border-color: #0d6efd !important; z-index: 2; }
    .choice-card-anim:active { transform: scale(0.98) translateY(-2px); }
    
    /* PROGRESS STYLES (DARK GLASS) */
    .prog-card { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 6px rgba(0,0,0,0.2); height: 100%; display: flex; flex-direction: column; color: #fff; }
    .prog-item { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .prog-label { font-size: 0.75rem; color: #adb5bd; display: flex; align-items: center; gap: 6px; font-weight: 600; }
    .prog-pct { font-size: 0.75rem; font-weight: bold; color: #fff; }
    .prog-track { flex-grow: 1; height: 6px; background-color: rgba(255,255,255,0.1); border-radius: 3px; margin: 0 8px; overflow: hidden; }
    .prog-fill { height: 100%; border-radius: 3px; }
    
    .c-blue { color: #3b82f6 !important; } .bg-blue { background-color: #3b82f6 !important; }
    .c-green { color: #22c55e !important; } .bg-green { background-color: #22c55e !important; }
    .c-orange { color: #f59e0b !important; } .bg-orange { background-color: #f59e0b !important; }
    .c-red { color: #ef4444 !important; } .bg-red { background-color: #ef4444 !important; }
    .bab-done { border: 1px solid #22c55e; background-color: rgba(34, 197, 94, 0.1); }

    /* RESULT STYLES (DARK GLASS - MINIMALIS) */
    .res-item { background: rgba(255,255,255,0.05); padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.08); margin-bottom: 12px; }
    .res-kanji-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .res-kanji-main { font-size: 2rem; font-weight: 800; color: #fff; line-height: 1; text-shadow: 0 0 10px rgba(217, 70, 239, 0.3); }
    .res-compare { display: flex; flex-direction: column; gap: 8px; }
    .res-line { padding: 8px 12px; border-radius: 8px; font-size: 0.95rem; display: flex; align-items: center; justify-content: space-between; font-weight: 500; }
    
    /* Warna Salah/Benar dibuat lebih neon/gelap */
    .res-wrong { background-color: rgba(239, 68, 68, 0.15); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.3); }
    .res-correct { background-color: rgba(34, 197, 94, 0.15); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.3); }
    
    .res-tag { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-right: 8px; font-weight: 800; }
    .res-val { flex-grow: 1; text-align: right; }
    .res-meta { font-size: 0.8rem; color: #aaa; margin-top: 8px; text-align: right; font-style: italic; }

    /* FONT RESPONSIF UNTUK SOAL */
    .q-text-responsive {
        font-size: clamp(2rem, 5vw, 4rem); 
        line-height: 1.3;
        font-weight: 800;
        color: #fff; /* Pastikan putih */
        text-shadow: 0 0 20px rgba(217, 70, 239, 0.5); /* Glow bawaan */
        text-align: center;
        word-wrap: break-word;
        width: 100%;
    }
`;
document.head.appendChild(style);

// --- HELPER: FORMAT TAMPILAN SOAL ---
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
    const isLupa = state.answers[idx] === 'Lupa';
    
    const kanjiTxt = String(q[KEYS.kanji] || '').trim();
    const meanTxt = String(q[KEYS.meaning] || '').trim();
    const hiraTxt = String(q[KEYS.hiragana] || '').trim();

    let displayHtml = '';
    if (state.sessionType === 'quiz_hiragana') {
        displayHtml = formatQuestion(meanTxt || hiraTxt);
    } else {
        const textToShow = kanjiTxt || hiraTxt;
        displayHtml = formatQuestion(textToShow);
    }

    let choicesHtml = '<div class="row g-3 p-3">';
    choices.forEach((c, i) => {
        const isSelected = state.answers[idx] === i;
        let cardClass = "p-3 shadow-sm border rounded-3 fw-bold choice-card-anim"; 
        let textClass = "";
        let style = "cursor: pointer; position: relative;";

        // Update warna kartu pilihan agar cocok dengan dark theme (Glassy White)
        if (isSelected) {
            style += "background-color: #d946ef !important; border-color: #d946ef !important; color: #ffffff !important; box-shadow: 0 0 15px rgba(217, 70, 239, 0.4) !important;";
            textClass = "text-white"; 
        } else {
            // Default kartu pilihan: Transparan Gelap
            style += "background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #fff;";
            textClass = "text-white";
        }
        
        choicesHtml += `
          <div class="col-12"> 
            <div class="${cardClass}" role="button" onclick="window.handleAnswer(${i})" style="${style}">
              <div class="${textClass}" style="font-size: 1.1rem;">${escapeHtml(c.text)}</div>
            </div>
          </div>`;
    });
    choicesHtml += '</div>';

    const card = document.createElement('div');
    card.className = 'card card-kanji mb-3 border-0 shadow-sm';
    // Style card dipaksa transparan lewat JS agar override bootstrap
    card.style.background = "transparent"; 
    
    card.innerHTML = `
      <div class="card-body p-3">
        <div class="d-flex justify-content-between mb-3 align-items-center">
            <h5 class="fw-bold text-white m-0">Soal ${idx + 1} / ${state.batch.length}</h5>
            <small class="text-white-50">No Asli: ${q[KEYS.number] || '-'}</small>
        </div>
        ${displayHtml} ${choicesHtml}
        <div class="mt-4 d-flex gap-2 w-100 p-3">
            <button class="btn btn-outline-secondary fw-bold flex-grow-1" onclick="window.handlePrev()" ${idx===0?'disabled':''}>Sebelumnya</button>
            <button class="btn btn-outline-warning fw-bold flex-grow-1" onclick="window.handleLupa()">${isLupa ? 'Ditandai' : 'Lupa'}</button>
            ${ idx < state.batch.length - 1 
               ? `<button class="btn btn-primary fw-bold flex-grow-1" onclick="window.handleNext()">Berikutnya</button>` 
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
    let placeholderTxt = "", labelTxt = "";

    if (state.sessionType === "write_romaji") {
        displayHtml = formatQuestion(meanTxt || hiraTxt);
        placeholderTxt = "Ketik bacaan...";
        labelTxt = "TERJEMAHKAN KE ROMAJI / KANA";
    } else {
        const textToShow = kanjiTxt || hiraTxt;
        displayHtml = formatQuestion(textToShow);
        placeholderTxt = "Contoh: Ikan, Air...";
        labelTxt = "TERJEMAHKAN KE INDONESIA";
    }

    const card = document.createElement("div");
    card.className = "card card-kanji mb-3 border-0 shadow-sm";
    card.style.background = "transparent"; // Pastikan transparan

    card.innerHTML = `
      <div class="card-body p-0 d-flex flex-column h-100 justify-content-center" style="margin-left: 1em; margin-top: 1em;">
        
        <div class="d-flex justify-content-between mb-3 align-items-center w-100" style="padding-right: 1em; margin-top: 1em;">
            <h5 class="fw-bold m-0 text-white">Hafalan ${idx + 1} / ${state.batch.length}</h5>
            <small class="text-white-50" style="font-size: 0.8rem;">No Asli: ${q[KEYS.number] || "-"}</small>
        </div>
        
        <div class="flex-grow-1 d-flex align-items-center justify-content-center my-4">
            ${displayHtml}
        </div>

        <div class="mb-5 w-100 text-center">
            <div class="mem-label" style="color: #aaa; letter-spacing: 1px; font-weight: 600; font-size: 0.8rem; margin-bottom: 10px;">${labelTxt}</div>
            
            <div class="mem-input-box">
                <input type="text" id="memInput" 
                       placeholder="${placeholderTxt}" 
                       autocomplete="off" 
                       spellcheck="false" 
                       value="${escapeHtml(val)}">
                
                <div id="btnMic" role="button" title="Rekam Suara">
                    <i class="bi bi-mic-fill fs-5"></i>
                </div>
            </div>
        </div>

        <div class="d-flex gap-2 w-100 mt-auto" style="padding-bottom: 1em; padding-left: 1em; padding-right: 1em;">
            <button class="btn btn-outline-secondary fw-bold flex-grow-1" onclick="window.handlePrev()" ${idx === 0 ? "disabled" : ""}>Sebelumnya</button>
            <button class="btn btn-outline-warning fw-bold flex-grow-1" onclick="window.handleLupa()">Lupa</button>
            ${
              idx < state.batch.length - 1
                ? `<button class="btn btn-primary fw-bold flex-grow-1" onclick="window.handleNext()">Berikutnya</button>`
                : `<button class="btn btn-success fw-bold flex-grow-1" onclick="window.handleConfirm()">Selesai</button>`
            }
        </div>
      </div>
    `;
    area.appendChild(card);

    const inp = document.getElementById("memInput");
    const btnMic = document.getElementById("btnMic");
    inp.focus();
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

// --- 3. RENDER RESULT (REVISI: LEBIH LEGA & RAPI) ---
export function renderResult(result, sessionType, wrongIndices = []) {
    area.innerHTML = "";
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
    const history = JSON.parse(localStorage.getItem("kotoba_apps_history") || "[]");
    const lastHistory = history.slice(0, 5); 
    
    let modeLabel = sessionType.includes('quiz') ? 'Hasil Quiz' : 'Hasil Tes';
    let scoreColorClass = pct >= 60 ? 'text-success' : 'text-danger';
    
    // Style Glass untuk Tabel Riwayat
    const historyStyle = "background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 20px; margin-top: 30px;";
    
    let html = `
    <div class="card shadow-lg border-0 mb-4" style="background: transparent;">
        <div class="card-body p-4 p-md-5">
            
            <div class="text-center mb-5 relative-container">
                <h5 class="fw-bold text-white-50 text-uppercase letter-spacing-2 mb-3">${modeLabel}</h5>
                <h1 class="display-1 fw-bold ${scoreColorClass}" style="font-size: 5rem; text-shadow: 0 0 30px rgba(0,0,0,0.5); margin-bottom: 10px;">${pct}%</h1>
                <div class="badge rounded-pill bg-dark border border-secondary px-4 py-2 mt-2">
                    <span class="text-white fs-6">Skor: <span class="fw-bold text-warning">${result.score}</span> / ${result.total}</span>
                </div>
            </div>
            
            <div class="d-grid gap-3 mb-5" style="max-width: 600px; margin: 0 auto;">
                <div class="row g-3">
                    <div class="col-6">
                        <button class="btn btn-outline-light w-100 fw-bold py-3 rounded-4 h-100 d-flex align-items-center justify-content-center gap-2" onclick="window.handleRetry()">
                            <i class="bi bi-arrow-repeat fs-5"></i> Ulangi
                        </button>
                    </div>
                    <div class="col-6">
                        <button class="btn btn-outline-secondary w-100 fw-bold py-3 rounded-4 h-100 d-flex align-items-center justify-content-center gap-2" onclick="window.handleBack()">
                            <i class="bi bi-grid-fill fs-5"></i> Menu
                        </button>
                    </div>
                </div>
                
                ${wrongIndices.length > 0 
                    ? `<button class="btn btn-danger btn-lg shadow fw-bold mt-2 rounded-4 py-3 w-100 d-flex align-items-center justify-content-center gap-2" onclick="window.handleRetryWrong([${wrongIndices}])">
                         <i class="bi bi-exclamation-triangle-fill"></i> Perbaiki ${wrongIndices.length} Soal Salah
                       </button>` 
                    : `<div class="alert alert-success text-center py-3 fw-bold rounded-4 border-0 mt-2" style="background: rgba(34, 197, 94, 0.15); color: #86efac; border: 1px solid rgba(34, 197, 94, 0.3);">
                         <i class="bi bi-trophy-fill me-2"></i>Sempurna! Kerja Bagus.
                       </div>`
                }
            </div>

            <div style="${historyStyle}">
                <h6 class="fw-bold mb-4 small text-uppercase text-white-50 d-flex align-items-center gap-2">
                    <i class="bi bi-clock-history text-primary"></i> Riwayat Terakhir
                </h6>
                <div class="table-responsive">
                    <table class="table table-borderless mb-0 align-middle" style="color: #fff;">
                        <thead class="text-white-50 small border-bottom border-secondary" style="font-size: 0.75rem; text-transform: uppercase;">
                            <tr><td width="30%" class="pb-2">Waktu</td><td width="50%" class="pb-2">Info</td><td width="20%" class="text-end pb-2">Skor</td></tr>
                        </thead>
                        <tbody>
                        ${lastHistory.length > 0 ? lastHistory.map(h => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td class="text-white-50 small py-3">
                                    <div class="fw-bold text-light">${h.date.split(' ')[0]}</div>
                                    <div style="font-size:0.8em; opacity:0.6;">${h.date.split(' ')[1] || ''}</div>
                                </td>
                                <td class="py-3">
                                    <div class="fw-bold text-white mb-1" style="font-size: 0.95rem;">${formatModeName(h.type)}</div>
                                    <div class="badge bg-secondary bg-opacity-25 text-white-50 fw-normal text-truncate" style="max-width: 140px;">${h.packages || '-'}</div>
                                </td>
                                <td class="text-end fw-bold py-3">
                                    <span class="${h.percentage >= 60 ? 'text-success' : 'text-danger'}" style="font-size: 1.1rem; text-shadow: 0 0 10px rgba(0,0,0,0.5);">${h.percentage}%</span>
                                </td>
                            </tr>`).join('') : '<tr><td colspan="3" class="text-center text-white-50 py-4 fst-italic">Belum ada riwayat</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
    `;
    
    if (result.details && result.details.length > 0) {
        html += `<h5 class="fw-bold mb-4 mt-5 text-white ps-2 border-start border-4 border-primary">&nbsp; Detail Jawaban</h5>`;
        
        result.details.forEach((d, i) => {
            const isCorrect = d.isCorrect;
            const userTxt = d.userAns === 'Lupa' ? 'Lupa' : (d.userAns || '-');
            const kanji = (d.q[KEYS.kanji] || '').trim();
            const hira = (d.realHira || '').trim();
            const mean = d.realMean || '';
            
            let keyAnswer = "";
            let extraInfo = "";

            if (sessionType === 'quiz_hiragana' || sessionType === 'write_romaji') {
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
                  <div class="rounded-circle d-flex align-items-center justify-content-center ${isCorrect ? 'bg-success bg-opacity-25' : 'bg-danger bg-opacity-25'}" style="width: 40px; height: 40px;">
                    ${isCorrect ? 
                        '<i class="bi bi-check-lg text-success fs-4"></i>' : 
                        '<i class="bi bi-x-lg text-danger fs-4"></i>'}
                  </div>
               </div>

               <div class="res-compare mt-3">
                   ${!isCorrect ? `
                   <div class="res-line res-wrong">
                       <span class="res-tag text-danger"><i class="bi bi-person-fill"></i> KAMU</span>
                       <span class="res-val text-white">${escapeHtml(userTxt)}</span>
                   </div>` : ''}

                   <div class="res-line res-correct">
                       <span class="res-tag text-success"><i class="bi bi-key-fill"></i> JAWABAN</span>
                       <span class="res-val fw-bold text-white">${escapeHtml(keyAnswer)}</span>
                   </div>
               </div>
               
               <div class="res-meta mt-2 pt-2 border-top border-secondary border-opacity-25">
                 <i class="bi bi-info-circle me-1"></i> ${escapeHtml(extraInfo)}
               </div>
            </div>`;
        });
    }
    
    html += `</div></div>`; 
    area.innerHTML = html; 
    
    if(pct >= 60) launchConfetti();
}

export function renderProgressModal(stats) {
    const list = document.getElementById('progressList');
    if(!list) return;
    list.innerHTML = '';
    const gridDiv = document.createElement('div');
    gridDiv.className = "row g-3"; 
    stats.forEach(item => {
        const pctTotal = item.totalPct;
        const p1 = item.detail.tebakArti; const p2 = item.detail.tebakHiragana;
        const p3 = item.detail.tulisArti; const p4 = item.detail.tulisRomaji;
        const isDone = pctTotal === 100;
        
        // Style Card: Jika Selesai, border hijau, jika belum abu.
        const cardClass = isDone ? "prog-card bab-done" : "prog-card";
        const titleColor = isDone ? "text-success" : "text-white";
        
        const col = document.createElement('div');
        col.className = "col-12 col-md-6"; 
        col.innerHTML = `
        <div class="${cardClass}">
            <div class="d-flex justify-content-between align-items-center mb-3 pb-2" style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                <span class="fw-bold ${titleColor}" style="font-size: 1.1rem;">${item.bab}</span>
                <span class="badge rounded-pill" style="font-size: 0.8rem; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);">Total: ${pctTotal}%</span>
            </div>
            <div class="prog-item"><div class="prog-label c-blue"><i class="bi bi-eye-fill"></i> Tebak Arti</div><div class="prog-track"><div class="prog-fill bg-blue" style="width:${p1}%"></div></div><div class="prog-pct c-blue">${p1}%</div></div>
            <div class="prog-item"><div class="prog-label c-green"><i class="bi bi-translate"></i> Tebak Bacaan</div><div class="prog-track"><div class="prog-fill bg-green" style="width:${p2}%"></div></div><div class="prog-pct c-green">${p2}%</div></div>
            <div class="prog-item"><div class="prog-label c-orange"><i class="bi bi-pencil-fill"></i> Tulis Arti</div><div class="prog-track"><div class="prog-fill bg-orange" style="width:${p3}%"></div></div><div class="prog-pct c-orange">${p3}%</div></div>
            <div class="prog-item"><div class="prog-label c-red"><i class="bi bi-keyboard-fill"></i> Tulis Bacaan</div><div class="prog-track"><div class="prog-fill bg-red" style="width:${p4}%"></div></div><div class="prog-pct c-red">${p4}%</div></div>
        </div>`;
        gridDiv.appendChild(col);
    });
    list.appendChild(gridDiv);
}

function formatModeName(type) {
    if(type === 'quiz') return 'Tebak Arti'; if(type === 'quiz_hiragana') return 'Tebak Bacaan'; if(type === 'mem') return 'Tulis Arti'; if(type === 'write_romaji') return 'Tulis Bacaan'; return type;
}

function launchConfetti() {
    const wrap = document.getElementById(SELECTORS.confetti); if (!wrap) return; 
    for(let i=0; i<40; i++) { const el = document.createElement('div'); el.className = 'confetti'; el.style.left = Math.random()*100 + 'vw'; el.style.backgroundColor = ['#f00','#0f0','#00f','#ff0'][Math.floor(Math.random()*4)]; el.style.width='8px'; el.style.height='8px'; el.style.position = 'fixed'; el.style.top = '-10px'; el.style.animation = `drop ${1+Math.random()*2}s linear forwards`; wrap.appendChild(el); setTimeout(()=>el.remove(), 3000); }
}