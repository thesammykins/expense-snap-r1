# QR Code for R1 Device

## GitHub Pages URL
**https://thesammykins.github.io/expense-snap-r1/**

## Deployment Status
✅ **Live and ready!**

The app is now deployed and accessible via GitHub Pages. It may take 1-2 minutes for the initial deployment to complete.

## How to Add to R1 Device

### Option 1: Use Built-in QR Generator (Easiest!)
**🎯 Direct Link: https://thesammykins.github.io/expense-snap-r1/generate-qr.html**

1. Open the link above in any browser
2. Click "🎨 Generate QR Code"
3. Scan the QR code with your R1 device
4. Done! The app will load on your R1

### Option 2: Use Rabbit's QR Generator
1. Visit: https://www.rabbit.tech/qr or use the QR generator from the creations-sdk/qr folder
2. Enter the GitHub Pages URL: `https://thesammykins.github.io/expense-snap-r1/`
3. Add a title: "Expense Snap"
4. Add description: "Track expenses with camera scanning and AI insights"
5. Generate the QR code
6. Scan with your R1 device

### Option 3: Direct QR Code Generation
You can use any QR code generator with this URL:
```
https://thesammykins.github.io/expense-snap-r1/
```

Popular QR generators:
- https://www.qr-code-generator.com/
- https://qr.io/
- https://www.the-qrcode-generator.com/

### Option 3: Command Line (if you have qrencode installed)
```bash
qrencode -o expense-snap-qr.png "https://thesammykins.github.io/expense-snap-r1/"
```

## Metadata for R1 Creation

**Title:** Expense Snap
**Description:** Production-ready expense tracking with camera receipt scanning, LLM insights, and rabbithole sync
**URL:** https://thesammykins.github.io/expense-snap-r1/
**Icon:** 💰 or 📷
**Category:** Productivity / Finance

## Testing the Deployment

Before scanning on R1, test in a browser:
1. Open: https://thesammykins.github.io/expense-snap-r1/
2. You should see the "Expense Snap" loading screen
3. The app will load the home screen with menu options
4. Camera and hardware features won't work in browser, but UI should be visible

**Note:** The app is optimized for the R1's 240x282px screen, so it will appear small in a desktop browser.

## Repository Information

**GitHub Repo:** https://github.com/thesammykins/expense-snap-r1
**Main Branch:** main
**Pages Source:** / (root)

## Updating the App

To make changes and redeploy:
```bash
# Make your changes
git add .
git commit -m "Update: description of changes"
git push origin main

# GitHub Pages will automatically rebuild (takes 1-2 minutes)
```

## Troubleshooting

**If the page doesn't load:**
1. Wait 2-3 minutes for initial GitHub Pages deployment
2. Check deployment status: `gh api repos/thesammykins/expense-snap-r1/pages`
3. Look for `"status": "built"` (not "building")
4. Clear browser cache and try again
5. Check repository settings → Pages to confirm it's enabled

**If camera doesn't work on R1:**
1. Ensure the R1 browser has camera permissions
2. Check console for error messages (accessible via R1 debug mode)
3. The app falls back gracefully if camera is unavailable

**If LLM extraction fails:**
1. Verify R1's LLM integration is working
2. Check that PluginMessageHandler is available
3. The app will show an error toast and offer retry/manual entry

## Security Note

The app runs entirely on the R1 device. No data is sent to external servers except:
- Camera images → R1's LLM for OCR (if scanning receipts)
- Expense summaries → R1's journal/rabbithole (if sync is enabled)

All expense data is stored locally in the R1's browser storage.

---

**Ready to scan!** 🎉

Generate your QR code with the URL above and scan it with your R1 device to install Expense Snap.
