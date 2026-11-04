# Build and install without administrator access

## Desktop Python app

The repository currently contains one Python application, `chess_helper.py` (not two). It uses `python-chess`; Pillow is optional and is no longer a required install.

Create a local virtual environment so packages are installed just for this project:

```bash
python -m venv .venv
# Windows PowerShell:
.venv\\Scripts\\Activate.ps1
# macOS/Linux:
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python chess_helper.py
```

The desktop app still needs a compatible Stockfish executable for analysis; this is separate from the browser userscript engine. A venv avoids admin privileges for Python packages. Tkinter is included with standard Windows Python installers; some Linux images require the OS Tk package, which cannot be installed from pip without system support.

## Build a native executable

In the activated venv, run:

```bash
python build.py
```

The output is in `dist/ChessHelper` (`dist/ChessHelper.exe` on Windows). Builds are native to the machine running PyInstaller: GitHub Codespaces produces a Linux executable, not a Windows `.exe`. To distribute a Windows build, run the build on Windows or use a Windows GitHub Actions runner. Executables are not universal across operating systems or CPU architectures.

## Browser userscript

Install `chess_helper.user.js` in Tampermonkey or Violentmonkey, enable it, and open the chess game at `https://donutsurge.com/games/chess`. This version puts the UI in an isolated Shadow DOM so site CSS cannot hide it, and shows an on-panel diagnostic if chess.js is unavailable. The userscript manager fetches and caches its `@require` and Stockfish `@resource` when installing/updating the script, so install/update while online. If the panel still does not appear, verify the page hostname/path against the `@match` rules and inspect the browser console for `[Chess Helper]` messages.
