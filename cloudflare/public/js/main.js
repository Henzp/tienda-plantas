// 🌐 FRONTEND JAVASCRIPT ADAPTADO PARA CLOUDFLARE + VERCEL FALLBACK
// Archivo: cloudflare/public/js/main.js

// 🔧 CONFIGURACIÓN DE APIS
const API_CONFIG = {
  // URLs de Cloudflare Workers (cambiar por tu URL real)
  cloudflare: {
    base: 'https://tienda-plantas-api.tu-usuario.workers.dev',
    name: 'Cloudflare Workers'
  },
  // URLs de Vercel (fallback)
  vercel: {
    base: 'https://tienda-plantas.vercel.app',
    name: 'Vercel'
  },
  // Configuración actual
  current: null,
  fallbackUsed: false
};

// 🚀 FUNCIÓN MEJORADA PARA HACER FETCH CON FALLBACK
async function fetchWithFallback(endpoint, options = {}) {
  const urls = [
    `${API_CONFIG.cloudflare.base}${endpoint}`,
    `${API_CONFIG.vercel.base}${endpoint}`
  ];
  
  let lastError = null;
  
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const platform = i === 0 ? 'Cloudflare' : 'Vercel';
    
    try {
      console.log(`🔄 [${platform}] Intentando: ${endpoint}`);
      
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Para cookies de sesión
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (response.ok) {
        console.log(`✅ [${platform}] Éxito: ${endpoint}`);
        API_CONFIG.current = i === 0 ? API_CONFIG.cloudflare : API_CONFIG.vercel;
        API_CONFIG.fallbackUsed = i > 0;
        
        if (i > 0) {
          mostrarNotificacionAPI(`Usando ${platform} como respaldo`, 'info');
        }
        
        return response;
      } else {
        console.warn(`⚠️ [${platform}] HTTP ${response.status}: ${endpoint}`);
        lastError = new Error(`HTTP ${response.status} from ${platform}`);
      }
      
    } catch (error) {
      console.error(`❌ [${platform}] Error: ${endpoint}`, error);
      lastError = error;
    }
  }
  
  // Si llegamos aquí, ambas APIs fallaron
  console.error('💥 [API] Todas las APIs fallaron para:', endpoint);
  mostrarNotificacionAPI('Error de conexión con el servidor', 'error');
  throw lastError || new Error('Todas las APIs fallaron');
}

// 🔔 NOTIFICACIÓN PARA ESTADO DE API
function mostrarNotificacionAPI(mensaje, tipo = 'info') {
  const notification = document.createElement('div');
  notification.className = `api-notification api-${tipo}`;
  notification.innerHTML = `
    <i class="fas fa-${tipo === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
    <span>${mensaje}</span>
  `;
  
  // Estilos
  Object.assign(notification.style, {
    position: 'fixed',
    top: '10px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: tipo === 'error' ? '#e74c3c' : '#3498db',
    color: 'white',
    padding: '0.8rem 1.5rem',
    borderRadius: '25px',
    zIndex: '1004',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9rem',
    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
    opacity: '0',
    transition: 'opacity 0.3s ease'
  });

  document.body.appendChild(notification);
  
  // Animar entrada
  setTimeout(() => notification.style.opacity = '1', 100);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Variables globales (mantener las originales)
let productos = [];
let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
let categoriaActual = 'todas';

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 [APP] Iniciando aplicación...');
  cargarProductos();
  actualizarCarritoUI();
  configurarEventListeners();
  
  // Mostrar estado inicial de API
  setTimeout(() => {
    if (API_CONFIG.current) {
      const platform = API_CONFIG.current.name;
      const message = API_CONFIG.fallbackUsed 
        ? `Conectado a ${platform} (respaldo)` 
        : `Conectado a ${platform}`;
      mostrarNotificacionAPI(message, 'info');
    }
  }, 2000);
});

