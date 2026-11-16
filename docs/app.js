const QR_OPTIONS = { width: 512, margin: 2, errorCorrectionLevel: 'M' };
const MAX_SLUG_LENGTH = 40;

const input = document.getElementById('input');
const counter = document.getElementById('counter');
const button = document.getElementById('generate');
const status = document.getElementById('status');

let busy = false;

function getLines() {
  return input.value.split(/\r?\n/);
}

function entries() {
  return getLines()
    .map((text, i) => ({ text: text.trim(), line: i + 1 }))
    .filter((item) => item.text);
}

function fileNameFor(index, text, total) {
  const number = String(index + 1).padStart(String(total).length, '0');
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, '');
  return `${number}-${slug || 'qr'}.png`;
}

function describeQrError(error) {
  const message = error && error.message ? error.message : String(error);
  if (/too big/i.test(message)) return 'the text is too long to fit in a QR code.';
  return message;
}

function refresh() {
  const count = entries().length;
  if (count === 0) {
    counter.textContent = '0 QR codes';
    button.textContent = 'Generate';
  } else if (count === 1) {
    counter.textContent = '1 QR code, saved as a PNG';
    button.textContent = 'Generate PNG';
  } else {
    counter.textContent = `${count} QR codes, saved together as a ZIP`;
    button.textContent = 'Generate ZIP';
  }
  button.disabled = busy || count === 0;
}

function setStatus(kind, message) {
  status.className = kind;
  status.textContent = message;
}

async function pngBytes(text) {
  const dataUrl = await QRCode.toDataURL(text, QR_OPTIONS);
  const response = await fetch(dataUrl);
  return new Uint8Array(await response.arrayBuffer());
}

async function renderAll(items) {
  const images = [];
  for (const item of items) {
    try {
      images.push(await pngBytes(item.text));
    } catch (error) {
      throw new Error(`Line ${item.line}: ${describeQrError(error)}`);
    }
  }
  return images;
}

async function saveFile(bytes, filename, mime, description, extension) {
  const blob = new Blob([bytes], { type: mime });
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{ description, accept: { [mime]: [`.${extension}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { name: handle.name, picked: true };
    } catch (error) {
      if (error && error.name === 'AbortError') return null;
      if (!error || (error.name !== 'SecurityError' && error.name !== 'NotAllowedError')) throw error;
    }
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return { name: filename, picked: false };
}

async function generate() {
  const items = entries();
  if (busy || items.length === 0) return;
  busy = true;
  refresh();
  setStatus('info', 'Generating...');
  try {
    const images = await renderAll(items);
    const single = items.length === 1;
    let bytes;
    let filename;
    let mime;
    let description;
    let extension;
    if (single) {
      bytes = images[0];
      filename = 'qr.png';
      mime = 'image/png';
      description = 'PNG image';
      extension = 'png';
    } else {
      const zip = new JSZip();
      items.forEach((item, i) => zip.file(fileNameFor(i, item.text, items.length), images[i]));
      bytes = await zip.generateAsync({ type: 'uint8array' });
      filename = 'qrcodes.zip';
      mime = 'application/zip';
      description = 'ZIP archive';
      extension = 'zip';
    }
    const saved = await saveFile(bytes, filename, mime, description, extension);
    if (!saved) {
      setStatus('info', 'Save cancelled. Nothing was written.');
    } else if (saved.picked) {
      setStatus(
        'success',
        single ? `Saved QR code as ${saved.name}` : `Saved ${items.length} QR codes as ${saved.name}`
      );
    } else {
      setStatus(
        'success',
        single ? `Downloaded ${saved.name}` : `Downloaded ${items.length} QR codes as ${saved.name}`
      );
    }
  } catch (error) {
    setStatus('error', error.message || 'Something went wrong.');
  } finally {
    busy = false;
    refresh();
  }
}

input.addEventListener('input', refresh);
button.addEventListener('click', generate);
refresh();
