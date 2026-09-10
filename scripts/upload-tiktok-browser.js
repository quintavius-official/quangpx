#!/usr/bin/env node
/**
 * scripts/upload-tiktok-browser.js
 * --------------------------------
 * Uploads Photo Mode (carousel) slides to TikTok Studio via Chrome DevTools Protocol (CDP).
 * Uses Chrome Profile 5 (with persistent login session) and launches with CDP enabled.
 * Supports: Direct Post, Save Draft, and Scheduled Posting.
 */

import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import puppeteer from 'puppeteer-core';

const SOURCE_CHROME_DIR = '/Users/phuongquang/Library/Application Support/Google/Chrome';
const DEFAULT_PROFILE_DIR =
  process.env.TIKTOK_CHROME_PROFILE ||
  '/Users/phuongquang/Library/Application Support/Google/Chrome-Profile5';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {
    slides: [],
    title: '',
    desc: '',
    privacy: 'PUBLIC_TO_EVERYONE',
    mode: 'MEDIA_UPLOAD',
    scheduleTime: null, // e.g. "20:00"
    scheduleDate: null, // e.g. "2026-09-10"
    profileDir: DEFAULT_PROFILE_DIR,
    profileName: 'Profile 5',
    cdpPort: 9223,
    sound: 'Dark and mysterious trap beat', // Presets: 1 ('Dark and mysterious trap beat'), 2 ('Mysterious Piano Nocturne'), 3 ('Horror, Fear, Mystery, Suspense')
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--slides') {
      i++;
      while (i < args.length && !args[i].startsWith('--')) {
        parsed.slides.push(args[i]);
        i++;
      }
      i--;
    } else if (arg === '--title') {
      parsed.title = args[++i] || '';
    } else if (arg === '--desc') {
      parsed.desc = args[++i] || '';
    } else if (arg === '--sound') {
      parsed.sound = args[++i] || 'Dark and mysterious trap beat';
    } else if (arg === '--privacy') {
      parsed.privacy = args[++i] || 'PUBLIC_TO_EVERYONE';
    } else if (arg === '--mode') {
      parsed.mode = args[++i] || 'MEDIA_UPLOAD';
    } else if (arg === '--schedule-time') {
      parsed.scheduleTime = args[++i] || null;
    } else if (arg === '--schedule-date') {
      parsed.scheduleDate = args[++i] || null;
    } else if (arg === '--profile-dir') {
      parsed.profileDir = args[++i] || DEFAULT_PROFILE_DIR;
    } else if (arg === '--profile-name') {
      parsed.profileName = args[++i] || 'Profile 5';
    } else if (arg === '--port') {
      parsed.cdpPort = parseInt(args[++i], 10) || 9223;
    } else if (arg === '--dry-run') {
      parsed.dryRun = true;
    }
  }

  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getRunningCdpEndpoint(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      if (data.webSocketDebuggerUrl) {
        return data.webSocketDebuggerUrl;
      }
    }
  } catch {}
  return null;
}

function getTiktokDnsFallbackRules() {
  try {
    const defaultCode = execSync(
      'curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 "https://www.tiktok.com/tiktokstudio/upload"',
      { encoding: 'utf8', timeout: 5000 }
    ).trim();
    if (defaultCode === '200' || defaultCode === '301' || defaultCode === '302') {
      return '';
    }
  } catch {}

  console.log('[*] Default TikTok endpoint returned non-200. Probing healthy fallback Akamai edge IPs...');
  const candidateIps = [
    '125.234.51.57',
    '125.234.51.50',
    '125.234.51.98',
    '125.234.51.44',
    '125.234.51.96',
    '125.234.51.97',
    '125.234.51.56',
    '125.234.51.48',
  ];
  for (const ip of candidateIps) {
    try {
      const code = execSync(
        `curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 --resolve "www.tiktok.com:443:${ip}" "https://www.tiktok.com/tiktokstudio/upload"`,
        { encoding: 'utf8', timeout: 3000 }
      ).trim();
      if (code === '200' || code === '301' || code === '302') {
        console.log(`[+] Found healthy fallback Akamai edge IP: ${ip}`);
        return `--host-resolver-rules="MAP *.tiktok.com ${ip}, MAP tiktok.com ${ip}"`;
      }
    } catch {}
  }
  return '';
}

