# Wishper Pro - Laravel Backend Plan

## Overview

Laravel API backend for Wishper Pro desktop app. Handles authentication, subscriptions, usage tracking, and proxies STT/LLM requests.

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Laravel 11 |
| PHP | 8.3+ |
| Database | PostgreSQL (Neon/PlanetScale) |
| Cache | Redis (Upstash) |
| Queue | Redis / Laravel Horizon |
| Auth | Laravel Sanctum (API tokens) |
| Payments | Stripe (Laravel Cashier) |
| File Storage | S3 / Cloudflare R2 (temp audio) |
| Email | Resend / Mailgun |
| Hosting | Laravel Forge / Vapor |
| Monitoring | Laravel Pulse / Sentry |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LARAVEL BACKEND                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────┐  │
│   │   ROUTES    │   │ CONTROLLERS │   │      SERVICES           │  │
│   │             │   │             │   │                         │  │
│   │  /api/auth  │──▶│ AuthCtrl    │──▶│  AuthService            │  │
│   │  /api/trans │──▶│ TransCtrl   │──▶│  TranscriptionService   │  │
│   │  /api/usage │──▶│ UsageCtrl   │──▶│  UsageService           │  │
│   │  /api/sub   │──▶│ SubCtrl     │──▶│  StripeService          │  │
│   │             │   │             │   │                         │  │
│   └─────────────┘   └─────────────┘   └─────────────────────────┘  │
│                                                 │                   │
│                                                 ▼                   │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                    EXTERNAL APIS                             │  │
│   │                                                              │  │
│   │   Groq API    OpenAI API    Gemini API    Deepgram API      │  │
│   │   (Whisper)   (Whisper)     (Flash)       (Nova-3)          │  │
│   │                                                              │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Users Table
```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('email')->unique();
    $table->timestamp('email_verified_at')->nullable();
    $table->string('password');
    $table->enum('plan', ['free', 'pro', 'business', 'enterprise'])->default('free');
    $table->string('stripe_id')->nullable()->index();
    $table->string('pm_type')->nullable();
    $table->string('pm_last_four', 4)->nullable();
    $table->timestamp('trial_ends_at')->nullable();
    $table->rememberToken();
    $table->timestamps();
    $table->softDeletes();
});
```

### Subscriptions Table (Cashier)
```php
Schema::create('subscriptions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('type');
    $table->string('stripe_id')->unique();
    $table->string('stripe_status');
    $table->string('stripe_price')->nullable();
    $table->integer('quantity')->nullable();
    $table->timestamp('trial_ends_at')->nullable();
    $table->timestamp('ends_at')->nullable();
    $table->timestamps();
    $table->index(['user_id', 'stripe_status']);
});
```

### Usage Table
```php
Schema::create('usage', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->decimal('minutes_used', 10, 2)->default(0);
    $table->integer('transcription_count')->default(0);
    $table->date('date');
    $table->timestamps();
    $table->unique(['user_id', 'date']);
    $table->index(['user_id', 'date']);
});
```

### Dictionary Words Table
```php
Schema::create('dictionary_words', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('word', 255);
    $table->string('category', 50)->default('general');
    $table->string('pronunciation')->nullable(); // phonetic hint
    $table->timestamps();
    $table->index(['user_id', 'category']);
});
```

### Custom Commands Table
```php
Schema::create('custom_commands', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('trigger_phrase', 255);
    $table->text('replacement_text');
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    $table->index('user_id');
});
```

### Style Preferences Table
```php
Schema::create('style_preferences', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('app_identifier', 100); // com.apple.mail, com.slack.Slack
    $table->string('app_name', 100);       // Mail, Slack
    $table->enum('style', ['formal', 'casual', 'extremely_casual'])->default('casual');
    $table->timestamps();
    $table->unique(['user_id', 'app_identifier']);
});
```

### Transcriptions (History) Table
```php
Schema::create('transcriptions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->text('original_text');
    $table->text('polished_text')->nullable();
    $table->string('app_context', 100)->nullable();
    $table->enum('style', ['formal', 'casual', 'extremely_casual'])->nullable();
    $table->string('language', 10)->default('en');
    $table->integer('duration_seconds')->default(0);
    $table->integer('word_count')->default(0);
    $table->string('transcription_provider', 50)->nullable();
    $table->string('polishing_provider', 50)->nullable();
    $table->timestamps();
    $table->index(['user_id', 'created_at']);
});
```

