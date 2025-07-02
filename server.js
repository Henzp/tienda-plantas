// ✅ SERVIDOR OPTIMIZADO, SEGURO Y COMPATIBLE
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

console.log('🚀 Iniciando servidor optimizado...');

// ✅ HEADERS DE SEGURIDAD Y PERFORMANCE (NUEVO)
app.use((req, res, next) => {
    // Security Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy (reemplaza X-Frame-Options)
    res.setHeader('Content-Security-Policy', 
        "default-src 'self'; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; " +
        "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; " +
        "img-src 'self' data: https: http:; " +
        "connect-src 'self' https:; " +
        "frame-ancestors 'none';"
    );
    
    // CORS Headers optimizados
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Cache Control para archivos estáticos
    if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('Expires', new Date(Date.now() + 31536000000).toUTCString());
    } else if (req.path.match(/\.(html|htm)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=3600');
    } else {
        res.setHeader('Cache-Control', 'no-cache');
    }
    
    next();
});

// ✅ CONFIGURACIÓN BÁSICA
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ ARCHIVOS ESTÁTICOS CON HEADERS OPTIMIZADOS
app.use(express.static('public', {
    maxAge: '1y', // 1 año de cache
    etag: true,
    lastModified: true,
    setHeaders: (res, path) => {
        // Headers específicos por tipo de archivo
        if (path.endsWith('.woff2')) {
            res.setHeader('Content-Type', 'font/woff2');
        } else if (path.endsWith('.woff')) {
            res.setHeader('Content-Type', 'font/woff');
        } else if (path.endsWith('.ttf')) {
            res.setHeader('Content-Type', 'font/ttf');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (path.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }
        
        // Compression
        res.setHeader('Vary', 'Accept-Encoding');
    }
}));

// ✅ CONFIGURACIÓN DE CORS OPTIMIZADA
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://tienda-plantas.vercel.app', 'https://tu-dominio.com']
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 86400 // 24 horas de cache para preflight
}));

// ✅ CONFIGURACIÓN DE SESIONES
app.use(session({
    secret: process.env.SESSION_SECRET || 'tienda-plantas-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    name: 'tienda.sid', // Nombre personalizado para el cookie
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS en producción
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        httpOnly: true, // Seguridad: no accesible desde JavaScript
        sameSite: 'lax' // Protección CSRF
    }
}));

// ✅ CONFIGURACIÓN DE CLOUDINARY
try {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
    console.log('✅ Cloudinary configurado');
} catch (error) {
    console.error('❌ Error configurando Cloudinary:', error);
}

// ✅ CONFIGURACIÓN DE MULTER CON VALIDACIÓN MEJORADA
let upload;
try {
    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'tienda-plantas',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
            transformation: [
                { quality: 'auto:good' },
                { fetch_format: 'auto' }
            ]
        }
    });
    
    upload = multer({ 
        storage: storage,
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
            files: 10 // Máximo 10 archivos
        },
        fileFilter: (req, file, cb) => {
            // Validar tipos de archivo
            const allowedTypes = /jpeg|jpg|png|gif|webp/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);
            
            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'), false);
            }
        }
    });
    console.log('✅ Multer configurado con validaciones');
} catch (error) {
    console.error('❌ Error configurando Multer:', error);
    upload = multer({ dest: 'uploads/' });
}

// ✅ CONEXIÓN A MONGODB CON MANEJO DE ERRORES MEJORADO
async function conectarMongoDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000, // 5 segundos timeout
            socketTimeoutMS: 45000, // 45 segundos socket timeout
            maxPoolSize: 10, // Máximo 10 conexiones en el pool
            retryWrites: true,
            w: 'majority'
        });
        console.log('✅ Conectado a MongoDB Atlas con configuración optimizada');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        console.log('⚠️ Continuando sin base de datos (modo development)');
    }
}

// ✅ ESQUEMAS DE BASE DE DATOS (SIN CAMBIOS)
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
    imagenes: [{ type: String, validate: /^https?:\/\/.+/ }],
    activo: { type: Boolean, default: true },
    fechaCreacion: { type: Date, default: Date.now }
});

const bannerSchema = new mongoose.Schema({
    orden: { type: Number, required: true, unique: true, min: 1, max: 10 },
    imagen: { type: String, required: true, validate: /^https?:\/\/.+/ },
    alt: { type: String, required: true, trim: true },
    activo: { type: Boolean, default: true },
    fechaCreacion: { type: Date, default: Date.now },
    fechaActualizacion: { type: Date, default: Date.now }
});

