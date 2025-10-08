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

## How the QR Generator Works

### Implementation Details

The custom QR generator (`generate-qr.html`) uses the **qr-code-styling** library to create branded QR codes.

#### Key Implementation Steps:

1. **Include Required Library**
```html
<script src="https://unpkg.com/qr-code-styling@1.6.0-rc.1/lib/qr-code-styling.js"></script>
```

2. **Create JSON Payload**
The QR code encodes a JSON object with R1 Creation metadata:
```javascript
const appData = {
    title: "Expense Snap",
    url: "https://thesammykins.github.io/expense-snap-r1/",
    description: "Track expenses with camera scanning and AI insights",
    iconUrl: "",
    themeColor: "#00ff00"
};
const qrData = JSON.stringify(appData);
```

3. **Configure QR Code Styling**
```javascript
const qrCodeOptions = {
    width: 320,
    height: 320,
    type: "canvas",
    data: qrData,
    margin: 10,
    qrOptions: {
        typeNumber: 0,
        mode: "Byte",
        errorCorrectionLevel: "M"  // Medium error correction
    },
    dotsOptions: {
        color: "#000000",
        type: "rounded"
    },
    backgroundOptions: {
        color: "#ffffff"
    },
    cornersSquareOptions: {
        color: "#00ff00",  // Green corners for branding
        type: "extra-rounded"
    },
    cornersDotOptions: {
        color: "#00ff00",
        type: "dot"
    }
};
```

4. **Generate and Display**
```javascript
const qrCode = new QRCodeStyling(qrCodeOptions);
qrCode.append(containerElement);
```

#### Download Functionality

The download function adds a branded border and title:

```javascript
downloadQRCode() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Size with padding
    const size = 500;
    const padding = 40;
    canvas.width = size + (padding * 2);
    canvas.height = size + (padding * 2) + 60;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Green border
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 70);

    // Draw QR code
    const qrCanvas = document.querySelector('#qrCode canvas');
    ctx.drawImage(qrCanvas, padding, padding, size, size);

    // Add title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Expense Snap - R1 Creation', canvas.width / 2, canvas.height - 30);

    // Download
    const link = document.createElement('a');
    link.download = 'expense-snap-qr-code.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}
```

### Creating QR Generator for Future Projects

To create a similar QR generator for a new R1 Creation:

1. **Copy the template:**
   ```bash
   cp generate-qr.html new-app-qr.html
   ```

2. **Update the app data:**
   ```javascript
   const appData = {
       title: "Your App Name",
       url: "https://username.github.io/your-app/",
       description: "Your app description",
       iconUrl: "",  // Optional: URL to app icon
       themeColor: "#your-color"  // App brand color
   };
   ```

3. **Customize branding:**
   - Update page title and header
   - Change color scheme in HTML/CSS
   - Modify QR code corner colors in `cornersSquareOptions`
   - Update feature list and installation steps

4. **Deploy:**
   ```bash
   git add new-app-qr.html
   git commit -m "Add QR generator for [App Name]"
   git push origin main
   ```

5. **Access at:**
   `https://username.github.io/your-app/new-app-qr.html`

### QR Code Best Practices for R1

- **Error Correction:** Use "M" (Medium) or "L" (Low) for R1 Creation metadata
- **Size:** 300-400px is optimal for display and scanning
- **Contrast:** Black on white provides best scan reliability
- **Branding:** Use colored corners, not colored dots (reduces scan issues)
- **Data Format:** Always encode as JSON string with R1 metadata structure
- **Testing:** Test scan with actual R1 device, not just QR code readers

### Reference Implementation

See `/Users/samanthamyers/Development/creations-sdk/qr/final/` for the original Rabbit QR generator that this implementation is based on.

**Key Files:**
- `index.html` - Full-featured QR generator with form inputs
- `js/app.js` - Complete implementation with URL parameter support

The Expense Snap generator is a simplified, single-purpose version optimized for quick deployment.

## Security Note

The app runs entirely on the R1 device. No data is sent to external servers except:
- Camera images → R1's LLM for OCR (if scanning receipts)
- Expense summaries → R1's journal/rabbithole (if sync is enabled)

All expense data is stored locally in the R1's browser storage.

---

## Quick Reference

**App URL:** https://thesammykins.github.io/expense-snap-r1/
**QR Generator:** https://thesammykins.github.io/expense-snap-r1/generate-qr.html
**Repository:** https://github.com/thesammykins/expense-snap-r1

**Ready to scan!** 🎉

Generate your QR code with the URL above and scan it with your R1 device to install Expense Snap.
