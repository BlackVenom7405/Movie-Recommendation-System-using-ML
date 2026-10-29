/**
 * CineMatch - Intelligent Movie Recommendation System
 * Modular Client-Side Application Script
 */

// Application State
const AppState = {
    currentTab: 'home',
    discover: {
        page: 1,
        perPage: 12,
        genre: 'All',
        sort: 'popularity',
        query: '',
        totalPages: 1,
        totalItems: 0
    },
    watchlist: [],
    genres: [],
    featured: [],
    selectedMovie: null
};

// Genre Color Theme Map for Fallback Posters
const GENRE_COLORS = {
    'action': { from: '#2b1111', to: '#120707', accent: '#ef4444' },
    'adventure': { from: '#1a2414', to: '#0a1008', accent: '#22c55e' },
    'animation': { from: '#2b1b36', to: '#120a17', accent: '#a855f7' },
    'comedy': { from: '#2d2210', to: '#140e05', accent: '#f59e0b' },
    'crime': { from: '#1a1f26', to: '#090b0e', accent: '#64748b' },
    'documentary': { from: '#1c2229', to: '#0a0d10', accent: '#06b6d4' },
    'drama': { from: '#251c14', to: '#100b07', accent: '#f97316' },
    'family': { from: '#1b2829', to: '#091011', accent: '#14b8a6' },
    'fantasy': { from: '#181b33', to: '#080a14', accent: '#6366f1' },
    'history': { from: '#282017', to: '#120d09', accent: '#d97706' },
    'horror': { from: '#260f1c', to: '#10050b', accent: '#f43f5e' },
    'music': { from: '#2d182b', to: '#130812', accent: '#ec4899' },
    'mystery': { from: '#18192e', to: '#090a14', accent: '#818cf8' },
    'romance': { from: '#33131c', to: '#14060b', accent: '#fb7185' },
    'science fiction': { from: '#0c2233', to: '#040d14', accent: '#38bdf8' },
    'sci-fi': { from: '#0c2233', to: '#040d14', accent: '#38bdf8' },
    'thriller': { from: '#24141d', to: '#0d070a', accent: '#e11d48' },
    'war': { from: '#222319', to: '#0d0d08', accent: '#84cc16' },
    'western': { from: '#2e1d13', to: '#120a06', accent: '#b45309' }
};

// Initialize App on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initWatchlist();
    initRouter();
    initDialogA11y();
    initHeroEvents();
    initDiscoverEvents();
    initRecsEvents();
    initAcademicModelInfo();
    
    // Load Initial Data
    loadGenres();
    loadFeatured();
    loadDiscoverMovies();
});

/* ==========================================================================
   1. Watchlist (Local Storage Persistence)
   ========================================================================== */
function initWatchlist() {
    try {
        const saved = localStorage.getItem('cinematch_watchlist');
        AppState.watchlist = saved ? JSON.parse(saved) : [];
    } catch (e) {
        AppState.watchlist = [];
    }
    updateWatchlistBadge();
}

function saveWatchlist() {
    try {
        localStorage.setItem('cinematch_watchlist', JSON.stringify(AppState.watchlist));
    } catch (e) {
        console.error('Failed to save watchlist:', e);
    }
    updateWatchlistBadge();
}

function updateWatchlistBadge() {
    const badge = document.getElementById('nav-watchlist-count');
    if (badge) {
        badge.textContent = AppState.watchlist.length;
    }
    const clearBtn = document.getElementById('clear-watchlist-btn');
    if (clearBtn) {
        clearBtn.style.display = AppState.watchlist.length > 0 ? 'inline-block' : 'none';
    }
}

function isMovieInWatchlist(movieId) {
    return AppState.watchlist.some(m => m.movie_id === movieId);
}

