# Chess Helper

A small desktop chess board that shows the best move for any position, powered by the Stockfish engine. Click pieces to play moves on the board, press **BEST MOVE**, and the engine shows the strongest continuation.

> Not affiliated with, endorsed by, or in any way associated with donutsurge.com.

## Features

- Interactive board: click a piece, then click a destination square
- Best move analysis using Stockfish
- Green arrow on the board for the best move
- Undo, flip, and reset controls
- Standalone desktop app

## Quick start (copy/paste)

### Run locally without administrator rights

Install Python from [python.org](https://www.python.org/downloads/) if it is not already installed. Then open a terminal in the project folder.

Windows PowerShell:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python chess_helper.py
```

If PowerShell blocks activation, use Command Prompt instead:

```bat
python -m venv .venv
.venv\Scripts\activate.bat
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

A virtual environment installs Python packages just for this project; it does not require admin access. The desktop app also needs a Stockfish executable; see [Install Stockfish](#install-stockfish).

### Build an executable

Activate the project venv using the commands above, then run:

```bash
python -m pip install PyInstaller
python build.py
```

The output is in `dist/`. Builds are native to the machine and operating system running PyInstaller: Windows creates `dist/ChessHelper.exe`; Linux or macOS creates a binary for that platform. PyInstaller does not cross-compile, so a Linux Codespace cannot produce a Windows `.exe`.

### GitHub Codespaces

Codespaces normally runs Linux in a headless container. Install dependencies and build a Linux executable with:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt PyInstaller
python build.py
```

The binary will be in `dist/`. **Do not expect `python chess_helper.py` to open a desktop window in the standard Codespaces terminal.** The app uses Tkinter, and the error `no display name and no $DISPLAY environment variable` means the container has no graphical display. Use the browser userscript in your local browser for the web UI, or run the desktop app on a computer with a display. A Codespace can run a GUI only if you separately configure a graphical desktop/display-forwarding environment.

## Install Stockfish

The desktop app requires a local Stockfish engine executable.

1. Download Stockfish from [stockfishchess.org/download](https://stockfishchess.org/download/).
2. Unzip the download.
3. In the desktop app, select the actual engine executable when prompted.

Common Windows engine files include `stockfish-windows-x86-64-avx2.exe` and `stockfish-x86-64.exe`. If the AVX2 build is incompatible with your computer, use the plain x86-64 build.

## Userscript setup

Install `chess_helper.user.js` in Tampermonkey or Violentmonkey, enable it, and open the chess game at `https://donutsurge.com/games/chess`.

The userscript manager must be allowed to load its declared `@require` and cached Stockfish `@resource` when the script is installed or updated. Install/update while online, then refresh the page. If the panel does not appear, verify the script is enabled and check the browser console for `[Chess Helper]` messages.

## Requirements

- Python 3.9 or later
- Tkinter (included with standard Windows Python; Linux may require a system Tk package)
- `python-chess`
- Stockfish executable for desktop analysis
- Pillow is optional; it is used for logo scaling when installed

## Troubleshooting

- `No module named 'chess'`: activate `.venv` and run `python -m pip install -r requirements.txt`.
- `No module named 'tkinter'`: install the Tkinter package for your OS; pip cannot install the OS Tk library.
- `no display name and no $DISPLAY environment variable`: you are in a headless environment such as the default Codespaces terminal. Run the GUI on a machine with a display, or use the userscript locally in your browser.
- `No Stockfish engine found`: download and select the actual Stockfish executable, not the ZIP archive.
- `WinError 193`: select a Stockfish build compatible with your Windows CPU/architecture.
- `Can not perform a '--user' install` while building: activate `.venv`, then run `python -m pip install PyInstaller` and `python build.py`. The build script has also been updated to avoid `--user` installs inside virtual environments.

## Project structure

```text
chess_helper.py       desktop app
chess_helper.user.js  browser userscript
build.py              native executable build script
requirements.txt      Python dependencies
BUILDING.md           additional setup notes
README.md             this file
```

## Credits

- [Stockfish](https://stockfishchess.org)
- [python-chess](https://github.com/niklasf/python-chess)
- [Pillow](https://python-pillow.org) (optional)

## License

Add a LICENSE file of your choice before publishing. Stockfish is GPL-3.0 and is not bundled in this repository.
