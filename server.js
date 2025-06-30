const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// ============================================
// CONFIGURACIÓN DE SESIONES MEJORADA
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

// ============================================
// MIDDLEWARE DE DEBUG DE SESIONES
// ============================================
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const sessionInfo = {
        path: req.path,
        method: req.method,
        sessionExists: !!req.session,
        sessionId: req.sessionID,
        isLoggedIn: req.session?.isLoggedIn || false,
        userType: req.session?.userType || 'none',
        userName: req.session?.userName || 'none'
    };
    
    if (req.path.includes('/api/') || req.path === '/' || req.path === '/perfil') {
        console.log(`🔍 [${timestamp}] SESSION DEBUG:`, JSON.stringify(sessionInfo, null, 2));
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

app.get('/cuidados/:tipoPlanta', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cuidados.html'));
});

// ============================================
// RUTAS DE DEBUG DE SESIONES
// ============================================
app.get('/api/debug/session', (req, res) => {
    const sessionInfo = {
        timestamp: new Date().toISOString(),
        sessionExists: !!req.session,
        sessionId: req.sessionID,
        sessionData: {
            isLoggedIn: req.session?.isLoggedIn || false,
            isAdmin: req.session?.isAdmin || false,
            userType: req.session?.userType || 'none',
            userName: req.session?.userName || 'none',
            userId: req.session?.userId || 'none'
        },
        cookies: req.headers.cookie,
        userAgent: req.headers['user-agent']
    };
    
    res.json({
        mensaje: '🔍 Estado de Sesión Actual',
        ...sessionInfo
    });
});

app.get('/api/debug/test-session-persistence', (req, res) => {
    if (!req.session.testCounter) {
        req.session.testCounter = 1;
    } else {
        req.session.testCounter++;
    }
    
    res.json({
        mensaje: '🧪 Test de Persistencia de Sesión',
        contador: req.session.testCounter,
        sessionId: req.sessionID,
        timestamp: new Date().toISOString(),
        advice: 'Si el contador no aumenta, las sesiones no persisten'
    });
});

// ============================================
// RUTAS DE MANEJO DE IMÁGENES (SOLO URLs EXTERNAS PARA VERCEL)
// ============================================
app.post('/api/upload-images', (req, res) => {
    // En Vercel, no podemos subir archivos al sistema de archivos
    // Solo devolvemos un mensaje explicativo
    res.status(501).json({
        success: false,
        message: 'Upload de archivos no disponible en Vercel. Use URLs externas.',
        error: 'VERCEL_NO_FILE_UPLOAD',
        suggestion: 'Agregue las imágenes usando URLs externas en su lugar'
    });
});

app.delete('/api/delete-image/:filename', (req, res) => {
    // En Vercel, no hay archivos locales que eliminar
    res.status(501).json({
        success: false,
        message: 'Eliminación de archivos no disponible en Vercel',
        error: 'VERCEL_NO_FILE_DELETE'
    });
});