function toggleWatchlistMovie(movie) {
    const idx = AppState.watchlist.findIndex(m => m.movie_id === movie.movie_id);
    if (idx >= 0) {
        AppState.watchlist.splice(idx, 1);
        showToast(`Removed "${movie.title}" from Watchlist`);
    } else {
        AppState.watchlist.push(movie);
        showToast(`Added "${movie.title}" to Watchlist ⭐`);
    }
    saveWatchlist();

    // Re-render watchlist if currently active
    if (AppState.currentTab === 'watchlist') {
        renderWatchlistSection();
    }
    
    // Update all matching bookmark button icons in DOM
    document.querySelectorAll(`[data-bookmark-id="${movie.movie_id}"]`).forEach(btn => {
        const inList = isMovieInWatchlist(movie.movie_id);
        btn.classList.toggle('bookmarked', inList);
    });
}

function renderWatchlistSection() {
    const container = document.getElementById('watchlist-movies-container');
    const emptyState = document.getElementById('watchlist-empty-state');
    
    if (!container || !emptyState) return;

    if (AppState.watchlist.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = '';
    AppState.watchlist.forEach(movie => {
        container.appendChild(createMovieCard(movie));
    });
}

/* ==========================================================================
   2. Router & View Navigation
   ========================================================================== */
function initRouter() {
    // Nav links click
    document.querySelectorAll('.nav-link, .nav-trigger').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const target = link.getAttribute('data-target') || link.getAttribute('href').replace('#', '');
            navigateToTab(target);
        });
    });

    // Hash change handler
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.replace('#', '') || 'home';
        navigateToTab(hash, false);
    });

    // Brand logo returns home
    document.getElementById('brand-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateToTab('home');
    });

    // Mobile menu toggle
    const toggle = document.getElementById('menu-toggle');
    const nav = document.getElementById('main-nav');
    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            nav.classList.toggle('mobile-open');
        });
    }

    // Set initial tab based on URL hash
    const initialHash = window.location.hash.replace('#', '') || 'home';
    navigateToTab(initialHash, false);
}

function navigateToTab(tabName, updateHash = true) {
    const validTabs = ['home', 'discover', 'recommendations', 'watchlist', 'about'];
    const activeTab = validTabs.includes(tabName) ? tabName : 'home';
    AppState.currentTab = activeTab;

    // Close mobile menu if open
    document.getElementById('main-nav')?.classList.remove('mobile-open');

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-target') === activeTab);
    });

    // Update section visibility
    document.querySelectorAll('.page-section').forEach(sec => {
        const isTarget = sec.id === `section-${activeTab}`;
        sec.classList.toggle('active', isTarget);
    });

    if (updateHash) {
        history.pushState(null, '', `#${activeTab}`);
    }

    // Tab-specific initialization
    if (activeTab === 'watchlist') {
        renderWatchlistSection();
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ==========================================================================
   3. Accessible Modal Dialog (Complies with Modern Web Guidance)
   ========================================================================== */
function initDialogA11y() {
    const dialog = document.getElementById('movie-modal');
    const closeBtn = document.getElementById('modal-close-btn');

    if (!dialog) return;

    // Close button
    closeBtn?.addEventListener('click', () => dialog.close());

    // Light-dismiss click outside dialog fallback
    dialog.addEventListener('pointerdown', (e) => {
        const rect = dialog.getBoundingClientRect();
        const isInDialog = (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
        );
        if (!isInDialog) {
            dialog.close();
        }
    });

    // Keyboard shortcut '/' to focus search
    window.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            const navInput = document.getElementById('nav-quick-search');
            if (navInput && window.innerWidth > 768) {
                navInput.focus();
            } else {
                document.getElementById('discover-search-input')?.focus();
            }
        }
    });
}

