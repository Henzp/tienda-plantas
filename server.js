// ✅ SERVIDOR OPTIMIZADO Y CORREGIDO - VERSIÓN FINAL SIN DUPLICACIONES
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

console.log('🚀 Iniciando servidor con headers corregidos...');

// ✅ HEADERS OPTIMIZADOS PARA CORREGIR PROBLEMAS DE COMPATIBILIDAD
app.use((req, res, next) => {
    // Headers de seguridad básicos
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Headers específicos para fuentes (CORRIGE ERROR DE CONTENT-TYPE)
    if (req.path.endsWith('.woff2')) {
        res.setHeader('Content-Type', 'font/woff2; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (req.path.endsWith('.woff')) {
        res.setHeader('Content-Type', 'font/woff; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (req.path.endsWith('.ttf')) {
        res.setHeader('Content-Type', 'font/ttf; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (req.path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (req.path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (req.path.match(/\.(png|jpg|jpeg|gif|ico|svg)$/)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (req.path.match(/\.(html|htm)$/) || req.path === '/' || req.path === '/perfil' || req.path === '/admin') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (req.path.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
    
    next();
});

// ✅ CONFIGURACIÓN BÁSICA
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ ARCHIVOS ESTÁTICOS CON HEADERS ESPECÍFICOS CORREGIDOS
app.use(express.static('public', {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
        // Content-Type específico por extensión (CORRIGE PROBLEMAS DE FUENTES)
        if (filePath.endsWith('.woff2')) {
            res.setHeader('Content-Type', 'font/woff2; charset=utf-8');
        } else if (filePath.endsWith('.woff')) {
            res.setHeader('Content-Type', 'font/woff; charset=utf-8');
        } else if (filePath.endsWith('.ttf')) {
            res.setHeader('Content-Type', 'font/ttf; charset=utf-8');
        } else if (filePath.endsWith('.eot')) {
            res.setHeader('Content-Type', 'application/vnd.ms-fontobject');
        } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
        } else if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }
        
        // Cache optimizado y headers de seguridad
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Vary', 'Accept-Encoding');
    }
}));

// ✅ CONFIGURACIÓN DE CORS CORREGIDA PARA TU USUARIO GITHUB
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [
            'https://tienda-plantas.vercel.app',
            'https://tienda-plantas-git-main-henzp.vercel.app',
            'https://tienda-plantas-henzp.vercel.app',
            /\.vercel\.app$/  // Permite cualquier subdominio de vercel.app
          ]
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    optionsSuccessStatus: 200
}));

// ✅ CONFIGURACIÓN DE SESIONES
app.use(session({
    secret: process.env.SESSION_SECRET || 'tienda-plantas-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    name: 'tienda.sid',
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: 'lax'
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

// ✅ CONFIGURACIÓN DE MULTER
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
            fileSize: 10 * 1024 * 1024,
            files: 10
        },
        fileFilter: (req, file, cb) => {
            const allowedTypes = /jpeg|jpg|png|gif|webp/;
            const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
            const mimetype = allowedTypes.test(file.mimetype);
            
            if (mimetype && extname) {
                return cb(null, true);
            } else {
                cb(new Error('Solo se permiten imágenes'), false);
            }
        }
    });
    console.log('✅ Multer configurado');
} catch (error) {
    console.error('❌ Error configurando Multer:', error);
    upload = multer({ dest: 'uploads/' });
}

// ✅ CONEXIÓN A MONGODB
async function conectarMongoDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            retryWrites: true,
            w: 'majority'
        });
        console.log('✅ Conectado a MongoDB Atlas');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        console.log('⚠️ Continuando sin base de datos');
    }
}

// ✅ ESQUEMAS DE BASE DE DATOS
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

// ✅ RUTAS PARA SERVIR PÁGINAS HTML CON HEADERS CORRECTOS
const servirPagina = (archivo) => (req, res) => {
    try {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.sendFile(path.join(__dirname, 'views', archivo));
    } catch (error) {
        console.error(`Error sirviendo ${archivo}:`, error);
        res.status(500).send('Error cargando página');
    }
};

app.get('/', servirPagina('index.html'));
app.get('/admin', servirPagina('admin.html'));
app.get('/login', servirPagina('login.html'));
app.get('/register', servirPagina('register.html'));
app.get('/perfil', servirPagina('perfil.html'));
app.get('/producto/:id', servirPagina('producto.html'));

// ✅ API DE PRODUCTOS
app.get('/api/productos', async (req, res) => {
    try {
        console.log('📡 API /api/productos llamada');
        
        if (mongoose.connection.readyState !== 1) {
            console.log('⚠️ DB no conectada, devolviendo array vacío');
            return res.json([]);
        }
        
        const productos = await Producto.find({ activo: true })
            .sort({ fechaCreacion: -1 })
            .select('-__v')
            .lean();
        
        console.log('✅ Productos encontrados:', productos.length);
        res.json(productos);
        
    } catch (error) {
        console.error('❌ Error obteniendo productos:', error);
        res.json([]);
    }
});

