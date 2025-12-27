// src/auth/users.js
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// In production, store in database or secure config
const users = [
  {
    id: 1,
    username: 'admin',
    // Default password: 'changeme' - CHANGE IN PRODUCTION
    passwordHash: '$2b$10$WzRWo1krzdn6rnlR7q0XYeKFHTScwI8.V46taNlsgQnlLK5rH8Roi'
  }
];

async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function validatePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function findByUsername(username) {
  return users.find(u => u.username === username);
}

function findById(id) {
  return users.find(u => u.id === id);
}

module.exports = {
  hashPassword,
  validatePassword,
  findByUsername,
  findById
};
