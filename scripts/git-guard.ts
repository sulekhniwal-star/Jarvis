import { verifyActiveBranchIsMain, getWorkingTreeStatus } from "../src/lib/git/guard";
import { inspectCommitDiff } from "../src/lib/git/diff";
import { auditBranchHygiene } from "../src/lib/git/branch-hygiene";

async function run() {
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

    case "check-branch-hygiene": {
      const hygiene = auditBranchHygiene();
      if (!hygiene.isCompliant) {
        console.error(`[Git Guard] ❌ BRANCH HYGIENE VIOLATION (NFR-SEC-04):`);
        for (const v of hygiene.violations) {
          console.error(`  - ${v}`);
        }
        process.exit(1);
      }
      console.log(
        `[Git Guard] ✓ Branch hygiene verified (active: main, 0 extraneous branches)`
      );
      break;
    }

    case "clean-branch-hygiene": {
      const { cleanExtraneousBranches } = await import("../src/lib/git/branch-hygiene");
      const result = cleanExtraneousBranches();
      console.log(`[Git Guard] Pruned ${result.deleted.length} extraneous local branches.`);
      for (const d of result.deleted) {
        console.log(`  • Deleted: ${d}`);
      }
      if (result.failed.length > 0) {
        console.error(`[Git Guard] ❌ Failed to delete ${result.failed.length} branches:`);
        for (const f of result.failed) {
          console.error(`  • ${f.branch}: ${f.error}`);
        }
        process.exit(1);
      }
      console.log(`[Git Guard] ✓ Clean branch hygiene restored (NFR-SEC-04).`);
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

      const hygiene = auditBranchHygiene();
      if (!hygiene.isCompliant) {
        console.error(`[Git Guard] ❌ BRANCH HYGIENE VIOLATION (NFR-SEC-04):`);
        for (const v of hygiene.violations) {
          console.error(`  - ${v}`);
        }
        process.exit(1);
      }
      console.log(
        `[Git Guard] ✓ Branch hygiene verified (0 extraneous branches)`
      );

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
      console.error(
        `[Git Guard] Unknown subcommand '${subcommand}'. Valid: check-branch, check-branch-hygiene, check-clean, scan-diff, pre-commit`
      );
      process.exit(1);
  }
}

run();
