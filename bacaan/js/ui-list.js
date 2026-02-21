// --- RENDER PROGRESS BAR ---
function renderProgressBar() {
    const total = combinedStories.length;
    const done  = combinedStories.filter(s => isRead(s.id)).length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

    let bar = document.getElementById("progress-tracker");
    if (!bar) {
        bar = document.createElement("div");
        bar.id = "progress-tracker";
        bar.style.cssText = `
            margin-bottom: 1.5rem;
            background: var(--bg-card, #fff);
            border-radius: 16px;
            padding: 1rem 1.25rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            border: 1px solid var(--border, #e5e7eb);
        `;
        const grid = document.getElementById("story-grid");
        grid.parentNode.insertBefore(bar, grid);
    }

    bar.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <span style="font-weight:600; font-size:0.9rem; color:var(--text-primary);">
                <i class="bi bi-journal-check me-1" style="color:#0D9488;"></i> Progress Membaca
            </span>
            <span style="font-size:0.85rem; color:var(--text-muted);">
                <b style="color:#0D9488;">${done}</b> / ${total} cerita
            </span>
        </div>
        <div style="background: var(--bg-card-alt, #f3f4f6); border-radius:999px; height:10px; overflow:hidden;">
            <div style="
                width: ${pct}%;
                height: 100%;
                background: linear-gradient(90deg, #0D9488, #14b8a6);
                border-radius: 999px;
                transition: width 0.5s ease;
            "></div>
        </div>
        <div style="text-align:right; font-size:0.78rem; color:var(--text-muted); margin-top:0.3rem;">${pct}% selesai</div>
    `;
}

// --- RENDER DAFTAR CERITA (HOME) ---
function renderStories() {
    const gridContainer       = document.getElementById("story-grid");
    const paginationContainer = document.getElementById("pagination-container");
    if (!gridContainer) return;

    gridContainer.innerHTML = "";

    // Render progress bar
    renderProgressBar();

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
        const read = isRead(story.id);
        const col  = document.createElement("div");
        col.className = "col-md-6 col-lg-4 d-flex align-items-stretch";

        col.innerHTML = `
            <div class="story-card w-100" style="position:relative;">

                ${read ? `
                <div style="
                    position: absolute; top: 12px; right: 12px; z-index: 2;
                    background: #0D9488; color: #fff;
                    border-radius: 999px;
                    width: 26px; height: 26px;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 0.8rem;
                    box-shadow: 0 2px 6px rgba(13,148,136,0.35);
                ">
                    <i class="bi bi-check-lg"></i>
                </div>` : ''}

                <div class="card-icon-wrapper" style="${read ? 'opacity:0.7;' : ''}">
                    <i class="${story.icon}"></i>
                </div>
                <div class="card-body-custom">
                    <h5 class="card-title story-title" style="${read ? 'color:var(--text-muted);' : ''}">${story.title}</h5>
                    <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                        <span class="badge-category">${story.category || 'Lainnya'}</span>
                        ${read ? `<span style="font-size:0.72rem; color:#0D9488; font-weight:600;">✓ Sudah dibaca</span>` : ''}
                    </div>
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