function openMovieModal(movie) {
    const dialog = document.getElementById('movie-modal');
    const container = document.getElementById('modal-content-container');
    if (!dialog || !container) return;

    const inWatchlist = isMovieInWatchlist(movie.movie_id);
    const posterSrc = movie.poster_url || '';
    const backdropSrc = movie.backdrop_url || '';
    const genresHtml = (movie.genres || []).map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join('');
    const castHtml = (movie.cast || []).map(c => `<span class="cast-chip">${escapeHtml(c)}</span>`).join('');

    container.innerHTML = `
        <div class="modal-banner" style="${backdropSrc ? `background-image: url('${backdropSrc}')` : ''}">
            <div class="modal-banner-gradient"></div>
        </div>

        <div class="modal-body-content">
            <div class="modal-header-row">
                ${posterSrc ? `
                    <img src="${posterSrc}" alt="${escapeHtml(movie.title)}" class="modal-poster-img"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="fallback-poster modal-poster-img" style="display: none;">
                        <span class="fallback-title">${escapeHtml(movie.title)}</span>
                    </div>
                ` : `
                    <div class="fallback-poster modal-poster-img">
                        <span class="fallback-title">${escapeHtml(movie.title)}</span>
                    </div>
                `}

                <div class="modal-header-meta">
                    <h2 class="modal-title" id="modal-movie-title">${escapeHtml(movie.title)}</h2>
                    ${movie.tagline ? `<p class="modal-tagline">"${escapeHtml(movie.tagline)}"</p>` : ''}
                    
                    <div class="modal-chips-bar">
                        ${movie.rating > 0 ? `<span class="rating">★ ${movie.rating}</span>` : ''}
                        ${movie.release_year ? `<span>${movie.release_year}</span>` : ''}
                        ${movie.runtime ? `<span>${movie.runtime}</span>` : ''}
                        <span>Dir. ${escapeHtml(movie.director || 'Unknown')}</span>
                    </div>

                    <div class="spotlight-genres">${genresHtml}</div>
                </div>
            </div>

            <h4 class="modal-section-title">Plot Overview</h4>
            <p class="modal-overview">${escapeHtml(movie.overview || 'No synopsis available for this film.')}</p>

            ${castHtml ? `
                <h4 class="modal-section-title">Top Cast</h4>
                <div class="modal-cast-list">${castHtml}</div>
            ` : ''}

            <div class="modal-actions">
                <button class="btn btn-primary" id="modal-recommend-btn">
                    Recommend Similar Movies &rarr;
                </button>
                <button class="btn btn-outline" id="modal-watchlist-btn">
                    ${inWatchlist ? 'Remove from Watchlist' : 'Add to Watchlist ⭐'}
                </button>
            </div>
        </div>
    `;

    // Modal Actions Wiring
    document.getElementById('modal-recommend-btn')?.addEventListener('click', () => {
        dialog.close();
        triggerRecommendation(movie.title, movie.movie_id);
    });

    document.getElementById('modal-watchlist-btn')?.addEventListener('click', () => {
        toggleWatchlistMovie(movie);
        const updatedInList = isMovieInWatchlist(movie.movie_id);
        const btn = document.getElementById('modal-watchlist-btn');
        if (btn) btn.textContent = updatedInList ? 'Remove from Watchlist' : 'Add to Watchlist ⭐';
    });

    dialog.showModal();
}

/* ==========================================================================
   4. Movie Card Component Builder
   ========================================================================== */
