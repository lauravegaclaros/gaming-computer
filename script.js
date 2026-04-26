// ========== CONFIGURACIÓN DE FIREBASE ==========
// ⚠️ IMPORTANTE: REEMPLAZA esto con los datos de TU proyecto
const firebaseConfig = {
  apiKey: "AIzaSyDZs60_QB-0XxiTDSWpU7S2U-IXwJob_-g",
  authDomain: "gaming-computer-bab13.firebaseapp.com",
  databaseURL: "https://gaming-computer-bab13-default-rtdb.firebaseio.com",
  projectId: "gaming-computer-bab13",
  storageBucket: "gaming-computer-bab13.firebasestorage.app",
  messagingSenderId: "865232123365",
  appId: "1:865232123365:web:1de5fd497495aaeb622b0c"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Variables globales
let products = [];
let categories = [];
let cart = [];
let currentUserRole = 'invitado';
let currentLang = 'es';
let currentCategory = 'all';

// Traducciones
const translations = {
    es: { nav_home: "Inicio", nav_products: "Productos", nav_cart: "Carrito", nav_admin: "Admin", login: "Iniciar Sesión", logout: "Cerrar Sesión", welcome_title: "BIENVENIDO A GAMING COMPUTER", welcome_subtitle: "Los mejores accesorios informáticos y componentes gaming en Bolivia", products_title: "Nuestros Productos", cart_title: "Tu Carrito", checkout_btn: "Finalizar Pedido", admin_title: "Panel de Administración", admin_products: "Productos", admin_categories: "Categorías", admin_users: "Usuarios", admin_orders: "Pedidos", empty_cart: "Tu carrito está vacío", total: "Total", currency: "Bs" },
    en: { nav_home: "Home", nav_products: "Products", nav_cart: "Cart", nav_admin: "Admin", login: "Login", logout: "Logout", welcome_title: "WELCOME TO GAMING COMPUTER", welcome_subtitle: "The best computer accessories in Bolivia", products_title: "Our Products", cart_title: "Your Cart", checkout_btn: "Checkout", admin_title: "Admin Panel", admin_products: "Products", admin_categories: "Categories", admin_users: "Users", admin_orders: "Orders", empty_cart: "Your cart is empty", total: "Total", currency: "Bs" },
    qu: { nav_home: "Wasiman", nav_products: "Imakuna", nav_cart: "Rantina", nav_admin: "Kamachiq", login: "Yaykuy", logout: "Lluqsichiy", welcome_title: "GAMING COMPUTERMAN SUTIYAYKUY", welcome_subtitle: "Allin informática imakuna Boliviapi", products_title: "Imakuna", cart_title: "Rantina", checkout_btn: "Rantiy", admin_title: "Kamachiq tablero", admin_products: "Imakuna", admin_categories: "Katiguriyakuna", admin_users: "Runakuna", admin_orders: "Nachakuna", empty_cart: "Canastayki ch'usaqmi", total: "Llapan chanin", currency: "Bs" }
};

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast`;
    toast.innerHTML = `<div>Gaming Computer</div><div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== CATEGORÍAS DINÁMICAS ==========
async function loadCategories() {
    const snapshot = await database.ref('categories').once('value');
    const data = snapshot.val();
    if (data) {
        categories = Object.entries(data).map(([id, cat]) => ({ id, ...cat }));
    } else {
        categories = [
            { id: "cat1", name: "Gabinetes", icon: "📦" },
            { id: "cat2", name: "Laptops", icon: "💻" },
            { id: "cat3", name: "Procesadores", icon: "⚙️" },
            { id: "cat4", name: "Teclados", icon: "⌨️" },
            { id: "cat5", name: "Monitores", icon: "🖥️" },
            { id: "cat6", name: "Periféricos", icon: "🎮" }
        ];
        await saveCategoriesToFirebase();
    }
    renderCategoryFilters();
    renderCategorySelect();
    if (currentUserRole === 'admin' || currentUserRole === 'asistente') renderAdminCategories();
}

async function saveCategoriesToFirebase() {
    const updates = {};
    categories.forEach(cat => { updates[`categories/${cat.id}`] = { name: cat.name, icon: cat.icon }; });
    await database.ref().update(updates);
}

function renderCategoryFilters() {
    const container = document.getElementById('category-filters');
    if (!container) return;
    container.innerHTML = `<button class="filter-btn ${currentCategory === 'all' ? 'active' : ''}" onclick="filterProducts('all')">📋 Todos</button>` +
        categories.map(cat => `<button class="filter-btn ${currentCategory === cat.id ? 'active' : ''}" onclick="filterProducts('${cat.id}')">${cat.icon} ${cat.name}</button>`).join('');
}

function renderCategorySelect() {
    const select = document.getElementById('product-category');
    if (!select) return;
    select.innerHTML = categories.map(cat => `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`).join('');
}

async function saveCategory() {
    const id = document.getElementById('category-id').value;
    const name = document.getElementById('category-name').value;
    const icon = document.getElementById('category-icon').value || '📦';
    if (!name) { showToast('El nombre es requerido', 'error'); return; }
    if (id) {
        await database.ref(`categories/${id}`).update({ name, icon });
        showToast('Categoría actualizada', 'success');
    } else {
        const newId = Date.now().toString();
        await database.ref(`categories/${newId}`).set({ name, icon });
        showToast('Categoría creada', 'success');
    }
    closeCategoryModal();
    await loadCategories();
    await loadProducts();
}

async function deleteCategory(categoryId) {
    const productsInCategory = products.filter(p => p.category === categoryId);
    if (productsInCategory.length > 0) {
        showToast(`No se puede eliminar: ${productsInCategory.length} productos usan esta categoría`, 'error');
        return;
    }
    if (confirm('¿Eliminar esta categoría?')) {
        await database.ref(`categories/${categoryId}`).remove();
        showToast('Categoría eliminada', 'info');
        await loadCategories();
        await loadProducts();
    }
}

function renderAdminCategories() {
    const container = document.getElementById('admin-categories-list');
    if (!container) return;
    container.innerHTML = categories.map(cat => `
        <div class="category-card">
            <div style="font-size: 3rem;">${cat.icon}</div>
            <h3>${cat.name}</h3>
            <div class="product-actions">
                <button onclick="editCategory('${cat.id}')">Editar</button>
                <button onclick="deleteCategory('${cat.id}')">Eliminar</button>
            </div>
        </div>
    `).join('');
}

function editCategory(categoryId) {
    const cat = categories.find(c => c.id === categoryId);
    if (cat) {
        document.getElementById('category-id').value = cat.id;
        document.getElementById('category-name').value = cat.name;
        document.getElementById('category-icon').value = cat.icon;
        document.getElementById('category-modal-title').innerText = 'Editar Categoría';
        document.getElementById('category-modal').style.display = 'block';
    }
}

// ========== PRODUCTOS ==========
async function loadProducts() {
    const snapshot = await database.ref('products').once('value');
    const data = snapshot.val();
    if (data) {
        products = Object.entries(data).map(([id, product]) => ({ id, ...product }));
    } else {
        products = [
            { id: "1", name: "Gabinete Gamer RGB", price: 189.90, stock: 15, category: "cat1", image: "📦" },
            { id: "2", name: "Teclado Mecánico RGB", price: 129.90, stock: 25, category: "cat4", image: "⌨️" },
            { id: "3", name: "Mouse Gamer 6400 DPI", price: 79.90, stock: 30, category: "cat6", image: "🖱️" },
            { id: "4", name: "Laptop Gamer RTX 4060", price: 4299.90, stock: 5, category: "cat2", image: "💻" },
            { id: "5", name: "Monitor Curvo 27\"", price: 899.90, stock: 12, category: "cat5", image: "🖥️" }
        ];
        await saveProductsToFirebase();
    }
    displayProducts();
}

async function saveProductsToFirebase() {
    const updates = {};
    products.forEach(product => {
        updates[`products/${product.id}`] = {
            name: product.name, price: product.price, stock: product.stock,
            category: product.category, image: product.image
        };
    });
    await database.ref().update(updates);
}

function filterProducts(category) {
    currentCategory = category;
    renderCategoryFilters();
    displayProducts();
}

function displayProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;
    let filtered = currentCategory === 'all' ? products : products.filter(p => p.category === currentCategory);
    container.innerHTML = filtered.map(product => `<div class="product-card">
        <div style="font-size: 3rem;">${product.image || '🎮'}</div>
        <h3>${product.name}</h3>
        <div class="product-price">${translations[currentLang].currency} ${product.price.toFixed(2)}</div>
        <div>Stock: ${product.stock}</div>
        <button onclick="addToCart('${product.id}')">Añadir</button>
        ${(currentUserRole === 'admin' || currentUserRole === 'asistente') ? `
            <div class="product-actions">
                <button onclick="editProduct('${product.id}')">Editar</button>
                <button onclick="deleteProduct('${product.id}')">Eliminar</button>
            </div>
        ` : ''}
    </div>`).join('');
    
    const adminContainer = document.getElementById('admin-products-list');
    if (adminContainer) {
        adminContainer.innerHTML = products.map(product => `<div class="product-card"><h3>${product.name}</h3><div>${translations[currentLang].currency} ${product.price.toFixed(2)}</div><div>Stock: ${product.stock}</div><div class="product-actions"><button onclick="editProduct('${product.id}')">Editar</button><button onclick="deleteProduct('${product.id}')">Eliminar</button></div></div>`).join('');
    }
}

