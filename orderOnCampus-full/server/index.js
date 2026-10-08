const express = require('express');
const app = express();
const cors = require('cors');
const aiRouter = require('./routes/ai');
const userRouter = require('./routes/users');

app.use(cors({
    origin: '*', // Be more specific in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ... existing middleware
app.use('/ai', aiRouter);
app.use('/users', userRouter);

// Basic route for testing
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

const PORT = 5001;
app.listen(PORT, '0.0.0.0', () => {  // Listen on all network interfaces
    console.log(`Server running on port ${PORT}`);
});

module.exports = app; 