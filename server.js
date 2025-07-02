// ✅ SERVIDOR CORREGIDO Y ESTABLE
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

console.log('🚀 Iniciando servidor...');

// ✅ CONFIGURACIÓN BÁSICA FIRST
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// ✅ CONFIGURACIÓN DE CORS
app.use(cors({
    origin: true,
    credentials: true
}));

// ✅ CONFIGURACIÓN DE SESIONES
app.use(session({
    secret: process.env.SESSION_SECRET || 'tienda-plantas-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
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

// ✅ CONFIGURACIÓN DE MULTER CON MANEJO DE ERRORES
let upload;
try {
    const storage = new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: 'tienda-plantas',
            allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        }
    });
    upload = multer({ 
        storage: storage,
        limits: {
            fileSize: 10 * 1024 * 1024 // 10MB
        }
    });
    console.log('✅ Multer configurado');
} catch (error) {
    console.error('❌ Error configurando Multer:', error);
    // Fallback si hay error con Cloudinary
    upload = multer({ dest: 'uploads/' });
}

// ✅ CONEXIÓN A MONGODB CON MANEJO DE ERRORES
async function conectarMongoDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado a MongoDB Atlas');
    } catch (error) {
        console.error('❌ Error conectando a MongoDB:', error);
        console.log('⚠️ Continuando sin base de datos (modo development)');
    }
}

// ✅ ESQUEMAS DE BASE DE DATOS
const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    telefono: String,
    direccion: String,
    comuna: String,
    region: String,
    fechaRegistro: { type: Date, default: Date.now }
});

const productoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    precio: { type: Number, required: true },
    categoria: { type: String, required: true },
    stock: { type: Number, default: 0 },
    imagenes: [String],
    activo: { type: Boolean, default: true },
    fechaCreacion: { type: Date, default: Date.now }
});

const bannerSchema = new mongoose.Schema({
    orden: { type: Number, required: true, unique: true },
    imagen: { type: String, required: true },
    alt: { type: String, required: true },
    activo: { type: Boolean, default: true },
    fechaCreacion: { type: Date, default: Date.now },
    fechaActualizacion: { type: Date, default: Date.now }
});

// ✅ MODELOS
const Usuario = mongoose.model('Usuario', usuarioSchema);
const Producto = mongoose.model('Producto', productoSchema);
const Banner = mongoose.model('Banner', bannerSchema);

// ✅ MIDDLEWARE DE MANEJO DE ERRORES GLOBAL
app.use((err, req, res, next) => {
    console.error('❌ Error del servidor:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// ✅ RUTAS PARA SERVIR PÁGINAS HTML
app.get('/', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'views', 'index.html'));
    } catch (error) {
        console.error('Error sirviendo index:', error);
        res.status(500).send('Error cargando página principal');
    }
});

app.get('/admin', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'views', 'admin.html'));
    } catch (error) {
        console.error('Error sirviendo admin:', error);
        res.status(500).send('Error cargando admin');
    }
});

app.get('/login', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'views', 'login.html'));
    } catch (error) {
        console.error('Error sirviendo login:', error);
        res.status(500).send('Error cargando login');
    }
});

app.get('/register', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'views', 'register.html'));
    } catch (error) {
        console.error('Error sirviendo register:', error);
        res.status(500).send('Error cargando register');
    }
});

app.get('/perfil', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'views', 'perfil.html'));
    } catch (error) {
        console.error('Error sirviendo perfil:', error);
        res.status(500).send('Error cargando perfil');
    }
});

app.get('/producto/:id', (req, res) => {
    try {
        res.sendFile(path.join(__dirname, 'views', 'producto.html'));
    } catch (error) {
        console.error('Error sirviendo producto:', error);
        res.status(500).send('Error cargando producto');
    }
});

// ✅ API DE PRODUCTOS
app.get('/api/productos', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json([]); // Devolver array vacío si no hay conexión
        }
        
        const productos = await Producto.find({ activo: true }).sort({ fechaCreacion: -1 });
        res.json(productos);
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.json([]); // Devolver array vacío en caso de error
    }
});

