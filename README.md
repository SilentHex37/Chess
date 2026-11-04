# Chess Helper

A small desktop chess board that shows the best move for any position, powered by the Stockfish engine. Click pieces to play moves on the board, press BEST MOVE, and the engine shows the strongest continuation.

> Not affiliated with, endorsed by, or in any way associated with donutsurge.com.

## Features

- Interactive board: click a piece, then click a destination square
- Best move analysis using Stockfish
- Green arrow on the board for the best move
- Undo, flip, and reset controls
- Standalone desktop app

## Quick start (copy/paste)

### Option 1: run locally on your machine

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python chess_helper.py
```

macOS/Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python chess_helper.py
```

If `python` is not found, try `py` on Windows or `python3` on macOS/Linux.

### Option 2: build a native executable without admin rights

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python build.py
```

Then open the produced file in `dist/`.

- On Windows: it produces `dist/ChessHelper.exe`
- On Linux/macOS: it produces a native executable for that machine

Note: a Linux Codespace build does not create a Windows `.exe`. A Windows build must run on Windows, or on a Windows GitHub Actions runner.

### Option 3: GitHub Codespaces

Create the Codespace and then run:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python chess_helper.py
```

If you want a packaged executable from Codespaces, use:

```bash
python build.py
```

This creates a Linux binary in `dist/` because the build runs on the Linux Codespace environment.

## Install Stockfish

The desktop app requires a local Stockfish engine executable.

1. Download Stockfish from https://stockfishchess.org/download/
2. Unzip the file
3. Select the actual engine executable in the app when prompted

Common Windows engine files look like:

- `stockfish-windows-x86-64-avx2.exe`
- `stockfish-x86-64.exe`

If the app says the file is invalid, use the plain x86-64 build instead of the AVX2 variant.

## Userscript setup

Install `chess_helper.user.js` in Tampermonkey or Violentmonkey.

Then open your chess page and make sure it matches the script rules:

- `https://donutsurge.com/games/chess`
- `https://donutsurge.com/games/chess/*`

The userscript panel is isolated in a Shadow DOM so site CSS does not hide it. If the panel still does not show:

- refresh the page
- verify the script is enabled
- check the browser console for `[Chess Helper]` messages
- update/reinstall the script while online so the `@resource` and `@require` assets can be cached

## Requirements

- Python 3.9+
- Tkinter
- `python-chess`
- `Pillow` (used for scaling/logo support)
- Stockfish engine executable

## Troubleshooting

- `No module named 'chess'` -> run `python -m pip install -r requirements.txt`
- `No module named 'tkinter'` -> install Tkinter for your OS
- `No Stockfish engine found` -> download and select the actual `.exe`
- `WinError 193` -> choose the correct Stockfish build for your architecture
- Userscript panel not visible -> check console, script manager, and URL match

## Project structure

```text
chess_helper.py   desktop app
chess_helper.user.js  browser userscript
build.py          build script for native executable
requirements.txt   Python dependencies
BUILDING.md       detailed setup notes
README.md         this file
```

## Credits

- Stockfish: https://stockfishchess.org
- python-chess: https://github.com/niklasf/python-chess
- Pillow: https://python-pillow.org

## License

Add a LICENSE file of your choice before publishing. Stockfish remains GPL-3.0 and is not bundled in this repository.
