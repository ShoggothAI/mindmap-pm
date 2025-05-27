// CORS middleware configuration
const cors = require('cors');

// Configure CORS options
const corsOptions = {
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.ALLOWED_ORIGINS?.split(',') || false
        : true, // Allow all origins in development
    credentials: true,
    optionsSuccessStatus: 200
};

module.exports = cors(corsOptions);
