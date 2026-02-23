// Simpan status aplikasi di sini agar bisa diakses semua file
let combinedStories = []; 
let shortStoriesMap = {}; 
let longStoriesMap = {};  

let filteredStories = [];       
let currentCategory = 'Semua';
let currentSearchQuery = ''; 

let currentStoryIndex = 0; 
let activeUtterance = null; 
let tempSelectedId = null;  

const itemsPerPage = 6; 
let currentPage = 1;

// --- PROGRESS TRACKER ---
// Load dari localStorage, simpan sebagai Set ID cerita yang sudah dibaca
let readStories = new Set(JSON.parse(localStorage.getItem('readStories') || '[]'));

function markAsRead(id) {
    readStories.add(String(id));
    localStorage.setItem('readStories', JSON.stringify([...readStories]));
}

function isRead(id) {
    return readStories.has(String(id));
}

function confirmResetProgress() {
    // Mini confirm toast — tidak pakai alert() bawaan browser
    let overlay = document.getElementById('reset-confirm-overlay');
    if (overlay) return; // Sudah terbuka

    overlay = document.createElement('div');
    overlay.id = 'reset-confirm-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 99999;
        display: flex; align-items: center; justify-content: center;
        background: rgba(30,41,59,0.45);
        backdrop-filter: blur(4px);
        animation: fadeInOverlay 0.2s ease;
    `;
    overlay.innerHTML = `
        <div style="
            background: #fff; border-radius: 20px;
            padding: 1.75rem 1.5rem; max-width: 320px; width: 90%;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            animation: popIn 0.2s ease;
        ">
            <div style="font-size:2.2rem; margin-bottom:0.5rem;">🗑️</div>
            <h5 style="font-weight:700; margin-bottom:0.4rem; color:#1E293B;">Reset Progress?</h5>
            <p style="font-size:0.88rem; color:#64748B; margin-bottom:1.25rem; line-height:1.5;">
                Semua tanda <b>sudah dibaca</b> akan dihapus.<br>Tindakan ini tidak bisa dibatalkan.
            </p>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button onclick="doResetProgress()" style="
                    background: #EF4444; color:#fff; border:none;
                    border-radius:999px; padding:0.55rem 1.5rem;
                    font-weight:700; cursor:pointer; font-size:0.88rem;
                    transition: opacity 0.15s;
                " onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">
                    Ya, Reset
                </button>
                <button onclick="document.getElementById('reset-confirm-overlay').remove()" style="
                    background:#F1F5F9; color:#64748B;
                    border:1.5px solid #E2E8F0; border-radius:999px;
                    padding:0.55rem 1.5rem; font-weight:600;
                    cursor:pointer; font-size:0.88rem;
                ">Batal</button>
            </div>
        </div>
        <style>
            @keyframes fadeInOverlay { from{opacity:0} to{opacity:1} }
            @keyframes popIn { from{transform:scale(0.92);opacity:0} to{transform:scale(1);opacity:1} }
        </style>
    `;
    document.body.appendChild(overlay);
}

function doResetProgress() {
    readStories = new Set();
    localStorage.removeItem('readStories');
    document.getElementById('reset-confirm-overlay').remove();
    renderStories(); // Refresh grid + progress bar
}