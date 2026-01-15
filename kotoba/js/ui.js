import { escapeHtml } from './utils.js';
import { KEYS, SELECTORS } from './constants.js';

const area = document.getElementById(SELECTORS.quizArea);

// --- HELPER: SMART FURIGANA ---
function formatRuby(kanji, hira) {
    kanji = String(kanji || '').trim();
    hira  = String(hira || '').trim();
    if (!kanji || !hira || kanji === hira) return `<span class="fw-bold text-primary">${escapeHtml(kanji)}</span>`;
    let suffix = "";
    let kTemp = kanji;
    let hTemp = hira;
    while (kTemp.length > 0 && hTemp.length > 0) {
        const kLast = kTemp.slice(-1);
        const hLast = hTemp.slice(-1);
        if (kLast === hLast) {
            suffix = kLast + suffix;
            kTemp = kTemp.slice(0, -1);
            hTemp = hTemp.slice(0, -1);
        } else { break; }
    }
    return `<ruby style="font-weight: bold; color: #0d6efd;">${escapeHtml(kTemp)}<rt style="font-size: 0.45em; color: #6c757d; font-weight: normal; margin-bottom: 0px; letter-spacing: 1px;">${escapeHtml(hTemp)}</rt></ruby><span style="font-weight: bold; color: #0d6efd;">${escapeHtml(suffix)}</span>`;
}

// --- 1. RENDER QUIZ (SUPPORT TEBAK ARTI & TEBAK HIRAGANA) ---
export function renderQuiz(state, qNo) {
    area.innerHTML = "";
    const idx = state.current;
    const q = state.batch[idx];
    const choices = state.choicesPerQ[idx];
    const isLupa = state.answers[idx] === 'Lupa';
    
    const kanjiTxt = String(q[KEYS.kanji] || '').trim();
    const hiraTxt  = String(q[KEYS.hiragana] || '').trim();
    const meanTxt  = String(q[KEYS.meaning] || '').trim();

    // TENTUKAN APA YANG DITAMPILKAN DI TENGAH (Soal)
    let displayHtml = '';
    
    if (state.sessionType === 'quiz_hiragana') {
        // Mode Tebak Hiragana: SOAL = BAHASA INDONESIA
        // PERBAIKAN: Ubah mb-0 menjadi mb-5 agar ada jarak yang JAUH dengan tombol
        displayHtml = `<div class="kanji-big mb-5 pb-2 text-primary fw-bold text-break" style="font-size: 2.5rem; text-align:center;">${escapeHtml(meanTxt)}</div>`;
    } else {
        // Mode Tebak Arti: SOAL = KANJI + FURIGANA
        // PERBAIKAN: Ubah min-height dan margin agar konsisten leganya
        displayHtml = `
            <div class="text-center mb-5" style="font-size: 3.8rem; min-height: 90px; display: flex; align-items: end; justify-content: center;">
                <div style="line-height: 1;">${formatRuby(kanjiTxt, hiraTxt)}</div>
            </div>`;
    }

    let choicesHtml = '<div class="row g-3">';
    choices.forEach((c, i) => {
        const isSelected = state.answers[idx] === i ? 'choice-selected' : '';
        const textClass = state.sessionType === 'quiz_hiragana' ? 'text-primary' : 'text-dark';
        
        choicesHtml += `
          <div class="col-12"> 
            <div class="choice-card ${isSelected} p-3 shadow-sm border" role="button" onclick="window.handleAnswer(${i})" style="border-radius: 8px; transition: all 0.2s;">
              <div class="fw-bold ${textClass}" style="font-size: 1.1rem;">${escapeHtml(c.text)}</div>
            </div>
          </div>`;
    });
    choicesHtml += '</div>';

    const card = document.createElement('div');
    card.className = 'card card-kanji mb-3 border-0 shadow-sm';
    card.innerHTML = `
      <div class="card-body p-4">
        <div class="d-flex justify-content-between mb-3">
            <h5 class="fw-bold">Soal ${idx + 1} / ${state.batch.length}</h5>
            <small class="text-muted">No Asli: ${q[KEYS.number] || '-'}</small>
        </div>
        
        ${displayHtml}

        ${choicesHtml}
        
        <div class="mt-4 d-flex gap-2 w-100">
            <button class="btn btn-outline-secondary fw-bold flex-grow-1" onclick="window.handlePrev()" ${idx===0?'disabled':''}>Sebelumnya</button>
            <button class="btn btn-outline-warning fw-bold flex-grow-1" onclick="window.handleLupa()">${isLupa ? 'Ditandai' : 'Lupa'}</button>
            ${ idx < state.batch.length - 1 
               ? `<button class="btn btn-outline-primary fw-bold flex-grow-1" onclick="window.handleNext()">Berikutnya</button>` 
               : `<button class="btn btn-primary fw-bold flex-grow-1" onclick="window.handleConfirm()">Selesai</button>`
            }
        </div>
      </div>
    `;
    area.appendChild(card);
}