app.get('/api/productos/:id', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const producto = await Producto.findById(req.params.id).select('-__v').lean();
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(producto);
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        res.status(500).json({ error: 'Error obteniendo producto' });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const nuevoProducto = new Producto(req.body);
        const productoGuardado = await nuevoProducto.save();
        res.status(201).json(productoGuardado);
    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({ error: 'Error creando producto' });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
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
        console.error('Error actualizando producto:', error);
        res.status(500).json({ error: 'Error actualizando producto' });
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const productoEliminado = await Producto.findByIdAndDelete(req.params.id);
        
        if (!productoEliminado) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json({ message: 'Producto eliminado exitosamente' });
    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.status(500).json({ error: 'Error eliminando producto' });
    }
});

// ✅ API DE BANNER
app.get('/api/banner', async (req, res) => {
    try {
        console.log('📡 API /api/banner llamada');
        
        if (mongoose.connection.readyState !== 1) {
            console.log('⚠️ DB no conectada, devolviendo array vacío');
            return res.json([]);
        }
        
        const bannerItems = await Banner.find({ activo: true })
            .sort({ orden: 1 })
            .select('-__v')
            .lean();
        
        console.log('✅ Banner items encontrados:', bannerItems.length);
        res.json(bannerItems);
        
    } catch (error) {
        console.error('❌ Error obteniendo banner:', error);
        res.json([]);
    }
});

app.post('/api/banner', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const { imagen, alt, orden } = req.body;
        
        if (!imagen || !alt || orden === undefined) {
            return res.status(400).json({ error: 'Imagen, alt y orden son requeridos' });
        }
        
        const nuevoBanner = new Banner({
            orden,
            imagen,
            alt,
            activo: true
        });
        
        const bannerGuardado = await nuevoBanner.save();
        res.status(201).json(bannerGuardado);
    } catch (error) {
        console.error('Error creando banner:', error);
        if (error.code === 11000) {
            res.status(400).json({ error: 'Ya existe una imagen con ese orden' });
        } else {
            res.status(500).json({ error: 'Error creando banner' });
        }
    }
});

app.put('/api/banner/:id', async (req, res) => {
    try {
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
        console.error('Error actualizando banner:', error);
        res.status(500).json({ error: 'Error actualizando banner' });
    }
});

app.delete('/api/banner/:id', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const bannerEliminado = await Banner.findByIdAndDelete(req.params.id);
        
        if (!bannerEliminado) {
            return res.status(404).json({ error: 'Imagen del banner no encontrada' });
        }
        
        res.json({ message: 'Imagen del banner eliminada exitosamente' });
    } catch (error) {
        console.error('Error eliminando banner:', error);
        res.status(500).json({ error: 'Error eliminando banner' });
    }
});

// ✅ API DE IMÁGENES
app.post('/api/upload-images', (req, res) => {
    upload.array('images', 10)(req, res, async (err) => {
        if (err) {
            console.error('Error en upload:', err);
            return res.status(400).json({ 
                success: false,
                error: 'Error subiendo archivos: ' + err.message 
            });
        }

        try {
            if (!req.files || req.files.length === 0) {
                return res.status(400).json({ 
                    success: false,
                    error: 'No se subieron archivos' 
                });
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
            console.error('Error procesando imágenes:', error);
            res.status(500).json({ 
                success: false,
                error: 'Error procesando imágenes' 
            });
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
        console.error('Error eliminando imagen:', error);
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
        console.error('Error obteniendo imágenes:', error);
        res.json([]);
    }
});

// ✅ API DE AUTENTICACIÓN
app.post('/api/register', async (req, res) => {
    try {
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
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y password son requeridos' });
        }
        
        let usuario = null;
        let esAdmin = false;
        
        // Verificar admin primero
        if (email === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            esAdmin = true;
            usuario = {
                _id: 'admin',
                nombre: 'Administrador',
                email: email
            };
            console.log('✅ Login de administrador exitoso');
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
                console.log('✅ Login de usuario normal exitoso');
            } else {
                return res.status(503).json({ error: 'Base de datos no disponible' });
            }
        }
        
        // Crear sesión
        req.session.userId = usuario._id;
        req.session.userName = usuario.nombre;
        req.session.userEmail = usuario.email;
        req.session.isAdmin = esAdmin;
        
        console.log('✅ Sesión creada para:', usuario.nombre);
        
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
        console.error('❌ Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/logout', (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.error('Error al cerrar sesión:', err);
                return res.status(500).json({ error: 'Error al cerrar sesión' });
            }
            res.clearCookie('tienda.sid');
            console.log('✅ Sesión cerrada exitosamente');
            res.json({ message: 'Sesión cerrada exitosamente' });
        });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
});

app.get('/api/session-status', async (req, res) => {
    try {
        console.log('📡 Verificando sesión:', req.session.userId ? 'Logueado' : 'No logueado');
        
        if (req.session.userId) {
            // Para admin
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
                // Para usuario normal, obtener datos completos de la DB
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
                        console.error('Error obteniendo datos de usuario:', error);
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
        console.error('Error verificando sesión:', error);
        res.json({ authenticated: false, isLoggedIn: false });
    }
});

// ✅ NUEVAS RUTAS API PARA PERFIL DE USUARIO
app.get('/api/user-profile', async (req, res) => {
    try {
        if (!req.session || !req.session.userId || req.session.isAdmin) {
            return res.status(401).json({ 
                success: false, 
                message: 'No hay sesión de usuario válida' 
            });
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: 'Base de datos no disponible' 
            });
        }

        const usuario = await Usuario.findById(req.session.userId).select('-password');
        if (!usuario) {
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
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
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error del servidor' 
        });
    }
});

