# QR Generator

Desktop app that turns text into QR code images. Each line in the box becomes its own QR code.

- One line saves a single PNG.
- Two or more lines save one ZIP that contains every PNG.
- You pick the folder and file name in the save dialog.

Blank lines are skipped. A batch of 100 lines is fine.

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer
- macOS, Windows, or Linux

## Run

```bash
npm install
npm start
```

## How to use

1. Type one text or link per line.
2. Click **Generate PNG** or **Generate ZIP**.
3. Choose where to save.

Files inside a ZIP are numbered in the order you typed them, for example `001-hello-world.png`. The QR code itself keeps the original text, including spaces and non-English characters.

Each image is 512 by 512 pixels. If a line is too long to fit in a QR code, nothing is saved and the status line names that line.

## Project layout

| File | Role |
| --- | --- |
| `main.js` | Window, save dialog, PNG and ZIP writing |
| `preload.js` | Safe bridge from the page to the app |
| `renderer/` | The text box and Generate button |
