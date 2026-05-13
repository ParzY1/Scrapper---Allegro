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
    let cookies: any[] = [];
    if (fs.existsSync("cookies.json")) {
      cookies = JSON.parse(fs.readFileSync("cookies.json", "utf-8"));
      await page.context().addCookies(cookies);
      console.log("✓ Loaded existing cookies");
    } else {
      console.log("\n📱 Opening login page...");
      await page.goto("https://allegro.pl/", { waitUntil: "domcontentloaded" });
      console.log("⏳ Waiting for manual login... Press ENTER in terminal when done:");
      await page.pause();

      const newCookies = await page.context().cookies();
      fs.writeFileSync("cookies.json", JSON.stringify(newCookies, null, 2));
      console.log("✓ Cookies saved!");
    }

    for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
      const url = `https://allegro.pl/listing?string=${encodeURIComponent(query)}&p=${pageNum}`;
      console.log(`\n📄 Scraping page ${pageNum}: ${url}`);

      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});

      await page.waitForTimeout(3000);

      const products = await page.evaluate(() => {
        const result: { title: string; price: string; url: string; id: string }[] = [];

        const scripts = document.querySelectorAll('script[type="application/json"]');
        let listingData: any = null;

        for (const script of scripts) {
          try {
            const text = script.textContent || "";
            if (text.includes("__listing_StoreState")) {
              const parsed = JSON.parse(text);
              listingData = parsed.__listing_StoreState;
              break;
            }
          } catch {
            continue;
          }
        }

        if (!listingData || !listingData.items || !listingData.items.elements) {
          return result;
        }

        for (const item of listingData.items.elements) {
          const title = item.title?.text || item.alt || "";
          const amount = item.price?.mainPrice?.amount;
          const currency = item.price?.mainPrice?.currency || "zł";
          const price = amount ? `${parseFloat(amount).toFixed(2).replace(".", ",")} ${currency}` : "";
          const url = item.url || "";
          const id = item.offerId || item.id || "";

          if (title && price) {
            result.push({ title, price, url, id });
          }
        }

        return result;
      });

      allProducts.push(...products);
      console.log(`✓ Found ${products.length} products on page ${pageNum}`);

      if (products.length === 0) {
        break;
      }
    }

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
