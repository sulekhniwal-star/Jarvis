import path from "path";
import { BackupSnapshotRunner } from "../src/lib/ops/backup-runner";

async function main() {
  console.log("==========================================");
  console.log("JARVIS DATABASE BACKUP SNAPSHOT RUNNER");
  console.log("REQ-OPS-01 • Automated Encrypted Snapshots");
  console.log("==========================================\n");

  const runner = new BackupSnapshotRunner();
  const backupDir = path.join(process.cwd(), "backups");

  console.log(`[1/3] Extracting and encrypting tables to ${backupDir}...`);
  const result = await runner.createSnapshot({ outputDir: backupDir });

  console.log("✓ Snapshot Created Successfully:");
  console.log(`  • ID: ${result.snapshotId}`);
  console.log(`  • File: ${result.filename}`);
  console.log(`  • Records: ${result.recordCount}`);
  console.log(`  • Size: ${result.sizeBytes} bytes`);
  console.log(`  • Checksum (SHA-256): ${result.checksum}`);
  console.log(`  • Duration: ${result.durationMs} ms\n`);

  console.log("[2/3] Verifying snapshot integrity...");
  const isValid = runner.verifySnapshotChecksum(result.filePath);
  if (!isValid) {
    console.error("❌ Snapshot verification failed: Checksum mismatch!");
    process.exit(1);
  }
  console.log("✓ Checksum verified against .sha256 digest.\n");

  console.log("[3/3] Rotating snapshot retention (keeping last 7 daily copies)...");
  const rotation = runner.rotateSnapshots(backupDir, 7);
  console.log(`  • Retained: ${rotation.retained.length} snapshots`);
  console.log(`  • Pruned: ${rotation.pruned.length} older snapshots\n`);

  console.log("🎉 Backup Snapshot Run Completed.");
}

main().catch((err) => {
  console.error("Backup snapshot failed with fatal error:", err);
  process.exit(1);
});
