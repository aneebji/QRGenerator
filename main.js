const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const QRCode = require('qrcode');
const JSZip = require('jszip');

const QR_OPTIONS = { type: 'png', width: 512, margin: 2, errorCorrectionLevel: 'M' };
const MAX_SLUG_LENGTH = 40;

function createWindow() {
  const win = new BrowserWindow({
    width: 640,
    height: 600,
    minWidth: 420,
    minHeight: 420,
    title: 'QR Generator',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
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

// Renders every item before anything is written, so one bad line can never
// leave a partial ZIP on disk.
async function renderAll(items) {
  const images = [];
  for (const item of items) {
    try {
      images.push(await QRCode.toBuffer(item.text, QR_OPTIONS));
    } catch (error) {
      throw new Error(`Line ${item.line}: ${describeQrError(error)}`);
    }
  }
  return images;
}

function describeQrError(error) {
  const message = error && error.message ? error.message : String(error);
  if (/too big/i.test(message)) return 'the text is too long to fit in a QR code.';
  return message;
}

async function buildZip(items, images) {
  const zip = new JSZip();
  items.forEach((item, i) => {
    zip.file(fileNameFor(i, item.text, items.length), images[i]);
  });
  return zip.generateAsync({ type: 'nodebuffer' });
}

ipcMain.handle('qr:generate', async (event, texts) => {
  if (!Array.isArray(texts)) return { status: 'error', message: 'Invalid input.' };

  // `line` is the position in the textbox, so errors point at what the user sees.
  const items = texts
    .map((text, i) => ({ text: String(text).trim(), line: i + 1 }))
    .filter((item) => item.text);
  if (items.length === 0) return { status: 'empty' };

  const single = items.length === 1;
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: single ? 'Save QR code' : `Save ${items.length} QR codes`,
    defaultPath: single ? 'qr.png' : 'qrcodes.zip',
    filters: [
      single
        ? { name: 'PNG image', extensions: ['png'] }
        : { name: 'ZIP archive', extensions: ['zip'] },
    ],
  });
  if (canceled || !filePath) return { status: 'cancelled' };

  try {
    const images = await renderAll(items);
    const data = single ? images[0] : await buildZip(items, images);
    await fs.writeFile(filePath, data);
  } catch (error) {
    return { status: 'error', message: error.message };
  }
  return { status: 'saved', filePath, count: items.length };
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
