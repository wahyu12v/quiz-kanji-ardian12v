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