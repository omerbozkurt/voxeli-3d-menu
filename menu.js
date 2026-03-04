import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- HAFIZA VE DURUM YÖNETİMİ ---
const modelCache = new Map(); 
let cartState = {}; 
let activeOrder = false;

// --- İNTRO VE MASA YÖNETİMİ ---
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

window.changeTable = function() {
    if(confirm("Masayı değiştirmek mevcut sepetinizi sıfırlayacaktır. Onaylıyor musunuz?")) {
        cartState = {}; 
        activeOrder = false;
        updateCartUI();
        renderProducts();
        mainApp.classList.add('hidden');
        introScreen.classList.remove('hidden');
    }
}

// --- VERİTABANI (UX Copywriting İyileştirmeleri Yapıldı) ---
const menuData = {
    categories: ["Tüm Lezzetler", "Burgerler", "Pizzalar", "Tatlılar", "Uzak Doğu", "Meksika"],
    items: [
        { id: 1, cat: "Burgerler", name: "Truffle Burger", price: 280, desc: "150g sulu dana eti, eritilmiş Cheddar, karamelize soğan ve ev yapımı trüf mayonezli imza lezzetimiz.", cal: 850, time: 15, img: "images/hamburger.jpg", model: "models/hamburger.glb", tags: [{name:"⭐ Popüler", class:"star"}] },
        { id: 2, cat: "Pizzalar", name: "Margherita", price: 310, desc: "İncecik hamur üzerinde taze İtalyan domates sosu, manda mozzarellası ve taze fesleğen yaprakları.", cal: 720, time: 20, img: "images/pizza.jpg", model: "models/pizza.glb", tags: [{name:"🌱 Vejetaryen", class:"vegan"}] },
        { id: 3, cat: "Tatlılar", name: "San Sebastian", price: 160, desc: "Dışı mükemmel kızarmış, içi kremsi ve akışkan klasik İspanyol lezzeti. Taze frambuaz sosu eşliğinde.", cal: 540, time: 5, img: "images/cheesecake.jpg", model: "models/cheesecake.glb", tags: [] },
        { id: 4, cat: "Uzak Doğu", name: "Sushi Roll", price: 380, desc: "Taze Norveç somonu, olgun avokado ve krem peynirin özel suşi pirinciyle enfes buluşması.", cal: 420, time: 25, img: "images/sushi.jpg", model: "models/sushi.glb", tags: [{name:"⭐ Popüler", class:"star"}] },
        { id: 5, cat: "Meksika", name: "Taco", price: 240, desc: "Gevrek mısır tortillası içinde baharatlı dana kıyma, taze guacamole, pico de gallo ve süzme yoğurt.", cal: 480, time: 10, img: "images/taco.jpg", model: "models/taco.glb", tags: [{name:"🔥 Acı", class:"hot"}] }
    ]
};

// --- RENDER VE ARAMA MANTIĞI ---
const categoryList = document.getElementById('category-list');
const productList = document.getElementById('product-list');
const searchInput = document.getElementById('search-input');
let currentCategory = "Tüm Lezzetler";
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
    if (currentCategory !== "Tüm Lezzetler") filteredItems = filteredItems.filter(item => item.cat === currentCategory);
    if (currentSearch.trim() !== "") {
        const query = currentSearch.toLowerCase();
        filteredItems = filteredItems.filter(item => 
            item.name.toLowerCase().includes(query) || 
            item.desc.toLowerCase().includes(query) ||
            item.tags.some(t => t.name.toLowerCase().includes(query))
        );
    }

    if (filteredItems.length === 0) {
        // İyileştirilmiş Boş Durum (Empty State) Mesajı
        productList.innerHTML = `
            <div style="text-align:center; padding: 40px 20px;">
                <p style="font-size: 2rem; margin-bottom: 10px;">🍽️</p>
                <h3 style="color: #111827; margin: 0 0 10px;">Hmm... Bulamadık.</h3>
                <p style="color: #6B7280; font-size: 0.9rem; line-height: 1.5; margin: 0;">Aradığınız lezzet şu an menümüzde yok gibi görünüyor.<br>Farklı bir kategori denemeye ne dersiniz?</p>
            </div>
        `;
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

// --- BİLDİRİM (TOAST) ---
const toastContainer = document.getElementById('toast-container');
window.showToast = function(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>${message}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('animationend', () => toast.remove());
    }, 2500);
}

