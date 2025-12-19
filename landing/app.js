// Configuration - API PÚBLICA DE RAILWAY
const API_BASE_URL = 'https://reusapp-backend-production.up.railway.app/api';

// Global variables
let map;
let establishments = [];
let offers = [];
let events = [];
let news = [];
let currentFilter = 'all';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData();
    setupFilters();
    setupSearch();
    setupSmoothScroll();
});

// Initialize Leaflet map
function initMap() {
    // Center on Reus
    map = L.map('establishments-map').setView([41.1556, 1.1064], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);
}

// Load all data from API
async function loadData() {
    try {
        await Promise.all([
            loadEstablishments(),
            loadOffers(),
            loadEvents(),
            loadNews()
        ]);
        
        updateStats();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Load establishments from API
async function loadEstablishments() {
    try {
        const response = await fetch(`${API_BASE_URL}/establishments`);
        let allEstablishments = await response.json();
        
        // Filter out establishments with status "TANCAT" or "Ocult"
        establishments = allEstablishments.filter(est => {
            return est.status !== 'TANCAT' && est.status !== 'Ocult';
        });
        
        renderEstablishments();
        addMapMarkers();
    } catch (error) {
        console.error('Error loading establishments:', error);
        document.getElementById('establishments-grid').innerHTML = 
            '<p class="loading">Error carregant establiments</p>';
    }
}

// Load offers from API
async function loadOffers() {
    try {
        const response = await fetch(`${API_BASE_URL}/offers`);
        offers = await response.json();
        
        // Filter only active offers
        const now = new Date();
        offers = offers.filter(offer => {
            const validFrom = new Date(offer.valid_from);
            const validUntil = new Date(offer.valid_until);
            return now >= validFrom && now <= validUntil;
        });
        
        renderOffers();
    } catch (error) {
        console.error('Error loading offers:', error);
        document.getElementById('offers-carousel').innerHTML = 
            '<p class="loading">Error carregant ofertes</p>';
    }
}

// Load events from API
async function loadEvents() {
    try {
        const response = await fetch(`${API_BASE_URL}/events`);
        events = await response.json();
        
        // Filter only active events
        const now = new Date();
        events = events.filter(event => {
            const validFrom = new Date(event.valid_from);
            const validUntil = new Date(event.valid_until);
            return now >= validFrom && now <= validUntil;
        });
        
        renderEvents();
    } catch (error) {
        console.error('Error loading events:', error);
        document.getElementById('events-carousel').innerHTML = 
            '<p class="loading">Error carregant esdeveniments</p>';
    }
}

// Load news from API
async function loadNews() {
    try {
        const response = await fetch(`${API_BASE_URL}/news`);
        news = await response.json();
        
        // Get only latest 6 news
        news = news.slice(0, 6);
        
        renderNews();
    } catch (error) {
        console.error('Error loading news:', error);
        document.getElementById('news-grid').innerHTML = 
            '<p class="loading">Error carregant notícies</p>';
    }
}

// Render establishments grid - Logo View
function renderEstablishments() {
    const grid = document.getElementById('establishments-grid');
    const noResults = document.getElementById('no-results');
    
    let filteredEstablishments = establishments;
    
    // Apply filter
    if (currentFilter !== 'all') {
        filteredEstablishments = establishments.filter(
            est => est.establishment_type === currentFilter
        );
    }
    
    // Apply search
    const searchQuery = document.getElementById('establishments-search-input').value.toLowerCase().trim();
    if (searchQuery) {
        filteredEstablishments = filteredEstablishments.filter(est => {
            const name = (est.name || '').toLowerCase();
            const address = (est.address || '').toLowerCase();
            const category = (est.category || '').toLowerCase();
            
            return name.includes(searchQuery) || 
                   address.includes(searchQuery) || 
                   category.includes(searchQuery);
        });
    }
    
    // Update results count
    updateSearchResultsCount(filteredEstablishments.length, establishments.length);
    
    if (filteredEstablishments.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    grid.innerHTML = filteredEstablishments.map(est => `
        <div class="establishment-logo-card" onclick="openEstablishmentModal('${est._id}')">
            <img 
                src="${est.logo_url || est.image_url || 'https://via.placeholder.com/80x80?text=' + encodeURIComponent(est.name.substring(0, 2))}" 
                alt="${est.name}"
                class="establishment-logo"
                onerror="this.src='https://via.placeholder.com/80x80?text=${encodeURIComponent(est.name.substring(0, 2))}'"
            >
            <div class="establishment-logo-name">${est.name}</div>
            ${est.category ? `<div class="establishment-logo-category">${est.category}</div>` : ''}
        </div>
    `).join('');
}

// Update search results count
function updateSearchResultsCount(filtered, total) {
    const countElement = document.getElementById('search-results-count');
    const searchInput = document.getElementById('establishments-search-input');
    
    if (searchInput.value.trim()) {
        countElement.textContent = `S'han trobat ${filtered} establiments de ${total}`;
        countElement.style.display = 'block';
    } else {
        countElement.textContent = '';
        countElement.style.display = 'none';
    }
}

// Open establishment detail modal
function openEstablishmentModal(establishmentId) {
    const establishment = establishments.find(est => est._id === establishmentId);
    if (!establishment) return;
    
    const modal = document.getElementById('establishment-modal');
    const content = document.getElementById('establishment-detail-content');
    
    content.innerHTML = `
        <div class="establishment-detail-header">
            <img 
                src="${establishment.logo_url || establishment.image_url || 'https://via.placeholder.com/120x120?text=' + encodeURIComponent(establishment.name.substring(0, 2))}" 
                alt="${establishment.name}"
                class="establishment-detail-logo"
                onerror="this.src='https://via.placeholder.com/120x120?text=${encodeURIComponent(establishment.name.substring(0, 2))}'"
            >
            <h2 class="establishment-detail-name">${establishment.name}</h2>
            ${establishment.category ? `<p class="establishment-detail-category">${establishment.category}</p>` : ''}
            ${getEstablishmentBadge(establishment.establishment_type)}
        </div>
        
        ${establishment.description ? `
            <p class="establishment-detail-description">${establishment.description}</p>
        ` : ''}
        
        <div class="establishment-detail-info">
            ${establishment.address ? `
                <div class="establishment-detail-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>${establishment.address}</span>
                </div>
            ` : ''}
            
            ${establishment.phone ? `
                <div class="establishment-detail-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                    </svg>
                    <a href="tel:${establishment.phone}">${establishment.phone}</a>
                </div>
            ` : ''}
            
            ${establishment.web_url ? `
                <div class="establishment-detail-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="2" y1="12" x2="22" y2="12"></line>
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                    <a href="${establishment.web_url}" target="_blank">Visita el web</a>
                </div>
            ` : ''}
            
            ${establishment.whatsapp ? `
                <div class="establishment-detail-item">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    <a href="https://wa.me/${establishment.whatsapp}" target="_blank">WhatsApp</a>
                </div>
            ` : ''}
        </div>
        
        ${(establishment.instagram || establishment.facebook || establishment.twitter) ? `
            <div class="establishment-detail-social">
                ${establishment.instagram ? `
                    <a href="${establishment.instagram}" target="_blank">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" fill="white"></path>
                            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" stroke="white" stroke-width="2"></line>
                        </svg>
                    </a>
                ` : ''}
                ${establishment.facebook ? `
                    <a href="${establishment.facebook}" target="_blank">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                        </svg>
                    </a>
                ` : ''}
                ${establishment.twitter ? `
                    <a href="${establishment.twitter}" target="_blank">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path>
                        </svg>
                    </a>
                ` : ''}
            </div>
        ` : ''}
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Close establishment modal
function closeEstablishmentModal() {
    const modal = document.getElementById('establishment-modal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Get badge HTML for establishment type
function getEstablishmentBadge(type) {
    const badges = {
        'local_associat': '<span class="establishment-badge badge-associat">Local Associat</span>',
        'patrocinador': '<span class="establishment-badge badge-patrocinador">Patrocinador</span>'
    };
    
    return badges[type] || '';
}

// Add markers to map
function addMapMarkers() {
    establishments.forEach(est => {
        if (est.latitude && est.longitude) {
            const marker = L.marker([est.latitude, est.longitude]).addTo(map);
            
            let popupContent = `<strong>${est.name}</strong>`;
            if (est.address) popupContent += `<br>${est.address}`;
            if (est.phone) popupContent += `<br>📞 ${est.phone}`;
            
            marker.bindPopup(popupContent);
        }
    });
}

// Render offers carousel
function renderOffers() {
    const carousel = document.getElementById('offers-carousel');
    
    if (offers.length === 0) {
        carousel.innerHTML = '<p class="loading">No hi ha ofertes actives</p>';
        return;
    }
    
    carousel.innerHTML = offers.map(offer => `
        <div class="offer-card">
            ${offer.image_url ? `
                <img 
                    src="${offer.image_url}" 
                    alt="${offer.title}"
                    class="offer-img"
                >
            ` : ''}
            <div class="offer-content">
                <h3 class="offer-title">${offer.title}</h3>
                ${offer.discount ? `<div class="offer-discount">${offer.discount}</div>` : ''}
                <p class="offer-description">${offer.description}</p>
                ${offer.valid_until ? `
                    <p class="offer-date">Vàlida fins: ${formatDate(offer.valid_until)}</p>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Render events carousel
function renderEvents() {
    const carousel = document.getElementById('events-carousel');
    
    if (events.length === 0) {
        carousel.innerHTML = '<p class="loading">No hi ha esdeveniments actius</p>';
        return;
    }
    
    carousel.innerHTML = events.map(event => `
        <div class="event-card">
            ${event.image ? `
                <img 
                    src="${event.image}" 
                    alt="${event.title}"
                    class="event-img"
                >
            ` : ''}
            <div class="event-content">
                <h3 class="event-title">${event.title}</h3>
                <p class="event-description">${event.description}</p>
                ${event.valid_from && event.valid_until ? `
                    <p class="event-date">
                        📅 ${formatDate(event.valid_from)} - ${formatDate(event.valid_until)}
                    </p>
                ` : ''}
                ${event.social_media_links && event.social_media_links.length > 0 ? `
                    <div class="event-social">
                        ${event.social_media_links.map(link => `
                            <a href="${link}" target="_blank" class="event-social-link">
                                🔗 Enllaç
                            </a>
                        `).join('')}
                    </div>
                ` : ''}
                ${event.participating_establishments && event.participating_establishments.length > 0 ? `
                    <div class="event-establishments">
                        <p class="event-establishments-title">Establiments participants:</p>
                        <ul class="event-establishments-list">
                            ${event.participating_establishments.slice(0, 3).map(est => `
                                <li>${est}</li>
                            `).join('')}
                            ${event.participating_establishments.length > 3 ? 
                                `<li>+ ${event.participating_establishments.length - 3} més</li>` : ''}
                        </ul>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Render news grid
function renderNews() {
    const grid = document.getElementById('news-grid');
    
    if (news.length === 0) {
        grid.innerHTML = '<p class="loading">No hi ha notícies disponibles</p>';
        return;
    }
    
    grid.innerHTML = news.map(item => `
        <div class="news-card">
            <div class="news-content">
                <div class="news-source">${item.source || 'El Tomb de Reus'}</div>
                <h3 class="news-title">${item.title}</h3>
                <p class="news-date">${formatDate(item.created_at)}</p>
                ${item.url ? `
                    <a href="${item.url}" target="_blank" class="news-link">
                        Llegir més →
                    </a>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Update statistics
function updateStats() {
    document.getElementById('total-establishments').textContent = establishments.length;
    document.getElementById('total-offers').textContent = offers.length;
    document.getElementById('total-events').textContent = events.length;
    
    // Animate numbers
    animateNumbers();
}

// Animate number counters
function animateNumbers() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent);
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                counter.textContent = target;
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current);
            }
        }, 16);
    });
}

// Setup filter tabs
function setupFilters() {
    const tabs = document.querySelectorAll('.filter-tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Update filter
            currentFilter = tab.dataset.filter;
            
            // Re-render establishments
            renderEstablishments();
        });
    });
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('establishments-search-input');
    const clearButton = document.getElementById('clear-search');
    
    if (!searchInput) return;
    
    // Search on input
    searchInput.addEventListener('input', (e) => {
        const value = e.target.value.trim();
        
        // Show/hide clear button
        if (value) {
            clearButton.style.display = 'block';
        } else {
            clearButton.style.display = 'none';
        }
        
        // Re-render establishments with search
        renderEstablishments();
    });
    
    // Clear search
    if (clearButton) {
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            clearButton.style.display = 'none';
            renderEstablishments();
        });
    }
}

// Setup smooth scroll for navigation
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerOffset = 70;
                const elementPosition = target.offsetTop;
                const offsetPosition = elementPosition - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Format date helper
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ca-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Add scroll effect to header
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (window.scrollY > 50) {
        header.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
});
