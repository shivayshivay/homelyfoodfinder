import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MongoDB Schemas
const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phoneNumber: String,
  role: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const dishSchema = new mongoose.Schema({
  chefId: { type: String, required: true },
  chefName: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  image: String,
  category: String,
  createdAt: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  chefId: { type: String, required: true },
  chefName: { type: String, required: true },
  dishId: { type: String, required: true },
  dishName: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  total: { type: Number, required: true },
  address: { type: String, required: true },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Dish = mongoose.model('Dish', dishSchema);
const Order = mongoose.model('Order', orderSchema);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Database Connection
  const MONGODB_URI = process.env.MONGODB_URI;
  let useSqlite = false;
  let sqliteDb: any = null;

  if (MONGODB_URI) {
    try {
      await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
      console.log('Connected to MongoDB');
    } catch (err) {
      console.log('MongoDB connection failed (this is expected in local preview if MongoDB is not running). Falling back to SQLite.');
      useSqlite = true;
    }
  } else {
    console.log('No MONGODB_URI provided, using SQLite for local preview');
    useSqlite = true;
  }

  if (useSqlite) {
    sqliteDb = new Database('local.db');
    sqliteDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        uid TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phoneNumber TEXT,
        role TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS dishes (
        id TEXT PRIMARY KEY,
        chefId TEXT NOT NULL,
        chefName TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image TEXT,
        category TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customerId TEXT NOT NULL,
        customerName TEXT NOT NULL,
        chefId TEXT NOT NULL,
        chefName TEXT NOT NULL,
        dishId TEXT NOT NULL,
        dishName TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL,
        total REAL NOT NULL,
        address TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default dishes if empty
    const count = sqliteDb.prepare('SELECT COUNT(*) as count FROM dishes').get().count;
    if (count === 0) {
      const defaultDishes = [
        {
          id: 'd1',
          chefId: 'chef1',
          chefName: 'Chef Maria',
          name: 'Classic Italian Lasagna',
          description: 'Layered with rich meat sauce, creamy béchamel, and fresh pasta.',
          price: 15.99,
          image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=800',
          category: 'Main Course'
        },
        {
          id: 'd2',
          chefId: 'chef2',
          chefName: 'Chef Ahmed',
          name: 'Authentic Chicken Biryani',
          description: 'Fragrant basmati rice cooked with tender chicken and exotic spices.',
          price: 12.50,
          image: 'https://images.unsplash.com/photo-1563379091339-03b21bc4a4f8?auto=format&fit=crop&q=80&w=800',
          category: 'Main Course'
        },
        {
          id: 'd3',
          chefId: 'chef3',
          chefName: 'Chef Yuki',
          name: 'Fresh Sushi Platter',
          description: 'Assorted nigiri and rolls made with premium grade fresh fish.',
          price: 22.00,
          image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=800',
          category: 'Main Course'
        }
      ];
      const insert = sqliteDb.prepare('INSERT INTO dishes (id, chefId, chefName, name, description, price, image, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      defaultDishes.forEach(d => insert.run(d.id, d.chefId, d.chefName, d.name, d.description, d.price, d.image, d.category));
    }
  }

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      database: useSqlite ? 'sqlite' : (mongoose.connection.readyState === 1 ? 'mongodb' : 'disconnected') 
    });
  });

  // User Routes
  app.post('/api/users', async (req, res) => {
    const { uid, name, phoneNumber, role } = req.body;
    try {
      if (useSqlite) {
        sqliteDb.prepare('INSERT OR REPLACE INTO users (uid, name, phoneNumber, role) VALUES (?, ?, ?, ?)').run(uid, name, phoneNumber, role);
        res.json({ success: true });
      } else {
        const user = await User.findOneAndUpdate(
          { uid },
          { name, phoneNumber, role },
          { upsert: true, new: true }
        );
        res.json({ success: true, user });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/users/:uid', async (req, res) => {
    try {
      if (useSqlite) {
        const user = sqliteDb.prepare('SELECT * FROM users WHERE uid = ?').get(req.params.uid);
        if (user) res.json(user);
        else res.status(404).json({ error: 'User not found' });
      } else {
        const user = await User.findOne({ uid: req.params.uid });
        if (user) res.json(user);
        else res.status(404).json({ error: 'User not found' });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Dishes Routes
  app.get('/api/dishes', async (req, res) => {
    try {
      if (useSqlite) {
        const dishes = sqliteDb.prepare('SELECT * FROM dishes').all();
        res.json(dishes);
      } else {
        const dishes = await Dish.find();
        res.json(dishes.map(d => ({ ...d.toObject(), id: d._id })));
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/dishes', async (req, res) => {
    const { chefId, chefName, name, description, price, image, category } = req.body;
    try {
      if (useSqlite) {
        const id = Math.random().toString(36).substr(2, 9);
        sqliteDb.prepare('INSERT INTO dishes (id, chefId, chefName, name, description, price, image, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, chefId, chefName, name, description, price, image, category);
        res.json({ id });
      } else {
        const dish = new Dish({ chefId, chefName, name, description, price, image, category });
        await dish.save();
        res.json({ id: dish._id });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Orders Routes
  app.get('/api/orders/:uid', async (req, res) => {
    const { role } = req.query;
    try {
      const field = role === 'chef' ? 'chefId' : 'customerId';
      if (useSqlite) {
        const orders = sqliteDb.prepare(`SELECT * FROM orders WHERE ${field} = ? ORDER BY createdAt DESC`).all(req.params.uid);
        res.json(orders);
      } else {
        const orders = await Order.find({ [field]: req.params.uid }).sort({ createdAt: -1 });
        res.json(orders.map(o => ({ ...o.toObject(), id: o._id })));
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/orders', async (req, res) => {
    const { customerId, customerName, chefId, chefName, dishId, dishName, price, quantity, total, address } = req.body;
    try {
      if (useSqlite) {
        const id = Math.random().toString(36).substr(2, 9);
        sqliteDb.prepare('INSERT INTO orders (id, customerId, customerName, chefId, chefName, dishId, dishName, price, quantity, total, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, customerId, customerName, chefId, chefName, dishId, dishName, price, quantity, total, address);
        res.json({ id });
      } else {
        const order = new Order({ 
          customerId, customerName, chefId, chefName, dishId, dishName, price, quantity, total, address 
        });
        await order.save();
        res.json({ id: order._id });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.patch('/api/orders/:id', async (req, res) => {
    const { status } = req.body;
    try {
      if (useSqlite) {
        sqliteDb.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);
        res.json({ success: true });
      } else {
        await Order.findByIdAndUpdate(req.params.id, { status });
        res.json({ success: true });
      }
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
