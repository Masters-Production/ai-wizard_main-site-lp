# LP Publisher System - Design Document

**Data:** 2025-12-26
**Status:** Aprobat

---

## 1. Scopul Sistemului

Un sistem de publicare pentru **main sites** și **landing pages** pe VPS Linux, cu dashboard web pentru utilizatori tehnici și non-tehnici.

### Probleme Rezolvate

1. Publicare simplă a LP-urilor create în Lovable/AI Studio
2. Gestionare centralizată pentru multiple branduri
3. Preview obligatoriu înainte de go-live
4. Workflow accesibil și pentru non-tehnici

---

## 2. Cerințe

### 2.1 Cerințe Funcționale

| ID | Cerință | Prioritate |
|----|---------|------------|
| F1 | Deploy main site per brand | Must |
| F2 | Deploy multiple LP-uri per brand | Must |
| F3 | Preview înainte de live | Must |
| F4 | Suport 2 domenii/branduri | Must |
| F5 | Dashboard cu autentificare | Must |
| F6 | Listare repos din GitHub | Must |
| F7 | Build automat (Vite/npm) | Must |
| F8 | A/B testing support | Nice |
| F9 | Analytics integration | Nice |
| F10 | Auto-deploy preview via GitHub webhooks | Must |

### 2.2 Cerințe Non-Funcționale

| ID | Cerință | Detalii |
|----|---------|---------|
| N1 | Complexitate | Medie - automatizat dar practic |
| N2 | Utilizatori | Mix tehnic + non-tehnic |
| N3 | Volum | 5-10+ LP-uri/lună |
| N4 | Sursă conținut | Lovable → GitHub (1 repo/LP) |

---

## 3. Arhitectură

### 3.1 Overview

```
                         VIZITATORI GLOBALI
                                │
                                ▼
                    ┌─────────────────────────────┐
                    │      CLOUDFLARE (Free)      │
                    │  • CDN Global (300+ PoPs)   │
                    │  • Cache static files       │
                    │  • DDoS protection          │
                    │  • SSL/HTTPS                │
                    └─────────────┬───────────────┘
                                  │ (doar cache miss)
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    VPS LINUX (Hetzner Germania)              │
│                                                              │
│   ┌────────────────────────────────────────────────────┐    │
│   │            LP PUBLISHER DASHBOARD                   │    │
│   │  • Login (user/parolă)                             │    │
│   │  • Listează repos din GitHub org                   │    │
│   │  • "Deploy Preview" → build + preview.brand.com    │    │
│   │  • "Go Live" → promovare la brand.com/lp/nume     │    │
│   │  • Gestionare LP-uri publicate                     │    │
│   └────────────────────────────────────────────────────┘    │
│                            │                                 │
│                            ▼                                 │
│   ┌────────────────────────────────────────────────────┐    │
│   │                    NGINX                            │    │
│   │  Servește static files pentru ambele domenii       │    │
│   └────────────────────────────────────────────────────┘    │
│                            │                                 │
│              ┌─────────────┴─────────────┐                  │
│              ▼                           ▼                  │
│   ┌──────────────────┐       ┌──────────────────┐          │
│   │  BRAND 1         │       │  BRAND 2         │          │
│   │  Main site +     │       │  Main site +     │          │
│   │  /lp/*           │       │  /lp/*           │          │
│   └──────────────────┘       └──────────────────┘          │
└─────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────┐
                    │         GITHUB              │
                    │   (repos per fiecare LP)    │
                    │   (repos pentru main sites) │
                    └─────────────┬───────────────┘
                                  │ webhook
                                  ▼
                           [Auto-deploy preview]
```

### 3.2 Componente

#### Cloudflare CDN (Free Plan)

**Beneficii:**
- CDN global cu 300+ edge locations
- Cache automat pentru fișiere statice (JS, CSS, imagini)
- SSL/HTTPS gratuit
- DDoS protection
- Bandwidth nelimitat
- Zero configurare - doar schimbă DNS nameservers

**Configurare per domeniu:**
- Proxy enabled (orange cloud) pentru toate subdomeniile
- Cache level: Standard
- Browser Cache TTL: 4 ore
- Edge Cache TTL: 2 ore (sau Page Rules pentru LP-uri)

