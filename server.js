require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const http = require('http'); // Built-in Node.js module for creating servers
const { Server } = require('socket.io'); // Import Socket.io
const User = require('./models/User'); 

const app = express();
app.use(express.json());
// Tell express to serve files inside the 'public' folder automatically
app.use(express.static('public'));
// 1. Create an HTTP server using Express
const server = http.createServer(app);

// 2. Attach Socket.io to our HTTP server
const io = new Server(server, {
    cors: {
        origin: "*", // Allows connections from our Codespace environment
    }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🚀 Successfully connected to MongoDB!'))
    .catch((err) => console.error('❌ Database connection error:', err));

// // --- HTTP ROUTES ---
// app.get('/', (req, res) => {
//     res.send('Chat App Backend is running with WebSockets!');
// });

// (Keep your registration route here)
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        const userExists = await User.findOne({ username });
        if (userExists) return res.status(400).json({ message: 'Username is already taken' });
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// (Keep your login route here)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: 'Invalid username or password' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid username or password' });
        res.status(200).json({ message: `Welcome back, ${user.username}!`, userId: user._id });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// --- WEBSOCKET LOGIC ---
// This listens for when a user's browser establishes a socket connection
io.on('connection', (socket) => {
    console.log(`⚡ A user connected: ${socket.id}`);

    // Listen for incoming chat messages from a user
    socket.on('chat_message', (data) => {
        console.log(`📩 Message received from client:`, data);
        
        // Broadcast the message instantly to EVERYONE connected
        io.emit('receive_message', data);
    });

    // Listen for when someone is typing
    socket.on('typing', (data) => {
        // Broadcast to everyone EXCEPT the person typing
        socket.broadcast.emit('user_typing', data);
    });

    // Listen for when a user closes their browser/tab
    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
    });
});

// CRITICAL: Change app.listen to server.listen so Socket.io works!
const PORT = 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});