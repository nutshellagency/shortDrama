# ShortDrama - UI/UX Screen Inventory

> **Based on**: Provided design mockups + ReelShort app patterns  
> **Last Updated**: December 2024  
> **Total Screens**: 32 screens across 7 modules

---

## Design System Foundation

### Color Palette (Customizable)
```
// Primary Theme - Current (Dark Purple)
--bg-primary: #1A0A1E          // Deep purple-black background
--bg-secondary: #2D1B35        // Card backgrounds
--bg-tertiary: #3D2845         // Elevated surfaces

--accent-primary: #E91E8C      // Hot pink (CTAs, highlights)
--accent-secondary: #9C27B0    // Purple accent
--accent-gradient: linear-gradient(135deg, #E91E8C 0%, #9C27B0 100%)

--text-primary: #FFFFFF        // Primary text
--text-secondary: #B8A8C0      // Secondary text (muted)
--text-accent: #E91E8C         // Highlighted text

--tag-new: #4CAF50             // "NEW" badge
--tag-hot: #FF5722             // "HOT" badge  
--tag-pro: #E91E8C             // "PRO" badge
--tag-trending: #E91E8C        // "TRENDING" badge

--coin-gold: #FFD700           // Coin indicator
--star-rating: #FFD700         // Star ratings

// Border & Dividers
--border-subtle: rgba(255,255,255,0.1)
--border-card: rgba(255,255,255,0.18)
```

### Typography
```
--font-family: 'Segoe UI', system-ui, -apple-system, sans-serif

--font-size-h1: 28px           // Screen titles
--font-size-h2: 22px           // Section headers  
--font-size-h3: 18px           // Card titles
--font-size-body: 16px         // Body text
--font-size-caption: 14px      // Captions, metadata
--font-size-small: 12px        // Tags, badges
```

### Spacing System
```
--space-xs: 4px
--space-sm: 8px
--space-md: 12px
--space-lg: 16px
--space-xl: 24px
--space-2xl: 32px
```

### Component Patterns
- **Cards**: Rounded corners (12-16px), subtle border, slight shadow
- **Buttons**: Full-width CTAs with gradient, pill-shaped chips
- **Tags/Badges**: Pill-shaped, color-coded by type
- **Bottom Nav**: 4 tabs with icons + labels, highlight active

---

## Screen Inventory

### Module 1: Onboarding & Auth (4 screens)

#### 1.1 Splash Screen
- **Priority**: P0
- **Status**: 🔲 Not Started
- **Elements**:
  - App logo (play icon + "shortDrama" text)
  - Loading indicator
  - Gradient background
- **Transitions**: Auto → Language Selection (first launch) or Home (returning user)

#### 1.2 Welcome/Language Selection
- **Priority**: P0  
- **Status**: 🔲 Not Started
- **Elements**:
  - Logo header with "Skip" option
  - Trending series carousel (preview)
  - Tagline: "Drama in Your Pocket"
  - Subtitle: "Stream the best short-form stories in Hindi and Urdu"
  - Language chips: Hindi ✓, Urdu +, Tamil +
  - Social proof: "Join 1M+ Viewers" with avatars
  - Primary CTA: "Get Started Free" (pink button)
  - Secondary: "Already have an account? Log in"
- **Notes**: Matches provided Image 1

#### 1.3 Phone Login (MVP)
- **Priority**: P1
- **Status**: 🔲 Not Started  
- **Elements**:
  - Back navigation
  - Phone input with country code
  - "Send OTP" CTA
  - Terms/Privacy links
  - Social login options (Google, Apple) - future

#### 1.4 OTP Verification (MVP)
- **Priority**: P1
- **Status**: 🔲 Not Started
- **Elements**:
  - Back navigation
  - 6-digit OTP input
  - Resend timer
  - "Verify" CTA

---

### Module 2: Home & Discovery (5 screens)

