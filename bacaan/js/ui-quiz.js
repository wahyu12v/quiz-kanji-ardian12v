// ============================================================
//  ui-quiz.js — Mode Kuis dari Cerita
//  Soal otomatis dari [[kanji|furigana]] di template JSON
// ============================================================

let quizQuestions   = [];
let quizCurrent     = 0;
let quizScore       = 0;
let quizAnswered    = false;
let currentQuizStoryId = null;

// ─── EKSTRAK PASANGAN KANJI-FURIGANA DARI TEMPLATE ───────────
function extractKanjiFuriganaPairs(template) {
    const regex = /\[\[([^\|\]]+)\|([^\]]+)\]\]/g;
    const pairs = [];
    const seen  = new Set();
    let match;
    while ((match = regex.exec(template)) !== null) {
        const kanji    = match[1].trim();
        const furigana = match[2].trim();
        // Filter: skip yang terlalu pendek / tidak menarik untuk soal
        if (kanji.length >= 1 && furigana.length >= 1 && !seen.has(kanji)) {
            seen.add(kanji);
            pairs.push({ kanji, furigana });
        }
    }
    return pairs;
}

// ─── BUAT SOAL (shuffle + max 10) ────────────────────────────
function buildQuizQuestions(pairs) {
    // Kita butuh minimal 4 pasang agar bisa bikin pilihan ganda
    if (pairs.length < 4) return [];

    // Shuffle
    const shuffled = [...pairs].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, Math.min(10, shuffled.length));

    return selected.map(pair => {
        // 3 distraktor furigana acak dari pasang lain
        const others   = pairs.filter(p => p.furigana !== pair.furigana);
        const distractors = [...others]
            .sort(() => Math.random() - 0.5)
            .slice(0, 3)
            .map(p => p.furigana);

        const choices = [...distractors, pair.furigana].sort(() => Math.random() - 0.5);
        return { kanji: pair.kanji, answer: pair.furigana, choices };
    });
}

// ─── BUKA KUIS ────────────────────────────────────────────────
function openQuiz() {
    // Ambil story yang sedang dibaca
    const story = getCurrentStoryData();
    if (!story) { alert("Data cerita tidak tersedia."); return; }

    const pairs = extractKanjiFuriganaPairs(story.template || "");
    quizQuestions = buildQuizQuestions(pairs);

    if (quizQuestions.length === 0) {
        showQuizToast("Cerita ini tidak memiliki cukup kanji untuk kuis 😅");
        return;
    }

    currentQuizStoryId = story.id;
    quizCurrent = 0;
    quizScore   = 0;
    quizAnswered = false;

    ensureQuizModal();
    renderQuizQuestion();

    const modal = new bootstrap.Modal(document.getElementById('quizModal'));
    modal.show();
}

// Ambil data story yang sedang aktif di reader
function getCurrentStoryData() {
    const combined = combinedStories[currentStoryIndex];
    if (!combined) return null;
    // Coba ambil dari versi panjang dulu, lalu singkat
    return longStoriesMap[combined.id] || shortStoriesMap[combined.id] || null;
}

