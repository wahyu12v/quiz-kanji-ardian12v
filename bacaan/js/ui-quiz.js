// ============================================================
//  ui-quiz.js — Mode Kuis dari Cerita
// ============================================================

let quizQuestions      = [];
let quizCurrent        = 0;
let quizScore          = 0;
let quizAnswered       = false;
let currentQuizStoryId = null;
let quizAutoTimer      = null;

// ─── EKSTRAK PASANGAN KANJI-FURIGANA ─────────────────────────
function extractKanjiFuriganaPairs(template) {
    const regex = /\[\[([^\|\]]+)\|([^\]]+)\]\]/g;
    const pairs = [], seen = new Set();
    let match;
    while ((match = regex.exec(template)) !== null) {
        const kanji = match[1].trim(), furigana = match[2].trim();
        if (kanji.length >= 1 && furigana.length >= 1 && !seen.has(kanji)) {
            seen.add(kanji);
            pairs.push({ kanji, furigana });
        }
    }
    return pairs;
}

// ─── BUAT SOAL ────────────────────────────────────────────────
function buildQuizQuestions(pairs) {
    if (pairs.length < 4) return [];
    const shuffled = [...pairs].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, shuffled.length));
    return selected.map(pair => {
        const others      = pairs.filter(p => p.furigana !== pair.furigana);
        const distractors = [...others].sort(() => Math.random() - 0.5).slice(0, 3).map(p => p.furigana);
        const choices     = [...distractors, pair.furigana].sort(() => Math.random() - 0.5);
        return { kanji: pair.kanji, answer: pair.furigana, choices };
    });
}

// ─── SEMBUNYIKAN / TAMPILKAN FLOATING DOCK ───────────────────
function setDockVisibility(visible) {
    const dock = document.getElementById('floating-dock');
    if (!dock) return;
    dock.style.transition     = 'opacity 0.3s ease, transform 0.3s ease';
    dock.style.opacity        = visible ? '1' : '0';
    dock.style.transform      = visible ? 'translateX(-50%)' : 'translateX(-50%) translateY(20px)';
    dock.style.pointerEvents  = visible ? 'auto' : 'none';
}

// ─── BUKA KUIS ────────────────────────────────────────────────
function openQuiz() {
    const story = getCurrentStoryData();
    if (!story) { alert('Data cerita tidak tersedia.'); return; }

    const pairs = extractKanjiFuriganaPairs(story.template || '');
    quizQuestions = buildQuizQuestions(pairs);

    if (quizQuestions.length === 0) {
        showQuizToast('Cerita ini tidak memiliki cukup kanji untuk kuis 😅');
        return;
    }

    currentQuizStoryId = story.id;
    quizCurrent  = 0;
    quizScore    = 0;
    quizAnswered = false;

    ensureQuizModal();
    renderQuizQuestion();

    const modalEl = document.getElementById('quizModal');
    const modal   = new bootstrap.Modal(modalEl);

    // Sembunyikan dock saat quiz buka
    modalEl.addEventListener('shown.bs.modal',  () => setDockVisibility(false), { once: true });
    // Tampilkan kembali dock saat quiz tutup
    modalEl.addEventListener('hidden.bs.modal', () => setDockVisibility(true),  { once: true });

    modal.show();
}

function getCurrentStoryData() {
    const combined = combinedStories[currentStoryIndex];
    if (!combined) return null;
    return longStoriesMap[combined.id] || shortStoriesMap[combined.id] || null;
}

