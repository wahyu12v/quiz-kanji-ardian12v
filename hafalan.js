// --- CONFIGURATION ---
const BATCH_SIZE = 20;

// --- DOM ELEMENTS ---
const btnOpenRange = document.getElementById("daftarHafalanBtn");
const btnShowList = document.getElementById("btnShowList");
const rangeContainer = document.getElementById("rangeListDaftar");
const listContainer = document.getElementById("daftarList");

// Inisialisasi Modals secara aman
let rangeModal, listModal;
const rangeModalEl = document.getElementById("daftarRangeModal");
const listModalEl = document.getElementById("daftarHafalanModal");

if (rangeModalEl) rangeModal = new bootstrap.Modal(rangeModalEl);
if (listModalEl) listModal = new bootstrap.Modal(listModalEl);

// --- DATA ---
let RAW_DATA = [];
let SELECTED_DATA = [];

// --- HELPER: HIRAGANA KE ROMAJI ---
function hiraToRomaji(hira) {
    if (!hira) return "";
    hira = String(hira).trim().replace(/[\s、。・,\.]/g, "");
    
    const map = {
        あ:"a",い:"i",う:"u",え:"e",お:"o",か:"ka",き:"ki",く:"ku",け:"ke",こ:"ko",
        さ:"sa",し:"shi",す:"su",せ:"se",そ:"so",た:"ta",ち:"chi",つ:"tsu",て:"te",と:"to",
        な:"na",に:"ni",ぬ:"nu",ね:"ne",の:"no",は:"ha",ひ:"hi",ふ:"fu",へ:"he",ほ:"ho",
        ま:"ma",み:"mi",む:"mu",め:"me",も:"mo",や:"ya",ゆ:"yu",よ:"yo",
        ら:"ra",り:"ri",る:"ru",れ:"re",ろ:"ro",わ:"wa",を:"o",ん:"n",
        が:"ga",ぎ:"gi",ぐ:"gu",げ:"ge",ご:"go",ざ:"za",じ:"ji",ず:"zu",ぜ:"ze",ぞ:"zo",
        だ:"da",ぢ:"ji",づ:"zu",で:"de",ど:"do",ば:"ba",び:"bi",ぶ:"bu",べ:"be",ぼ:"bo",
        ぱ:"pa",ぴ:"pi",ぷ:"pu",ぺ:"pe",ぽ:"po",
        きゃ:"kya",きゅ:"kyu",きょ:"kyo",しゃ:"sha",しゅ:"shu",しょ:"sho",
        ちゃ:"cha",ちゅ:"chu",ちょ:"cho",にゃ:"nya",にゅ:"nyu",にょ:"nyo",
        ひゃ:"hya",ひゅ:"hyu",ひょ:"hyo",みゃ:"mya",みゅ:"myu",みょ:"myo",
        りゃ:"rya",りゅ:"ryu",りょ:"ryo",ぎゃ:"gya",ぎゅ:"gyu",ぎょ:"gyo",
        じゃ:"ja",じゅ:"ju",じょ:"jo",びゃ:"bya",びゅ:"byu",びょ:"byo",
        ぴゃ:"pya",ぴゅ:"pyu",ぴょ:"pyo",ふゃ:"fya",ふゅ:"fyu",ふょ:"fyo"
    };

    let out = "";
    for (let i = 0; i < hira.length; i++) {
        const two = hira.substring(i, i + 2);
        if (map[two]) { 
            out += map[two]; 
            i++; 
        } 
        else if(hira[i] === 'っ' || hira[i] === 'ッ') { 
            const next = hira[i+1]; 
            if(next){ 
                const nextRom = map[next] || map[hira.substring(i+1, i+3)] || ''; 
                if(nextRom) out += nextRom[0]; 
            }
        }
        else if(hira[i] === 'ー') { 
            const last = out.slice(-1); 
            if("aiueo".includes(last)) out += last; 
        }
        else { 
            out += map[hira[i]] || ""; 
        }
    }
    return out;
}

// --- EVENT LISTENERS ---

// 1. Buka Modal Pilih Paket
if (btnOpenRange) {
    btnOpenRange.addEventListener("click", () => {
        rangeModal.show();
        if (RAW_DATA.length === 0) loadData();
    });
}

