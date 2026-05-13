# Allegro Web Scraper

TypeScript-based web scraper for extracting product offers from Allegro.pl using Playwright. Features manual authentication flow, session persistence via cookies, and CSV export.

## Requirements

- Node.js >= 18
- npm

## Installation

```bash
npm install
npx playwright install chromium
```

## Usage

Run the scraper with a search query:

```bash
npx ts-node scraper.ts -q "kostka rubika"
```

### First run (authentication)

1. The script opens a visible Chromium browser window and navigates to the Allegro login page.
2. Log in manually in the browser window -- complete any CAPTCHA or two-factor authentication if prompted.
3. Return to the terminal and press Enter.
4. The session cookies are saved to `cookies.json` for reuse.
5. Scraping proceeds automatically.

### Subsequent runs

If `cookies.json` exists from a previous session, the script loads it and skips the login step, going directly to the search results.

## Output

Results are saved to `wyniki.csv` with the following columns:

- `title` -- product offer title
- `price` -- offer price
- `url` -- full URL to the product listing

## Script overview

| Aspect | Details |
|---|---|
| Query argument | `-q` or `--query` (required), handled via `commander` |
| Browser mode | Visible (`headless: false`) |
| Authentication | Manual login with session saved to `cookies.json` |
| Extraction target | Product grid via `[data-box-name="items"]` |
| Data points | Title (`h2`), price (`[data-role="price"]`), link (`a[href]`) |
| Output format | CSV via `fs.writeFileSync` |
| Error handling | `try-catch-finally` with forced `browser.close()` |
| Types | `ProductOffer` interface: `{ title, price, url }` |

## File structure

```
.
├── scraper.ts         main script
├── package.json       dependencies and scripts
├── tsconfig.json      TypeScript configuration
├── cookies.json       persisted session (auto-generated)
├── wyniki.json        scraped results (auto-generated)
└── README.md          this file
```

## Notes

- The scraper targets Allegro.pl listing pages. If Allegro changes its DOM structure, selectors in the `extractProducts` function may need updating.
- Session cookies expire after some time. When they do, delete `cookies.json` to trigger a fresh login.
- The script sets `locale: "pl-PL"` and a 1280x800 viewport for consistent rendering.