app.put('/api/user-profile', async (req, res) => {
    try {
        if (!req.session || !req.session.userId || req.session.isAdmin) {
            return res.status(401).json({ 
                success: false, 
                message: 'No hay sesión de usuario válida' 
            });
        }

        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ 
                success: false, 
                message: 'Base de datos no disponible' 
            });
        }

        const { nombre, apellido, telefono, direccion } = req.body;
        
        // Validar datos requeridos
        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ 
                success: false, 
                message: 'El nombre es requerido' 
            });
        }

        // Actualizar usuario en la base de datos
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
            return res.status(404).json({ 
                success: false, 
                message: 'Usuario no encontrado' 
            });
        }

        // Actualizar datos en la sesión
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
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error del servidor al actualizar perfil' 
        });
    }
});

// ✅ RUTAS DE TESTING
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
        console.error('Error verificando estado:', error);
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
        console.error('Error testing Cloudinary:', error);
        res.status(500).json({ 
            status: 'Error',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// ✅ ENDPOINT DE SALUD
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '1.3.0',
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

// ✅ MIDDLEWARE DE MANEJO DE ERRORES
app.use((err, req, res, next) => {
    console.error('❌ Error del servidor:', err);
    
    if (process.env.NODE_ENV === 'development') {
        console.error('Stack:', err.stack);
    }
    
    res.status(err.status || 500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Error procesando solicitud',
        timestamp: new Date().toISOString()
    });
});

// ✅ RUTA CATCH-ALL PARA 404s
app.use('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
        res.status(404).json({ 
            error: 'Endpoint no encontrado',
            path: req.originalUrl,
            method: req.method,
            timestamp: new Date().toISOString()
        });
    } else {
        res.redirect('/');
    }
});

// ===============================================
// INICIALIZACIÓN CORREGIDA PARA VERCEL (SIN DUPLICACIONES)
// ===============================================

const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    try {
        await conectarMongoDB();
        await inicializarBanner();
        
        const servidor = app.listen(PORT, () => {
            console.log(`🌱 Servidor COMPLETAMENTE CORREGIDO corriendo en puerto ${PORT}`);
            console.log(`📍 Dirección: http://localhost:${PORT}`);
            console.log(`👑 Admin: http://localhost:${PORT}/admin`);
            console.log(`🔒 Login: http://localhost:${PORT}/login`);
            console.log(`👤 Perfil: http://localhost:${PORT}/perfil`);
            console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
            console.log('✅ Aplicación lista para recibir requests');
        });

        servidor.on('error', (error) => {
            console.error('❌ Error del servidor:', error);
            if (error.code === 'EADDRINUSE') {
                console.log(`⚠️ Puerto ${PORT} ocupado, intenta con otro puerto`);
                process.exit(1);
            }
        });

        const shutdown = (signal) => {
            console.log(`🛑 Recibida señal ${signal}, cerrando servidor...`);
            servidor.close(() => {
                console.log('✅ Servidor cerrado');
                mongoose.connection.close(() => {
                    console.log('✅ MongoDB desconectado');
                    process.exit(0);
                });
            });
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));

    } catch (error) {
        console.error('❌ Error crítico:', error);
        process.exit(1);
    }
}

// ✅ LÓGICA DE INICIALIZACIÓN BASADA EN ENTORNO (SIN DUPLICACIONES)
if (process.env.VERCEL) {
    // ESTAMOS EN VERCEL - Solo inicializar servicios
    console.log('🌐 VERCEL DETECTADO: Inicializando servicios...');
    conectarMongoDB()
        .then(() => {
            console.log('✅ VERCEL: MongoDB conectado');
            return inicializarBanner();
        })
        .then(() => {
            console.log('✅ VERCEL: Banner inicializado');
            console.log('🚀 VERCEL: Aplicación lista');
        })
        .catch(error => {
            console.error('❌ VERCEL: Error en inicialización:', error);
        });
} else {
    // DESARROLLO LOCAL - Iniciar servidor completo
    console.log('💻 DESARROLLO LOCAL: Iniciando servidor...');
    iniciarServidor();
}

// ✅ MANEJO DE ERRORES NO CAPTURADOS
process.on('uncaughtException', (error) => {
    console.error('❌ Error no capturado:', error);
    if (!process.env.VERCEL) {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Promesa rechazada:', reason);
    if (!process.env.VERCEL) {
        process.exit(1);
    }
});

// ✅ EXPORT PARA VERCEL
module.exports = app;