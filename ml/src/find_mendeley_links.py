import re
import json
from pathlib import Path

step_files = {
    "bangladeshi_fish": r"C:\Users\Sania Sagheer\.gemini\antigravity\brain\332ab03e-fcd0-4df2-b826-24001753caa0\.system_generated\steps\316\content.md",
    "bd_freshwater_fish": r"C:\Users\Sania Sagheer\.gemini\antigravity\brain\332ab03e-fcd0-4df2-b826-24001753caa0\.system_generated\steps\320\content.md",
    "indian_seafood": r"C:\Users\Sania Sagheer\.gemini\antigravity\brain\332ab03e-fcd0-4df2-b826-24001753caa0\.system_generated\steps\325\content.md",
    "pomfret": r"C:\Users\Sania Sagheer\.gemini\antigravity\brain\332ab03e-fcd0-4df2-b826-24001753caa0\.system_generated\steps\329\content.md"
}

for name, path in step_files.items():
    print(f"=== {name} ===")
    if not Path(path).exists():
        print("  File not found.")
        continue
    text = Path(path).read_text(encoding="utf-8", errors="ignore")
    
    # Search for embedded JSON state (window.__INITIAL_STATE__ or similar)
    json_blobs = re.findall(r'window\.__INITIAL_STATE__\s*=\s*(\{.*?\});', text, re.DOTALL)
    if json_blobs:
        print("  Found __INITIAL_STATE__ JSON blob!")
        try:
            state = json.loads(json_blobs[0])
            print("  Parsed state keys:", list(state.keys()))
        except Exception as e:
            print("  JSON parse error:", e)

    # Search for file download endpoints
    file_matches = re.findall(r'https?://[^\s"\'<>]+(?:zip|tar|rar|download|file|s3)[^\s"\'<>]*', text, re.IGNORECASE)
    print(f"  Candidate URLs found ({len(file_matches)}):")
    for u in set(file_matches):
        print("    *", u)
