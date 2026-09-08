# Show up: what Avi does next, exactly

Everything here needs no coding. Do the steps in order; each one says what "done" looks like.
Steps 1 to 7 are this week. Steps 8 to 12 are accounts that take days to approve, so start them now.

## Do this week

### Step 1. Get the code onto whichever computer you are using (5 to 15 minutes)

**If this computer already has the `BodyComp` folder** (the laptop you used before):

```powershell
cd ~\BodyComp
git pull
npm ci
```

**If this is a fresh computer** (no `BodyComp` folder yet):

1. Check what is installed. Open PowerShell and run:

```powershell
git --version
node --version
```

If either says "not recognized", install it and then close and reopen PowerShell:

- Git: https://git-scm.com/download/win (accept every default)
- Node: https://nodejs.org (the **LTS** button; Node 22 or 24 both work)

2. Clone the project into your home folder:

```powershell
cd ~
git clone https://github.com/AviCagan/BodyComp
cd BodyComp
npm ci
```

`cd ~` means your home folder, so this works whatever your username is on that machine. Every later step that
says `cd ~\BodyComp` just means `cd ~\BodyComp`.

3. If any command later complains that "running scripts is disabled on this system", run this once and retry:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Done when: `npm ci` ends with a line like `added 1177 packages` and no red text.

Using two computers is fine. Whichever one you sit down at, run `git pull` in the folder first so it has the
latest code, and `git push` when you finish something (Steps 2 and 5 tell you when).

### Step 2. Create an Expo account and link the project (5 minutes)

1. In a browser go to https://expo.dev/signup and make a free account. Remember the username.
2. Back in PowerShell:

```powershell
npm install -g eas-cli
eas login
```

Type the email and password you just created.

3. Link the app to your account:

```powershell
eas init
```

It asks "Would you like to create a project for @yourname/showup?" Answer `y`.

4. That command edited `app.json`. Save that change so it does not get lost:

```powershell
git add app.json
git commit -m "chore: link EAS project"
git push
```

Done when: `eas whoami` prints your username.

### Step 3. Build the release test APK (5 minutes of typing, then 30 to 90 minutes of waiting)

This is the one Phase 0 check still open. Expo Go cannot catch a crash in the compiled 3D library; only a real build can.

```powershell
eas build --profile preview --platform android
```

If it asks "Generate a new Android Keystore?" answer `y`. It prints a link like `https://expo.dev/accounts/.../builds/...`. Open it and leave it. The free queue is slow. You can close PowerShell; the build runs on Expo's servers.

Done when: the build page shows a green **Finished**.

### Step 4. Install and test the APK on the Pixel (10 minutes)

1. On the Pixel, open the build page (scan the QR code on it from your PC screen, or email yourself the link). Tap **Install**.
2. Android will say it cannot install from this source. Tap **Settings**, turn on **Allow from this source**, go back, tap Install again.
3. Open the app called **Show up**.
4. Map tab: drag to rotate, pinch, tap a muscle, switch Female and Male, tap the Front and Back buttons.
5. Log tab: it should say 739 exercises. Search `OHP` and `RDL`.

Done when: everything on the Map works the same as it did in Expo Go.

If the app crashes or the Map tab is blank: take a screenshot, write down exactly when it happened (on open, on the Map tab, on tap), and send that to me. Do not try to fix it.

### Step 5. Mapping spreadsheet: no longer your job

You asked for the exercise-to-muscle table to be grounded in the research literature rather than reviewed by
hand, so that is now Claude's job (ADR-0023). The spreadsheet stays in `docs/` as a way to spot-check the
result later; you do not need to fill it in. When the evidence pass lands you will get a short list of places
where the literature disagrees with the brief's own example rows, and those are the only decisions that come
back to you.

### Step 6. ~~Decide where the 3D bodies come from~~ DONE: option A

This blocks Phase 1. Two options:

**Option A, free.** I build the female and male bodies from public-domain base meshes. Smooth, stylized, faceless, game-like figures. Nothing to buy or licence. I will send you renders for approval before wiring them in. To choose this, reply **"bodies: A"**.

**Option B, paid, probably prettier.** You buy a matched stylized female and male pair from one artist so they look like they belong together. Where to look: CGTrader, TurboSquid, or the Sketchfab Store. Search phrases: `stylized female male base mesh pair`, `stylized human base mesh male female`. Before buying, check all four:

1. Both sexes are from the same artist, in the same style.
2. The licence allows use inside an app you distribute. On CGTrader and TurboSquid the normal **Royalty Free** licence does. Anything marked **Editorial** does not.
3. The download includes FBX, OBJ or BLEND files.
4. Face detail does not matter; I will make it faceless anyway.

Expect roughly 50 to 200 dollars. To choose this, reply **"bodies: B"** plus the link. Do not buy until I have looked at the link.

### Step 7. ~~Decide on nutrition~~ DONE: yes

Reply **"nutrition: yes"** or **"nutrition: no"**. Yes means two things you should be fine with: the app gets a camera permission for barcode scanning, and food lookups come from Open Food Facts, a free public database whose coverage of US products is decent but not perfect.

## Accounts to start now, because approval is slow

You do not need these for weeks, but each can take days to approve, so start them and forget about them.

### Step 8. Google Play developer account (DEFERRED to the end of the first build, by owner decision)

1. Go to https://play.google.com/console/signup with the Google account you want the app published under.
2. Choose **Personal** unless you have a registered business.
3. Pay the one-time 25 dollar fee and complete identity verification (photo ID). Verification can take several days.
4. Important: Google requires new personal accounts to run a closed test with at least 12 testers for 14 days before an app can go public. Start a list of 12 people (friends, gym buddies) and their Gmail addresses now. Check the exact current rule on the signup page; it has changed before.

Done when: the Play Console shows your account as verified.

### Step 9. Apple Developer account (DEFERRED to the end of the first build, by owner decision)

1. Go to https://developer.apple.com/programs/enroll with an Apple ID that has two-factor authentication on.
2. Enroll as an **Individual**. It costs 99 dollars a year. Approval is usually one to two days.

Done when: you can sign in at https://appstoreconnect.apple.com.

### Step 10. ~~Supabase project~~ DONE (project ShowUp, connector enabled)

Needed before Phase 4 (Ares and the weekly report).

1. Go to https://supabase.com and sign up (free tier is enough).
2. Click **New project**. Name it `showup`. Pick the region closest to you (US East is fine). It asks for a database password: make a strong one and save it in a password manager.
3. Wait until the dashboard says the project is healthy.

Do not send me any keys or passwords. When Phase 4 starts I will tell you exactly which values go where.

Done when: the project exists and shows as healthy.

### Step 11. ~~Anthropic API key~~ DONE (rotated; the new key is in the Supabase project's Edge Function secrets)

Also needed before Phase 4. Ares talks through this. Completed 2026-09-08: the key pasted into chat was deleted, a new one
was created and set as `ANTHROPIC_API_KEY` in Supabase secrets. It was never pasted anywhere again.

1. Go to https://console.anthropic.com and sign up.
2. Open **Billing**, add a payment method, and add a small prepaid balance. 10 dollars is plenty for months of testing.
3. Open **API Keys**, click **Create Key**, name it `showup-server`, and save it in your password manager.

Never paste the key into this chat or into the repository. It will live only on the server side (Supabase secrets), and I will give exact steps for that in Phase 4.

Done when: the key exists and is saved somewhere safe.

### Step 12. ~~Technique video channels~~ DONE: Jeff Nippard for now

Reply with the YouTube channels you trust for exercise technique. The brief suggested Jeff Nippard, Sean Nalewanyj, Renaissance Periodization, Stronger By Science and Jeremy Ethier. Confirm, add or remove. If you have specific videos you love for specific exercises, send the links and the exercise name and they will be hand-picked over search results.

### Step 13. ~~YouTube Data API v3 key~~ DONE (created 2026-09-08, in Supabase Edge Function secrets as `YOUTUBE_API_KEY`)

A free Google Cloud project with the YouTube Data API v3 enabled and a **public data** API key, restricted to that
one API. Saved in the owner's password manager and set in Supabase secrets the same day.

## What to send me

One message with these lines, whenever each is ready:

- `release APK: works` or `release APK: crashed` plus screenshot and description
- `bodies: A` or `bodies: B` plus link
- `nutrition: yes` or `nutrition: no`
- `channels: ...`
- `accounts: Expo done / Supabase done / Anthropic done / YouTube key done` (Play and Apple deferred)

Steps 6 and 7 are the ones that actually block me. As soon as I have those two answers the next session starts Phase 1 (the real bodies and the full Map screen), then Phase 2 (the workout logger with your template layout), then the engine, then intake with Ares.