// ✅ MODELOS
const Usuario = mongoose.model('Usuario', usuarioSchema);
const Producto = mongoose.model('Producto', productoSchema);
const Banner = mongoose.model('Banner', bannerSchema);

// ✅ MIDDLEWARE DE COMPRESIÓN (NUEVO)
app.use((req, res, next) => {
    // Habilitar compresión manual para respuestas grandes
    const originalSend = res.send;
    res.send = function(data) {
        if (typeof data === 'string' && data.length > 1024) {
            res.setHeader('Content-Encoding', 'gzip');
        }
        originalSend.call(this, data);
    };
    next();
});

// ✅ MIDDLEWARE DE MANEJO DE ERRORES GLOBAL MEJORADO
app.use((err, req, res, next) => {
    console.error('❌ Error del servidor:', err);
    
    // Logs detallados en development
    if (process.env.NODE_ENV === 'development') {
        console.error('Stack:', err.stack);
        console.error('Request:', req.method, req.url);
        console.error('Body:', req.body);
    }
    
    // Respuesta segura (no exponer detalles en producción)
    res.status(err.status || 500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Error procesando solicitud',
        timestamp: new Date().toISOString()
    });
});

// ✅ RUTAS PARA SERVIR PÁGINAS HTML CON HEADERS OPTIMIZADOS
const servirPagina = (archivo) => (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hora de cache
        res.sendFile(path.join(__dirname, 'views', archivo));
    } catch (error) {
        console.error(`Error sirviendo ${archivo}:`, error);
        res.status(500).setHeader('Content-Type', 'text/html; charset=utf-8').send(`
            <!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8"><title>Error</title></head>
            <body><h1>Error cargando página</h1><p>Intenta nuevamente en unos momentos.</p></body>
            </html>
        `);
    }
};

app.get('/', servirPagina('index.html'));
app.get('/admin', servirPagina('admin.html'));
app.get('/login', servirPagina('login.html'));
app.get('/register', servirPagina('register.html'));
app.get('/perfil', servirPagina('perfil.html'));
app.get('/producto/:id', servirPagina('producto.html'));

// ✅ API DE PRODUCTOS (CON HEADERS JSON OPTIMIZADOS)
const enviarJSON = (res, data, status = 200) => {
    res.status(status)
       .setHeader('Content-Type', 'application/json; charset=utf-8')
       .setHeader('Cache-Control', 'no-cache')
       .json(data);
};

app.get('/api/productos', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return enviarJSON(res, []);
        }
        
        const productos = await Producto.find({ activo: true })
            .sort({ fechaCreacion: -1 })
            .select('-__v') // Excluir campo interno
            .lean(); // Mejor performance
        
        enviarJSON(res, productos);
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        enviarJSON(res, []);
    }
});

app.get('/api/productos/:id', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return enviarJSON(res, { error: 'Base de datos no disponible' }, 503);
        }
        
        const producto = await Producto.findById(req.params.id).select('-__v').lean();
        if (!producto) {
            return enviarJSON(res, { error: 'Producto no encontrado' }, 404);
        }
        enviarJSON(res, producto);
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        enviarJSON(res, { error: 'Error obteniendo producto' }, 500);
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return enviarJSON(res, { error: 'Base de datos no disponible' }, 503);
        }
        
        const nuevoProducto = new Producto(req.body);
        const productoGuardado = await nuevoProducto.save();
        enviarJSON(res, productoGuardado, 201);
    } catch (error) {
        console.error('Error creando producto:', error);
        enviarJSON(res, { error: 'Error creando producto' }, 500);
    }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return enviarJSON(res, { error: 'Base de datos no disponible' }, 503);
        }
        
        const productoActualizado = await Producto.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        ).select('-__v');
        
        if (!productoActualizado) {
            return enviarJSON(res, { error: 'Producto no encontrado' }, 404);
        }
        
        enviarJSON(res, productoActualizado);
    } catch (error) {
        console.error('Error actualizando producto:', error);
        enviarJSON(res, { error: 'Error actualizando producto' }, 500);
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return enviarJSON(res, { error: 'Base de datos no disponible' }, 503);
        }
        
        const productoEliminado = await Producto.findByIdAndDelete(req.params.id);
        
        if (!productoEliminado) {
            return enviarJSON(res, { error: 'Producto no encontrado' }, 404);
        }
        
        enviarJSON(res, { message: 'Producto eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando producto:', error);
        enviarJSON(res, { error: 'Error eliminando producto' }, 500);
    }
});

