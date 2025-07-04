const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
require('dotenv').config();

console.log('🚀 [VERCEL] Iniciando Serverless Function...');

// 🔧 FALLBACK PARA VARIABLES DE ENTORNO (SOLUCIÓN AL PROBLEMA)
if (!process.env.MONGODB_URI) {
    console.log('⚠️ [VERCEL] Variables de entorno no detectadas, usando fallback...');
    process.env.MONGODB_URI = 'mongodb+srv://tamypau:Isii2607@bd-plantas.2idkemi.mongodb.net/tienda-plantas?retryWrites=true&w=majority&appName=BD-PLANTAS';
    process.env.ADMIN_USERNAME = 'tamypau';
    process.env.ADMIN_PASSWORD = 'Isii2607';
    process.env.SESSION_SECRET = 'tienda-plantas-secret-key-2024';
    process.env.CLOUDINARY_CLOUD_NAME = 'dqi6yvjxt';
    process.env.CLOUDINARY_API_KEY = '713778997184742';
    process.env.CLOUDINARY_API_SECRET = 'dsq3LwGEg24B3y6hDWGo8VrYFts';
    process.env.NODE_ENV = 'production';
}

console.log('🔍 [DEBUG] MONGODB_URI:', process.env.MONGODB_URI ? 'Configurado ✅' : 'NO DEFINIDO ❌');

const app = express();

// ✅ MIDDLEWARE DE SEGURIDAD Y HEADERS
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (req.path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
    } else if (req.path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (req.path.endsWith('.woff2')) {
        res.setHeader('Content-Type', 'font/woff2; charset=utf-8');
    } else if (req.path.endsWith('.woff')) {
        res.setHeader('Content-Type', 'font/woff; charset=utf-8');
    }
    
    next();
});

// ✅ CONFIGURACIÓN EXPRESS
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ CORS
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ✅ ARCHIVOS ESTÁTICOS - CORRECCIÓN CLAVE PARA VERCEL
app.use(express.static(path.join(process.cwd(), 'public')));

// ✅ CONFIGURACIÓN DE SESIONES
app.use(session({
    secret: process.env.SESSION_SECRET || 'tienda-plantas-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    name: 'tienda.sid',
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// ✅ CONFIGURACIÓN CLOUDINARY
try {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('✅ [VERCEL] Cloudinary configurado');
} catch (error) {
    console.error('❌ [VERCEL] Error configurando Cloudinary:', error);
}

// ✅ CONFIGURACIÓN MULTER
let upload;
try {
    if (process.env.CLOUDINARY_CLOUD_NAME) {
        const storage = new CloudinaryStorage({
            cloudinary: cloudinary,
            params: {
                folder: 'tienda-plantas',
                allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
            }
        });
        upload = multer({ storage: storage, limits: { fileSize: 10 * 1024 * 1024 } });
    } else {
        upload = multer({ dest: '/tmp/uploads/' });
    }
    console.log('✅ [VERCEL] Multer configurado');
} catch (error) {
    console.error('❌ [VERCEL] Error configurando Multer:', error);
    upload = multer({ dest: '/tmp/uploads/' });
}

// ✅ CONEXIÓN MONGODB
let mongoConnected = false;
async function conectarMongoDB() {
    if (mongoConnected) return;
    try {
        console.log('🔗 [VERCEL] Intentando conectar a MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 10000
        });
        mongoConnected = true;
        console.log('✅ [VERCEL] Conectado a MongoDB exitosamente');
        await inicializarBanner();
    } catch (error) {
        console.error('❌ [VERCEL] Error conectando a MongoDB:', error);
    }
}

// ✅ ESQUEMAS MONGODB
const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    apellido: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    telefono: { type: String, trim: true },
    direccion: { type: String, trim: true },
    comuna: { type: String, trim: true },
    region: { type: String, trim: true },
    fechaRegistro: { type: Date, default: Date.now }
});