app.get('/api/productos/:id', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const producto = await Producto.findById(req.params.id);
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
        );
        
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

// ✅ API DE BANNER CON MANEJO DE ERRORES
app.get('/api/banner', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.json([]); // Devolver array vacío si no hay conexión
        }
        
        const bannerItems = await Banner.find({ activo: true }).sort({ orden: 1 });
        res.json(bannerItems);
    } catch (error) {
        console.error('Error obteniendo banner:', error);
        res.json([]); // Devolver array vacío en caso de error
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
        );
        
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

// ✅ API DE IMÁGENES CON MANEJO DE ERRORES
app.post('/api/upload-images', (req, res) => {
    // Usar middleware de multer con manejo de errores
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
                publicId: file.filename
            }));

            res.json({
                success: true,
                message: 'Imágenes subidas exitosamente',
                images: images
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
            createdAt: image.created_at
        }));
        
        res.json(images);
    } catch (error) {
        console.error('Error obteniendo imágenes:', error);
        res.json([]); // Devolver array vacío en caso de error
    }
});

// ✅ API DE AUTENTICACIÓN CON MANEJO DE ERRORES
app.post('/api/register', async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({ error: 'Base de datos no disponible' });
        }
        
        const { nombre, apellido, email, password, telefono, direccion, comuna, region } = req.body;
        
        if (!nombre || !apellido || !email || !password) {
            return res.status(400).json({ error: 'Todos los campos obligatorios deben ser completados' });
        }
        
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const nuevoUsuario = new Usuario({
            nombre,
            apellido,
            email,
            password: hashedPassword,
            telefono,
            direccion,
            comuna,
            region
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
                usuario = await Usuario.findOne({ email });
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
        
        // ✅ CREAR SESIÓN
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
            }
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
            res.clearCookie('connect.sid');
            console.log('✅ Sesión cerrada exitosamente');
            res.json({ message: 'Sesión cerrada exitosamente' });
        });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
});

app.get('/api/session-status', (req, res) => {
    try {
        if (req.session.userId) {
            res.json({
                isLoggedIn: true,
                userId: req.session.userId,
                userName: req.session.userName,
                userEmail: req.session.userEmail,
                userType: req.session.isAdmin ? 'admin' : 'user'
            });
        } else {
            res.json({
                isLoggedIn: false
            });
        }
    } catch (error) {
        console.error('Error verificando sesión:', error);
        res.json({ isLoggedIn: false });
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
                totalProductos = await Producto.countDocuments();
                totalUsuarios = await Usuario.countDocuments();
                totalBanner = await Banner.countDocuments();
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
            resultado: result
        });
    } catch (error) {
        console.error('Error testing Cloudinary:', error);
        res.status(500).json({ 
            status: 'Error',
            error: error.message 
        });
    }
});

// ✅ FUNCIÓN PARA INICIALIZAR BANNER (OPCIONAL)
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

// ✅ RUTA CATCH-ALL PARA ERRORES 404
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'Endpoint no encontrado' });
    } else {
        res.redirect('/');
    }
});

// ✅ INICIAR SERVIDOR
const PORT = process.env.PORT || 3000;

async function iniciarServidor() {
    try {
        // Primero conectar a MongoDB
        await conectarMongoDB();
        
        // Luego inicializar banner si hay conexión
        await inicializarBanner();
        
        // Finalmente iniciar servidor
        const servidor = app.listen(PORT, () => {
            console.log(`🌱 Servidor corriendo en puerto ${PORT}`);
            console.log(`📍 Dirección: http://localhost:${PORT}`);
            console.log(`👑 Admin: http://localhost:${PORT}/admin`);
            console.log('✅ Servidor iniciado correctamente');
        });

        // Manejo de errores del servidor
        servidor.on('error', (error) => {
            console.error('❌ Error del servidor:', error);
        });

        // Manejo de cierre graceful
        process.on('SIGINT', () => {
            console.log('🛑 Cerrando servidor...');
            servidor.close(() => {
                console.log('✅ Servidor cerrado');
                mongoose.connection.close();
                process.exit(0);
            });
        });

    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// Iniciar servidor
iniciarServidor();

module.exports = app;