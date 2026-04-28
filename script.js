// ========== CONFIGURACIÓN DE FIREBASE ==========
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
let currentImageUrl = '';

// Tipo de cambio (1 USD = 6.96 Bs)
const USD_TO_BOB = 6.96;

function formatPrice(priceInBOB) {
    const usd = priceInBOB / USD_TO_BOB;
    return {
        bob: `Bs ${priceInBOB.toFixed(2)}`,
        usd: `$${usd.toFixed(2)} USD`
    };
}

// Traducciones
const translations = {
    es: { 
        nav_home: "Inicio", nav_products: "Productos", nav_cart: "Carrito", nav_admin: "Admin", 
        login: "Iniciar Sesión", logout: "Cerrar Sesión", 
        welcome_title: "BIENVENIDO A GAMING COMPUTER", 
        welcome_subtitle: "Los mejores accesorios informáticos y componentes gaming en Bolivia", 
        products_title: "Nuestros Productos", cart_title: "Tu Carrito", 
        checkout_btn: "Finalizar Pedido", admin_title: "Panel de Administración", 
        admin_products: "Productos", admin_categories: "Categorías", admin_users: "Usuarios", admin_orders: "Pedidos", 
        empty_cart: "Tu carrito está vacío", total: "Total", currency: "Bs",
        add_product: "Agregar Producto", edit: "Editar", delete: "Eliminar", save: "Guardar" 
    },
    en: { 
        nav_home: "Home", nav_products: "Products", nav_cart: "Cart", nav_admin: "Admin", 
        login: "Login", logout: "Logout", 
        welcome_title: "WELCOME TO GAMING COMPUTER", 
        welcome_subtitle: "The best computer accessories in Bolivia", 
        products_title: "Our Products", cart_title: "Your Cart", 
        checkout_btn: "Checkout", admin_title: "Admin Panel", 
        admin_products: "Products", admin_categories: "Categories", admin_users: "Users", admin_orders: "Orders", 
        empty_cart: "Your cart is empty", total: "Total", currency: "Bs",
        add_product: "Add Product", edit: "Edit", delete: "Delete", save: "Save" 
    },
    qu: { 
        nav_home: "Wasiman", nav_products: "Imakuna", nav_cart: "Rantina", nav_admin: "Kamachiq", 
        login: "Yaykuy", logout: "Lluqsichiy", 
        welcome_title: "GAMING COMPUTERMAN SUTIYAYKUY", 
        welcome_subtitle: "Allin informática imakuna Boliviapi", 
        products_title: "Imakuna", cart_title: "Rantina", 
        checkout_btn: "Rantiy", admin_title: "Kamachiq tablero", 
        admin_products: "Imakuna", admin_categories: "Katiguriyakuna", admin_users: "Runakuna", admin_orders: "Nachakuna", 
        empty_cart: "Canastayki ch'usaqmi", total: "Llapan chanin", currency: "Bs",
        add_product: "Imata yapay", edit: "Huknachiy", delete: "Qichuy", save: "Waqaychay" 
    }
};

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast`;
    toast.innerHTML = `<div>Gaming Computer</div><div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== SUBIDA DE IMÁGENES A IMGBB ==========
async function uploadToImgBB() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        if (!file.type.startsWith('image/')) {
            showToast('Por favor selecciona una imagen válida', 'error');
            return;
        }
        
        if (file.size > 32 * 1024 * 1024) {
            showToast('La imagen no puede superar 32MB', 'error');
            return;
        }
        
        const statusDiv = document.getElementById('upload-status');
        statusDiv.innerHTML = '📤 Subiendo imagen a ImgBB...';
        
        const formData = new FormData();
        formData.append('image', file);
        
        try {
            // API pública de ImgBB
            const response = await fetch('https://api.imgbb.com/1/upload?key=6d207e02198a847aa98d0a2a901485a5', {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            
            if (result.success) {
                const imageUrl = result.data.url;
                document.getElementById('product-image-url').value = imageUrl;
                currentImageUrl = imageUrl;
                
                // Mostrar preview
                const preview = document.getElementById('image-preview');
                const previewImg = document.getElementById('image-preview-img');
                previewImg.src = imageUrl;
                preview.style.display = 'block';
                
                statusDiv.innerHTML = '✅ Imagen subida correctamente a ImgBB';
                showToast('Imagen subida con éxito', 'success');
            } else {
                statusDiv.innerHTML = '❌ Error al subir imagen';
                showToast('Error al subir imagen a ImgBB', 'error');
            }
        } catch (error) {
            statusDiv.innerHTML = '❌ Error de conexión';
            showToast('Error de conexión al subir imagen', 'error');
        }
    };
    
    fileInput.click();
}