const productoSchema = new mongoose.Schema({
    nombre: { type: String, required: true, trim: true },
    descripcion: { type: String, required: true, trim: true },
    precio: { type: Number, required: true, min: 0 },
    categoria: { type: String, required: true, trim: true },
    stock: { type: Number, default: 0, min: 0 },
    imagenes: [{ type: String }],
    activo: { type: Boolean, default: true },
    fechaCreacion: { type: Date, default: Date.now }
});

const bannerSchema = new mongoose.Schema({
    orden: { type: Number, required: true, unique: true, min: 1, max: 10 },
    imagen: { type: String, required: true },
    alt: { type: String, required: true, trim: true },
    activo: { type: Boolean, default: true },
    fechaCreacion: { type: Date, default: Date.now }
});

const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', usuarioSchema);
const Producto = mongoose.models.Producto || mongoose.model('Producto', productoSchema);
const Banner = mongoose.models.Banner || mongoose.model('Banner', bannerSchema);

// ✅ FUNCIÓN INICIALIZAR BANNER
async function inicializarBanner() {
    try {
        if (mongoose.connection.readyState !== 1) return;
        
        const conteo = await Banner.countDocuments();
        if (conteo === 0) {
            console.log('🎨 [VERCEL] Inicializando banner...');
            const bannerEjemplo = [
                { orden: 1, imagen: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&h=400&fit=crop', alt: 'Plantas de interior', activo: true },
                { orden: 2, imagen: 'https://images.unsplash.com/photo-1493606278519-11aa9a6b8453?w=800&h=400&fit=crop', alt: 'Cuidado de plantas', activo: true },
                { orden: 3, imagen: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=800&h=400&fit=crop', alt: 'Decoración con plantas', activo: true }
            ];
            await Banner.insertMany(bannerEjemplo);
            console.log('✅ [VERCEL] Banner inicializado con 3 imágenes');
        } else {
            console.log(`📊 [VERCEL] Banner ya existe: ${conteo} imágenes`);
        }
    } catch (error) {
        console.error('❌ [VERCEL] Error inicializando banner:', error);
    }
}

// ✅ FUNCIÓN PARA SERVIR ARCHIVOS HTML - CORRECCIÓN CLAVE
const servirHTML = (archivo) => async (req, res) => {
    try {
        await conectarMongoDB();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        
        const htmlPath = path.join(process.cwd(), 'views', archivo);
        res.sendFile(htmlPath);
    } catch (error) {
        console.error(`❌ Error sirviendo ${archivo}:`, error);
        res.status(500).json({ error: `Error cargando ${archivo}` });
    }
};

// ✅ RUTAS PRINCIPALES - PÁGINAS HTML
app.get('/', servirHTML('index.html'));
app.get('/admin', servirHTML('admin.html'));
app.get('/login', servirHTML('login.html'));
app.get('/register', servirHTML('register.html'));
app.get('/perfil', servirHTML('perfil.html'));
app.get('/producto/:id', servirHTML('producto.html'));

// ✅ API HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        mongodb: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
        variables: {
            mongoUri: process.env.MONGODB_URI ? 'Configurado' : 'No configurado',
            cloudinary: process.env.CLOUDINARY_CLOUD_NAME ? 'Configurado' : 'No configurado'
        }
    });
});

// ✅ API PRODUCTOS
app.get('/api/productos', async (req, res) => {
    try {
        await conectarMongoDB();
        console.log('📡 [API] GET /api/productos');
        
        if (mongoose.connection.readyState !== 1) {
            console.log('⚠️ [API] MongoDB no conectado, retornando array vacío');
            return res.json([]);
        }
        
        const productos = await Producto.find({ activo: true })
            .sort({ fechaCreacion: -1 })
            .select('-__v')
            .lean();
        
        console.log(`✅ [API] Productos encontrados: ${productos.length}`);
        res.json(productos);
    } catch (error) {
        console.error('❌ [API] Error obteniendo productos:', error);
        res.json([]);
    }
});

