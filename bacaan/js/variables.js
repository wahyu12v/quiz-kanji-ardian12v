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