app.get('/api/uploaded-images', (req, res) => {
    // En Vercel, devolvemos un array vacío ya que no hay uploads locales
    res.json({
        success: true,
        totalImages: 0,
        images: [],
        message: 'No hay imágenes locales en Vercel. Use URLs externas.'
    });
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

app.get('/api/productos/:id/stock', async (req, res) => {
    try {
        const producto = await Producto.findById(req.params.id);
        if (!producto) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json({
            productoId: producto._id,
            nombre: producto.nombre,
            stock: producto.stock,
            precio: producto.precio,
            activo: producto.activo
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al verificar stock' });
    }
});

// ============================================
// API ROUTES - USUARIOS
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
        
        console.log('🔑 [REGISTER] Sesión creada:', {
            sessionId: req.sessionID,
            userId: req.session.userId,
            userName: req.session.userName
        });
        
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
            
            console.log('👑 [LOGIN] Admin login exitoso:', {
                sessionId: req.sessionID,
                userType: req.session.userType
            });
            
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
        
        console.log('✅ [LOGIN] Usuario login exitoso:', {
            sessionId: req.sessionID,
            userId: req.session.userId,
            userName: req.session.userName
        });
        
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
    console.log('🔍 [SESSION-STATUS] Verificando sesión:', {
        sessionId: req.sessionID,
        isLoggedIn: req.session?.isLoggedIn || false,
        userType: req.session?.userType || 'none'
    });
    
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

app.get('/api/user-profile', async (req, res) => {
    try {
        console.log('👤 [USER-PROFILE] Solicitud de perfil:', {
            sessionId: req.sessionID,
            isLoggedIn: req.session?.isLoggedIn,
            userId: req.session?.userId
        });
        
        if (!req.session.isLoggedIn) {
            console.log('❌ [USER-PROFILE] No autorizado');
            return res.status(401).json({ error: 'No autorizado' });
        }
        
        if (req.session.isAdmin) {
            return res.json({
                tipo: 'admin',
                nombre: 'Administrador',
                email: process.env.ADMIN_USERNAME || 'tamypau'
            });
        }
        
        const usuario = await Usuario.findById(req.session.userId).select('-password');
        if (!usuario) {
            console.log('❌ [USER-PROFILE] Usuario no encontrado en DB:', req.session.userId);
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        console.log('✅ [USER-PROFILE] Perfil encontrado:', usuario.email);
        res.json({
            tipo: 'cliente',
            ...usuario.toObject()
        });
    } catch (error) {
        console.error('❌ [USER-PROFILE] Error:', error);
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

app.put('/api/user-profile', async (req, res) => {
    try {
        if (!req.session.isLoggedIn || req.session.isAdmin) {
            return res.status(401).json({ error: 'No autorizado' });
        }
        
        const { nombre, apellido, telefono, direccion } = req.body;
        
        const usuarioActualizado = await Usuario.findByIdAndUpdate(
            req.session.userId,
            { nombre, apellido, telefono, direccion },
            { new: true }
        ).select('-password');
        
        req.session.userName = `${usuarioActualizado.nombre} ${usuarioActualizado.apellido}`;
        
        console.log('✅ [UPDATE-PROFILE] Perfil actualizado:', usuarioActualizado.email);
        res.json({ success: true, user: usuarioActualizado });
    } catch (error) {
        console.error('❌ [UPDATE-PROFILE] Error:', error);
        res.status(500).json({ error: 'Error al actualizar perfil' });
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
// API ROUTES - COMPRAS Y VENTAS (CON STOCK CORREGIDO)
// ============================================
app.post('/api/procesar-compra', async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        if (!req.session.isLoggedIn) {
            return res.status(401).json({ error: 'Debes estar logueado para comprar' });
        }
        
        const { productos, total } = req.body;
        console.log('🛒 [COMPRA] Iniciando procesamiento:', { productos, total });
        
        if (!productos || productos.length === 0) {
            return res.status(400).json({ error: 'No hay productos en el carrito' });
        }
        
        const productosActualizados = [];
        
        for (const item of productos) {
            const { producto: productoId, cantidad } = item;
            
            const producto = await Producto.findById(productoId).session(session);
            if (!producto) {
                throw new Error(`Producto ${productoId} no encontrado`);
            }
            
            if (producto.stock < cantidad) {
                throw new Error(`Stock insuficiente para ${producto.nombre}. Stock disponible: ${producto.stock}, solicitado: ${cantidad}`);
            }
            
            const nuevoStock = producto.stock - cantidad;
            await Producto.findByIdAndUpdate(
                productoId, 
                { stock: nuevoStock },
                { session, new: true }
            );
            
            console.log(`📦 [STOCK] ${producto.nombre}: ${producto.stock} → ${nuevoStock}`);
            
            productosActualizados.push({
                producto: productoId,
                nombre: producto.nombre,
                cantidad: cantidad,
                precioUnitario: producto.precio,
                stockAnterior: producto.stock,
                stockNuevo: nuevoStock
            });
        }
        
        const codigoQR = 'QR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const nuevaVenta = new Venta({
            usuario: req.session.userId,
            productos: productos.map(item => ({
                producto: item.producto,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario || 0
            })),
            total,
            codigoQR
        });
        
        const ventaGuardada = await nuevaVenta.save({ session });
        
        await session.commitTransaction();
        console.log('✅ [COMPRA] Transacción completada exitosamente');
        
        res.json({ 
            success: true, 
            ventaId: ventaGuardada._id,
            codigoQR: codigoQR,
            message: 'Compra procesada exitosamente',
            productosActualizados: productosActualizados,
            stockReducido: true
        });
        
    } catch (error) {
        await session.abortTransaction();
        console.error('❌ [COMPRA] Error en transacción:', error);
        
        res.status(500).json({ 
            error: 'Error al procesar compra: ' + error.message,
            stockReducido: false
        });
    } finally {
        session.endSession();
    }
});

// ============================================
// API ROUTES - CUIDADOS
// ============================================
app.get('/api/cuidados/:tipoPlanta', (req, res) => {
    const { tipoPlanta } = req.params;
    
    const cuidadosDB = {
        'monstera-deliciosa': {
            nombre: 'Monstera Deliciosa',
            imagen: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600',
            luz: 'Luz indirecta brillante',
            riego: 'Regar cuando la tierra esté seca en los primeros 2-3 cm',
            humedad: '50-60% de humedad relativa',
            temperatura: '18-27°C',
            fertilizante: 'Fertilizar mensualmente en primavera y verano',
            cuidadosEspeciales: [
                'Limpiar las hojas regularmente con un paño húmedo',
                'Proporcionar un tutor para que trepe',
                'Rotar la planta semanalmente para crecimiento uniforme'
            ],
            problemas: [
                'Hojas amarillas: Exceso de riego',
                'Hojas marrones: Falta de humedad',
                'Sin fenestras: Necesita más luz'
            ]
        },
        'pothos-dorado': {
            nombre: 'Pothos Dorado',
            imagen: 'https://images.unsplash.com/photo-1463154545680-d59320fd685d?w=600',
            luz: 'Luz indirecta media a brillante',
            riego: 'Regar cuando la tierra esté seca',
            humedad: '40-50% de humedad',
            temperatura: '15-29°C',
            fertilizante: 'Fertilizar cada 2 meses',
            cuidadosEspeciales: [
                'Muy tolerante a diferentes condiciones',
                'Puede crecer en agua',
                'Podar para mantener forma compacta'
            ],
            problemas: [
                'Hojas pálidas: Demasiada luz directa',
                'Crecimiento lento: Necesita más luz',
                'Raíces podridas: Exceso de agua'
            ]
        },
        'sansevieria': {
            nombre: 'Sansevieria (Lengua de Suegra)',
            imagen: 'https://images.unsplash.com/photo-1509423350716-97f2360af8e4?w=600',
            luz: 'Tolera desde luz baja hasta brillante',
            riego: 'Regar muy poco, cada 2-3 semanas',
            humedad: 'No requiere humedad específica',
            temperatura: '15-27°C',
            fertilizante: 'Fertilizar 2-3 veces al año',
            cuidadosEspeciales: [
                'Muy resistente y fácil de cuidar',
                'Purifica el aire durante la noche',
                'No regar en el centro de la planta'
            ],
            problemas: [
                'Hojas blandas: Exceso de riego',
                'Puntas marrones: Agua con cloro',
                'No crece: Necesita fertilizante'
            ]
        },
        'ficus-lyrata': {
            nombre: 'Ficus Lyrata (Hoja de Violín)',
            imagen: 'https://images.unsplash.com/photo-1468245856972-a0333f3f8293?w=600',
            luz: 'Luz brillante indirecta',
            riego: 'Regar cuando los primeros 3 cm estén secos',
            humedad: '50-65% de humedad',
            temperatura: '18-24°C',
            fertilizante: 'Fertilizar mensualmente en temporada de crecimiento',
            cuidadosEspeciales: [
                'No le gustan los cambios de ubicación',
                'Limpiar hojas semanalmente',
                'Necesita espacio para crecer'
            ],
            problemas: [
                'Hojas cayendo: Estrés por cambio de lugar',
                'Manchas marrones: Exceso de riego',
                'Hojas pequeñas: Necesita más luz'
            ]
        }
    };
    
    const cuidados = cuidadosDB[tipoPlanta];
    if (!cuidados) {
        return res.status(404).json({ error: 'Tipo de planta no encontrado' });
    }
    
    res.json(cuidados);
});

// ============================================
// MIDDLEWARE Y RUTAS ADMIN
// ============================================
function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: 'Acceso no autorizado' });
    }
}

app.get('/api/admin/productos', requireAdmin, async (req, res) => {
    try {
        const productos = await Producto.find({});
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

app.get('/api/admin/ventas', requireAdmin, async (req, res) => {
    try {
        const ventas = await Venta.find({})
            .populate('usuario', 'nombre apellido email')
            .populate('productos.producto', 'nombre')
            .sort({ fechaVenta: -1 });
        res.json(ventas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
});

app.get('/api/admin/usuarios', requireAdmin, async (req, res) => {
    try {
        const usuarios = await Usuario.find({}).select('-password').sort({ fechaRegistro: -1 });
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
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
            conexion: {
                estado: estadosConexion[estadoConexion],
                baseDatos: mongoose.connection.name,
                host: mongoose.connection.host
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

app.get('/api/test/usuarios', async (req, res) => {
    try {
        const usuarios = await Usuario.find({}).select('-password');
        const totalUsuarios = await Usuario.countDocuments();
        
        res.json({
            mensaje: 'Conexión a MongoDB exitosa',
            totalUsuarios: totalUsuarios,
            usuarios: usuarios.map(user => ({
                id: user._id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                fechaRegistro: user.fechaRegistro,
                activo: user.activo
            }))
        });
    } catch (error) {
        res.status(500).json({
            error: 'Error conectando a MongoDB',
            mensaje: error.message
        });
    }
});

app.get('/api/test/ver-stocks', async (req, res) => {
    try {
        const productos = await Producto.find({ activo: true }).select('nombre precio stock categoria');
        
        const stockInfo = productos.map(producto => ({
            id: producto._id,
            nombre: producto.nombre,
            precio: producto.precio,
            stock: producto.stock,
            categoria: producto.categoria,
            estado: producto.stock > 0 ? 'Disponible' : 'Agotado'
        }));
        
        const totalStock = productos.reduce((sum, p) => sum + p.stock, 0);
        const productosAgotados = productos.filter(p => p.stock === 0).length;
        
        res.json({
            mensaje: '📦 Estado Actual de Stocks',
            resumen: {
                totalProductos: productos.length,
                totalStock: totalStock,
                productosAgotados: productosAgotados,
                productosDisponibles: productos.length - productosAgotados
            },
            productos: stockInfo,
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener stocks: ' + error.message });
    }
});

app.post('/api/test/resetear-stock', async (req, res) => {
    try {
        const resultado = await Producto.updateMany(
            {},
            { 
                $set: { 
                    stock: 25
                } 
            }
        );
        
        res.json({
            mensaje: '📦 Stock reseteado para testing',
            productosActualizados: resultado.modifiedCount,
            nuevoStock: 25
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al resetear stock' });
    }
});

// ============================================
// DATOS DE EJEMPLO
// ============================================
app.get('/api/seed', async (req, res) => {
    try {
        const count = await Producto.countDocuments();
        if (count > 0) {
            return res.json({ message: 'Ya existen productos en la base de datos' });
        }

        const productosEjemplo = [
            {
                nombre: 'Monstera Deliciosa',
                descripcion: 'Planta tropical perfecta para interiores. Sus hojas grandes y fenestradas la convierten en la favorita de los amantes de las plantas.',
                precio: 25990,
                categoria: 'Interior',
                imagenes: [
                    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
                    'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400'
                ],
                stock: 15
            },
            {
                nombre: 'Pothos Dorado',
                descripcion: 'Perfecta para principiantes. Crece rápido y es muy resistente. Ideal para colgar o como planta rastrera.',
                precio: 12990,
                categoria: 'Interior',
                imagenes: [
                    'https://images.unsplash.com/photo-1463154545680-d59320fd685d?w=400',
                    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400'
                ],
                stock: 25
            },
            {
                nombre: 'Sansevieria (Lengua de Suegra)',
                descripcion: 'Purifica el aire y requiere muy poco cuidado. Perfecta para oficinas y dormitorios.',
                precio: 18990,
                categoria: 'Interior',
                imagenes: [
                    'https://images.unsplash.com/photo-1509423350716-97f2360af8e4?w=400',
                    'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400'
                ],
                stock: 20
            },
            {
                nombre: 'Ficus Lyrata',
                descripcion: 'Planta de gran porte con hojas en forma de violín. Perfecta como árbol de interior.',
                precio: 45990,
                categoria: 'Interior Grande',
                imagenes: [
                    'https://images.unsplash.com/photo-1468245856972-a0333f3f8293?w=400',
                    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400'
                ],
                stock: 8
            }
        ];

        await Producto.insertMany(productosEjemplo);
        res.json({ message: 'Productos de ejemplo creados exitosamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear productos de ejemplo: ' + error.message });
    }
});

// Manejo de errores global
app.use((error, req, res, next) => {
    console.error('Error global:', error);
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
        console.log(`🔑 Login: ${process.env.ADMIN_USERNAME || 'tamypau'} / ${process.env.ADMIN_PASSWORD || 'Isii2607'}`);
    });
}

module.exports = app;