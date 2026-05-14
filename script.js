// ========== CONFIGURACIÓN DE FIREBASE ==========
// ⚠️ REEMPLAZA con los datos de TU proyecto Firebase
const firebaseConfig = {
    apiKey: "AIzaSyDZs60_QB-0XxiTDSWpU7S2U-IXwJob_-g",
  authDomain: "gaming-computer-bab13.firebaseapp.com",
  projectId: "gaming-computer-bab13",
  storageBucket: "gaming-computer-bab13.firebasestorage.app",
  messagingSenderId: "865232123365",
  appId: "1:865232123365:web:1de5fd497495aaeb622b0c"
};

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
let currentUser = null;

// ========== FUNCIONES AUXILIARES ==========
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<strong>Gaming Computer</strong><br>${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== SUBIDA DE IMÁGENES A IMGBB ==========
function setupImageUpload() {
    const fileInput = document.getElementById('product-image-file');
    if (!fileInput) return;
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showToast('Selecciona una imagen válida', 'error');
            return;
        }
        
        const statusDiv = document.getElementById('upload-status');
        statusDiv.innerHTML = '📤 Subiendo imagen...';
        
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            const response = await fetch('https://api.imgbb.com/1/upload?key=6d207e02198a847aa98d0a2a901485a5', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            
            if (result.success) {
                const imageUrl = result.data.url;
                document.getElementById('product-image-url').value = imageUrl;
                const preview = document.getElementById('image-preview');
                const previewImg = document.getElementById('image-preview-img');
                previewImg.src = imageUrl;
                preview.style.display = 'block';
                statusDiv.innerHTML = '✅ Imagen subida correctamente';
                showToast('Imagen subida con éxito');
            } else {
                statusDiv.innerHTML = '❌ Error al subir';
                showToast('Error al subir imagen', 'error');
            }
        } catch (error) {
            statusDiv.innerHTML = '❌ Error de conexión';
            showToast('Error de conexión', 'error');
        }
    };
}

function clearImagePreview() {
    document.getElementById('product-image-url').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('upload-status').innerHTML = '';
    document.getElementById('product-image-file').value = '';
}

function setCategoryIcon(icon) {
    document.getElementById('category-icon').value = icon;
}

// ========== CATEGORÍAS ==========
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
        showToast('Categoría actualizada');
    } else {
        const newId = Date.now().toString();
        await database.ref(`categories/${newId}`).set({ name, icon });
        showToast('Categoría creada');
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
        showToast('Categoría eliminada');
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
                <button onclick="editCategory('${cat.id}')">✏️ Editar</button>
                <button onclick="deleteCategory('${cat.id}')">🗑️ Eliminar</button>
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
        document.getElementById('category-modal-title').innerText = '✏️ Editar Categoría';
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
        products = [];
        await saveProductsToFirebase();
    }
    displayProducts();
}

