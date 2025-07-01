const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURACIÓN DE CLOUDINARY
// ============================================
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configuración de almacenamiento Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'plantas-tienda', // Carpeta en Cloudinary
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [{ width: 800, height: 600, crop: 'limit', quality: 'auto' }]
    }
});

// Configuración de Multer con Cloudinary
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB por archivo
        files: 5 // máximo 5 archivos
    },
    fileFilter: function(req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen (jpg, png, gif, webp)'));
        }
    }
});

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));

// ============================================
// CONFIGURACIÓN DE SESIONES
// ============================================
app.use(session({
    secret: process.env.SESSION_SECRET || 'entre-hojas-amigas-super-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    name: 'plantme.sid',
    cookie: { 
        secure: process.env.NODE_ENV === 'production' ? 'auto' : false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        sameSite: 'lax'
    },
    rolling: true
}));

// Middleware de debug de sesiones
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    if (req.path.includes('/api/') || req.path === '/' || req.path === '/perfil') {
        console.log(`🔍 [${timestamp}] ${req.method} ${req.path} - Session: ${req.session?.isLoggedIn || false}`);
    }
    next();
});

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plantme', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));

// MODELOS DE BASE DE DATOS
const usuarioSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    telefono: { type: String },
    direccion: {
        calle: String,
        ciudad: String,
        region: String,
        codigoPostal: String
    },
    tipoUsuario: { type: String, enum: ['cliente', 'admin'], default: 'cliente' },
    fechaRegistro: { type: Date, default: Date.now },
    activo: { type: Boolean, default: true }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

const productoSchema = new mongoose.Schema({
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    precio: { type: Number, required: true },
    categoria: { type: String, required: true },
    imagenes: [{ type: String }],
    stock: { type: Number, default: 0 },
    activo: { type: Boolean, default: true },
    fechaCreacion: { type: Date, default: Date.now }
});

const Producto = mongoose.model('Producto', productoSchema);

const ventaSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    productos: [{
        producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
        cantidad: Number,
        precioUnitario: Number
    }],
    total: { type: Number, required: true },
    codigoQR: { type: String, unique: true },
    fechaVenta: { type: Date, default: Date.now },
    estado: { type: String, enum: ['pendiente', 'completada', 'cancelada'], default: 'completada' }
});

const Venta = mongoose.model('Venta', ventaSchema);

// ============================================
// RUTAS PRINCIPALES
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'perfil.html'));
});

// ============================================
// RUTAS DE MANEJO DE IMÁGENES CON CLOUDINARY
// ============================================

// Subir archivos a Cloudinary
app.post('/api/upload-images', upload.array('images', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se han subido archivos' });
        }

        // Los archivos ya están subidos a Cloudinary por multer-storage-cloudinary
        const uploadedImages = req.files.map(file => ({
            url: file.path, // URL de Cloudinary
            publicId: file.filename, // ID público de Cloudinary
            originalName: file.originalname
        }));

        console.log('📸 [CLOUDINARY] Imágenes subidas:', uploadedImages.length);
        
        res.json({
            success: true,
            message: `${uploadedImages.length} imagen(es) subida(s) exitosamente`,
            images: uploadedImages
        });
    } catch (error) {
        console.error('❌ [CLOUDINARY] Error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error al subir imágenes: ' + error.message 
        });
    }
});

// Eliminar imagen de Cloudinary
app.delete('/api/delete-image/:publicId', async (req, res) => {
    try {
        const publicId = req.params.publicId;
        
        // Eliminar de Cloudinary
        const result = await cloudinary.uploader.destroy(publicId);
        
        if (result.result === 'ok') {
            console.log('🗑️ [CLOUDINARY] Imagen eliminada:', publicId);
            res.json({
                success: true,
                message: 'Imagen eliminada exitosamente'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'Imagen no encontrada'
            });
        }
    } catch (error) {
        console.error('❌ [CLOUDINARY] Error eliminando:', error);
        res.status(500).json({
            success: false,
            error: 'Error al eliminar imagen: ' + error.message
        });
    }
});

