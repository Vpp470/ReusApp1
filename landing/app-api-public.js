// Configuration - API PÚBLICA DE RAILWAY
const API_BASE_URL = 'https://reusapp-backend-production.up.railway.app/api';

// Global variables
let map;
let establishments = [];
let currentFilter = 'all';

// Initialize map
function initMap() {
    map = L.map('map').setView([41.1556, 1.1060], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

// Load establishments from API
async function loadEstablishments() {
    try {
        console.log('Carregant establiments des de l\'API...');
        const response = await fetch(`${API_BASE_URL}/establishments`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        establishments = await response.json();
        
        console.log(`✅ Carregats ${establishments.length} establiments des de l'API`);
        
        renderEstablishments();
        addMapMarkers();
    } catch (error) {
        console.error('Error loading establishments:', error);
        document.getElementById('establishments-grid').innerHTML = 
            '<p class="loading">Error carregant establiments. Si us plau, refresca la pàgina.</p>';
    }
}

// Render establishments
function renderEstablishments() {
    const grid = document.getElementById('establishments-grid');
    
    let filtered = establishments;
    if (currentFilter !== 'all') {
        filtered = establishments.filter(est => 
            est.establishment_type === currentFilter
        );
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = '<p class="loading">No s\'han trobat establiments.</p>';
        return;
    }
    
    grid.innerHTML = filtered.map(est => `
        <div class="establishment-card">
            ${est.logo_url ? `<img src="${est.logo_url}" alt="${est.name}" class="establishment-logo">` : ''}
            
            <h3>${est.name}</h3>
            
            ${est.status ? `<span class="establishment-status ${est.status.toLowerCase().replace(' ', '-')}">${est.status}</span>` : ''}
            
            <div class="establishment-info">
                ${est.address ? `<p><strong>📍 Adreça:</strong> ${est.address}</p>` : ''}
                ${est.phone ? `<p><strong>📞 Telèfon:</strong> <a href="tel:${est.phone}">${est.phone}</a></p>` : ''}
                ${est.email ? `<p><strong>✉️ Email:</strong> <a href="mailto:${est.email}">${est.email}</a></p>` : ''}
                ${est.web_url || est.website ? `<p><strong>🌐 Web:</strong> <a href="${est.web_url || est.website}" target="_blank">Visitar web</a></p>` : ''}
                ${est.category ? `<p><strong>🏷️ Categoria:</strong> ${est.category}</p>` : ''}
                ${est.description ? `<p>${est.description.replace(/<[^>]*>/g, '').substring(0, 150)}...</p>` : ''}
            </div>
            
            <div class="establishment-social">
                ${est.instagram ? `<a href="${est.instagram}" target="_blank" class="social-icon instagram">📷</a>` : ''}
                ${est.facebook ? `<a href="${est.facebook}" target="_blank" class="social-icon facebook">f</a>` : ''}
                ${est.twitter ? `<a href="${est.twitter}" target="_blank" class="social-icon twitter">🐦</a>` : ''}
            </div>
        </div>
    `).join('');
}

// Add markers to map
function addMapMarkers() {
    establishments.forEach(est => {
        if (est.latitude && est.longitude) {
            const marker = L.marker([est.latitude, est.longitude]).addTo(map);
            marker.bindPopup(`
                <strong>${est.name}</strong><br>
                ${est.address || ''}<br>
                ${est.phone ? `Tel: ${est.phone}` : ''}
            `);
        }
    });
}

// Filter establishments
function filterByType(type) {
    currentFilter = type;
    renderEstablishments();
    
    // Update active button
    document.querySelectorAll('.filters button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initMap();
    loadEstablishments();
});

// Handle scroll header
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 100) {
        header.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    } else {
        header.style.boxShadow = 'none';
    }
});
