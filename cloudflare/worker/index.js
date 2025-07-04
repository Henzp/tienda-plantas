// cloudflare/worker/index.js
// 🌱 Entre Hojas y Amigas - Cloudflare Worker API (CORREGIDO)

// Productos por defecto (mock data) - CORREGIDO
const PRODUCTOS_DEFAULT = [
  {
    id: 1,
    nombre: "Monstera Deliciosa",
    precio: 25000,
    imagen: "https://res.cloudinary.com/dqi6yvjxt/image/upload/v1733095648/productos/monstera_deliciosa_ghxvqz.jpg",
    descripcion: "Planta tropical de hojas grandes y perforadas, perfecta para interiores.",
    categoria: "Interior",
    disponible: true,
    stock: 15
  },
  {
    id: 2,
    nombre: "Suculenta Echeveria",
    precio: 8000,
    imagen: "https://res.cloudinary.com/dqi6yvjxt/image/upload/v1733095648/productos/suculenta_echeveria_abc123.jpg",
    descripcion: "Suculenta colorida y resistente, ideal para principiantes.",
    categoria: "Suculentas",
    disponible: true,
    stock: 30
  },
  {
    id: 3,
    nombre: "Pothos Dorado",
    precio: 12000,
    imagen: "https://res.cloudinary.com/dqi6yvjxt/image/upload/v1733095648/productos/pothos_dorado_def456.jpg",
    descripcion: "Planta colgante de fácil cuidado, perfecta para macetas suspendidas.",
    categoria: "Colgantes",
    disponible: true,
    stock: 20
  },
  {
    id: 4,
    nombre: "Lavanda",
    precio: 15000,
    imagen: "https://res.cloudinary.com/dqi6yvjxt/image/upload/v1733095648/productos/lavanda_ghi789.jpg",
    descripcion: "Planta aromática con flores moradas, ideal para jardines y macetas.",
    categoria: "Aromáticas",
    disponible: true,
    stock: 12
  },
  {
    id: 5,
    nombre: "Cactus Barrel",
    precio: 18000,
    imagen: "https://res.cloudinary.com/dqi6yvjxt/image/upload/v1733095648/productos/cactus_barrel_jkl012.jpg",
    descripcion: "Cactus esférico resistente, perfecto para decoración moderna.",
    categoria: "Cactus",
    disponible: true,
    stock: 8
  },
  {
    id: 6,
    nombre: "Helechos Boston",
    precio: 22000,
    imagen: "https://res.cloudinary.com/dqi6yvjxt/image/upload/v1733095648/productos/helecho_boston_mno345.jpg",
    descripcion: "Helecho exuberante ideal para espacios húmedos y sombríos.",
    categoria: "Helechos",
    disponible: true,
    stock: 10
  }
];

// Banner por defecto
const BANNER_DEFAULT = {
  id: 1,
  titulo: "🌿 ¡Bienvenidos a Entre Hojas y Amigas! 🌿",
  subtitulo: "Descubre nuestra colección de plantas perfectas para tu hogar",
  imagen: "https://res.cloudinary.com/dqi6yvjxt/image/upload/v1733095648/banner/plantas_hogar_banner_pqr678.jpg",
  activo: true,
  color_fondo: "#4CAF50",
  color_texto: "#FFFFFF"
};

// Configuración
const CONFIG = {
  cors: {
    origin: [
      'https://tienda-plantas-frontend.pages.dev',
      'https://tienda-plantas.vercel.app',
      'http://localhost:3000',
      'https://localhost:3000'
    ],
    credentials: true
  }
};

// Funciones de respuesta
function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers
    }
  });
}

function errorResponse(message, status = 500) {
  return jsonResponse({ error: message, timestamp: new Date().toISOString() }, status);
}

// Middleware CORS
function addCorsHeaders(response, origin) {
  const headers = new Headers(response.headers);
  
  // Permitir todos los orígenes por ahora para testing
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Max-Age', '86400');
  
  return new Response(response.body, {
    status: response.status,
    headers
  });
}

// Session Manager simple
class SessionManager {
  constructor() {
    this.sessions = new Map();
  }

  create(userId, userData) {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, {
      userId,
      userData,
      createdAt: Date.now()
    });
    return sessionId;
  }

  get(sessionId) {
    return this.sessions.get(sessionId);
  }

  destroy(sessionId) {
    this.sessions.delete(sessionId);
  }
}

const sessionManager = new SessionManager();

// Base de datos Mock mejorada
class MockDatabase {
  constructor() {
    // Clonar productos para evitar mutaciones
    this.productos = JSON.parse(JSON.stringify(PRODUCTOS_DEFAULT));
    this.banner = JSON.parse(JSON.stringify(BANNER_DEFAULT));
    console.log('MockDatabase inicializada con', this.productos.length, 'productos');
  }

