// Variables globales
let productos = [];
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let categoriaActual = 'todas';

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
    cargarProductos();
    actualizarCarritoUI();
    configurarEventListeners();
});

// Configurar event listeners
function configurarEventListeners() {
    // Filtros de categoría
    const filtros = document.querySelectorAll('.filtro-btn');
    filtros.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remover clase active de todos los botones
            filtros.forEach(f => f.classList.remove('active'));
            // Agregar clase active al botón clickeado
            this.classList.add('active');
            
            // Filtrar productos
            categoriaActual = this.dataset.categoria;
            filtrarProductos(categoriaActual);
        });
    });

    // Categorías destacadas
    const categoriaCards = document.querySelectorAll('.categoria-card');
    categoriaCards.forEach(card => {
        card.addEventListener('click', function() {
            const categoria = this.dataset.categoria;
            if (categoria) {
                // Scroll a productos
                document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
                // Filtrar después de un pequeño delay
                setTimeout(() => {
                    filtrarProductos(categoria);
                    // Actualizar botón activo
                    const filtroBtn = document.querySelector(`[data-categoria="${categoria}"]`);
                    if (filtroBtn) {
                        document.querySelectorAll('.filtro-btn').forEach(f => f.classList.remove('active'));
                        filtroBtn.classList.add('active');
                    }
                }, 500);
            }
        });
    });

    // Cerrar carrito con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            cerrarCarrito();
        }
    });
}

// Cargar productos desde la API
async function cargarProductos() {
    try {
        const response = await fetch('/api/productos');
        productos = await response.json();
        mostrarProductos(productos);
    } catch (error) {
        console.error('Error cargando productos:', error);
        mostrarError('Error al cargar productos. Por favor, recarga la página.');
    }
}