async function saveProduct() {
    const id = document.getElementById('product-id').value;
    const product = {
        name: document.getElementById('product-name').value,
        price: parseFloat(document.getElementById('product-price').value),
        stock: parseInt(document.getElementById('product-stock').value),
        category: document.getElementById('product-category').value,
        image: document.getElementById('product-image').value || '🎮'
    };
    if (id) {
        await database.ref(`products/${id}`).update(product);
        showToast('Producto actualizado', 'success');
    } else {
        const newId = Date.now().toString();
        await database.ref(`products/${newId}`).set(product);
        showToast('Producto creado', 'success');
    }
    closeProductModal();
    await loadProducts();
}

async function deleteProduct(productId) {
    if (confirm('¿Eliminar este producto?')) {
        await database.ref(`products/${productId}`).remove();
        showToast('Producto eliminado', 'info');
        await loadProducts();
    }
}

function editProduct(productId) {
    const product = products.find(p => p.id === productId);
    if (product) {
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-image').value = product.image || '';
        document.getElementById('product-modal-title').innerText = 'Editar Producto';
        document.getElementById('product-modal').style.display = 'block';
    }
}

// ========== CARRITO ==========
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const existing = cart.find(item => item.id === productId);
    if (existing) existing.quantity++;
    else cart.push({ ...product, quantity: 1 });
    updateCartCount();
    showToast(`${product.name} añadido al carrito`, 'success');
    if (document.getElementById('cart-page').classList.contains('active')) displayCart();
}

