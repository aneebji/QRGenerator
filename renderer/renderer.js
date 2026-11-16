const input = document.getElementById('input');
const counter = document.getElementById('counter');
const button = document.getElementById('generate');
const status = document.getElementById('status');

let busy = false;

function getLines() {
  return input.value.split(/\r?\n/);
}

function countEntries() {
  return getLines().filter((line) => line.trim()).length;
}

function refresh() {
  const count = countEntries();
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

function showResult(result) {
  switch (result.status) {
    case 'saved':
      setStatus(
        'success',
        result.count === 1
          ? `Saved QR code to ${result.filePath}`
          : `Saved ${result.count} QR codes to ${result.filePath}`
      );
      break;
    case 'cancelled':
      setStatus('info', 'Save cancelled. Nothing was written.');
      break;
    case 'empty':
      setStatus('info', 'Enter some text first.');
      break;
    default:
      setStatus('error', result.message || 'Something went wrong.');
  }
}

async function generate() {
  if (busy || countEntries() === 0) return;
  busy = true;
  refresh();
  setStatus('info', 'Generating...');
  try {
    showResult(await window.qr.generate(getLines()));
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