// Listar imágenes de Cloudinary
app.get('/api/uploaded-images', async (req, res) => {
    try {
        // Obtener imágenes de la carpeta 'plantas-tienda'
        const result = await cloudinary.search
            .expression('folder:plantas-tienda')
            .sort_by([['created_at', 'desc']])
            .max_results(50)
            .execute();

        const images = result.resources.map(resource => ({
            url: resource.secure_url,
            publicId: resource.public_id,
            createdAt: resource.created_at
        }));

        res.json({
            success: true,
            totalImages: images.length,
            images: images
        });
    } catch (error) {
        console.error('❌ [CLOUDINARY] Error listando:', error);
        res.status(500).json({
            success: false,
            error: 'Error al listar imágenes: ' + error.message
        });
    }
});

// ============================================
// API ROUTES - PRODUCTOS
// ============================================
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find({ activo: true });
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

app.get('/api/productos/:id', async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json(producto);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, descripcion, precio, categoria, imagenes, stock } = req.body;
        
        console.log('🌱 [PRODUCTO] Creando producto:', { nombre, imagenes });
        
        if (!nombre || !descripcion || !precio || !categoria) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
        
        let imagenesFinales = [];
        if (imagenes && Array.isArray(imagenes)) {
            imagenesFinales = imagenes.filter(img => img && img.trim() !== '');
        } else if (imagenes && typeof imagenes === 'string') {
            imagenesFinales = [imagenes.trim()];
        }
        
        const nuevoProducto = new Producto({
            nombre: nombre.trim(),
            descripcion: descripcion.trim(),
            precio: parseFloat(precio),
            categoria: categoria.trim(),
            imagenes: imagenesFinales,
            stock: parseInt(stock) || 0
        });

        const productoGuardado = await nuevoProducto.save();
        
        console.log('✅ [PRODUCTO] Producto creado:', {
            id: productoGuardado._id,
            nombre: productoGuardado.nombre,
            imagenes: productoGuardado.imagenes
        });
        
        res.status(201).json(productoGuardado);
    } catch (error) {
        console.error('❌ [PRODUCTO] Error:', error);
        res.status(400).json({ error: 'Error al crear producto: ' + error.message });
    }
});

app.put('/api/productos/:id', async (req, res) => {
    try {
        const { nombre, descripcion, precio, categoria, imagenes, stock } = req.body;
        
        const productoActualizado = await Producto.findByIdAndUpdate(
            req.params.id,
            {
                nombre,
                descripcion,
                precio: parseFloat(precio),
                categoria,
                imagenes,
                stock: parseInt(stock)
            },
            { new: true }
        );

        if (!productoActualizado) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json(productoActualizado);
    } catch (error) {
        res.status(400).json({ error: 'Error al actualizar producto: ' + error.message });
    }
});