function createMovieCard(movie, isRecommendation = false) {
    const card = document.createElement('div');
    card.className = 'movie-card';

    const inWatchlist = isMovieInWatchlist(movie.movie_id);
    const posterUrl = movie.poster_url || '';
    const genres = movie.genres || [];
    const firstGenre = (genres[0] || 'drama').toLowerCase();
    const theme = GENRE_COLORS[firstGenre] || GENRE_COLORS['drama'];

    const genresHtml = genres.slice(0, 3).map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join('');

    card.innerHTML = `
        <div class="card-poster-wrap">
            ${isRecommendation ? `
                <div class="similarity-pill">${movie.similarity_score}% Match</div>
            ` : `
                ${movie.rating > 0 ? `<div class="card-rating-badge">★ ${movie.rating}</div>` : ''}
                ${movie.release_year ? `<div class="card-year-badge">${movie.release_year}</div>` : ''}
            `}

            ${posterUrl ? `
                <img src="${posterUrl}" alt="${escapeHtml(movie.title)}" class="card-poster-img" loading="lazy"
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                <div class="fallback-poster" style="display: none; background: linear-gradient(145deg, ${theme.from} 0%, ${theme.to} 100%);">
                    <div class="fallback-emblem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <rect x="2" y="2" width="20" height="20" rx="3"></rect>
                            <circle cx="12" cy="12" r="4"></circle>
                            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path>
                        </svg>
                        <span class="genre-tag" style="border-color: ${theme.accent}; color: ${theme.accent};">${escapeHtml(genres[0] || 'Film')}</span>
                    </div>
                    <div class="fallback-body">
                        <h4 class="fallback-title">${escapeHtml(movie.title)}</h4>
                        <span class="fallback-director">Dir. ${escapeHtml(movie.director || 'Unknown')}</span>
                    </div>
                    <div class="fallback-meta">
                        <span>${movie.release_year || 'TMDB 5K'}</span>
                        <span>${movie.rating > 0 ? `★ ${movie.rating}` : ''}</span>
                    </div>
                </div>
            ` : `
                <div class="fallback-poster" style="background: linear-gradient(145deg, ${theme.from} 0%, ${theme.to} 100%);">
                    <div class="fallback-emblem">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                            <rect x="2" y="2" width="20" height="20" rx="3"></rect>
                            <circle cx="12" cy="12" r="4"></circle>
                            <path d="M12 2v4M12 18v4M2 12h4M18 12h4"></path>
                        </svg>
                        <span class="genre-tag" style="border-color: ${theme.accent}; color: ${theme.accent};">${escapeHtml(genres[0] || 'Film')}</span>
                    </div>
                    <div class="fallback-body">
                        <h4 class="fallback-title">${escapeHtml(movie.title)}</h4>
                        <span class="fallback-director">Dir. ${escapeHtml(movie.director || 'Unknown')}</span>
                    </div>
                    <div class="fallback-meta">
                        <span>${movie.release_year || 'TMDB 5K'}</span>
                        <span>${movie.rating > 0 ? `★ ${movie.rating}` : ''}</span>
                    </div>
                </div>
            `}

            <!-- Hover overlay -->
            <div class="card-hover-actions">
                <button class="btn btn-primary card-action-btn btn-recommend-card">Recommend Similar</button>
                <button class="btn btn-secondary card-action-btn btn-details-card">View Full Details</button>
            </div>

            <!-- Bookmark icon -->
            <button class="card-bookmark-btn ${inWatchlist ? 'bookmarked' : ''}" 
                    data-bookmark-id="${movie.movie_id}" 
                    aria-label="Add to watchlist" title="Save to Watchlist">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="${inWatchlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                </svg>
            </button>
        </div>

        <div class="card-content">
            <h3 class="card-title" title="${escapeHtml(movie.title)}">${escapeHtml(movie.title)}</h3>
            <span class="card-director">Dir. ${escapeHtml(movie.director || 'Unknown')}</span>
            
            ${isRecommendation && movie.reasoning ? `
                <div class="recs-reasoning">${escapeHtml(movie.reasoning)}</div>
            ` : ''}

            <div class="card-genres">${genresHtml}</div>
        </div>
    `;

    // Card Event Listeners
    card.querySelector('.card-title')?.addEventListener('click', () => openMovieModal(movie));
    card.querySelector('.btn-details-card')?.addEventListener('click', () => openMovieModal(movie));

    card.querySelector('.btn-recommend-card')?.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerRecommendation(movie.title, movie.movie_id);
    });

    card.querySelector('.card-bookmark-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleWatchlistMovie(movie);
    });

    return card;
}

/* ==========================================================================
   5. Home Page & Featured Movies
   ========================================================================== */
