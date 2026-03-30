/**
 * Zillow Scraper Service
 * Uses puppeteer-extra with stealth plugin to evade detection
 * DEBUG MODE: Saves HTML and screenshots for troubleshooting
 */

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { Page } from 'puppeteer'
import fs from 'fs'
import path from 'path'

puppeteer.use(StealthPlugin())

// Helper function to replace deprecated page.waitForTimeout
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export interface PropertyData {
    url: string
    address: string
    price: string
    description: string
    specs: string
    images: string[]
}

// Debug directory
const DEBUG_DIR = path.join(__dirname, '../../temp/debug')

async function saveDebugInfo(page: Page, label: string) {
    try {
        if (!fs.existsSync(DEBUG_DIR)) {
            fs.mkdirSync(DEBUG_DIR, { recursive: true })
        }

        const timestamp = Date.now()

        // Save HTML
        const html = await page.content()
        const htmlPath = path.join(DEBUG_DIR, `${label}_${timestamp}.html`)
        fs.writeFileSync(htmlPath, html)
        console.log(`[DEBUG] Saved HTML to: ${htmlPath}`)

        // Save Screenshot
        const screenshotPath = path.join(DEBUG_DIR, `${label}_${timestamp}.png`)
        await page.screenshot({ path: screenshotPath, fullPage: true })
        console.log(`[DEBUG] Saved screenshot to: ${screenshotPath}`)

        return { htmlPath, screenshotPath }
    } catch (err) {
        console.error('[DEBUG] Failed to save debug info:', err)
        return null
    }
}