#### 2.1 Home Feed
- **Priority**: P0
- **Status**: 🔲 Not Started
- **Elements**:
  - **Header**: Logo, Coin balance (yellow), Search icon, Notifications
  - **Filter Pills**: All, Romance, Revenge, CEO, Historical... (scrollable)
  - **Hero Banner**: Featured series with tags (NEW RELEASE, genre), title, description, "Watch Ep 1" CTA, Add to list (+)
  - **Continue Watching Rail**: Thumbnail + title + "Ep X • Xm left"
  - **Top 10 Rail**: Numbered thumbnails (1,2,3...), title
  - **Binge-Worthy Shorts Grid**: 3-column, thumbnails with tags (PRO, NEW), title, episode count
  - **Bottom Nav**: Home, Explore, My List, Profile
- **Notes**: Matches provided Image 2

#### 2.2 Explore/Browse Screen
- **Priority**: P0
- **Status**: 🔲 Not Started
- **Elements**:
  - **Header**: Avatar, Logo, Search icon
  - **Filter Pills**: All, Romance, Revenge, Family...
  - **Featured Banner**: Trending compilation with "Watch Compilation" CTA
  - **Browse by Genre Grid**: 2x2 cards with overlay titles (Love & Betrayal, Royal Courts, Supernatural, Desi Rom-Coms)
  - **Language Rails**: "Urdu Originals" with thumbnails, titles, episode counts, tags (NEW, HOT)
  - **Bottom Nav**
- **Notes**: Matches provided Image 4

#### 2.3 Search Screen
- **Priority**: P1
- **Status**: 🔲 Not Started
- **Elements**:
  - **Search Bar**: Placeholder "Search titles, actors, or genres...", filter icon
  - **Filter Pills**: All, Urdu Drama, Hindi Shorts, Romance...
  - **Trending Now List**: Numbered items with trend arrows
  - **Hot Short Dramas Grid**: 3x2 thumbnails with tags, titles, metrics (views, duration, rating)
  - **Popular Actors Row**: Circular avatars with names
  - **Bottom Nav**
- **Notes**: Matches provided Image 5

#### 2.4 Genre/Category Page
- **Priority**: P1
- **Status**: 🔲 Not Started
- **Elements**:
  - Back nav, Category title
  - Sort/Filter options
  - Grid of series cards
  - Load more/Pagination

#### 2.5 Notifications Screen
- **Priority**: P2
- **Status**: 🔲 Not Started
- **Elements**:
  - Back nav, "Notifications" title
  - Notification list (new episode, coin bonus, etc.)
  - Read/unread states

---

### Module 3: Series & Episode Detail (4 screens)

#### 3.1 Series Detail Page
- **Priority**: P0
- **Status**: 🔲 Not Started
- **Elements**:
  - **Header**: Back nav, Share button, Hero image with gradient overlay
  - **Series Info Card**: Poster thumbnail, Title, Original title/language, Rating stars, Year, Genre
  - **Actions Row**: "Play S1 E1" CTA (pink), Add to list (+), Download icon
  - **Synopsis**: Expandable text with "Read more"
  - **Cast Row**: Circular avatars with names, "See All" link
  - **Tabs**: Episodes | Trailers & More | More Like This
  - **Episode List**: Season/Episode count, Sort toggle, Episode rows (thumbnail with play icon + duration, title, description, download icon)
- **Notes**: Matches provided Image 3

#### 3.2 Episode Player (Full Screen)
- **Priority**: P0
- **Status**: 🟡 POC Partial
- **Elements**:
  - Full-screen 9:16 video
  - Overlay controls (tap to show/hide):
    - Top: Back, Series title, Share, More options
    - Center: Play/Pause (large)
    - Bottom: Progress bar, Current time / Duration, Episode title, Subtitle toggle, Next episode
  - Auto-play next episode prompt
  - Vertical swipe for next episode (TikTok-style)
- **Current POC**: Basic HTML5 video with prev/next buttons

#### 3.3 Locked Episode Overlay
- **Priority**: P0
- **Status**: 🟡 POC Partial
- **Elements**:
  - Blurred/darkened video preview
  - Lock icon
  - Series + Episode title
  - Unlock options:
    - "Watch Ad → Unlock + 10 coins" (primary)
    - "Spend X coins → Unlock" (secondary)
  - Close and Skip buttons
