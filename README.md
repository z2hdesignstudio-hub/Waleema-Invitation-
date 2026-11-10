# Waleema Ceremony invitation

Marshad & Aaysha and Sulaiman & Hajar · Wednesday, 23rd December 2026 · Amaya Green Hotel, Yakkala · 12:30 hrs onwards

A static website: it needs no server, only GitHub Pages. Do the two parts below in order.

## What is in this folder

| Path | What it is |
|---|---|
| `index.html` | The invitation page |
| `config.js` | **The one file you edit:** RSVP link, event time, help phone number |
| `css/style.css`, `js/main.js` | Design and animation |
| `assets/audio/assubhu-bada.mp3` | Background song (compressed to 4 MB; the original was 14 MB) |
| `assets/fonts/` | Fonts, stored here so the page never depends on Google Fonts |
| `assets/img/sprig.svg` | The floral artwork |
| `setup/Code.gs` | The Google Sheet script (not needed on the website itself) |

---

## 1. Connect the RSVP form to a Google Sheet (about 5 minutes)

You do this once, signed in as the Google account that should own the guest list.

1. Go to [sheets.google.com](https://sheets.google.com) and create a blank sheet. Name it **Waleema RSVPs**.
2. Open **Extensions > Apps Script**. Delete the sample code, paste in everything from `setup/Code.gs`, and click **Save**.
3. In the toolbar's function dropdown pick **setup** and click **Run**. Google asks for permission. Choose your account, then **Advanced > Go to project (unsafe) > Allow**. (The warning appears because it is your own new script, not because anything is wrong.)
   Your sheet now has two tabs: **RSVPs** (one row per response) and **Summary** (live totals).
4. Click **Deploy > New deployment**. Click the gear icon, choose **Web app**, then set:
   - Execute as: **Me**
   - Who has access: **Anyone**
   
   Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.
5. Open `config.js` and paste the URL between the quotes:
   ```js
   rsvpEndpoint: "https://script.google.com/macros/s/XXXXXXXX/exec",
   ```
6. Test it: open the invitation, fill the form, and check that a row appears in the **RSVPs** tab. Delete the test row afterwards.

What gets saved: time received (Sri Lanka time), full name, phone/WhatsApp, Yes or No, number of guests (0 for No), and message.

**If you change `Code.gs` later:** Deploy > Manage deployments > pencil icon > Version: **New version** > Deploy. The URL stays the same.

---

## 2. Publish on GitHub Pages

1. On [github.com](https://github.com), click **New repository**. Name it, for example, `waleema`. Keep it **Public**.
2. Click **uploading an existing file**. Drag in **everything inside this folder** (so that `index.html` sits at the top level of the repository, with `css`, `js`, `assets` and `config.js` beside it). Click **Commit changes**.
   The `.nojekyll` file is hidden on some systems. If it did not upload, that is fine.
3. Go to **Settings > Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch **main**, folder **/ (root)**, then **Save**.
4. After a minute or two the site is live at `https://YOUR-USERNAME.github.io/waleema/`. Share that link.

To change anything later (for example, after adding the RSVP link), edit the file on GitHub or upload it again. Pages updates in about a minute.

---

## Notes

- **Music:** browsers only allow sound after a tap, so the song starts when a guest taps the seal on the curtain. A button at the bottom right pauses it. The song is a commercially released track; GitHub can remove public repositories that host copyrighted audio. If that ever happens, replace `assets/audio/assubhu-bada.mp3` with another file of the same name.
- **Map:** the embedded map and the "Open in Google Maps" button use the location link you supplied.
- **Changing details:** the date, venue, and family names are in `index.html`. The countdown time is in `config.js`.
- **Guest numbers:** the form allows up to 10 guests per response.