// --- SEPET MANTIĞI ---
window.updateQty = function(itemId, delta) {
    if(!cartState[itemId]) cartState[itemId] = 0;
    
    cartState[itemId] += delta;
    
    if(cartState[itemId] <= 0) {
        delete cartState[itemId];
        if(delta < 0) showToast("Ürün sepetten çıkarıldı.");
    } else if (delta > 0) {
        showToast("Nefis bir seçim! Sepete eklendi 😋");
    }
    
    if(navigator.vibrate) navigator.vibrate(50);
    updateCartUI();
    renderProducts(); 
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
        document.getElementById('cart-count').innerText = `${totalItems} Seçim`;
        document.getElementById('cart-total').innerText = `${totalPrice.toFixed(2)} ₺`;
        document.getElementById('sheet-total-price').innerText = `${totalPrice.toFixed(2)} ₺`;
    }
}

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
    showToast("Harika! Siparişiniz şeflerimize iletildi 👨‍🍳");
    cartState = {}; 
    updateCartUI();
    renderProducts();
    closeCartSheet();
};

// --- AKSİYON BAR İŞLEMLERİ ---
window.callWaiter = function() { showToast("Ekibimiz hemen masanıza yönlendiriliyor 👍"); }

const statusModal = document.getElementById('status-modal');
const ratingModal = document.getElementById('rating-modal');

window.openOrderStatus = function() {
    const statusText = document.getElementById('order-status-text');
    if(activeOrder) {
        statusText.innerHTML = "<strong style='color:#FF5A00; font-size:1.3rem;'>Şu an Hazırlanıyor 👨‍🍳</strong><br><br>Siparişiniz ustalıkla hazırlanıyor. Tahmini servis süresi: 12 dakika.";
    } else {
        statusText.innerHTML = "Şu an masanıza ait aktif bir sipariş bulunmuyor.<br>Menümüzü keşfetmeye ne dersiniz?";
    }
    statusModal.classList.remove('hidden');
}
window.closeStatusModal = () => statusModal.classList.add('hidden');

window.openRatingModal = function() { ratingModal.classList.remove('hidden'); }
window.closeRatingModal = () => ratingModal.classList.add('hidden');
window.submitRating = function(stars) {
    let msg = stars >= 4 ? "Harika puanınız için çok teşekkür ederiz! ❤️" : "Değerlendirmeniz için teşekkürler, kendimizi geliştireceğiz.";
    showToast(msg);
    closeRatingModal();
}

// --- 3D VE MODAL MANTIĞI ---
const modal = document.getElementById('model-modal');
const viewerContainer = document.getElementById('3d-viewer');
const loaderWrapper = document.getElementById('loader-wrapper');

let modalScene, modalCamera, modalRenderer, modalControls, currentModalModel;

window.openModal = function(item) {
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
        arLink.href = `models/${modelFileName}.usdz#allowsContentScaling=1`;
        arLink.setAttribute('rel', 'ar');
    } else {
        arLink.removeAttribute('rel');
        arLink.href = `ar-viewer.html?model=${modelFileName}`;
    }

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    init3DEngine();
    loadModalModel(item.model);
}

function init3DEngine() {
    if (modalRenderer) return;
    
    modalScene = new THREE.Scene();
    modalCamera = new THREE.PerspectiveCamera(40, viewerContainer.clientWidth / viewerContainer.clientHeight, 0.1, 1000);
    modalCamera.position.set(0, 2, 10);
    
    modalRenderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance", precision: "lowp" });
    modalRenderer.setSize(viewerContainer.clientWidth, viewerContainer.clientHeight);
    modalRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.2));
    viewerContainer.appendChild(modalRenderer.domElement);

    modalScene.add(new THREE.AmbientLight(0xffffff, 1.5));
    
    modalControls = new OrbitControls(modalCamera, modalRenderer.domElement);
    modalControls.enableDamping = true;
    modalControls.autoRotate = true;
    modalControls.enableZoom = false;

    function animate() {
        requestAnimationFrame(animate);
        modalControls.update();
        modalRenderer.render(modalScene, modalCamera);
    }
    animate();
}

function loadModalModel(path) {
    loaderWrapper.style.display = 'flex'; 

    if (currentModalModel) modalScene.remove(currentModalModel);

    // Cache'den Yükle
    if (modelCache.has(path)) {
        currentModalModel = modelCache.get(path).clone();
        modalScene.add(currentModalModel);
        loaderWrapper.style.display = 'none';
        return;
    }

    const loader = new GLTFLoader();
    loader.load(path, (gltf) => {
        const model = gltf.scene;
        
        // Performans Optimizasyonu
        model.traverse(n => {
            if (n.isMesh && n.material) {
                n.material.precision = "lowp";
                n.castShadow = false;
                n.receiveShadow = false;
            }
        });

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        model.scale.setScalar(4.0 / maxDim); 
        
        modelCache.set(path, model); // Hafızaya al
        currentModalModel = model;
        modalScene.add(currentModalModel);
        
        loaderWrapper.style.display = 'none'; 
    });
}

window.closeModal = function() {
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
    if (currentModalModel) { modalScene.remove(currentModalModel); currentModalModel = null; }
}

document.getElementById('close-btn').onclick = closeModal;

// Başlangıç
window.addEventListener('load', () => {
    renderCategories();
    renderProducts();
});