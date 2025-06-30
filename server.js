const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt'); // NUEVO: Para encriptar contraseñas
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET || 'plantme-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

// Conexión a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/plantme', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('✅ Conectado a MongoDB'))
.catch(err => console.error('❌ Error conectando a MongoDB:', err));

// NUEVO: Modelo de Usuario
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

// Modelo de Producto (existente)
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

// NUEVO: Modelo de Venta (para códigos QR)
const ventaSchema = new mongoose.Schema({
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    productos: [{
        producto: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
        cantidad: Number,
        precioUnitario: Number
    }],
    total: { type: Number, required: true },
    codigoQR: { type: String, unique: true }, // Para generar QR único
    fechaVenta: { type: Date, default: Date.now },
    estado: { type: String, enum: ['pendiente', 'completada', 'cancelada'], default: 'completada' }
});

const Venta = mongoose.model('Venta', ventaSchema);

// Rutas principales
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// NUEVO: Página de registro
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'register.html'));
});

// NUEVO: Página de perfil de usuario
app.get('/perfil', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'perfil.html'));
});

// NUEVO: Páginas de cuidados dinámicas
app.get('/cuidados/:tipoPlanta', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'cuidados.html'));
});

// API Routes

// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find({ activo: true });
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Obtener producto por ID
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

// Crear nuevo producto
app.post('/api/productos', async (req, res) => {
    try {
        const { nombre, descripcion, precio, categoria, imagenes, stock } = req.body;
        
        const nuevoProducto = new Producto({
            nombre,
            descripcion,
            precio: parseFloat(precio),
            categoria,
            imagenes: imagenes || [],
            stock: parseInt(stock) || 0
        });

        const productoGuardado = await nuevoProducto.save();
        res.status(201).json(productoGuardado);
    } catch (error) {
        res.status(400).json({ error: 'Error al crear producto: ' + error.message });
    }
});

// Actualizar producto
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

// Eliminar producto (soft delete)
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

// NUEVO: Registro de usuarios
app.post('/api/register', async (req, res) => {
    try {
        const { nombre, apellido, email, password, telefono, direccion } = req.body;
        
        // Verificar si el email ya existe
        const usuarioExistente = await Usuario.findOne({ email });
        if (usuarioExistente) {
            return res.status(400).json({ success: false, message: 'El email ya está registrado' });
        }
        
        // Encriptar contraseña
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        // Crear nuevo usuario
        const nuevoUsuario = new Usuario({
            nombre,
            apellido,
            email,
            password: hashedPassword,
            telefono,
            direccion
        });
        
        const usuarioGuardado = await nuevoUsuario.save();
        
        // Crear sesión automáticamente
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
        res.status(500).json({ success: false, message: 'Error al registrar usuario: ' + error.message });
    }
});

// MODIFICADO: Login mejorado - detecta admin automáticamente
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Verificar credenciales de admin primero
        const adminUsername = process.env.ADMIN_USERNAME || 'tamypau';
        const adminPassword = process.env.ADMIN_PASSWORD || 'Isii2607';
        
        if (email === adminUsername && password === adminPassword) {
            req.session.isLoggedIn = true;
            req.session.isAdmin = true;
            req.session.userType = 'admin';
            req.session.userName = 'Administrador';
            
            return res.json({ 
                success: true, 
                message: 'Login exitoso',
                userType: 'admin',
                redirectTo: '/admin'
            });
        }
        
        // Buscar usuario en la base de datos
        const usuario = await Usuario.findOne({ email, activo: true });
        if (!usuario) {
            return res.status(401).json({ success: false, message: 'Email o contraseña incorrectos' });
        }
        
        // Verificar contraseña
        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(401).json({ success: false, message: 'Email o contraseña incorrectos' });
        }
        
        // Crear sesión de usuario
        req.session.isLoggedIn = true;
        req.session.userId = usuario._id;
        req.session.userType = 'cliente';
        req.session.userName = `${usuario.nombre} ${usuario.apellido}`;
        
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
        res.status(500).json({ success: false, message: 'Error en el servidor: ' + error.message });
    }
});

// NUEVO: Verificar estado de sesión
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

// NUEVO: Obtener datos del usuario logueado
app.get('/api/user-profile', async (req, res) => {
    try {
        if (!req.session.isLoggedIn) {
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
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json({
            tipo: 'cliente',
            ...usuario.toObject()
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener perfil' });
    }
});

// NUEVO: Actualizar perfil de usuario
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
        
        res.json({ success: true, user: usuarioActualizado });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar perfil' });
    }
});

// NUEVO: Procesar compra y generar código QR
app.post('/api/procesar-compra', async (req, res) => {
    try {
        if (!req.session.isLoggedIn) {
            return res.status(401).json({ error: 'Debes estar logueado para comprar' });
        }
        
        const { productos, total } = req.body;
        
        // Generar código QR único
        const codigoQR = 'QR-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        const nuevaVenta = new Venta({
            usuario: req.session.userId,
            productos,
            total,
            codigoQR
        });
        
        const ventaGuardada = await nuevaVenta.save();
        
        res.json({ 
            success: true, 
            ventaId: ventaGuardada._id,
            codigoQR: codigoQR,
            message: 'Compra procesada exitosamente'
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar compra: ' + error.message });
    }
});

// NUEVO: Obtener información de cuidados por tipo de planta
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

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logout exitoso' });
});

// Middleware para verificar admin
function requireAdmin(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: 'Acceso no autorizado' });
    }
}

// Ruta protegida para obtener todos los productos (incluidos inactivos)
app.get('/api/admin/productos', requireAdmin, async (req, res) => {
    try {
        const productos = await Producto.find({});
        res.json(productos);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// NUEVO: Obtener todas las ventas (admin)
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

// NUEVO: Obtener todos los usuarios (admin)
app.get('/api/admin/usuarios', requireAdmin, async (req, res) => {
    try {
        const usuarios = await Usuario.find({}).select('-password').sort({ fechaRegistro: -1 });
        res.json(usuarios);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

// Crear productos de ejemplo al iniciar
app.get('/api/seed', async (req, res) => {
    try {
        // Verificar si ya hay productos
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

// Para desarrollo local
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🌱 Servidor corriendo en http://localhost:${PORT}`);
        console.log(`📊 Admin panel en http://localhost:${PORT}/admin`);
        console.log(`🔑 Login: ${process.env.ADMIN_USERNAME || 'tamypau'} / ${process.env.ADMIN_PASSWORD || 'Isii2607'}`);
    });
}

// Para Vercel - exportar la app
module.exports = app;