// ─── RENDER SOAL ──────────────────────────────────────────────
function renderQuizQuestion() {
    const q       = quizQuestions[quizCurrent];
    const total   = quizQuestions.length;
    const pct     = Math.round((quizCurrent / total) * 100);
    const body    = document.getElementById('quiz-body');
    quizAnswered  = false;

    body.innerHTML = `
        <!-- Progress -->
        <div style="margin-bottom:1.2rem;">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem;
                        color:var(--text-muted); margin-bottom:6px; font-weight:600;">
                <span>Soal ${quizCurrent + 1} / ${total}</span>
                <span>Skor: ${quizScore}</span>
            </div>
            <div style="background:#F1F5F9; border-radius:999px; height:7px; overflow:hidden;">
                <div style="width:${pct}%; height:100%;
                            background: linear-gradient(90deg,#0D9488,#14B8A6);
                            border-radius:999px; transition:width 0.4s ease;"></div>
            </div>
        </div>

        <!-- Pertanyaan -->
        <div style="text-align:center; margin-bottom:1.5rem;">
            <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.5rem;
                      font-weight:600; letter-spacing:0.05em; text-transform:uppercase;">
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
            ">${q.kanji}</div>
        </div>

        <!-- Pilihan Jawaban -->
        <div id="quiz-choices" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            ${q.choices.map((choice, i) => `
                <button class="quiz-choice-btn" data-choice="${choice}"
                    style="
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

        <!-- Feedback auto-next -->
        <div id="quiz-next-area" style="margin-top:1.2rem; text-align:center; display:none;">
            <div id="quiz-feedback" style="font-weight:600; font-size:0.95rem;"></div>
            <div id="quiz-countdown" style="margin-top:0.5rem; font-size:0.78rem; color:var(--text-muted);"></div>
        </div>
    `;
}

// ─── HANDLE JAWABAN ───────────────────────────────────────────
function handleQuizAnswer(btn, chosen, correct) {
    if (quizAnswered) return;
    quizAnswered = true;

    // Disable semua tombol
    document.querySelectorAll('.quiz-choice-btn').forEach(b => {
        b.dataset.answered = "true";
        b.style.cursor     = "default";
        b.onmouseover      = null;
        b.onmouseout       = null;

        if (b.dataset.choice === correct) {
            // Jawaban benar → hijau
            b.style.background   = 'rgba(34,197,94,0.12)';
            b.style.borderColor  = '#22C55E';
            b.style.color        = '#16A34A';
        } else if (b === btn && chosen !== correct) {
            // Pilihan salah → merah
            b.style.background   = 'rgba(239,68,68,0.10)';
            b.style.borderColor  = '#EF4444';
            b.style.color        = '#DC2626';
        } else {
            b.style.opacity = '0.45';
        }
    });

    const isCorrect = chosen === correct;
    if (isCorrect) quizScore++;

    const feedbackEl = document.getElementById('quiz-feedback');
    feedbackEl.innerHTML = isCorrect
        ? `<span style="color:#16A34A;">✓ Benar!</span>`
        : `<span style="color:#DC2626;">✗ Salah —</span> <span style="color:var(--text-secondary);">Jawaban: <b style="font-family:'Noto Sans JP';">${correct}</b></span>`;

    document.getElementById('quiz-next-area').style.display = 'block';

    // Auto-next setelah 1.2 detik
    let countdown = 1;
    const countEl = document.getElementById('quiz-countdown');
    const timer = setInterval(() => {
        if (countEl) countEl.innerText = `Lanjut dalam ${countdown}...`;
        countdown--;
        if (countdown < 0) {
            clearInterval(timer);
            nextQuizQuestion();
        }
    }, 600);
}

// ─── LANJUT SOAL BERIKUTNYA / TAMPILKAN HASIL ─────────────────
function nextQuizQuestion() {
    quizCurrent++;
    if (quizCurrent < quizQuestions.length) {
        renderQuizQuestion();
    } else {
        renderQuizResult();
    }
}

// ─── TAMPILKAN HASIL AKHIR ────────────────────────────────────
function renderQuizResult() {
    const total  = quizQuestions.length;
    const pct    = Math.round((quizScore / total) * 100);

    let emoji = '😅', msg = 'Terus berlatih ya!', color = '#EF4444';
    if (pct >= 80)      { emoji = '🎉'; msg = 'Luar biasa!';     color = '#0D9488'; }
    else if (pct >= 60) { emoji = '👍'; msg = 'Lumayan bagus!';  color = '#F59E0B'; }
    else if (pct >= 40) { emoji = '🙂'; msg = 'Cukup baik!';    color = '#64748B'; }

    document.getElementById('quiz-body').innerHTML = `
        <div style="text-align:center; padding: 1rem 0;">
            <div style="font-size:3.5rem; margin-bottom:0.5rem;">${emoji}</div>
            <h4 style="font-weight:800; color:${color}; margin-bottom:0.25rem;">${msg}</h4>
            <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1.5rem;">
                Kamu menjawab benar
            </p>

            <!-- Lingkaran skor besar -->
            <div style="
                width: 110px; height: 110px;
                border-radius: 50%;
                border: 6px solid ${color};
                display: inline-flex; flex-direction:column;
                align-items: center; justify-content: center;
                margin-bottom: 1.5rem;
                box-shadow: 0 0 0 12px ${color}18;
            ">
                <span style="font-size:1.9rem; font-weight:900; color:${color}; line-height:1;">${quizScore}</span>
                <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">/ ${total}</span>
            </div>

            <div style="
                background: var(--bg-card-alt); border: 1px solid var(--border);
                border-radius: 12px; padding: 0.75rem 1.25rem;
                font-size: 0.9rem; color: var(--text-secondary);
                margin-bottom: 1.5rem;
            ">
                Skor: <b style="color:${color};">${pct}%</b> &nbsp;•&nbsp;
                Benar: <b style="color:#16A34A;">${quizScore}</b> &nbsp;•&nbsp;
                Salah: <b style="color:#DC2626;">${total - quizScore}</b>
            </div>

            <!-- Tombol aksi -->
            <div style="display:flex; gap:10px; justify-content:center; flex-wrap:wrap;">
                <button onclick="openQuiz()" style="
                    background: linear-gradient(135deg,#0D9488,#14B8A6);
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
}

// ─── BUAT MODAL KUIS (inject sekali ke DOM) ───────────────────
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
                <div class="modal-body p-4" id="quiz-body">
                    <!-- Soal dirender di sini -->
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// ─── TOAST NOTIF KECIL ────────────────────────────────────────
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