function updateCartCount() {
    const count = cart.reduce((s, i) => s + i.quantity, 0);
    const span = document.getElementById('cart-count');
    if (span) span.innerText = count;
}

function displayCart() {
    const container = document.getElementById('cart-container');
    const totalContainer = document.getElementById('cart-total');
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = `<p>${translations[currentLang].empty_cart}</p>`;
        if (totalContainer) totalContainer.innerHTML = '';
        return;
    }
    container.innerHTML = cart.map(item => `<div class="cart-item">
        <div><strong>${item.name}</strong><br>${translations[currentLang].currency} ${item.price.toFixed(2)}</div>
        <div>
            <button onclick="updateQty('${item.id}', -1)">-</button>
            <span style="margin:0 10px;">${item.quantity}</span>
            <button onclick="updateQty('${item.id}', 1)">+</button>
            <button onclick="removeFromCart('${item.id}')">🗑️</button>
        </div>
        <div>${translations[currentLang].currency} ${(item.price * item.quantity).toFixed(2)}</div>
    </div>`).join('');
    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    if (totalContainer) totalContainer.innerHTML = `<strong>${translations[currentLang].total}: ${translations[currentLang].currency} ${total.toFixed(2)}</strong>`;
}

function updateQty(id, change) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) removeFromCart(id);
        else { displayCart(); updateCartCount(); }
    }
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    displayCart();
    updateCartCount();
}