### User Settings Table
```php
Schema::create('user_settings', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->json('settings');
    $table->timestamps();
    $table->unique('user_id');
});
```

### API Keys Table (User's own keys)
```php
Schema::create('user_api_keys', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('provider', 50); // groq, openai, gemini, deepgram
    $table->text('api_key_encrypted');
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    $table->unique(['user_id', 'provider']);
});
```

---

## API Endpoints

### Authentication
```
POST   /api/auth/register        Register new user
POST   /api/auth/login           Login, get token
POST   /api/auth/logout          Logout, revoke token
POST   /api/auth/refresh         Refresh token
GET    /api/auth/user            Get current user
POST   /api/auth/forgot-password Send reset email
POST   /api/auth/reset-password  Reset password
POST   /api/auth/verify-email    Verify email
```

### Transcription (Core Feature)
```
POST   /api/transcribe           Transcribe audio file
       - file: audio (wav/mp3/webm)
       - language: string (optional, auto-detect)
       - provider: string (optional)
       Returns: { text: string, duration: number }

POST   /api/polish               Polish transcribed text
       - text: string
       - style: formal|casual|extremely_casual
       - context: string (app name)
       - provider: string (optional)
       Returns: { text: string }

POST   /api/transcribe-and-polish  Combined endpoint
       - file: audio
       - style: string
       - context: string
       Returns: { original: string, polished: string }
```

### Dictionary
```
GET    /api/dictionary           List all words
       ?category=names           Filter by category
       ?search=john              Search words

POST   /api/dictionary           Add word
       - word: string
       - category: string

PUT    /api/dictionary/{id}      Update word

DELETE /api/dictionary/{id}      Delete word

POST   /api/dictionary/import    Bulk import
       - words: array

GET    /api/dictionary/export    Export all words
```

### Custom Commands
```
GET    /api/commands             List all commands

POST   /api/commands             Create command
       - trigger_phrase: string
       - replacement_text: string

PUT    /api/commands/{id}        Update command

DELETE /api/commands/{id}        Delete command

POST   /api/commands/toggle/{id} Toggle active/inactive
```

### Style Preferences
```
GET    /api/styles               List all app styles

POST   /api/styles               Set app style
       - app_identifier: string
       - app_name: string
       - style: formal|casual|extremely_casual

PUT    /api/styles/{app}         Update app style

DELETE /api/styles/{app}         Remove app style (use default)

GET    /api/styles/default       Get default style
POST   /api/styles/default       Set default style
```

### History
```
GET    /api/history              List transcriptions
       ?page=1                   Pagination
       ?per_page=20
       ?date_from=2026-01-01
       ?date_to=2026-01-31
       ?app=Slack
       ?search=meeting

GET    /api/history/{id}         Get single transcription

DELETE /api/history/{id}         Delete transcription

DELETE /api/history              Bulk delete
       - ids: array

GET    /api/history/export       Export history
       ?format=csv|json
       ?date_from=
       ?date_to=
```

### Usage & Limits
```
GET    /api/usage                Get current month usage
       Returns: {
         minutes_used: 45.5,
         minutes_limit: 300,
         transcription_count: 89,
         days_remaining: 15,
         plan: "pro"
       }

GET    /api/usage/stats          Get usage statistics
       ?period=month|year
       Returns: {
         total_minutes: 1234.5,
         total_transcriptions: 5678,
         by_month: [...],
         by_app: [...]
       }

GET    /api/usage/history        Usage history by day
       ?days=30
```

### Subscription (Stripe)
```
GET    /api/subscription         Get current subscription
       Returns: {
         plan: "pro",
         status: "active",
         current_period_end: "2026-02-11",
         cancel_at_period_end: false
       }

POST   /api/subscription/checkout  Create checkout session
       - plan: pro|business
       - annual: boolean
       Returns: { checkout_url: string }

POST   /api/subscription/portal  Get billing portal URL
       Returns: { portal_url: string }

POST   /api/subscription/cancel  Cancel subscription

POST   /api/subscription/resume  Resume canceled subscription

POST   /api/webhooks/stripe      Stripe webhook handler
```

### Settings Sync
```
GET    /api/settings             Get all settings
       Returns: { settings: {...} }

POST   /api/settings             Update settings
       - settings: object

GET    /api/settings/{key}       Get specific setting

PUT    /api/settings/{key}       Update specific setting
```