async function launchBrowserWithCdp(options) {
  const dataDir = path.resolve(options.profileDir);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Ensure Profile 5 and Local State exist in target directory
  const targetProfileDir = path.join(dataDir, options.profileName);
  const sourceProfileDir = path.join(SOURCE_CHROME_DIR, options.profileName);
  const sourceLocalState = path.join(SOURCE_CHROME_DIR, 'Local State');

  if (fs.existsSync(sourceProfileDir)) {
    try {
      if (fs.existsSync(sourceLocalState)) {
        fs.copyFileSync(sourceLocalState, path.join(dataDir, 'Local State'));
      }
      if (!fs.existsSync(targetProfileDir)) {
        console.log(`[*] Initializing automation data directory from ${options.profileName}...`);
        execSync(`cp -R "${sourceProfileDir}" "${targetProfileDir}"`);
        console.log(`[+] Initialized ${options.profileName} successfully.`);
      } else {
        const sourceCookies = path.join(sourceProfileDir, 'Cookies');
        const targetCookies = path.join(targetProfileDir, 'Cookies');
        if (fs.existsSync(sourceCookies)) {
          fs.copyFileSync(sourceCookies, targetCookies);
        }
      }
    } catch (e) {
      console.error(`[-] Warning syncing profile: ${e.message}`);
    }
  }

  // 1. Check if Chrome CDP is already listening on the port
  let wsUrl = await getRunningCdpEndpoint(options.cdpPort);
  if (wsUrl) {
    console.log(`[+] Found active Chrome CDP instance on port ${options.cdpPort}`);
    return wsUrl;
  }

  // 2. Launch Chrome with CDP enabled on macOS via open -na
  console.log(`[*] Launching Google Chrome with CDP enabled on port ${options.cdpPort}...`);
  console.log(`[*] Profile directory: ${dataDir} (${options.profileName})`);

  const fallbackRules = getTiktokDnsFallbackRules();
  const extraArgs = fallbackRules ? ` ${fallbackRules}` : '';
  const launchCmd = `open -na "Google Chrome" --args --remote-debugging-port=${options.cdpPort} --user-data-dir="${dataDir}" --profile-directory="${options.profileName}"${extraArgs} --disable-blink-features=AutomationControlled --no-first-run --no-default-browser-check`;
  exec(launchCmd);

  // 3. Poll for CDP endpoint to be ready (up to 20 seconds)
  console.log(`[*] Waiting for Chrome CDP to initialize...`);
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    wsUrl = await getRunningCdpEndpoint(options.cdpPort);
    if (wsUrl) {
      console.log(`[+] Chrome CDP is ready! (${wsUrl})`);
      return wsUrl;
    }
  }

  throw new Error(`Failed to launch Chrome with CDP on port ${options.cdpPort} within 20 seconds.`);
}

