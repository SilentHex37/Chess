# Chess Helper

A small desktop chess board that shows you the best move for any position, powered by the [Stockfish](https://stockfishchess.org) engine. Click pieces to play moves on the board, press **BEST MOVE**, and the engine draws an arrow and lists its top lines with evaluations.

<img width="622" height="899" alt="preview" src="https://github.com/user-attachments/assets/42351cfd-2ed3-4327-a735-882958c3215f" /><!-- Add a screenshot here: ![Chess Helper](docs/screenshot.png) -->

> **Not affiliated with, endorsed by or in any way associated with donutsurge.com.**

## Features

- Interactive board: click a piece, then click where it should go (pawns promote to a queen automatically)
- **Best move** button: Stockfish analyses the position and shows the top 3 lines with evaluation (`+0.35`, `M3`, ...)
- Green arrow on the board for the best move
- Undo, flip the board, reset to the starting position
- Resizable window: the board, logo and controls scale with the window
- Standalone: it runs locally and is not connected to any website

## Requirements

- Windows 10/11 (Linux and macOS also work, see the notes below)
- [Python](https://www.python.org/downloads/) 3.9 or newer (with Tkinter, which is included in the standard Windows installer)
- The Python packages `python-chess` and `pillow`
- A Stockfish executable (free)

## Install tutorial (Windows)

### 1. Install Python

1. Download Python from <https://www.python.org/downloads/>.
2. Run the installer and **tick "Add python.exe to PATH"** on the first screen, then click *Install Now*.
3. Check it worked: open **Command Prompt** (press the Windows key, type `cmd`, press Enter) and run:

   ```
   python --version
   ```

   If `python` is not recognized, try `py --version` and use `py` instead of `python` in the commands below.

### 2. Get the project

Either clone it:

```
git clone https://github.com/YOUR-USERNAME/chess-helper.git
cd chess-helper
```

or click **Code → Download ZIP** on GitHub, unzip it, and open Command Prompt inside that folder (type `cmd` in the folder's address bar and press Enter).

### 3. Install the Python packages

```
pip install -r requirements.txt
```

(or `pip install python-chess pillow`). If `pip` is not recognized, use `py -m pip install -r requirements.txt`.

### 4. Download Stockfish

1. Go to <https://stockfishchess.org/download/> and download the **Windows** version.
2. Unzip the downloaded `.zip` file anywhere you like (for example next to `chess_helper.py`).
3. Inside you will find a file named like `stockfish-windows-x86-64-avx2.exe`. That `.exe` is the engine.
   If it does not start on your PC (older processor), download the plain `x86-64` build instead of the `avx2` one.

### 5. Run it

```
python chess_helper.py
```

The first time, click **ENGINE...** and select the Stockfish `.exe` file. The program remembers your choice in a small file (`chess_helper_engine.txt`) next to the script, so you only do this once. If the `.exe` is in the same folder as the script (or one or two folders below), it is found automatically.

## How to use

| Control | What it does |
| --- | --- |
| Click a piece, then a square | Plays the move (legal moves show as green dots) |
| **BEST MOVE** | Runs Stockfish and shows the best move and top lines |
| **UNDO** | Takes back the last move |
| **FLIP** | Turns the board around |
| **RESET** | Back to the starting position |
| **ENGINE...** | Choose the Stockfish `.exe` |

Positions are set up by playing moves from the starting position.

### Settings

At the top of `chess_helper.py` you can change:

```python
THINK_SECONDS, LINES = 1.0, 3   # engine thinking time and number of lines shown
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| The window opens and closes immediately | Run it from Command Prompt (`python chess_helper.py`) so you can read the error |
| `'python' is not recognized` | Use `py chess_helper.py`, or reinstall Python and tick *Add python.exe to PATH* |
| `No module named 'chess'` or `'PIL'` | Run `pip install python-chess pillow` |
| `No module named 'tkinter'` | Reinstall Python using the standard installer from python.org |
| "No Stockfish engine found" | Download Stockfish (step 4), click **ENGINE...** and pick the `.exe`, not the `.zip` |
| `WinError 193` / "not a valid Stockfish program" | You picked the wrong file or the wrong build. Use the Windows 64-bit `.exe`; try the build without `avx2` if needed |
| The logo does not scale with the window | Install Pillow: `pip install pillow` |

## Linux and macOS

- Install Tkinter if it is missing (for example `sudo apt install python3-tk` on Debian/Ubuntu).
- Install Stockfish with your package manager (`sudo apt install stockfish`, `brew install stockfish`) and select it with **ENGINE...**.
- The piece symbols use the *Segoe UI Symbol* font on Windows. On other systems Tk falls back to another font, so pieces may look slightly different.

## Project structure

```
chess_helper.py     the whole application
requirements.txt    Python dependencies
README.md           this file
```

## Credits

- Engine: [Stockfish](https://stockfishchess.org) (GPLv3), which is **not** included in this repository
- Chess rules and engine communication: [python-chess](https://github.com/niklasf/python-chess)
- Image scaling: [Pillow](https://python-pillow.org)

## License

Add a `LICENSE` file of your choice before publishing. Note that Stockfish is distributed under the GPLv3 and is not bundled here.
