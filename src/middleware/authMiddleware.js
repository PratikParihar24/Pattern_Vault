// src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // 1. Get the token from the header
    // It usually looks like: "x-auth-token: eyJhbGci..."
    const token = req.header('x-auth-token');

    // 2. Check if no token
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // 3. Verify the token
    try {
        // We use our Secret Key to "decode" the wristband
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Success! We attach the user ID to the request object
        // So the next function knows WHO is logged in.
        req.user = decoded; 
        
        next(); // Move to the actual route
    } catch (err) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};