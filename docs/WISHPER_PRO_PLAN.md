# Wishper Pro - Production Ready Plan

## Overview

A professional voice-to-text dictation app competing with Wispr Flow and Willow Voice.

---

## App Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WISHPER PRO                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐  │
│   │  MENUBAR    │   │  MAIN APP   │   │   LARAVEL BACKEND       │  │
│   │  WIDGET     │   │             │   │                         │  │
│   │             │   │  Dashboard  │   │  Auth & Users           │  │
│   │  🎤 Record  │   │  Dictionary │   │  Subscriptions (Stripe) │  │
│   │  Status     │   │  Styles     │   │  Usage Tracking         │  │
│   │  Quick Menu │   │  Commands   │   │  API Proxy (STT/LLM)    │  │
│   │             │   │  History    │   │  Settings Sync          │  │
│   │             │   │  Settings   │   │  Analytics              │  │
│   └─────────────┘   └─────────────┘   └─────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Pricing Tiers

| Plan | Price | Features |
|------|-------|----------|
| **Free** | $0/month | 30 mins/month, Basic styles, Groq only |
| **Pro** | $8/month | 300 mins/month, All styles, All providers, Dictionary, Commands |
| **Business** | $15/month | Unlimited, Priority API, Team features, API access |
| **Enterprise** | Custom | Self-hosted, Custom models, SLA, Dedicated support |

---

## Core Features

### 1. Menubar Widget
- [ ] Menubar icon with status indicator
- [ ] Click to open quick panel
- [ ] Recording animation (waveform)
- [ ] Live text preview while recording
- [ ] Timer display
- [ ] Quick style switcher
- [ ] Last transcription (copy button)

### 2. Recording & Transcription
- [ ] Global hotkey (⌥ + Space)
- [ ] Hold-to-record mode
- [ ] Push-to-talk mode
- [ ] Auto-stop on silence (3 sec)
- [ ] Multiple STT providers:
  - [ ] Groq Whisper (free)
  - [ ] OpenAI Whisper
  - [ ] Deepgram Nova-3
  - [ ] Local Whisper (offline)
- [ ] Language auto-detection
- [ ] 100+ language support

### 3. AI Polishing
- [ ] Multiple LLM providers:
  - [ ] Groq Llama (free)
  - [ ] Gemini Flash (free)
  - [ ] GPT-4o-mini
  - [ ] Claude Haiku
- [ ] Style-aware polishing
- [ ] Context-aware (knows active app)
- [ ] Preserve user's voice/tone

### 4. Style Matching
- [ ] Three base styles:
  - [ ] Formal (full punctuation, proper grammar)
  - [ ] Casual (less punctuation, conversational)
  - [ ] Extremely Casual (no caps, minimal punctuation)
- [ ] App-specific styles:
  - [ ] Slack → Casual
  - [ ] Gmail → Formal
  - [ ] iMessage → Extremely Casual
  - [ ] Custom per-app settings
- [ ] Learn from user corrections
- [ ] Style preview examples

### 5. Dictionary
- [ ] Custom words (names, terms)
- [ ] Categories (Names, Technical, Companies)
- [ ] Import/Export
- [ ] Sync across devices
- [ ] Improve transcription accuracy
- [ ] Auto-capitalize proper nouns

### 6. Voice Commands
- [ ] Built-in commands:
  - [ ] "New paragraph" → \n\n
  - [ ] "New line" → \n
  - [ ] "Period/Comma/Question mark"
  - [ ] "Delete that" / "Scratch that"
  - [ ] "Select all" / "Undo"
- [ ] Custom commands:
  - [ ] "Sign off" → "Best regards, Name"
  - [ ] "My email" → "user@example.com"
  - [ ] Custom text expansions

### 7. Snippets (Text Templates)
- [ ] Create reusable text snippets
- [ ] Trigger by voice or shortcut
- [ ] Categories/folders
- [ ] Variables support (e.g., {date}, {name})
- [ ] Import/Export snippets
- [ ] Share snippets with team
- [ ] Examples:
  - [ ] Email signatures
  - [ ] Common replies
  - [ ] Code templates
  - [ ] Meeting templates

### 8. Voice Notes
- [ ] Quick voice notes saved for later
- [ ] Note title (auto or manual)
- [ ] Search notes
- [ ] Folders/tags organization
- [ ] Pin important notes
- [ ] Share notes
- [ ] Export to text/markdown
- [ ] Sync across devices
- [ ] Voice playback (optional)

### 9. Team Features (Business Plan)
- [ ] Create workspace/team
- [ ] Invite team members
- [ ] Shared dictionary (company terms)
- [ ] Shared snippets
- [ ] Team admin dashboard
- [ ] Usage analytics per member
- [ ] Billing management
- [ ] SSO integration (Enterprise)

