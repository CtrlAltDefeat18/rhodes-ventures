const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the root directory (your HTML/CSS/JS)
app.use(express.static(path.join(__dirname, '/')));

// --- API ROUTES GO HERE ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'Platform Active', architecture: 'Express Monolith' });
});

// Fallback route: send all other requests to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Server Initialization
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`CfERI Server running on port ${PORT}`);
});
