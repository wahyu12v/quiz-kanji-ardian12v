// --- CONFIGURATION ---
const BATCH_SIZE = 20; // Pastikan ini sama dengan main.js

// --- DOM ELEMENTS ---
const btnOpenRange = document.getElementById("daftarHafalanBtn");
const btnShowList = document.getElementById("btnShowList");
const rangeContainer = document.getElementById("rangeListDaftar");
const listContainer = document.getElementById("daftarList");
const searchInput = document.getElementById("searchHafalan");

// Inisialisasi Modals
// Pastikan elemen ada sebelum di-init untuk mencegah error di console
let rangeModal, listModal;
const rangeModalEl = document.getElementById("daftarRangeModal");
const listModalEl = document.getElementById("daftarHafalanModal");

if (rangeModalEl) rangeModal = new bootstrap.Modal(rangeModalEl);
if (listModalEl) listModal = new bootstrap.Modal(listModalEl);

// --- DATA STORAGE ---
let RAW_DATA = [];       // Menyimpan seluruh data JSON
let SELECTED_DATA = [];  // Menyimpan data yang sudah difilter berdasarkan paket

// --- EVENT LISTENERS ---

// 1. Klik Tombol "Daftar" -> Buka Modal Range
if (btnOpenRange) {
    btnOpenRange.addEventListener("click", () => {
        rangeModal.show();
        // Load data hanya jika belum pernah di-load
        if (RAW_DATA.length === 0) {
            loadData();
        }
    });
}

// 2. Klik Tombol "Tampilkan" -> Filter Data & Buka List
if (btnShowList) {
    btnShowList.addEventListener("click", () => {
        // Ambil semua checkbox yang dicentang
        const checkedBoxes = document.querySelectorAll('#rangeListDaftar input[type=checkbox]:checked');
        
        if (checkedBoxes.length === 0) {
            alert("Silakan pilih minimal satu paket hafalan!");
            return;
        }

        // Kumpulkan data berdasarkan paket yang dipilih
        SELECTED_DATA = [];
        checkedBoxes.forEach(cb => {
            const batchIdx = parseInt(cb.value);
            const start = batchIdx * BATCH_SIZE;
            const end = Math.min((batchIdx + 1) * BATCH_SIZE, RAW_DATA.length);
            
            // Masukkan data ke array selected
            for (let i = start; i < end; i++) {
                if (RAW_DATA[i]) SELECTED_DATA.push(RAW_DATA[i]);
            }
        });

        // Reset pencarian & Render tampilan
        if (searchInput) searchInput.value = ""; 
        renderList(SELECTED_DATA);
        
        // Pindah dari Modal Range ke Modal List
        rangeModal.hide();
        listModal.show();
    });
}

// 3. Fitur Pencarian (Real-time)
if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        
        // Filter dari data yang sudah dipilih (SELECTED_DATA)
        const filtered = SELECTED_DATA.filter(q => {
            const kanji = (q["Kanji"] || "").toLowerCase();
            const arti = (q["Arti"] || "").toLowerCase();
            const hiragana = (q["Hiragana"] || "").toLowerCase();
            return kanji.includes(term) || arti.includes(term) || hiragana.includes(term);
        });
        
        renderList(filtered);
    });
}

// 4. Tombol Helper (Select All / Reset)
const btnSelectAll = document.getElementById("btnDaftarSelectAll");
const btnReset = document.getElementById("btnDaftarReset");

if (btnSelectAll) {
    btnSelectAll.onclick = () => {
        document.querySelectorAll('#rangeListDaftar input[type=checkbox]').forEach(c => c.checked = true);
    };
}
if (btnReset) {
    btnReset.onclick = () => {
        document.querySelectorAll('#rangeListDaftar input[type=checkbox]').forEach(c => c.checked = false);
    };
}


// --- FUNCTIONS ---

// Load data dari JSON
async function loadData() {
    try {
        const res = await fetch("questions.json");
        if (!res.ok) throw new Error("File not found");
        RAW_DATA = await res.json();
        generateCheckboxes();
    } catch (e) {
        console.error("Error loading questions.json", e);
        if (rangeContainer) {
            rangeContainer.innerHTML = `<div class="text-danger p-3 text-center">Gagal memuat data. Pastikan file questions.json tersedia.</div>`;
        }
    }
}

// Generate Checkbox dengan Style Grid Kartu
function generateCheckboxes() {
    if (!rangeContainer) return;
    rangeContainer.innerHTML = "";
    
    const totalBatches = Math.ceil(RAW_DATA.length / BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE + 1;
        const end = Math.min((i + 1) * BATCH_SIZE, RAW_DATA.length);
        
        const div = document.createElement('div');
        div.className = 'form-check position-relative'; // Penting: position-relative agar stretched-link aman
        
        div.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${i}" id="d_cb_${i}">
            <label class="form-check-label w-100 stretched-link" for="d_cb_${i}">
               <strong>Paket ${i+1}</strong> <br>
               <span class="small text-muted">No ${start}-${end}</span>
            </label>
        `;
        rangeContainer.appendChild(div);
    }
}

// Render Daftar Kanji menjadi Grid Kartu Cantik
function renderList(data) {
    if (!listContainer) return;
    listContainer.innerHTML = "";
    
    if (data.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center text-muted p-5 w-100 col-12">
                <i class="bi bi-search fs-1 mb-2 d-block opacity-50"></i>
                Tidak ada data yang cocok.
            </div>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    data.forEach((q, index) => {
        // Fallback value jika data kosong
        const no = q["No"] || "-";
        const kanji = q["Kanji"] || "-";
        const arti = q["Arti"] || "-";
        const hiragana = q["Hiragana"] || "-";
        const level = q["Level"] ? q["Level"].replace('JLPT', '').trim() : "";

        const card = document.createElement("div");
        card.className = "kanji-list-card"; // Menggunakan style CSS baru
        
        card.innerHTML = `
          <div class="kanji-avatar">${kanji}</div>
          <div class="flex-grow-1">
            <div class="d-flex justify-content-between align-items-start">
                <div class="kanji-info-title">${hiragana}</div>
                <span class="badge bg-light text-muted border rounded-pill" style="font-weight:500; font-size:10px;">#${no}</span>
            </div>
            <div class="kanji-info-sub text-dark fw-medium text-wrap">${arti}</div>
            ${level ? `<span class="badge bg-info-subtle text-info border border-info-subtle rounded-1 mt-1" style="font-size:9px;">${level}</span>` : ''}
          </div>
        `;
        fragment.appendChild(card);
    });

    listContainer.appendChild(fragment);
}