### User API Keys
```
GET    /api/keys                 List user's API keys (masked)

POST   /api/keys                 Add API key
       - provider: string
       - api_key: string

DELETE /api/keys/{provider}      Remove API key

POST   /api/keys/test            Test API key validity
       - provider: string
       - api_key: string
```

---

## File Structure

```
wishper-backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── Auth/
│   │   │   │   ├── RegisterController.php
│   │   │   │   ├── LoginController.php
│   │   │   │   ├── ForgotPasswordController.php
│   │   │   │   └── VerificationController.php
│   │   │   ├── TranscriptionController.php
│   │   │   ├── DictionaryController.php
│   │   │   ├── CommandController.php
│   │   │   ├── StyleController.php
│   │   │   ├── HistoryController.php
│   │   │   ├── UsageController.php
│   │   │   ├── SubscriptionController.php
│   │   │   ├── SettingsController.php
│   │   │   ├── ApiKeyController.php
│   │   │   └── WebhookController.php
│   │   ├── Middleware/
│   │   │   ├── CheckUsageLimit.php
│   │   │   ├── CheckSubscription.php
│   │   │   ├── TrackUsage.php
│   │   │   └── RateLimitByPlan.php
│   │   ├── Requests/
│   │   │   ├── TranscribeRequest.php
│   │   │   ├── PolishRequest.php
│   │   │   ├── DictionaryRequest.php
│   │   │   ├── CommandRequest.php
│   │   │   └── StyleRequest.php
│   │   └── Resources/
│   │       ├── UserResource.php
│   │       ├── TranscriptionResource.php
│   │       ├── DictionaryResource.php
│   │       ├── UsageResource.php
│   │       └── SubscriptionResource.php
│   │
│   ├── Models/
│   │   ├── User.php
│   │   ├── Usage.php
│   │   ├── DictionaryWord.php
│   │   ├── CustomCommand.php
│   │   ├── StylePreference.php
│   │   ├── Transcription.php
│   │   ├── UserSetting.php
│   │   └── UserApiKey.php
│   │
│   ├── Services/
│   │   ├── Transcription/
│   │   │   ├── TranscriptionService.php
│   │   │   ├── GroqWhisperService.php
│   │   │   ├── OpenAIWhisperService.php
│   │   │   ├── DeepgramService.php
│   │   │   └── TranscriptionProviderInterface.php
│   │   ├── Polishing/
│   │   │   ├── PolishingService.php
│   │   │   ├── GroqLlamaService.php
│   │   │   ├── GeminiService.php
│   │   │   ├── OpenAIService.php
│   │   │   └── PolishingProviderInterface.php
│   │   ├── UsageService.php
│   │   ├── DictionaryService.php
│   │   ├── SettingsSyncService.php
│   │   └── EncryptionService.php
│   │
│   ├── Jobs/
│   │   ├── ProcessTranscription.php
│   │   ├── TrackUsage.php
│   │   └── SendUsageAlert.php
│   │
│   ├── Events/
│   │   ├── TranscriptionCompleted.php
│   │   ├── UsageLimitReached.php
│   │   └── SubscriptionChanged.php
│   │
│   ├── Listeners/
│   │   ├── LogTranscription.php
│   │   ├── SendUsageLimitEmail.php
│   │   └── UpdateUserPlan.php
│   │
│   ├── Notifications/
│   │   ├── UsageLimitWarning.php
│   │   ├── UsageLimitReached.php
│   │   ├── SubscriptionRenewed.php
│   │   └── SubscriptionCanceled.php
│   │
│   └── Policies/
│       ├── DictionaryWordPolicy.php
│       ├── CustomCommandPolicy.php
│       ├── TranscriptionPolicy.php
│       └── StylePreferencePolicy.php
│
├── config/
│   ├── services.php              # API keys config
│   ├── plans.php                 # Subscription plans
│   └── limits.php                # Usage limits per plan
│
├── database/
│   ├── migrations/
│   │   ├── 0001_create_users_table.php
│   │   ├── 0002_create_subscriptions_table.php
│   │   ├── 0003_create_usage_table.php
│   │   ├── 0004_create_dictionary_words_table.php
│   │   ├── 0005_create_custom_commands_table.php
│   │   ├── 0006_create_style_preferences_table.php
│   │   ├── 0007_create_transcriptions_table.php
│   │   ├── 0008_create_user_settings_table.php
│   │   └── 0009_create_user_api_keys_table.php
│   ├── seeders/
│   │   ├── DatabaseSeeder.php
│   │   └── PlanSeeder.php
│   └── factories/
│       └── UserFactory.php
│
├── routes/
│   ├── api.php                   # All API routes
│   └── webhooks.php              # Stripe webhooks
│
├── tests/
│   ├── Feature/
│   │   ├── AuthTest.php
│   │   ├── TranscriptionTest.php
│   │   ├── DictionaryTest.php
│   │   ├── UsageTest.php
│   │   └── SubscriptionTest.php
│   └── Unit/
│       ├── TranscriptionServiceTest.php
│       ├── PolishingServiceTest.php
│       └── UsageServiceTest.php
│
├── .env.example
├── composer.json
└── README.md
```

