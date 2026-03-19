require('dotenv').config();
require('log-timestamp')(() => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return `[${formatter.format(now)}]`;
});
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const db = require('./db'); // This initializes the database
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const { isAuthenticated } = require('./middleware/auth');
const { initScheduler } = require('./scheduler');
const { login, isTokenValid } = require('./services/openvpn');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'a-very-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api', authRoutes);
app.use('/api/users', isAuthenticated, userRoutes);

// Frontend Routes
app.get('/', (req, res) => {
    if (req.session.isAuthenticated) {
        res.redirect('/dashboard.html');
    } else {
        res.redirect('/login.html');
    }
});

app.get('/dashboard.html', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});


// Auto-login function
async function autoLogin() {
  if (process.env.OPENVPN_USERNAME && process.env.OPENVPN_PASSWORD) {
    console.log('Attempting to auto-login with credentials from .env file...');
    try {
      await login(process.env.OPENVPN_USERNAME, process.env.OPENVPN_PASSWORD);
      console.log('Auto-login successful. API is authenticated.');
      await syncUsers(); // Sync users after successful auto-login
    } catch (error) {
      console.error('Auto-login failed. Please check credentials in .env file:', error.message);
    }
  }
}

// Start the server
(async () => {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    
    // Start the scheduler
    initScheduler();
  });
})();


module.exports = { autoLogin };