- **Current POC**: Basic modal with buttons

#### 3.4 Rewarded Ad Player
- **Priority**: P0
- **Status**: 🟡 POC Mock
- **Elements**:
  - Full-screen ad video
  - "Ad" label
  - Progress bar with countdown
  - Skip button (appears after X seconds)
  - Reward animation on completion
- **Current POC**: Uses MockAd.mp4 with progress bar

---

### Module 4: Monetization & Wallet (5 screens)

#### 4.1 Coin Balance Widget (Component)
- **Priority**: P0
- **Status**: 🟡 POC Partial  
- **Elements**:
  - Coin icon (gold)
  - Balance number
  - "+" button to buy more
- **Location**: Header, Profile, Unlock overlay

#### 4.2 Coin Store / Top-Up
- **Priority**: P1
- **Status**: 🔲 Not Started
- **Elements**:
  - Current balance
  - Coin packages (grid):
    - 100 coins - $0.99
    - 500 coins - $3.99 (Best Value)
    - 1000 coins - $6.99
    - etc.
  - Payment method selection
  - Purchase CTA
  - Transaction history link

#### 4.3 VIP/Subscription Plans (Future)
- **Priority**: P2
- **Status**: 🔲 Not Started
- **Elements**:
  - Current plan status
  - Plan comparison table
  - Subscribe CTA
  - Benefits list

#### 4.4 Transaction History
- **Priority**: P2
- **Status**: 🔲 Not Started
- **Elements**:
  - Filter by type (Earned, Spent, Purchased)
  - Transaction list with date, type, amount, episode/series

#### 4.5 Daily Rewards / Check-in
- **Priority**: P2  
- **Status**: 🔲 Not Started
- **Elements**:
  - 7-day calendar grid
  - Today's reward highlight
  - Streak counter
  - Claim CTA

---

### Module 5: User Profile & Settings (6 screens)

#### 5.1 Profile & Settings Main
- **Priority**: P1
- **Status**: 🔲 Not Started
- **Elements**:
  - **Header**: Back nav, "Edit" link
  - **Profile Card**: Avatar (with VIP badge if applicable), Name, Email
  - **Upgrade CTA**: "Upgrade to Premium" (gradient button)
  - **Stats Row**: Coins (450), Vouchers (2), Watch Time (12h)
  - **My Activity Grid**: History, My List, Downloads, Continue
  - **App Settings List**: 
    - App Language → English
    - Content Language → Hindi/Urdu
    - Video Quality → Auto (Data Saver)
    - Notifications → Toggle
    - Help & Support →
  - **Sign Out** button
  - **Version** text
  - **Bottom Nav**
- **Notes**: Matches provided Image 6

#### 5.2 Edit Profile
- **Priority**: P2
- **Status**: 🔲 Not Started
- **Elements**:
  - Avatar upload
  - Name input
  - Email input (read-only or change flow)
  - Save CTA

#### 5.3 Watch History
- **Priority**: P1
- **Status**: 🔲 Not Started
- **Elements**:
  - List of watched episodes
  - Resume from timestamp
  - Delete history option

#### 5.4 My List / Watchlist
- **Priority**: P1
- **Status**: 🔲 Not Started
- **Elements**:
  - Grid of saved series
  - Remove from list action
  - Empty state

#### 5.5 Downloads (Offline)
- **Priority**: P2
- **Status**: 🔲 Not Started
- **Elements**:
  - Downloaded episodes list
  - Storage used indicator
  - Delete downloads

#### 5.6 Settings Subpages
- **Priority**: P2
- **Status**: 🔲 Not Started
- **Subpages**:
  - Language Selection
  - Video Quality Options
  - Notification Preferences
  - Help/FAQ
  - Terms of Service
  - Privacy Policy
  - About App

---

### Module 6: Admin Web Panel (6 screens)

#### 6.1 Admin Login
- **Priority**: P0
- **Status**: ✅ In POC
- **Elements**:
  - Email/Password inputs
  - Login CTA