// ─── RENDER SOAL (dengan fade-in) ────────────────────────────
function renderQuizQuestion() {
    const q    = quizQuestions[quizCurrent];
    const total = quizQuestions.length;
    const pct  = Math.round((quizCurrent / total) * 100);
    const body = document.getElementById('quiz-body');
    quizAnswered = false;

    // Fade out dulu, lalu isi konten, lalu fade in
    body.style.transition = 'opacity 0.18s ease';
    body.style.opacity    = '0';

    setTimeout(() => {
        body.innerHTML = `
            <!-- Progress -->
            <div style="margin-bottom:1.2rem;">
                <div style="display:flex; justify-content:space-between; font-size:0.8rem;
                            color:var(--text-muted); margin-bottom:6px; font-weight:600;">
                    <span>Soal ${quizCurrent + 1} / ${total}</span>
                    <span>Skor: ${quizScore}</span>
                </div>
                <div style="background:#F1F5F9; border-radius:999px; height:7px; overflow:hidden;">
                    <div id="quiz-progress-bar" style="width:${pct}%; height:100%;
                                background: linear-gradient(90deg,#0D9488,#14B8A6);
                                border-radius:999px; transition:width 0.5s ease;"></div>
                </div>
            </div>

            <!-- Pertanyaan -->
            <div style="text-align:center; margin-bottom:1.5rem;">
                <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.6rem;
                          font-weight:700; letter-spacing:0.08em; text-transform:uppercase;">
                    Apa bacaan kanji berikut?
                </p>
                <div style="
                    font-size: 3rem;
                    font-family: 'Noto Sans JP', sans-serif;
                    font-weight: 700;
                    color: var(--text-primary);
                    background: var(--bg-card-alt);
                    border: 2px solid var(--border);
                    border-radius: 16px;
                    padding: 1rem 2rem;
                    display: inline-block;
                    min-width: 140px;
                    letter-spacing: 0.05em;
                    transition: border-color 0.2s;
                ">${q.kanji}</div>
            </div>

            <!-- Pilihan Jawaban -->
            <div id="quiz-choices" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                ${q.choices.map(choice => `
                    <button class="quiz-choice-btn" data-choice="${choice}" style="
                        border: 2px solid var(--border);
                        background: var(--bg-card-alt);
                        color: var(--text-primary);
                        border-radius: 12px;
                        padding: 0.75rem 0.5rem;
                        font-size: 1rem;
                        font-family: 'Noto Sans JP', sans-serif;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.15s ease;
                        text-align: center;
                    "
                    onmouseover="if(!this.dataset.answered){this.style.borderColor='#0D9488';this.style.background='#F0FDFA';this.style.color='#0D9488';}"
                    onmouseout="if(!this.dataset.answered){this.style.borderColor='var(--border)';this.style.background='var(--bg-card-alt)';this.style.color='var(--text-primary)';}"
                    onclick="handleQuizAnswer(this, '${choice}', '${q.answer}')">
                        ${choice}
                    </button>
                `).join('')}
            </div>

            <!-- Feedback -->
            <div id="quiz-next-area" style="margin-top:1.1rem; text-align:center;
                                            opacity:0; transition:opacity 0.25s ease;">
                <div id="quiz-feedback" style="font-weight:600; font-size:0.95rem;"></div>
                <div id="quiz-progress-dots" style="margin-top:0.5rem; display:flex;
                     justify-content:center; gap:4px;"></div>
            </div>
        `;

        // Fade in
        body.style.opacity = '1';

        // Animasi progress bar muncul smooth setelah render
        requestAnimationFrame(() => {
            const bar = document.getElementById('quiz-progress-bar');
            if (bar) bar.style.width = `${pct}%`;
        });

    }, 180);
}

// ─── HANDLE JAWABAN ───────────────────────────────────────────
function handleQuizAnswer(btn, chosen, correct) {
    if (quizAnswered) return;
    quizAnswered = true;

    // Clear timer sebelumnya kalau ada
    if (quizAutoTimer) clearInterval(quizAutoTimer);

    // Warnai semua tombol
    document.querySelectorAll('.quiz-choice-btn').forEach(b => {
        b.dataset.answered = 'true';
        b.style.cursor     = 'default';
        b.onmouseover      = null;
        b.onmouseout       = null;
        b.style.transition = 'all 0.25s ease';

        if (b.dataset.choice === correct) {
            b.style.background  = 'rgba(34,197,94,0.13)';
            b.style.borderColor = '#22C55E';
            b.style.color       = '#16A34A';
        } else if (b === btn && chosen !== correct) {
            b.style.background  = 'rgba(239,68,68,0.10)';
            b.style.borderColor = '#EF4444';
            b.style.color       = '#DC2626';
        } else {
            b.style.opacity = '0.35';
        }
    });

    const isCorrect = chosen === correct;
    if (isCorrect) quizScore++;

    // Tampilkan feedback dengan fade-in
    const nextArea = document.getElementById('quiz-next-area');
    const feedbackEl = document.getElementById('quiz-feedback');

    feedbackEl.innerHTML = isCorrect
        ? `<span style="color:#16A34A;">✓ Benar!</span>`
        : `<span style="color:#DC2626;">✗ Salah —</span>
           <span style="color:var(--text-secondary);">Jawaban:
             <b style="font-family:'Noto Sans JP';">${correct}</b>
           </span>`;

    // Progress dots (timer visual)
    const dotsEl = document.getElementById('quiz-progress-dots');
    const DELAY_MS = 1400;
    const STEPS    = 7;
    if (dotsEl) {
        dotsEl.innerHTML = Array.from({ length: STEPS }, (_, i) =>
            `<div class="quiz-dot" style="
                width:7px; height:7px; border-radius:50%;
                background:#E2E8F0;
                transition: background ${DELAY_MS / STEPS}ms ease;
                transition-delay: ${(i * DELAY_MS) / STEPS}ms;
            "></div>`
        ).join('');
    }

    // Fade in feedback area
    requestAnimationFrame(() => {
        if (nextArea) nextArea.style.opacity = '1';
        // Isi dots dari kiri ke kanan
        setTimeout(() => {
            document.querySelectorAll('.quiz-dot').forEach((d, i) => {
                d.style.background = isCorrect ? '#22C55E' : '#EF4444';
            });
        }, 50);
    });

    // Auto-next setelah DELAY_MS
    quizAutoTimer = setTimeout(() => {
        nextQuizQuestion();
    }, DELAY_MS);
}