---

## Key Services Implementation

### TranscriptionService.php
```php
<?php

namespace App\Services\Transcription;

use App\Models\User;
use Illuminate\Http\UploadedFile;

class TranscriptionService
{
    public function __construct(
        private GroqWhisperService $groq,
        private OpenAIWhisperService $openai,
        private DeepgramService $deepgram,
    ) {}

    public function transcribe(
        UploadedFile $audio,
        User $user,
        ?string $provider = null,
        ?string $language = null
    ): array {
        $provider = $provider ?? $this->getDefaultProvider($user);
        
        $service = match ($provider) {
            'groq' => $this->groq,
            'openai' => $this->openai,
            'deepgram' => $this->deepgram,
            default => $this->groq,
        };

        // Get user's dictionary for context
        $dictionary = $user->dictionaryWords()->pluck('word')->toArray();

        $result = $service->transcribe($audio, $language, $dictionary);

        return [
            'text' => $result['text'],
            'duration' => $result['duration'],
            'language' => $result['language'] ?? $language ?? 'en',
            'provider' => $provider,
        ];
    }

    private function getDefaultProvider(User $user): string
    {
        // Check if user has custom API keys
        if ($user->apiKeys()->where('provider', 'openai')->exists()) {
            return 'openai';
        }
        
        // Free users get Groq only
        if ($user->plan === 'free') {
            return 'groq';
        }

        return config('services.default_transcription_provider', 'groq');
    }
}
```

### PolishingService.php
```php
<?php

namespace App\Services\Polishing;

use App\Models\User;

class PolishingService
{
    private array $stylePrompts = [
        'formal' => 'Clean the text with full punctuation, proper capitalization, and professional grammar.',
        'casual' => 'Clean the text with basic punctuation, conversational tone. Less formal.',
        'extremely_casual' => 'Clean the text with minimal punctuation, lowercase, texting style.',
    ];

    public function __construct(
        private GroqLlamaService $groq,
        private GeminiService $gemini,
        private OpenAIService $openai,
    ) {}

    public function polish(
        string $text,
        User $user,
        string $style = 'casual',
        ?string $appContext = null,
        ?string $provider = null
    ): array {
        // Get app-specific style if available
        if ($appContext) {
            $stylePref = $user->stylePreferences()
                ->where('app_identifier', $appContext)
                ->first();
            
            if ($stylePref) {
                $style = $stylePref->style;
            }
        }

        $provider = $provider ?? $this->getDefaultProvider($user);
        
        $service = match ($provider) {
            'groq' => $this->groq,
            'gemini' => $this->gemini,
            'openai' => $this->openai,
            default => $this->gemini,
        };

        // Get user's custom commands
        $commands = $user->customCommands()
            ->where('is_active', true)
            ->get();

        // Apply custom commands first
        $processedText = $this->applyCommands($text, $commands);

        // Polish with LLM
        $prompt = $this->buildPrompt($style);
        $result = $service->polish($processedText, $prompt);

        return [
            'text' => $result['text'],
            'style' => $style,
            'provider' => $provider,
        ];
    }

    private function applyCommands(string $text, $commands): string
    {
        foreach ($commands as $command) {
            $text = str_ireplace(
                $command->trigger_phrase,
                $command->replacement_text,
                $text
            );
        }
        return $text;
    }

    private function buildPrompt(string $style): string
    {
        $basePrompt = "You are a voice transcription cleaner. Your ONLY job is to:
1. Remove filler words: um, uh, like, you know, basically, actually, so, well, I mean
2. Fix typos and transcription errors
3. Add punctuation where natural pauses occur
4. Capitalize properly

STRICT RULES:
- Keep the EXACT same sentence structure
- Do NOT reformat into lists or bullet points
- Do NOT rephrase or rewrite
- Do NOT add or remove information
- Output should read naturally as spoken text

Style: {$this->stylePrompts[$style]}

Output ONLY the cleaned text:";

        return $basePrompt;
    }

    private function getDefaultProvider(User $user): string
    {
        if ($user->plan === 'free') {
            return 'gemini'; // Free Gemini
        }
        return config('services.default_polishing_provider', 'gemini');
    }
}
```

