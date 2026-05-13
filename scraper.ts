import { chromium } from "playwright";
import * as fs from "fs";
import { program } from "commander";

interface ProductOffer {
  id: string;
  title: string;
  price: string;
  url: string;
}

program
  .option("-q, --query <string>", "Search query")
  .option("-p, --pages <number>", "Number of pages to scrape", "1")
  .parse();

const options = program.opts();
const query = options.query || "kostka rubika";
const maxPages = parseInt(options.pages) || 1;

async function scrapeAllego() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({
    locale: "pl-PL",
    viewport: { width: 1280, height: 800 },
  });

  const allProducts: ProductOffer[] = [];

  try {
    // Sprawdź czy są cookies z poprzedniej sesji
    let cookies: any[] = [];
    if (fs.existsSync("cookies.json")) {
      cookies = JSON.parse(fs.readFileSync("cookies.json", "utf-8"));
      await page.context().addCookies(cookies);
      console.log("✓ Loaded existing cookies");
    } else {
      // Pierwsza sesja - trzeba się zalogować
      console.log("\n📱 Opening login page...");
      await page.goto("https://allegro.pl/", { waitUntil: "domcontentloaded" });
      console.log("⏳ Waiting for manual login... Press ENTER in terminal when done:");
      await page.pause(); // Czeka na Enter w terminalu
      
      // Zapisz cookies
      const newCookies = await page.context().cookies();
      fs.writeFileSync("cookies.json", JSON.stringify(newCookies, null, 2));
      console.log("✓ Cookies saved!");
    }

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const url = `https://allegro.pl/listing?string=${encodeURIComponent(query)}&p=${pageNum}`;
      console.log(`\n📄 Scraping page ${pageNum}: ${url}`);

      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
      
      // Czekaj na renderowanie
      await page.waitForTimeout(2000);

      // Dump HTML do pliku
      const html = await page.content();
      fs.writeFileSync("html_dump.html", html);

      // Parsowanie HTML
      const products = await page.evaluate(() => {
        const items: ProductOffer[] = [];
        
        let rows = document.querySelectorAll("[data-box-name='items'] article");
        
        if (rows.length === 0) {
          rows = document.querySelectorAll("article");
        }
        
        if (rows.length === 0) {
          rows = document.querySelectorAll("[data-role='offer']");
        }

        rows.forEach((row, idx) => {
          const titleEl = row.querySelector("h2, h3, [data-testid='offer-title'], a");
          const priceEl = row.querySelector("[data-role='price'], span, [data-testid]");
          const linkEl = row.querySelector("a[href]");

          if (titleEl && priceEl && linkEl) {
            items.push({
              id: `${Date.now()}-${idx}`,
              title: titleEl.textContent?.trim() || "",
              price: priceEl.textContent?.trim() || "",
              url: linkEl.getAttribute("href") || "",
            });
          }
        });

        return items;
      });

      allProducts.push(...products);
      console.log(`✓ Found ${products.length} products on page ${pageNum}`);

      if (products.length === 0) {
        break;
      }
    }

    // Zapis do JSON
    if (allProducts.length > 0) {
      const jsonOutput = {
        query,
        totalProducts: allProducts.length,
        scrapedAt: new Date().toISOString(),
        products: allProducts,
      };

      fs.writeFileSync("wyniki.json", JSON.stringify(jsonOutput, null, 2));
      console.log(`\n✓ Saved ${allProducts.length} products to wyniki.json`);
    }
  } catch (error) {
    console.error("Error during scraping:", error);
  } finally {
    await browser.close();
  }
}

scrapeAllego();
