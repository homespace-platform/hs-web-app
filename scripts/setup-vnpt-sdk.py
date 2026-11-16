"""Prepare the licensed VNPT Web SDK locally; exclude vendor files from source control."""
from pathlib import Path
import hashlib
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
archive = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / "refer/web-sdk-version-3.2.1.0.zip"
expected = "4a43c3c684c6ecad8bd6dc3e92c7bf3740eda1a44e6314b8a41c50ed646a9b25"
files = ["web-sdk-version-3.2.1.0.js", "web-sdk-version-3.2.1.0.js.LICENSE.txt", "lib/VNPTQRBrowserApp.js", "lib/VNPTBrowserSDKAppV4.1.0.js", "lib/VNPTQRUpload.js", "lib/web-oval.json", "lib/mobile-oval.json", "lib/bg-vnpt.svg", "lib/english-tutorial.mp4", "lib/vietnamese-tutorial.mp4"]
if hashlib.sha256(archive.read_bytes()).hexdigest() != "035b749cdd8e76bac19cb685986345ea2d8cd2845420507fdc3ef3bc9d000677":
    raise SystemExit("VNPT SDK archive checksum mismatch")
with zipfile.ZipFile(archive) as source:
    bundle = source.read("dist/web-sdk-version-3.2.1.0.js")
    if hashlib.sha256(bundle).hexdigest() != expected:
        raise SystemExit("VNPT SDK checksum mismatch. Review the new release before installing.")
    for name in files:
        entry = source.getinfo("dist/" + name)
        if entry.file_size > 30 * 1024 * 1024:
            raise SystemExit("Unexpected SDK asset size")
        target = root / "public/vendor/vnpt" / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read(entry))
print("Prepared VNPT Web SDK assets. The credential-bearing index.html was excluded.")