### UsageService.php
```php
<?php

namespace App\Services;

use App\Models\User;
use App\Models\Usage;
use Carbon\Carbon;

class UsageService
{
    private array $limits = [
        'free' => 30,      // 30 minutes/month
        'pro' => 300,      // 300 minutes/month
        'business' => -1,  // Unlimited
        'enterprise' => -1,
    ];

    public function trackUsage(User $user, float $minutes): void
    {
        Usage::updateOrCreate(
            [
                'user_id' => $user->id,
                'date' => Carbon::today(),
            ],
            [
                'minutes_used' => \DB::raw("minutes_used + {$minutes}"),
                'transcription_count' => \DB::raw('transcription_count + 1'),
            ]
        );
    }

    public function getCurrentUsage(User $user): array
    {
        $startOfMonth = Carbon::now()->startOfMonth();
        $endOfMonth = Carbon::now()->endOfMonth();

        $usage = Usage::where('user_id', $user->id)
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->selectRaw('SUM(minutes_used) as total_minutes, SUM(transcription_count) as total_count')
            ->first();

        $limit = $this->limits[$user->plan] ?? 30;

        return [
            'minutes_used' => round($usage->total_minutes ?? 0, 2),
            'minutes_limit' => $limit,
            'transcription_count' => $usage->total_count ?? 0,
            'days_remaining' => Carbon::now()->daysUntil($endOfMonth),
            'plan' => $user->plan,
            'is_unlimited' => $limit === -1,
            'usage_percentage' => $limit > 0 
                ? min(100, round(($usage->total_minutes ?? 0) / $limit * 100, 1))
                : 0,
        ];
    }

    public function hasAvailableMinutes(User $user): bool
    {
        $usage = $this->getCurrentUsage($user);
        
        if ($usage['is_unlimited']) {
            return true;
        }

        return $usage['minutes_used'] < $usage['minutes_limit'];
    }

    public function getRemainingMinutes(User $user): float
    {
        $usage = $this->getCurrentUsage($user);
        
        if ($usage['is_unlimited']) {
            return PHP_FLOAT_MAX;
        }

        return max(0, $usage['minutes_limit'] - $usage['minutes_used']);
    }
}
```

---

## Middleware

### CheckUsageLimit.php
```php
<?php

namespace App\Http\Middleware;

use App\Services\UsageService;
use Closure;
use Illuminate\Http\Request;

class CheckUsageLimit
{
    public function __construct(private UsageService $usageService) {}

    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();

        if (!$this->usageService->hasAvailableMinutes($user)) {
            return response()->json([
                'error' => 'usage_limit_exceeded',
                'message' => 'Monthly usage limit reached. Please upgrade your plan.',
                'usage' => $this->usageService->getCurrentUsage($user),
            ], 429);
        }

        return $next($request);
    }
}
```

### RateLimitByPlan.php
```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class RateLimitByPlan
{
    private array $limits = [
        'free' => 10,       // 10 requests/minute
        'pro' => 60,        // 60 requests/minute
        'business' => 120,  // 120 requests/minute
        'enterprise' => 300,
    ];

    public function handle(Request $request, Closure $next)
    {
        $user = $request->user();
        $key = 'api:' . $user->id;
        $limit = $this->limits[$user->plan] ?? 10;

        if (RateLimiter::tooManyAttempts($key, $limit)) {
            return response()->json([
                'error' => 'rate_limit_exceeded',
                'message' => 'Too many requests. Please slow down.',
                'retry_after' => RateLimiter::availableIn($key),
            ], 429);
        }

        RateLimiter::hit($key, 60);

        return $next($request);
    }
}
```

---

## Config Files

