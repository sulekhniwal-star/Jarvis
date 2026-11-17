import crypto from "crypto";
import zlib from "zlib";
import fs from "fs";
import path from "path";
import { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export const BACKUP_TABLES = [
  "projects",
  "tasks",
  "agent_runs",
  "approvals",
  "cost_records",
  "memories",
  "audit_events",
] as const;

export type BackupTableName = (typeof BACKUP_TABLES)[number];

export interface BackupDataset {
  version: string;
  timestamp: string;
  metadata: {
    totalRecords: number;
    tableCounts: Record<string, number>;
  };
  tables: Record<string, Record<string, unknown>[]>;
}

export interface BackupResult {
  snapshotId: string;
  filename: string;
  filePath: string;
  checksumPath: string;
  checksum: string;
  recordCount: number;
  sizeBytes: number;
  durationMs: number;
  timestamp: string;
}

export interface BackupOptions {
  outputDir?: string;
  encryptionKey?: string;
  tables?: BackupTableName[];
  userId?: string | null;
}

export class BackupSnapshotRunner {
  private supabase: SupabaseClient;

  constructor(supabase?: SupabaseClient) {
    if (supabase) {
      this.supabase = supabase;
    } else {
      this.supabase = createAdminClient();
    }
  }

  /**
   * Derives a 32-byte (256-bit) encryption key from the provided secret or environment.
   */
  public static deriveKey(secret?: string): Buffer {
    const rawSecret =
      secret ||
      process.env.BACKUP_ENCRYPTION_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      "javis-default-backup-key-32-bytes-secure";

    return crypto.createHash("sha256").update(rawSecret).digest();
  }

  /**
   * Extracts data across all backup tables, compresses with gzip,
   * encrypts with AES-256-GCM, writes snapshot and SHA-256 checksum digest.
   */
  public async createSnapshot(options?: BackupOptions): Promise<BackupResult> {
    const startTime = performance.now();
    const timestamp = new Date().toISOString();
    const formattedDate = timestamp.replace(/[:.]/g, "-");
    const snapshotId = `snapshot-${formattedDate}`;

    const outputDir = options?.outputDir || path.join(process.cwd(), "backups");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const tablesToBackup = options?.tables || [...BACKUP_TABLES];
    const tablesData: Record<string, Record<string, unknown>[]> = {};
    const tableCounts: Record<string, number> = {};
    let totalRecords = 0;

    for (const table of tablesToBackup) {
      let query = this.supabase.from(table).select("*");
      if (options?.userId && table !== "projects") {
        // user_id filter where available
        query = query.eq("user_id", options.userId);
      }

      const { data, error } = await query;
      if (error) {
        throw new Error(`Failed to extract table ${table}: ${error.message}`);
      }

      const rows = data || [];
      tablesData[table] = rows;
      tableCounts[table] = rows.length;
      totalRecords += rows.length;
    }

    const dataset: BackupDataset = {
      version: "1.0",
      timestamp,
      metadata: {
        totalRecords,
        tableCounts,
      },
      tables: tablesData,
    };

    // 1. Serialize and gzip compress
    const jsonPayload = JSON.stringify(dataset);
    const compressed = zlib.gzipSync(Buffer.from(jsonPayload, "utf-8"));

    // 2. Encrypt with AES-256-GCM (12-byte IV, 16-byte Auth Tag)
    const key = BackupSnapshotRunner.deriveKey(options?.encryptionKey);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // File layout: [12 bytes IV][16 bytes AuthTag][Ciphertext]
    const encryptedFileBuffer = Buffer.concat([iv, authTag, ciphertext]);

    const filename = `${snapshotId}.enc.gz`;
    const filePath = path.join(outputDir, filename);
    const checksumPath = path.join(outputDir, `${filename}.sha256`);

    fs.writeFileSync(filePath, encryptedFileBuffer);

    // 3. Compute SHA-256 checksum digest
    const checksum = crypto.createHash("sha256").update(encryptedFileBuffer).digest("hex");
    fs.writeFileSync(checksumPath, `${checksum}  ${filename}\n`, "utf-8");

    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      snapshotId,
      filename,
      filePath,
      checksumPath,
      checksum,
      recordCount: totalRecords,
      sizeBytes: encryptedFileBuffer.length,
      durationMs,
      timestamp,
    };
  }

  /**
   * Verifies the SHA-256 checksum of an encrypted snapshot file against its .sha256 digest file.
   */
  public verifySnapshotChecksum(filePath: string): boolean {
    const checksumPath = `${filePath}.sha256`;
    if (!fs.existsSync(filePath) || !fs.existsSync(checksumPath)) {
      return false;
    }

    const expectedChecksumContent = fs.readFileSync(checksumPath, "utf-8").trim();
    const expectedChecksum = expectedChecksumContent.split(/\s+/)[0];

    const fileBuffer = fs.readFileSync(filePath);
    const actualChecksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    return actualChecksum === expectedChecksum;
  }

  /**
   * Decrypts and decompresses a snapshot file into the structured BackupDataset.
   */
  public decryptSnapshot(filePath: string, secret?: string): BackupDataset {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Snapshot file not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    if (fileBuffer.length < 28) {
      throw new Error("Invalid snapshot file: Payload smaller than IV and AuthTag headers");
    }

    const iv = fileBuffer.subarray(0, 12);
    const authTag = fileBuffer.subarray(12, 28);
    const ciphertext = fileBuffer.subarray(28);

    const key = BackupSnapshotRunner.deriveKey(secret);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    const decryptedCompressed = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const decompressedJson = zlib.gunzipSync(decryptedCompressed).toString("utf-8");

    return JSON.parse(decompressedJson) as BackupDataset;
  }

  /**
   * Rotates snapshots in the backup directory, retaining the newest N snapshots
   * and removing older snapshots and checksums.
   */
  public rotateSnapshots(
    backupDir: string,
    maxRetention: number = 7
  ): { retained: string[]; pruned: string[] } {
    if (!fs.existsSync(backupDir)) {
      return { retained: [], pruned: [] };
    }

    const files = fs.readdirSync(backupDir);
    const snapshotFiles = files
      .filter((f) => f.endsWith(".enc.gz") && !f.endsWith(".sha256"))
      .sort((a, b) => b.localeCompare(a)); // Descending by timestamp

    const retained = snapshotFiles.slice(0, maxRetention);
    const pruned = snapshotFiles.slice(maxRetention);

    for (const file of pruned) {
      const fullPath = path.join(backupDir, file);
      const checksumPath = path.join(backupDir, `${file}.sha256`);

      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      if (fs.existsSync(checksumPath)) fs.unlinkSync(checksumPath);
    }

    return {
      retained,
      pruned,
    };
  }
}