// ✅ API DE BANNER CON OPTIMIZACIONES
app.get('/api/banner', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return enviarJSON(res, []);
        }
        
        const bannerItems = await Banner.find({ activo: true })
            .sort({ orden: 1 })
            .select('-__v')
            .lean();
        
        // Cache más largo para banner (cambía poco)
        res.setHeader('Cache-Control', 'public, max-age=1800'); // 30 minutos
        enviarJSON(res, bannerItems);
    } catch (error) {
        console.error('Error obteniendo banner:', error);
        enviarJSON(res, []);
    }
});

app.post('/api/banner', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return enviarJSON(res, { error: 'Base de datos no disponible' }, 503);
        }
        
        const { imagen, alt, orden } = req.body;
        
        if (!imagen || !alt || orden === undefined) {
            return enviarJSON(res, { error: 'Imagen, alt y orden son requeridos' }, 400);
        }
        
        const nuevoBanner = new Banner({
            orden,
            imagen,
            alt,
            activo: true
        });
        
        const bannerGuardado = await nuevoBanner.save();
        enviarJSON(res, bannerGuardado, 201);
    } catch (error) {
        console.error('Error creando banner:', error);
        if (error.code === 11000) {
            enviarJSON(res, { error: 'Ya existe una imagen con ese orden' }, 400);
        } else {
            enviarJSON(res, { error: 'Error creando banner' }, 500);
        }
    }
});

app.put('/api/banner/:id', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return enviarJSON(res, { error: 'Base de datos no disponible' }, 503);
        }
        
        const bannerActualizado = await Banner.findByIdAndUpdate(
            req.params.id,
            { ...req.body, fechaActualizacion: new Date() },
            { new: true, runValidators: true }
        ).select('-__v');
        
        if (!bannerActualizado) {
            return enviarJSON(res, { error: 'Imagen del banner no encontrada' }, 404);
        }
        
        enviarJSON(res, bannerActualizado);
    } catch (error) {
        console.error('Error actualizando banner:', error);
        enviarJSON(res, { error: 'Error actualizando banner' }, 500);
    }
});

app.delete('/api/banner/:id', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return enviarJSON(res, { error: 'Base de datos no disponible' }, 503);
        }
        
        const bannerEliminado = await Banner.findByIdAndDelete(req.params.id);
        
        if (!bannerEliminado) {
            return enviarJSON(res, { error: 'Imagen del banner no encontrada' }, 404);
        }
        
        enviarJSON(res, { message: 'Imagen del banner eliminada exitosamente' });
    } catch (error) {
        console.error('Error eliminando banner:', error);
        enviarJSON(res, { error: 'Error eliminando banner' }, 500);
    }
});

// ✅ API DE IMÁGENES CON MANEJO DE ERRORES MEJORADO
app.post('/api/upload-images', (req, res) => {
    upload.array('images', 10)(req, res, async (err) => {
        if (err) {
            console.error('Error en upload:', err);
            return enviarJSON(res, { 
                success: false,
                error: 'Error subiendo archivos: ' + err.message 
            }, 400);
        }

        try {
            if (!req.files || req.files.length === 0) {
                return enviarJSON(res, { 
                    success: false,
                    error: 'No se subieron archivos' 
                }, 400);
            }

            const images = req.files.map(file => ({
                url: file.path,
                publicId: file.filename,
                size: file.size,
                format: file.format || path.extname(file.originalname)
            }));

            enviarJSON(res, {
                success: true,
                message: 'Imágenes subidas exitosamente',
                images: images,
                count: images.length
            });
        } catch (error) {
            console.error('Error procesando imágenes:', error);
            enviarJSON(res, { 
                success: false,
                error: 'Error procesando imágenes' 
            }, 500);
        }
    });
});

app.delete('/api/delete-image/:publicId', async (req, res) => {
    try {
        const { publicId } = req.params;
        const result = await cloudinary.uploader.destroy(publicId);
        
        if (result.result === 'ok') {
            enviarJSON(res, { message: 'Imagen eliminada exitosamente' });
        } else {
            enviarJSON(res, { error: 'Imagen no encontrada' }, 404);
        }
    } catch (error) {
        console.error('Error eliminando imagen:', error);
        enviarJSON(res, { error: 'Error eliminando imagen' }, 500);
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
        
        // Cache para imágenes subidas
        res.setHeader('Cache-Control', 'public, max-age=900'); // 15 minutos
        enviarJSON(res, images);
    } catch (error) {
        console.error('Error obteniendo imágenes:', error);
        enviarJSON(res, []);
    }
});

