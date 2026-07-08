const express = require('express');
const path = require('path');
const mongoose = require('mongoose');

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '/')));

// --- DATABASE CONNECTION ---
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
    console.error('CRITICAL: MONGO_URI environment variable is missing.');
} else {
    mongoose.connect(mongoURI)
        .then(() => console.log('MongoDB connected successfully!'))
        .catch(err => console.error('MongoDB connection error:', err));
}

// --- API ROUTES ---
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'Platform Active', 
        architecture: 'Express Monolith',
        // readyState: 0 (disconnected), 1 (connected), 2 (connecting), 3 (disconnecting)
        dbStatus: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
    });
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
