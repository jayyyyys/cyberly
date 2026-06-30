require('dotenv').config();

const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: process.env.DB_PASSWORD,
    database: 'cyberwell'
});

db.connect((err) => {
    if (err) console.error("Database connection failed:", err);
    else console.log("Connected to MySQL!");
});

// --- ROUTES ---

// 1. LOGIN ROUTE
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const sql = "SELECT * FROM users WHERE username = ?";
    db.query(sql, [username], async (err, results) => {
        if (err) return res.status(500).json({ message: "Server error" });
        if (results.length === 0) {
            return res.status(401).json({ message: "No account found with that username." });
        }

        // Renamed result variable to 'user' to avoid conflict with input 'username'
        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: "Incorrect password." });
        }

        // Return user data clearly
        res.json({ user: { username: user.username, age: user.age } });
    });
});

// 2. REGISTER ROUTE
app.post('/api/register', async (req, res) => {
    // Make sure these match the names sent from App.jsx
    const { username, age, password, email } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const sql = "INSERT INTO users (username, age, password, email) VALUES (?, ?, ?, ?)";
        db.query(sql, [username, age, hashedPassword, email], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ message: "Database error" });
            }
            res.status(201).json({ message: "User registered successfully!" });
        });
    } catch (error) {
        res.status(500).json({ message: "Registration failed." });
    }
});

app.listen(5000, () => console.log("Server running on port 5000"));