function initHeroEvents() {
    const heroInput = document.getElementById('hero-movie-input');
    const heroBtn = document.getElementById('hero-submit-btn');
    const heroDropdown = document.getElementById('hero-search-dropdown');

    const handleHeroSubmit = () => {
        const query = heroInput?.value.trim();
        if (query) {
            heroDropdown?.classList.remove('active');
            triggerRecommendation(query);
        }
    };

    heroBtn?.addEventListener('click', handleHeroSubmit);
    heroInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleHeroSubmit();
    });

    // Hero autocomplete search
    let debounceTimer;
    heroInput?.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const q = heroInput.value.trim();
        if (q.length < 2) {
            heroDropdown?.classList.remove('active');
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&per_page=6`);
                const data = await res.json();
                if (data.items && data.items.length > 0) {
                    renderDropdownItems(heroDropdown, data.items, (item) => {
                        heroInput.value = item.title;
                        heroDropdown.classList.remove('active');
                        triggerRecommendation(item.title, item.movie_id);
                    });
                    heroDropdown.classList.add('active');
                } else {
                    heroDropdown.classList.remove('active');
                }
            } catch (err) {
                console.error(err);
            }
        }, 250);
    });

    // Quick pick pill buttons
    document.querySelectorAll('.pill-tag').forEach(btn => {
        btn.addEventListener('click', () => {
            const title = btn.getAttribute('data-title');
            if (title) triggerRecommendation(title);
        });
    });

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!heroInput?.contains(e.target) && !heroDropdown?.contains(e.target)) {
            heroDropdown?.classList.remove('active');
        }
        const navInput = document.getElementById('nav-quick-search');
        const navDropdown = document.getElementById('quick-search-results');
        if (!navInput?.contains(e.target) && !navDropdown?.contains(e.target)) {
            navDropdown?.classList.remove('active');
        }
    });

    // Nav quick search handler
    const navSearch = document.getElementById('nav-quick-search');
    const navDropdown = document.getElementById('quick-search-results');
    navSearch?.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const q = navSearch.value.trim();
        if (q.length < 2) {
            navDropdown?.classList.remove('active');
            return;
        }
        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&per_page=5`);
                const data = await res.json();
                if (data.items && data.items.length > 0) {
                    renderDropdownItems(navDropdown, data.items, (item) => {
                        navSearch.value = '';
                        navDropdown.classList.remove('active');
                        openMovieModal(item);
                    });
                    navDropdown.classList.add('active');
                } else {
                    navDropdown.classList.remove('active');
                }
            } catch (e) {
                console.error(e);
            }
        }, 250);
    });
}

function renderDropdownItems(container, items, onClick) {
    if (!container) return;
    container.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'dropdown-item';
        div.innerHTML = `
            ${item.poster_url ? `<img src="${item.poster_url}" class="dropdown-item-thumb" alt="${escapeHtml(item.title)}">` : `<div class="dropdown-item-thumb" style="background:#202434"></div>`}
            <div class="dropdown-item-info">
                <div class="dropdown-item-title">${escapeHtml(item.title)}</div>
                <div class="dropdown-item-meta">${item.release_year || ''} • Dir. ${escapeHtml(item.director || 'Unknown')}</div>
            </div>
        `;
        div.addEventListener('click', () => onClick(item));
        container.appendChild(div);
    });
}

async function loadFeatured() {
    try {
        const res = await fetch('/api/featured');
        const data = await res.json();
        if (data.status === 'success' && data.movies) {
            AppState.featured = data.movies;
            renderFeaturedMovies(data.movies);
            setupHeroBackdropRotation(data.movies);
        }
    } catch (err) {
        console.error('Error loading featured movies:', err);
    }
}

function renderFeaturedMovies(movies) {
    const container = document.getElementById('featured-movies-container');
    if (!container) return;
    container.innerHTML = '';
    movies.slice(0, 8).forEach(movie => {
        container.appendChild(createMovieCard(movie));
    });
}

function setupHeroBackdropRotation(movies) {
    const backdrop = document.getElementById('hero-backdrop-img');
    if (!backdrop) return;

    const backdrops = movies.filter(m => m.backdrop_url).map(m => m.backdrop_url);
    if (backdrops.length === 0) return;

    let currentIdx = 0;
    backdrop.style.backgroundImage = `url('${backdrops[0]}')`;

    setInterval(() => {
        currentIdx = (currentIdx + 1) % backdrops.length;
        backdrop.style.opacity = '0';
        setTimeout(() => {
            backdrop.style.backgroundImage = `url('${backdrops[currentIdx]}')`;
            backdrop.style.opacity = '0.35';
        }, 800);
    }, 8000);
}