**Cache Invalidation după deploy:**
- API call către Cloudflare pentru purge cache
- Sau: folosește versioned assets (main.js?v=123)

#### Dashboard (Node.js/Express)

**Responsabilități:**
- Autentificare utilizatori
- Integrare GitHub API
- Build automation
- Deploy management

**Tehnologii:**
- Node.js + Express
- Passport.js (auth)
- Octokit (GitHub API)
- EJS sau similar (templates)

#### Nginx

**Responsabilități:**
- Reverse proxy pentru dashboard
- Servire static files
- SSL termination
- Routing per domeniu

#### File System

```
/var/www/
├── brand1.com/
│   ├── index.html              ← Homepage Brand 1
│   ├── cursuri/                ← Pagini main site
│   ├── contact/
│   ├── despre/
│   └── lp/                     ← LANDING PAGES
│       ├── promo-spring/
│       └── black-friday/
│
├── brand2.com/
│   ├── index.html              ← Homepage Brand 2
│   ├── servicii/
│   ├── portofoliu/
│   └── lp/                     ← LANDING PAGES
│       └── oferta-q4/
│
├── preview/                    ← Toate preview-urile
│   ├── brand1/
│   │   ├── main/               ← Preview main site
│   │   └── lp/
│   │       └── test-nou/       ← Preview LP
│   └── brand2/
│       ├── main/
│       └── lp/
│
└── dashboard/                  ← Dashboard app
    └── ...
```

---

## 4. Workflow

### 4.1 Publicare Landing Page

```
1. CREARE      →  Creezi LP în Lovable
2. SYNC        →  Lovable sincronizează cu GitHub repo
3. DASHBOARD   →  Deschizi dashboard, vezi repo-ul nou
4. SELECT      →  Alegi brand-ul țintă (brand1 sau brand2)
5. PREVIEW     →  Click "Deploy Preview"
                  → System: clone, npm install, npm build
                  → Deploy la preview.brand1.com/lp/nume
6. VERIFICARE  →  Testezi preview-ul
7. PUBLISH     →  Click "Go Live"
                  → Copiază din preview la brand1.com/lp/nume
```

### 4.2 Publicare Main Site

```
1. CREARE      →  Creezi/actualizezi main site în Lovable
2. SYNC        →  Lovable sincronizează cu GitHub
3. DASHBOARD   →  Selectezi "Main Site" pentru brand
4. PREVIEW     →  Deploy la preview.brand1.com/
                  (ATENȚIE: nu afectează /lp/ folder)
5. VERIFICARE  →  Testezi preview-ul complet
6. PUBLISH     →  Go Live la brand1.com/
                  → Copiază fișierele, PĂSTREAZĂ /lp/ intact
```

### 4.3 Auto-Deploy Preview (GitHub Webhooks)

```
┌─────────────┐     push      ┌─────────────┐    webhook    ┌─────────────┐
│   Lovable   │ ───────────▶  │   GitHub    │ ───────────▶  │   Server    │
└─────────────┘               └─────────────┘               └─────────────┘
                                                                   │
                                                                   ▼
                                                            ┌─────────────┐
                                                            │ Auto Build  │
                                                            │ + Deploy    │
                                                            │ to PREVIEW  │
                                                            └─────────────┘
```

**Flow automat:**
1. Faci modificări în Lovable
2. Lovable face push pe GitHub
3. GitHub trimite webhook către `https://admin.domain.com/webhook/github`
4. Server identifică repo-ul și brand-ul
5. Rulează automat: clone → npm install → npm build → deploy preview
6. Preview-ul se actualizează automat
7. **Live rămâne neschimbat** - necesită click manual "Go Live"

**Configurare GitHub:**
- Webhook URL: `https://admin.yourdomain.com/webhook/github`
- Content type: `application/json`
- Secret: configurat în `.env`
- Events: `push` only

---

## 5. Dashboard UI

### 5.1 Structură

