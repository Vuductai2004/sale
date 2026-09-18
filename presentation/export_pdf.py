#!/usr/bin/env python3
"""
Export presentation/index.html and presentation/tech_spec.html to PDFs using headless Chrome.
"""
import os
import subprocess
from pathlib import Path

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BASE_DIR = Path(__file__).resolve().parent.parent

EXPORTS = [
    {
        "name": "Executive Presentation Deck (6 pages)",
        "html": BASE_DIR / "presentation" / "index.html",
        "pdf": BASE_DIR / "BAO_CAO_THUYET_TRINH_AI_AGENT_ENTERPRISE.pdf"
    },
    {
        "name": "Technical Specification Blueprint (10 pages)",
        "html": BASE_DIR / "presentation" / "tech_spec.html",
        "pdf": BASE_DIR / "DAC_TA_KY_THUAT_HE_THONG_AI_AGENT.pdf"
    }
]

if not os.path.isfile(CHROME_PATH):
    raise FileNotFoundError(f"Chrome not found at {CHROME_PATH}")

for item in EXPORTS:
    print(f"Compiling {item['name']} to PDF...")
    cmd = [
        CHROME_PATH,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={item['pdf'].resolve()}",
        item['html'].resolve().as_uri()
    ]
    subprocess.run(cmd, check=True)
    print(f"SUCCESS: Generated {item['pdf']} successfully!\n")