/* ==========================================================================
   6. Discover Page (Search, Genre Filters, Pagination)
   ========================================================================== */
function initDiscoverEvents() {
    const searchInput = document.getElementById('discover-search-input');
    const clearBtn = document.getElementById('discover-search-clear');
    const sortSelect = document.getElementById('sort-select');
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const resetBtn = document.getElementById('reset-filters-btn');
    const emptyResetBtn = document.getElementById('empty-reset-btn');

    let debounceTimer;
    searchInput?.addEventListener('input', () => {
        const val = searchInput.value.trim();
        clearBtn.style.display = val ? 'block' : 'none';

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            AppState.discover.query = val;
            AppState.discover.page = 1;
            loadDiscoverMovies();
        }, 300);
    });

    clearBtn?.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        AppState.discover.query = '';
        AppState.discover.page = 1;
        loadDiscoverMovies();
    });

    sortSelect?.addEventListener('change', () => {
        AppState.discover.sort = sortSelect.value;
        AppState.discover.page = 1;
        loadDiscoverMovies();
    });

    prevBtn?.addEventListener('click', () => {
        if (AppState.discover.page > 1) {
            AppState.discover.page--;
            loadDiscoverMovies();
            scrollToDiscoverTop();
        }
    });

    nextBtn?.addEventListener('click', () => {
        if (AppState.discover.page < AppState.discover.totalPages) {
            AppState.discover.page++;
            loadDiscoverMovies();
            scrollToDiscoverTop();
        }
    });

    const resetAction = () => {
        AppState.discover.query = '';
        AppState.discover.genre = 'All';
        AppState.discover.sort = 'popularity';
        AppState.discover.page = 1;
        if (searchInput) searchInput.value = '';
        if (sortSelect) sortSelect.value = 'popularity';
        if (clearBtn) clearBtn.style.display = 'none';
        updateGenrePillActive('All');
        loadDiscoverMovies();
    };

    resetBtn?.addEventListener('click', resetAction);
    emptyResetBtn?.addEventListener('click', resetAction);
}

function scrollToDiscoverTop() {
    document.getElementById('section-discover')?.scrollIntoView({ behavior: 'smooth' });
}

async function loadGenres() {
    try {
        const res = await fetch('/api/genres');
        const data = await res.json();
        if (data.status === 'success' && data.genres) {
            AppState.genres = data.genres;
            renderGenrePills(data.genres);
        }
    } catch (e) {
        console.error('Failed to load genres:', e);
    }
}

function renderGenrePills(genres) {
    const container = document.getElementById('genre-pills-container');
    if (!container) return;
    container.innerHTML = '';

    genres.forEach(genre => {
        const btn = document.createElement('button');
        btn.className = `genre-pill-btn ${genre === AppState.discover.genre ? 'active' : ''}`;
        btn.textContent = genre;
        btn.addEventListener('click', () => {
            AppState.discover.genre = genre;
            AppState.discover.page = 1;
            updateGenrePillActive(genre);
            loadDiscoverMovies();
        });
        container.appendChild(btn);
    });
}

function updateGenrePillActive(activeGenre) {
    document.querySelectorAll('.genre-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === activeGenre);
    });
}