// Configurar event listeners (mantener original)
function configurarEventListeners() {
  // Filtros de categoría
  const filtros = document.querySelectorAll('.filtro-btn');
  filtros.forEach(btn => {
    btn.addEventListener('click', function() {
      filtros.forEach(f => f.classList.remove('active'));
      this.classList.add('active');
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
        document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
        setTimeout(() => {
          filtrarProductos(categoria);
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

// 🔄 CARGAR PRODUCTOS (MODIFICADO PARA CLOUDFLARE)
async function cargarProductos() {
  try {
    console.log('📡 [API] Cargando productos...');
    const response = await fetchWithFallback('/api/productos');
    productos = await response.json();
    
    console.log(`✅ [API] ${productos.length} productos cargados`);
    mostrarProductos(productos);
  } catch (error) {
    console.error('❌ [API] Error cargando productos:', error);
    mostrarError('Error al cargar productos. Por favor, recarga la página.');
  }
}

// Mostrar productos en el DOM (mantener original pero mejorado)
function mostrarProductos(productosAMostrar) {
  const grid = document.getElementById('productosGrid');
  
  if (productosAMostrar.length === 0) {
    grid.innerHTML = `
      <div class="no-productos">
        <i class="fas fa-search"></i>
        <h3>No se encontraron productos</h3>
        <p>Intenta con una categoría diferente</p>
        <button onclick="cargarProductos()" class="btn-reintentar">Recargar Productos</button>
      </div>
    `;
    return;
  }

  grid.innerHTML = productosAMostrar.map(producto => `
    <div class="producto-card" data-categoria="${producto.categoria}">
      <div class="producto-images">
        ${producto.imagenes && producto.imagenes.length > 0 ? producto.imagenes.map((imagen, index) => `
          <img src="${imagen}" 
               alt="${producto.nombre} ${index + 1}" 
               class="producto-image ${index === 0 ? 'active' : ''}"
               onerror="this.src='https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400'">
        `).join('') : `
          <img src="https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400" 
               alt="${producto.nombre}" 
               class="producto-image active">
        `}
        
        ${producto.imagenes && producto.imagenes.length > 1 ? `
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

  iniciarRotacionImagenes();
}

// Filtrar productos por categoría (mantener original)
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

// Cambiar imagen del producto (mantener original)
function cambiarImagen(dot, indice) {
  const card = dot.closest('.producto-card');
  const imagenes = card.querySelectorAll('.producto-image');
  const dots = card.querySelectorAll('.dot');
  
  imagenes.forEach(img => img.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));
  
  imagenes[indice].classList.add('active');
  dot.classList.add('active');
}

// Rotación automática de imágenes (mantener original)
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

// 🔄 FUNCIONES DE AUTENTICACIÓN (MODIFICADAS PARA CLOUDFLARE)
async function updateUserButtons() {
  try {
    console.log('🔍 [AUTH] Verificando estado de sesión...');
    
    const response = await fetchWithFallback('/api/session-status');
    const sessionData = await response.json();
    
    console.log('📊 [AUTH] Datos de sesión:', sessionData);
    
    const userActionsContainer = document.getElementById('userActions');
    if (!userActionsContainer) return;
    
    if (sessionData.isLoggedIn) {
      if (sessionData.userType === 'admin') {
        userActionsContainer.innerHTML = `
          <span class="user-name-small">👑 ${sessionData.userName}</span>
          <a href="/admin" class="admin-btn-small">
            <i class="fas fa-cog"></i> Admin
          </a>
          <button class="logout-btn-small" onclick="logout()" title="Cerrar Sesión">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        `;
        console.log('✅ [AUTH] UI actualizada para ADMIN');
      } else {
        userActionsContainer.innerHTML = `
          <span class="user-name-small">👤 ${sessionData.userName}</span>
          <a href="/perfil" class="user-profile-btn">
            <i class="fas fa-user"></i> Mi Perfil
          </a>
          <button class="logout-btn-small" onclick="logout()" title="Cerrar Sesión">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        `;
        console.log('✅ [AUTH] UI actualizada para USUARIO');
      }
    } else {
      userActionsContainer.innerHTML = `
        <a href="/login" class="login-btn-small">
          <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
        </a>
      `;
      console.log('✅ [AUTH] UI actualizada para NO LOGUEADO');
    }
    
  } catch (error) {
    console.error('❌ [AUTH] Error al verificar sesión:', error);
    
    const userActionsContainer = document.getElementById('userActions');
    if (userActionsContainer) {
      userActionsContainer.innerHTML = `
        <a href="/login" class="login-btn-small">
          <i class="fas fa-sign-in-alt"></i> Iniciar Sesión
        </a>
      `;
    }
  }
}

async function logout() {
  try {
    console.log('🚪 [AUTH] Cerrando sesión...');
    
    const response = await fetchWithFallback('/api/logout', {
      method: 'POST'
    });
    
    if (response.ok) {
      console.log('✅ [AUTH] Sesión cerrada');
      await updateUserButtons();
      window.location.reload();
    } else {
      console.error('❌ [AUTH] Error al cerrar sesión');
    }
  } catch (error) {
    console.error('❌ [AUTH] Error de red al cerrar sesión:', error);
  }
}

// 🔄 CARGAR BANNER DINÁMICO (MODIFICADO PARA CLOUDFLARE)
async function cargarBannerDinamico() {
  try {
    console.log('🎨 [API] Cargando banner...');
    const response = await fetchWithFallback('/api/banner');
    const bannerItems = await response.json();
    
    if (bannerItems.length === 0) {
      document.getElementById('bannerSection').style.display = 'none';
      return;
    }
    
    document.getElementById('bannerSection').style.display = 'block';
    
    const bannerTrack = document.getElementById('bannerTrack');
    const imagenesHTML = bannerItems.map(item => `
      <div class="banner-item">
        <img src="${item.imagen}" 
             alt="${item.alt}" 
             onerror="this.src='https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&h=200&fit=crop'">
      </div>
    `).join('');
    
    bannerTrack.innerHTML = imagenesHTML + imagenesHTML;
    
    console.log(`✅ [API] Banner cargado con ${bannerItems.length} imágenes`);
    
  } catch (error) {
    console.error('❌ [API] Error cargando banner:', error);
    document.getElementById('bannerSection').style.display = 'none';
  }
}

// Funciones del carrito (mantener originales)
function agregarAlCarrito(productoId) {
  const producto = productos.find(p => p._id === productoId);
  if (!producto) return;

  const itemExistente = carrito.find(item => item._id === productoId);
  
  if (itemExistente) {
    itemExistente.cantidad += 1;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
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

  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
  if (cartCount) {
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'block' : 'none';
  }

  if (carritoItems) {
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
          <img src="${item.imagenes && item.imagenes[0] ? item.imagenes[0] : 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=60'}" 
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
  }

  const total = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
  if (carritoTotal) {
    carritoTotal.textContent = formatearPrecio(total);
  }
}

function toggleCarrito() {
  const sidebar = document.getElementById('carritoSidebar');
  const overlay = document.getElementById('overlay');
  
  if (sidebar) sidebar.classList.toggle('active');
  if (overlay) overlay.classList.toggle('active');
}

function cerrarCarrito() {
  const sidebar = document.getElementById('carritoSidebar');
  const overlay = document.getElementById('overlay');
  
  if (sidebar) sidebar.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
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
  
  carrito = [];
  localStorage.setItem('carrito', JSON.stringify(carrito));
  actualizarCarritoUI();
  cerrarCarrito();
}

// Utilidades (mantener originales)
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
  
  setTimeout(() => notificacion.style.transform = 'translateX(0)', 100);
  
  setTimeout(() => {
    notificacion.style.transform = 'translateX(400px)';
    setTimeout(() => notificacion.remove(), 300);
  }, 3000);
}

function mostrarError(mensaje) {
  const grid = document.getElementById('productosGrid');
  if (grid) {
    grid.innerHTML = `
      <div class="error-container">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>¡Oops!</h3>
        <p>${mensaje}</p>
        <button onclick="cargarProductos()" class="btn-reintentar">Reintentar</button>
        <p style="margin-top: 1rem; font-size: 0.9rem; color: #666;">
          Estado de API: ${API_CONFIG.current ? API_CONFIG.current.name : 'No conectado'}
        </p>
      </div>
    `;
  }
}

// Event listeners adicionales (mantener originales)
document.addEventListener('scroll', function() {
  const header = document.querySelector('.header');
  if (header) {
    if (window.scrollY > 100) {
      header.style.background = 'rgba(255, 255, 255, 0.98)';
      header.style.backdropFilter = 'blur(20px)';
    } else {
      header.style.background = 'rgba(255, 255, 255, 0.95)';
      header.style.backdropFilter = 'blur(10px)';
    }
  }
});

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Ejecutar cuando se carga la página
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 [APP] Página cargada, inicializando...');
  updateUserButtons();
  cargarProductos();
  cargarBannerDinamico();
  
  // Verificar cada 30 segundos
  setInterval(updateUserButtons, 30000);
  
  // Debug info
  setTimeout(() => {
    console.log('🔍 [DEBUG] Estado actual de API:', API_CONFIG);
  }, 3000);
});

// Exponer funciones para debugging
window.API_CONFIG = API_CONFIG;
window.updateUserButtons = updateUserButtons;
window.cargarProductos = cargarProductos;