# Expense Snap - R1 Creation

A production-ready expense tracking app for the Rabbit R1 device, featuring camera receipt scanning, voice entry, and intelligent insights powered by LLM.

## Features

### Core Functionality
- 📷 **Receipt Scanning** - Capture receipts with camera, auto-extract expense data using LLM
- 🎤 **Voice Entry** - Speak expenses naturally, LLM parses into structured data
- 📊 **Smart Insights** - Weekly spending summaries with AI-powered tips
- 📋 **Expense History** - View, edit, and delete past expenses with virtual scrolling
- 💾 **Offline-First** - All data stored locally with optional journal sync

### R1-Specific Features
- **Rabbithole Integration** - Expenses synced to journal for searchability
- **Hardware Navigation** - Optimized for scroll wheel + PTT button
- **Budget Tracking** - Visual progress bars and border color indicators
- **Voice Summaries** - Insights spoken through R1 speaker

## Architecture

### Clean Architecture Pattern
```
expense-snap/
├── js/
│   ├── core/              # Framework abstractions
│   │   ├── AppState.js    # Observable state management
│   │   ├── Router.js      # Navigation with lifecycle hooks
│   │   ├── EventBus.js    # Pub/sub messaging
│   │   └── ErrorBoundary.js # Global error handling
│   ├── services/          # Business logic layer
│   │   ├── StorageService.js   # Indexed storage (supports 1000+ expenses)
│   │   ├── LLMService.js       # Request/response correlation
│   │   ├── JournalService.js   # Offline-first sync queue
│   │   ├── CameraService.js    # Camera capture
│   │   └── ExpenseService.js   # Expense CRUD
│   ├── screens/           # UI presentation layer
│   │   ├── HomeScreen.js
│   │   ├── CameraScreen.js
│   │   ├── ConfirmScreen.js
│   │   ├── HistoryScreen.js
│   │   ├── DetailScreen.js
│   │   └── InsightsScreen.js
│   ├── components/        # Reusable UI
│   │   ├── ProgressBar.js
│   │   ├── VirtualList.js
│   │   └── LoadingSpinner.js
│   └── app.js            # Bootstrap + hardware routing
├── css/
│   └── styles.css        # 240x282px optimized styles
└── index.html            # App shell
```

### Key Design Patterns

**State Management**
- Centralized AppState with Observable pattern
- Reactive updates via pub/sub
- Screen-specific local state cleared on exit

**Data Layer**
- Indexed storage for O(log n) queries
- Base64 encoding for R1 storage API
- 100-item in-memory cache
- Pagination for large datasets

**LLM Integration**
- Promise-based API with correlation IDs
- Request queue to prevent race conditions
- Type-specific validation and parsing

**Journal Sync**
- Offline-first with retry queue
- Exponential backoff (max 5 retries)
- Optional sync (user consent)

## Hardware Controls

### Navigation Model
- **Scroll Wheel** - Navigate options/lists
- **PTT Click** - Confirm/Execute selected option
- **PTT Long-press** - Cancel/Back (universal escape)

### Screen-Specific Controls

**Home Screen**
- Scroll: Highlight menu option
- PTT Click: Navigate to selected screen

**Camera Screen**
- PTT Click: Capture receipt
- PTT Long-press: Cancel and go back

**Confirmation Screen**
- Scroll: Select action (Confirm/Edit/Discard)
- PTT Click: Execute action
- PTT Long-press: Discard and go back

**History Screen**
- Scroll: Navigate expense list
- PTT Click: View expense details
- PTT Long-press: Go back to home

**Insights Screen**
- Scroll: Select action
- PTT Click: Execute (Hear summary/View history/Back)
- PTT Long-press: Go back

## User Flows

### Quick Receipt Scan
1. Open app → Home screen
2. Scroll to "📷 Scan Receipt"
3. PTT click → Camera opens
4. Align receipt
5. PTT click → Captures + processes (2-3 seconds)
6. Review extracted data
7. PTT click → Confirms and saves
8. Auto-syncs to rabbithole

**Total: 4 PTT clicks, ~10 seconds**

### Voice Entry
1. Home → Voice Entry
2. Speak: "Twenty dollars at Starbucks"
3. LLM parses → Confirmation screen
4. PTT click → Saves

### Weekly Review
1. Home → Insights
2. Review spending summary
3. PTT click on "🔊 Hear summary"
4. R1 speaks insights

## Performance Optimizations

- **CSS-only animations** - Hardware accelerated with `transform` and `opacity`
- **Virtual scrolling** - Render only visible items (~7 expenses at a time)
- **Image compression** - JPEG 70% quality, max 240x282px
- **Lazy loading** - Expenses loaded in 50-item batches
- **Indexed queries** - O(log n) instead of O(n) searches
- **Cache layer** - 100-item in-memory cache for recent expenses

## Security Features