#### 6.2 Admin Dashboard
- **Priority**: P0
- **Status**: 🟡 POC Basic
- **Elements**:
  - Quick stats: Total users, Active series, Episodes, Revenue
  - Recent activity feed
  - Quick actions

#### 6.3 Series Management
- **Priority**: P0
- **Status**: 🟡 POC Basic
- **Elements**:
  - Series list table
  - Create new series
  - Edit series metadata
  - Episode count, status

#### 6.4 Episode Upload Wizard
- **Priority**: P0
- **Status**: 🟡 POC Basic
- **Elements**:
  - Step 1: Upload raw video
  - Step 2: Set episode rules (duration, free count, coin cost)
  - Step 3: Generate episodes (auto-split)
  - Progress indicator

#### 6.5 AI Job Monitor
- **Priority**: P0
- **Status**: 🟡 POC Basic
- **Elements**:
  - Job queue list
  - Status: Pending, Processing, Succeeded, Failed
  - Progress percentage
  - Retry action
  - Error logs

#### 6.6 Analytics Dashboard (Future)
- **Priority**: P2
- **Status**: 🔲 Not Started
- **Elements**:
  - Views over time
  - Popular content
  - Revenue breakdown
  - User engagement metrics

---

### Module 7: Miscellaneous (2 screens)

#### 7.1 Error States
- **Priority**: P1
- **Status**: 🔲 Not Started
- **Types**:
  - Network error
  - Content not found
  - Server error
  - Empty states (no content, no results)

#### 7.2 Loading States
- **Priority**: P1
- **Status**: 🔲 Not Started
- **Types**:
  - Skeleton screens
  - Spinner overlays
  - Progress indicators

---

## Screen Count Summary

| Module | Screens | P0 | P1 | P2 | In POC |
|--------|---------|----|----|----|----|
| Onboarding & Auth | 4 | 2 | 2 | 0 | 0 |
| Home & Discovery | 5 | 2 | 2 | 1 | 0 |
| Series & Episode | 4 | 4 | 0 | 0 | 2 |
| Monetization | 5 | 1 | 1 | 3 | 1 |
| Profile & Settings | 6 | 0 | 3 | 3 | 0 |
| Admin Web | 6 | 5 | 0 | 1 | 5 |
| Miscellaneous | 2 | 0 | 2 | 0 | 0 |
| **TOTAL** | **32** | **14** | **10** | **8** | **8** |

---

## Implementation Priority Roadmap

### Phase 1: Core POC Enhancement (Current)
1. ✅ Fix coin reward on ad watch
2. ✅ Smart crop AI worker
3. 🔲 Enhance viewer UI (better player controls)

### Phase 2: MVP Mobile App (Flutter)
1. Welcome/Language Selection
2. Home Feed with all rails
3. Series Detail Page
4. Enhanced Episode Player
5. Locked Episode Overlay
6. Profile & Settings

### Phase 3: Monetization
1. Coin Store / Top-Up
2. AdMob integration (replace mock)
3. Transaction History

### Phase 4: Polish & Growth
1. Search with filters
2. Explore/Browse
3. Notifications
4. Downloads (offline)
5. VIP/Subscription

---

## Notes for Development

### Flutter Widget Mapping
```
Bottom Nav → BottomNavigationBar / NavigationBar
Cards → Card with ClipRRect
Filter Pills → Chip / ChoiceChip in horizontal ListView
Hero Banner → Stack with gradient overlay
Episode List → ListView.builder
Grid Views → GridView.builder / SliverGrid
Video Player → video_player + chewie
```

### Key Interactions
- **Vertical swipe**: Next/previous episode (like TikTok)
- **Horizontal swipe**: Episode list scroll
- **Long press**: Quick actions menu
- **Double tap**: Like/favorite
- **Pull to refresh**: Refresh content

### Accessibility
- Minimum touch targets: 48x48px
- Color contrast ratios for text
- Screen reader labels
- Reduced motion support

---

*Document maintained by ShortDrama team. Update as designs evolve.*
