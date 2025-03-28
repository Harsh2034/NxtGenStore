const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;
const saltRounds = 10;

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests from any origin during development
        callback(null, true);
    },
    credentials: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// MongoDB Connection
console.log('Attempting to connect to MongoDB...');
mongoose.connect('mongodb://localhost:27017/nxtgenstore', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch(err => {
        console.error('MongoDB connection error:', err);
        process.exit(1); // Exit if MongoDB connection fails
    });

// User Schema
const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String
});

const User = mongoose.model('User', userSchema);

// Order Schema
const orderSchema = new mongoose.Schema({
    userEmail: String,
    items: [{
        name: String,
        price: Number,
        quantity: Number,
        image: String
    }],
    total: Number,
    orderDate: { type: Date, default: Date.now },
    status: { type: String, default: 'Processing' }
});

const Order = mongoose.model('Order', orderSchema);

// Product Schema
const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    image: String,
    category: String,
    rating: Number
});

const Product = mongoose.model('Product', productSchema);

// Sample Products
const sampleProducts = [
    { name: "Lenovo LOQ Laptop", price: 65000, image: "/images/lenovo-loq.jpg", description: "Gaming laptop with Ryzen 7, RTX 4060, 16GB RAM, 512GB SSD.", category: "laptop", rating: 4.5 },
    { name: "Boat Airdopes 141", price: 1299, image: "/images/boat-earbuds.jpg", description: "Wireless earbuds with 42H playtime, IPX4 water resistance.", category: "earbuds", rating: 4.2 },
    { name: "Mi Power Bank 3i", price: 1499, image: "/images/mi-powerbank.jpg", description: "20000mAh power bank with 18W fast charging.", category: "powerbank", rating: 4.0 },
    { name: "Samsung Galaxy Watch 4", price: 14999, image: "/images/galaxy-watch.jpg", description: "Smartwatch with fitness tracking and AMOLED display.", category: "smartwatch", rating: 4.3 },
    { name: "OnePlus Nord CE 3", price: 24999, image: "/images/oneplus-nord.jpg", description: "5G smartphone with 50MP camera, 8GB RAM.", category: "others", rating: 4.4 },
    { name: "JBL Charge 5", price: 14999, image: "/images/jbl-charge.jpg", description: "Portable Bluetooth speaker with 20H battery life.", category: "others", rating: 4.6 },
    { name: "Realme Buds Air 3", price: 3999, image: "/images/realme-buds.jpg", description: "ANC earbuds with 30H playback.", category: "earbuds", rating: 4.1 },
    { name: "HP Pavilion 15", price: 55000, image: "/images/hp-pavilion.jpg", description: "Laptop with Intel i5, 8GB RAM, 512GB SSD.", category: "laptop", rating: 4.0 },
    { name: "Sony WH-1000XM4", price: 24990, image: "/images/sony-headphones.jpg", description: "Noise-cancelling over-ear headphones.", category: "others", rating: 4.8 },
    { name: "Apple AirPods Pro", price: 24900, image: "/images/airpods-pro.jpg", description: "True wireless earbuds with ANC.", category: "earbuds", rating: 4.7 },
    { name: "Redmi Note 13 Pro", price: 27999, image: "/images/redmi-note.jpg", description: "5G phone with 108MP camera, 12GB RAM.", category: "others", rating: 4.5 },
    { name: "Anker 65W Charger", price: 2999, image: "/images/anker-charger.jpg", description: "Compact USB-C charger for laptops/phones.", category: "others", rating: 4.2 },
    { name: "Asus ROG Strix G16", price: 89999, image: "/images/asus-rog.jpg", description: "Gaming laptop with RTX 4070, 16GB RAM.", category: "laptop", rating: 4.6 },
    { name: "Noise ColorFit Pro 4", price: 3499, image: "/images/noise-watch.jpg", description: "Smartwatch with SpO2 and heart rate monitor.", category: "smartwatch", rating: 4.0 },
    { name: "Zebronics Zeb-Transformer", price: 1599, image: "/images/zebronics-keyboard.jpg", description: "RGB mechanical keyboard.", category: "others", rating: 3.9 },
    { name: "Logitech MX Master 3S", price: 9999, image: "/images/logitech-mouse.jpg", description: "Wireless mouse with 8K DPI.", category: "others", rating: 4.5 },
    { name: "Boat Rockerz 255 Pro+", price: 1499, image: "/images/boat-rockerz.jpg", description: "Neckband earphones with 60H battery.", category: "earbuds", rating: 4.1 },
    { name: "Dell Inspiron 14", price: 45999, image: "/images/dell-inspiron.jpg", description: "Laptop with Intel i3, 8GB RAM, 256GB SSD.", category: "laptop", rating: 3.8 },
    { name: "Portronics Toad 5", price: 699, image: "/images/portronics-mouse.jpg", description: "Wireless mouse with silent clicks.", category: "others", rating: 3.7 },
    { name: "Ambrane 10000mAh Power Bank", price: 999, image: "/images/ambrane-powerbank.jpg", description: "Slim power bank with fast charging.", category: "powerbank", rating: 4.0 }
];

// Insert sample products if collection is empty
console.log('Checking if products collection is empty...');
Product.countDocuments()
    .then(count => {
        console.log(`Found ${count} products in the database.`);
        if (count === 0) {
            console.log('Inserting sample products into MongoDB...');
            return Product.insertMany(sampleProducts);
        } else {
            console.log('Products already exist in the database, skipping insertion.');
            return Promise.resolve();
        }
    })
    .then(() => console.log('Sample products insertion completed.'))
    .catch(err => console.error('Error during product insertion:', err));

