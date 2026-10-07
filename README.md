# Barcode Generator

Generate QR codes and barcodes in the browser and download them as PNG or SVG.

Live at <https://barcode.cyphera.my.id>.

## Formats

- QR Code (error correction L/M/Q/H, UTF-8 text)
- Code 128, EAN-13, EAN-8, UPC-A, Code 39, ITF-14, Codabar

## How it works

A static page with no build step and no backend: everything is generated client-side,
so the content you encode never leaves the browser.

- `index.html`, `style.css`, `app.js`: the app
- `vendor/`: [JsBarcode](https://github.com/lindell/JsBarcode) 3.11.6 and
  [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) 1.4.4 (both MIT)

Run locally by serving the folder, e.g. `python -m http.server`.

## Deployment

Served by GitHub Pages from the `main` branch, with the custom domain set in `CNAME`.