app.delete('/api/productos/:id', async (req, res) => {
    try {
        const producto = await Producto.findByIdAndUpdate(
            req.params.id,
            { activo: false },
            { new: true }
        );

        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// ============================================
// API ROUTES - USUARIOS Y AUTENTICACIÓN
// ============================================
app.post('/api/register', async (req, res) => {
    try {
        const { nombre, apellido, email, password, telefono, direccion } = req.body;
        
        console.log('🔐 [REGISTER] Iniciando registro para:', email);
        
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            console.log('❌ [REGISTER] Email ya registrado:', email);
            return res.status(400).json({ success: false, message: 'El email ya está registrado' });
        }
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const nuevoUsuario = new Usuario({
            nombre,
            apellido,
            email,
            password: hashedPassword,
            telefono,
            direccion
        });
        
        const usuarioGuardado = await nuevoUsuario.save();
        console.log('✅ [REGISTER] Usuario guardado en DB:', usuarioGuardado._id);
        
        req.session.isLoggedIn = true;
        req.session.userId = usuarioGuardado._id;
        req.session.userType = 'cliente';
        req.session.userName = `${usuarioGuardado.nombre} ${usuarioGuardado.apellido}`;
        
        res.json({ 
            success: true, 
            message: 'Usuario registrado exitosamente',
            user: {
                id: usuarioGuardado._id,
                nombre: usuarioGuardado.nombre,
                apellido: usuarioGuardado.apellido,
                email: usuarioGuardado.email
            }
        });
    } catch (error) {
        console.error('❌ [REGISTER] Error:', error);
        res.status(500).json({ success: false, message: 'Error al registrar usuario: ' + error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('🔐 [LOGIN] Intento de login para:', email);
        
        const adminUsername = process.env.ADMIN_USERNAME || 'tamypau';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Isii2607';
        
        if (email === adminUsername && password === adminPassword) {
            req.session.isLoggedIn = true;
            req.session.isAdmin = true;
            req.session.userType = 'admin';
            req.session.userName = 'Administrador';
            
            console.log('👑 [LOGIN] Admin login exitoso');
            
            return res.json({ 
                success: true, 
                message: 'Login exitoso',
                userType: 'admin',
                redirectTo: '/admin'
            });
        }
        
        const usuario = await Usuario.findOne({ email, activo: true });
        if (!usuario) {
            console.log('❌ [LOGIN] Usuario no encontrado:', email);
            return res.status(401).json({ success: false, message: 'Email o contraseña incorrectos' });
        }
        
        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            console.log('❌ [LOGIN] Contraseña incorrecta para:', email);
            return res.status(401).json({ success: false, message: 'Email o contraseña incorrectos' });
        }
        
        req.session.isLoggedIn = true;
        req.session.userId = usuario._id;
        req.session.userType = 'cliente';
        req.session.userName = `${usuario.nombre} ${usuario.apellido}`;
        
        console.log('✅ [LOGIN] Usuario login exitoso');
        
        res.json({ 
            success: true, 
            message: 'Login exitoso',
            userType: 'cliente',
            redirectTo: '/perfil',
            user: {
                id: usuario._id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                email: usuario.email
            }
        });
        
    } catch (error) {
        console.error('❌ [LOGIN] Error:', error);
        res.status(500).json({ success: false, message: 'Error en el servidor: ' + error.message });
    }
});

app.get('/api/session-status', (req, res) => {
    if (req.session.isLoggedIn) {
        res.json({
            isLoggedIn: true,
            userType: req.session.isAdmin ? 'admin' : 'cliente',
            userName: req.session.userName || 'Usuario',
            userId: req.session.userId
        });
    } else {
        res.json({
            isLoggedIn: false
        });
    }
});

app.post('/api/logout', (req, res) => {
    const sessionId = req.sessionID;
    console.log('🚪 [LOGOUT] Destruyendo sesión:', sessionId);
    
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ [LOGOUT] Error destruyendo sesión:', err);
            return res.status(500).json({ success: false, message: 'Error al cerrar sesión' });
        }
        console.log('✅ [LOGOUT] Sesión destruida exitosamente');
        res.json({ success: true, message: 'Logout exitoso' });
    });
});

// ============================================
// RUTAS DE TESTING
// ============================================
app.get('/api/test/estado-db', async (req, res) => {
    try {
        const totalUsuarios = await Usuario.countDocuments();
        const totalProductos = await Producto.countDocuments();
        const totalVentas = await Venta.countDocuments();
        
        const estadoConexion = mongoose.connection.readyState;
        const estadosConexion = {
            0: 'Desconectado',
            1: 'Conectado',
            2: 'Conectando',
            3: 'Desconectando'
        };
        
        res.json({
            mensaje: '📊 Estado General de MongoDB',
            cloudinary: {
                configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
                cloudName: process.env.CLOUDINARY_CLOUD_NAME
            },
            conexion: {
                estado: estadosConexion[estadoConexion],
                baseDatos: mongoose.connection.name
            },
            estadisticas: {
                usuarios: totalUsuarios,
                productos: totalProductos,
                ventas: totalVentas
            },
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error verificando estado de la base de datos',
            mensaje: error.message
        });
    }
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error global:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Archivo muy grande (máximo 10MB)' });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({ error: 'Demasiados archivos (máximo 5)' });
        }
    }
    
    res.status(500).json({ error: 'Error interno del servidor' });
});

// Ruta 404
app.get('*', (req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

// Para desarrollo local
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🌱 Servidor corriendo en http://localhost:${PORT}`);
        console.log(`📊 Admin panel en http://localhost:${PORT}/admin`);
        console.log(`☁️ Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Configurado' : 'NO configurado'}`);
    });
}

module.exports = app;