async function saveProductsToFirebase() {
    const updates = {};
    products.forEach(product => {
        updates[`products/${product.id}`] = {
            name: product.name, price: product.price, stock: product.stock,
            category: product.category, imageUrl: product.imageUrl || null
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
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="text-align:center;">No hay productos en esta categoría</p>';
    } else {
        container.innerHTML = filtered.map(product => `
            <div class="product-card">
                ${product.imageUrl ? 
                    `<img src="${product.imageUrl}" class="product-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Ctext y=%27.9em%27 font-size=%2790%27%3E🎮%3C/text%3E%3C/svg%3E'">` :
                    `<div style="font-size: 4rem; text-align: center;">🎮</div>`
                }
                <h3>${product.name}</h3>
                <div class="product-price">Bs ${product.price.toFixed(2)}</div>
                <div>📦 Stock: ${product.stock}</div>
                <button onclick="addToCart('${product.id}')">🛒 Añadir al Carrito</button>
                ${(currentUserRole === 'admin' || currentUserRole === 'asistente') ? `
                    <div class="product-actions">
                        <button onclick="editProduct('${product.id}')">✏️ Editar</button>
                        <button onclick="deleteProduct('${product.id}')">🗑️ Eliminar</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }
    
    const adminContainer = document.getElementById('admin-products-list');
    if (adminContainer && (currentUserRole === 'admin' || currentUserRole === 'asistente')) {
        if (products.length === 0) {
            adminContainer.innerHTML = '<p>No hay productos. Agrega tu primer producto.</p>';
        } else {
            adminContainer.innerHTML = products.map(product => `
                <div class="product-card">
                    ${product.imageUrl ? 
                        `<img src="${product.imageUrl}" class="product-image" style="height:100px; width:100px; object-fit:contain;">` : 
                        `<div style="font-size:2rem;">🎮</div>`
                    }
                    <h3>${product.name}</h3>
                    <div>Bs ${product.price.toFixed(2)}</div>
                    <div>Stock: ${product.stock}</div>
                    <div class="product-actions">
                        <button onclick="editProduct('${product.id}')">✏️ Editar</button>
                        <button onclick="deleteProduct('${product.id}')">🗑️ Eliminar</button>
                    </div>
                </div>
            `).join('');
        }
    }
}

async function saveProduct() {
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const stock = parseInt(document.getElementById('product-stock').value);
    const category = document.getElementById('product-category').value;
    const imageUrl = document.getElementById('product-image-url').value;
    
    if (!name || isNaN(price) || isNaN(stock)) {
        showToast('Todos los campos son requeridos', 'error');
        return;
    }
    
    const product = {
        name, price, stock, category,
        imageUrl: imageUrl || null,
        updatedAt: new Date().toISOString()
    };
    
    try {
        if (id) {
            await database.ref(`products/${id}`).update(product);
            showToast('Producto actualizado');
        } else {
            const newId = Date.now().toString();
            await database.ref(`products/${newId}`).set(product);
            showToast('Producto creado');
        }
        closeProductModal();
        await loadProducts();
    } catch (error) {
        showToast('Error al guardar producto', 'error');
    }
}

async function deleteProduct(productId) {
    if (confirm('¿Eliminar este producto?')) {
        await database.ref(`products/${productId}`).remove();
        showToast('Producto eliminado');
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
        document.getElementById('product-image-url').value = product.imageUrl || '';
        
        if (product.imageUrl) {
            const preview = document.getElementById('image-preview');
            const previewImg = document.getElementById('image-preview-img');
            previewImg.src = product.imageUrl;
            preview.style.display = 'block';
        } else {
            clearImagePreview();
        }
        
        document.getElementById('product-modal-title').innerText = '✏️ Editar Producto';
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
    showToast(`${product.name} añadido al carrito`);
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
        container.innerHTML = '<p>🛒 Tu carrito está vacío</p>';
        if (totalContainer) totalContainer.innerHTML = '';
        return;
    }
    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div><strong>${item.name}</strong><br>Bs ${item.price.toFixed(2)}</div>
            <div>
                <button onclick="updateQty('${item.id}', -1)">-</button>
                <span style="margin:0 10px;">${item.quantity}</span>
                <button onclick="updateQty('${item.id}', 1)">+</button>
                <button onclick="removeFromCart('${item.id}')">🗑️</button>
            </div>
            <div>Bs ${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');
    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    if (totalContainer) totalContainer.innerHTML = `<strong>💰 Total: Bs ${total.toFixed(2)}</strong>`;
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
    const order = {
        items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
        total: total,
        status: 'pendiente',
        createdAt: new Date().toISOString(),
        customerEmail: auth.currentUser ? auth.currentUser.email : 'invitado',
        customerName: auth.currentUser ? auth.currentUser.email : 'Invitado'
    };
    
    database.ref('orders').push(order).then(() => {
        const msg = `Hola, quiero comprar:%0A${cart.map(i => `- ${i.name} x${i.quantity}: Bs ${(i.price * i.quantity).toFixed(2)}`).join('%0A')}%0ATOTAL: Bs ${total.toFixed(2)}%0A%0A Mi correo: ${auth.currentUser?.email || 'invitado'}`;
        window.open(`https://wa.me/59176543210?text=${msg}`, '_blank');
        cart = [];
        updateCartCount();
        displayCart();
        showToast('✅ Pedido realizado con éxito');
    }).catch(error => {
        showToast('Error al guardar pedido', 'error');
    });
}

// ========== USUARIOS ==========
async function loadUsers() {
    if (currentUserRole !== 'admin') return;
    const snapshot = await database.ref('users').once('value');
    const users = snapshot.val();
    const container = document.getElementById('users-list');
    if (!container) return;
    
    if (!users || Object.keys(users).length === 0) {
        container.innerHTML = '<p>No hay usuarios registrados</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="users-table">
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Acciones</th></tr></thead>
            <tbody>
                ${Object.entries(users).map(([uid, user]) => `
                    <tr>
                        <td>${user.name || '-'}</td>
                        <td>${user.email}</td>
                        <td>
                            <select onchange="updateUserRole('${uid}', this.value)">
                                <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>👤 Cliente</option>
                                <option value="asistente" ${user.role === 'asistente' ? 'selected' : ''}>🛠️ Asistente</option>
                                <option value="vendedor" ${user.role === 'vendedor' ? 'selected' : ''}>💰 Vendedor</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>👑 Admin</option>
                            </select>
                        </td>
                        <td><button onclick="deleteUser('${uid}')">🗑️ Eliminar</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <button onclick="showRegisterModal()" class="btn-primary" style="margin-top: 1rem;">+ Agregar Usuario</button>
    `;
}

async function updateUserRole(uid, newRole) {
    await database.ref(`users/${uid}/role`).set(newRole);
    showToast('Rol actualizado');
    loadUsers();
}

async function deleteUser(uid) {
    if (confirm('¿Eliminar este usuario?')) {
        await database.ref(`users/${uid}`).remove();
        showToast('Usuario eliminado');
        loadUsers();
    }
}

// ========== PEDIDOS ==========
async function loadOrders() {
    const snapshot = await database.ref('orders').once('value');
    const orders = snapshot.val();
    const container = document.getElementById('orders-list');
    if (!container) return;
    
    if (!orders || Object.keys(orders).length === 0) {
        container.innerHTML = '<p>No hay pedidos realizados</p>';
        return;
    }
    
    container.innerHTML = `
        <table class="orders-table">
            <thead><tr><th>ID</th><th>Cliente</th><th>Total</th><th>Estado</th><th>Fecha</th><th>Acciones</th></tr></thead>
            <tbody>
                ${Object.entries(orders).map(([id, order]) => `
                    <tr>
                        <td>${id.slice(-6)}</td>
                        <td>${order.customerName || order.customerEmail || '-'}</td>
                        <td>Bs ${(order.total || 0).toFixed(2)}</td>
                        <td>
                            <select onchange="updateOrderStatus('${id}', this.value)">
                                <option value="pendiente" ${order.status === 'pendiente' ? 'selected' : ''}>⏳ Pendiente</option>
                                <option value="confirmado" ${order.status === 'confirmado' ? 'selected' : ''}>✅ Confirmado</option>
                                <option value="enviado" ${order.status === 'enviado' ? 'selected' : ''}>📦 Enviado</option>
                                <option value="entregado" ${order.status === 'entregado' ? 'selected' : ''}>🏠 Entregado</option>
                                <option value="cancelado" ${order.status === 'cancelado' ? 'selected' : ''}>❌ Cancelado</option>
                            </select>
                        </td>
                        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                        <td><button onclick="viewOrderDetails('${id}')">🔍 Ver</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function updateOrderStatus(orderId, newStatus) {
    await database.ref(`orders/${orderId}/status`).set(newStatus);
    showToast('Estado actualizado');
    loadOrders();
}

function viewOrderDetails(orderId) {
    showToast('Detalles del pedido #' + orderId.slice(-6));
}

// ========== AUTENTICACIÓN ==========
async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    if (!email || !password) {
        showToast('Ingresa email y contraseña', 'error');
        return;
    }
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Bienvenido');
        closeLoginModal();
        setTimeout(() => location.reload(), 500);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function register() {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const role = document.getElementById('register-role').value;
    
    if (!name || !email || !password) {
        showToast('Todos los campos son requeridos', 'error');
        return;
    }
    
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await database.ref(`users/${cred.user.uid}`).set({ name, email, role, createdAt: new Date().toISOString() });
        showToast('Registro exitoso');
        closeRegisterModal();
        setTimeout(() => location.reload(), 1500);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function logout() {
    auth.signOut();
    showToast('Sesión cerrada');
    setTimeout(() => location.reload(), 500);
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

auth.onAuthStateChanged(async (user) => {
    if (user) {
        const snap = await database.ref(`users/${user.uid}`).once('value');
        const userData = snap.val();
        currentUserRole = userData?.role || 'cliente';
        currentUser = user;
    } else {
        currentUserRole = 'invitado';
        currentUser = null;
    }
    updateAuthUI();
    if (currentUserRole === 'admin' || currentUserRole === 'asistente') {
        renderAdminCategories();
        loadUsers();
        loadOrders();
    }
});

// ========== UI HELPERS ==========
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageElement = document.getElementById(`${page}-page`);
    if (pageElement) pageElement.classList.add('active');
    if (page === 'products') displayProducts();
    if (page === 'cart') displayCart();
    if (page === 'admin') {
        renderAdminCategories();
        showAdminTab('products');
        loadUsers();
        loadOrders();
    }
}

function showAdminTab(tab) {
    document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
    const tabElement = document.getElementById(`admin-${tab}-tab`);
    if (tabElement) tabElement.style.display = 'block';
    if (tab === 'users') loadUsers();
    if (tab === 'orders') loadOrders();
}

function showLoginModal() { document.getElementById('login-modal').style.display = 'block'; }
function closeLoginModal() { document.getElementById('login-modal').style.display = 'none'; }
function showRegisterModal() { closeLoginModal(); document.getElementById('register-modal').style.display = 'block'; }
function closeRegisterModal() { document.getElementById('register-modal').style.display = 'none'; }
function showProductModal() {
    document.getElementById('product-id').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-stock').value = '';
    document.getElementById('product-image-url').value = '';
    clearImagePreview();
    document.getElementById('product-modal-title').innerText = '➕ Agregar Producto';
    document.getElementById('product-modal').style.display = 'block';
}
function closeProductModal() { document.getElementById('product-modal').style.display = 'none'; }
function showCategoryModal() {
    document.getElementById('category-id').value = '';
    document.getElementById('category-name').value = '';
    document.getElementById('category-icon').value = '📦';
    document.getElementById('category-modal-title').innerText = '➕ Agregar Categoría';
    document.getElementById('category-modal').style.display = 'block';
}
function closeCategoryModal() { document.getElementById('category-modal').style.display = 'none'; }

function changeLanguage() {
    const select = document.getElementById('language-select');
    if (select) currentLang = select.value;
    // Simplificado: solo cambia textos básicos
    const texts = {
        es: { home: "Inicio", products: "Productos", cart: "Carrito" },
        en: { home: "Home", products: "Products", cart: "Cart" }
    };
    if (texts[currentLang]) {
        document.querySelector('[onclick="showPage(\'home\')"]').innerText = texts[currentLang].home;
        document.querySelector('[onclick="showPage(\'products\')"]').innerText = texts[currentLang].products;
        document.querySelector('[onclick="showPage(\'cart\')"]').innerHTML = texts[currentLang].cart + ' (<span id="cart-count">0</span>)';
    }
}

// ========== INICIALIZAR ==========
setupImageUpload();
loadCategories();
loadProducts();
updateCartCount();
