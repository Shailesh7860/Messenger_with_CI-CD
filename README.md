# 🔐 Fully Secured Real-Time Messenger

A **WhatsApp/Messenger-inspired real-time chat application** built with **Node.js, Express, MongoDB, Mongoose, Socket.IO, and Tailwind CSS v4**. The application provides secure real-time messaging with **JWT authentication**, **AES-256 End-to-End Encryption (E2EE)**, and an optimized modern chat experience.

---

# 📌 Project Overview

This project is a full-stack real-time messenger designed to demonstrate production-level architecture, secure authentication, encrypted communication, and scalable WebSocket-based messaging.

The application supports:

* 🌍 Public Global Chat
* 👤 Private Direct Messages (DMs)
* 🔒 End-to-End Encrypted Messaging
* ⚡ Real-Time Communication
* 🗑 Delete for Everyone
* ⌨ Live Typing Indicators
* 🖼 Automatic Image URL Preview
* ⏳ Automatic Message Expiration (TTL)

---

# 🏗 Architecture

```
                +----------------------+
                |     Frontend         |
                | Tailwind CSS v4      |
                | CryptoJS AES-256     |
                +----------+-----------+
                           |
                 HTTPS / WebSocket
                           |
            JWT Authentication Layer
                           |
                Node.js + Express Server
                           |
               Socket.IO Event Engine
                           |
                     Mongoose ODM
                           |
                 MongoDB Atlas (chatDB)
                           |
                    users / messages
```

---

# 🚀 Tech Stack

## Frontend

* HTML5
* CSS3
* Tailwind CSS v4
* Vanilla JavaScript
* CryptoJS

---

## Backend

* Node.js
* Express.js
* Socket.IO
* JWT (JSON Web Token)
* bcryptjs
* Mongoose

---

## Database

* MongoDB Atlas
* Mongoose ODM

Database Name:

```
chatDB
```

Collections:

```
users
messages
```

---

# 🔐 Security Features

## Password Hashing

User passwords are never stored in plain text.

The application uses:

* bcryptjs

to securely hash passwords before storing them inside MongoDB.

---

## JWT Authentication

Authentication is handled using JSON Web Tokens.

JWT verification is performed for:

* Protected HTTP routes
* Socket.IO connection handshake

Only authenticated users can establish real-time socket connections.

---

## Client Session Management

The authenticated JWT is stored inside:

```
localStorage
```

and automatically attached to future authenticated requests.

---

# 🔒 End-to-End Encryption (E2EE)

One of the primary features of this project is complete client-side encryption.

The application uses:

* CryptoJS
* AES-256 Encryption

### Encryption Flow

```
User Types Message
        │
        ▼
Encrypt in Browser
        │
        ▼
Ciphertext
        │
        ▼
Node Server
        │
        ▼
MongoDB Atlas
```

The backend never receives readable text.

Only encrypted ciphertext is stored inside the database.

When another authenticated client receives the encrypted payload:

```
Ciphertext
      │
      ▼
Client Browser
      │
Decrypt
      │
      ▼
Original Message
```

Decryption is performed using deterministic room-derived encryption keys.

This ensures messages remain unreadable while in transit and at rest.

---

# ⚡ Real-Time Messaging

Socket.IO powers the complete real-time communication layer.

Features include:

* Instant messaging
* Public chat rooms
* Private Direct Messages
* Live updates
* Real-time synchronization
* Socket room partitioning

Private conversations are isolated using:

```
socket.join(room)
```

which ensures users only receive events belonging to their own room.

---

# 💬 Chat Features

### Public Chat

* Global Lounge
* Shared public discussion

### Private Messaging

* One-to-One Direct Messages
* Room isolation
* Independent chat history

---

# ⌨ Typing Indicator

Typing indicators are transmitted through debounced Socket.IO events to minimize unnecessary network traffic while maintaining a responsive user experience.

---

# 🖼 Smart Media Detection

The messenger automatically detects image URLs inside chat messages.

Supported image links are rendered directly inside the chat as inline image previews, eliminating the need to open them in a separate browser tab.

---

# 🗑 Delete for Everyone

Messages can be removed for all participants.

The delete event is synchronized instantly through WebSocket events so every connected client updates in real time.

---

# 👤 Dynamic User Avatars

Instead of storing profile images, the application automatically generates avatars using:

* User initials
* Name hashing
* Color matrix generation

Each user receives a consistent avatar color across sessions.

---

# 🧹 Automatic Message Cleanup

To keep the database lightweight, message documents automatically expire after **1 day**.

MongoDB TTL (Time-To-Live) indexes remove expired messages without requiring manual cleanup scripts.

Benefits:

* Reduced database size
* Improved performance
* Automatic storage management

---

# 🌐 Deployment

## Backend Hosting

* Render

---

## Database

* MongoDB Atlas

---

## CI/CD Pipeline

Deployment is fully automated using **GitHub Actions**.

Workflow:

```
Push to main
        │
        ▼
GitHub Actions
        │
        ▼
Build Project
        │
        ▼
Deploy to Render
```

Every push to the `main` branch triggers a fresh deployment automatically.

---

# 📁 Project Structure

```
Real-Time-Messenger
│
├── client/
│   ├── assets/
│   ├── js/
│   ├── css/
│   └── index.html
│
├── server/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── sockets/
│   ├── utils/
│   └── server.js
│
├── .github/
│   └── workflows/
│
├── package.json
├── README.md
└── .env
```

---

# ⚙ Installation

## Clone Repository

```bash
git clone <repository-url>
```

---

## Install Dependencies

```bash
npm install
```

---

## Configure Environment Variables

Create a `.env` file:

```env
PORT=5000

MONGODB_URI=your_mongodb_connection

JWT_SECRET=your_secret_key

AES_SECRET=your_encryption_key
```

---

## Run Development Server

```bash
npm run dev
```

or

```bash
node server.js
```

---

# 🎯 Key Highlights

* Production-ready Node.js architecture
* Express REST API
* MongoDB Atlas integration
* Mongoose ODM
* Socket.IO real-time communication
* JWT authentication
* bcrypt password hashing
* AES-256 End-to-End Encryption
* Client-side encryption using CryptoJS
* Public & Private messaging
* Dynamic avatars
* Typing indicators
* Delete for Everyone
* Smart image embedding
* MongoDB TTL auto-cleanup
* GitHub Actions CI/CD
* Automated Render deployment
* Modern responsive UI with Tailwind CSS v4

---

# Future Improvements

* Voice messages
* File sharing
* Read receipts
* Online/offline presence
* Push notifications
* Group chats
* Message reactions
* Emoji picker
* User profile pictures
* Message search
* Dark/Light theme toggle
* Multi-device session support

---

# License

This project is developed for educational purposes and portfolio demonstration. You are free to modify and extend it according to your requirements.

---

# Author

**Huzaifa Ansari**

A full-stack developer passionate about building secure, scalable, and production-ready web applications using modern JavaScript technologies.