// --- 2. RENDER MEMORY (SUPPORT TULIS ARTI & TULIS ROMAJI) ---
export function renderMem(state, qNo) {
    area.innerHTML = "";
    const idx = state.current;
    const q = state.batch[idx];
    const val = state.answers[idx] === 'Lupa' ? '' : (state.answers[idx] || '');
    
    const kanjiTxt = String(q[KEYS.kanji] || '').trim();
    const hiraTxt  = String(q[KEYS.hiragana] || '').trim();
    const meanTxt  = String(q[KEYS.meaning] || '').trim();

    let displayHtml = '';
    let placeholderTxt = '';
    let labelTxt = '';

    if (state.sessionType === 'write_romaji') {
        // Mode Tulis Romaji
        // PERBAIKAN: Tambah mb-5 agar lega
        displayHtml = `<div class="kanji-big mb-5 pb-2 text-primary fw-bold text-break" style="font-size: 2.8rem; text-align:center;">${escapeHtml(meanTxt)}</div>`;
        placeholderTxt = "Ketik Romaji (tanpa simbol)";
        labelTxt = "Ketik Romaji:";
    } else {
        // Mode Tulis Arti
        displayHtml = `
            <div class="text-center mb-5" style="font-size: 4.2rem; min-height: 100px; display: flex; align-items: end; justify-content: center;">
                <div style="line-height: 1;">${formatRuby(kanjiTxt, hiraTxt)}</div>
            </div>`;
        placeholderTxt = "Contoh: Saya";
        labelTxt = "Ketik Arti (Indonesia):";
    }

    const card = document.createElement('div');
    card.className = 'card card-kanji mb-3 border-0 shadow-sm';
    
    card.innerHTML = `
      <div class="card-body p-4">
        <div class="d-flex justify-content-between mb-3">
            <h5 class="fw-bold">Hafalan ${idx + 1} / ${state.batch.length}</h5>
            <small class="text-muted">No Asli: ${q[KEYS.number] || '-'}</small>
        </div>
        
        ${displayHtml}
        
        <div class="mt-3">
            <label class="fw-bold text-muted mb-2">${labelTxt}</label>
            <div class="input-group input-group-lg">
                <input type="text" id="memInput" class="form-control border-secondary" placeholder="${placeholderTxt}" autocomplete="off" value="${escapeHtml(val)}" style="font-size: 1.3rem;">
                <button class="btn btn-outline-secondary" type="button" id="btnMic" title="Rekam Suara">
                    <i class="bi bi-mic-fill"></i>
                </button>
            </div>
            ${state.sessionType === 'write_romaji' 
                ? `<div class="form-text text-muted mt-2 small">*Jangan tulis bagian dalam [] atau tanda ~</div>`
                : `<div class="form-text text-muted mt-2 small">*Jawab salah satu arti jika ada banyak.</div>`
            }
        </div>

        <div class="mt-4 d-flex gap-2 w-100">
            <button class="btn btn-outline-secondary fw-bold flex-grow-1" onclick="window.handlePrev()" ${idx===0?'disabled':''}>Sebelumnya</button>
            <button class="btn btn-outline-warning fw-bold flex-grow-1" onclick="window.handleLupa()">Lupa</button>
            ${ idx < state.batch.length - 1 
               ? `<button class="btn btn-outline-primary fw-bold flex-grow-1" onclick="window.handleNext()">Berikutnya</button>` 
               : `<button class="btn btn-success fw-bold flex-grow-1" onclick="window.handleConfirm()">Selesai</button>`
            }
        </div>
      </div>
    `;
    area.appendChild(card);
    
    const inp = document.getElementById('memInput');
    const btnMic = document.getElementById('btnMic');
    
    inp.focus();
    inp.oninput = (e) => window.handleInput(e.target.value);
    inp.onkeydown = (e) => { if(e.key === 'Enter') window.handleNextOrSubmit(); };

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = state.sessionType === 'write_romaji' ? 'ja-JP' : 'id-ID'; 
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        btnMic.onclick = () => { try { recognition.start(); } catch (e) { recognition.stop(); } };
        recognition.onstart = () => {
            btnMic.classList.remove('btn-outline-secondary'); btnMic.classList.add('btn-danger');
            btnMic.innerHTML = '<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>';
        };
        recognition.onend = () => {
            btnMic.classList.remove('btn-danger'); btnMic.classList.add('btn-outline-secondary');
            btnMic.innerHTML = '<i class="bi bi-mic-fill"></i>'; inp.focus();
        };
        recognition.onresult = (event) => {
            let transcript = event.results[0][0].transcript;
            const cleanText = transcript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
            inp.value = cleanText; window.handleInput(cleanText);
        };
    } else { btnMic.style.display = 'none'; inp.style.borderRadius = '0.5rem'; }
}