### config/plans.php
```php
<?php

return [
    'free' => [
        'name' => 'Free',
        'price_monthly' => 0,
        'price_yearly' => 0,
        'stripe_price_monthly' => null,
        'stripe_price_yearly' => null,
        'minutes_limit' => 30,
        'features' => [
            'Basic transcription',
            'Groq Whisper only',
            '3 style modes',
            '10 dictionary words',
            '5 custom commands',
        ],
    ],
    'pro' => [
        'name' => 'Pro',
        'price_monthly' => 8,
        'price_yearly' => 80, // 2 months free
        'stripe_price_monthly' => 'price_xxx_monthly',
        'stripe_price_yearly' => 'price_xxx_yearly',
        'minutes_limit' => 300,
        'features' => [
            'Everything in Free',
            'All STT providers',
            'All LLM providers',
            'Unlimited dictionary',
            'Unlimited commands',
            'History sync',
            'Priority support',
        ],
    ],
    'business' => [
        'name' => 'Business',
        'price_monthly' => 15,
        'price_yearly' => 150,
        'stripe_price_monthly' => 'price_xxx_monthly',
        'stripe_price_yearly' => 'price_xxx_yearly',
        'minutes_limit' => -1, // Unlimited
        'features' => [
            'Everything in Pro',
            'Unlimited minutes',
            'API access',
            'Team features',
            'Custom integrations',
            'Dedicated support',
        ],
    ],
];
```

### config/limits.php
```php
<?php

return [
    'dictionary_words' => [
        'free' => 10,
        'pro' => -1,  // Unlimited
        'business' => -1,
        'enterprise' => -1,
    ],
    'custom_commands' => [
        'free' => 5,
        'pro' => -1,
        'business' => -1,
        'enterprise' => -1,
    ],
    'history_days' => [
        'free' => 7,
        'pro' => 90,
        'business' => 365,
        'enterprise' => -1,
    ],
    'rate_limit_per_minute' => [
        'free' => 10,
        'pro' => 60,
        'business' => 120,
        'enterprise' => 300,
    ],
];
```

---

## Routes

### routes/api.php
```php
<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\*;

// Public routes
Route::post('/auth/register', [Auth\RegisterController::class, 'register']);
Route::post('/auth/login', [Auth\LoginController::class, 'login']);
Route::post('/auth/forgot-password', [Auth\ForgotPasswordController::class, 'sendResetLink']);
Route::post('/auth/reset-password', [Auth\ForgotPasswordController::class, 'reset']);

// Protected routes
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {
    
    // Auth
    Route::post('/auth/logout', [Auth\LoginController::class, 'logout']);
    Route::get('/auth/user', [Auth\LoginController::class, 'user']);
    
    // Transcription (with usage limit check)
    Route::middleware(['check.usage', 'track.usage'])->group(function () {
        Route::post('/transcribe', [TranscriptionController::class, 'transcribe']);
        Route::post('/polish', [TranscriptionController::class, 'polish']);
        Route::post('/transcribe-and-polish', [TranscriptionController::class, 'transcribeAndPolish']);
    });
    
    // Dictionary
    Route::apiResource('dictionary', DictionaryController::class);
    Route::post('/dictionary/import', [DictionaryController::class, 'import']);
    Route::get('/dictionary/export', [DictionaryController::class, 'export']);
    
    // Commands
    Route::apiResource('commands', CommandController::class);
    Route::post('/commands/{command}/toggle', [CommandController::class, 'toggle']);
    
    // Styles
    Route::get('/styles', [StyleController::class, 'index']);
    Route::post('/styles', [StyleController::class, 'store']);
    Route::put('/styles/{app}', [StyleController::class, 'update']);
    Route::delete('/styles/{app}', [StyleController::class, 'destroy']);
    Route::get('/styles/default', [StyleController::class, 'getDefault']);
    Route::post('/styles/default', [StyleController::class, 'setDefault']);
    
    // History
    Route::get('/history', [HistoryController::class, 'index']);
    Route::get('/history/export', [HistoryController::class, 'export']);
    Route::get('/history/{transcription}', [HistoryController::class, 'show']);
    Route::delete('/history/{transcription}', [HistoryController::class, 'destroy']);
    Route::delete('/history', [HistoryController::class, 'bulkDestroy']);
    
    // Usage
    Route::get('/usage', [UsageController::class, 'current']);
    Route::get('/usage/stats', [UsageController::class, 'stats']);
    Route::get('/usage/history', [UsageController::class, 'history']);
    
    // Subscription
    Route::get('/subscription', [SubscriptionController::class, 'show']);
    Route::post('/subscription/checkout', [SubscriptionController::class, 'checkout']);
    Route::post('/subscription/portal', [SubscriptionController::class, 'portal']);
    Route::post('/subscription/cancel', [SubscriptionController::class, 'cancel']);
    Route::post('/subscription/resume', [SubscriptionController::class, 'resume']);
    
    // Settings
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::post('/settings', [SettingsController::class, 'update']);
    
    // User API Keys
    Route::get('/keys', [ApiKeyController::class, 'index']);
    Route::post('/keys', [ApiKeyController::class, 'store']);
    Route::delete('/keys/{provider}', [ApiKeyController::class, 'destroy']);
    Route::post('/keys/test', [ApiKeyController::class, 'test']);
});

// Webhooks (no auth, verified by signature)
Route::post('/webhooks/stripe', [WebhookController::class, 'handleStripe'])
    ->middleware('stripe.webhook');
```

