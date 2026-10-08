require('dotenv').config();

const express = require('express');
const app = express();
const mongoose = require('mongoose')
const cors = require('cors');
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser');
const http = require('http').Server(app);
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];

const io = require('socket.io')(http, {
    cors: {
        origin: ALLOWED_ORIGINS,
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Middleware
app.use(express.json())
app.use(cookieParser())
app.use(cors({
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(bodyParser.json());

// Routes
const routes = require('./routes/routes');
const aiRouter = require('./routes/ai');
const userRouter = require('./routes/users');


// MongoDB Connection
if (!process.env.MONGODB_URI) {
    console.error('FATAL: MONGODB_URI is not set in environment variables.');
    process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Database connected")
}).catch((error) => {
    console.log("Database connection error:", error)
});

// Route handlers
app.use('/', routes);
app.use('/ai', aiRouter);
app.use('/users', userRouter);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start server
const PORT = process.env.PORT || 5001;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };

