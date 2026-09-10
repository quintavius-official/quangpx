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

async function launchBrowserWithCdp(options) {
  const dataDir = path.resolve(options.profileDir);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Ensure Profile 5 and Local State exist in target directory
  const targetProfileDir = path.join(dataDir, options.profileName);
  const sourceProfileDir = path.join(SOURCE_CHROME_DIR, options.profileName);
  const sourceLocalState = path.join(SOURCE_CHROME_DIR, 'Local State');

  if (!fs.existsSync(targetProfileDir) && fs.existsSync(sourceProfileDir)) {
    console.log(`[*] Initializing automation data directory from ${options.profileName}...`);
    try {
      if (fs.existsSync(sourceLocalState)) {
        fs.copyFileSync(sourceLocalState, path.join(dataDir, 'Local State'));
      }
      execSync(`cp -R "${sourceProfileDir}" "${targetProfileDir}"`);
      console.log(`[+] Initialized ${options.profileName} successfully.`);
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

  const launchCmd = `open -na "Google Chrome" --args --remote-debugging-port=${options.cdpPort} --user-data-dir="${dataDir}" --profile-directory="${options.profileName}" --no-first-run --no-default-browser-check`;
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

    // 4. Find file input and upload all slides
    const fileInput = await page.$('input[type="file"]');
    if (!fileInput) {
      throw new Error('Could not find file input element on TikTok Studio upload page.');
    }

    console.log(`[*] Uploading ${options.slides.length} slides...`);
    const absoluteSlides = options.slides.map((s) => path.resolve(s));
    await fileInput.uploadFile(...absoluteSlides);

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
    await sleep(3000);

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
          const currentDateVal = await page.evaluate(el => el.value, dateInput);
          if (currentDateVal && currentDateVal.trim() !== options.scheduleDate.trim()) {
            await dateInput.click();
            await sleep(800);

            const targetDay = parseInt(options.scheduleDate.split('-')[2], 10).toString();
            await page.evaluate((day) => {
              const elements = Array.from(document.querySelectorAll('span, div, button, td'));
              const target = elements.find(el => {
                const txt = el.innerText ? el.innerText.trim() : '';
                return txt === day && !el.classList.contains('disabled') && !el.getAttribute('disabled');
              });
              if (target) target.click();
            }, targetDay);

            await sleep(500);
            await page.evaluate(() => {
              document.querySelector('.titleInput-JiU8Rn')?.click();
            });
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

        const timeSelected = await page.evaluate((h, m) => {
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
        }, targetHour.padStart(2, '0'), targetMin.padStart(2, '0'));

        if (!timeSelected) {
          console.log(`[-] Warning: Could not find exact time option for ${options.scheduleTime}`);
        }

        await sleep(500);
        // Click title input to dismiss timepicker
        await page.evaluate(() => {
          document.querySelector('.titleInput-JiU8Rn')?.click();
        });
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
      const schedBtn = await page.evaluate(() => {
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

      if (!schedBtn) {
        throw new Error('Could not find enabled "Schedule" button.');
      }

      console.log('[*] Waiting for schedule confirmation...');
      await sleep(5000);
      console.log(`\n[+] Success! Your photo carousel has been SCHEDULED for ${options.scheduleTime}.`);
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
