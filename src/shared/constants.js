// Shared constants used across the application

// Display and pagination constants
const DISPLAY_LIMIT = 20;
const FETCH_BATCH_SIZE = 100;

// Issue status types
const ISSUE_STATUS = {
    BACKLOG: 'backlog',
    IN_PROGRESS: 'in-progress',
    DONE: 'done'
};

// API endpoints
const API_ENDPOINTS = {
    TOKEN_STATUS: '/api/token-status',
    CACHED_TOKEN: '/api/cached-token',
    LINEAR_PROXY: '/api/linear'
};

// Environment variables
const ENV_KEYS = {
    LINEAR_API_KEY: 'LINEAR_API_KEY'
};

module.exports = {
    DISPLAY_LIMIT,
    FETCH_BATCH_SIZE,
    ISSUE_STATUS,
    API_ENDPOINTS,
    ENV_KEYS
};
