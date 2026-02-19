// --- RENDER DAFTAR CERITA (HOME) ---
function renderStories() {
    const gridContainer      = document.getElementById("story-grid");
    const paginationContainer = document.getElementById("pagination-container");
    if (!gridContainer) return;

    gridContainer.innerHTML = "";

    const start = (currentPage - 1) * itemsPerPage;
    const end   = start + itemsPerPage;
    const paginatedItems = filteredStories.slice(start, end);

    // Animasi fade
    gridContainer.style.opacity = '0';
    setTimeout(() => { gridContainer.style.opacity = '1'; gridContainer.style.transition = 'opacity 0.3s'; }, 50);

    // Empty state
    if (paginatedItems.length === 0) {
        gridContainer.innerHTML = `
            <div class="col-12 text-center py-5 empty-state">
                <i class="bi bi-search mb-3 d-block" style="font-size:2.5rem;"></i>
                <p class="mb-0">Tidak ada cerita yang cocok.</p>
            </div>`;
        if (paginationContainer) paginationContainer.innerHTML = "";
        return;
    }

    paginatedItems.forEach(story => {
        const col = document.createElement("div");
        col.className = "col-md-6 col-lg-4 d-flex align-items-stretch";

        col.innerHTML = `
            <div class="story-card w-100">
                <div class="card-icon-wrapper">
                    <i class="${story.icon}"></i>
                </div>
                <div class="card-body-custom">
                    <h5 class="card-title story-title">${story.title}</h5>
                    <span class="badge-category">${story.category || 'Lainnya'}</span>
                </div>
            </div>`;

        col.querySelector('.story-card').addEventListener('click', () => showVersionChoiceModal(story));
        gridContainer.appendChild(col);
    });

    setupPagination(filteredStories.length, paginationContainer);
}

function setupPagination(totalItems, container) {
    if (!container) return;
    container.innerHTML = "";

    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return;

    const prevBtn = document.createElement("button");
    prevBtn.className = "page-nav-btn";
    prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
    prevBtn.disabled  = currentPage === 1;
    prevBtn.onclick   = () => {
        if (currentPage > 1) { currentPage--; renderStories(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    };
    container.appendChild(prevBtn);

    const pageInfo = document.createElement("span");
    pageInfo.className = "page-info-text";
    pageInfo.innerText = `Halaman ${currentPage} / ${totalPages}`;
    container.appendChild(pageInfo);

    const nextBtn = document.createElement("button");
    nextBtn.className = "page-nav-btn";
    nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
    nextBtn.disabled  = currentPage === totalPages;
    nextBtn.onclick   = () => {
        if (currentPage < totalPages) { currentPage++; renderStories(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    };
    container.appendChild(nextBtn);
}

function setupCategories() {
    const container = document.getElementById("modal-category-list");
    if (!container) return;
    container.innerHTML = "";

    const categories = new Set();
    combinedStories.forEach(story => categories.add(story.category || "Lainnya"));
    const categoryList = ["Semua", ...Array.from(categories)];

    categoryList.forEach(cat => {
        const btn = document.createElement("button");
        btn.className = `cat-modal-btn ${cat === currentCategory ? 'active' : ''}`;
        btn.innerHTML = `<span>${cat}</span>`;

        btn.addEventListener("click", () => {
            currentCategory = cat;
            const mainBtnText = document.querySelector("#btn-filter-category span");
            if (mainBtnText) mainBtnText.innerText = `Kategori: ${cat}`;
            applyFilters();
            setupCategories();
            const modalEl = document.getElementById('categoryModal');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) modalInstance.hide();
        });

        container.appendChild(btn);
    });
}