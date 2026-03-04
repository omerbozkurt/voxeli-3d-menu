import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- İNTRO & MASA YÖNETİMİ ---
const introScreen = document.getElementById('intro-screen');
const mainApp = document.getElementById('main-app');
const tableGrid = document.getElementById('table-grid');
const activeTableBadge = document.getElementById('active-table-badge');

for (let i = 1; i <= 9; i++) {
    const btn = document.createElement('button');
    btn.className = 'table-select-btn';
    btn.innerText = i;
    btn.onclick = () => {
        introScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        activeTableBadge.innerHTML = `Masa ${i} <small>✎</small>`;
        if(navigator.vibrate) navigator.vibrate(50);
    };
    tableGrid.appendChild(btn);
}

// Global Masa Değiştirme Fonksiyonu
window.changeTable = function() {
    if(confirm("Masayı değiştirmek sepetinizi sıfırlayacaktır. Emin misiniz?")) {
        cartState = {}; // Sepeti sıfırla
        activeOrder = false;
        updateCartUI();
        renderProducts();
        mainApp.classList.add('hidden');
        introScreen.classList.remove('hidden');
    }
}

// --- VERİTABANI ---
const menuData = {
    categories: ["Tümü", "Burgerler", "Pizzalar", "Tatlılar", "Uzak Doğu", "Meksika"],
    items: [
        { id: 1, cat: "Burgerler", name: "Truffle Burger", price: 280, desc: "Dana eti, Cheddar peyniri, trüf mayonez.", cal: 850, time: 15, img: "images/hamburger.jpg", model: "models/hamburger.glb", tags: [{name:"⭐ Popüler", class:"star"}] },
        { id: 2, cat: "Pizzalar", name: "Margherita", price: 310, desc: "Mozzarella, Fesleğen, İtalyan domates sosu.", cal: 720, time: 20, img: "images/pizza.jpg", model: "models/pizza.glb", tags: [{name:"🌱 Vegan", class:"vegan"}] },
        { id: 3, cat: "Tatlılar", name: "San Sebastian", price: 160, desc: "Akışkan iç doku, frambuaz sosu ile.", cal: 540, time: 5, img: "images/cheesecake.jpg", model: "models/cheesecake.glb", tags: [] },
        { id: 4, cat: "Uzak Doğu", name: "Sushi Roll", price: 380, desc: "Taze somon, avokado, özel pirinç.", cal: 420, time: 25, img: "images/sushi.jpg", model: "models/sushi.glb", tags: [{name:"⭐ Popüler", class:"star"}] },
        { id: 5, cat: "Meksika", name: "Taco", price: 240, desc: "Kıyma, Guacamole sos, çıtır mısır tortillası.", cal: 480, time: 10, img: "images/taco.jpg", model: "models/taco.glb", tags: [{name:"🔥 Acı", class:"hot"}] }
    ]
};

// --- RENDER VE ARAMA MANTIĞI ---
const categoryList = document.getElementById('category-list');
const productList = document.getElementById('product-list');
const searchInput = document.getElementById('search-input');
let currentCategory = "Tümü";
let currentSearch = "";

function renderCategories() {
    categoryList.innerHTML = '';
    menuData.categories.forEach(cat => {
        const li = document.createElement('li');
        const btn = document.createElement('button');
        btn.className = `cat-btn ${cat === currentCategory ? 'active' : ''}`;
        btn.innerText = cat;
        btn.onclick = () => {
            currentCategory = cat;
            searchInput.value = ''; 
            currentSearch = '';
            renderCategories();
            renderProducts();
        };
        li.appendChild(btn);
        categoryList.appendChild(li);
    });
}