async function loadDiscoverMovies() {
    const grid = document.getElementById('discover-movies-container');
    const emptyState = document.getElementById('discover-empty-state');
    const pagination = document.getElementById('discover-pagination');
    const statusText = document.getElementById('results-count-text');
    const resetBtn = document.getElementById('reset-filters-btn');

    if (!grid) return;

    // Show skeletons while fetching
    grid.innerHTML = Array(8).fill('<div class="skeleton-card"></div>').join('');
    emptyState.style.display = 'none';

    const { page, perPage, genre, sort, query } = AppState.discover;
    const url = `/api/search?q=${encodeURIComponent(query)}&genre=${encodeURIComponent(genre)}&sort=${sort}&page=${page}&per_page=${perPage}`;

    try {
        const res = await fetch(url);
        const data = await res.json();

        if (data.status === 'success') {
            AppState.discover.totalPages = data.total_pages;
            AppState.discover.totalItems = data.total;

            grid.innerHTML = '';
            if (data.items.length === 0) {
                emptyState.style.display = 'block';
                pagination.style.display = 'none';
                statusText.textContent = '0 movies found';
            } else {
                data.items.forEach(movie => {
                    grid.appendChild(createMovieCard(movie));
                });
                pagination.style.display = data.total_pages > 1 ? 'flex' : 'none';
                document.getElementById('page-indicator').textContent = `Page ${data.page} of ${data.total_pages}`;
                
                const start = (data.page - 1) * data.per_page + 1;
                const end = Math.min(data.page * data.per_page, data.total);
                statusText.textContent = `Showing ${start}–${end} of ${data.total.toLocaleString()} movies`;
            }

            const isFiltered = query || genre !== 'All' || sort !== 'popularity';
            resetBtn.style.display = isFiltered ? 'inline-block' : 'none';

            // Update pagination buttons state
            document.getElementById('prev-page-btn').disabled = data.page <= 1;
            document.getElementById('next-page-btn').disabled = data.page >= data.total_pages;
        }
    } catch (e) {
        console.error('Failed to load discover movies:', e);
        grid.innerHTML = '<div class="empty-state"><h3>Error loading catalogue</h3><p>Please ensure the Flask backend server is running.</p></div>';
    }
}

/* ==========================================================================
   7. Recommendations Generation Engine (Core ML Feature)
   ========================================================================== */
function initRecsEvents() {
    const input = document.getElementById('recs-search-input');
    const btn = document.getElementById('recs-search-btn');
    const pickAnother = document.getElementById('pick-another-btn');

    btn?.addEventListener('click', () => {
        const q = input?.value.trim();
        if (q) triggerRecommendation(q);
    });

    input?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const q = input?.value.trim();
            if (q) triggerRecommendation(q);
        }
    });

    pickAnother?.addEventListener('click', () => {
        document.getElementById('recs-prompt-state').style.display = 'block';
        document.getElementById('recs-results-state').style.display = 'none';
        document.getElementById('recs-search-input')?.focus();
    });

    document.getElementById('clear-watchlist-btn')?.addEventListener('click', () => {
        if (confirm('Clear all movies from your watchlist?')) {
            AppState.watchlist = [];
            saveWatchlist();
            renderWatchlistSection();
            showToast('Watchlist cleared');
        }
    });
}

