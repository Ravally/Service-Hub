# 🔺 Trellio

**Structure your growth.**

A modern, AI-powered field service management platform built with React, Firebase, and cutting-edge technology. Trellio helps service businesses manage clients, quotes, jobs, invoices, and field operations with intelligent automation.

[![Status](https://img.shields.io/badge/status-active%20development-brightgreen)]()
[![Phase](https://img.shields.io/badge/phase-2%20(mobile)-blue)]()
[![License](https://img.shields.io/badge/license-proprietary-red)]()

---

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/your-org/service-hub-app.git
cd service-hub-app

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env and add your Firebase & Stripe credentials

# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

**First time setup?** See detailed instructions: [docs/guides/SETUP.md](docs/guides/SETUP.md)

---

## 📋 What is Trellio?

Trellio (formerly Service Hub) is a comprehensive field service management platform designed for service businesses like:

- 🏊 Pool Service & Maintenance
- ❄️ HVAC Installation & Repair
- 🐛 Pest Control
- 🏠 Property Management
- 🔧 Equipment Maintenance
- 🌳 Landscaping & Lawn Care

### Key Features

**✅ Complete** (Production):
- **Client Management**: CRM with properties, contacts, history
- **Quotes & Estimates**: Professional proposals with approval workflow
- **Invoicing**: PDF invoices with payment processing (Stripe)
- **Job Scheduling**: Calendar view with recurring jobs
- **Client Portal**: Self-service portal for clients (24/7 access)
- **Forms & Checklists**: Custom form builder with 14 field types
- **Payment Tracking**: Payment history and receipts
- **Security**: Token expiration, access logging, authentication

**🚧 In Progress** (Phase 2):
- **Mobile Apps**: Native iOS/Android apps (Expo)
- **Time Tracking**: Clock in/out with GPS
- **GPS Tracking**: Location-based field operations
- **Route Optimization**: Intelligent routing for field workers
- **Offline Mode**: Work without internet connection

**📋 Planned** (Phases 3-5):
- **Online Booking**: Customer self-booking
- **Review Management**: Automated review requests
- **Email Campaigns**: Marketing automation
- **Advanced Reporting**: Business intelligence
- **Job Costing**: Profitability tracking
- **AI Features**: Intelligent scheduling, churn prediction, automated quotes

---

## 🏗️ Architecture

Trellio features a **clean, modular architecture** with complete separation of concerns:

```
src/
├── App.jsx                 # 52-line orchestrator
├── components/             # UI components (clients, quotes, jobs, invoices)
├── contexts/               # Global state (Auth, AppState)
├── hooks/
│   ├── data/              # Data fetching & mutations
│   └── ui/                # UI state management
├── utils/                  # Utilities (formatters, calculations, validation)
├── constants/              # Constants (status, initial states, templates)
└── firebase/               # Firebase configuration
```

**Key Metrics**:
- **98% reduction** in largest file size (2,718 → 52 lines)
- **Zero duplicate code** across entire codebase
- **21 focused modules** for maintainability
- **100% functionality** preserved through refactoring

**Read more**: [docs/TRELLIO_ARCHITECTURE.md](docs/TRELLIO_ARCHITECTURE.md)

---

## 🛠️ Tech Stack

### Web Application
- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Storage, Functions)
- **Payments**: Stripe
- **State**: React Context API + Custom Hooks
- **Build**: Vite (Lightning-fast HMR)

### Mobile Application (In Development)
- **Framework**: Expo SDK 50+ (React Native)
- **Offline**: WatermelonDB + SQLite
- **Maps**: React Native Maps, Expo Location
- **Build**: EAS Build (Cloud builds for iOS/Android)

### AI Integration (Planned)
- **Primary AI**: Claude API (Anthropic)
- **Use Cases**: Smart scheduling, pricing optimization, churn prediction

---

## 📚 Documentation

### Essential Reading

| Document | Purpose |
|----------|---------|
| **[docs/TRELLIO_ARCHITECTURE.md](docs/TRELLIO_ARCHITECTURE.md)** | Technical architecture, patterns, conventions |
| **[docs/TRELLIO_MASTER_ROADMAP.md](docs/TRELLIO_MASTER_ROADMAP.md)** | Product roadmap, timeline, features |
| **[docs/guides/SETUP.md](docs/guides/SETUP.md)** | Development environment setup |
| **[docs/guides/DEPLOYMENT.md](docs/guides/DEPLOYMENT.md)** | Build & deployment process |

### Phase Documentation

| Phase | Status | Documentation |
|-------|--------|---------------|
| **Phase 1** | ✅ Complete | [docs/phases/PHASE_1_COMPLETE.md](docs/phases/PHASE_1_COMPLETE.md) |
| **Phase 2** | 🚧 In Progress | [docs/phases/PHASE_2_IN_PROGRESS.md](docs/phases/PHASE_2_IN_PROGRESS.md) |
| **Phase 3-5** | 📋 Planned | [docs/phases/PHASE_3_PLANNED.md](docs/phases/PHASE_3_PLANNED.md) |

### Brand & Design

| Document | Purpose |
|----------|---------|
| **[brand/TRELLIO_BRAND.md](brand/TRELLIO_BRAND.md)** | Complete brand system (colors, fonts, voice) |
| **[brand/README.md](brand/README.md)** | Brand quick reference |
| **[brand/tokens.css](brand/tokens.css)** | CSS custom properties |
| **[brand/tailwind.config.js](brand/tailwind.config.js)** | Tailwind theme extension |

---

## 🎨 Brand

### Colors

```
Primary:   Trellio Teal    #0EA5A0  (Links, CTAs, identity)
Accent 1:  Signal Coral    #F7845E  (Urgency, alerts)
Accent 2:  Harvest Amber   #FFAA5C  (Rewards, notifications)

Dark BG:   Midnight        #0C1220  (Primary background)
Card BG:   Charcoal        #1A2332  (Cards, surfaces)
Light BG:  Warm Cream      #FFF9F5  (Light mode background)
```

### Typography

```
Body:      DM Sans (300-700)
Display:   DM Sans Bold (700)
Editorial: Playfair Display Italic
Data:      JetBrains Mono
```

### Voice

- **Active voice**: "Send the invoice" not "The invoice will be sent"
- **Direct & clear**: Short sentences, clear verbs
- **Celebrate wins**: "Your crew crushed it" not "Metrics indicate improvement"
- **No jargon**: If a plumber wouldn't say it, we don't write it

---

## 🚦 Project Status

### Current Phase: Phase 2 - Mobile & Field Operations

**Timeline**: 24 weeks (~6 months)
**Progress**: 25% complete

**Completed**:
- ✅ Phase 2.3: Job Forms & Checklists (6 weeks)
  - Dynamic form builder
  - 14 field types
  - Checklist system
  - 5 industry sample templates

**In Progress**:
- 🚧 Phase 2.1: Mobile App Development (Week 4-5 of 10)
  - Project setup ✅
  - Authentication ✅
  - Job management ✅
  - Time tracking & GPS 🚧
  - Forms & photos (upcoming)
  - Offline sync (upcoming)

**Next Up**:
- 📋 Phase 2.2: GPS Tracking & Route Optimization
- 📋 Testing & QA
- 📋 App Store Deployment

**See**: [docs/phases/PHASE_2_IN_PROGRESS.md](docs/phases/PHASE_2_IN_PROGRESS.md) for details

---

## 👨‍💻 Development

### Prerequisites

- **Node.js**: 18+ (LTS recommended)
- **npm**: 9+
- **Git**: 2+
- **Firebase Account**: Free tier is sufficient for development
- **Stripe Account**: Test mode for payments

### Scripts

```bash
# Development
npm run dev              # Start dev server (http://localhost:5173)
npm run build            # Production build
npm run preview          # Preview production build

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues automatically

# Firebase (requires firebase-tools)
firebase deploy          # Deploy to Firebase Hosting
firebase emulators:start # Start local emulators
```

### Coding Guidelines

**Always**:
- ✅ Import utilities from `src/utils/` (never duplicate)
- ✅ Import constants from `src/constants/`
- ✅ Use existing hooks from `src/hooks/data/`
- ✅ Keep components under 200 lines
- ✅ Follow file naming conventions (PascalCase for components)
- ✅ Handle errors with try/catch
- ✅ Test before committing

**Never**:
- ❌ Create local utility functions (import from utils)
- ❌ Write Firebase queries directly in components (use hooks)
- ❌ Hardcode values (use constants)
- ❌ Mix concerns (separate UI, logic, data)
- ❌ Create god components (break into smaller pieces)

**Read more**: [docs/TRELLIO_ARCHITECTURE.md#coding-conventions](docs/TRELLIO_ARCHITECTURE.md#coding-conventions)

---

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

**Coverage Goals**:
- Utilities: 90%+
- Services: 80%+
- Hooks: 75%+
- Components: 70%+

---

## 🚀 Deployment

### Firebase Hosting (Web App)

```bash
# Build for production
npm run build

# Deploy to Firebase
firebase deploy --only hosting

# Or use npm script
npm run deploy:prod
```

### Mobile Apps (Coming Soon - Q1 2026)

```bash
# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to App Store
eas submit --platform ios

# Submit to Google Play
eas submit --platform android
```

**See**: [docs/guides/DEPLOYMENT.md](docs/guides/DEPLOYMENT.md) for detailed deployment instructions

---

## 📊 Roadmap

### Q1 2026
- ✅ Phase 1: Client Hub & Security
- ✅ Phase 2.3: Forms & Checklists
- 🚧 Phase 2.1-2.2: Mobile App & GPS

### Q2 2026
- 📋 Phase 3: Online Booking, Reviews, Email Campaigns
- 📋 App Store Launch (iOS & Android)

### Q3 2026
- 📋 Phase 4: Advanced Reporting, Job Costing, Permissions
- 📋 Phase 5: QuickBooks/Xero Integration, Custom Fields

### Q4 2026
- 📋 AI Features: Intelligent scheduling, churn prediction, automated quotes
- 📋 Market Leadership: Top 10 in "Field Service Management"

**See**: [docs/TRELLIO_MASTER_ROADMAP.md](docs/TRELLIO_MASTER_ROADMAP.md) for complete roadmap

---

## 🤝 Contributing

### Branch Strategy

```bash
feature/feature-name    # New features
fix/bug-description     # Bug fixes
refactor/description    # Code refactoring
docs/description        # Documentation updates
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: add client export functionality
fix: resolve invoice calculation bug
refactor: extract payment utilities
docs: update API documentation
```

### Pull Request Process

1. Create feature branch from `master`
2. Implement changes following architecture guidelines
3. Run `npm run lint` and fix any issues
4. Run `npm run build` and verify success
5. Test functionality in browser
6. Create pull request with clear description
7. Wait for code review and approval
8. Merge to `master`

---

## 📄 License

Proprietary - All Rights Reserved

Copyright (c) 2026 Trellio

---

## 🆘 Support

### Issues & Bugs
- **GitHub Issues**: [Create an issue](https://github.com/your-org/service-hub-app/issues)
- **Documentation**: Check [docs/](docs/) first

### Questions
- **Setup**: See [docs/guides/SETUP.md](docs/guides/SETUP.md)
- **Deployment**: See [docs/guides/DEPLOYMENT.md](docs/guides/DEPLOYMENT.md)
- **Architecture**: See [docs/TRELLIO_ARCHITECTURE.md](docs/TRELLIO_ARCHITECTURE.md)

### Resources
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Expo Documentation](https://docs.expo.dev) (Mobile)

---

## 🙏 Acknowledgments

- **React Team**: For the amazing framework
- **Firebase Team**: For the complete backend platform
- **Expo Team**: For making mobile development accessible
- **Anthropic**: For Claude AI assistance
- **Stripe**: For seamless payments

---

## 📈 Stats

- **Lines of Code**: ~15,000 (web + mobile)
- **Components**: 30+
- **Hooks**: 13 custom hooks
- **Utilities**: 47 functions
- **Constants**: 42 exports
- **Zero Duplicate Code**: 100% DRY principle
- **Architecture Score**: A+ (maintainability)

---

## 🔮 Future Vision

Trellio aims to be the **leading AI-first field service platform**, surpassing Jobber with:

- **40% reduction** in admin time through automation
- **20% increase** in jobs per day via intelligent scheduling
- **25% higher** customer retention through churn prediction
- **15% better** profit margins via dynamic pricing
- **First-mover advantage** in AI-powered field service management

**Join us in building the future of field service software.** 🚀

---

```
         ╱ ▲ ╲
        ╱  ●  ╲
       ●────────●
       │        │
       │────────│
       │        │

     t r e l l i o
   Structure your growth.
```

---

**Version**: 2.0
**Last Updated**: February 11, 2026
**Status**: Active Development

*Built with ❤️ and AI assistance from Claude Code*
