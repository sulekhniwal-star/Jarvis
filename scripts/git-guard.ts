import { verifyActiveBranchIsMain, getWorkingTreeStatus } from "../src/lib/git/guard";
import { inspectCommitDiff } from "../src/lib/git/diff";

function run() {
  const subcommand = process.argv[2] ?? "pre-commit";

  console.log(`[Git Guard] Executing subcommand: ${subcommand}`);

  switch (subcommand) {
    case "check-branch": {
      const result = verifyActiveBranchIsMain();
      if (!result.isValid) {
        console.error(`[Git Guard] ❌ VIOLATION: ${result.error}`);
        process.exit(1);
      }
      console.log(`[Git Guard] ✓ Active branch is 'main'`);
      break;
    }

    case "check-clean": {
      const status = getWorkingTreeStatus();
      if (!status.isClean) {
        console.error(
          `[Git Guard] ❌ Working tree is dirty (${status.staged.length} staged, ${status.modified.length} modified, ${status.untracked.length} untracked)`
        );
        process.exit(1);
      }
      console.log(`[Git Guard] ✓ Working tree is clean`);
      break;
    }

    case "scan-diff": {
      const diffResult = inspectCommitDiff({ cached: true });
      if (diffResult.hasSecrets) {
        console.error(
          `[Git Guard] ❌ Potential secrets detected in staged diff: ${diffResult.detectedPatterns.join(", ")}`
        );
        process.exit(1);
      }
      console.log(
        `[Git Guard] ✓ Staged diff clean (${diffResult.filesChanged.length} files changed, +${diffResult.totalAdditions}/-${diffResult.totalDeletions}, 0 secrets detected)`
      );
      break;
    }

    case "pre-commit": {
      const branchRes = verifyActiveBranchIsMain();
      if (!branchRes.isValid) {
        console.error(`[Git Guard] ❌ VIOLATION: ${branchRes.error}`);
        process.exit(1);
      }
      console.log(`[Git Guard] ✓ Active branch is 'main'`);

      const diffRes = inspectCommitDiff({ cached: true });
      if (diffRes.hasSecrets) {
        console.error(
          `[Git Guard] ❌ Potential secrets detected in staged diff: ${diffRes.detectedPatterns.join(", ")}`
        );
        process.exit(1);
      }
      console.log(
        `[Git Guard] ✓ Staged diff verified clean (0 secrets detected)`
      );
      break;
    }

    default:
      console.error(`[Git Guard] Unknown subcommand '${subcommand}'. Valid: check-branch, check-clean, scan-diff, pre-commit`);
      process.exit(1);
  }
}

run();