---

## Environment Variables

### .env.example
```env
APP_NAME=Wishper
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://api.wishper.app

# Database
DB_CONNECTION=pgsql
DB_HOST=
DB_PORT=5432
DB_DATABASE=wishper
DB_USERNAME=
DB_PASSWORD=

# Redis
REDIS_HOST=
REDIS_PASSWORD=
REDIS_PORT=6379

# Stripe
STRIPE_KEY=pk_live_xxx
STRIPE_SECRET=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
CASHIER_CURRENCY=usd

# STT Providers
GROQ_API_KEY=gsk_xxx
OPENAI_API_KEY=sk-xxx
DEEPGRAM_API_KEY=xxx
GEMINI_API_KEY=xxx

# Default Providers
DEFAULT_TRANSCRIPTION_PROVIDER=groq
DEFAULT_POLISHING_PROVIDER=gemini

# Mail
MAIL_MAILER=resend
RESEND_API_KEY=re_xxx
MAIL_FROM_ADDRESS=hello@wishper.app
MAIL_FROM_NAME="Wishper"

# Storage (for temp audio)
FILESYSTEM_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=wishper-uploads

# Security
SANCTUM_STATEFUL_DOMAINS=app.wishper.app
SESSION_DOMAIN=.wishper.app
```

---

## Development Timeline

| Phase | Tasks | Time |
|-------|-------|------|
| **Phase 1** | Project setup, migrations, models | 1 day |
| **Phase 2** | Auth system (register, login, tokens) | 1 day |
| **Phase 3** | Transcription service (Groq, OpenAI) | 1 day |
| **Phase 4** | Polishing service (Gemini, GPT) | 1 day |
| **Phase 5** | Dictionary & Commands CRUD | 1 day |
| **Phase 6** | Styles & History | 1 day |
| **Phase 7** | Usage tracking & limits | 0.5 day |
| **Phase 8** | Stripe subscriptions | 1 day |
| **Phase 9** | Settings sync | 0.5 day |
| **Phase 10** | Testing & bug fixes | 1 day |
| **Total** | | **~9 days** |

---

## Deployment Checklist

- [ ] Setup Laravel Forge / Vapor
- [ ] Configure PostgreSQL database
- [ ] Setup Redis for cache/queues
- [ ] Configure Stripe products & prices
- [ ] Setup email (Resend/Mailgun)
- [ ] Configure S3/R2 for temp storage
- [ ] Setup SSL certificate
- [ ] Configure Cloudflare
- [ ] Setup monitoring (Pulse/Sentry)
- [ ] Enable queue workers
- [ ] Configure backups
- [ ] Setup staging environment
- [ ] Load testing

---

## Security Considerations

1. **API Keys Encryption**: User API keys encrypted with `encrypt()`
2. **Rate Limiting**: Per-plan rate limits
3. **Input Validation**: FormRequest validation
4. **SQL Injection**: Eloquent ORM prevents
5. **XSS**: API-only, no HTML output
6. **CORS**: Configured for app domains only
7. **Audio Files**: Deleted after processing (never stored)
8. **Webhook Verification**: Stripe signature validation
9. **Token Expiry**: Sanctum tokens with expiry
10. **Audit Logging**: Log all sensitive actions

---

*Created: January 2026*
*Version: 1.0*