app.get('/api/productos/:id', async (req, res) => {
    try {
        await conectarMongoDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const producto = await Producto.findById(req.params.id).select('-__v').lean();
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(producto);
    } catch (error) {
        console.error('❌ [API] Error obteniendo producto:', error);
        res.status(500).json({ error: 'Error obteniendo producto' });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        await conectarMongoDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const nuevoProducto = new Producto(req.body);
        const productoGuardado = await nuevoProducto.save();
        res.status(201).json(productoGuardado);
    } catch (error) {
        console.error('❌ [API] Error creando producto:', error);
        res.status(500).json({ error: 'Error creando producto' });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        await conectarMongoDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const productoActualizado = await Producto.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        ).select('-__v');
        
        if (!productoActualizado) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json(productoActualizado);
    } catch (error) {
        console.error('❌ [API] Error actualizando producto:', error);
        res.status(500).json({ error: 'Error actualizando producto' });
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        await conectarMongoDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const productoEliminado = await Producto.findByIdAndDelete(req.params.id);
        if (!productoEliminado) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json({ message: 'Producto eliminado exitosamente' });
    } catch (error) {
        console.error('❌ [API] Error eliminando producto:', error);
        res.status(500).json({ error: 'Error eliminando producto' });
    }
});

// ✅ API BANNER
app.get('/api/banner', async (req, res) => {
    try {
        await conectarMongoDB();
        console.log('📡 [API] GET /api/banner');
        
        if (mongoose.connection.readyState !== 1) {
            console.log('⚠️ [API] MongoDB no conectado, retornando array vacío');
            return res.json([]);
        }
        
        const bannerItems = await Banner.find({ activo: true })
            .sort({ orden: 1 })
            .select('-__v')
            .lean();
        
        console.log(`✅ [API] Banner items encontrados: ${bannerItems.length}`);
        res.json(bannerItems);
    } catch (error) {
        console.error('❌ [API] Error obteniendo banner:', error);
        res.json([]);
    }
});

app.post('/api/banner', async (req, res) => {
    try {
        await conectarMongoDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const { imagen, alt, orden } = req.body;
        if (!imagen || !alt || orden === undefined) {
            return res.status(400).json({ error: 'Imagen, alt y orden son requeridos' });
        }
        
        const nuevoBanner = new Banner({ orden, imagen, alt, activo: true });
        const bannerGuardado = await nuevoBanner.save();
        res.status(201).json(bannerGuardado);
    } catch (error) {
        console.error('❌ [API] Error creando banner:', error);
        if (error.code === 11000) {
            res.status(400).json({ error: 'Ya existe una imagen con ese orden' });
        } else {
            res.status(500).json({ error: 'Error creando banner' });
        }
    }
});

app.put('/api/banner/:id', async (req, res) => {
    try {
        await conectarMongoDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const bannerActualizado = await Banner.findByIdAndUpdate(
            req.params.id,
            { ...req.body, fechaActualizacion: new Date() },
            { new: true, runValidators: true }
        ).select('-__v');
        
        if (!bannerActualizado) {
            return res.status(404).json({ error: 'Imagen del banner no encontrada' });
        }
        
        res.json(bannerActualizado);
    } catch (error) {
        console.error('❌ [API] Error actualizando banner:', error);
        res.status(500).json({ error: 'Error actualizando banner' });
    }
});

app.delete('/api/banner/:id', async (req, res) => {
    try {
        await conectarMongoDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const bannerEliminado = await Banner.findByIdAndDelete(req.params.id);
        if (!bannerEliminado) {
            return res.status(404).json({ error: 'Imagen del banner no encontrada' });
        }
        
        res.json({ message: 'Imagen del banner eliminada exitosamente' });
    } catch (error) {
        console.error('❌ [API] Error eliminando banner:', error);
        res.status(500).json({ error: 'Error eliminando banner' });
    }
});

