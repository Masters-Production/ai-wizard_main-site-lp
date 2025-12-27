// src/index.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const passport = require('./auth/passport');
const config = require('./config');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

app.use(passport.initialize());
app.use(passport.session());

// Auth middleware
function ensureAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login');
  });
});

app.get('/', ensureAuth, (req, res) => {
  res.render('dashboard', { user: req.user, brands: config.brands });
});

app.listen(config.port, () => {
  console.log(`LP Publisher running on http://localhost:${config.port}`);
});

module.exports = app;
