import { escapeHtml } from './utils.js';
import { KEYS, SELECTORS } from './constants.js';

const area = document.getElementById(SELECTORS.quizArea);

// --- RENDER QUIZ (PILIHAN GANDA) ---
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

// --- RENDER MEM (HAFALAN) ---
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
            <label class="small text-muted">Ketik Romaji (contoh: 'watashi'):</label>
            <input type="text" id="memInput" class="form-control form-control-lg" autocomplete="off" value="${escapeHtml(val)}">
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
    inp.focus();
    inp.oninput = (e) => window.handleInput(e.target.value);
    inp.onkeydown = (e) => { if(e.key === 'Enter') window.handleNextOrSubmit(); };
}

// --- RENDER HASIL ---
export function renderResult(result, isQuiz) {
    area.innerHTML = "";
    const pct = Math.round((result.score / result.total) * 100);
    
    let html = `
    <div class="card shadow-sm"><div class="card-body">
      <div class="text-center mb-4">
        <h4>Hasil ${isQuiz?'Quiz':'Tes Hafalan'}</h4>
        <h1 class="display-4 fw-bold ${pct>60?'text-success':'text-danger'}">${pct}%</h1>
        <p class="text-muted">Skor: ${result.score} / ${result.total}</p>
      </div>
      <div class="d-flex justify-content-center gap-2 mb-4">
        <button class="btn btn-outline-primary" onclick="window.handleRetry()">Ulangi Sesi Ini</button>
        <button class="btn btn-dark" onclick="window.handleBack()">Kembali ke Menu</button>
      </div>
    `;
    
    result.details.forEach((d, i) => {
        const color = d.isCorrect ? 'text-success' : 'text-danger';
        const label = d.isCorrect ? 'Benar' : 'Salah';
        const userTxt = isQuiz 
            ? (d.userAns === 'Lupa' ? 'Lupa' : (d.userAns ? d.userAns.meaning : '(Kosong)')) 
            : (d.userAns || '(Kosong)');
            
        html += `
        <div class="border-top py-2">
           <div class="d-flex justify-content-between">
              <strong>No ${i+1}: ${escapeHtml(d.q[KEYS.kanji])}</strong>
              <span class="${color} fw-bold small">${label}</span>
           </div>
           <div class="small text-muted">Arti: ${escapeHtml(d.realMean)} | Romaji: ${d.romTrue}</div>
           <div class="small mt-1">Jawab: <strong>${escapeHtml(userTxt)}</strong></div>
        </div>`;
    });
    
    html += `</div></div>`;
    area.innerHTML = html;
    
    if(pct >= 60) launchConfetti();
}

function launchConfetti() {
    const wrap = document.getElementById(SELECTORS.confetti);
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
    // Simple inline style injection for animation if keyframes missing
    if(!document.getElementById('confetti-style')){
        const style = document.createElement('style');
        style.id = 'confetti-style';
        style.innerHTML = `@keyframes drop { to { transform: translateY(110vh) rotate(720deg); opacity: 0; } }`;
        document.head.appendChild(style);
    }
}