// ✅ API AUTENTICACIÓN
app.post('/api/login', async (req, res) => {
    try {
        await conectarMongoDB();
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y password son requeridos' });
        }
        
        let usuario = null;
        let esAdmin = false;
        
        // Verificar admin
        if (email === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            esAdmin = true;
            usuario = { _id: 'admin', nombre: 'Administrador', email: email };
            console.log('✅ [AUTH] Login admin exitoso');
        } else {
            // Verificar usuario normal
            if (mongoose.connection.readyState === 1) {
                usuario = await Usuario.findOne({ email: email.toLowerCase() }).select('+password');
                if (!usuario) {
                    return res.status(401).json({ error: 'Credenciales inválidas' });
                }
                
                const passwordValido = await bcrypt.compare(password, usuario.password);
                if (!passwordValido) {
                    return res.status(401).json({ error: 'Credenciales inválidas' });
                }
                console.log('✅ [AUTH] Login usuario exitoso');
            } else {
                return res.status(503).json({ error: 'Base de datos no disponible' });
            }
        }
        
        // Crear sesión
        req.session.userId = usuario._id;
        req.session.userName = usuario.nombre;
        req.session.userEmail = usuario.email;
        req.session.isAdmin = esAdmin;
        
        res.json({
            message: 'Login exitoso',
            usuario: {
                id: usuario._id,
                nombre: usuario.nombre,
                email: usuario.email,
                esAdmin
            },
            userType: esAdmin ? 'admin' : 'user',
            redirectTo: esAdmin ? '/admin' : '/perfil'
        });
    } catch (error) {
        console.error('❌ [AUTH] Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/logout', (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('❌ [AUTH] Error al cerrar sesión:', err);
                return res.status(500).json({ error: 'Error al cerrar sesión' });
            }
            res.clearCookie('tienda.sid');
            console.log('✅ [AUTH] Sesión cerrada exitosamente');
            res.json({ message: 'Sesión cerrada exitosamente' });
        });
    } catch (error) {
        console.error('❌ [AUTH] Error en logout:', error);
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
});

app.get('/api/session-status', async (req, res) => {
    try {
        await conectarMongoDB();
        console.log('📡 [AUTH] Verificando sesión:', req.session.userId ? 'Logueado' : 'No logueado');
        
        if (req.session.userId) {
            if (req.session.isAdmin) {
                res.json({
                    authenticated: true,
                    isLoggedIn: true,
                    userId: req.session.userId,
                    userName: req.session.userName,
                    userEmail: req.session.userEmail,
                    userType: 'admin',
                    user: {
                        id: req.session.userId,
                        nombre: req.session.userName,
                        email: req.session.userEmail
                    }
                });
            } else {
                if (mongoose.connection.readyState === 1) {
                    try {
                        const usuario = await Usuario.findById(req.session.userId).select('-password');
                        if (usuario) {
                            res.json({
                                authenticated: true,
                                isLoggedIn: true,
                                userId: usuario._id,
                                userName: usuario.nombre,
                                userEmail: usuario.email,
                                userType: 'user',
                                user: {
                                    id: usuario._id,
                                    nombre: usuario.nombre,
                                    apellido: usuario.apellido,
                                    email: usuario.email,
                                    telefono: usuario.telefono,
                                    direccion: usuario.direccion,
                                    comuna: usuario.comuna,
                                    region: usuario.region
                                }
                            });
                        } else {
                            res.json({ authenticated: false, isLoggedIn: false });
                        }
                    } catch (error) {
                        console.error('❌ [AUTH] Error obteniendo datos de usuario:', error);
                        res.json({ authenticated: false, isLoggedIn: false });
                    }
                } else {
                    res.json({ authenticated: false, isLoggedIn: false });
                }
            }
        } else {
            res.json({ authenticated: false, isLoggedIn: false });
        }
    } catch (error) {
        console.error('❌ [AUTH] Error verificando sesión:', error);
        res.json({ authenticated: false, isLoggedIn: false });
    }
});