// Mostrar productos en el DOM
function mostrarProductos(productosAMostrar) {
    const grid = document.getElementById('productosGrid');
    
    if (productosAMostrar.length === 0) {
        grid.innerHTML = `
            <div class="no-productos">
                <i class="fas fa-search"></i>
                <h3>No se encontraron productos</h3>
                <p>Intenta con una categoría diferente</p>
            </div>
        `;
        return;
    }

    grid.innerHTML = productosAMostrar.map(producto => `
        <div class="producto-card" data-categoria="${producto.categoria}">
            <div class="producto-images">
                ${producto.imagenes.map((imagen, index) => `
                    <img src="${imagen}" 
                         alt="${producto.nombre} ${index + 1}" 
                         class="producto-image ${index === 0 ? 'active' : ''}"
                         onerror="this.src='https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400'">
                `).join('')}
                ${producto.imagenes.length > 1 ? `
                    <div class="image-dots">
                        ${producto.imagenes.map((_, index) => `
                            <span class="dot ${index === 0 ? 'active' : ''}" 
                                  onclick="cambiarImagen(this, ${index})"></span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <div class="producto-info">
                <h3 class="producto-nombre">${producto.nombre}</h3>
                <p class="producto-descripcion">${producto.descripcion}</p>
                <div class="producto-precio">$${formatearPrecio(producto.precio)}</div>
                <div class="producto-botones">
                    <button class="btn-agregar" onclick="agregarAlCarrito('${producto._id}')">
                        <i class="fas fa-cart-plus"></i> Agregar
                    </button>
                    <button class="btn-comprar" onclick="comprarAhora('${producto._id}')">
                        <i class="fas fa-shopping-bag"></i> Comprar
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Iniciar rotación automática de imágenes
    iniciarRotacionImagenes();
}

// Filtrar productos por categoría
function filtrarProductos(categoria) {
    let productosFiltrados;
    
    if (categoria === 'todas') {
        productosFiltrados = productos;
    } else {
        productosFiltrados = productos.filter(producto => 
            producto.categoria.toLowerCase().includes(categoria.toLowerCase())
        );
    }
    
    mostrarProductos(productosFiltrados);
}

// Cambiar imagen del producto
function cambiarImagen(dot, indice) {
    const card = dot.closest('.producto-card');
    const imagenes = card.querySelectorAll('.producto-image');
    const dots = card.querySelectorAll('.dot');
    
    // Remover clase active
    imagenes.forEach(img => img.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    
    // Agregar clase active
    imagenes[indice].classList.add('active');
    dot.classList.add('active');
}

// Rotación automática de imágenes
function iniciarRotacionImagenes() {
    setInterval(() => {
        const cards = document.querySelectorAll('.producto-card');
        cards.forEach(card => {
            const imagenes = card.querySelectorAll('.producto-image');
            const dots = card.querySelectorAll('.dot');
            
            if (imagenes.length <= 1) return;
            
            const activa = card.querySelector('.producto-image.active');
            const activaIndex = Array.from(imagenes).indexOf(activa);
            const siguienteIndex = (activaIndex + 1) % imagenes.length;
            
            imagenes.forEach(img => img.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            
            imagenes[siguienteIndex].classList.add('active');
            if (dots[siguienteIndex]) dots[siguienteIndex].classList.add('active');
        });
    }, 4000);
}

// Funciones del carrito
function agregarAlCarrito(productoId) {
    const producto = productos.find(p => p._id === productoId);
    if (!producto) return;

    const itemExistente = carrito.find(item => item._id === productoId);
    
    if (itemExistente) {
        itemExistente.cantidad += 1;
    } else {
        carrito.push({
            ...producto,
            cantidad: 1
        });
    }

    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarritoUI();
    mostrarNotificacion(`${producto.nombre} agregado al carrito`, 'success');
}

function eliminarDelCarrito(productoId) {
    carrito = carrito.filter(item => item._id !== productoId);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarritoUI();
    mostrarNotificacion('Producto eliminado del carrito', 'info');
}

function actualizarCantidad(productoId, nuevaCantidad) {
    const item = carrito.find(item => item._id === productoId);
    if (item) {
        if (nuevaCantidad <= 0) {
            eliminarDelCarrito(productoId);
        } else {
            item.cantidad = nuevaCantidad;
            localStorage.setItem('carrito', JSON.stringify(carrito));
            actualizarCarritoUI();
        }
    }
}

function actualizarCarritoUI() {
    const cartCount = document.getElementById('cartCount');
    const carritoItems = document.getElementById('carritoItems');
    const carritoTotal = document.getElementById('carritoTotal');

    // Actualizar contador
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'block' : 'none';

    // Actualizar items del carrito
    if (carrito.length === 0) {
        carritoItems.innerHTML = `
            <div class="carrito-vacio">
                <i class="fas fa-leaf"></i>
                <p>Tu carrito está vacío</p>
                <small>¡Agrega algunas plantas hermosas!</small>
            </div>
        `;
    } else {
        carritoItems.innerHTML = carrito.map(item => `
            <div class="carrito-item">
                <img src="${item.imagenes[0] || 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=60'}" 
                     alt="${item.nombre}">
                <div class="carrito-item-info">
                    <div class="carrito-item-nombre">${item.nombre}</div>
                    <div class="carrito-item-precio">$${formatearPrecio(item.precio)}</div>
                    <div class="carrito-item-cantidad">
                        <button onclick="actualizarCantidad('${item._id}', ${item.cantidad - 1})">-</button>
                        <span>${item.cantidad}</span>
                        <button onclick="actualizarCantidad('${item._id}', ${item.cantidad + 1})">+</button>
                    </div>
                </div>
                <button class="carrito-item-eliminar" onclick="eliminarDelCarrito('${item._id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    // Actualizar total
    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    carritoTotal.textContent = formatearPrecio(total);
}

function toggleCarrito() {
    const sidebar = document.getElementById('carritoSidebar');
    const overlay = document.getElementById('overlay');
    
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function cerrarCarrito() {
    const sidebar = document.getElementById('carritoSidebar');
    const overlay = document.getElementById('overlay');
    
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

function comprarAhora(productoId) {
    agregarAlCarrito(productoId);
    toggleCarrito();
}

function procesarCompra() {
    if (carrito.length === 0) {
        mostrarNotificacion('Tu carrito está vacío', 'error');
        return;
    }

    const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    
    mostrarNotificacion(`¡Compra procesada! ${totalItems} plantas por $${formatearPrecio(total)}`, 'success');
    
    // Limpiar carrito
    carrito = [];
    localStorage.setItem('carrito', JSON.stringify(carrito));
    actualizarCarritoUI();
    cerrarCarrito();
}

// Utilidades
function formatearPrecio(precio) {
    return precio.toLocaleString('es-CL');
}

function mostrarNotificacion(mensaje, tipo = 'info') {
    const notificacion = document.createElement('div');
    notificacion.className = `notificacion notificacion-${tipo}`;
    notificacion.innerHTML = `
        <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${mensaje}</span>
    `;
    
    // Estilos
    Object.assign(notificacion.style, {
        position: 'fixed',
        top: '100px',
        right: '20px',
        background: tipo === 'success' ? '#2d5016' : tipo === 'error' ? '#e74c3c' : '#3498db',
        color: 'white',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        zIndex: '1003',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
        transform: 'translateX(400px)',
        transition: 'transform 0.3s ease'
    });

    document.body.appendChild(notificacion);
    
    // Animar entrada
    setTimeout(() => {
        notificacion.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notificacion.style.transform = 'translateX(400px)';
        setTimeout(() => {
            notificacion.remove();
        }, 300);
    }, 3000);
}

function mostrarError(mensaje) {
    const grid = document.getElementById('productosGrid');
    grid.innerHTML = `
        <div class="error-container">
            <i class="fas fa-exclamation-triangle"></i>
            <h3>¡Oops!</h3>
            <p>${mensaje}</p>
            <button onclick="cargarProductos()" class="btn-reintentar">Reintentar</button>
        </div>
    `;
}

// Event listeners adicionales
document.addEventListener('scroll', function() {
    const header = document.querySelector('.header');
    if (window.scrollY > 100) {
        header.style.background = 'rgba(255, 255, 255, 0.98)';
        header.style.backdropFilter = 'blur(20px)';
    } else {
        header.style.background = 'rgba(255, 255, 255, 0.95)';
        header.style.backdropFilter = 'blur(10px)';
    }
});

// Smooth scroll para enlaces
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Efectos de foco en los inputs
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});
// AGREGAR AL FINAL DE tu archivo public/js/main.js

// Función para verificar estado de sesión y actualizar botones
async function updateUserButtons() {
    try {
        const response = await fetch('/api/session-status');
        const sessionData = await response.json();
        
        const userActionsContainer = document.querySelector('.nav-actions');
        const existingUserActions = document.getElementById('userActions');
        
        if (existingUserActions) {
            existingUserActions.remove();
        }
        
        // Crear nuevo contenedor de acciones de usuario
        const userActions = document.createElement('div');
        userActions.id = 'userActions';
        userActions.style.display = 'flex';
        userActions.style.alignItems = 'center';
        userActions.style.gap = '1rem';
        
        if (sessionData.isLoggedIn) {
            if (sessionData.userType === 'admin') {
                // Botones para admin
                userActions.innerHTML = `
                    <span style="color: #2d5016; font-weight: 600; font-family: 'Inter', sans-serif;">
                        👑 ${sessionData.userName}
                    </span>
                    <a href="/admin" class="admin-link">
                        <i class="fas fa-cog"></i> Admin
                    </a>
                    <button class="logout-btn" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                `;
            } else {
                // Botones para usuario normal
                userActions.innerHTML = `
                    <span style="color: #2d5016; font-weight: 600; font-family: 'Inter', sans-serif;">
                        👤 ${sessionData.userName}
                    </span>
                    <a href="/perfil" class="perfil-link">
                        <i class="fas fa-user"></i> Mi Perfil
                    </a>
                    <button class="logout-btn" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i>
                    </button>
                `;
            }
        } else {
            // Botones para usuario no logueado
            userActions.innerHTML = `
                <a href="/login" class="login-link">
                    <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
                </a>
                <a href="/register" class="register-link">
                    <i class="fas fa-user-plus"></i> Registrarse
                </a>
            `;
        }
        
        userActionsContainer.appendChild(userActions);
        
    } catch (error) {
        console.log('No hay sesión activa');
        // Mostrar botones de no logueado por defecto
        const userActionsContainer = document.querySelector('.nav-actions');
        const existingUserActions = document.getElementById('userActions');
        
        if (existingUserActions) {
            existingUserActions.remove();
        }
        
        const userActions = document.createElement('div');
        userActions.id = 'userActions';
        userActions.style.display = 'flex';
        userActions.style.alignItems = 'center';
        userActions.style.gap = '1rem';
        
        userActions.innerHTML = `
            <a href="/login" class="login-link">
                <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
            </a>
            <a href="/register" class="register-link">
                <i class="fas fa-user-plus"></i> Registrarse
            </a>
        `;
        
        userActionsContainer.appendChild(userActions);
    }
}

// Función para cerrar sesión
async function logout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST'
        });
        
        if (response.ok) {
            // Recargar la página para actualizar los botones
            window.location.reload();
        }
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

// Ejecutar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
    updateUserButtons();
    
    // Actualizar cada 30 segundos para mantener sincronizado
    setInterval(updateUserButtons, 30000);
});