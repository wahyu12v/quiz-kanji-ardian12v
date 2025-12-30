import { escapeHtml } from './utils.js';
import { KEYS, SELECTORS } from './constants.js';

const area = document.getElementById(SELECTORS.quizArea);

// --- 1. RENDER QUIZ (PILIHAN GANDA) ---
export function renderQuiz(state, qNo) {
    area.innerHTML = "";
    const idx = state.current;
    const q = state.batch[idx];
    const choices = state.choicesPerQ[idx];
    const isLupa = state.answers[idx] === 'Lupa';
    
    let choicesHtml = '<div class="row g-2">';
    choices.forEach((c, i) => {
        const isSelected = state.answers[idx] === i ? 'choice-selected' : '';
        choicesHtml += `
          <div class="col-12 col-md-6">
            <div class="choice-card ${isSelected}" role="button" onclick="window.handleAnswer(${i})">
              <div class="fw-semibold">${escapeHtml(c.meaning)}</div>
            </div>
          </div>`;
    });
    choicesHtml += '</div>';

    const card = document.createElement('div');
    card.className = 'card card-kanji mb-3';
    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between mb-2">
            <h5>Soal ${idx + 1} / ${state.batch.length}</h5>
            <small class="text-muted">No Asli: ${q[KEYS.number] || '-'}</small>
        </div>
        <div class="kanji-big">${escapeHtml(q[KEYS.kanji])}</div>
        ${choicesHtml}
        <div class="mt-4 d-flex gap-2 btn-row">
            <button class="btn btn-outline-dark" onclick="window.handlePrev()" ${idx===0?'disabled':''}>Sebelumnya</button>
            <button class="btn btn-lupa" onclick="window.handleLupa()">${isLupa ? 'Ditandai Lupa' : 'Lupa'}</button>
            ${ idx < state.batch.length - 1 
               ? `<button class="btn btn-outline-dark ms-auto" onclick="window.handleNext()">Berikutnya</button>` 
               : `<button class="btn btn-primary ms-auto" onclick="window.handleConfirm()">Kirim</button>`
            }
        </div>
      </div>
    `;
    area.appendChild(card);
}

// --- 2. RENDER HAFALAN (ESSAY + VOICE ID-ID) ---
export function renderMem(state, qNo) {
    area.innerHTML = "";
    const idx = state.current;
    const q = state.batch[idx];
    const val = state.answers[idx] === 'Lupa' ? '' : (state.answers[idx] || '');
    
    const card = document.createElement('div');
    card.className = 'card card-kanji mb-3';
    
    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between mb-2">
            <h5>Hafalan ${idx + 1} / ${state.batch.length}</h5>
            <small class="text-muted">No Asli: ${q[KEYS.number] || '-'}</small>
        </div>
        <div class="kanji-big">${escapeHtml(q[KEYS.kanji])}</div>
        
        <div class="mt-3">
            <label class="small text-muted mb-1">Ketik Romaji / Gunakan Suara:</label>
            <div class="input-group input-group-lg">
                <input type="text" id="memInput" class="form-control" placeholder="Contoh: watashi" autocomplete="off" value="${escapeHtml(val)}">
                <button class="btn btn-outline-secondary" type="button" id="btnMic" title="Rekam Suara (Indonesia)">
                    <i class="bi bi-mic-fill"></i>
                </button>
            </div>
            <div class="form-text text-muted" style="font-size: 0.75rem;">
                *Gunakan pelafalan Indonesia agar akurat (A, I, U, E, O).
            </div>
        </div>

        <div class="mt-4 d-flex gap-2 btn-row">
            <button class="btn btn-outline-dark" onclick="window.handlePrev()" ${idx===0?'disabled':''}>Sebelumnya</button>
            <button class="btn btn-lupa" onclick="window.handleLupa()">Lupa</button>
            ${ idx < state.batch.length - 1 
               ? `<button class="btn btn-outline-dark ms-auto" onclick="window.handleNext()">Berikutnya</button>` 
               : `<button class="btn btn-success ms-auto" onclick="window.handleConfirm()">Kirim Tes</button>`
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

    // --- LOGIKA PEREKAM SUARA (PERBAIKAN BAHASA) ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        
        // PERUBAHAN PENTING DISINI: 
        // Menggunakan 'id-ID' (Indonesia) karena fonetiknya paling mirip Romaji Jepang.
        recognition.lang = 'id-ID'; 
        
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
            btnMic.classList.remove('btn-outline-secondary');
            btnMic.classList.add('btn-danger');
            btnMic.innerHTML = '<span class="spinner-grow spinner-grow-sm" role="status" aria-hidden="true"></span>';
        };

        recognition.onend = () => {
            btnMic.classList.remove('btn-danger');
            btnMic.classList.add('btn-outline-secondary');
            btnMic.innerHTML = '<i class="bi bi-mic-fill"></i>';
            inp.focus();
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            
            // Bersihkan hasil: 
            // 1. Lowercase
            // 2. Hapus tanda baca (titik/koma) di akhir
            let cleanText = transcript.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"");
            
            // Fix umum pengucapan Indonesia -> Romaji
            // Contoh: "simas" -> "shimasu" (Optional, bisa ditambah nanti jika perlu)
            
            inp.value = cleanText;
            window.handleInput(cleanText);
        };

        recognition.onerror = (event) => {
            console.error("Speech error:", event.error);
            btnMic.classList.remove('btn-danger');
            btnMic.classList.add('btn-outline-secondary');
            btnMic.innerHTML = '<i class="bi bi-mic-mute-fill"></i>'; 
            setTimeout(() => { btnMic.innerHTML = '<i class="bi bi-mic-fill"></i>'; }, 1500);
        };

    } else {
        btnMic.style.display = 'none';
        inp.style.borderRadius = '0.5rem'; 
    }
}

// --- 3. RENDER HASIL ---
export function renderResult(result, isQuiz, wrongIndices = []) {
    area.innerHTML = "";
    const pct = Math.round((result.score / result.total) * 100);
    const history = JSON.parse(localStorage.getItem("kanji_app_history") || "[]");
    const lastHistory = history.slice(0, 3);

    let html = `
    <div class="card shadow-sm border-0 mb-4"><div class="card-body">
      <div class="text-center mb-4">
        <h4 class="fw-bold">Hasil ${isQuiz?'Quiz':'Tes Hafalan'}</h4>
        <h1 class="display-3 fw-bold ${pct>60?'text-success':'text-danger'}">${pct}%</h1>
        <p class="text-muted">Skor: ${result.score} / ${result.total}</p>
      </div>

      <div class="d-grid gap-2 mb-4">
        <div class="row g-2">
            <div class="col-6">
                <button class="btn btn-outline-primary w-100 fw-bold" onclick="window.handleRetry()">Ulangi Semua</button>
            </div>
            <div class="col-6">
                <button class="btn btn-dark w-100 fw-bold" onclick="window.handleBack()">Menu Utama</button>
            </div>
        </div>
        
        ${wrongIndices.length > 0 ? `
            <button class="btn btn-danger btn-lg shadow-sm fw-bold mt-2" 
                    onclick="window.handleRetryWrong([${wrongIndices}])">
                <i class="bi bi-arrow-counterclockwise me-2"></i> Perbaiki ${wrongIndices.length} Soal Salah
            </button>
        ` : `
            <div class="alert alert-success text-center py-2 fw-bold"><i class="bi bi-stars me-2"></i>Sempurna! Tidak ada kesalahan.</div>
        `}
      </div>

      <div class="bg-light p-3 rounded-3 mb-4">
        <h6 class="fw-bold mb-3 small text-uppercase text-secondary"><i class="bi bi-clock-history me-2"></i>Riwayat Terakhir</h6>
        <div class="table-responsive">
            <table class="table table-sm table-borderless mb-0" style="font-size: 0.85rem;">
                ${lastHistory.map(h => `
                    <tr>
                        <td class="text-muted">${h.date.split(',')[0]}</td>
                        <td class="fw-bold">${h.type}</td>
                        <td class="text-end fw-bold ${h.percentage >= 60 ? 'text-success' : 'text-danger'}">${h.percentage}%</td>
                    </tr>
                `).join('')}
            </table>
        </div>
      </div>
    `;
    
    result.details.forEach((d, i) => {
        const color = d.isCorrect ? 'text-success' : 'text-danger';
        const label = d.isCorrect ? 'Benar' : 'Salah';
        const userTxt = isQuiz 
            ? (d.userAns === 'Lupa' ? 'Lupa' : (d.userAns ? d.userAns : '(Kosong)')) 
            : (d.userAns || '(Kosong)');
            
        html += `
        <div class="border-top py-2">
           <div class="d-flex justify-content-between">
              <strong>No ${i+1}: ${escapeHtml(d.q[KEYS.kanji])}</strong>
              <span class="${color} fw-bold small">${label}</span>
           </div>
           <div class="small text-muted">Arti: ${escapeHtml(d.realMean)} | Romaji: ${d.romTrue}</div>
           <div class="small mt-1">Jawaban Kamu: <strong>${escapeHtml(userTxt)}</strong></div>
        </div>`;
    });
    
    html += `</div></div>`;
    area.innerHTML = html;
    
    if(pct >= 60) launchConfetti();
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
    if(!document.getElementById('confetti-style')){
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.innerHTML = `@keyframes drop { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`;
        document.head.appendChild(style);
    }
}