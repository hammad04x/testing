const config = require('../connection/connection');
const API_KEY = require("../connection/connection")


const authenticateAPIKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
        
    if (!apiKey) {
        return res.status(401).json({ message: 'Access Denied' });
    }
    if (apiKey !== config.API_KEY) {
        return res.status(403).json({ message: 'Invalid API key' });
    }
    next();
};

module.exports = authenticateAPIKey;