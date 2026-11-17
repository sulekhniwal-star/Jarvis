import { DisasterRecoveryDrill } from "../src/lib/ops/recovery-drill";

async function main() {
  console.log("==========================================");
  console.log("JARVIS DISASTER RECOVERY DRILL HARNESS");
  console.log("REQ-OPS-01 • Zero-Loss Restoration Verification");
  console.log("==========================================\n");

  const drill = new DisasterRecoveryDrill();

  console.log("Executing end-to-end disaster recovery drill...");
  const result = await drill.executeDrill();

  console.log("\n==========================================");
  console.log("DRILL EXECUTION REPORT");
  console.log("==========================================");
  console.log(`• Status: ${result.success ? "SUCCESS ✓" : "FAILED ❌"}`);
  console.log(`• Zero-Loss Restoration: ${result.zeroLossAchieved ? "100% Parity Achieved" : "Data Loss Detected"}`);
  console.log(`• Recovery Time (RTO): ${result.rtoMet ? `MET (${result.durationMs}ms)` : `FAILED (${result.durationMs}ms)`}`);
  console.log(`• Recovery Point (RPO): ${result.rpoMet ? "MET (< 24h baseline)" : "EXCEEDED"}`);
  console.log(`• Records Restored: ${result.totalRecordsRestored}`);
  console.log(`• Snapshot Checksum: ${result.snapshotChecksum || "N/A"}\n`);

  console.log("Table Parity Breakdown:");
  for (const report of result.tableReports) {
    const icon = report.isMatch ? "✓" : "❌";
    console.log(
      `  [${icon}] ${report.tableName.padEnd(16)} Baseline: ${String(report.baselineCount).padEnd(6)} Restored: ${String(report.restoredCount).padEnd(6)} Match: ${report.isMatch}`
    );
  }

  if (result.error) {
    console.error(`\n❌ Drill Error: ${result.error}`);
    process.exit(1);
  }

  if (!result.success || !result.zeroLossAchieved) {
    console.error("\n❌ Recovery Drill FAILED: Parity checks did not achieve 100% equivalence.");
    process.exit(1);
  }

  console.log("\n🎉 Disaster Recovery Drill Completed with 100% Zero-Loss Verification.");
}

main().catch((err) => {
  console.error("Disaster recovery drill harness terminated with fatal error:", err);
  process.exit(1);
});