export async function scrapeZillow(url: string): Promise<PropertyData> {
    console.log(`\n========== SCRAPING START ==========`)
    console.log(`URL: ${url}`)
    console.log(`Time: ${new Date().toISOString()}`)

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
            // Removed --single-process for better stability
        ]
    })

    try {
        const page = await browser.newPage()

        // Stealth: Set reliable User-Agent and Viewport
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
        await page.setViewport({ width: 1920, height: 1080 })

        // Go to URL - wait for networkidle for better content loading
        console.log('[INFO] Navigating to page...')
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 })
        console.log('[INFO] Page loaded. Waiting for content...')

        // Wait a bit for dynamic content
        await delay(3000)

        // Scroll to trigger lazy loading
        console.log('[INFO] Scrolling page...')
        await autoScroll(page)

        // Wait after scroll for images to load
        await delay(2000)

        // Save debug info BEFORE extraction
        console.log('[INFO] Saving debug snapshot...')
        await saveDebugInfo(page, 'zillow_scrape')

        // Extract Data
        console.log('[INFO] Extracting data...')
        const data = await page.evaluate(() => {
            const data: any = {
                images: [],
                debug: {
                    jsonLdScripts: 0,
                    foundTypes: [] as string[],
                    imageSelectors: {} as Record<string, number>
                }
            }

            // 1. Try JSON-LD first (Most reliable)
            const scripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
            data.debug.jsonLdScripts = scripts.length

            for (const script of scripts) {
                try {
                    const json = JSON.parse(script.textContent || '{}')
                    const type = json['@type']
                    if (type) data.debug.foundTypes.push(type)

                    if (type === 'SingleFamilyResidence' || type === 'RealEstateListing' || type === 'Product' || type === 'Residence') {
                        data.address = json.name || json.address?.streetAddress
                        data.description = json.description

                        if (json.image) {
                            if (Array.isArray(json.image)) {
                                data.images = json.image
                            } else if (typeof json.image === 'string') {
                                data.images = [json.image]
                            }
                        }

                        // Also try photos array
                        if (json.photo) {
                            const photos = Array.isArray(json.photo) ? json.photo : [json.photo]
                            photos.forEach((p: any) => {
                                if (p.contentUrl) data.images.push(p.contentUrl)
                                else if (typeof p === 'string') data.images.push(p)
                            })
                        }

                        if (json.offers && json.offers.price) {
                            data.price = '$' + json.offers.price
                        }
                    }
                } catch (e) { }
            }

            // 2. Fallback to DOM Scraping
            if (!data.price) {
                // Multiple selectors for price
                const priceSelectors = ['[data-testid="price"]', '.ds-summary-row span', '.home-details-price', '.price', '.ds-price']
                for (const sel of priceSelectors) {
                    const el = document.querySelector(sel)
                    if (el && el.textContent) {
                        data.price = el.textContent.trim()
                        break
                    }
                }
            }

            if (!data.address) {
                const h1 = document.querySelector('h1')
                if (h1) data.address = h1.textContent
            }

            if (!data.specs) {
                const specsInfo = Array.from(document.querySelectorAll('ul[data-testid="bed-bath-beyond"] li, .ds-bed-bath-living-area span'))
                    .map((li: any) => li.textContent)
                    .filter(t => t)
                    .join(' | ')
                data.specs = specsInfo
            }

            if (!data.description) {
                const descSelectors = ['div[data-testid="description"]', '.ds-overview-section', '.home-description']
                for (const sel of descSelectors) {
                    const el = document.querySelector(sel)
                    if (el && el.textContent) {
                        data.description = el.textContent.trim()
                        break
                    }
                }
            }

            // 3. Multiple Image Selectors (aggressive fallback)
            const imageSelectors = [
                'ul[data-testid="media-stream"] li img',
                '[data-testid="media-stream"] img',
                '.media-stream img',
                '.photo-tile img',
                '.hdp-home-image img',
                '.ds-media-col img',
                'picture img',
                '[data-testid="hero-image"] img',
                '.carousel img',
                'img[src*="zillowstatic.com"]'
            ]

            for (const selector of imageSelectors) {
                const imgs = Array.from(document.querySelectorAll(selector))
                data.debug.imageSelectors[selector] = imgs.length

                if (data.images.length === 0 && imgs.length > 0) {
                    data.images = imgs
                        .map((img: any) => img.src || img.getAttribute('data-src'))
                        .filter((src: string) => src && src.startsWith('http'))
                }
            }

            // Upgrade to high-res
            data.images = data.images.map((src: string) => {
                if (!src) return src
                return src.replace('p_c.jpg', 'p_f.jpg').replace('p_e.jpg', 'p_f.jpg')
            })

            return data
        })

        // Log debug info
        console.log('\n[DEBUG] Extraction Results:')
        console.log(`  - JSON-LD Scripts Found: ${data.debug?.jsonLdScripts || 0}`)
        console.log(`  - JSON-LD Types: ${data.debug?.foundTypes?.join(', ') || 'none'}`)
        console.log(`  - Image Selector Counts:`)
        if (data.debug?.imageSelectors) {
            Object.entries(data.debug.imageSelectors).forEach(([sel, count]) => {
                console.log(`      ${sel}: ${count}`)
            })
        }
        console.log(`  - Address: ${data.address || 'NOT FOUND'}`)
        console.log(`  - Price: ${data.price || 'NOT FOUND'}`)
        console.log(`  - Specs: ${data.specs || 'NOT FOUND'}`)
        console.log(`  - Description: ${data.description ? data.description.substring(0, 100) + '...' : 'NOT FOUND'}`)
        console.log(`  - Images Found: ${data.images.length}`)
        if (data.images.length > 0) {
            console.log(`  - First Image: ${data.images[0]}`)
        }

        // Remove debug from returned data
        delete data.debug

        // cleanup
        data.url = url
        data.images = data.images.slice(0, 10)

        console.log(`\n========== SCRAPING END ==========\n`)
        return data as PropertyData

    } catch (error) {
        console.error('[ERROR] Scraping failed:', error)
        throw error
    } finally {
        await browser.close()
    }
}

async function autoScroll(page: Page) {
    await page.evaluate(async () => {
        await new Promise<void>((resolve) => {
            let totalHeight = 0
            const distance = 100
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight
                window.scrollBy(0, distance)
                totalHeight += distance

                if (totalHeight >= scrollHeight - window.innerHeight || totalHeight > 5000) {
                    clearInterval(timer)
                    resolve()
                }
            }, 100)
        })
    })
}