async function triggerRecommendation(query, movieId = null) {
    navigateToTab('recommendations');

    const promptState = document.getElementById('recs-prompt-state');
    const loadingState = document.getElementById('recs-loading-state');
    const resultsState = document.getElementById('recs-results-state');

    promptState.style.display = 'none';
    resultsState.style.display = 'none';
    loadingState.style.display = 'block';

    const payload = movieId ? { movie_id: movieId, top_k: 6 } : { query: query, top_k: 6 };

    try {
        const res = await fetch('/api/recommend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        loadingState.style.display = 'none';

        if (data.status === 'success') {
            resultsState.style.display = 'block';
            renderRecommendationsResult(data);
        } else {
            promptState.style.display = 'block';
            let msg = data.message || `No recommendations could be generated for "${query}".`;
            if (data.suggestions && data.suggestions.length > 0) {
                const sugTitles = data.suggestions.map(s => `"${s.title}"`).join(', ');
                msg += ` Did you mean: ${sugTitles}?`;
            }
            showToast(msg, 'error');
        }
    } catch (e) {
        console.error('Recommendation API error:', e);
        loadingState.style.display = 'none';
        promptState.style.display = 'block';
        showToast('Connection error communicating with recommendation engine.', 'error');
    }
}

function renderRecommendationsResult(data) {
    const seed = data.seed_movie;
    const recs = data.recommendations;
    const banner = document.getElementById('seed-movie-banner');
    const grid = document.getElementById('recommendations-container');
    const note = document.getElementById('recs-algorithm-note');

    if (!banner || !grid) return;

    // 1. Render Seed Spotlight Banner
    const seedPoster = seed.poster_url || '';
    const seedGenres = (seed.genres || []).map(g => `<span class="genre-tag">${escapeHtml(g)}</span>`).join('');

    banner.innerHTML = `
        ${seedPoster ? `
            <img src="${seedPoster}" alt="${escapeHtml(seed.title)}" class="spotlight-poster"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="fallback-poster spotlight-poster" style="display: none;">
                <span class="fallback-title">${escapeHtml(seed.title)}</span>
            </div>
        ` : `
            <div class="fallback-poster spotlight-poster">
                <span class="fallback-title">${escapeHtml(seed.title)}</span>
            </div>
        `}

        <div class="spotlight-info">
            <span class="spotlight-badge">QUERY SEED MOVIE</span>
            <h2 class="spotlight-title">${escapeHtml(seed.title)}</h2>
            <div class="spotlight-meta">
                ${seed.release_year ? `<span>${seed.release_year}</span>` : ''}
                ${seed.rating > 0 ? `<span class="rating">★ ${seed.rating}</span>` : ''}
                <span>Dir. ${escapeHtml(seed.director || 'Unknown')}</span>
                <span>${data.source === 'api_fallback' ? '⚡ TMDB Live API Fallback' : data.source === 'offline_knowledge_fallback' ? '⚡ Pre-Cached Vector Projection' : '📂 Local TMDB 5K Corpus'}</span>
            </div>
            <p class="spotlight-overview">${escapeHtml(seed.overview || 'Thematic profile extracted from title overview, keywords, cast, and crew.')}</p>
            <div class="spotlight-genres">${seedGenres}</div>
        </div>
    `;

    // 2. Algorithm note
    if (note) {
        if (data.source === 'api_fallback') {
            note.textContent = `Live dynamic projection via TMDB v3 API into fitted 5,000-D CountVectorizer vector space.`;
        } else if (data.source === 'offline_knowledge_fallback') {
            note.textContent = `Projected into 5,000-D BoW feature space via pre-cached TMDB metadata (offline network resilience).`;
        } else {
            note.textContent = `Computed via precomputed Cosine Similarity over 5,000 BoW features. Query movie strictly excluded.`;
        }
    }

    // 3. Render Recommendation Cards
    grid.innerHTML = '';
    recs.forEach(rec => {
        grid.appendChild(createMovieCard(rec, true));
    });

    window.scrollTo({ top: banner.offsetTop - 90, behavior: 'smooth' });
}

/* ==========================================================================
   8. Academic ML Section (Live Pipeline Diagnostics)
   ========================================================================== */
async function initAcademicModelInfo() {
    try {
        const res = await fetch('/api/model-info');
        const data = await res.json();
        if (data.status === 'success' && data.info) {
            const info = data.info;
            document.getElementById('stat-movies-count').textContent = info.num_movies.toLocaleString();
            document.getElementById('stat-vocab-size').textContent = info.vocabulary_size.toLocaleString();
            document.getElementById('stat-vector-shape').textContent = info.feature_matrix_shape;
            document.getElementById('stat-sim-shape').textContent = info.similarity_matrix_shape;

            // Render vocabulary tokens chips
            const chipsContainer = document.getElementById('vocab-chips-container');
            if (chipsContainer && info.sample_vocabulary) {
                chipsContainer.innerHTML = '';
                info.sample_vocabulary.slice(0, 40).forEach(tok => {
                    const span = document.createElement('span');
                    span.className = 'vocab-chip';
                    span.textContent = tok;
                    chipsContainer.appendChild(span);
                });
            }
        }
    } catch (e) {
        console.error('Failed to load academic model info:', e);
    }
}

/* ==========================================================================
   9. Toast Notifications Utility
   ========================================================================== */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
        <span class="toast-icon">${type === 'error' ? '⚠️' : '✨'}</span>
        <span class="toast-text">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 3200);
}

/* ==========================================================================
   10. Helper Utilities
   ========================================================================== */
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