function renderProducts() {
    productList.innerHTML = '';
    
    let filteredItems = menuData.items;
    if (currentCategory !== "Tümü") filteredItems = filteredItems.filter(item => item.cat === currentCategory);
    if (currentSearch.trim() !== "") {
        const query = currentSearch.toLowerCase();
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(query) || 
            item.desc.toLowerCase().includes(query) ||
            item.tags.some(t => t.name.toLowerCase().includes(query))
        );
    }

    if (filteredItems.length === 0) {
        productList.innerHTML = '<p style="text-align:center; color:#6B7280; margin-top:20px;">Sonuç bulunamadı.</p>';
        return;
    }

    filteredItems.forEach(item => {
        const tagsHtml = item.tags.map(t => `<span class="tag ${t.class}">${t.name}</span>`).join('');
        const qty = cartState[item.id] || 0;
        
        let actionHtml = '';
        if(qty > 0) {
            actionHtml = `
            <div class="qty-controller" onclick="event.stopPropagation()">
                <button class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button>
                <span class="qty-val">${qty}</span>
                <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
            </div>`;
        } else {
            actionHtml = `<button class="add-btn" onclick="event.stopPropagation(); updateQty(${item.id}, 1)">+</button>`;
        }

        const div = document.createElement('div');
        div.className = 'product-card';
        div.onclick = () => openModal(item);
        div.innerHTML = `
            <div class="product-img-wrap">
                <img src="${item.img}" alt="${item.name}">
                <div class="badge-3d">3D AR</div>
            </div>
            <div class="product-details">
                <div class="product-tags">${tagsHtml}</div>
                <h3>${item.name}</h3>
                <p class="product-desc">${item.desc}</p>
                <div class="product-bottom">
                    <span class="product-price">${item.price} ₺</span>
                    ${actionHtml}
                </div>
            </div>
        `;
        productList.appendChild(div);
    });
}

searchInput.addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderProducts();
});

// --- BİLDİRİM (TOAST) SİSTEMİ ---
const toastContainer = document.getElementById('toast-container');
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${message}</span> <span>✓</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 2000);
}

// --- GELİŞMİŞ SEPET MANTIĞI (+ / - İLE) ---
let cartState = {}; // { itemId: quantity }
let activeOrder = false;

window.updateQty = function(itemId, delta) {
    if(!cartState[itemId]) cartState[itemId] = 0;
    
    cartState[itemId] += delta;
    
    if(cartState[itemId] <= 0) {
        delete cartState[itemId];
        if(delta < 0) showToast("Ürün sepetten çıkarıldı.");
    } else if (delta > 0) {
        showToast("Sepete eklendi.");
    }
    
    if(navigator.vibrate) navigator.vibrate(50);
    updateCartUI();
    renderProducts(); // Ürün listesindeki butonları güncelle
}

