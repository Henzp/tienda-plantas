// ✅ AGREGADO: Importaciones y configuración (mantener lo existente)
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

// Configuración de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Middleware
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Configuración de sesiones
app.use(session({
    secret: process.env.SESSION_SECRET || 'tienda-plantas-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Configuración de Multer con Cloudinary
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'tienda-plantas',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    }
});
const upload = multer({ storage: storage });

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Conectado a MongoDB Atlas'))
    .catch(err => console.error('❌ Error conectando a MongoDB:', err));

// ✅ ESQUEMAS EXISTENTES
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

// ✅ NUEVO: ESQUEMA PARA BANNER
const bannerSchema = new mongoose.Schema({
    orden: { type: Number, required: true, unique: true },
    imagen: { type: String, required: true },
    alt: { type: String, required: true },
    activo: { type: Boolean, default: true },
    fechaCreacion: { type: Date, default: Date.now },
    fechaActualizacion: { type: Date, default: Date.now }
});

// Modelos
const Usuario = mongoose.model('Usuario', usuarioSchema);
const Producto = mongoose.model('Producto', productoSchema);
const Banner = mongoose.model('Banner', bannerSchema); // ✅ NUEVO

// ✅ RUTAS EXISTENTES (mantener todas)
// Servir páginas HTML
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

app.get('/producto/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'producto.html'));
});

// ✅ API EXISTENTES DE PRODUCTOS (mantener todas)
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find({ activo: true }).sort({ fechaCreacion: -1 });
        res.json(productos);
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json({ error: 'Error obteniendo productos' });
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
        console.error('Error obteniendo producto:', error);
        res.status(500).json({ error: 'Error obteniendo producto' });
    }
});

app.post('/api/productos', async (req, res) => {
    try {
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

// ✅ NUEVAS RUTAS API PARA BANNER
// Obtener todas las imágenes del banner
app.get('/api/banner', async (req, res) => {
    try {
        const bannerItems = await Banner.find({ activo: true }).sort({ orden: 1 });
        res.json(bannerItems);
    } catch (error) {
        console.error('Error obteniendo banner:', error);
        res.status(500).json({ error: 'Error obteniendo banner' });
    }
});

// Crear nueva imagen del banner
app.post('/api/banner', async (req, res) => {
    try {
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

// Actualizar imagen del banner
app.put('/api/banner/:id', async (req, res) => {
    try {
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

// Eliminar imagen del banner
app.delete('/api/banner/:id', async (req, res) => {
    try {
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

// Reordenar imágenes del banner
app.put('/api/banner/reordenar', async (req, res) => {
    try {
        const { items } = req.body; // Array de {id, orden}
        
        if (!items || !Array.isArray(items)) {
            return res.status(400).json({ error: 'Se requiere un array de items' });
        }
        
        // Actualizar orden de cada item
        const promesas = items.map(item => 
            Banner.findByIdAndUpdate(
                item.id, 
                { orden: item.orden, fechaActualizacion: new Date() },
                { new: true }
            )
        );
        
        await Promise.all(promesas);
        
        // Devolver items ordenados
        const bannerActualizado = await Banner.find({ activo: true }).sort({ orden: 1 });
        res.json(bannerActualizado);
    } catch (error) {
        console.error('Error reordenando banner:', error);
        res.status(500).json({ error: 'Error reordenando banner' });
    }
});

// ✅ RUTAS EXISTENTES DE IMÁGENES (mantener todas)
app.post('/api/upload-images', upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se subieron archivos' });
        }

        const imageUrls = req.files.map(file => file.path);
        res.json({
            message: 'Imágenes subidas exitosamente',
            urls: imageUrls
        });
    } catch (error) {
        console.error('Error subiendo imágenes:', error);
        res.status(500).json({ error: 'Error subiendo imágenes' });
    }
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
        res.status(500).json({ error: 'Error obteniendo imágenes' });
    }
});

// ✅ RUTAS EXISTENTES DE AUTENTICACIÓN (mantener todas)
app.post('/api/register', async (req, res) => {
    try {
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
        
        if (email === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
            esAdmin = true;
            usuario = {
                _id: 'admin',
                nombre: 'Administrador',
                email: email
            };
        } else {
            usuario = await Usuario.findOne({ email });
            if (!usuario) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
            
            const passwordValido = await bcrypt.compare(password, usuario.password);
            if (!passwordValido) {
                return res.status(401).json({ error: 'Credenciales inválidas' });
            }
        }
        
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
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).json({ error: 'Error al cerrar sesión' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Sesión cerrada exitosamente' });
    });
});

app.get('/api/session-status', (req, res) => {
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
});

// ✅ RUTAS DE TESTING (mantener)
app.get('/api/test/estado-db', async (req, res) => {
    try {
        const estadoConexion = mongoose.connection.readyState;
        const estados = {
            0: 'Desconectado',
            1: 'Conectado',
            2: 'Conectando',
            3: 'Desconectando'
        };
        
        const totalProductos = await Producto.countDocuments();
        const totalUsuarios = await Usuario.countDocuments();
        const totalBanner = await Banner.countDocuments(); // ✅ NUEVO
        
        res.json({
            estado: estados[estadoConexion],
            database: mongoose.connection.name,
            productos: totalProductos,
            usuarios: totalUsuarios,
            banner: totalBanner, // ✅ NUEVO
            timestamp: new Date().toISOString()
        });
    } catch (error) {
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
        res.status(500).json({ 
            status: 'Error',
            error: error.message 
        });
    }
});

// ✅ FUNCIÓN PARA INICIALIZAR BANNER CON DATOS DE EJEMPLO
async function inicializarBanner() {
    try {
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

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`🌱 Servidor corriendo en puerto ${PORT}`);
    console.log(`📍 Dirección: http://localhost:${PORT}`);
    
    // Inicializar banner al iniciar servidor
    await inicializarBanner();
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error no manejado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;