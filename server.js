// server.js

// 1. Import the necessary tools
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
// IMPORT THE ROUTE
const authRoute = require('./src/routes/auth');
const vaultRoute = require('./src/routes/vault'); 
const groupsRoute = require('./src/routes/groups');
const pagesRoute = require('./src/routes/pages');
// 2. Load the secret variables from your .env file
// (We do this so we don't hardcode passwords in our code)
dotenv.config();

const app = express();

// 3. Middleware (The Gatekeepers)
// This line allows your server to understand JSON data sent from the frontend
app.use(express.json());
// Serve the frontend files (HTML, CSS, JS)
// Tell the server to serve files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));


// USE THE ROUTE - This means any URL starting with /api/auth will go to that file
app.use('/api/auth', authRoute);
app.use('/api/vault', vaultRoute);
app.use('/api/groups', groupsRoute);
app.use('/api/pages', pagesRoute);

// 4. The Database Connection Function
const connectDB = async () => {
    try {
        // We look for 'MONGO_URI' in your .env file
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Stop the app if DB fails (It's useless without it)
    }
};

// 5. Run the connection logic
connectDB();

// 6. Start the Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});