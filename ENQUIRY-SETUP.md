# Enquiry form — one step to finish setup

The contact form works right now: **Send on WhatsApp** is fully live, and
**Send enquiry** opens the visitor's mail app with the message written out.

To make **Send enquiry** deliver straight to `reshagrantha@gmail.com` — so it
arrives even if the visitor has no mail app set up — one value needs filling in.
It takes about a minute and needs no account or password.

## 1. Get the access key

1. Go to **https://web3forms.com**
2. Enter **reshagrantha@gmail.com** in the "Create Access Key" box
3. Check that inbox — the key arrives by email. It looks like:
   `a1b2c3d4-e5f6-7890-abcd-ef1234567890`

Free for 250 enquiries a month, which is far more than this site will see.

## 2. Paste it in

Open `assets/js/site.js`, find this line near the enquiry section:

```js
var WEB3FORMS_KEY = 'PASTE-YOUR-ACCESS-KEY-HERE';
```

Replace the placeholder with the key:

```js
var WEB3FORMS_KEY = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
```

## 3. Update the cache-busting hash

The HTML points at `site.js?v=<hash>`. If that hash is not updated, returning
visitors keep the old script for up to 16 days. Either regenerate the pages
with the page generator, or do it by hand:

```bash
node -e "console.log(require('crypto').createHash('md5').update(require('fs').readFileSync('assets/js/site.js')).digest('hex').slice(0,8))"
```

Put that value after `site.js?v=` in all seven HTML files.

## 4. Commit and push

```bash
git add -A && git commit -m "Connect the enquiry form to the inbox" && git push
```

Send yourself a test enquiry from the live site to confirm it arrives. The first
one may land in spam — mark it "not spam" once and later ones will go to the
inbox.

---

## Is the key safe to publish?

Yes. It only ever permits sending mail **to** `reshagrantha@gmail.com`. It
cannot read mail, and it cannot be used to send mail to anyone else. It is
designed to sit in public page source.

## If you would rather not use a third party

Leave the placeholder as it is. The form still works — **Send enquiry** opens
the visitor's own mail app with everything filled in, and WhatsApp is unaffected.
Nothing is broken by skipping this.

## What happens if the service is down

The form falls back to opening the visitor's mail app with the message ready,
and tells them that is what it is doing. An enquiry is never silently lost.
