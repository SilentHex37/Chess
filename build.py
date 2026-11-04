"""Build a native Chess Helper executable without administrator privileges.

Recommended: activate a project virtual environment, install requirements, then
run ``python build.py``. PyInstaller builds for the current OS/architecture.
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
        print("PyInstaller is missing; installing it into the active Python environment...")
        command = [sys.executable, "-m", "pip", "install"]
        # Never pass --user inside a virtualenv: user site-packages are disabled
        # there, which makes pip reject that install mode.
        if sys.prefix == sys.base_prefix:
            command.append("--user")
        command.append("PyInstaller")
        result = subprocess.run(command, check=False)
        if result.returncode:
            print("Install in your venv with: python -m pip install PyInstaller")
            return result.returncode

    command = [
        sys.executable, "-m", "PyInstaller", "--noconfirm", "--clean",
        "--name", "ChessHelper", "--onefile", "--windowed", SCRIPT,
    ]
    print("Building for the current operating system and CPU architecture...")
    print("PyInstaller does not cross-compile: use Windows to produce a Windows .exe.")
    return subprocess.run(command, cwd=ROOT, check=False).returncode


if __name__ == "__main__":
    raise SystemExit(main())