function clearImagePreview() {
    currentImageUrl = '';
    document.getElementById('product-image-url').value = '';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('upload-status').innerHTML = '';
    showToast('Imagen eliminada', 'info');
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
            { id: "1", name: "Gabinete Gamer RGB", price: 189.90, stock: 15, category: "cat1", imageUrl: null, image: "📦" },
            { id: "2", name: "Teclado Mecánico RGB", price: 129.90, stock: 25, category: "cat4", imageUrl: null, image: "⌨️" },
            { id: "3", name: "Mouse Gamer 6400 DPI", price: 79.90, stock: 30, category: "cat6", imageUrl: null, image: "🖱️" },
            { id: "4", name: "Laptop Gamer RTX 4060", price: 4299.90, stock: 5, category: "cat2", imageUrl: null, image: "💻" },
            { id: "5", name: "Monitor Curvo 27\"", price: 899.90, stock: 12, category: "cat5", imageUrl: null, image: "🖥️" }
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
            category: product.category, image: product.image, imageUrl: product.imageUrl || null
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
    
    container.innerHTML = filtered.map(product => {
        const price = formatPrice(product.price);
        const hasImage = product.imageUrl && product.imageUrl.trim() !== '';
        return `<div class="product-card">
            ${hasImage ? 
                `<img src="${product.imageUrl}" alt="${product.name}" class="product-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 100 100%27%3E%3Ctext y=%27.9em%27 font-size=%2790%27%3E🎮%3C/text%3E%3C/svg%3E'">` :
                `<div style="font-size: 4rem; text-align: center;">${product.image || '🎮'}</div>`
            }
            <h3>${product.name}</h3>
            <div class="product-price">${price.bob} <span style="font-size: 0.9rem;">(${price.usd})</span></div>
            <div>Stock: ${product.stock}</div>
            <button onclick="addToCart('${product.id}')">Añadir al Carrito</button>
            ${(currentUserRole === 'admin' || currentUserRole === 'asistente') ? `
                <div class="product-actions">
                    <button onclick="editProduct('${product.id}')">✏️ Editar</button>
                    <button onclick="deleteProduct('${product.id}')">🗑️ Eliminar</button>
                </div>
            ` : ''}
        </div>`;
    }).join('');
    
    const adminContainer = document.getElementById('admin-products-list');
    if (adminContainer) {
        adminContainer.innerHTML = products.map(product => {
            const price = formatPrice(product.price);
            const hasImage = product.imageUrl && product.imageUrl.trim() !== '';
            return `<div class="product-card">
                ${hasImage ? 
                    `<img src="${product.imageUrl}" class="product-image" style="height:100px; width:100px; object-fit:contain;">` : 
                    `<div style="font-size:2rem;">${product.image || '🎮'}</div>`
                }
                <h3>${product.name}</h3>
                <div>${price.bob} (${price.usd})</div>
                <div>Stock: ${product.stock}</div>
                <div class="product-actions">
                    <button onclick="editProduct('${product.id}')">Editar</button>
                    <button onclick="deleteProduct('${product.id}')">Eliminar</button>
                </div>
            </div>`;
        }).join('');
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
        image: imageUrl ? null : '🎮',
        updatedAt: new Date().toISOString()
    };
    
    try {
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
    } catch (error) {
        showToast('Error al guardar producto', 'error');
    }
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
        
        const imageUrl = product.imageUrl || '';
        document.getElementById('product-image-url').value = imageUrl;
        
        if (imageUrl) {
            currentImageUrl = imageUrl;
            const preview = document.getElementById('image-preview');
            const previewImg = document.getElementById('image-preview-img');
            previewImg.src = imageUrl;
            preview.style.display = 'block';
        } else {
            clearImagePreview();
        }
        
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
    container.innerHTML = cart.map(item => {
        const price = formatPrice(item.price);
        return `<div class="cart-item">
            <div><strong>${item.name}</strong><br>${price.bob} (${price.usd})</div>
            <div>
                <button onclick="updateQty('${item.id}', -1)">-</button>
                <span style="margin:0 10px;">${item.quantity}</span>
                <button onclick="updateQty('${item.id}', 1)">+</button>
                <button onclick="removeFromCart('${item.id}')">🗑️</button>
            </div>
            <div>${price.bob}</div>
        </div>`;
    }).join('');
    const total = cart.reduce((s, i) => s + (i.price * i.quantity), 0);
    const totalFormatted = formatPrice(total);
    if (totalContainer) totalContainer.innerHTML = `<strong>${translations[currentLang].total}: ${totalFormatted.bob} (${totalFormatted.usd})</strong>`;
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
    const totalFormatted = formatPrice(total);
    const order = {
        items: cart.map(item => ({ id: item.id, name: item.name, quantity: item.quantity, price: item.price })),
        total: total,
        status: 'pendiente',
        createdAt: new Date().toISOString(),
        customerEmail: auth.currentUser ? auth.currentUser.email : 'invitado',
        customerName: auth.currentUser ? auth.currentUser.displayName || 'Cliente' : 'Invitado'
    };
    
    database.ref('orders').push(order).then(() => {
        const msg = `Hola, quiero comprar:%0A${cart.map(i => `- ${i.name} x${i.quantity}: ${formatPrice(i.price).bob}`).join('%0A')}%0ATOTAL: ${totalFormatted.bob} (${totalFormatted.usd})%0A%0A Mi correo: ${auth.currentUser?.email || 'invitado'}`;
        window.open(`https://wa.me/59176543210?text=${msg}`, '_blank');
        cart = [];
        updateCartCount();
        displayCart();
        showToast('Pedido realizado con éxito', 'success');
    }).catch(error => {
        showToast('Error al guardar pedido', 'error');
    });
}

