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

// --- HTTP ROUTES ---

// Registration endpoint
app.post('/api/register', async (req, res) => {
    try {
        let { username, password } = req.body;
        const normalizedUsername = username.trim().toLowerCase();

        const userExists = await User.findOne({ username: normalizedUsername });
        if (userExists) return res.status(400).json({ message: 'Username is already taken' });
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = new User({ username: normalizedUsername, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        let { username, password } = req.body;
        const normalizedUsername = username.trim().toLowerCase();

        const user = await User.findOne({ username: normalizedUsername });
        if (!user) return res.status(400).json({ message: 'Invalid username or password' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid username or password' });
        
        res.status(200).json({ message: `Welcome back, ${user.username}!`, userId: user._id });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Message Schema with a 3-day auto-expiry (TTL) and Room tracking partitioned fields
const MessageSchema = new mongoose.Schema({
    room: { type: String, required: true, default: 'global' }, 
    user: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now, expires: 86400 } 
});
const Message = mongoose.model('Message', MessageSchema);

// Fetch chat history for a specific room query targeting
app.get('/api/messages', async (req, res) => {
    try {
        const room = req.query.room || 'global';
        const history = await Message.find({ room }).sort({ timestamp: -1 }).limit(50);
        res.json(history.reverse());
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving chat history', error: error.message });
    }
});

// Global state object to map unique raw socket IDs to user names
const activeUsers = {};

// --- WEBSOCKET LOGIC ---
io.on('connection', (socket) => {
    console.log(`⚡ A user connected: ${socket.id}`);

    // Listen for user registrations upon entering the chat screen
    socket.on('register_user', (username) => {
        activeUsers[socket.id] = username.trim().toLowerCase();
        const uniqueUsernames = Array.from(new Set(Object.values(activeUsers)));
        console.log(`👥 Unique Active Users Roster:`, uniqueUsernames);
        io.emit('update_user_list', uniqueUsernames);
    });

    // Room partitioning registration handlers
    socket.on('join_room', (room) => {
        // Leave any previous rooms this socket was registered to safely
        const currentRooms = Array.from(socket.rooms);
        currentRooms.forEach(r => {
            if (r !== socket.id) socket.leave(r);
        });

        socket.join(room);
        console.log(`🚪 Socket ${socket.id} joined partitioned room stream: ${room}`);
    });

    // Listen for incoming chat messages inside partitioned environments
    socket.on('chat_message', async (data) => {
        const targetRoom = data.room || 'global';
        
        try {
            const newMessage = new Message({
                room: targetRoom, 
                user: data.user,
                text: data.text
            });
            await newMessage.save();
        } catch (err) {
            console.error("❌ Error saving message to DB:", err);
        }
        
        // Broadcast strictly to current room subchannel listeners
        io.to(targetRoom).emit('receive_message', data);
    });

    // Listen for typing events within room bounds
    socket.on('typing', (data) => {
        const targetRoom = data.room || 'global';
        socket.to(targetRoom).emit('user_typing', data);
    });

    // Clean up connections upon disconnect
    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.id}`);
        if (activeUsers[socket.id]) {
            delete activeUsers[socket.id];
            const uniqueUsernames = Array.from(new Set(Object.values(activeUsers)));
            io.emit('update_user_list', uniqueUsernames);
        }
    });
});

// Port runtime startup parameters configurations 
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});