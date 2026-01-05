// --- FETCH DATA ---
function fetchAllData() {
    const spinner = document.getElementById("loading-spinner");
    Promise.all([
        fetch('data.json').then(res => res.json()),           
        fetch('bacaanlengkap.json').then(res => res.json())   
    ]).then(([dataSingkat, dataPanjang]) => {
        
        shortStoriesMap = {};
        dataSingkat.forEach(s => shortStoriesMap[s.id] = s);

        longStoriesMap = {};
        dataPanjang.forEach(s => longStoriesMap[s.id] = s);

        const allIds = new Set([...dataSingkat.map(s => s.id), ...dataPanjang.map(s => s.id)]);
        combinedStories = [];

        allIds.forEach(id => {
            const shortVer = shortStoriesMap[id];
            const longVer = longStoriesMap[id];
            
            if(shortVer || longVer) {
                const displayData = shortVer ? shortVer : longVer; 
                combinedStories.push({
                    id: id,
                    title: displayData.title,
                    category: displayData.category,
                    icon: displayData.icon,
                    color: displayData.color,
                    hasShort: !!shortVer,
                    hasLong: !!longVer
                });
            }
        });

        combinedStories.sort((a, b) => a.id - b.id);
        filteredStories = combinedStories;
        
        setupCategories();
        renderStories(); 
        
        if (spinner) spinner.style.display = 'none';
    }).catch(err => {
        console.error(err);
        if (spinner) spinner.innerHTML = `<div class="alert alert-danger">Gagal memuat data JSON. Cek console.</div>`;
    });
}

// --- FUNGSI FILTER UTAMA ---
function applyFilters() {
    currentPage = 1; 
    let result = combinedStories;

    if (currentCategory !== "Semua") {
        result = result.filter(story => (story.category || "Lainnya") === currentCategory);
    }

    if (currentSearchQuery.trim() !== "") {
        result = result.filter(story => 
            story.title.toLowerCase().includes(currentSearchQuery)
        );
    }

    filteredStories = result;
    renderStories();
}