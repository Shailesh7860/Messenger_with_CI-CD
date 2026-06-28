require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); 
const http = require('http'); 
const { Server } = require('socket.io'); 
const User = require('./models/User'); 

const app = express();
app.use(express.json());
app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('🚀 Successfully connected to MongoDB!'))
    .catch((err) => console.error('❌ Database connection error:', err));

const JWT_SECRET = process.env.JWT_SECRET || 'fallbacksecret';

// Middleware to verify signed HTTP JWT requests
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ message: 'Access Denied: Missing Security Token' });

    jwt.verify(token, JWT_SECRET, (err, decodedUser) => {
        if (err) return res.status(403).json({ message: 'Access Denied: Invalid or Expired Token' });
        req.user = decodedUser;
        next();
    });
}

// --- HTTP ROUTES ---

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

        const token = jwt.sign({ username: normalizedUsername }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ message: 'User registered!', token, username: normalizedUsername });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        let { username, password } = req.body;
        const normalizedUsername = username.trim().toLowerCase();

        const user = await User.findOne({ username: normalizedUsername });
        if (!user) return res.status(400).json({ message: 'Invalid username or password' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid username or password' });
        
        const token = jwt.sign({ username: normalizedUsername }, JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ message: 'Success', token, username: normalizedUsername });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

const MessageSchema = new mongoose.Schema({
    room: { type: String, required: true, default: 'global' }, 
    user: { type: String, required: true },
    text: { type: String, required: true }, // Will hold encrypted, unreadable text inside MongoDB
    timestamp: { type: Date, default: Date.now, expires: 86400 } 
});
const Message = mongoose.model('Message', MessageSchema);

// Protected endpoint to pull room history
app.get('/api/messages', authenticateToken, async (req, res) => {
    try {
        const room = req.query.room || 'global';
        const history = await Message.find({ room }).sort({ timestamp: -1 }).limit(50);
        res.json(history.reverse());
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving chat history', error: error.message });
    }
});

const activeUsers = {};

// WebSocket token verification
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: Token missing"));

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Authentication error: Invalid Token"));
        socket.verifiedUser = decoded.username; 
        next();
    });
});

// --- WEBSOCKET LOGIC ---
io.on('connection', (socket) => {
    console.log(`⚡ Verified connection established: ${socket.id}`);

    socket.on('register_user', () => {
        activeUsers[socket.id] = socket.verifiedUser;
        const uniqueUsernames = Array.from(new Set(Object.values(activeUsers)));
        io.emit('update_user_list', uniqueUsernames);
    });

    socket.on('join_room', (room) => {
        const currentRooms = Array.from(socket.rooms);
        currentRooms.forEach(r => {
            if (r !== socket.id) socket.leave(r);
        });
        socket.join(room);
    });

    socket.on('chat_message', async (data) => {
        const targetRoom = data.room || 'global';
        const secureSender = socket.verifiedUser;

        try {
            const newMessage = new Message({
                room: targetRoom, 
                user: secureSender, 
                text: data.text // Encrypted ciphertext directly from frontend
            });
            const savedMessage = await newMessage.save();
            
            // Broadcast message back with database unique ID appended for targeting removals
            io.to(targetRoom).emit('receive_message', {
                _id: savedMessage._id,
                room: targetRoom,
                user: secureSender,
                text: data.text,
                timestamp: savedMessage.timestamp
            });
        } catch (err) {
            console.error("❌ DB Save Error:", err);
        }
    });

    // 🚀 NEW: Listen for deletion requests and check if request sender actually owns the target message
    socket.on('delete_message', async (data) => {
        try {
            const msg = await Message.findById(data.msgId);
            if (msg && msg.user === socket.verifiedUser) {
                await Message.findByIdAndDelete(data.msgId);
                // Broadcast deletion event to clear the layout on all peer screens inside the target room
                io.to(msg.room).emit('message_deleted', { msgId: data.msgId, room: msg.room });
            }
        } catch (err) {
            console.error("❌ Delete error:", err);
        }
    });

    socket.on('typing', (data) => {
        const targetRoom = data.room || 'global';
        socket.to(targetRoom).emit('user_typing', {
            user: socket.verifiedUser,
            isTyping: data.isTyping
        });
    });

    socket.on('disconnect', () => {
        if (activeUsers[socket.id]) {
            delete activeUsers[socket.id];
            const uniqueUsernames = Array.from(new Set(Object.values(activeUsers)));
            io.emit('update_user_list', uniqueUsernames);
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running secure on port ${PORT}`);
});