  async getProductos() {
    console.log('Obteniendo productos, total:', this.productos.length);
    return this.productos.filter(p => p.disponible === true);
  }

  async getBanner() {
    console.log('Obteniendo banner');
    return this.banner;
  }

  async createProducto(producto) {
    const newId = Math.max(...this.productos.map(p => p.id), 0) + 1;
    const newProduct = {
      id: newId,
      ...producto,
      disponible: true
    };
    this.productos.push(newProduct);
    console.log('Producto creado con ID:', newId);
    return newProduct;
  }

  async updateProducto(id, updates) {
    const index = this.productos.findIndex(p => p.id === parseInt(id));
    if (index === -1) {
      console.log('Producto no encontrado para actualizar:', id);
      return null;
    }
    
    this.productos[index] = { ...this.productos[index], ...updates };
    console.log('Producto actualizado:', id);
    return this.productos[index];
  }

  async deleteProducto(id) {
    const index = this.productos.findIndex(p => p.id === parseInt(id));
    if (index === -1) {
      console.log('Producto no encontrado para eliminar:', id);
      return false;
    }
    
    this.productos.splice(index, 1);
    console.log('Producto eliminado:', id);
    return true;
  }

  async updateBanner(bannerData) {
    this.banner = { ...this.banner, ...bannerData };
    console.log('Banner actualizado');
    return this.banner;
  }
}

// Instancia global de la base de datos
const database = new MockDatabase();

// Utilidades de autenticación
function getCookie(request, name) {
  const cookie = request.headers.get('Cookie');
  if (!cookie) return null;
  
  const match = cookie.match(new RegExp(`${name}=([^;]+)`));
  return match ? match[1] : null;
}

function isAuthenticated(request) {
  const sessionCookie = getCookie(request, 'plantas-session');
  if (!sessionCookie) return false;
  
  const session = sessionManager.get(sessionCookie);
  return session && session.userData.isAdmin;
}