// ✅ API REGISTRO
app.post('/api/register', async (req, res) => {
    try {
        await conectarMongoDB();
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const { nombre, apellido, email, password, telefono, direccion, comuna, region } = req.body;
        
        if (!nombre || !apellido || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos obligatorios deben ser completados' });
        }
        
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Email no válido' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
        }
        
        const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
        if (usuarioExistente) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const nuevoUsuario = new Usuario({
            nombre: nombre.trim(),
            apellido: apellido.trim(),
            email: email.toLowerCase().trim(),
            password: hashedPassword,
            telefono: telefono?.trim(),
            direccion: direccion?.trim(),
            comuna: comuna?.trim(),
            region: region?.trim()
        });
        
        await nuevoUsuario.save();
        
        res.status(201).json({ 
            message: 'Usuario registrado exitosamente',
            usuario: {
                id: nuevoUsuario._id,
                nombre: nuevoUsuario.nombre,
                apellido: nuevoUsuario.apellido,
                email: nuevoUsuario.email
            }
        });
    } catch (error) {
        console.error('❌ [AUTH] Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ✅ API PERFIL
app.get('/api/user-profile', async (req, res) => {
    try {
        await conectarMongoDB();
        if (!req.session || !req.session.userId || req.session.isAdmin) {
            return res.status(401).json({ success: false, message: 'No hay sesión de usuario válida' });
        }
        
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
        }
        
        const usuario = await Usuario.findById(req.session.userId).select('-password');
        if (!usuario) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        res.json({
            success: true,
            id: usuario._id,
            nombre: usuario.nombre,
            apellido: usuario.apellido,
            email: usuario.email,
            telefono: usuario.telefono,
            direccion: {
                calle: usuario.direccion,
                ciudad: usuario.comuna,
                region: usuario.region
            }
        });
    } catch (error) {
        console.error('❌ [API] Error obteniendo perfil:', error);
        res.status(500).json({ success: false, message: 'Error del servidor' });
    }
});

app.put('/api/user-profile', async (req, res) => {
    try {
        await conectarMongoDB();
        if (!req.session || !req.session.userId || req.session.isAdmin) {
            return res.status(401).json({ success: false, message: 'No hay sesión de usuario válida' });
        }
        
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
        }
        
        const { nombre, apellido, telefono, direccion } = req.body;
        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ success: false, message: 'El nombre es requerido' });
        }
        
        const usuarioActualizado = await Usuario.findByIdAndUpdate(
            req.session.userId,
            {
                nombre: nombre.trim(),
                apellido: apellido ? apellido.trim() : '',
                telefono: telefono ? telefono.trim() : '',
                direccion: direccion?.calle ? direccion.calle.trim() : '',
                comuna: direccion?.ciudad ? direccion.ciudad.trim() : '',
                region: direccion?.region ? direccion.region.trim() : ''
            },
            { new: true, select: '-password' }
        );
        
        if (!usuarioActualizado) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }
        
        req.session.userName = usuarioActualizado.nombre;
        
        res.json({ 
            success: true, 
            message: 'Perfil actualizado correctamente',
            user: {
                id: usuarioActualizado._id,
                nombre: usuarioActualizado.nombre,
                apellido: usuarioActualizado.apellido,
                email: usuarioActualizado.email,
                telefono: usuarioActualizado.telefono,
                direccion: usuarioActualizado.direccion,
                comuna: usuarioActualizado.comuna,
                region: usuarioActualizado.region
            }
        });
    } catch (error) {
        console.error('❌ [API] Error al actualizar perfil:', error);
        res.status(500).json({ success: false, message: 'Error del servidor al actualizar perfil' });
    }
});