```
┌────────────────────────────────────────────────────────────┐
│  [Logo] LP Publisher              [User] ▼  [Logout]       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ BRAND 1 (brand1.com)                                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 🏠 Main Site                                         │  │
│  │    Repo: main-brand1          Status: ✅ Live        │  │
│  │    [Deploy Preview] [Go Live] [View]                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 📄 Landing Pages                                     │  │
│  │ ┌──────────────────────────────────────────────────┐ │  │
│  │ │ promo-spring     ✅ Live    [View] [Unpublish]   │ │  │
│  │ │ black-friday     🔶 Preview [Go Live] [Delete]   │ │  │
│  │ │ + Add new LP                                     │ │  │
│  │ └──────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ BRAND 2 (brand2.com)                                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 🏠 Main Site                                         │  │
│  │    Repo: main-brand2          Status: ✅ Live        │  │
│  │    [Deploy Preview] [Go Live] [View]                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 📄 Landing Pages                                     │  │
│  │ ┌──────────────────────────────────────────────────┐ │  │
│  │ │ oferta-q4        ✅ Live    [View] [Unpublish]   │ │  │
│  │ │ + Add new LP                                     │ │  │
│  │ └──────────────────────────────────────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### 5.2 Funcționalități Buton

| Buton | Acțiune |
|-------|---------|
| Deploy Preview | Clone repo → npm install → npm build → copy to preview |
| Go Live | Copy from preview to live location |
| View | Open preview/live URL în tab nou |
| Unpublish | Remove from live (păstrează preview) |
| Delete | Remove completely (preview + live) |
| Add new LP | Modal: select GitHub repo + enter LP slug |

---

## 6. Configurare

### 6.1 Config File (config.json)

```json
{
  "github": {
    "org": "Masters-Production",
    "token": "ghp_xxx"
  },
  "brands": [
    {
      "id": "brand1",
      "name": "Brand 1",
      "domain": "brand1.com",
      "previewDomain": "preview.brand1.com",
      "mainSiteRepo": "main-brand1",
      "lpRepoPrefix": "lp-brand1-"
    },
    {
      "id": "brand2",
      "name": "Brand 2",
      "domain": "brand2.com",
      "previewDomain": "preview.brand2.com",
      "mainSiteRepo": "main-brand2",
      "lpRepoPrefix": "lp-brand2-"
    }
  ],
  "paths": {
    "www": "/var/www",
    "preview": "/var/www/preview",
    "builds": "/tmp/lp-builds"
  },
  "auth": {
    "users": [
      { "username": "admin", "passwordHash": "..." }
    ]
  }
}
```

---

## 7. Securitate

### 7.1 Autentificare
- Session-based auth cu express-session
- Password hashing cu bcrypt
- HTTPS obligatoriu

### 7.2 GitHub
- Personal Access Token sau GitHub App
- Read-only access la repos

### 7.3 Server
- Dashboard accesibil doar pe port intern sau prin reverse proxy
- Nginx cu rate limiting
- Firewall configurat

---

## 8. Extinderi Viitoare

| Feature | Descriere | Complexitate |
|---------|-----------|--------------|
| A/B Testing | Multiple variante per LP, traffic splitting | Medie |
| Analytics | Integrare Google Analytics, tracking conversii | Simplă |
| Rollback | Restore previous versions | Medie |
| Multi-user | Roles & permissions | Complexă |
| Notifications | Slack/Email când deploy e gata | Simplă |

---

## 9. Decizii de Design

### 9.1 De ce Static Files (nu Docker)?
- LP-urile sunt 100% static (HTML/CSS/JS)
- Overhead minim
- Nginx servește eficient
- Simplitate în management

### 9.2 De ce Dashboard custom (nu Netlify/Vercel)?
- Control complet pe server propriu
- Fără costuri per-site
- Customizabil pentru workflow specific
- Integrare cu branding propriu

### 9.3 De ce Preview obligatoriu?
- Catch errors înainte de live
- Non-tehnicii pot verifica
- Reduce risc de downtime

---

## 10. Termeni și Definiții

| Termen | Definiție |
|--------|-----------|
| Main Site | Website-ul principal multi-page al brandului |
| Landing Page (LP) | Pagină singulară pentru campanii marketing |
| Preview | Versiune de test, accesibilă dar nu publică |
| Live | Versiune publică, accesibilă utilizatorilor finali |
| Brand | O entitate business cu domeniu propriu |
| Build | Procesul de transformare cod sursă → static files |

---

**Document aprobat pentru implementare.**