// 2. Tombol Tampilkan List
if (btnShowList) {
    btnShowList.addEventListener("click", () => {
        const checkedBoxes = document.querySelectorAll('#rangeListDaftar input[type=checkbox]:checked');
        
        if (checkedBoxes.length === 0) {
            alert("Pilih minimal satu paket!");
            return;
        }

        // Filter Data berdasarkan Paket
        SELECTED_DATA = [];
        checkedBoxes.forEach(cb => {
            const batchIdx = parseInt(cb.value);
            const start = batchIdx * BATCH_SIZE;
            const end = Math.min((batchIdx + 1) * BATCH_SIZE, RAW_DATA.length);
            
            for (let i = start; i < end; i++) {
                if (RAW_DATA[i]) SELECTED_DATA.push(RAW_DATA[i]);
            }
        });

        // Render Langsung
        renderList(SELECTED_DATA);
        
        // Pindah Modal
        rangeModal.hide();
        listModal.show();
    });
}

// 4. Tombol Helper
const btnSelectAll = document.getElementById("btnDaftarSelectAll");
const btnReset = document.getElementById("btnDaftarReset");

if (btnSelectAll) btnSelectAll.onclick = () => document.querySelectorAll('#rangeListDaftar input[type=checkbox]').forEach(c => c.checked = true);
if (btnReset) btnReset.onclick = () => document.querySelectorAll('#rangeListDaftar input[type=checkbox]').forEach(c => c.checked = false);


// --- FUNCTIONS ---

async function loadData() {
    try {
        const res = await fetch("kanjiasli.json");
        if(!res.ok) throw new Error("Gagal fetch");
        RAW_DATA = await res.json();
        generateCheckboxes();
    } catch (e) {
        console.error(e);
        if (rangeContainer) rangeContainer.innerHTML = `<div class="text-danger p-3 text-center">Gagal memuat data kanjiasli.json</div>`;
    }
}

function generateCheckboxes() {
    if (!rangeContainer) return;
    rangeContainer.innerHTML = "";
    
    const totalBatches = Math.ceil(RAW_DATA.length / BATCH_SIZE);

    for (let i = 0; i < totalBatches; i++) {
        const start = i * BATCH_SIZE + 1;
        const end = Math.min((i + 1) * BATCH_SIZE, RAW_DATA.length);
        
        const div = document.createElement('div');
        div.className = 'form-check position-relative';
        
        div.innerHTML = `
            <input class="form-check-input" type="checkbox" value="${i}" id="d_cb_${i}">
            <label class="form-check-label w-100 stretched-link" for="d_cb_${i}">
               <strong>Paket ${i+1}</strong> <br>
               <span class="small text-muted">No ${start}-${end}</span>
            </label>`;
        rangeContainer.appendChild(div);
    }
}

function renderList(data) {
    if (!listContainer) return;
    listContainer.innerHTML = "";
    
    if (data.length === 0) {
        listContainer.innerHTML = `<div class="text-center text-muted p-5 w-100 col-12">Tidak ada data.</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    data.forEach((q) => {
        const no = q["No"] || "-";
        const kanji = q["Kanji"] || "-";
        const arti = q["Arti"] || "-";
        const hiragana = q["Hiragana"] || "-";
        const romaji = hiraToRomaji(hiragana);

        const card = document.createElement("div");
        card.className = "kanji-list-card"; 
        
        // Layout Vertikal Baru: Kanji -> Hiragana -> Romaji -> Arti
        card.innerHTML = `
          <div class="w-100 text-center">
            <div class="d-flex justify-content-between w-100 mb-1">
                <span class="badge bg-light text-muted border rounded-pill" style="font-size:10px;">#${no}</span>
            </div>
            
            <div class="kanji-display mb-1">${kanji}</div>
            
            <div class="text-primary fw-bold mb-0" style="font-size: 1.1rem;">${hiragana}</div>
            
            <div class="text-muted small fst-italic mb-2" style="font-size: 0.85rem;">${romaji}</div>
            
            <hr class="my-2 opacity-10">
            
            <div class="text-dark fw-medium text-wrap" style="line-height: 1.3;">${arti}</div>
          </div>
        `;
        fragment.appendChild(card);
    });

    listContainer.appendChild(fragment);
}