### 10. Referral Program
- [ ] Unique referral link
- [ ] Get 1 month free per referral
- [ ] Referral dashboard
- [ ] Track referrals
- [ ] Social sharing buttons
- [ ] Leaderboard (optional)

### 11. History
- [ ] All transcriptions stored
- [ ] Search functionality
- [ ] Filter by date/app/style
- [ ] Copy any transcription
- [ ] Delete history
- [ ] Export to CSV/JSON
- [ ] Cloud sync (Pro+)

### 12. Settings
- [ ] General:
  - [ ] Launch at login
  - [ ] Menubar visibility
  - [ ] Sounds on/off
  - [ ] Notifications
- [ ] Hotkey configuration
- [ ] Provider selection
- [ ] API keys management
- [ ] Audio settings (quality, silence threshold)
- [ ] Privacy controls

---

## Technical Features

### Performance
- [ ] < 1 second latency (local Whisper)
- [ ] < 2 second latency (cloud API)
- [ ] Streaming transcription display
- [ ] Compressed audio upload (Opus)
- [ ] Background processing
- [ ] Memory efficient (< 100MB)

### Privacy & Security
- [ ] Audio never stored on servers
- [ ] End-to-end encryption option
- [ ] Local-only mode (no cloud)
- [ ] API keys stored in system keychain
- [ ] SOC2 compliance ready
- [ ] GDPR compliant

### Platform Support
- [ ] macOS (primary)
  - [ ] Apple Silicon optimized
  - [ ] Intel support
  - [ ] macOS 12+ support
- [ ] Windows (future)
- [ ] iOS (future)

---

## Backend (Laravel)

### Database Schema

```sql
-- Users
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    password VARCHAR(255),
    plan ENUM('free', 'pro', 'business', 'enterprise'),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Subscriptions
CREATE TABLE subscriptions (
    id BIGINT PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    stripe_subscription_id VARCHAR(255),
    plan VARCHAR(50),
    status ENUM('active', 'canceled', 'past_due'),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    created_at TIMESTAMP
);

-- Usage Tracking
CREATE TABLE usage (
    id BIGINT PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    minutes_used DECIMAL(10,2),
    date DATE,
    created_at TIMESTAMP,
    UNIQUE(user_id, date)
);

-- Dictionary
CREATE TABLE dictionary_words (
    id BIGINT PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    word VARCHAR(255),
    category VARCHAR(50),
    created_at TIMESTAMP
);

-- Custom Commands
CREATE TABLE custom_commands (
    id BIGINT PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    trigger_phrase VARCHAR(255),
    replacement_text TEXT,
    created_at TIMESTAMP
);

-- Style Preferences
CREATE TABLE style_preferences (
    id BIGINT PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    app_name VARCHAR(100),
    style ENUM('formal', 'casual', 'extremely_casual'),
    created_at TIMESTAMP,
    UNIQUE(user_id, app_name)
);

-- Transcription History
CREATE TABLE transcriptions (
    id BIGINT PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    original_text TEXT,
    polished_text TEXT,
    app_context VARCHAR(100),
    style VARCHAR(50),
    duration_seconds INT,
    created_at TIMESTAMP
);

-- Settings Sync
CREATE TABLE user_settings (
    id BIGINT PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    settings_json JSON,
    updated_at TIMESTAMP
);
```

### API Endpoints

```
Authentication:
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/user

Transcription (Proxy to STT):
POST   /api/transcribe
POST   /api/polish

Dictionary:
GET    /api/dictionary
POST   /api/dictionary
PUT    /api/dictionary/{id}
DELETE /api/dictionary/{id}
POST   /api/dictionary/import

Commands:
GET    /api/commands
POST   /api/commands
PUT    /api/commands/{id}
DELETE /api/commands/{id}

Styles:
GET    /api/styles
POST   /api/styles
PUT    /api/styles/{app}

History:
GET    /api/history
GET    /api/history/{id}
DELETE /api/history/{id}
DELETE /api/history (bulk)
GET    /api/history/export

Usage:
GET    /api/usage
GET    /api/usage/stats
GET    /api/usage/limit

Subscription:
GET    /api/subscription
POST   /api/subscription/checkout
POST   /api/subscription/portal
POST   /api/subscription/cancel
POST   /api/webhooks/stripe

Settings:
GET    /api/settings
POST   /api/settings
```

---

## File Structure