// ✅ API IMÁGENES
app.post('/api/upload-images', (req, res) => {
    upload.array('images', 10)(req, res, async (err) => {
        if (err) {
            console.error('❌ [UPLOAD] Error:', err);
            return res.status(400).json({ success: false, error: 'Error subiendo archivos: ' + err.message });
        }
        
        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ success: false, error: 'No se subieron archivos' });
            }
            
            const images = req.files.map(file => ({
                url: file.path,
                publicId: file.filename,
                size: file.size,
                format: file.format || path.extname(file.originalname)
            }));
            
            res.json({
                success: true,
                message: 'Imágenes subidas exitosamente',
                images: images,
                count: images.length
            });
        } catch (error) {
            console.error('❌ [UPLOAD] Error procesando:', error);
            res.status(500).json({ success: false, error: 'Error procesando imágenes' });
        }
    });
});

app.delete('/api/delete-image/:publicId', async (req, res) => {
    try {
        const { publicId } = req.params;
        const result = await cloudinary.uploader.destroy(publicId);
        
        if (result.result === 'ok') {
            res.json({ message: 'Imagen eliminada exitosamente' });
        } else {
            res.status(404).json({ error: 'Imagen no encontrada' });
        }
    } catch (error) {
        console.error('❌ [DELETE] Error eliminando imagen:', error);
        res.status(500).json({ error: 'Error eliminando imagen' });
    }
});

app.get('/api/uploaded-images', async (req, res) => {
    try {
        const result = await cloudinary.search
            .expression('folder:tienda-plantas')
            .sort_by([['created_at', 'desc']])
            .max_results(30)
            .execute();
        
        const images = result.resources.map(image => ({
            publicId: image.public_id,
            url: image.secure_url,
            createdAt: image.created_at,
            size: image.bytes,
            format: image.format
        }));
        
        res.json(images);
    } catch (error) {
        console.error('❌ [API] Error obteniendo imágenes:', error);
        res.json([]);
    }
});

// ✅ RUTAS DE TEST
app.get('/api/test/estado-db', async (req, res) => {
    try {
        await conectarMongoDB();
        const estadoConexion = mongoose.connection.readyState;
        const estados = { 0: 'Desconectado', 1: 'Conectado', 2: 'Conectando', 3: 'Desconectando' };
        
        let totalProductos = 0, totalUsuarios = 0, totalBanner = 0;
        
        if (estadoConexion === 1) {
            try {
                [totalProductos, totalUsuarios, totalBanner] = await Promise.all([
                    Producto.countDocuments(),
                    Usuario.countDocuments(),
                    Banner.countDocuments()
                ]);
            } catch (error) {
                console.error('❌ Error contando documentos:', error);
            }
        }
        
        res.json({
            estado: estados[estadoConexion],
            database: mongoose.connection.name || 'No conectado',
            productos: totalProductos,
            usuarios: totalUsuarios,
            banner: totalBanner,
            servidor: {
                nodeVersion: process.version,
                uptime: process.uptime(),
                memoria: process.memoryUsage()
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ [TEST] Error verificando estado:', error);
        res.status(500).json({ error: 'Error verificando estado de la base de datos' });
    }
});

app.get('/api/test/cloudinary', async (req, res) => {
    try {
        const result = await cloudinary.api.ping();
        res.json({
            status: 'Conectado',
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            resultado: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ [TEST] Error testing Cloudinary:', error);
        res.status(500).json({ 
            status: 'Error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ✅ CATCH-ALL PARA 404s
app.use('*', (req, res) => {
    console.log(`❌ [404] Ruta no encontrada: ${req.method} ${req.originalUrl}`);
    
    if (req.originalUrl.startsWith('/api/')) {
        res.status(404).json({ 
            error: 'Endpoint no encontrado',
            path: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString()
        });
    } else {
        // Redirigir a home para páginas no encontradas
        res.redirect('/');
    }
});

console.log('🌐 [VERCEL] Aplicación inicializada');

// ✅ EXPORT PARA VERCEL
module.exports = app;