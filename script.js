// Base de datos de productos de Gaming Computer
const products = [
    { id: 1, name: "Gabinete Gamer RGB", price: 189.90, stock: 15, category: "gabinetes", image: "🖥️" },
    { id: 2, name: "Teclado Mecánico RGB", price: 129.90, stock: 25, category: "teclados", image: "⌨️" },
    { id: 3, name: "Mouse Gamer 6400 DPI", price: 79.90, stock: 30, category: "mouses", image: "🖱️" },
    { id: 4, name: "Laptop Gamer RTX 4060", price: 4299.90, stock: 5, category: "laptops", image: "💻" },
    { id: 5, name: "Monitor Curvo 27\" 144Hz", price: 899.90, stock: 12, category: "monitores", image: "🖥️" },
    { id: 6, name: "Procesador Intel i7-13ª Gen", price: 1249.90, stock: 8, category: "procesadores", image: "⚙️" },
    { id: 7, name: "Impresora WiFi Color", price: 349.90, stock: 10, category: "impresoras", image: "🖨️" },
    { id: 8, name: "Router WiFi 6", price: 129.90, stock: 20, category: "redes", image: "📡" }
];

// Carrito de compras
let cart = [];

// Traducciones
const translations = {
    es: {
        welcome: "BIENVENIDO A GAMING COMPUTER",
        subtitle: "Los mejores accesorios informáticos y componentes gaming",
        products: "Nuestros Productos",
        cart: "Tu Carrito",
        checkout: "Finalizar Pedido",
        add: "Añadir al Carrito",
        remove: "Eliminar",
        total: "Total",
        empty: "Tu carrito está vacío"
    },
    en: {
        welcome: "WELCOME TO GAMING COMPUTER",
        subtitle: "The best computer accessories and gaming components",
        products: "Our Products",
        cart: "Your Cart",
        checkout: "Checkout",
        add: "Add to Cart",
        remove: "Remove",
        total: "Total",
        empty: "Your cart is empty"
    },
    qu: {
        welcome: "GAMING COMPUTERMAN SUTIYAYKUY",
        subtitle: "Allin informática imakuna ruwanakuna",
        products: "Imakuna",
        cart: "Rantina canasta",
        checkout: "Rantiy",
        add: "Canastaman churaspa",
        remove: "Qichuy",
        total: "Llapan chanin",
        empty: "Canastayki ch'usaqmi"
    }
};

let currentLang = 'es';

// Mostrar página seleccionada
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
    if (page === 'products') {
        displayProducts();
    } else if (page === 'cart') {
        displayCart();
    }
}

// Mostrar productos
function displayProducts() {
    const container = document.getElementById('products-container');
    container.innerHTML = products.map(product => `
        <div class="product-card">
            <div style="font-size: 3rem; text-align: center;">${product.image}</div>
            <h3>${product.name}</h3>
            <div class="product-price">S/ ${product.price.toFixed(2)}</div>
            <div class="product-stock">Stock: ${product.stock}</div>
            <button onclick="addToCart(${product.id})">${translations[currentLang].add}</button>
        </div>
    `).join('');
}

// Añadir al carrito
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const cartItem = cart.find(item => item.id === productId);
    
    if (cartItem) {
        cartItem.quantity++;
    } else {
        cart.push({ ...product, quantity: 1 });
    }
    
    updateCartCount();
    alert(`${product.name} añadido al carrito`);
}

// Actualizar contador del carrito
function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').innerText = count;
}

// Mostrar carrito
function displayCart() {
    const container = document.getElementById('cart-container');
    const totalContainer = document.getElementById('cart-total');
    
    if (cart.length === 0) {
        container.innerHTML = `<p>${translations[currentLang].empty}</p>`;
        totalContainer.innerHTML = '';
        return;
    }
    
    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div>
                <strong>${item.name}</strong><br>
                S/ ${item.price.toFixed(2)} c/u
            </div>
            <div>
                <button onclick="updateQuantity(${item.id}, -1)">-</button>
                <span style="margin: 0 10px;">${item.quantity}</span>
                <button onclick="updateQuantity(${item.id}, 1)">+</button>
                <button onclick="removeFromCart(${item.id})" style="margin-left: 10px;">🗑️</button>
            </div>
            <div>S/ ${(item.price * item.quantity).toFixed(2)}</div>
        </div>
    `).join('');
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    totalContainer.innerHTML = `<strong>${translations[currentLang].total}: S/ ${total.toFixed(2)}</strong>`;
}

// Actualizar cantidad
function updateQuantity(productId, change) {
    const cartItem = cart.find(item => item.id === productId);
    if (cartItem) {
        cartItem.quantity += change;
        if (cartItem.quantity <= 0) {
            removeFromCart(productId);
        } else {
            displayCart();
            updateCartCount();
        }
    }
}

// Eliminar del carrito
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    displayCart();
    updateCartCount();
}

// Finalizar pedido
function checkout() {
    if (cart.length === 0) {
        alert("Agrega productos al carrito primero");
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const message = `Hola, quiero realizar un pedido de Gaming Computer:%0A${cart.map(item => `- ${item.name} x${item.quantity}: S/ ${(item.price * item.quantity).toFixed(2)}`).join('%0A')}%0ATOTAL: S/ ${total.toFixed(2)}`;
    
    window.open(`https://wa.me/51987654321?text=${message}`, '_blank');
}

// Cambiar idioma
function changeLanguage() {
    const select = document.getElementById('language-select');
    currentLang = select.value;
    
    // Actualizar textos
    document.querySelector('.hero h1').innerText = translations[currentLang].welcome;
    document.querySelector('.hero p').innerText = translations[currentLang].subtitle;
    document.querySelector('#products-page h2').innerText = translations[currentLang].products;
    document.querySelector('#cart-page h2').innerText = translations[currentLang].cart;
    
    displayProducts();
    displayCart();
}

// Inicializar la página
function init() {
    showPage('home');
    updateCartCount();
}

// Ejecutar al cargar
init();
