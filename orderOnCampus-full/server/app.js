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
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});

// Middleware
app.disable('x-powered-by');
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
});
app.use(require('./lib/errorStats').middleware);
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
// Uploaded menu/canteen images (random names, image types only, served with nosniff)
app.use('/uploads', require('./controllers/uploadController').serveUploads);
app.use('/admin', require('./routes/admin'));
app.use('/', routes);
app.use('/ai', aiRouter);
app.use('/users', userRouter);

// Errors become a generic JSON message; details stay in the server log.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (err?.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body is not valid JSON' });
    if (err?.type === 'entity.too.large') return res.status(413).json({ message: 'Request is too large' });
    console.error('Unhandled error:', err);
    return res.status(500).json({ message: 'Internal server error' });
});

// Realtime: authenticated sockets with server-assigned rooms (see lib/realtime.js)
require('./lib/realtime').attach(io);

// Start server
const PORT = process.env.PORT || 5001;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { app, io };

