import { DiffFile, DiffHunk } from "./types";

/**
 * Parses unified git diff patch into structured DiffFile AST.
 */
export function parseUnifiedDiff(rawDiff: string): DiffFile[] {
  if (!rawDiff || typeof rawDiff !== "string") {
    return [];
  }

  const files: DiffFile[] = [];
  const lines = rawDiff.split("\n");

  let currentFile: DiffFile | null = null;
  let currentHunk: DiffHunk | null = null;

  let currentOldLine = 0;
  let currentNewLine = 0;

  const pushCurrentHunk = () => {
    if (currentFile && currentHunk) {
      currentFile.hunks.push(currentHunk);
      currentHunk = null;
    }
  };

  const pushCurrentFile = () => {
    pushCurrentHunk();
    if (currentFile) {
      files.push(currentFile);
      currentFile = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    if (rawLine === undefined) continue;
    const line = rawLine;

    // Check for git diff file header
    if (line.startsWith("diff --git a/")) {
      pushCurrentFile();

      const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
      const oldPath = match && match[1] ? match[1].trim() : null;
      const newPath = match && match[2] ? match[2].trim() : null;

      currentFile = {
        oldPath,
        newPath,
        status: "modified",
        additions: 0,
        deletions: 0,
        hunks: [],
        isBinary: false,
      };
      continue;
    }

    if (!currentFile) {
      continue;
    }

    // Status metadata
    if (line.startsWith("new file mode")) {
      currentFile.status = "added";
      currentFile.oldPath = null;
      continue;
    }

    if (line.startsWith("deleted file mode")) {
      currentFile.status = "deleted";
      currentFile.newPath = null;
      continue;
    }

    if (line.startsWith("rename from ")) {
      currentFile.status = "renamed";
      currentFile.oldPath = line.substring("rename from ".length).trim();
      continue;
    }

    if (line.startsWith("rename to ")) {
      currentFile.status = "renamed";
      currentFile.newPath = line.substring("rename to ".length).trim();
      continue;
    }

    if (line.startsWith("Binary files ") && line.endsWith("differ")) {
      currentFile.isBinary = true;
      continue;
    }

    // Check for hunk header: @@ -1,4 +1,6 @@ optional function name
    if (line.startsWith("@@ ")) {
      pushCurrentHunk();

      const hunkMatch = line.match(
        /^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@/
      );
      if (hunkMatch && hunkMatch[1] && hunkMatch[3]) {
        const oldStart = parseInt(hunkMatch[1], 10);
        const oldLines = hunkMatch[2] ? parseInt(hunkMatch[2], 10) : 1;
        const newStart = parseInt(hunkMatch[3], 10);
        const newLines = hunkMatch[4] ? parseInt(hunkMatch[4], 10) : 1;

        currentOldLine = oldStart;
        currentNewLine = newStart;

        currentHunk = {
          oldStart,
          oldLines,
          newStart,
          newLines,
          lines: [],
        };
      }
      continue;
    }

    // Lines within a hunk
    if (currentHunk) {
      if (line.startsWith("+") && !line.startsWith("+++")) {
        currentFile.additions++;
        currentHunk.lines.push({
          type: "add",
          content: line.substring(1),
          newLine: currentNewLine++,
        });
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        currentFile.deletions++;
        currentHunk.lines.push({
          type: "delete",
          content: line.substring(1),
          oldLine: currentOldLine++,
        });
      } else if (line.startsWith(" ") || line === "") {
        currentHunk.lines.push({
          type: "context",
          content: line.startsWith(" ") ? line.substring(1) : line,
          oldLine: currentOldLine++,
          newLine: currentNewLine++,
        });
      }
    }
  }

  pushCurrentFile();

  return files;
}