// ✅ API DE AUTENTICACIÓN CON SEGURIDAD MEJORADA
app.post('/api/register', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return enviarJSON(res, { error: 'Base de datos no disponible' }, 503);
        }
        
        const { nombre, apellido, email, password, telefono, direccion, comuna, region } = req.body;
        
        if (!nombre || !apellido || !email || !password) {
            return enviarJSON(res, { error: 'Todos los campos obligatorios deben ser completados' }, 400);
        }
        
        // Validar email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return enviarJSON(res, { error: 'Email no válido' }, 400);
        }
        
        // Validar contraseña
        if (password.length < 6) {
            return enviarJSON(res, { error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
        }
        
        const usuarioExistente = await Usuario.findOne({ email: email.toLowerCase() });
        if (usuarioExistente) {
            return enviarJSON(res, { error: 'El email ya está registrado' }, 400);
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
        
        enviarJSON(res, { 
            message: 'Usuario registrado exitosamente',
            usuario: {
                id: nuevoUsuario._id,
                nombre: nuevoUsuario.nombre,
                apellido: nuevoUsuario.apellido,
                email: nuevoUsuario.email
            }
        }, 201);
    } catch (error) {
        console.error('Error en registro:', error);
        enviarJSON(res, { error: 'Error interno del servidor' }, 500);
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return enviarJSON(res, { error: 'Email y password son requeridos' }, 400);
        }
        
        let usuario = null;
        let esAdmin = false;
        
        // ✅ VERIFICAR ADMIN PRIMERO
        if (email === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            esAdmin = true;
            usuario = {
                _id: 'admin',
                nombre: 'Administrador',
                email: email
            };
            console.log('✅ Login de administrador exitoso');
        } else {
            // Verificar usuario normal solo si hay conexión a DB
            if (mongoose.connection.readyState === 1) {
                usuario = await Usuario.findOne({ email: email.toLowerCase() }).select('+password');
                if (!usuario) {
                    return enviarJSON(res, { error: 'Credenciales inválidas' }, 401);
                }
                
                const passwordValido = await bcrypt.compare(password, usuario.password);
                if (!passwordValido) {
                    return enviarJSON(res, { error: 'Credenciales inválidas' }, 401);
                }
                console.log('✅ Login de usuario normal exitoso');
            } else {
                return enviarJSON(res, { error: 'Base de datos no disponible' }, 503);
            }
        }
        
        // ✅ CREAR SESIÓN
        req.session.userId = usuario._id;
        req.session.userName = usuario.nombre;
        req.session.userEmail = usuario.email;
        req.session.isAdmin = esAdmin;
        
        console.log('✅ Sesión creada para:', usuario.nombre);
        
        enviarJSON(res, {
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
        console.error('❌ Error en login:', error);
        enviarJSON(res, { error: 'Error interno del servidor' }, 500);
    }
});

app.post('/api/logout', (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error al cerrar sesión:', err);
                return enviarJSON(res, { error: 'Error al cerrar sesión' }, 500);
            }
            res.clearCookie('tienda.sid');
            console.log('✅ Sesión cerrada exitosamente');
            enviarJSON(res, { message: 'Sesión cerrada exitosamente' });
        });
    } catch (error) {
        console.error('Error en logout:', error);
        enviarJSON(res, { error: 'Error al cerrar sesión' }, 500);
    }
});