// Routes
app.get('/check-session', (req, res) => {
    console.log('Checking session...');
    if (req.session.user) {
        res.json({ isLoggedIn: true, user: req.session.user });
    } else {
        res.json({ isLoggedIn: false });
    }
});

app.post('/signup', async (req, res) => {
    console.log('Signup request received:', req.body);
    const { name, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            console.log('Email already exists:', email);
            return res.status(400).json({ message: 'Email already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        req.session.user = { name, email };
        console.log('User signed up successfully:', { name, email });
        res.status(201).json({ message: 'Signup successful', user: { name, email } });
    } catch (err) {
        console.error('Error during signup:', err);
        res.status(500).json({ message: 'Error during signup' });
    }
});

app.post('/login', async (req, res) => {
    console.log('Login request received:', req.body);
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found:', email);
            return res.status(400).json({ message: 'User not found' });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            console.log('Incorrect password for:', email);
            return res.status(400).json({ message: 'Incorrect password' });
        }
        req.session.user = { name: user.name, email: user.email };
        console.log('User logged in successfully:', { name: user.name, email: user.email });
        res.json({ message: 'Login successful', user: { name: user.name, email: user.email } });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Error during login' });
    }
});

app.post('/logout', (req, res) => {
    console.log('Logout request received');
    req.session.destroy(err => {
        if (err) {
            console.error('Error during logout:', err);
            return res.status(500).json({ message: 'Error during logout' });
        }
        console.log('User logged out successfully');
        res.json({ message: 'Logout successful' });
    });
});

app.post('/forgot-password', async (req, res) => {
    console.log('Forgot password request received:', req.body);
    const { email, newPassword } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            console.log('User not found:', email);
            return res.status(400).json({ message: 'User not found' });
        }
        user.password = await bcrypt.hash(newPassword, saltRounds);
        await user.save();
        console.log('Password reset successfully for:', email);
        res.json({ message: 'Password reset successful' });
    } catch (err) {
        console.error('Error during password reset:', err);
        res.status(500).json({ message: 'Error during password reset' });
    }
});

app.post('/change-password', async (req, res) => {
    console.log('Change password request received:', req.body);
    if (!req.session.user) {
        return res.status(401).json({ message: 'You must be logged in to change your password' });
    }
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await User.findOne({ email: req.session.user.email });
        if (!user) {
            console.log('User not found:', req.session.user.email);
            return res.status(400).json({ message: 'User not found' });
        }
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) {
            console.log('Incorrect current password for:', req.session.user.email);
            return res.status(400).json({ message: 'Incorrect current password' });
        }
        user.password = await bcrypt.hash(newPassword, saltRounds);
        await user.save();
        console.log('Password changed successfully for:', req.session.user.email);
        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Error during password change:', err);
        res.status(500).json({ message: 'Error during password change' });
    }
});

app.get('/products', async (req, res) => {
    console.log('Fetching products from MongoDB...');
    try {
        const products = await Product.find();
        console.log(`Found ${products.length} products in MongoDB:`, products);
        res.json(products);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ message: 'Error fetching products', error: err.message });
    }
});

app.post('/place-order', async (req, res) => {
    console.log('Place order request received:', req.body);
    if (!req.session.user) {
        return res.status(401).json({ message: 'You must be logged in to place an order' });
    }
    const { items, total } = req.body;
    try {
        const enrichedItems = await Promise.all(items.map(async item => {
            const product = await Product.findOne({ name: item.name });
            return {
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: product ? product.image : '/images/default.jpg'
            };
        }));
        const order = new Order({
            userEmail: req.session.user.email,
            items: enrichedItems,
            total
        });
        await order.save();
        console.log('Order placed successfully for:', req.session.user.email);
        res.json({ message: 'Order placed successfully' });
    } catch (err) {
        console.error('Error placing order:', err);
        res.status(500).json({ message: 'Error placing order' });
    }
});

app.get('/my-orders', async (req, res) => {
    console.log('Fetching orders for user...');
    if (!req.session.user) {
        return res.status(401).json({ message: 'You must be logged in to view orders' });
    }
    try {
        const orders = await Order.find({ userEmail: req.session.user.email }).sort({ orderDate: -1 });
        console.log(`Found ${orders.length} orders for:`, req.session.user.email);
        res.json(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ message: 'Error fetching orders' });
    }
});

app.post('/cancel-order', async (req, res) => {
    console.log('Cancel order request received:', req.body);
    if (!req.session.user) {
        return res.status(401).json({ message: 'You must be logged in to cancel an order' });
    }
    const { orderId } = req.body;
    try {
        const order = await Order.findOne({ _id: orderId, userEmail: req.session.user.email });
        if (!order) {
            console.log('Order not found or not authorized:', orderId);
            return res.status(404).json({ message: 'Order not found or you are not authorized' });
        }
        if (order.status !== 'Processing') {
            console.log('Order cannot be canceled:', orderId);
            return res.status(400).json({ message: 'Order cannot be canceled' });
        }
        order.status = 'Canceled';
        await order.save();
        console.log('Order canceled successfully:', orderId);
        res.json({ message: 'Order canceled successfully' });
    } catch (err) {
        console.error('Error canceling order:', err);
        res.status(500).json({ message: 'Error canceling order' });
    }
});

// Start Server
app.listen(port, () => {
    console.log(`Server chal raha hai at http://localhost:${port}`);
});