function checkout() {
    if (cart.length === 0) {
        showToast('Agrega productos al carrito', 'error');
        return;
    }
    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const msg = `Hola, quiero comprar:%0A${cart.map(i => `- ${i.name} x${i.quantity}: Bs ${(i.price * i.quantity).toFixed(2)}`).join('%0A')}%0ATOTAL: Bs ${total.toFixed(2)}`;
    window.open(`https://wa.me/59176543210?text=${msg}`, '_blank');
}

// ========== AUTENTICACIÓN ==========
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Bienvenido', 'success');
        closeLoginModal();
    } catch (error) { showToast(error.message, 'error'); }
}

async function register() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await database.ref(`users/${cred.user.uid}`).set({ name, email, role });
        showToast('Registro exitoso', 'success');
        closeRegisterModal();
    } catch (error) { showToast(error.message, 'error'); }
}

function logout() {
    auth.signOut();
    showToast('Sesión cerrada', 'info');
    updateAuthUI();
}

function updateAuthUI() {
    const isLogged = currentUserRole !== 'invitado';
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const adminLinks = document.getElementById('admin-links');
    if (loginBtn) loginBtn.style.display = isLogged ? 'none' : 'inline-block';
    if (logoutBtn) logoutBtn.style.display = isLogged ? 'inline-block' : 'none';
    if (adminLinks) adminLinks.style.display = (currentUserRole === 'admin' || currentUserRole === 'asistente') ? 'inline-block' : 'none';
}

// Escuchar cambios en autenticación
auth.onAuthStateChanged(async (user) => {
    if (user) {
        const snap = await database.ref(`users/${user.uid}`).once('value');
        const userData = snap.val();
        currentUserRole = userData?.role || 'cliente';
    } else {
        currentUserRole = 'invitado';
    }
    updateAuthUI();
    if (currentUserRole === 'admin' || currentUserRole === 'asistente') {
        renderAdminCategories();
    }
});

// ========== UI HELPERS ==========
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) pageElement.classList.add('active');
    if (page === 'products') displayProducts();
    if (page === 'cart') displayCart();
    if (page === 'admin' && (currentUserRole === 'admin' || currentUserRole === 'asistente')) {
        renderAdminCategories();
        showAdminTab('products');
    }
}

function showAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
    const tabElement = document.getElementById(`admin-${tab}-tab`);
    if (tabElement) tabElement.style.display = 'block';
}

function showLoginModal() { 
    const modal = document.getElementById('login-modal');
    if (modal) modal.style.display = 'block';
}
function closeLoginModal() { 
    const modal = document.getElementById('login-modal');
    if (modal) modal.style.display = 'none';
}
function showRegisterModal() { 
    closeLoginModal(); 
    const modal = document.getElementById('register-modal');
    if (modal) modal.style.display = 'block';
}
function closeRegisterModal() { 
    const modal = document.getElementById('register-modal');
    if (modal) modal.style.display = 'none';
}
function showProductModal() {
    document.getElementById('product-id').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-stock').value = '';
    document.getElementById('product-image').value = '';
    document.getElementById('product-modal-title').innerText = 'Agregar Producto';
    const modal = document.getElementById('product-modal');
    if (modal) modal.style.display = 'block';
}
function closeProductModal() { 
    const modal = document.getElementById('product-modal');
    if (modal) modal.style.display = 'none';
}
function showCategoryModal() {
    document.getElementById('category-id').value = '';
    document.getElementById('category-name').value = '';
    document.getElementById('category-icon').value = '';
    document.getElementById('category-modal-title').innerText = 'Agregar Categoría';
    const modal = document.getElementById('category-modal');
    if (modal) modal.style.display = 'block';
}
function closeCategoryModal() { 
    const modal = document.getElementById('category-modal');
    if (modal) modal.style.display = 'none';
}

function changeLanguage() {
    const select = document.getElementById('language-select');
    if (select) currentLang = select.value;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = translations[currentLang][key];
            } else {
                el.innerText = translations[currentLang][key];
            }
        }
    });
    displayProducts();
    displayCart();
}

// ========== INICIALIZAR ==========
loadCategories();
loadProducts();
updateCartCount();
