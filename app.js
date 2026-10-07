(function () {
  'use strict';

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var HINTS = {
    QR: 'Any text or URL. Longer content makes a denser code.',
    CODE128: 'Any ASCII text.',
    EAN13: '12 digits (the check digit is added) or 13 digits.',
    EAN8: '7 digits (the check digit is added) or 8 digits.',
    UPC: '11 digits (the check digit is added) or 12 digits.',
    CODE39: 'Uppercase A–Z, digits, space and - . $ / + %',
    ITF14: '13 digits (the check digit is added) or 14 digits.',
    codabar: 'Digits and - $ : / . + ; may start and end with A, B, C or D.'
  };

  var SAMPLES = {
    QR: 'https://cyphera.my.id',
    CODE128: 'CYPHERA-2026',
    EAN13: '590123412345',
    EAN8: '9638507',
    UPC: '12345678901',
    CODE39: 'CYPHERA 2026',
    ITF14: '1234567890123',
    codabar: 'A40156B'
  };

  var $ = function (id) { return document.getElementById(id); };
  var el = {
    type: $('type'), value: $('value'), hint: $('hint'),
    fg: $('fg'), bg: $('bg'), fgHex: $('fg-hex'), bgHex: $('bg-hex'),
    transparent: $('transparent'),
    ecc: $('ecc'), margin: $('margin'), marginOut: $('margin-out'),
    bw: $('bw'), bwOut: $('bw-out'), bh: $('bh'), bhOut: $('bh-out'),
    showText: $('show-text'),
    scale: $('scale'), scaleOut: $('scale-out'), px: $('px'),
    preview: $('preview'), error: $('error'),
    dlPng: $('dl-png'), dlSvg: $('dl-svg'), copy: $('copy'),
    themeToggle: $('theme-toggle')
  };

  // Content typed per type is kept, so switching back and forth doesn't lose it.
  var valuesByType = { QR: el.value.value };
  // PNG scale is remembered per mode: a QR module is 1 unit, a 1D bar is already several px wide.
  var scaleByMode = { qr: 8, linear: 2 };
  var currentMode = 'qr';

  // Last successful render: { svg: SVGElement, width, height }
  var current = null;

  if (typeof qrcode !== 'undefined' && qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
  }

  function isQR() { return el.type.value === 'QR'; }

  function background() { return el.transparent.checked ? 'transparent' : el.bg.value; }

  function buildQR(text) {
    var qr = qrcode(0, el.ecc.value);
    qr.addData(text);
    qr.make();

    var n = qr.getModuleCount();
    var margin = Number(el.margin.value);
    var size = n + margin * 2;
    var d = '';
    for (var r = 0; r < n; r++) {
      for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += 'M' + (c + margin) + ' ' + (r + margin) + 'h1v1h-1z';
      }
    }

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    svg.setAttribute('viewBox', '0 0 ' + size + ' ' + size);
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    svg.setAttribute('shape-rendering', 'crispEdges');

    if (!el.transparent.checked) {
      var rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('width', size);
      rect.setAttribute('height', size);
      rect.setAttribute('fill', el.bg.value);
      svg.appendChild(rect);
    }
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', el.fg.value);
    svg.appendChild(path);

    return { svg: svg, width: size, height: size };
  }

  function buildLinear(text) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    var valid = true;
    JsBarcode(svg, text, {
      format: el.type.value,
      width: Number(el.bw.value),
      height: Number(el.bh.value),
      displayValue: el.showText.checked,
      lineColor: el.fg.value,
      background: background(),
      margin: 10,
      fontSize: 18,
      valid: function (ok) { valid = ok; }
    });
    if (!valid) throw new Error('This content is not valid for ' + el.type.options[el.type.selectedIndex].text + '.');

    var w = parseFloat(svg.getAttribute('width'));
    var h = parseFloat(svg.getAttribute('height'));
    if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    return { svg: svg, width: w, height: h };
  }

  function showError(msg) {
    el.error.textContent = msg;
    el.error.hidden = false;
    el.preview.classList.add('is-error');
    setActionsEnabled(false);
  }

  function setActionsEnabled(on) {
    el.dlPng.disabled = el.dlSvg.disabled = el.copy.disabled = !on;
  }

  function updatePx() {
    if (!current) { el.px.textContent = '–'; return; }
    var s = Number(el.scale.value);
    el.px.textContent = Math.round(current.width * s) + ' × ' + Math.round(current.height * s) + ' px';
  }

  function render() {
    var text = el.value.value;
    el.preview.classList.toggle('qr', isQR());

    if (!text) {
      showError('Enter some content to encode.');
      return;
    }

    var result;
    try {
      result = isQR() ? buildQR(text) : buildLinear(text);
    } catch (err) {
      var msg = err && err.message ? err.message : String(err);
      if (/overflow/i.test(msg)) msg = 'Too much content for a QR code. Shorten it or lower the error correction level.';
      showError(msg);
      return;
    }

    current = result;
    el.preview.replaceChildren(result.svg);
    el.preview.classList.remove('is-error');
    el.error.hidden = true;
    setActionsEnabled(true);
    updatePx();
  }

  function syncMode() {
    var mode = isQR() ? 'qr' : 'linear';
    document.querySelectorAll('.opts').forEach(function (box) {
      box.hidden = box.getAttribute('data-for') !== mode;
    });
    if (mode !== currentMode) {
      scaleByMode[currentMode] = Number(el.scale.value);
      el.scale.value = scaleByMode[mode];
      el.scaleOut.textContent = el.scale.value;
      currentMode = mode;
    }
    el.hint.textContent = HINTS[el.type.value] || '';
  }

  function fileBase() {
    return isQR() ? 'qr-code' : 'barcode-' + el.type.value.toLowerCase();
  }

  function serialize(width, height) {
    var clone = current.svg.cloneNode(true);
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
  }

  function pngBlob() {
    var s = Number(el.scale.value);
    var w = Math.round(current.width * s);
    var h = Math.round(current.height * s);
    var url = URL.createObjectURL(new Blob([serialize(w, h)], { type: 'image/svg+xml' }));

    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          blob ? resolve(blob) : reject(new Error('Could not create PNG.'));
        }, 'image/png');
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error('Could not create PNG.'));
      };
      img.src = url;
    });
  }

  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function flash(btn, text) {
    var original = btn.dataset.label || btn.textContent;
    btn.dataset.label = original;
    btn.textContent = text;
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { btn.textContent = original; }, 1500);
  }

  // ---- events ----

  el.type.addEventListener('change', function () {
    var prev = el.type.dataset.prev || 'QR';
    valuesByType[prev] = el.value.value;
    el.type.dataset.prev = el.type.value;
    el.value.value = valuesByType[el.type.value] != null ? valuesByType[el.type.value] : SAMPLES[el.type.value];
    syncMode();
    render();
  });

  el.value.addEventListener('input', render);

  [el.fg, el.bg].forEach(function (input) {
    input.addEventListener('input', function () {
      el.fgHex.textContent = el.fg.value;
      el.bgHex.textContent = el.bg.value;
      render();
    });
  });

  el.transparent.addEventListener('change', function () {
    el.bg.disabled = el.transparent.checked;
    render();
  });

  [[el.margin, el.marginOut], [el.bw, el.bwOut], [el.bh, el.bhOut]].forEach(function (pair) {
    pair[0].addEventListener('input', function () {
      pair[1].textContent = pair[0].value;
      render();
    });
  });

  [el.ecc, el.showText].forEach(function (input) { input.addEventListener('change', render); });

  el.scale.addEventListener('input', function () {
    el.scaleOut.textContent = el.scale.value;
    updatePx();
  });

  el.dlSvg.addEventListener('click', function () {
    if (!current) return;
    download(new Blob([serialize(current.width, current.height)], { type: 'image/svg+xml' }), fileBase() + '.svg');
  });

  el.dlPng.addEventListener('click', function () {
    if (!current) return;
    pngBlob().then(function (blob) { download(blob, fileBase() + '.png'); })
      .catch(function (err) { showError(err.message); });
  });

  if (navigator.clipboard && window.ClipboardItem) {
    el.copy.addEventListener('click', function () {
      if (!current) return;
      navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob() })])
        .then(function () { flash(el.copy, 'Copied'); })
        .catch(function () { flash(el.copy, 'Copy failed'); });
    });
  } else {
    el.copy.hidden = true;
  }

  el.themeToggle.addEventListener('click', function () {
    var root = document.documentElement;
    var dark = root.getAttribute('data-theme')
      ? root.getAttribute('data-theme') === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    var next = dark ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
  });

  syncMode();
  render();
})();
