# LP Publisher System - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dashboard that allows technical and non-technical users to deploy landing pages and main sites from GitHub repos to a VPS.

**Architecture:** Node.js/Express dashboard with GitHub API integration. Static file serving via Nginx. Preview environment before live deployment. Two brands with separate domains.

**Tech Stack:** Node.js 20+, Express 4, Passport.js (auth), Octokit (GitHub API), EJS (templates), Nginx, PM2 (process manager)

---

## Phase 1: Project Setup

### Task 1.1: Initialize Node.js Project

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `src/index.js`

**Step 1: Initialize npm project**

```bash
cd "F:\Claude Projects\Main-Site-LP-infrastructure"
npm init -y
```

**Step 2: Install core dependencies**

```bash
npm install express express-session passport passport-local bcrypt ejs dotenv
npm install @octokit/rest
npm install --save-dev nodemon jest
```

**Step 3: Create .gitignore**

```gitignore
node_modules/
.env
*.log
builds/
```

**Step 4: Create basic Express app**

```javascript
// src/index.js
require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`LP Publisher running on http://localhost:${PORT}`);
});

module.exports = app;
```

**Step 5: Create .env file**

```env
PORT=3000
SESSION_SECRET=your-secret-key-change-in-production
GITHUB_TOKEN=your-github-token
GITHUB_ORG=Masters-Production
```

**Step 6: Update package.json scripts**

Add to package.json:
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest"
  }
}
```

**Step 7: Test server starts**

```bash
npm run dev
```
Expected: "LP Publisher running on http://localhost:3000"

**Step 8: Verify health endpoint**

```bash
curl http://localhost:3000/health
```
Expected: `{"status":"ok","timestamp":"..."}`

**Step 9: Commit**

```bash
git init
git add .
git commit -m "feat: initialize LP Publisher project structure"
```

---

### Task 1.2: Create Config Module

**Files:**
- Create: `src/config/index.js`
- Create: `src/config/brands.js`
- Create: `tests/config.test.js`

**Step 1: Write failing test for config**

```javascript
// tests/config.test.js
const config = require('../src/config');

describe('Config', () => {
  test('loads brands configuration', () => {
    expect(config.brands).toHaveLength(2);
    expect(config.brands[0]).toHaveProperty('id');
    expect(config.brands[0]).toHaveProperty('domain');
  });

  test('has GitHub configuration', () => {
    expect(config.github).toHaveProperty('org');
  });

  test('has paths configuration', () => {
    expect(config.paths).toHaveProperty('www');
    expect(config.paths).toHaveProperty('preview');
    expect(config.paths).toHaveProperty('builds');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/config.test.js
```
Expected: FAIL - Cannot find module '../src/config'

**Step 3: Create brands configuration**

```javascript
// src/config/brands.js
module.exports = [
  {
    id: 'brand1',
    name: 'Brand 1',
    domain: process.env.BRAND1_DOMAIN || 'brand1.local',
    previewDomain: process.env.BRAND1_PREVIEW_DOMAIN || 'preview.brand1.local',
    mainSiteRepo: process.env.BRAND1_MAIN_REPO || 'main-brand1',
    lpRepoPrefix: 'lp-brand1-'
  },
  {
    id: 'brand2',
    name: 'Brand 2',
    domain: process.env.BRAND2_DOMAIN || 'brand2.local',
    previewDomain: process.env.BRAND2_PREVIEW_DOMAIN || 'preview.brand2.local',
    mainSiteRepo: process.env.BRAND2_MAIN_REPO || 'main-brand2',
    lpRepoPrefix: 'lp-brand2-'
  }
];
```

**Step 4: Create main config module**

```javascript
// src/config/index.js
const brands = require('./brands');

module.exports = {
  port: process.env.PORT || 3000,
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret',

  github: {
    token: process.env.GITHUB_TOKEN,
    org: process.env.GITHUB_ORG || 'Masters-Production'
  },

  brands,

  paths: {
    www: process.env.WWW_PATH || '/var/www',
    preview: process.env.PREVIEW_PATH || '/var/www/preview',
    builds: process.env.BUILDS_PATH || '/tmp/lp-builds'
  }
};
```

**Step 5: Run test to verify it passes**

```bash
npm test -- tests/config.test.js
```
Expected: PASS

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add config module with brands and paths"
```

---

## Phase 2: Authentication

### Task 2.1: Setup Passport Authentication

**Files:**
- Create: `src/auth/passport.js`
- Create: `src/auth/users.js`
- Modify: `src/index.js`
- Create: `tests/auth.test.js`

**Step 1: Write failing test for auth**

```javascript
// tests/auth.test.js
const { validatePassword, hashPassword } = require('../src/auth/users');