```
wishper-pro/
├── desktop-app/                    # Tauri App
│   ├── src-tauri/
│   │   ├── src/
│   │   │   ├── main.rs
│   │   │   ├── lib.rs
│   │   │   ├── api/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── backend.rs      # Laravel API client
│   │   │   │   ├── whisper.rs      # Direct STT (fallback)
│   │   │   │   └── polish.rs       # Direct LLM (fallback)
│   │   │   ├── audio/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── recorder.rs
│   │   │   │   ├── silence.rs      # Silence detection
│   │   │   │   └── compress.rs     # Audio compression
│   │   │   ├── tray/
│   │   │   │   ├── mod.rs
│   │   │   │   └── menu.rs
│   │   │   ├── commands/
│   │   │   │   ├── mod.rs
│   │   │   │   ├── transcription.rs
│   │   │   │   ├── auth.rs
│   │   │   │   ├── dictionary.rs
│   │   │   │   ├── history.rs
│   │   │   │   └── settings.rs
│   │   │   └── utils/
│   │   │       ├── active_app.rs   # Detect focused app
│   │   │       ├── voice_cmds.rs   # Process voice commands
│   │   │       └── keychain.rs     # Secure storage
│   │   ├── Cargo.toml
│   │   └── tauri.conf.json
│   │
│   ├── src/                        # React Frontend
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Dictionary.tsx
│   │   │   ├── Snippets.tsx        # Text templates
│   │   │   ├── StyleMatching.tsx
│   │   │   ├── Notes.tsx           # Voice notes
│   │   │   ├── Commands.tsx
│   │   │   ├── History.tsx
│   │   │   ├── Team.tsx            # Team management
│   │   │   ├── Referrals.tsx       # Referral program
│   │   │   ├── Settings.tsx
│   │   │   ├── Account.tsx
│   │   │   └── Pricing.tsx
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Header.tsx
│   │   │   ├── menubar/
│   │   │   │   ├── MenubarWidget.tsx
│   │   │   │   ├── QuickPanel.tsx
│   │   │   │   └── RecordingOverlay.tsx
│   │   │   ├── recording/
│   │   │   │   ├── Waveform.tsx
│   │   │   │   ├── Timer.tsx
│   │   │   │   └── LiveText.tsx
│   │   │   └── common/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       ├── Select.tsx
│   │   │       └── Toggle.tsx
│   │   ├── stores/
│   │   │   ├── authStore.ts
│   │   │   ├── settingsStore.ts
│   │   │   ├── dictionaryStore.ts
│   │   │   ├── historyStore.ts
│   │   │   └── recordingStore.ts
│   │   ├── hooks/
│   │   │   ├── useHotkey.ts
│   │   │   ├── useRecording.ts
│   │   │   └── useActiveApp.ts
│   │   ├── lib/
│   │   │   ├── api.ts              # Backend API client
│   │   │   └── tauri.ts            # Tauri commands
│   │   └── styles/
│   │       └── globals.css
│   │
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                        # Laravel API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── AuthController.php
│   │   │   │   ├── TranscriptionController.php
│   │   │   │   ├── DictionaryController.php
│   │   │   │   ├── CommandController.php
│   │   │   │   ├── StyleController.php
│   │   │   │   ├── HistoryController.php
│   │   │   │   ├── UsageController.php
│   │   │   │   ├── SubscriptionController.php
│   │   │   │   └── SettingsController.php
│   │   │   └── Middleware/
│   │   │       ├── CheckUsageLimit.php
│   │   │       └── CheckSubscription.php
│   │   ├── Models/
│   │   │   ├── User.php
│   │   │   ├── Subscription.php
│   │   │   ├── Usage.php
│   │   │   ├── DictionaryWord.php
│   │   │   ├── CustomCommand.php
│   │   │   ├── StylePreference.php
│   │   │   └── Transcription.php
│   │   └── Services/
│   │       ├── TranscriptionService.php
│   │       ├── PolishingService.php
│   │       ├── UsageService.php
│   │       └── StripeService.php
│   ├── database/migrations/
│   ├── routes/api.php
│   └── config/
│       └── services.php            # API keys config
│
├── landing-page/                   # Marketing Website
│   ├── Next.js or Astro
│   └── ...
│
└── docs/
    ├── WISHPER_PRO_PLAN.md        # This file
    ├── API.md                      # API documentation
    └── DEPLOYMENT.md               # Deployment guide
```

---

## Development Phases

### Phase 1: Core App Rebuild (Week 1-2)
- [ ] New Tauri project setup
- [ ] Menubar widget implementation
- [ ] Main app window with sidebar
- [ ] Basic recording functionality
- [ ] Direct API integration (Groq/Gemini)

### Phase 2: UI/UX (Week 2-3)
- [ ] Dashboard page
- [ ] Settings page
- [ ] Style Matching page (3 modes)
- [ ] Recording animations
- [ ] Polish UI/styling

### Phase 3: Advanced Features (Week 3-4)
- [ ] Dictionary system
- [ ] Voice commands
- [ ] History page
- [ ] App-specific styles
- [ ] Silence detection

### Phase 4: Backend (Week 4-5)
- [ ] Laravel project setup
- [ ] Database migrations
- [ ] Auth system (Sanctum)
- [ ] API endpoints
- [ ] Stripe integration

