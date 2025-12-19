// Configuration - VERSIÓ JSON ESTÀTIC
const DATA_FILE = 'establishments.json';

// Global variables
let map;
let establishments = [];
let currentFilter = 'all';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadData();
    setupFilters();
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

// Load all data from JSON file
async function loadData() {
    try {
        await loadEstablishments();
        updateStats();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

// Load establishments from JSON
async function loadEstablishments() {
    try {
        const response = await fetch(DATA_FILE);
        establishments = await response.json();
        
        console.log(`Carregats ${establishments.length} establiments`);
        
        renderEstablishments();
        addMapMarkers();
    } catch (error) {
        console.error('Error loading establishments:', error);
        document.getElementById('establishments-grid').innerHTML = 
            '<p class="loading">Error carregant establiments. Si us plau, refresca la pàgina.</p>';
    }
}

// Render establishments grid
function renderEstablishments() {
    const grid = document.getElementById('establishments-grid');
    
    let filteredEstablishments = establishments;
    
    if (currentFilter !== 'all') {
        filteredEstablishments = establishments.filter(
            est => est.establishment_type === currentFilter
        );
    }
    
    if (filteredEstablishments.length === 0) {
        grid.innerHTML = '<p class="loading">No hi ha establiments disponibles per aquest filtre</p>';
        return;
    }
    
    grid.innerHTML = filteredEstablishments.map(est => `
        <div class="establishment-card">
            <img 
                src="${est.logo_url || est.image_url || 'https://via.placeholder.com/280x200?text=Sense+imatge'}" 
                alt="${est.name}"
                class="establishment-img"
                onerror="this.src='https://via.placeholder.com/280x200?text=Sense+imatge'"
            >
            <div class="establishment-content">
                <h3 class="establishment-name">${est.name}</h3>
                ${est.category ? `<p class="establishment-category">${est.category}</p>` : ''}
                ${est.status ? `<span class="establishment-status">${est.status}</span>` : ''}
                ${getEstablishmentBadge(est.establishment_type)}
                ${est.address ? `<p class="establishment-address">📍 ${est.address}</p>` : ''}
                ${est.phone ? `<p class="establishment-phone">📞 ${est.phone}</p>` : ''}
                ${est.web_url || est.website ? `<a href="${est.web_url || est.website}" target="_blank" class="establishment-web">🌐 Web</a>` : ''}
                <div class="establishment-social">
                    ${est.instagram ? `<a href="${est.instagram}" target="_blank" class="social-icon" title="Instagram">📷</a>` : ''}
                    ${est.facebook ? `<a href="${est.facebook}" target="_blank" class="social-icon" title="Facebook">📘</a>` : ''}
                    ${est.twitter ? `<a href="${est.twitter}" target="_blank" class="social-icon" title="Twitter">🐦</a>` : ''}
                </div>
            </div>
        </div>
    `).join('');
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

// Update statistics
function updateStats() {
    const totalElement = document.getElementById('total-establishments');
    if (totalElement) {
        totalElement.textContent = establishments.length;
        animateNumber(totalElement, establishments.length);
    }
}

// Animate number counter
function animateNumber(element, target) {
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    
    const timer = setInterval(() => {
        current += step;
        if (current >= target) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
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

// Add scroll effect to header
window.addEventListener('scroll', () => {
    const header = document.querySelector('.header');
    if (header && window.scrollY > 50) {
        header.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
    } else if (header) {
        header.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    }
});