// ========== AUTENTICACIÓN Y USUARIOS ==========
async function login() {
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const email = emailInput.value;
    const password = passwordInput.value;
    
    if (!email || !password) {
        showToast('Por favor ingresa email y contraseña', 'error');
        return;
    }
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Bienvenido a Gaming Computer', 'success');
        emailInput.value = '';
        passwordInput.value = '';
        closeLoginModal();
        setTimeout(() => { window.location.reload(); }, 500);
    } catch (error) {
        let errorMessage = 'Error al iniciar sesión';
        switch (error.code) {
            case 'auth/user-not-found': errorMessage = 'Usuario no encontrado'; break;
            case 'auth/wrong-password': errorMessage = 'Contraseña incorrecta'; break;
            default: errorMessage = error.message;
        }
        showToast(errorMessage, 'error');
    }
}

async function register() {
    const nameInput = document.getElementById('register-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const roleSelect = document.getElementById('register-role');
    
    const name = nameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;
    const role = roleSelect.value;
    
    if (!name || !email || !password) {
        showToast('Todos los campos son requeridos', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('La contraseña debe tener al menos 6 caracteres', 'error');
        return;
    }
    
    try {
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await database.ref(`users/${cred.user.uid}`).set({ name, email, role, createdAt: new Date().toISOString() });
        showToast('Registro exitoso. ¡Bienvenido!', 'success');
        nameInput.value = '';
        emailInput.value = '';
        passwordInput.value = '';
        roleSelect.value = 'cliente';
        closeRegisterModal();
        setTimeout(() => { window.location.reload(); }, 1500);
    } catch (error) {
        let errorMessage = 'Error en el registro';
        if (error.code === 'auth/email-already-in-use') errorMessage = 'Este email ya está registrado';
        else errorMessage = error.message;
        showToast(errorMessage, 'error');
    }
}

function logout() {
    auth.signOut();
    showToast('Sesión cerrada correctamente', 'info');
    cart = [];
    updateCartCount();
    setTimeout(() => { window.location.reload(); }, 500);
}

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
                                <option value="cliente" ${user.role === 'cliente' ? 'selected' : ''}>Cliente</option>
                                <option value="asistente" ${user.role === 'asistente' ? 'selected' : ''}>Asistente</option>
                                <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Administrador</option>
                            </select>
                        </td>
                        <td><button onclick="deleteUser('${uid}')">Eliminar</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function updateUserRole(uid, newRole) {
    await database.ref(`users/${uid}/role`).set(newRole);
    showToast('Rol actualizado', 'success');
    loadUsers();
}

async function deleteUser(uid) {
    if (confirm('¿Eliminar este usuario?')) {
        await database.ref(`users/${uid}`).remove();
        showToast('Usuario eliminado', 'info');
        loadUsers();
    }
}

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
                        <td>${formatPrice(order.total || 0).bob}</td>
                        <td>
                            <select onchange="updateOrderStatus('${id}', this.value)">
                                <option value="pendiente" ${order.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                                <option value="confirmado" ${order.status === 'confirmado' ? 'selected' : ''}>Confirmado</option>
                                <option value="enviado" ${order.status === 'enviado' ? 'selected' : ''}>Enviado</option>
                                <option value="entregado" ${order.status === 'entregado' ? 'selected' : ''}>Entregado</option>
                                <option value="cancelado" ${order.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                            </select>
                        </td>
                        <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                        <td><button onclick="viewOrderDetails('${id}')">Ver</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function updateOrderStatus(orderId, newStatus) {
    await database.ref(`orders/${orderId}/status`).set(newStatus);
    showToast('Estado del pedido actualizado', 'success');
    loadOrders();
}

function viewOrderDetails(orderId) {
    showToast('Detalles del pedido #' + orderId.slice(-6), 'info');
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
    if (tab === 'users') loadUsers();
    if (tab === 'orders') loadOrders();
}

function showLoginModal() { const modal = document.getElementById('login-modal'); if (modal) modal.style.display = 'block'; }
function closeLoginModal() { const modal = document.getElementById('login-modal'); if (modal) modal.style.display = 'none'; }
function showRegisterModal() { closeLoginModal(); const modal = document.getElementById('register-modal'); if (modal) modal.style.display = 'block'; }
function closeRegisterModal() { const modal = document.getElementById('register-modal'); if (modal) modal.style.display = 'none'; }
function showProductModal() {
    document.getElementById('product-id').value = '';
    document.getElementById('product-name').value = '';
    document.getElementById('product-price').value = '';
    document.getElementById('product-stock').value = '';
    document.getElementById('product-image-url').value = '';
    clearImagePreview();
    document.getElementById('product-modal-title').innerText = 'Agregar Producto';
    const modal = document.getElementById('product-modal');
    if (modal) modal.style.display = 'block';
}
function closeProductModal() { const modal = document.getElementById('product-modal'); if (modal) modal.style.display = 'none'; }
function showCategoryModal() {
    document.getElementById('category-id').value = '';
    document.getElementById('category-name').value = '';
    document.getElementById('category-icon').value = '';
    document.getElementById('category-modal-title').innerText = 'Agregar Categoría';
    const modal = document.getElementById('category-modal');
    if (modal) modal.style.display = 'block';
}
function closeCategoryModal() { const modal = document.getElementById('category-modal'); if (modal) modal.style.display = 'none'; }

function changeLanguage() {
    const select = document.getElementById('language-select');
    if (select) currentLang = select.value;
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang] && translations[currentLang][key]) {
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

// Cargar idioma guardado
const savedLang = localStorage.getItem('gaming_lang');
if (savedLang && translations[savedLang]) {
    currentLang = savedLang;
    const select = document.getElementById('language-select');
    if (select) select.value = savedLang;
    changeLanguage();
}