function updateCartUI() {
    const floatingCart = document.getElementById('floating-cart');
    const cartItemsList = document.getElementById('cart-items-list');
    
    let totalItems = 0;
    let totalPrice = 0;
    cartItemsList.innerHTML = '';

    Object.keys(cartState).forEach(id => {
        const item = menuData.items.find(i => i.id == id);
        const qty = cartState[id];
        totalItems += qty;
        totalPrice += (item.price * qty);

        cartItemsList.innerHTML += `
            <div class="cart-item-row">
                <div class="cart-item-info">
                    <h4>${item.name}</h4>
                    <div class="cart-item-price">${item.price} ₺</div>
                </div>
                <div class="qty-controller">
                    <button class="qty-btn" onclick="updateQty(${item.id}, -1)">-</button>
                    <span class="qty-val">${qty}</span>
                    <button class="qty-btn" onclick="updateQty(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
    });

    if(totalItems === 0) {
        floatingCart.classList.remove('visible');
        closeCartSheet();
    } else {
        floatingCart.classList.add('visible');
        document.getElementById('cart-count').innerText = `${totalItems} Ürün`;
        document.getElementById('cart-total').innerText = `${totalPrice.toFixed(2)} ₺`;
        document.getElementById('sheet-total-price').innerText = `${totalPrice.toFixed(2)} ₺`;
    }
}

// Sepet Çekmecesi Kontrolleri
const cartOverlay = document.getElementById('cart-sheet-overlay');
const cartSheet = document.getElementById('cart-sheet');

document.getElementById('view-cart-btn').onclick = () => {
    cartOverlay.classList.remove('hidden');
    cartSheet.classList.remove('hidden');
};
window.closeCartSheet = function() {
    cartSheet.classList.add('hidden');
    cartOverlay.classList.add('hidden');
}
document.getElementById('close-sheet-btn').onclick = closeCartSheet;
cartOverlay.onclick = closeCartSheet;

document.getElementById('confirm-order-btn').onclick = () => {
    activeOrder = true;
    showToast("Siparişiniz Mutfağa İletildi!");
    cartState = {}; // Sepeti boşalt
    updateCartUI();
    renderProducts();
    closeCartSheet();
};

// --- AKSİYON BAR İŞLEMLERİ (Garson, Puan, Sipariş) ---
window.callWaiter = function() {
    showToast("Garson masanıza yönlendirildi.");
}

const statusModal = document.getElementById('status-modal');
const ratingModal = document.getElementById('rating-modal');

window.openOrderStatus = function() {
    const statusText = document.getElementById('order-status-text');
    if(activeOrder) {
        statusText.innerHTML = "<strong style='color:#FF5A00; font-size:1.2rem;'>Hazırlanıyor 👨‍🍳</strong><br><br>Tahmini teslimat: 12 dakika";
    } else {
        statusText.innerText = "Henüz aktif bir siparişiniz bulunmuyor.";
    }
    statusModal.classList.remove('hidden');
}
window.closeStatusModal = () => statusModal.classList.add('hidden');

window.openRatingModal = function() { ratingModal.classList.remove('hidden'); }
window.closeRatingModal = () => ratingModal.classList.add('hidden');
window.submitRating = function(stars) {
    showToast(`${stars} Yıldız verdiniz. Teşekkürler!`);
    closeRatingModal();
}

// --- 3D MODAL MANTIĞI ---
const modal = document.getElementById('model-modal');
const viewerContainer = document.getElementById('3d-viewer');
const loaderWrapper = document.getElementById('loader-wrapper');

let modalScene, modalCamera, modalRenderer, modalControls, currentModalModel;

function openModal(item) {
    document.getElementById('modal-title').innerText = item.name;
    document.getElementById('modal-price').innerText = `${item.price} ₺`;
    document.getElementById('modal-desc').innerText = item.desc;
    document.getElementById('modal-calories').innerText = item.cal;
    document.getElementById('modal-time').innerText = item.time;
    
    document.getElementById('modal-tags').innerHTML = item.tags.map(t => `<span class="tag ${t.class}">${t.name}</span>`).join('');
    
    const addBtn = document.getElementById('modal-add-btn');
    addBtn.onclick = () => {
        updateQty(item.id, 1);
        closeModal();
    };

    const arLink = document.getElementById('ar-link');
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const modelFileName = item.model.split('/').pop().replace('.glb', '');

    if (isIOS) {
        arLink.href = `models/${modelFileName}.usdz#allowsContentScaling=0`;
        arLink.setAttribute('rel', 'ar');
    } else {
        arLink.removeAttribute('rel');
        arLink.href = `ar-viewer.html?model=${modelFileName}`;
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    setupModal3D();
    loadModalModel(item.model);
}

function setupModal3D() {
    if (modalScene) return;
    modalScene = new THREE.Scene();
    modalRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    modalRenderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
    modalRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    viewerContainer.appendChild(modalRenderer.domElement);

    modalCamera = new THREE.PerspectiveCamera(40, viewerContainer.clientWidth / viewerContainer.clientHeight, 0.1, 1000);
    modalCamera.position.set(0, 1.5, 8);
    
    modalScene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 5, 5);
    modalScene.add(dirLight);
    
    modalControls = new OrbitControls(modalCamera, modalRenderer.domElement);
    modalControls.enableDamping = true;
    modalControls.autoRotate = true;
    modalControls.autoRotateSpeed = 2.0;
    modalControls.enableZoom = false; 

    function animate() {
        requestAnimationFrame(animate);
        modalControls.update();
        modalRenderer.render(modalScene, modalCamera);
    }
    animate();
}

function loadModalModel(path) {
    const loader = new GLTFLoader();
    loaderWrapper.style.display = 'flex'; 

    loader.load(path, (gltf) => {
        loaderWrapper.style.display = 'none'; 
        if (currentModalModel) modalScene.remove(currentModalModel);
        currentModalModel = gltf.scene;
        
        const box = new THREE.Box3().setFromObject(currentModalModel);
        const center = box.getCenter(new THREE.Vector3());
        currentModalModel.position.sub(center);
        
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        currentModalModel.scale.setScalar(3.5 / maxDim); 
        
        modalScene.add(currentModalModel);
    }, undefined, () => { loaderWrapper.style.display = 'none'; });
}

function closeModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    if (currentModalModel) { modalScene.remove(currentModalModel); currentModalModel = null; }
}

document.getElementById('close-btn').onclick = closeModal;

window.addEventListener('load', () => {
    renderCategories();
    renderProducts();
});