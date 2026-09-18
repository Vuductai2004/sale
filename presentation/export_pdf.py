#!/usr/bin/env python3
"""
Export presentation/index.html to executive presentation PDF using headless Chrome.
"""
import os
import subprocess
from pathlib import Path

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
HTML_FILE = Path(r"d:\New folder\presentation\index.html")
PDF_OUTPUT = Path(r"d:\New folder\BAO_CAO_THUYET_TRINH_AI_AGENT_ENTERPRISE.pdf")

if not os.path.isfile(CHROME_PATH):
    raise FileNotFoundError(f"Chrome not found at {CHROME_PATH}")

cmd = [
    CHROME_PATH,
    "--headless",
    "--disable-gpu",
    "--no-pdf-header-footer",
    f"--print-to-pdf={PDF_OUTPUT.resolve()}",
    str(HTML_FILE.resolve())
]

print("Compiling Executive Presentation Deck to PDF...")
subprocess.run(cmd, check=True)
print(f"SUCCESS: Generated {PDF_OUTPUT} successfully!")
