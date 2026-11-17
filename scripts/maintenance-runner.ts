import fs from "fs";
import path from "path";
import { StoragePruningService } from "../src/lib/ops/storage-pruner";

/**
 * Loads environment variables from .env.local and .env if present.
 */
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [key, ...values] = trimmed.split("=");
          const val = values.join("=").trim().replace(/^["'](.*)["']$/, "$1");
          if (key && !process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

interface CliOptions {
  retentionDays: number;
  dryRun: boolean;
  json: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  let retentionDays = 30;
  let dryRun = false;
  let json = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg) continue;

    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--json") {
      json = true;
    } else if (arg === "--retention-days") {
      const nextArg = args[++i];
      if (nextArg) {
        const val = parseInt(nextArg, 10);
        if (!isNaN(val) && val > 0) {
          retentionDays = val;
        }
      }
    } else if (arg.startsWith("--retention-days=")) {
      const parts = arg.split("=");
      const valStr = parts[1];
      if (valStr) {
        const val = parseInt(valStr, 10);
        if (!isNaN(val) && val > 0) {
          retentionDays = val;
        }
      }
    }
  }

  return { retentionDays, dryRun, json };
}

async function main() {
  loadEnv();
  const options = parseArgs();

  if (!options.json) {
    console.log("==========================================");
    console.log("JARVIS STORAGE PRUNING & MAINTENANCE RUNNER");
    console.log("REQ-OPS-03 • Automated Retention & Pruning");
    console.log("==========================================\n");
    console.log(`Configuration:`);
    console.log(`  • Retention window: ${options.retentionDays} days`);
    console.log(`  • Execution mode:   ${options.dryRun ? "DRY-RUN (Simulated)" : "ACTIVE (Live Mutation)"}`);
    console.log("\nExecuting maintenance tasks...");
  }

  const pruner = new StoragePruningService();
  const report = await pruner.runFullMaintenance({
    retentionDays: options.retentionDays,
    dryRun: options.dryRun,
  });

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    if (!report.success) {
      process.exit(1);
    }
    return;
  }

  console.log("\n✓ Maintenance Run Complete:");
  console.log(`  • Status:           ${report.success ? "SUCCESS" : "PARTIAL / WITH ERRORS"}`);
  console.log(`  • Duration:         ${report.durationMs} ms`);
  console.log(`  • Artifacts Pruned: ${report.artifactsPruned}`);
  console.log(`  • Bytes Reclaimed:  ${report.bytesReclaimed} bytes (~${(report.bytesReclaimed / (1024 * 1024)).toFixed(2)} MB)`);
  console.log(`  • Approvals Expired:${report.approvalsExpired}`);
  console.log(`  • Temp Logs Cleaned:${report.tempFilesCleaned}`);

  if (report.errors.length > 0) {
    console.error("\n❌ Errors Encountered:");
    for (const err of report.errors) {
      console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  console.log("\n🎉 Storage Pruning & Maintenance finished successfully.");
}

main().catch((err) => {
  console.error("Fatal maintenance runner error:", err);
  process.exit(1);
});