describe('Auth', () => {
  test('hashes password correctly', async () => {
    const hash = await hashPassword('testpass123');
    expect(hash).not.toBe('testpass123');
    expect(hash.length).toBeGreaterThan(20);
  });

  test('validates correct password', async () => {
    const hash = await hashPassword('testpass123');
    const isValid = await validatePassword('testpass123', hash);
    expect(isValid).toBe(true);
  });

  test('rejects wrong password', async () => {
    const hash = await hashPassword('testpass123');
    const isValid = await validatePassword('wrongpass', hash);
    expect(isValid).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/auth.test.js
```
Expected: FAIL - Cannot find module

**Step 3: Create users module**

```javascript
// src/auth/users.js
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

// In production, store in database or secure config
const users = [
  {
    id: 1,
    username: 'admin',
    // Default password: 'changeme' - CHANGE IN PRODUCTION
    passwordHash: '$2b$10$rQZ5P3xZ9vZC5h3YH.Wx0eoP3P.C3dN5F7.R8L.N0V3X7J8K9M2Wy'
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
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/auth.test.js
```
Expected: PASS

**Step 5: Create passport configuration**

```javascript
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
```

**Step 6: Update index.js with session and passport**

```javascript
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
```

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add passport authentication with local strategy"
```

---

### Task 2.2: Create Login View

**Files:**
- Create: `src/views/login.ejs`
- Create: `src/views/layout.ejs`
- Create: `src/public/css/style.css`

**Step 1: Create layout template**

```html
<!-- src/views/layout.ejs -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title || 'LP Publisher' %></title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <% if (user) { %>
  <header class="header">
    <div class="logo">LP Publisher</div>
    <nav>
      <span class="user-name"><%= user.username %></span>
      <a href="/logout" class="btn btn-secondary">Logout</a>
    </nav>
  </header>
  <% } %>

  <main class="main">
    <%- body %>
  </main>
</body>
</html>
```

**Step 2: Create login view**

```html
<!-- src/views/login.ejs -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - LP Publisher</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body class="login-page">
  <div class="login-container">
    <h1>LP Publisher</h1>
    <% if (error) { %>
      <div class="error"><%= error %></div>
    <% } %>
    <form method="POST" action="/login">
      <div class="form-group">
        <label for="username">Username</label>
        <input type="text" id="username" name="username" required>
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input type="password" id="password" name="password" required>
      </div>
      <button type="submit" class="btn btn-primary">Login</button>
    </form>
  </div>
</body>
</html>
```

**Step 3: Create basic CSS**

```css
/* src/public/css/style.css */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f5f5f5;
  color: #333;
  line-height: 1.6;
}

.header {
  background: #1a1a2e;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 1.5rem;
  font-weight: bold;
}

.header nav {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

/* Login Page */
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.login-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
}

.login-container h1 {
  text-align: center;
  margin-bottom: 2rem;
  color: #1a1a2e;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  text-decoration: none;
  display: inline-block;
}

.btn-primary {
  background: #4f46e5;
  color: white;
  width: 100%;
}

.btn-primary:hover {
  background: #4338ca;
}

.btn-secondary {
  background: #e5e5e5;
  color: #333;
}

.error {
  background: #fee2e2;
  color: #dc2626;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

/* Dashboard */
.brand-section {
  background: white;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.brand-header {
  background: #1a1a2e;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 8px 8px 0 0;
}

.brand-content {
  padding: 1.5rem;
}

.section-title {
  font-size: 0.875rem;
  text-transform: uppercase;
  color: #666;
  margin-bottom: 0.5rem;
}

.site-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #eee;
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.site-info {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-live {
  background: #dcfce7;
  color: #16a34a;
}

.status-preview {
  background: #fef3c7;
  color: #d97706;
}

.status-none {
  background: #e5e5e5;
  color: #666;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-small {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
}

.btn-success {
  background: #16a34a;
  color: white;
}

.btn-warning {
  background: #d97706;
  color: white;
}

.btn-danger {
  background: #dc2626;
  color: white;
}
```

**Step 4: Verify login page renders**

```bash
npm run dev
```
Navigate to http://localhost:3000/login
Expected: Login form displays correctly

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add login page and base CSS"
```

---

## Phase 3: GitHub Integration

### Task 3.1: Create GitHub Service

**Files:**
- Create: `src/services/github.js`
- Create: `tests/github.test.js`

**Step 1: Write failing test for GitHub service**

```javascript
// tests/github.test.js
const GitHubService = require('../src/services/github');

describe('GitHubService', () => {
  let github;

  beforeEach(() => {
    github = new GitHubService('fake-token', 'test-org');
  });

  test('constructs with token and org', () => {
    expect(github.org).toBe('test-org');
  });

  test('filters repos by prefix', () => {
    const repos = [
      { name: 'lp-brand1-promo', full_name: 'org/lp-brand1-promo' },
      { name: 'lp-brand2-sale', full_name: 'org/lp-brand2-sale' },
      { name: 'other-repo', full_name: 'org/other-repo' }
    ];

    const filtered = github.filterByPrefix(repos, 'lp-brand1-');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('lp-brand1-promo');
  });

  test('extracts LP slug from repo name', () => {
    const slug = github.extractSlug('lp-brand1-promo-spring', 'lp-brand1-');
    expect(slug).toBe('promo-spring');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/github.test.js
```
Expected: FAIL - Cannot find module

**Step 3: Create GitHub service**

```javascript
// src/services/github.js
const { Octokit } = require('@octokit/rest');

class GitHubService {
  constructor(token, org) {
    this.octokit = new Octokit({ auth: token });
    this.org = org;
  }

  async listRepos() {
    const { data } = await this.octokit.repos.listForOrg({
      org: this.org,
      per_page: 100,
      sort: 'updated'
    });
    return data;
  }

  async getRepo(repoName) {
    const { data } = await this.octokit.repos.get({
      owner: this.org,
      repo: repoName
    });
    return data;
  }

  filterByPrefix(repos, prefix) {
    return repos.filter(repo => repo.name.startsWith(prefix));
  }

  extractSlug(repoName, prefix) {
    return repoName.replace(prefix, '');
  }

  async cloneUrl(repoName) {
    return `https://github.com/${this.org}/${repoName}.git`;
  }
}

module.exports = GitHubService;
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/github.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add GitHub service for repo management"
```

---

## Phase 4: Build System

### Task 4.1: Create Build Service

**Files:**
- Create: `src/services/builder.js`
- Create: `tests/builder.test.js`

**Step 1: Write failing test**

```javascript
// tests/builder.test.js
const path = require('path');
const BuilderService = require('../src/services/builder');

describe('BuilderService', () => {
  let builder;

  beforeEach(() => {
    builder = new BuilderService('/tmp/builds');
  });

  test('generates correct build path', () => {
    const buildPath = builder.getBuildPath('my-repo');
    expect(buildPath).toBe('/tmp/builds/my-repo');
  });

  test('generates correct output path', () => {
    const outputPath = builder.getOutputPath('my-repo');
    expect(outputPath).toContain('/tmp/builds/my-repo');
    expect(outputPath).toContain('dist');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/builder.test.js
```
Expected: FAIL

**Step 3: Create builder service**

```javascript
// src/services/builder.js
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const util = require('util');

const execAsync = util.promisify(exec);

class BuilderService {
  constructor(buildsPath) {
    this.buildsPath = buildsPath;
  }

  getBuildPath(repoName) {
    return path.join(this.buildsPath, repoName);
  }

  getOutputPath(repoName) {
    return path.join(this.getBuildPath(repoName), 'dist');
  }

  async clone(repoUrl, repoName) {
    const buildPath = this.getBuildPath(repoName);

    // Remove existing if present
    await fs.rm(buildPath, { recursive: true, force: true });

    // Clone fresh
    await execAsync(`git clone --depth 1 ${repoUrl} ${buildPath}`);

    return buildPath;
  }

  async install(repoName) {
    const buildPath = this.getBuildPath(repoName);
    await execAsync('npm install', { cwd: buildPath });
  }

  async build(repoName) {
    const buildPath = this.getBuildPath(repoName);
    await execAsync('npm run build', { cwd: buildPath });
    return this.getOutputPath(repoName);
  }

  async fullBuild(repoUrl, repoName) {
    await this.clone(repoUrl, repoName);
    await this.install(repoName);
    return await this.build(repoName);
  }
}

module.exports = BuilderService;
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/builder.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add builder service for cloning and building repos"
```

---

## Phase 5: Deploy System

### Task 5.1: Create Deployer Service

**Files:**
- Create: `src/services/deployer.js`
- Create: `tests/deployer.test.js`

**Step 1: Write failing test**

```javascript
// tests/deployer.test.js
const DeployerService = require('../src/services/deployer');

describe('DeployerService', () => {
  let deployer;

  beforeEach(() => {
    deployer = new DeployerService('/var/www', '/var/www/preview');
  });

  test('generates correct preview path for LP', () => {
    const previewPath = deployer.getPreviewPath('brand1', 'lp', 'promo');
    expect(previewPath).toBe('/var/www/preview/brand1/lp/promo');
  });

  test('generates correct preview path for main site', () => {
    const previewPath = deployer.getPreviewPath('brand1', 'main');
    expect(previewPath).toBe('/var/www/preview/brand1/main');
  });

  test('generates correct live path for LP', () => {
    const livePath = deployer.getLivePath('brand1.com', 'lp', 'promo');
    expect(livePath).toBe('/var/www/brand1.com/lp/promo');
  });

  test('generates correct live path for main site', () => {
    const livePath = deployer.getLivePath('brand1.com', 'main');
    expect(livePath).toBe('/var/www/brand1.com');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/deployer.test.js
```
Expected: FAIL

**Step 3: Create deployer service**

```javascript
// src/services/deployer.js
const path = require('path');
const fs = require('fs').promises;

class DeployerService {
  constructor(wwwPath, previewPath) {
    this.wwwPath = wwwPath;
    this.previewPath = previewPath;
  }

  getPreviewPath(brandId, type, slug = null) {
    if (type === 'main') {
      return path.join(this.previewPath, brandId, 'main');
    }
    return path.join(this.previewPath, brandId, 'lp', slug);
  }

  getLivePath(domain, type, slug = null) {
    if (type === 'main') {
      return path.join(this.wwwPath, domain);
    }
    return path.join(this.wwwPath, domain, 'lp', slug);
  }

  async deploy(sourcePath, targetPath) {
    // Ensure target directory exists
    await fs.mkdir(targetPath, { recursive: true });

    // Copy files (preserve lp folder for main site deploys)
    await this.copyDir(sourcePath, targetPath);
  }

  async copyDir(src, dest) {
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await fs.mkdir(destPath, { recursive: true });
        await this.copyDir(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async promoteToLive(previewPath, livePath, preserveLpFolder = false) {
    if (preserveLpFolder) {
      // For main site: backup lp folder, deploy, restore lp folder
      const lpPath = path.join(livePath, 'lp');
      const lpBackup = path.join(livePath, '_lp_backup');

      try {
        await fs.rename(lpPath, lpBackup);
      } catch (e) {
        // lp folder might not exist
      }

      await this.deploy(previewPath, livePath);

      try {
        await fs.rm(path.join(livePath, 'lp'), { recursive: true, force: true });
        await fs.rename(lpBackup, lpPath);
      } catch (e) {
        // Restore failed or no backup
      }
    } else {
      await this.deploy(previewPath, livePath);
    }
  }

  async remove(targetPath) {
    await fs.rm(targetPath, { recursive: true, force: true });
  }
}

module.exports = DeployerService;
```

**Step 4: Run test to verify it passes**

```bash
npm test -- tests/deployer.test.js
```
Expected: PASS

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add deployer service for preview and live deployments"
```

---

## Phase 6: Dashboard Routes

### Task 6.1: Create API Routes

**Files:**
- Create: `src/routes/api.js`
- Modify: `src/index.js`

**Step 1: Create API routes**

```javascript
// src/routes/api.js
const express = require('express');
const router = express.Router();
const config = require('../config');
const GitHubService = require('../services/github');
const BuilderService = require('../services/builder');
const DeployerService = require('../services/deployer');

const github = new GitHubService(config.github.token, config.github.org);
const builder = new BuilderService(config.paths.builds);
const deployer = new DeployerService(config.paths.www, config.paths.preview);

// Get all repos for a brand
router.get('/brands/:brandId/repos', async (req, res) => {
  try {
    const brand = config.brands.find(b => b.id === req.params.brandId);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const allRepos = await github.listRepos();
    const lpRepos = github.filterByPrefix(allRepos, brand.lpRepoPrefix);

    const lps = lpRepos.map(repo => ({
      name: repo.name,
      slug: github.extractSlug(repo.name, brand.lpRepoPrefix),
      url: repo.html_url,
      updatedAt: repo.updated_at
    }));

    res.json({
      mainSiteRepo: brand.mainSiteRepo,
      landingPages: lps
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deploy to preview
router.post('/deploy/preview', async (req, res) => {
  try {
    const { brandId, type, repoName, slug } = req.body;

    const brand = config.brands.find(b => b.id === brandId);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    // Clone and build
    const repoUrl = `https://github.com/${config.github.org}/${repoName}.git`;
    const outputPath = await builder.fullBuild(repoUrl, repoName);

    // Deploy to preview
    const previewPath = deployer.getPreviewPath(brandId, type, slug);
    await deployer.deploy(outputPath, previewPath);

    const previewUrl = type === 'main'
      ? `https://${brand.previewDomain}/`
      : `https://${brand.previewDomain}/lp/${slug}/`;

    res.json({
      success: true,
      previewUrl,
      message: `Deployed to preview: ${previewUrl}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Promote to live
router.post('/deploy/live', async (req, res) => {
  try {
    const { brandId, type, slug } = req.body;

    const brand = config.brands.find(b => b.id === brandId);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const previewPath = deployer.getPreviewPath(brandId, type, slug);
    const livePath = deployer.getLivePath(brand.domain, type, slug);

    const preserveLp = type === 'main';
    await deployer.promoteToLive(previewPath, livePath, preserveLp);

    const liveUrl = type === 'main'
      ? `https://${brand.domain}/`
      : `https://${brand.domain}/lp/${slug}/`;

    res.json({
      success: true,
      liveUrl,
      message: `Published to live: ${liveUrl}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unpublish from live
router.post('/deploy/unpublish', async (req, res) => {
  try {
    const { brandId, type, slug } = req.body;

    const brand = config.brands.find(b => b.id === brandId);
    if (!brand) {
      return res.status(404).json({ error: 'Brand not found' });
    }

    const livePath = deployer.getLivePath(brand.domain, type, slug);
    await deployer.remove(livePath);

    res.json({
      success: true,
      message: 'Unpublished from live'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

**Step 2: Update index.js to include API routes**

Add after auth routes in src/index.js:
```javascript
const apiRoutes = require('./routes/api');

// ... existing code ...

// API routes (protected)
app.use('/api', ensureAuth, apiRoutes);
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add API routes for deploy operations"
```

---

### Task 6.2: Create Dashboard View

**Files:**
- Create: `src/views/dashboard.ejs`
- Create: `src/public/js/dashboard.js`

**Step 1: Create dashboard template**

```html
<!-- src/views/dashboard.ejs -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - LP Publisher</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <header class="header">
    <div class="logo">LP Publisher</div>
    <nav>
      <span class="user-name"><%= user.username %></span>
      <a href="/logout" class="btn btn-secondary btn-small">Logout</a>
    </nav>
  </header>

  <main class="main">
    <% brands.forEach(brand => { %>
    <section class="brand-section" data-brand-id="<%= brand.id %>">
      <div class="brand-header">
        <h2><%= brand.name %> (<%= brand.domain %>)</h2>
      </div>

      <div class="brand-content">
        <!-- Main Site -->
        <div class="section-title">Main Site</div>
        <div class="site-row" data-type="main" data-repo="<%= brand.mainSiteRepo %>">
          <div class="site-info">
            <span class="site-name"><%= brand.mainSiteRepo %></span>
            <span class="status status-none" id="status-<%= brand.id %>-main">Not deployed</span>
          </div>
          <div class="actions">
            <button class="btn btn-small btn-warning" onclick="deployPreview('<%= brand.id %>', 'main', '<%= brand.mainSiteRepo %>')">
              Deploy Preview
            </button>
            <button class="btn btn-small btn-success" onclick="goLive('<%= brand.id %>', 'main')">
              Go Live
            </button>
            <a href="https://<%= brand.domain %>/" target="_blank" class="btn btn-small btn-secondary">View</a>
          </div>
        </div>

        <!-- Landing Pages -->
        <div class="section-title" style="margin-top: 1.5rem;">Landing Pages</div>
        <div id="lp-list-<%= brand.id %>" class="lp-list">
          <p class="loading">Loading...</p>
        </div>

        <div class="add-lp" style="margin-top: 1rem;">
          <input type="text" id="new-lp-<%= brand.id %>" placeholder="Enter LP repo name..." class="input-text">
          <button class="btn btn-small btn-primary" onclick="addLP('<%= brand.id %>')">+ Add LP</button>
        </div>
      </div>
    </section>
    <% }); %>
  </main>

  <div id="toast" class="toast hidden"></div>

  <script>
    const brands = <%- JSON.stringify(brands) %>;
  </script>
  <script src="/js/dashboard.js"></script>
</body>
</html>
```

**Step 2: Create dashboard JavaScript**

```javascript
// src/public/js/dashboard.js

// Load landing pages for each brand
async function loadLandingPages() {
  for (const brand of brands) {
    try {
      const response = await fetch(`/api/brands/${brand.id}/repos`);
      const data = await response.json();

      const container = document.getElementById(`lp-list-${brand.id}`);

      if (data.landingPages.length === 0) {
        container.innerHTML = '<p class="no-lps">No landing pages yet</p>';
        return;
      }

      container.innerHTML = data.landingPages.map(lp => `
        <div class="site-row" data-type="lp" data-slug="${lp.slug}" data-repo="${lp.name}">
          <div class="site-info">
            <span class="site-name">${lp.slug}</span>
            <span class="status status-none">Not deployed</span>
          </div>
          <div class="actions">
            <button class="btn btn-small btn-warning" onclick="deployPreview('${brand.id}', 'lp', '${lp.name}', '${lp.slug}')">
              Preview
            </button>
            <button class="btn btn-small btn-success" onclick="goLive('${brand.id}', 'lp', '${lp.slug}')">
              Live
            </button>
            <a href="https://${brand.domain}/lp/${lp.slug}/" target="_blank" class="btn btn-small btn-secondary">View</a>
            <button class="btn btn-small btn-danger" onclick="unpublish('${brand.id}', 'lp', '${lp.slug}')">
              Unpublish
            </button>
          </div>
        </div>
      `).join('');
    } catch (error) {
      console.error(`Error loading LPs for ${brand.id}:`, error);
    }
  }
}

async function deployPreview(brandId, type, repoName, slug = null) {
  showToast('Deploying to preview...', 'info');

  try {
    const response = await fetch('/api/deploy/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, type, repoName, slug })
    });

    const data = await response.json();

    if (data.success) {
      showToast(`Preview ready: ${data.previewUrl}`, 'success');
      window.open(data.previewUrl, '_blank');
    } else {
      showToast(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
}

async function goLive(brandId, type, slug = null) {
  if (!confirm('Are you sure you want to publish to live?')) return;

  showToast('Publishing to live...', 'info');

  try {
    const response = await fetch('/api/deploy/live', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, type, slug })
    });

    const data = await response.json();

    if (data.success) {
      showToast(`Published: ${data.liveUrl}`, 'success');
    } else {
      showToast(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
}

async function unpublish(brandId, type, slug) {
  if (!confirm('Are you sure you want to unpublish?')) return;

  try {
    const response = await fetch('/api/deploy/unpublish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandId, type, slug })
    });

    const data = await response.json();

    if (data.success) {
      showToast('Unpublished successfully', 'success');
    } else {
      showToast(`Error: ${data.error}`, 'error');
    }
  } catch (error) {
    showToast(`Error: ${error.message}`, 'error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type}`;

  setTimeout(() => {
    toast.className = 'toast hidden';
  }, 5000);
}

// Initialize
document.addEventListener('DOMContentLoaded', loadLandingPages);
```

**Step 3: Add toast styles to CSS**

Append to src/public/css/style.css:
```css
/* Toast notifications */
.toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  padding: 1rem 1.5rem;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 1000;
  transition: opacity 0.3s;
}

.toast.hidden {
  opacity: 0;
  pointer-events: none;
}

.toast-info {
  background: #3b82f6;
  color: white;
}

.toast-success {
  background: #16a34a;
  color: white;
}

.toast-error {
  background: #dc2626;
  color: white;
}

.input-text {
  padding: 0.5rem 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 0.5rem;
}

.loading {
  color: #666;
  font-style: italic;
}

.no-lps {
  color: #999;
}

.add-lp {
  display: flex;
  align-items: center;
}
```

**Step 4: Test the full flow**

```bash
npm run dev
```
Navigate to http://localhost:3000, login, verify dashboard displays

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add dashboard view with deploy functionality"
```

---

## Phase 7: Production Setup

### Task 7.1: Create PM2 Configuration

**Files:**
- Create: `ecosystem.config.js`

**Step 1: Create PM2 config**

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'lp-publisher',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
```

**Step 2: Commit**

```bash
git add ecosystem.config.js
git commit -m "feat: add PM2 configuration for production"
```

---

### Task 7.2: Create Nginx Configuration Template

**Files:**
- Create: `nginx/lp-publisher.conf`

**Step 1: Create Nginx config**

```nginx
# nginx/lp-publisher.conf

# LP Publisher Dashboard
server {
    listen 80;
    server_name admin.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}

# Brand 1 - Main + LPs
server {
    listen 80;
    server_name brand1.com www.brand1.com;
    root /var/www/brand1.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /lp/ {
        try_files $uri $uri/ =404;
    }
}

# Brand 1 - Preview
server {
    listen 80;
    server_name preview.brand1.com;
    root /var/www/preview/brand1;
    index index.html;

    location / {
        try_files $uri $uri/ /main/index.html;
    }

    location /lp/ {
        try_files $uri $uri/ =404;
    }
}

# Brand 2 - Main + LPs
server {
    listen 80;
    server_name brand2.com www.brand2.com;
    root /var/www/brand2.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /lp/ {
        try_files $uri $uri/ =404;
    }
}

# Brand 2 - Preview
server {
    listen 80;
    server_name preview.brand2.com;
    root /var/www/preview/brand2;
    index index.html;

    location / {
        try_files $uri $uri/ /main/index.html;
    }

    location /lp/ {
        try_files $uri $uri/ =404;
    }
}
```

**Step 2: Commit**

```bash
git add nginx/
git commit -m "feat: add Nginx configuration template"
```

---

### Task 7.3: Create Production Setup Script

**Files:**
- Create: `scripts/setup-server.sh`

**Step 1: Create setup script**

```bash
#!/bin/bash
# scripts/setup-server.sh
# Run this on your VPS to set up the LP Publisher

set -e

echo "=== LP Publisher Server Setup ==="

# Create directory structure
echo "Creating directories..."
sudo mkdir -p /var/www/brand1.com/lp
sudo mkdir -p /var/www/brand2.com/lp
sudo mkdir -p /var/www/preview/brand1/lp
sudo mkdir -p /var/www/preview/brand2/lp
sudo mkdir -p /tmp/lp-builds

# Set permissions
echo "Setting permissions..."
sudo chown -R $USER:$USER /var/www
sudo chown -R $USER:$USER /tmp/lp-builds

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    sudo npm install -g pm2
fi

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Copy Nginx config
echo "Copying Nginx config..."
sudo cp nginx/lp-publisher.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/lp-publisher.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Start with PM2
echo "Starting LP Publisher..."
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo "=== Setup Complete ==="
echo "Dashboard: http://admin.yourdomain.com"
echo ""
echo "Next steps:"
echo "1. Update /etc/nginx/sites-available/lp-publisher.conf with your domains"
echo "2. Run: sudo certbot --nginx (for SSL)"
echo "3. Update .env with your GitHub token and domains"
```

**Step 2: Make executable and commit**

```bash
chmod +x scripts/setup-server.sh
git add scripts/
git commit -m "feat: add server setup script"
```

---

## Phase 8: Final Integration

### Task 8.1: Create README

**Files:**
- Create: `README.md`

**Step 1: Create README**

```markdown
# LP Publisher

A simple dashboard for publishing landing pages and websites from GitHub to your VPS.

## Features

- Deploy main sites and landing pages from GitHub
- Preview before going live
- Support for multiple brands/domains
- Simple authentication
- Nginx static file serving

## Quick Start

1. Clone this repo to your server
2. Copy `.env.example` to `.env` and configure
3. Run `./scripts/setup-server.sh`
4. Access dashboard at `http://admin.yourdomain.com`

## Configuration

See `.env.example` for all configuration options.

## Workflow

1. Create LP in Lovable
2. Sync to GitHub
3. Open dashboard
4. Click "Deploy Preview"
5. Verify preview
6. Click "Go Live"

## Tech Stack

- Node.js + Express
- Passport.js (auth)
- Octokit (GitHub API)
- Nginx (static serving)
- PM2 (process management)
```

**Step 2: Create .env.example**

```env
# .env.example
PORT=3000
SESSION_SECRET=change-this-to-a-random-string

# GitHub
GITHUB_TOKEN=ghp_your_token_here
GITHUB_ORG=your-org-name

# Brand 1
BRAND1_DOMAIN=brand1.com
BRAND1_PREVIEW_DOMAIN=preview.brand1.com
BRAND1_MAIN_REPO=main-brand1

# Brand 2
BRAND2_DOMAIN=brand2.com
BRAND2_PREVIEW_DOMAIN=preview.brand2.com
BRAND2_MAIN_REPO=main-brand2

# Paths
WWW_PATH=/var/www
PREVIEW_PATH=/var/www/preview
BUILDS_PATH=/tmp/lp-builds
```

**Step 3: Final commit**

```bash
git add .
git commit -m "docs: add README and env example"
```

---

## Summary

**Total Tasks:** 12 tasks across 8 phases

**Files Created:**
- `src/index.js` - Main Express app
- `src/config/` - Configuration modules
- `src/auth/` - Authentication (Passport)
- `src/services/` - GitHub, Builder, Deployer
- `src/routes/api.js` - API endpoints
- `src/views/` - EJS templates
- `src/public/` - CSS, JS assets
- `nginx/` - Nginx configuration
- `scripts/` - Setup scripts

**Commands to Deploy:**
```bash
# On VPS
git clone <your-repo> /opt/lp-publisher
cd /opt/lp-publisher
cp .env.example .env
# Edit .env with your values
./scripts/setup-server.sh
```

---

## Phase 9: GitHub Webhooks (Auto-Deploy Preview)

### Task 9.1: Create Webhook Handler

**Files:**
- Create: `src/routes/webhook.js`
- Modify: `src/index.js`
- Create: `tests/webhook.test.js`

**Step 1: Write failing test**

```javascript
// tests/webhook.test.js
const crypto = require('crypto');
const { verifySignature, parseWebhookPayload } = require('../src/routes/webhook');

describe('Webhook', () => {
  const secret = 'test-secret';

  test('verifies valid signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const signature = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const result = verifySignature(payload, signature, secret);
    expect(result).toBe(true);
  });

  test('rejects invalid signature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const signature = 'sha256=invalid';

    const result = verifySignature(payload, signature, secret);
    expect(result).toBe(false);
  });

  test('parses push event payload correctly', () => {
    const payload = {
      ref: 'refs/heads/main',
      repository: {
        name: 'lp-brand1-promo',
        full_name: 'org/lp-brand1-promo'
      }
    };

    const result = parseWebhookPayload(payload);
    expect(result.repoName).toBe('lp-brand1-promo');
    expect(result.branch).toBe('main');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- tests/webhook.test.js
```
Expected: FAIL

**Step 3: Create webhook route**

```javascript
// src/routes/webhook.js
const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const config = require('../config');
const GitHubService = require('../services/github');
const BuilderService = require('../services/builder');
const DeployerService = require('../services/deployer');

const github = new GitHubService(config.github.token, config.github.org);
const builder = new BuilderService(config.paths.builds);
const deployer = new DeployerService(config.paths.www, config.paths.preview);

// Verify GitHub webhook signature
function verifySignature(payload, signature, secret) {
  if (!signature) return false;

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEquals(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Parse webhook payload
function parseWebhookPayload(payload) {
  const repoName = payload.repository?.name;
  const fullName = payload.repository?.full_name;
  const branch = payload.ref?.replace('refs/heads/', '');

  return { repoName, fullName, branch };
}

// Find which brand this repo belongs to
function findBrandForRepo(repoName) {
  for (const brand of config.brands) {
    // Check if it's main site
    if (repoName === brand.mainSiteRepo) {
      return { brand, type: 'main', slug: null };
    }
    // Check if it's an LP
    if (repoName.startsWith(brand.lpRepoPrefix)) {
      const slug = repoName.replace(brand.lpRepoPrefix, '');
      return { brand, type: 'lp', slug };
    }
  }
  return null;
}

// GitHub webhook endpoint (no auth required, uses signature)
router.post('/github', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['x-hub-signature-256'];
  const event = req.headers['x-github-event'];

  // Verify signature
  if (!verifySignature(req.body.toString(), signature, config.github.webhookSecret)) {
    console.log('Webhook: Invalid signature');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Only handle push events
  if (event !== 'push') {
    console.log(`Webhook: Ignoring event type: ${event}`);
    return res.json({ message: `Ignored event: ${event}` });
  }

  try {
    const payload = JSON.parse(req.body.toString());
    const { repoName, branch } = parseWebhookPayload(payload);

    console.log(`Webhook: Push received for ${repoName} (${branch})`);

    // Find brand for this repo
    const match = findBrandForRepo(repoName);
    if (!match) {
      console.log(`Webhook: No brand match for repo ${repoName}`);
      return res.json({ message: 'Repo not configured for auto-deploy' });
    }

    const { brand, type, slug } = match;
    console.log(`Webhook: Auto-deploying ${type} for ${brand.id}${slug ? ` (${slug})` : ''}`);

    // Clone and build
    const repoUrl = `https://github.com/${config.github.org}/${repoName}.git`;
    const outputPath = await builder.fullBuild(repoUrl, repoName);

    // Deploy to preview only (not live!)
    const previewPath = deployer.getPreviewPath(brand.id, type, slug);
    await deployer.deploy(outputPath, previewPath);

    const previewUrl = type === 'main'
      ? `https://${brand.previewDomain}/`
      : `https://${brand.previewDomain}/lp/${slug}/`;

    console.log(`Webhook: Auto-deployed to preview: ${previewUrl}`);

    res.json({
      success: true,
      message: 'Auto-deployed to preview',
      previewUrl,
      repo: repoName,
      brand: brand.id,
      type
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export for testing
module.exports = router;
module.exports.verifySignature = verifySignature;
module.exports.parseWebhookPayload = parseWebhookPayload;
module.exports.findBrandForRepo = findBrandForRepo;
```

**Step 4: Update config to include webhook secret**

Add to `src/config/index.js`:
```javascript
github: {
  token: process.env.GITHUB_TOKEN,
  org: process.env.GITHUB_ORG || 'Masters-Production',
  webhookSecret: process.env.GITHUB_WEBHOOK_SECRET || 'change-me'
},
```

**Step 5: Update index.js to include webhook route**

Add after other routes in src/index.js:
```javascript
const webhookRoutes = require('./routes/webhook');

// Webhook route (before body parser for raw body access)
// Note: Must be before express.json() middleware
app.use('/webhook', webhookRoutes);
```

**Step 6: Run test to verify it passes**

```bash
npm test -- tests/webhook.test.js
```
Expected: PASS

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add GitHub webhook for auto-deploy to preview"
```

---

### Task 9.2: Update Environment Config

**Files:**
- Modify: `.env.example`

**Step 1: Add webhook secret to .env.example**

```env
# GitHub Webhook
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: add webhook secret to env example"
```

---

### Task 9.3: Document Webhook Setup

**Files:**
- Modify: `README.md`

**Step 1: Add webhook setup instructions to README**

Append to README.md:
```markdown

## Auto-Deploy Setup (GitHub Webhooks)

When you push changes to GitHub, the system automatically rebuilds and deploys to **preview**.
Live deployment still requires manual "Go Live" click.

### Configure GitHub Webhook

1. Go to your GitHub repo → Settings → Webhooks → Add webhook
2. Configure:
   - **Payload URL:** `https://admin.yourdomain.com/webhook/github`
   - **Content type:** `application/json`
   - **Secret:** Same as `GITHUB_WEBHOOK_SECRET` in your `.env`
   - **Events:** Select "Just the push event"
3. Save

### Workflow with Auto-Deploy

1. Make changes in Lovable
2. Lovable pushes to GitHub
3. **Automatically:** Preview updates
4. Check preview at `preview.domain.com`
5. Click "Go Live" when ready
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add webhook setup instructions"
```

---

---

## Phase 10: Cloudflare CDN Integration

### Task 10.1: Setup Cloudflare Account & DNS

**This is a manual setup task - no code required**

**Step 1: Create Cloudflare account**
- Go to https://cloudflare.com
- Sign up for free account

**Step 2: Add first domain (brand1.com)**
1. Click "Add site"
2. Enter domain: `brand1.com`
3. Select "Free" plan
4. Cloudflare will scan existing DNS records
5. Verify all records are correct
6. Copy the two Cloudflare nameservers

**Step 3: Update domain registrar**
- Go to your domain registrar (GoDaddy, Namecheap, etc.)
- Replace nameservers with Cloudflare's
- Wait 24-48h for propagation (usually faster)

**Step 4: Configure Cloudflare settings**
```
SSL/TLS → Full (strict)
Speed → Auto Minify: JavaScript, CSS, HTML ✓
Caching → Caching Level: Standard
Caching → Browser Cache TTL: 4 hours
```

**Step 5: Repeat for brand2.com**

**Step 6: Verify setup**
```bash
# Check DNS propagation
dig brand1.com NS
# Should show Cloudflare nameservers

# Check SSL
curl -I https://brand1.com
# Should show cf-ray header
```

---

### Task 10.2: Create Cloudflare Cache Purge Service

**Files:**
- Create: `src/services/cloudflare.js`
- Create: `tests/cloudflare.test.js`
- Modify: `src/routes/api.js`

**Step 1: Install node-fetch**

```bash
npm install node-fetch
```

**Step 2: Write failing test**

```javascript
// tests/cloudflare.test.js
const CloudflareService = require('../src/services/cloudflare');

describe('CloudflareService', () => {
  test('constructs with zone IDs', () => {
    const cf = new CloudflareService('token', {
      'brand1.com': 'zone1',
      'brand2.com': 'zone2'
    });
    expect(cf.getZoneId('brand1.com')).toBe('zone1');
  });

  test('returns null for unknown domain', () => {
    const cf = new CloudflareService('token', {});
    expect(cf.getZoneId('unknown.com')).toBeNull();
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npm test -- tests/cloudflare.test.js
```
Expected: FAIL

**Step 4: Create Cloudflare service**

```javascript
// src/services/cloudflare.js

class CloudflareService {
  constructor(apiToken, zoneIds) {
    this.apiToken = apiToken;
    this.zoneIds = zoneIds; // { 'domain.com': 'zoneId' }
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
  }

  getZoneId(domain) {
    return this.zoneIds[domain] || null;
  }

  async purgeCache(domain, paths = null) {
    const zoneId = this.getZoneId(domain);
    if (!zoneId) {
      console.log(`Cloudflare: No zone ID for ${domain}, skipping purge`);
      return { success: false, reason: 'No zone ID configured' };
    }

    const url = `${this.baseUrl}/zones/${zoneId}/purge_cache`;

    // If paths specified, purge specific files; otherwise purge all
    const body = paths
      ? { files: paths.map(p => `https://${domain}${p}`) }
      : { purge_everything: true };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (data.success) {
        console.log(`Cloudflare: Cache purged for ${domain}`);
        return { success: true };
      } else {
        console.error(`Cloudflare: Purge failed for ${domain}`, data.errors);
        return { success: false, errors: data.errors };
      }
    } catch (error) {
      console.error(`Cloudflare: Error purging ${domain}`, error);
      return { success: false, error: error.message };
    }
  }

  // Purge specific LP or main site
  async purgeSite(domain, type, slug = null) {
    if (type === 'main') {
      // Purge entire domain for main site
      return this.purgeCache(domain);
    } else {
      // Purge just the LP path
      return this.purgeCache(domain, [`/lp/${slug}/`, `/lp/${slug}/index.html`]);
    }
  }
}

module.exports = CloudflareService;
```

**Step 5: Run test to verify it passes**

```bash
npm test -- tests/cloudflare.test.js
```
Expected: PASS

**Step 6: Update config with Cloudflare settings**

Add to `src/config/index.js`:
```javascript
cloudflare: {
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
  zoneIds: {
    [process.env.BRAND1_DOMAIN]: process.env.CLOUDFLARE_ZONE_BRAND1,
    [process.env.BRAND2_DOMAIN]: process.env.CLOUDFLARE_ZONE_BRAND2
  }
}
```

**Step 7: Update API routes to purge cache after deploy**

Add to `src/routes/api.js`:
```javascript
const CloudflareService = require('../services/cloudflare');
const cloudflare = new CloudflareService(
  config.cloudflare.apiToken,
  config.cloudflare.zoneIds
);

// In the /deploy/live endpoint, after successful deploy:
// Add this before res.json():
await cloudflare.purgeSite(brand.domain, type, slug);
```

**Step 8: Commit**

```bash
git add .
git commit -m "feat: add Cloudflare cache purge integration"
```

---

### Task 10.3: Update Environment Config

**Files:**
- Modify: `.env.example`

**Step 1: Add Cloudflare config to .env.example**

```env
# Cloudflare (get from dashboard.cloudflare.com)
CLOUDFLARE_API_TOKEN=your-api-token
CLOUDFLARE_ZONE_BRAND1=zone-id-for-brand1
CLOUDFLARE_ZONE_BRAND2=zone-id-for-brand2
```

**Step 2: Document how to get API token**

Add to README.md:
```markdown
### Cloudflare API Token

1. Go to Cloudflare Dashboard → My Profile → API Tokens
2. Create Token → Custom Token
3. Permissions: Zone → Cache Purge → Purge
4. Zone Resources: Include → Specific zone → your domains
5. Copy token to `.env`

### Get Zone IDs

1. Go to Cloudflare Dashboard → select domain
2. On Overview page, scroll down to "API" section
3. Copy "Zone ID" for each domain
```

**Step 3: Commit**

```bash
git add .
git commit -m "docs: add Cloudflare configuration instructions"
```

---

## Final Summary

**Total Tasks:** 18 tasks across 10 phases

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1.1-1.2 | Project setup |
| 2 | 2.1-2.2 | Authentication |
| 3 | 3.1 | GitHub integration |
| 4 | 4.1 | Build system |
| 5 | 5.1 | Deploy system |
| 6 | 6.1-6.2 | Dashboard UI |
| 7 | 7.1-7.3 | Production setup |
| 8 | 8.1 | Documentation |
| 9 | 9.1-9.3 | GitHub webhooks |
| 10 | 10.1-10.3 | Cloudflare CDN |

**Complete Flow:**
```
Lovable → GitHub → Webhook → Build → Preview
                                        ↓
                              Manual "Go Live"
                                        ↓
                           Deploy + Cloudflare Purge
                                        ↓
                              Global CDN Updated
```

**Cost Estimate:**
| Service | Cost |
|---------|------|
| Hetzner VPS (CX23) | €3.49/month |
| Cloudflare | FREE |
| GitHub | FREE |
| **Total** | **~€3.50/month** |
