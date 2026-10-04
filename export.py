import os
from pathlib import Path

# Necessary application code files (excludes vendor binaries, node_modules, and git internals)
CORE_CODE_FILES = [
    # Top-Level Entry & Config
    "server.js",
    "package.json",
    ".env.example",
    "README.md",
    "run.bat",
    "docs/FRONTEND-API-MAP.md",

    # Frontend Assets & App
    "frontend/public/index.html",
    "frontend/public/site.webmanifest",
    "frontend/public/favicon.svg",
    "frontend/public/css/styles.css",
    "frontend/public/js/app.js",
    "frontend/public/js/data.js",

    # Backend Core & Config
    "backend/app.js",
    "backend/config/env.js",
    "backend/config/db.js",

    # Models & Serializers
    "backend/models/index.js",
    "backend/models/User.js",
    "backend/models/Song.js",
    "backend/models/Album.js",
    "backend/models/Artist.js",
    "backend/models/Genre.js",
    "backend/models/Playlist.js",
    "backend/models/PlaybackState.js",
    "backend/utils/ApiError.js",
    "backend/utils/asyncHandler.js",
    "backend/utils/serializers.js",

    # Middleware
    "backend/middleware/auth.js",
    "backend/middleware/upload.js",
    "backend/middleware/noSqlSanitize.js",
    "backend/middleware/validate.js",
    "backend/middleware/errorHandler.js",
    "backend/middleware/rateLimit.js",

    # Services
    "backend/services/auth.service.js",
    "backend/services/admin.service.js",
    "backend/services/catalog.service.js",
    "backend/services/library.service.js",
    "backend/services/playlist.service.js",
    "backend/services/queue.service.js",
    "backend/services/search.service.js",
    "backend/services/users.service.js",

    # Controllers
    "backend/controllers/auth.controller.js",
    "backend/controllers/admin.controller.js",
    "backend/controllers/catalog.controller.js",
    "backend/controllers/library.controller.js",
    "backend/controllers/playlists.controller.js",
    "backend/controllers/queue.controller.js",
    "backend/controllers/search.controller.js",
    "backend/controllers/users.controller.js",

    # Routes
    "backend/routes/index.js",
    "backend/routes/admin.routes.js",
    "backend/routes/auth.routes.js",
    "backend/routes/catalog.routes.js",
    "backend/routes/library.routes.js",
    "backend/routes/playlists.routes.js",
    "backend/routes/queue.routes.js",
    "backend/routes/search.routes.js",
    "backend/routes/users.routes.js",

    # Seed & Test
    "backend/seed/seedData.js",
    "backend/seed/seed.js",
    "backend/test/smoke.js"
]

def main():
    root = Path(__file__).resolve().parent
    output_file = root / "code.txt"
    
    exported_count = 0
    total_lines = 0

    with open(output_file, "w", encoding="utf-8") as out:
        out.write("# TopTunes - Complete Full-Stack Source Code Export\n")
        out.write(f"# Exported files: {len(CORE_CODE_FILES)}\n\n")

        for rel_path in CORE_CODE_FILES:
            full_path = root / rel_path
            if full_path.exists() and full_path.is_file():
                try:
                    with open(full_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    
                    line_count = len(content.splitlines())
                    total_lines += line_count
                    exported_count += 1

                    separator = "=" * 80
                    out.write(f"{separator}\n")
                    out.write(f"FILE: {rel_path} ({line_count} lines, {len(content)} bytes)\n")
                    out.write(f"{separator}\n\n")
                    out.write(content)
                    if not content.endswith("\n"):
                        out.write("\n")
                    out.write("\n\n")
                    print(f"  + Exported {rel_path} ({line_count} lines)")
                except Exception as e:
                    print(f"  ! Error reading {rel_path}: {e}")
            else:
                print(f"  - Skipped missing file: {rel_path}")

    print(f"\nSuccessfully generated {output_file.name}: {exported_count} files, {total_lines} total lines ({output_file.stat().st_size} bytes).")

if __name__ == "__main__":
    main()
