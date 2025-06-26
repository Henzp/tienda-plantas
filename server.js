const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
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

// Modelo de Producto
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

// Login - USANDO TUS CREDENCIALES
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    // Usar las credenciales del archivo .env
    const adminUsername = process.env.ADMIN_USERNAME || 'tamypau';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Isii2607';
    
    if (username === adminUsername && password === adminPassword) {
        req.session.isAdmin = true;
        res.json({ success: true, message: 'Login exitoso' });
    } else {
        res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
    }
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🌱 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`📊 Admin panel en http://localhost:${PORT}/admin`);
    console.log(`🔑 Login: ${process.env.ADMIN_USERNAME || 'tamypau'} / ${process.env.ADMIN_PASSWORD || 'Isii2607'}`);
});