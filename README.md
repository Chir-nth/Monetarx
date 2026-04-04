# Monetrax — Track Smarter. Live Better.

Personal finance tracker PWA with smart insights, shopping cart, recurring transactions and multi-account support.

---

## 📁 File structure

```
monetrax/
├── index.html          ← App shell & all HTML screens
├── style.css           ← All styles & theme tokens
├── app.js              ← All application logic
├── sw.js               ← Service worker (offline support)
├── manifest.json       ← PWA manifest
└── icons/
    ├── icon-48.png
    ├── icon-72.png
    ├── icon-96.png
    ├── icon-144.png
    ├── icon-192.png
    ├── icon-512.png
    └── icon-maskable.png
```

---

## 🚀 Hosting on GitHub Pages (recommended)

**Why PWA over a GitHub-only site?**
- Installable directly from the browser — works like a native app on Android & iOS
- Fully offline — service worker caches everything, no internet needed after first load
- No app store, no review process, no fees
- One URL to share — anyone can open it and optionally install it
- Your data stays on-device (localStorage) — no server, no cost, no privacy risk

### Step-by-step

1. **Create a GitHub account** at github.com if you don't have one.

2. **Create a new repository** named `monetrax` (or any name).

3. **Upload all files** — drag and drop the entire `monetrax/` folder contents into the repo, or use Git:
   ```bash
   git init
   git add .
   git commit -m "Initial Monetrax release"
   git remote add origin https://github.com/YOUR_USERNAME/monetrax.git
   git push -u origin main
   ```

4. **Enable GitHub Pages**:
   - Go to your repo → Settings → Pages
   - Source: Deploy from a branch → `main` → `/ (root)`
   - Click Save

5. **Your app is live** at:
   ```
   https://YOUR_USERNAME.github.io/monetrax/
   ```

6. **Install on phone**:
   - Open the URL in Chrome (Android) or Safari (iOS)
   - Android: tap the "Install Monetrax" banner or browser menu → "Add to home screen"
   - iOS: tap Share → "Add to Home Screen"

### Custom domain (optional)
- Buy a domain (e.g. monetrax.app) from Namecheap/Cloudflare
- In repo Settings → Pages → Custom domain, add your domain
- Add a CNAME DNS record pointing to `YOUR_USERNAME.github.io`

---

## 🔧 Local development

No build tools needed. Just open `index.html` in a browser, or serve locally:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Then open `http://localhost:8080`

> Note: The service worker only activates over HTTPS or localhost.

---

## ✨ Features

| Feature | Description |
|---|---|
| Dashboard | Income/expense metrics, savings rate, top category, avg daily spend |
| Add transaction | Tabbed: Income / Expense / Transfer with smart autocomplete |
| History | Search, filter by month, CSV export, delete individual or all |
| Shopping cart | Pre-bill items, budget cap, qty controls, checkout to expenses |
| Recurring | Rent/salary/subscriptions, due-this-month tracker, one-click apply |
| Budget | 50/30/20 rule with visual progress bars |
| Categories | Doughnut chart + breakdown |
| Shopping list | Tick off items, duplicate detection, sections |
| Accounts | Bank/Cash/Savings/Card with per-account balance |
| AI Insights | Month-over-month comparisons, savings alerts, spending patterns |
| Dark mode | Full dark theme, persisted |
| Currency | EUR, USD, GBP, INR, JPY, CHF, SEK, PLN |
| Bar/Line chart | Toggle trend chart type |
| Offline | Service worker caches all assets |
| PWA | Installable on Android & iOS home screen |

---

## 📱 Browser support

| Browser | Install | Offline |
|---|---|---|
| Chrome (Android) | ✅ Banner | ✅ |
| Safari (iOS 16.4+) | ✅ Add to Home | ✅ |
| Chrome (Desktop) | ✅ Address bar | ✅ |
| Firefox | ❌ No install | ✅ |
| Edge | ✅ | ✅ |

---

*Monetrax — Track Smarter. Live Better.*