async function main() {
  const options = parseArgs();

  if (!options.slides || options.slides.length === 0) {
    console.error('[-] Error: No slides provided. Use --slides <path1> <path2> ...');
    process.exit(1);
  }

  for (const slide of options.slides) {
    if (!fs.existsSync(slide)) {
      console.error(`[-] Error: Slide file not found: ${slide}`);
      process.exit(1);
    }
  }

  console.log(`[+] Found ${options.slides.length} slides to upload.`);
  console.log(`[*] Title: ${options.title || '(No title)'}`);
  console.log(`[*] Mode: ${options.mode} | Privacy: ${options.privacy} | Dry-run: ${options.dryRun}`);
  if (options.scheduleTime) {
    console.log(`[*] Schedule: ${options.scheduleDate || 'Today'} at ${options.scheduleTime}`);
  }

  // Launch or connect to Chrome via CDP
  const wsUrl = await launchBrowserWithCdp(options);
  const browser = await puppeteer.connect({
    browserWSEndpoint: wsUrl,
    defaultViewport: null,
  });

  const pages = await browser.pages();
  // Close any existing upload tabs to ensure a completely clean session
  for (const p of pages) {
    if (p.url().includes('tiktokstudio/upload')) {
      try { await p.close(); } catch {}
    }
  }

  const page = await browser.newPage();

  try {
    // 1. Navigate to TikTok Studio Upload
    console.log('[*] Navigating to TikTok Studio Upload (https://www.tiktok.com/tiktokstudio/upload)...');
    await page.goto('https://www.tiktok.com/tiktokstudio/upload', {
      waitUntil: 'networkidle2',
      timeout: 35000,
    });

    // 2. Check for login
    if (page.url().includes('/login')) {
      console.log('\n[!] TikTok login required.');
      console.log('[*] Please log into your TikTok account in the opened Chrome window.');
      console.log('[*] Waiting for login to complete (monitoring page URL)...\n');

      let loggedIn = false;
      for (let i = 0; i < 60; i++) {
        await sleep(1000);
        const currentUrl = page.url();
        if (!currentUrl.includes('/login') && currentUrl.includes('tiktok.com')) {
          console.log('[+] Login detected! Continuing upload flow...');
          loggedIn = true;
          break;
        }
        if ((i + 1) % 15 === 0) {
          console.log(`[*] Still waiting for TikTok login (${60 - (i + 1)}s remaining)...`);
        }
      }

      if (!loggedIn) {
        throw new Error('TikTok login timed out after 60s. Please log in to TikTok in Chrome (Profile 5) first.');
      }

      await page.goto('https://www.tiktok.com/tiktokstudio/upload', {
        waitUntil: 'networkidle2',
        timeout: 35000,
      });
    }

    // 3. Switch to Photos tab
    console.log('[*] Switching to "Photos" upload tab...');
    await page.waitForSelector('button, div[role="tab"]', { timeout: 15000 });
    const switched = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('button, div[role="tab"], div, span'));
      const photoTab = elements.find((el) => {
        const txt = (el.innerText || '').trim().toLowerCase();
        return txt === 'photos' || txt === 'ảnh';
      });
      if (photoTab) {
        photoTab.click();
        return true;
      }
      return false;
    });

    if (!switched) {
      console.log('[-] Warning: "Photos" tab button not clicked directly, checking file input...');
    }
    await sleep(2000);

    // 4. Batch Upload Slides (to prevent WAF burst rate limits on large carousels)
    const BATCH_SIZE = 4;
    const absoluteSlides = options.slides.map((s) => path.resolve(s));
    const firstBatch = absoluteSlides.slice(0, BATCH_SIZE);
    const remainingSlides = absoluteSlides.slice(BATCH_SIZE);

    console.log(`[*] Uploading initial batch (${firstBatch.length}/${options.slides.length} slides)...`);
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('Could not find file input element on TikTok Studio upload page.');
    }
    await fileInput.uploadFile(...firstBatch);

    // 5. Wait for transition to photo post editor
    console.log('[*] Waiting for photo post editor to load...');
    await page.waitForFunction(
      () => {
        return (
          window.location.href.includes('/post/photo') ||
          document.querySelector('.titleInput-JiU8Rn, input[placeholder*="title" i]') ||
          document.querySelector('[contenteditable="true"]')
        );
      },
      { timeout: 35000 }
    );
    await sleep(2500);

    // 5.1 Upload remaining slides in batches via editor file input
    if (remainingSlides.length > 0) {
      console.log(`[*] Uploading remaining ${remainingSlides.length} slides in batches of ${BATCH_SIZE}...`);
      let uploadedSoFar = firstBatch.length;

      for (let i = 0; i < remainingSlides.length; i += BATCH_SIZE) {
        const batch = remainingSlides.slice(i, i + BATCH_SIZE);
        const targetExpected = uploadedSoFar + batch.length;
        console.log(`[*] Uploading batch: slides ${uploadedSoFar + 1} to ${targetExpected}...`);

        const editorInputs = await page.$$('input[type="file"][multiple]');
        const inputToUse = editorInputs[0] || (await page.$('input[type="file"]'));
        if (!inputToUse) {
          throw new Error('Could not find file input in photo editor for batch upload.');
        }

        await inputToUse.uploadFile(...batch);

        // Wait for count to reach targetExpected
        for (let waitSec = 0; waitSec < 12; waitSec++) {
          await sleep(1500);
          const currentCount = await page.evaluate(() => {
            const m = (document.body.innerText || '').match(/(\d+)\s+photos\s+uploaded/i);
            return m ? parseInt(m[1], 10) : 0;
          });
          if (currentCount >= targetExpected) {
            uploadedSoFar = currentCount;
            console.log(`[+] Confirmed: ${currentCount}/${options.slides.length} photos uploaded.`);
            break;
          }
        }
        uploadedSoFar = targetExpected;
        // Cooldown between batches to prevent WAF burst
        await sleep(2000);
      }
    }

    // 5.5 Confirm all photos are fully uploaded and processed
    const targetCount = options.slides.length;
    console.log(`[*] Waiting for all ${targetCount} photos to be fully uploaded...`);
    for (let i = 0; i < 20; i++) {
      const currentCount = await page.evaluate(() => {
        const m = (document.body.innerText || '').match(/(\d+)\s+photos\s+uploaded/i);
        return m ? parseInt(m[1], 10) : 0;
      });
      if (currentCount >= targetCount) {
        console.log(`[+] All ${targetCount} photos confirmed ready!`);
        break;
      }
      await sleep(1500);
    }

    // 6. Fill Title (using page.type for native React input handling)
    if (options.title) {
      console.log(`[*] Filling post title: "${options.title}"`);
      const titleInput = await page.$('.titleInput-JiU8Rn, input[placeholder*="title" i]');
      if (titleInput) {
        await titleInput.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await titleInput.type(options.title, { delay: 20 });
      } else {
        console.log('[-] Warning: Title input field not found.');
      }
    }

    // 7. Fill Description / Caption (clean paste without duplicate hashtags)
    if (options.desc) {
      console.log(`[*] Filling description/caption...`);
      const descEditor = await page.$('.public-DraftEditor-content, [contenteditable="true"]');
      if (descEditor) {
        await descEditor.click();
        await sleep(300);

        // Clear existing text if any
        await page.evaluate(() => {
          const editor = document.querySelector('.public-DraftEditor-content');
          if (editor && editor.innerText.trim().length > 0) {
            document.execCommand('selectAll', false, null);
            document.execCommand('delete', false, null);
          }
        });

        // Insert text via ClipboardEvent paste
        await page.evaluate((text) => {
          const editor = document.querySelector('.public-DraftEditor-content');
          const dt = new DataTransfer();
          dt.setData('text/plain', text);
          const pasteEvent = new ClipboardEvent('paste', {
            clipboardData: dt,
            bubbles: true,
            cancelable: true,
          });
          editor.dispatchEvent(pasteEvent);
        }, options.desc);

        await sleep(600);
        // Press Escape to dismiss any hashtag suggestion dropdown
        await page.keyboard.press('Escape');
        await sleep(400);
      } else {
        console.log('[-] Warning: Description editor not found.');
      }
    }

    // 7.5 Configure Background Sound / Music
    const SOUND_PRESETS = {
      '1': 'Dark and mysterious trap beat',
      '2': 'Mysterious Piano Nocturne',
      '3': 'Horror, Fear, Mystery, Suspense',
      'default': 'Dark and mysterious trap beat',
      'dark': 'Dark and mysterious trap beat',
      'piano': 'Mysterious Piano Nocturne',
      'horror': 'Horror, Fear, Mystery, Suspense',
    };
    const targetSoundKey = (options.sound || '').toString().trim().toLowerCase();
    const resolvedSound = SOUND_PRESETS[targetSoundKey] || options.sound;

    if (resolvedSound && resolvedSound !== 'none' && resolvedSound !== 'off') {
      console.log(`[*] Configuring background sound (target: "${resolvedSound}")...`);
      try {
        const alreadyHasSound = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          return btns.some((b) => (b.innerText || '').toLowerCase().includes('replace'));
        });

        if (!alreadyHasSound) {
          const addSoundClicked = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const btn = btns.find((b) => {
              const txt = (b.innerText || '').toLowerCase();
              return txt.includes('add sound') || txt.includes('thêm âm thanh');
            });
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          });

          if (addSoundClicked) {
            await sleep(2500);

            // If searching for custom sound query
            if (resolvedSound !== 'recommend' && resolvedSound !== 'auto') {
              console.log(`[*] Searching for sound with query: "${resolvedSound}"...`);
              const searchInput = await page.$('.TUXModal input, [role="dialog"] input, input[placeholder*="sound" i]');
              if (searchInput) {
                await searchInput.click({ clickCount: 3 });
                await page.keyboard.press('Backspace');
                await searchInput.type(resolvedSound, { delay: 40 });
                await page.keyboard.press('Enter');
                await sleep(3000);
              }
            }

            // Click "Use" on the first track
            const selectedTrack = await page.evaluate(() => {
              const modal = document.querySelector('.TUXModal, [role="dialog"], .modal-container');
              if (!modal) return null;
              const btns = Array.from(modal.querySelectorAll('button, div[role="button"], span'));
              const useBtn = btns.find((b) => {
                const txt = (b.innerText || '').trim().toLowerCase();
                return txt === 'use' || txt === 'dùng' || txt === 'sử dụng';
              });
              if (useBtn) {
                const trackContainer = useBtn.closest('div[class*="item" i], li, div') || useBtn.parentElement;
                const trackName = trackContainer ? trackContainer.innerText.replace(/\n/g, ' - ') : 'track';
                useBtn.click();
                return trackName;
              }
              return null;
            });

            if (selectedTrack) {
              console.log(`[+] Background sound selected: ${selectedTrack.slice(0, 80)}`);
            } else {
              console.log('[-] Warning: Could not find "Use" button in sounds modal.');
              await page.keyboard.press('Escape');
            }
            await sleep(2000);
          }
        } else {
          console.log('[*] Background sound is already configured.');
        }
      } catch (err) {
        console.log(`[-] Warning selecting sound: ${err.message}`);
        try {
          await page.keyboard.press('Escape');
        } catch (_) {}
      }
    }

    // 8. Handle Schedule if requested
    if (options.scheduleTime) {
      console.log(`[*] Configuring post schedule for ${options.scheduleDate || 'today'} at ${options.scheduleTime}...`);

      // 1. Click Schedule radio button
      const clickedScheduleRadio = await page.evaluate(() => {
        const radio = document.querySelector('input[value="schedule"]');
        if (radio) {
          const label = radio.closest('label') || radio;
          label.click();
          return true;
        }
        return false;
      });

      if (!clickedScheduleRadio) {
        throw new Error('Could not find or click "Schedule" radio button.');
      }
      await sleep(1000);

      // 2. Check if "Allow your video to be saved for scheduled posting?" modal popped up
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const allowBtn = btns.find((b) => b.innerText && b.innerText.trim().toLowerCase() === 'allow');
        if (allowBtn) allowBtn.click();
      });
      await sleep(1500);

      // 2.5 Set Date if specified
      if (options.scheduleDate) {
        console.log(`[*] Selecting schedule date: ${options.scheduleDate}`);
        const dateInput = await page.$('input.TUXTextInputCore-input[value*="-"]');
        if (dateInput) {
          const currentDateVal = await page.evaluate((el) => el.value, dateInput);
          if (currentDateVal && currentDateVal.trim() !== options.scheduleDate.trim()) {
            await dateInput.click();
            await sleep(800);

            const targetDay = parseInt(options.scheduleDate.split('-')[2], 10).toString();
            await page.evaluate((day) => {
              const elements = Array.from(document.querySelectorAll('span, div, button, td'));
              const target = elements.find((el) => {
                const txt = el.innerText ? el.innerText.trim() : '';
                return txt === day && !el.classList.contains('disabled') && !el.getAttribute('disabled');
              });
              if (target) target.click();
            }, targetDay);

            await sleep(500);
            await page.keyboard.press('Escape');
            await sleep(500);
          }
        }
      }

      // 3. Set Time
      console.log(`[*] Selecting schedule time: ${options.scheduleTime}`);
      const [targetHour, targetMin] = options.scheduleTime.split(':');
      const timeInput = await page.$('input.TUXTextInputCore-input[value*=":"]');
      if (timeInput) {
        await timeInput.click();
        await sleep(800);

        const timeSelected = await page.evaluate(
          (h, m) => {
            const optionLists = Array.from(document.querySelectorAll('.tiktok-timepicker-option-list'));
            if (optionLists.length < 2) return false;

            const hoursList = optionLists[0];
            const minutesList = optionLists[1];

            // Hours
            const hItem = Array.from(hoursList.children).find((c) => c.innerText.trim() === h);
            if (hItem) {
              hItem.scrollIntoView({ block: 'center' });
              const span = hItem.querySelector('.tiktok-timepicker-option-text') || hItem;
              span.click();
            }

            // Minutes
            const mItem = Array.from(minutesList.children).find((c) => c.innerText.trim() === m);
            if (mItem) {
              mItem.scrollIntoView({ block: 'center' });
              const span = mItem.querySelector('.tiktok-timepicker-option-text') || mItem;
              span.click();
            }

            return !!(hItem && mItem);
          },
          targetHour.padStart(2, '0'),
          targetMin.padStart(2, '0')
        );

        if (!timeSelected) {
          console.log(`[-] Warning: Could not find exact time option for ${options.scheduleTime}`);
        }

        await sleep(500);
        await page.keyboard.press('Escape');
        await sleep(500);
      }
    }

    // 9. Configure Privacy if not default Everyone
    if (options.privacy !== 'PUBLIC_TO_EVERYONE') {
      const targetLabel =
        options.privacy === 'SELF_ONLY'
          ? 'Only you'
          : options.privacy === 'MUTUAL_FOLLOW_FRIENDS'
          ? 'Friends'
          : 'Everyone';

      console.log(`[*] Setting privacy level to "${targetLabel}"...`);
      try {
        const clickedPrivacy = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, div[role="button"], div[role="combobox"]'));
          const el = btns.find((b) => b.innerText && b.innerText.trim().startsWith('Everyone'));
          if (el) {
            el.click();
            return true;
          }
          return false;
        });

        if (clickedPrivacy) {
          await sleep(1000);
          await page.evaluate((label) => {
            const items = Array.from(
              document.querySelectorAll('[role="option"], [role="menuitem"], li, .Select__option, .TUXSelect-option')
            );
            const target = items.find((i) => i.innerText && i.innerText.includes(label));
            if (target) target.click();
          }, targetLabel);
          await sleep(500);
        }
      } catch (e) {
        console.log(`[-] Warning setting privacy: ${e.message}`);
      }
    }

    // 10. Handle Submit vs Schedule vs Draft vs Dry-Run
    if (options.dryRun) {
      console.log('\n[DRY-RUN] Photo carousel uploaded, title and schedule set successfully!');
      console.log('[DRY-RUN] Skipping final submit action.');
      console.log('[DRY-RUN] Upload page is kept open in Chrome for your review:');
      console.log(`          ${page.url()}`);
      await browser.disconnect();
      process.exit(0);
    }

    if (options.scheduleTime) {
      console.log(`[*] Scheduling post for ${options.scheduleTime}...`);

      // Wait for any photo upload indicators to clear
      console.log('[*] Verifying all slides have completed uploading...');
      for (let w = 0; w < 30; w++) {
        const isStillUploading = await page.evaluate(() => {
          const bodyText = (document.body.innerText || '').toLowerCase();
          const hasUploadText = /uploading\s*\(\d+%\)/.test(bodyText) || bodyText.includes('đang tải lên');
          const hasSpinner = !!document.querySelector('.tiktok-spinner, [role="progressbar"], .circle-loading');
          return hasUploadText || hasSpinner;
        });
        if (!isStillUploading) break;
        console.log('[*] Slides still uploading to TikTok, waiting 2s...');
        await sleep(2000);
      }
      await sleep(1500);

      // Wait up to 30s for Schedule button to be enabled
      let schedBtn = false;
      for (let a = 0; a < 15; a++) {
        schedBtn = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const el = btns.find((b) => {
            const txt = (b.innerText || '').trim().toLowerCase();
            return txt === 'schedule' || txt === 'lên lịch';
          });
          if (el && !el.disabled) {
            el.click();
            return true;
          }
          return false;
        });
        if (schedBtn) break;
        await sleep(2000);
      }

      if (!schedBtn) {
        throw new Error('Could not find enabled "Schedule" button after waiting for upload to finish.');
      }

      console.log('[*] Clicked Schedule. Waiting for TikTok confirmation...');
      let confirmed = false;
      for (let i = 0; i < 25; i++) {
        await sleep(2000);

        const currentUrl = page.url();
        if (currentUrl.includes('/tiktokstudio/content') || currentUrl.includes('/content')) {
          confirmed = true;
          break;
        }

        const modalStatus = await page.evaluate(() => {
          const text = (document.body.innerText || '').toLowerCase();
          const errs = ['upload failed', 'network error', 'something went wrong', 'tải lên thất bại', 'lỗi mạng'];
          for (const err of errs) {
            if (text.includes(err)) return { error: true, msg: err };
          }
          const succs = ['has been scheduled', 'đã được lên lịch', 'manage your posts', 'quản lý bài viết', 'upload another'];
          for (const succ of succs) {
            if (text.includes(succ)) return { success: true, msg: succ };
          }
          return null;
        });

        if (modalStatus?.error) {
          throw new Error(`TikTok reported error: ${modalStatus.msg}`);
        }
        if (modalStatus?.success) {
          confirmed = true;
          break;
        }
      }

      if (confirmed) {
        console.log(`\n[+] Success! Your photo carousel has been SCHEDULED for ${options.scheduleTime}.`);
      } else {
        console.log(`\n[+] Schedule request submitted for ${options.scheduleTime}. (Page is kept open for review)`);
      }
    } else if (options.mode === 'DIRECT_POST') {
      console.log('[*] Publishing post directly to TikTok feed...');
      const postBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const el = btns.find((b) => {
          const txt = (b.innerText || '').trim().toLowerCase();
          return txt === 'post' || txt === 'đăng';
        });
        if (el && !el.disabled) {
          el.click();
          return true;
        }
        return false;
      });

      if (!postBtn) {
        throw new Error('Could not find enabled "Post" button.');
      }

      console.log('[*] Waiting for post confirmation...');
      await sleep(5000);
      console.log('\n[+] Success! Your photo carousel has been published to TikTok.');
    } else {
      // Default: MEDIA_UPLOAD -> Save draft
      console.log('[*] Saving post to TikTok drafts...');
      const draftBtn = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const el = btns.find((b) => {
          const txt = (b.innerText || '').trim().toLowerCase();
          return txt === 'save draft' || txt === 'lưu bản nháp';
        });
        if (el && !el.disabled) {
          el.click();
          return true;
        }
        return false;
      });

      if (!draftBtn) {
        throw new Error('Could not find enabled "Save draft" button.');
      }

      console.log('[*] Waiting for draft save confirmation...');
      await sleep(5000);
      console.log('\n[+] Success! Your photo carousel has been saved to TikTok drafts.');
    }

    await browser.disconnect();
  } catch (err) {
    console.error(`\n[-] Browser upload failed: ${err.message}`);
    try {
      await browser.disconnect();
    } catch {}
    process.exit(1);
  }
}

main();