### Phase 5: Integration (Week 5-6)
- [ ] Connect app to backend
- [ ] User authentication flow
- [ ] Usage tracking
- [ ] Settings sync
- [ ] Subscription checks

### Phase 6: Polish & Testing (Week 6-7)
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Security audit
- [ ] Beta testing
- [ ] Documentation

### Phase 7: Launch (Week 7-8)
- [ ] Landing page
- [ ] App Store preparation
- [ ] Marketing materials
- [ ] Launch on Product Hunt
- [ ] Social media campaign

---

## Deployment

### Desktop App
- [ ] Code signing (Apple Developer)
- [ ] Notarization
- [ ] Auto-update system
- [ ] Crash reporting (Sentry)
- [ ] Analytics (PostHog/Mixpanel)

### Backend
- [ ] Laravel Forge or Vapor
- [ ] PostgreSQL (PlanetScale/Neon)
- [ ] Redis (Upstash)
- [ ] Cloudflare (CDN + DDoS)
- [ ] Monitoring (Laravel Pulse)

### Costs (Monthly)
| Item | Cost |
|------|------|
| Apple Developer | $8 ($99/year) |
| Laravel Forge | $12 |
| Database (Neon) | $0-19 |
| Redis (Upstash) | $0-10 |
| Domain | $1 |
| Email (Resend) | $0-20 |
| Error tracking | $0-29 |
| **Total** | **$21-99/month** |

---

## Competitors Analysis

| Feature | Wispr Flow | Willow | Wishper Pro |
|---------|------------|--------|-------------|
| Price | $8/mo | $10/mo | $8/mo |
| Free tier | ❌ | ✅ 30min | ✅ 30min |
| Menubar widget | ✅ | ✅ | ✅ |
| Style matching | ✅ | ✅ | ✅ |
| Dictionary | ❌ | ✅ | ✅ |
| Voice commands | ✅ | ✅ | ✅ |
| App-specific styles | ✅ | ✅ | ✅ |
| Learn from corrections | ✅ | ✅ | ✅ (Phase 2) |
| Offline mode | ❌ | ❌ | ✅ |
| Open source | ❌ | ❌ | Optional |
| Windows | ✅ | ❌ | Future |
| iOS | ❌ | ✅ | Future |

### Your Advantages
1. **Free tier** (30 mins/month)
2. **Offline mode** (local Whisper)
3. **Cheaper** for same features
4. **Privacy-focused** (no audio storage)
5. **Multiple STT providers** (best price/quality)

---

## Marketing Strategy

### Launch Plan
1. **Product Hunt** launch
2. **Hacker News** Show HN post
3. **Reddit** (r/macapps, r/productivity)
4. **Twitter/X** tech community
5. **YouTube** demo video
6. **Blog** SEO articles

### SEO Keywords
- "voice to text mac"
- "dictation app mac"
- "wispr flow alternative"
- "speech to text app"
- "voice typing mac"

### Pricing Strategy
- Free tier to acquire users
- Pro at $8 (same as Wispr Flow)
- Annual discount (2 months free)
- Referral program (1 month free)

---

## Success Metrics

### KPIs
| Metric | Month 1 | Month 3 | Month 6 | Year 1 |
|--------|---------|---------|---------|--------|
| Users | 500 | 2,000 | 5,000 | 15,000 |
| Paid users | 25 | 150 | 500 | 2,000 |
| MRR | $200 | $1,200 | $4,000 | $16,000 |
| Churn | <10% | <8% | <5% | <5% |

### Revenue Projection
| | Year 1 | Year 2 | Year 3 |
|--|--------|--------|--------|
| Users | 15,000 | 50,000 | 150,000 |
| Paid (10%) | 1,500 | 5,000 | 15,000 |
| MRR | $12,000 | $40,000 | $120,000 |
| ARR | $144,000 | $480,000 | $1.44M |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| API costs spike | Margins drop | Multiple providers, local fallback |
| Groq removes free tier | Costs increase | OpenAI/Deepgram backup |
| Competition | Users leave | Better features, lower price |
| App Store rejection | Can't distribute | Notarize properly, follow guidelines |
| Security breach | Trust lost | Encryption, audits, no storage |
| Low conversion | No revenue | Improve onboarding, add features |

---

## Next Steps

1. **Create new project** (fresh start)
2. **Setup Tauri** with menubar support
3. **Build menubar widget** first
4. **Implement core recording**
5. **Add style matching**
6. **Setup Laravel backend**
7. **Integrate auth & payments**
8. **Launch MVP**

---

## Questions to Decide

1. **App name**: Keep "Wishper" or rebrand?
2. **Open source**: Core open, pro features closed?
3. **Pricing**: $8/mo or different?
4. **Free tier**: 30 mins or different limit?
5. **Windows**: Include in v1 or later?

---

*Created: January 2026*
*Version: 1.0*
