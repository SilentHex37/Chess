"""Build the Chess Helper executable without administrator privileges.

Use a virtual environment and run: python build.py
The resulting native executable is written to dist/ChessHelper.
"""
from __future__ import annotations

import importlib.util
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SCRIPT = os.path.join(ROOT, "chess_helper.py")


def main() -> int:
    if importlib.util.find_spec("PyInstaller") is None:
        print("Installing PyInstaller into the current Python environment (no admin needed)...")
        result = subprocess.run(
            [sys.executable, "-m", "pip", "install", "--user", "PyInstaller"],
            check=False,
        )
        if result.returncode:
            print("Install PyInstaller in your venv with: python -m pip install PyInstaller")
            return result.returncode

    command = [
        sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean",
        "--name", "ChessHelper", "--onefile", "--windowed", SCRIPT,
    ]
    print("Building for the current operating system and CPU architecture...")
    print("PyInstaller does not cross-compile: use Windows Actions to produce a Windows .exe.")
    return subprocess.run(command, cwd=ROOT, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
