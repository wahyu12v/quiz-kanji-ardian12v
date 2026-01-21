// --- RENDER DAFTAR CERITA (HOME) ---
function renderStories() {
    const gridContainer = document.getElementById("story-grid");
    const paginationContainer = document.getElementById("pagination-container");
    if (!gridContainer) return;
    gridContainer.innerHTML = "";
    
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedItems = filteredStories.slice(start, end);
    
    gridContainer.style.opacity = '0';
    setTimeout(() => { gridContainer.style.opacity = '1'; }, 50);
    if (paginatedItems.length === 0) {
    gridContainer.innerHTML = `
        <div class="col-12 text-center py-5" style="color: #fff;">
            <i class="fas fa-search mb-3" style="font-size: 2rem; color: #fff; opacity: 0.6;"></i><br>
            Tidak ada cerita yang cocok.
        </div>
    `;
    paginationContainer.innerHTML = "";
    return;
}


    paginatedItems.forEach(story => {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4 d-flex align-items-stretch";
        col.style.transition = "all 0.3s ease";
        
        col.innerHTML = `
            <div class="story-card w-100">
                <div class="card-icon-wrapper" style="background: ${story.color}">
                    <i class="${story.icon}"></i>
                </div>
                <div class="card-body-custom text-center">
                    <h5 class="card-title story-title">${story.title}</h5>
                    <span class="badge rounded-pill bg-light text-dark mt-2" style="font-weight:normal; font-size:0.7rem; border:1px solid #eee;">
                        ${story.category || 'Lainnya'}
                    </span>
                    </div>
            </div>`;
        
        col.querySelector('.story-card').addEventListener('click', () => showVersionChoiceModal(story));
        gridContainer.appendChild(col);
    });

    setupPagination(filteredStories.length, paginationContainer);
}

function setupPagination(totalItems, container) {
    if(!container) return;
    container.innerHTML = "";
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const prevBtn = document.createElement("button");
    prevBtn.className = "page-nav-btn";
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { if (currentPage > 1) { currentPage--; renderStories(); window.scrollTo({ top: 0, behavior: 'smooth' }); }};
    container.appendChild(prevBtn);

    const pageInfo = document.createElement("span");
    pageInfo.className = "fw-bold text-white mx-2";
    pageInfo.style.fontSize = "0.9rem";
    pageInfo.innerText = `Halaman ${currentPage} / ${totalPages}`;
    container.appendChild(pageInfo);

    const nextBtn = document.createElement("button");
    nextBtn.className = "page-nav-btn";
    nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { if (currentPage < totalPages) { currentPage++; renderStories(); window.scrollTo({ top: 0, behavior: 'smooth' }); }};
    container.appendChild(nextBtn);
}

function setupCategories() {
    const container = document.getElementById("modal-category-list");
    if(!container) return;
    container.innerHTML = "";

    const categories = new Set();
    combinedStories.forEach(story => {
        if(story.category) categories.add(story.category);
        else categories.add("Lainnya");
    });

    const categoryList = ["Semua", ...Array.from(categories)];

    categoryList.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = `cat-modal-btn ${cat === currentCategory ? 'active' : ''}`;
        const checkIcon = cat === currentCategory ? '' : '';
        btn.innerHTML = `<span>${cat}</span> ${checkIcon}`;
        
        btn.addEventListener("click", () => {
            currentCategory = cat;
            const mainBtnText = document.querySelector("#btn-filter-category span");
            if(mainBtnText) mainBtnText.innerText = `Kategori: ${cat}`;
            applyFilters();
            setupCategories(); 
            const modalEl = document.getElementById('categoryModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if(modalInstance) modalInstance.hide();
        });

        container.appendChild(btn);
    });
}