// Handlers de API
const handlers = {
  async health(request) {
    return jsonResponse({
      status: 'OK',
      platform: 'Cloudflare Workers',
      timestamp: new Date().toISOString(),
      mongodb: 'Mock Database',
      session: 'Activo',
      productosCount: database.productos.length
    });
  },

  async getProductos(request) {
    try {
      console.log('Handler getProductos ejecutándose...');
      const productos = await database.getProductos();
      console.log('Productos obtenidos:', productos.length);
      
      return jsonResponse({
        productos: productos,
        total: productos.length,
        platform: 'Cloudflare Workers',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error en getProductos:', error);
      return errorResponse('Error al obtener productos: ' + error.message);
    }
  },

  async getBanner(request) {
    try {
      console.log('Handler getBanner ejecutándose...');
      const banner = await database.getBanner();
      return jsonResponse(banner);
    } catch (error) {
      console.error('Error en getBanner:', error);
      return errorResponse('Error al obtener banner: ' + error.message);
    }
  },

  async createProducto(request) {
    if (!isAuthenticated(request)) {
      return errorResponse('No autorizado', 401);
    }

    try {
      const producto = await request.json();
      const newProduct = await database.createProducto(producto);
      return jsonResponse(newProduct, 201);
    } catch (error) {
      console.error('Error en createProducto:', error);
      return errorResponse('Error al crear producto: ' + error.message);
    }
  },

  async updateProducto(request, id) {
    if (!isAuthenticated(request)) {
      return errorResponse('No autorizado', 401);
    }

    try {
      const updates = await request.json();
      const product = await database.updateProducto(id, updates);
      
      if (!product) {
        return errorResponse('Producto no encontrado', 404);
      }
      
      return jsonResponse(product);
    } catch (error) {
      console.error('Error en updateProducto:', error);
      return errorResponse('Error al actualizar producto: ' + error.message);
    }
  },

  async deleteProducto(request, id) {
    if (!isAuthenticated(request)) {
      return errorResponse('No autorizado', 401);
    }

    try {
      const deleted = await database.deleteProducto(id);
      if (!deleted) {
        return errorResponse('Producto no encontrado', 404);
      }
      
      return jsonResponse({ message: 'Producto eliminado correctamente' });
    } catch (error) {
      console.error('Error en deleteProducto:', error);
      return errorResponse('Error al eliminar producto: ' + error.message);
    }
  },

  async login(request) {
    try {
      const { username, password } = await request.json();
      
      // Obtener credenciales de variables de entorno
      const adminUsername = 'tamypau'; // fallback
      const adminPassword = 'Isii2607'; // fallback
      
      if (username === adminUsername && password === adminPassword) {
        const sessionId = sessionManager.create('admin', {
          username,
          isAdmin: true
        });
        
        const response = jsonResponse({
          success: true,
          user: { username, isAdmin: true },
          message: 'Login exitoso'
        });
        
        response.headers.set('Set-Cookie', `plantas-session=${sessionId}; Max-Age=86400; HttpOnly; Secure; SameSite=None; Path=/`);
        return response;
      } else {
        return errorResponse('Credenciales incorrectas', 401);
      }
    } catch (error) {
      console.error('Error en login:', error);
      return errorResponse('Error en login: ' + error.message);
    }
  },

  async logout(request) {
    const sessionCookie = getCookie(request, 'plantas-session');
    if (sessionCookie) {
      sessionManager.destroy(sessionCookie);
    }
    
    const response = jsonResponse({ message: 'Logout exitoso' });
    response.headers.set('Set-Cookie', 'plantas-session=; Max-Age=0; Path=/');
    return response;
  },

  async checkAuth(request) {
    const sessionCookie = getCookie(request, 'plantas-session');
    if (!sessionCookie) {
      return jsonResponse({ authenticated: false });
    }
    
    const session = sessionManager.get(sessionCookie);
    if (!session) {
      return jsonResponse({ authenticated: false });
    }
    
    return jsonResponse({
      authenticated: true,
      user: session.userData
    });
  }
};

// Router principal
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;
  const origin = request.headers.get('Origin');

  console.log(`${method} ${path} - Origin: ${origin}`);

  // Manejar OPTIONS para CORS
  if (method === 'OPTIONS') {
    return addCorsHeaders(new Response(null, { status: 200 }), origin);
  }

  let response;

  try {
    // Routing
    if (path === '/' || path === '') {
      response = jsonResponse({
        message: "Cloudflare Worker funcionando",
        path: path,
        timestamp: new Date().toISOString(),
        note: "Las páginas se sirven desde Cloudflare Pages",
        endpoints: [
          "/api/health",
          "/api/productos", 
          "/api/banner",
          "/api/login",
          "/api/logout",
          "/api/check-auth"
        ]
      });
    } else if (path === '/api/health') {
      response = await handlers.health(request);
    } else if (path === '/api/productos') {
      if (method === 'GET') {
        response = await handlers.getProductos(request);
      } else if (method === 'POST') {
        response = await handlers.createProducto(request);
      } else {
        response = errorResponse('Método no permitido', 405);
      }
    } else if (path.startsWith('/api/productos/')) {
      const id = path.split('/').pop();
      if (method === 'PUT') {
        response = await handlers.updateProducto(request, id);
      } else if (method === 'DELETE') {
        response = await handlers.deleteProducto(request, id);
      } else {
        response = errorResponse('Método no permitido', 405);
      }
    } else if (path === '/api/banner') {
      if (method === 'GET') {
        response = await handlers.getBanner(request);
      } else if (method === 'PUT') {
        response = await handlers.updateBanner(request);
      } else {
        response = errorResponse('Método no permitido', 405);
      }
    } else if (path === '/api/login') {
      if (method === 'POST') {
        response = await handlers.login(request);
      } else {
        response = errorResponse('Método no permitido', 405);
      }
    } else if (path === '/api/logout') {
      if (method === 'POST') {
        response = await handlers.logout(request);
      } else {
        response = errorResponse('Método no permitido', 405);
      }
    } else if (path === '/api/check-auth') {
      response = await handlers.checkAuth(request);
    } else {
      response = errorResponse('Endpoint no encontrado', 404);
    }
  } catch (error) {
    console.error('Error en Worker:', error);
    response = errorResponse('Error interno del servidor: ' + error.message);
  }

  // Aplicar CORS headers
  return addCorsHeaders(response, origin);
}

// Export para Cloudflare Workers
export default {
  async fetch(request, env, ctx) {
    // Hacer disponibles las variables de entorno globalmente
    if (env.MONGODB_URI) globalThis.MONGODB_URI = env.MONGODB_URI;
    if (env.ADMIN_USERNAME) globalThis.ADMIN_USERNAME = env.ADMIN_USERNAME;
    if (env.ADMIN_PASSWORD) globalThis.ADMIN_PASSWORD = env.ADMIN_PASSWORD;
    if (env.SESSION_SECRET) globalThis.SESSION_SECRET = env.SESSION_SECRET;
    if (env.CLOUDINARY_CLOUD_NAME) globalThis.CLOUDINARY_CLOUD_NAME = env.CLOUDINARY_CLOUD_NAME;
    if (env.CLOUDINARY_API_KEY) globalThis.CLOUDINARY_API_KEY = env.CLOUDINARY_API_KEY;
    if (env.CLOUDINARY_API_SECRET) globalThis.CLOUDINARY_API_SECRET = env.CLOUDINARY_API_SECRET;

    return handleRequest(request);
  }
};