// ─── LANJUT / HASIL ───────────────────────────────────────────
function nextQuizQuestion() {
    quizCurrent++;
    if (quizCurrent < quizQuestions.length) {
        renderQuizQuestion();
    } else {
        renderQuizResult();
    }
}

// ─── HASIL AKHIR ──────────────────────────────────────────────
function renderQuizResult() {
    const total = quizQuestions.length;
    const pct   = Math.round((quizScore / total) * 100);

    let emoji = '😅', msg = 'Terus berlatih ya!', color = '#EF4444';
    if (pct >= 80)      { emoji = '🎉'; msg = 'Luar biasa!';    color = '#0D9488'; }
    else if (pct >= 60) { emoji = '👍'; msg = 'Lumayan bagus!'; color = '#F59E0B'; }
    else if (pct >= 40) { emoji = '🙂'; msg = 'Cukup baik!';   color = '#64748B'; }

    const body = document.getElementById('quiz-body');
    body.style.opacity = '0';

    setTimeout(() => {
        body.innerHTML = `
            <div style="text-align:center; padding:0.5rem 0;">
                <div style="font-size:3.5rem; margin-bottom:0.4rem;">${emoji}</div>
                <h4 style="font-weight:800; color:${color}; margin-bottom:0.2rem;">${msg}</h4>
                <p style="color:var(--text-muted); font-size:0.88rem; margin-bottom:1.25rem;">
                    Kamu menjawab benar
                </p>
                <div style="
                    width:100px; height:100px; border-radius:50%;
                    border:6px solid ${color};
                    display:inline-flex; flex-direction:column;
                    align-items:center; justify-content:center;
                    margin-bottom:1.25rem;
                    box-shadow:0 0 0 10px ${color}18;
                ">
                    <span style="font-size:1.8rem; font-weight:900; color:${color}; line-height:1;">${quizScore}</span>
                    <span style="font-size:0.72rem; color:var(--text-muted); font-weight:600;">/ ${total}</span>
                </div>
                <div style="background:var(--bg-card-alt); border:1px solid var(--border);
                            border-radius:12px; padding:0.7rem 1.2rem;
                            font-size:0.88rem; color:var(--text-secondary); margin-bottom:1.25rem;">
                    Skor: <b style="color:${color};">${pct}%</b> &nbsp;•&nbsp;
                    Benar: <b style="color:#16A34A;">${quizScore}</b> &nbsp;•&nbsp;
                    Salah: <b style="color:#DC2626;">${total - quizScore}</b>
                </div>
                <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                    <button onclick="openQuiz()" style="
                        background:linear-gradient(135deg,#0D9488,#14B8A6);
                        color:#fff; border:none; border-radius:999px;
                        padding:0.6rem 1.5rem; font-weight:700; cursor:pointer;
                        box-shadow:0 4px 14px rgba(13,148,136,0.3); font-size:0.88rem;
                    ">🔄 Ulangi Kuis</button>
                    <button onclick="bootstrap.Modal.getInstance(document.getElementById('quizModal')).hide()" style="
                        background:var(--bg-card-alt); color:var(--text-secondary);
                        border:1.5px solid var(--border); border-radius:999px;
                        padding:0.6rem 1.5rem; font-weight:600; cursor:pointer; font-size:0.88rem;
                    ">Tutup</button>
                </div>
            </div>
        `;
        body.style.opacity = '1';
    }, 180);
}

// ─── MODAL KUIS ───────────────────────────────────────────────
function ensureQuizModal() {
    if (document.getElementById('quizModal')) return;
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id        = 'quizModal';
    modal.tabIndex  = -1;
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width:480px;">
            <div class="modal-content" style="border-radius:24px!important; overflow:hidden;">
                <div class="modal-header px-4 pt-4 pb-3" style="border-bottom:1px solid var(--border);">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div style="
                            width:38px; height:38px; border-radius:10px;
                            background:linear-gradient(135deg,#0D9488,#14B8A6);
                            display:flex; align-items:center; justify-content:center;
                            color:#fff; font-size:1.1rem;
                            box-shadow:0 4px 10px rgba(13,148,136,0.3);
                        "><i class="bi bi-patch-question-fill"></i></div>
                        <h5 class="modal-title fw-bold mb-0">Mode Kuis</h5>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body p-4" id="quiz-body"></div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ─── TOAST ────────────────────────────────────────────────────
function showQuizToast(msg) {
    let t = document.getElementById('quiz-toast');
    if (!t) {
        t = document.createElement('div');
        t.id = 'quiz-toast';
        t.style.cssText = `
            position:fixed; bottom:120px; left:50%; transform:translateX(-50%);
            background:#1E293B; color:#fff; border-radius:12px;
            padding:0.6rem 1.2rem; font-size:0.85rem; font-weight:500;
            z-index:99999; opacity:0; transition:opacity 0.3s;
            white-space:nowrap; pointer-events:none;
        `;
        document.body.appendChild(t);
    }
    t.innerText = msg;
    t.style.opacity = '1';
    setTimeout(() => { t.style.opacity = '0'; }, 2500);
}