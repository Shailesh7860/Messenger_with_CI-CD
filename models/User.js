const mongoose = require('mongoose');

// Define what a User looks like in our database
const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true, // Prevents two friends from picking the same username
        trim: true
    },
    password: {
        type: String,
        required: true
    }
}, { timestamps: true }); // Automatically adds "createdAt" and "updatedAt" timestamps

// Export the model so we can use it in other files
module.exports = mongoose.model('User', UserSchema);