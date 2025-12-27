// src/auth/passport.js
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const { findByUsername, findById, validatePassword } = require('./users');

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = findByUsername(username);
    if (!user) {
      return done(null, false, { message: 'Invalid username or password' });
    }

    const isValid = await validatePassword(password, user.passwordHash);
    if (!isValid) {
      return done(null, false, { message: 'Invalid username or password' });
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  const user = findById(id);
  done(null, user);
});

module.exports = passport;
