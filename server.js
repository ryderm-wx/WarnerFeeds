const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors()); // This will enable CORS for all routes

// Serve static files from the 'WarningFeeder' directory
app.use(express.static(path.join(__dirname)));

// Route to serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