// --- 3. RENDER HASIL & RIWAYAT ---
export function renderResult(result, isQuiz, wrongIndices = []) {
    area.innerHTML = "";
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
    const history = JSON.parse(localStorage.getItem("kotoba_apps_history") || "[]");
    const lastHistory = history.slice(0, 5); 

    let modeLabel = 'Hasil Tes';
    if(isQuiz) modeLabel = 'Hasil Quiz';

    let html = `
    <div class="card shadow-sm border-0 mb-4"><div class="card-body">
      <div class="text-center mb-4">
        <h4 class="fw-bold">${modeLabel}</h4>
        <h1 class="display-3 fw-bold ${pct>60?'text-success':'text-danger'}">${pct}%</h1>
        <p class="text-muted">Skor: ${result.score} / ${result.total}</p>
      </div>

      <div class="d-grid gap-2 mb-4">
        <div class="row g-2">
            <div class="col-6">
                <button class="btn btn-outline-primary w-100 fw-bold py-2" onclick="window.handleRetry()">Ulangi Semua</button>
            </div>
            <div class="col-6">
                <button class="btn btn-dark w-100 fw-bold py-2" onclick="window.handleBack()">Menu Utama</button>
            </div>
        </div>
        ${wrongIndices.length > 0 ? `
            <button class="btn btn-danger btn-lg shadow-sm fw-bold mt-2" onclick="window.handleRetryWrong([${wrongIndices}])">
                <i class="bi bi-arrow-counterclockwise me-2"></i> Perbaiki ${wrongIndices.length} Soal Salah
            </button>
        ` : `<div class="alert alert-success text-center py-2 fw-bold"><i class="bi bi-stars me-2"></i>Sempurna!</div>`}
      </div>

      <div class="bg-light p-3 rounded-3 mb-4">
        <h6 class="fw-bold mb-3 small text-uppercase text-secondary"><i class="bi bi-clock-history me-2"></i>Riwayat Terakhir</h6>
        <div class="table-responsive">
            <table class="table table-sm table-borderless mb-0 align-middle" style="font-size: 0.9rem;">
                <thead class="text-muted small border-bottom">
                    <tr><td width="30%">Waktu</td><td width="50%">Info</td><td width="20%" class="text-end">Skor</td></tr>
                </thead>
                <tbody>
                ${lastHistory.length > 0 ? lastHistory.map(h => `
                    <tr>
                        <td class="text-secondary small py-2">${h.date.split(' ')[0]} <br> <span style="font-size:0.8em">${h.date.split(' ')[1] || ''}</span></td>
                        <td>
                            <div class="fw-bold text-dark">${formatModeName(h.type)}</div>
                            <div class="text-muted small text-truncate" style="max-width: 150px;" title="${h.packages || '-'}">${h.packages || '-'}</div>
                        </td>
                        <td class="text-end fw-bold ${h.percentage >= 60 ? 'text-success' : 'text-danger'}">${h.percentage}%</td>
                    </tr>
                `).join('') : '<tr><td colspan="3" class="text-center text-muted py-3">Belum ada riwayat</td></tr>'}
                </tbody>
            </table>
        </div>
      </div>
    `;
    
    if (result.details && result.details.length > 0) {
        result.details.forEach((d, i) => {
            const color = d.isCorrect ? 'text-success' : 'text-danger';
            const label = d.isCorrect ? 'Benar' : 'Salah';
            const userTxt = d.userAns === 'Lupa' ? 'Lupa' : (d.userAns || '(Kosong)');
            const kanji = (d.q[KEYS.kanji] || '').trim();
            const hira = (d.realHira || '').trim();
            const mean = d.realMean || '';
            const romaji = d.realRomaji || '-';

            html += `
            <div class="border-top py-2">
               <div class="d-flex justify-content-between">
                  <strong class="text-primary fs-5">${escapeHtml(kanji)}</strong>
                  <span class="${color} fw-bold small">${label}</span>
               </div>
               <div class="fw-bold text-dark mb-1">${escapeHtml(hira)} <span class="text-danger small ms-2">${escapeHtml(romaji)}</span></div>
               <div class="small text-muted">Arti: <b>${escapeHtml(mean)}</b></div>
               <div class="small mt-1">Jawaban Kamu: <strong>${escapeHtml(userTxt)}</strong></div>
            </div>`;
        });
    }
    
    html += `</div></div>`;
    area.innerHTML = html;
    if(pct >= 60) launchConfetti();
}

function formatModeName(type) {
    if(type === 'quiz') return 'Tebak Arti';
    if(type === 'quiz_hiragana') return 'Tebak Hiragana';
    if(type === 'mem') return 'Tulis Arti';
    if(type === 'write_romaji') return 'Tulis Romaji';
    return type;
}

function launchConfetti() {
    const wrap = document.getElementById(SELECTORS.confetti);
    if (!wrap) return; 
    for(let i=0; i<40; i++) {
        const el = document.createElement('div');
        el.className = 'confetti';
        el.style.left = Math.random()*100 + 'vw';
        el.style.backgroundColor = ['#f00','#0f0','#00f','#ff0'][Math.floor(Math.random()*4)];
        el.style.width='8px'; el.style.height='8px';
        el.style.position = 'fixed'; el.style.top = '-10px'; 
        el.style.animation = `drop ${1+Math.random()*2}s linear forwards`;
        wrap.appendChild(el);
        setTimeout(()=>el.remove(), 3000);
    }
}