module.exports = {
  testEnvironment: 'node',
  transformIgnorePatterns: [
    'node_modules/(?!(@octokit|before-after-hook|universal-user-agent)/)'
  ],
  transform: {
    '^.+\\.js$': 'babel-jest'
  }
};
