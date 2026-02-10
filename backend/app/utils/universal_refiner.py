import re
from io import StringIO
from typing import List, Dict, Optional, Tuple
# pip install unidiff
from unidiff import PatchSet, PatchedFile

class UniversalDietDiffRefiner:
    """
    [UniversalDietDiffRefiner]
    Refines raw git diffs by filtering noise and extracting core logic.
    
    [Update] 
    - Markdown files (.md) are explicitly IGNORED (handled separately).
    - Tier 0: Dependency/Tech Stack changes (Top priority, summarized at top)
    - Tier 1: Core Code (Refined content)
    - Tier 2: General Summary (Config, UI, DB - only filenames)
    - Tier 3: Ignored (Assets, Locks, Docs)
    """
    def __init__(self, max_hunk_lines=30):
        self.max_hunk_lines = max_hunk_lines

        # =========================================================
        # [Tier 0] Tech Stack & Dependency Files
        # These are summarized at the very top of the report.
        # =========================================================
        self.DEPENDENCY_PATTERNS = [
            # Python
            r"requirements\.txt$", r"Pipfile$", r"pyproject\.toml$", r"setup\.py$",
            # Node.js / JS
            r"package\.json$", r"bower\.json$",
            # Java / Kotlin
            r"pom\.xml$", r"build\.gradle.*$",
            # Go
            r"go\.mod$",
            # Ruby
            r"Gemfile$",
            # Rust
            r"Cargo\.toml$",
            # PHP
            r"composer\.json$",
            # Docker / Infra
            r"Dockerfile.*$", r"docker-compose.*\.yml$",
        ]

        # =========================================================
        # [Tier 3] Completely Ignored Patterns (NOISE Filtering)
        # =========================================================
        self.IGNORE_PATTERNS = [
            # 1. Documentation & Markdown (Handled separately)
            r"\.md$", r"\.markdown$", r"\.MD$",

            # 2. Lock Files
            r"package-lock\.json$", r"yarn\.lock$", r"pnpm-lock\.yaml$", 
            r"Pipfile\.lock$", r"poetry\.lock$", r"Gemfile\.lock$", 
            r"go\.sum$", r"Cargo\.lock$", r"composer\.lock$",

            # 3. Assets / Binaries
            r"\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|tiff)$",
            r"\.(woff|woff2|ttf|eot|otf)$",
            r"\.(mp4|mov|avi|mp3|wav)$",
            r"\.(zip|tar|gz|7z|rar|jar|war|ear|pdf|exe|dll|so|dylib)$",

            # 4. Build Artifacts
            r"(__pycache__|node_modules|\.git|\.idea|\.vscode|\.venv|venv|env|build|dist|target|out|bin|obj)/",
            r"\.min\.(js|css)$", r"\.map$", r"\.pyc$", r"\.pyo$",

            # 5. Misc Noise
            r"LICENSE$", r"\.DS_Store$", r"Thumbs\.db$", r"\.log$"
        ]

        # =========================================================
        # [Tier 2] Summarize Only (Changed files list)
        # =========================================================
        self.SUMMARIZE_PATTERNS = [
            # 1. DB / Migrations
            r"migrations/.*\.py$", r"db/migrate/.*\.rb$", r"sql/.*\.sql$",

            # 2. Configs (Non-dependency)
            r"\.env.*", r"\.gitignore$", r"\.editorconfig$", r"\.eslintrc.*", r"tsconfig\.json$",

            # 3. Frontend Style/Templates
            r"\.(css|scss|sass|less|styl)$",
            r"\.(html|jsp|asp|php)$",
            
            # 4. Tests
            r"(test|spec|mock|fixture)s?/.*",
            r"_test\.go$", r"\.test\.(js|ts)$", r"\.spec\.(js|ts)$", r"tests\.py$",
            r"fixtures/.*\.json$"
        ]

        # =========================================================
        # [Line Filter] Noise lines within code
        # =========================================================
        self.NOISE_LINE_PATTERNS = [
            r"^\s*(import|from|package|include|using|require)\s+", 
            r"^\s*#include", 
            r"^\s*(console\.log|print|System\.out\.print|fmt\.Print|logger\.|logging\.|log\.)",
            r"^\s*(//|#)(?!\s*(TODO|FIXME))", 
            r"^\s*[\{\}\[\]\(\);,]+\s*$",
            r"^\s*$"
        ]

    def refine(self, raw_diff: str) -> str:
        """
        [Main Method] Parses raw diff and returns a refined summary report.
        """
        if not raw_diff: return ""
        
        try:
            patch_set = PatchSet(StringIO(raw_diff))
        except Exception:
            return f"Error parsing diff. Raw content excerpt:\n{raw_diff[:500]}"

        buffer = []
        dependency_changes = [] 
        summary_buffer = {"configs": [], "ui": [], "db": [], "tests": []}

        for patched_file in patch_set:
            path = patched_file.path
            
            # 1. [Tier 3] Ignore (Markdown included here)
            if self._matches(path, self.IGNORE_PATTERNS):
                continue

            # 2. [Tier 0] Dependency/Tech Stack
            if self._matches(path, self.DEPENDENCY_PATTERNS):
                changes = self._extract_dependency_changes(patched_file)
                if changes:
                    dependency_changes.extend(changes)
                continue

            # 3. [Tier 2] General Summarize
            if self._matches(path, self.SUMMARIZE_PATTERNS):
                category = self._categorize_summary(path)
                filename = path.split('/')[-1]
                if filename not in summary_buffer[category]:
                    summary_buffer[category].append(filename)
                continue

            # 4. [Tier 1] Core Logic Refinement
            refined_content = self._refine_code_file(patched_file)
            if refined_content:
                buffer.append(f"## File: {path}\n{refined_content}")

        # --- Build Final Report ---
        report = []
        
        # Section A: Tech Stack
        if dependency_changes:
            report.append("### 🛠️ Tech Stack & Dependency Updates")
            unique_deps = sorted(list(set(dependency_changes)))
            for dep in unique_deps:
                report.append(f"- {dep}")
            report.append("\n---")

        # Section B: General Changes Summary
        has_summary = any(summary_buffer.values())
        if has_summary:
            report.append("### 🔍 General Changes Summary")
            if summary_buffer["configs"]:
                report.append(f"- **Config**: {', '.join(summary_buffer['configs'])}")
            if summary_buffer["db"]:
                report.append(f"- **Database**: {', '.join(summary_buffer['db'])}")
            if summary_buffer["ui"]:
                report.append(f"- **UI/Style**: {len(summary_buffer['ui'])} files changed")
            if summary_buffer["tests"]:
                report.append(f"- **Tests**: {len(summary_buffer['tests'])} files updated")
            report.append("\n---")

        # Section C: Core Code Changes
        if buffer:
            report.append("\n\n".join(buffer))
        else:
            if not has_summary and not dependency_changes:
                report.append("(No significant logic changes found in this diff)")

        return "\n".join(report)

    def _extract_dependency_changes(self, patched_file: PatchedFile) -> List[str]:
        changes = []
        filename = patched_file.path.split('/')[-1]
        
        for hunk in patched_file:
            for line in hunk:
                val = line.value.strip()
                clean_val = re.sub(r'[\",]', '', val)
                
                if not clean_val or clean_val in ['{', '}', '[', ']', 'dependencies:', 'devDependencies:', 'packages:']:
                    continue

                if line.is_added:
                    changes.append(f"**Added/Updated** in `{filename}`: {clean_val}")
                # Removed lines are skipped to reduce noise
                    
        return changes

    def _refine_code_file(self, patched_file: PatchedFile) -> str:
        file_diffs = []
        
        for hunk in patched_file:
            context = hunk.section_header.strip() if hunk.section_header else "Global"
            context = re.sub(r'\(.*\).*', '(...)', context)

            added_lines = [
                line.value.rstrip() for line in hunk 
                if line.is_added and not self._is_noise_line(line.value)
            ]
            
            if not added_lines:
                continue
                
            hunk_content = "\n".join([f"+ {l}" for l in added_lines])
            
            if len(added_lines) > self.max_hunk_lines:
                preview = added_lines[:self.max_hunk_lines]
                hunk_content = "\n".join([f"+ {l}" for l in preview])
                hunk_content += f"\n... (+ {len(added_lines) - self.max_hunk_lines} more lines) ..."

            file_diffs.append(f"@@ {context} @@\n{hunk_content}")

        return "\n\n".join(file_diffs)

    def _matches(self, path: str, patterns: List[str]) -> bool:
        return any(re.search(p, path, re.IGNORECASE) for p in patterns)

    def _is_noise_line(self, line: str) -> bool:
        return any(re.search(p, line) for p in self.NOISE_LINE_PATTERNS)

    def _categorize_summary(self, path: str) -> str:
        path_lower = path.lower()
        if any(x in path_lower for x in ['migration', 'sql', 'db', 'schema']): return 'db'
        if any(x in path_lower for x in ['test', 'spec', 'fixture', '__tests__']): return 'tests'
        if any(re.search(p, path_lower) for p in [r"\.css$", r"\.scss$", r"\.html$", r"\.vue$", r"\.jsx$", r"\.tsx$"]): return 'ui'
        return 'configs'