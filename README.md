# Options Flow Terminal

A static GitHub Pages dashboard for daily options flow analysis.

## Quick Start

### 1. Create the GitHub repo

```bash
# Create a new repo (e.g. "options-flow") on GitHub
# Then push this folder:
cd options-flow-terminal
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/options-flow.git
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to **Settings → Pages** in your repo
2. Set Source to **Deploy from a branch**
3. Select **main** branch, **/ (root)** folder
4. Click **Save**
5. Your site will be live at `https://YOUR_USERNAME.github.io/options-flow/`

### 3. Optional: Password protection

GitHub Pages doesn't natively support passwords, but you can add a simple client-side gate. Drop this into `index.html` before the existing `<header>`:

```html
<div id="authGate" style="position:fixed;inset:0;z-index:10000;background:#050508;display:flex;align-items:center;justify-content:center;">
  <div style="text-align:center;">
    <p style="color:#6b6b8a;font-family:monospace;margin-bottom:12px;">Enter access code</p>
    <input id="authInput" type="password" style="background:#0b0b14;border:1px solid #16162a;color:#d4d4e8;padding:8px 12px;border-radius:6px;font-family:monospace;font-size:14px;text-align:center;" autofocus>
  </div>
</div>
<script>
document.getElementById('authInput').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.value === 'YOUR_PASSWORD_HERE') {
    document.getElementById('authGate').remove();
  }
});
</script>
```

> Note: This is NOT secure — it's purely a casual gate to deter casual visitors. The data is still publicly accessible via the JSON file. For real security, use a private repo + Cloudflare Access or Vercel with auth.

---

## Daily Update Workflow

The only file you need to edit is **`data/flow.json`**.

### Structure

```
data/flow.json
├── latest_date       ← Set this to today's date
├── dates[]           ← Array of all dates (chronological)
└── tickers{}
    └── TICKER_NAME{}
        └── "YYYY-MM-DD"{}
            ├── spot, trades, calls, puts
            ├── totalPrem, bullPrem, bearPrem, neutPrem
            ├── sweeps, sweepPrem
            ├── bullCallPrem, bearCallPrem, bullPutPrem, bearPutPrem
            ├── avgCallStrike, avgPutStrike
            ├── trend         ← "bullish" | "bearish" | "mixed" | "hedging"
            ├── summary       ← Your analysis text
            └── topTrades[]   ← Array of {type, strike, exp, prem, sent, act}
```

### To add a new day

1. Add the date string to `dates` array
2. Update `latest_date`
3. For each ticker, add a new date key with the data object
4. Commit and push — GitHub Pages auto-deploys

### Example: adding March 6 data

```json
{
  "latest_date": "2026-03-06",
  "dates": ["2026-03-03", "2026-03-05", "2026-03-06"],
  "tickers": {
    "NVDA": {
      "2026-03-06": {
        "spot": 185.00,
        "trades": 400,
        ...
      },
      "2026-03-05": { ... },
      "2026-03-03": { ... }
    }
  }
}
```

### Adding a new ticker

Just add a new key under `tickers`:

```json
"NEW_TICKER": {
  "2026-03-06": {
    "spot": 50.00,
    "trades": 30,
    ...
  }
}
```

### Removing a ticker

Delete its key from `tickers`. Old dates are preserved for historical reference.

---

## File Structure

```
options-flow-terminal/
├── index.html          ← Main page (rarely changes)
├── css/
│   └── terminal.css    ← Styles (rarely changes)
├── js/
│   └── app.js          ← App logic (rarely changes)
├── data/
│   └── flow.json       ← ★ UPDATE THIS DAILY ★
└── README.md
```

## Automating with Claude

You can automate the daily update by:

1. Uploading your daily Excel exports to Claude
2. Asking Claude to analyze them and output the updated `flow.json`
3. Copy-pasting the JSON into `data/flow.json`
4. `git commit -am "Mar 6 data" && git push`

Or with Claude Code CLI:
```bash
# From your repo directory
claude "Here are today's trade files: [paste paths]. Update data/flow.json with today's analysis."
```

---

## Tech Stack

- Pure HTML/CSS/JS — no build step, no dependencies, no React
- Loads data from a single JSON file via fetch
- Works offline once loaded
- Mobile responsive
- GitHub Pages compatible (static files only)

## License

For personal use. Data is for informational purposes only — not financial advice.
