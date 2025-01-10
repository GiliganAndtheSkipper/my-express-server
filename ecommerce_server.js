const express = require('express');
const cors = require('cors');  
const pool = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const SECRET_KEY = process.env.SECRET_KEY; 
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Swagger Configuration
const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'E-commerce API',
            version: '1.0.0',
            description: 'API documentation for the E-commerce project',
        },
        servers: [{ url: 'http://localhost:3000' }],
    },
    apis: ['./ecommerce_server.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    try {
        const verified = jwt.verify(token, SECRET_KEY);
        req.user = verified;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

/**
 * @swagger
 * /test-db:
 *   get:
 *     summary: Test the database connection
 *     responses:
 *       200:
 *         description: Database connection successful
 *       500:
 *         description: Database connection failed
 */

// Test Database Connection
app.get('/test-db', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users;');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Database connection failed.' });
    }
});

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               address:
 *                 type: string
 *               phone_number:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 *       409:
 *         description: Email already in use
 *       500:
 *         description: Internal server error
 */

// GET All Users (Protected Route)
app.get('/users', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows); 
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving users.' });
    }
});

// GET User by ID (Protected Route)
app.get('/users/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }
        res.json(result.rows[0]); 
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving the user.' });
    }
});

// GET All Products
app.get('/products', async (req, res) => {
    const { category } = req.query;
    try {
        const query = category 
            ? 'SELECT * FROM products WHERE category_id = $1'
            : 'SELECT * FROM products';
        const params = category ? [category] : [];
        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving products.' });
    }
});

// GET Product by ID
app.get('/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM products WHERE product_id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error retrieving the product.' });
    }
});

// CREATE a New Product (Protected)
app.post('/products', authenticateToken, async (req, res) => {
    const { name, description, price, stock, category_id } = req.body;
    try {
        const result = await pool.query(
            `INSERT INTO products (name, description, price, stock, category_id) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, description, price, stock, category_id]
        );
        res.status(201).json({ message: 'Product added successfully!', product: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Error adding product.' });
    }
});

// UPDATE a Product by ID (Protected)
app.put('/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name, description, price, stock, category_id } = req.body;
    try {
        const result = await pool.query(
            `UPDATE products 
             SET name = $1, description = $2, price = $3, stock = $4, category_id = $5
             WHERE product_id = $6 RETURNING *`,
            [name, description, price, stock, category_id, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.json({ message: 'Product updated successfully!', product: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Error updating product.' });
    }
});

// DELETE a Product by ID (Protected)
app.delete('/products/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM products WHERE product_id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.json({ message: `Product with ID ${id} deleted successfully!` });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting the product.' });
    }
});

// User Registration Route
app.post('/register', async (req, res) => {
    const { name, email, password, address, phone_number } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    try {
        const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: 'Email already in use.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO users (name, email, password, address, phone_number) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [name, email, hashedPassword, address, phone_number]
        );
        res.status(201).json({ message: 'User registered successfully!', user: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Error registering user.' });
    }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Authenticate a user and return a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful, returns a token
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Error during login
 */

// User Login Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    try {
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const isValidPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid credentials.' });
        }

        const token = jwt.sign(
            { user_id: user.rows[0].user_id, email: user.rows[0].email },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        res.json({ message: 'Login successful!', token });
    } catch (err) {
        res.status(500).json({ error: 'Error logging in.' });
    }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Welcome route for the API
 *     responses:
 *       200:
 *         description: API welcome message
 */

// Root Welcome Route
app.get('/', (req, res) => {
    res.send('Welcome to the E-commerce API! Try /users, /products, etc.');
});

// Start the Server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