- **Secure storage option** - Available for sensitive data
- **Base64 encoding** - All data encoded before storage
- **Journal sync opt-in** - User controls rabbithole integration
- **Local-first** - Data never leaves device unless synced
- **Error logging** - Client-side only, no external reporting

## Development

### Testing in Browser
```bash
# Serve locally (use any HTTP server)
cd expense-snap
python3 -m http.server 8000
# Open http://localhost:8000
```

**Note:** Camera and R1-specific features won't work in browser. The app includes fallbacks and debug logging.

### Deploying to R1
1. Package as R1 Creation
2. Deploy to device
3. Test all hardware controls
4. Verify LLM extraction accuracy
5. Check journal sync in rabbithole

### Debugging
Access debug interface:
```javascript
window.expenseApp.services.storage.queryExpenses()
window.expenseApp.router.navigate('home')
window.expenseApp.appState.get('currentScreen')
```

## Budget Configuration

Default budgets:
- Daily: $200
- Weekly: $1400
- Monthly: $6000

Update via:
```javascript
await expenseService.setBudget({ daily: 250, weekly: 1750, monthly: 7500 })
```

## Categories

Preset categories:
- Food & Dining
- Groceries
- Transportation
- Shopping
- Entertainment
- Health
- Bills & Utilities
- Other

LLM suggests category based on merchant, user can override.

## Data Storage

**Local Storage Keys:**
- `expense_snap_expense_{id}` - Individual expense
- `expense_snap_idx_date_{YYYY-MM-DD}` - Date index
- `expense_snap_idx_category_{category}` - Category index
- `expense_snap_idx_merchant_{merchant}` - Merchant index
- `expense_snap_all_expense_ids` - Master ID list
- `expense_snap_budget` - Budget settings
- `expense_snap_preferences` - User preferences

## Known Limitations

1. **Camera quality** - R1 hardware camera may struggle with low light or blurry receipts
   - Mitigation: OCR confidence score helps identify poor quality scans
2. **OCR accuracy** - Tesseract.js accuracy depends on receipt quality and lighting
   - Mitigation: Cleaned text + LLM parsing improves results; manual editing available
3. **OCR performance** - ~2-5 seconds per receipt on mobile hardware
   - Mitigation: Worker initialized at startup and reused
4. **Storage limit** - Browser storage quota (~5-10MB); app handles ~1000-2000 expenses
5. **No cloud backup** - Data only in local storage + optional journal sync
6. **Voice entry browser-dependent** - Requires browser SpeechRecognition API (WebKit/Chrome); may not work in all environments

## Production Status

### ✅ Implemented Features
- [x] Receipt scanning with camera
- [x] **OCR text extraction with Tesseract.js**
- [x] LLM-powered expense extraction (from OCR text)
- [x] Voice entry with Web Speech API
- [x] Expense history with virtual scrolling
- [x] Budget tracking with visual indicators
- [x] Insights generation
- [x] Rabbithole journal sync
- [x] Onboarding flow
- [x] Comprehensive error handling
- [x] Storage persistence (R1 + browser)

### 🚧 Known Issues & Workarounds
- **Onboarding restarts**: Fixed with storage verification and logging
- **Receipt scanning flow**: Now uses Tesseract.js OCR → extracts text → sends to LLM for parsing
  - More reliable than direct image analysis
  - Smaller payload to LLM (text vs. image)
  - Fallback to image-based extraction if OCR fails
- **Voice transcription**: Implemented with Web Speech API; requires microphone permissions

### 📸 OCR Implementation Details

**Receipt Scanning Pipeline:**
1. Camera captures receipt image (240x282px)
2. **Tesseract.js** extracts text via WebAssembly OCR (~2-5 seconds)
3. Text cleaned and normalized
4. LLM parses structured expense data from OCR text
5. User confirms/edits in confirmation screen

**Why OCR + LLM?**
- ✅ More reliable than image-only LLM (R1 LLM may not support images)
- ✅ Faster parsing (text is smaller than images)
- ✅ Works offline (Tesseract.js runs in browser)
- ✅ Graceful fallback if OCR fails

**Performance:**
- OCR initialization: ~1-2 seconds (at app startup)
- Per-receipt OCR: ~2-5 seconds on mobile hardware
- LLM parsing: ~1-3 seconds
- **Total**: ~5-10 seconds per receipt

## Future Enhancements

- [ ] Manual entry mode with scroll wheel number input
- [ ] Export to CSV
- [ ] Multi-currency support
- [ ] Receipt image storage in secure storage
- [ ] Spending analytics charts
- [ ] Custom category creation
- [ ] Budget alerts
- [ ] External transcription service integration (Whisper API, Google Speech-to-Text)

## License

MIT License - See LICENSE file

## Credits

Built with the R1 Creations SDK for Rabbit R1 devices.

**Version:** 1.0.0
**Last Updated:** October 2025