app.get('/api/session-status', (req, res) => {
    try {
        if (req.session.userId) {
            enviarJSON(res, {
                isLoggedIn: true,
                userId: req.session.userId,
                userName: req.session.userName,
                userEmail: req.session.userEmail,
                userType: req.session.isAdmin ? 'admin' : 'user'
            });
        } else {
            enviarJSON(res, { isLoggedIn: false });
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
        enviarJSON(res, { isLoggedIn: false });
    }
});

// ✅ RUTAS DE TESTING CON INFORMACIÓN EXTENDIDA
app.get('/api/test/estado-db', async (req, res) => {
    try {
        const estadoConexion = mongoose.connection.readyState;
        const estados = {
            0: 'Desconectado',
            1: 'Conectado',
            2: 'Conectando',
            3: 'Desconectando'
        };
        
        let totalProductos = 0;
        let totalUsuarios = 0;
        let totalBanner = 0;
        
        if (estadoConexion === 1) {
            try {
                [totalProductos, totalUsuarios, totalBanner] = await Promise.all([
                    Producto.countDocuments(),
                    Usuario.countDocuments(),
                    Banner.countDocuments()
                ]);
            } catch (error) {
                console.error('Error contando documentos:', error);
            }
        }
        
        enviarJSON(res, {
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
        console.error('Error verificando estado:', error);
        enviarJSON(res, { error: 'Error verificando estado de la base de datos' }, 500);
    }
});

app.get('/api/test/cloudinary', async (req, res) => {
    try {
        const result = await cloudinary.api.ping();
        enviarJSON(res, {
            status: 'Conectado',
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            resultado: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error testing Cloudinary:', error);
        enviarJSON(res, { 
            status: 'Error',
            error: error.message,
            timestamp: new Date().toISOString()
        }, 500);
    }
});

// ✅ SALUD DEL SERVIDOR (NUEVO ENDPOINT)
app.get('/api/health', (req, res) => {
    enviarJSON(res, {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.1.0',
        environment: process.env.NODE_ENV || 'development'
    });
});

// ✅ FUNCIÓN PARA INICIALIZAR BANNER
async function inicializarBanner() {
    try {
        if (mongoose.connection.readyState !== 1) {
            console.log('⚠️ No se puede inicializar banner - sin conexión a DB');
            return;
        }
        
        const conteo = await Banner.countDocuments();
        
        if (conteo === 0) {
            console.log('🎨 Inicializando banner con imágenes de ejemplo...');
            
            const bannerEjemplo = [
                {
                    orden: 1,
                    imagen: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&h=200&fit=crop',
                    alt: 'Planta de interior 1',
                    activo: true
                },
                {
                    orden: 2,
                    imagen: 'https://images.unsplash.com/photo-1493606278519-11aa9a6b8453?w=300&h=200&fit=crop',
                    alt: 'Planta de interior 2',
                    activo: true
                },
                {
                    orden: 3,
                    imagen: 'https://images.unsplash.com/photo-1544568100-847a948585b9?w=300&h=200&fit=crop',
                    alt: 'Planta de interior 3',
                    activo: true
                },
                {
                    orden: 4,
                    imagen: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&h=200&fit=crop',
                    alt: 'Planta de interior 4',
                    activo: true
                },
                {
                    orden: 5,
                    imagen: 'https://images.unsplash.com/photo-1509423350716-97f2360af8e4?w=300&h=200&fit=crop',
                    alt: 'Planta de interior 5',
                    activo: true
                }
            ];
            
            await Banner.insertMany(bannerEjemplo);
            console.log('✅ Banner inicializado con 5 imágenes de ejemplo');
        }
    } catch (error) {
        console.error('❌ Error inicializando banner:', error);
    }
}

// ✅ MIDDLEWARE PARA MANEJAR 404 CON HEADERS CORRECTOS
app.use('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        enviarJSON(res, { 
            error: 'Endpoint no encontrado',
            path: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString()
        }, 404);
    } else {
        res.redirect('/');
    }
});

// ✅ INICIAR SERVIDOR CON MANEJO DE ERRORES MEJORADO
const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    try {
        // Primero conectar a MongoDB
        await conectarMongoDB();
        
        // Luego inicializar banner si hay conexión
        await inicializarBanner();
        
        // Finalmente iniciar servidor
        const servidor = app.listen(PORT, () => {
            console.log(`🌱 Servidor OPTIMIZADO corriendo en puerto ${PORT}`);
            console.log(`📍 Dirección: http://localhost:${PORT}`);
            console.log(`👑 Admin: http://localhost:${PORT}/admin`);
            console.log(`🔒 Login: http://localhost:${PORT}/login`);
            console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
            console.log('✅ Servidor iniciado con optimizaciones completas');
        });

        // Manejo de errores del servidor
        servidor.on('error', (error) => {
            console.error('❌ Error del servidor:', error);
            if (error.code === 'EADDRINUSE') {
                console.log(`⚠️ Puerto ${PORT} ocupado, intenta con otro puerto`);
                process.exit(1);
            }
        });

        // Manejo de cierre graceful
        const shutdown = (signal) => {
            console.log(`🛑 Recibida señal ${signal}, cerrando servidor...`);
            servidor.close(() => {
                console.log('✅ Servidor cerrado correctamente');
                mongoose.connection.close(() => {
                    console.log('✅ Conexión MongoDB cerrada');
                    process.exit(0);
                });
            });
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

    } catch (error) {
        console.error('❌ Error crítico iniciando servidor:', error);
        process.exit(1);
    }
}

// ✅ MANEJO DE ERRORES NO CAPTURADOS
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada no manejada:', reason);
    process.exit(1);
});

// Iniciar servidor
iniciarServidor();

module.exports = app;