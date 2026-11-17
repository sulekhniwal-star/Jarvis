import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleTelegramCommand } from "@/lib/telegram/commands";

describe("Telegram Bot /deploy Command (REQ-DEP-01, REQ-DEP-02)", () => {
  let mockDeploymentManager: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDeploymentManager = {
      getRepository: vi.fn().mockReturnValue({
        getActiveProductionDeployment: vi.fn().mockResolvedValue({
          id: "prod-1",
          environment: "production",
          commit_sha: "c1a2b3d4e5f60000000000000000000000000000",
          production_url: "https://jarvis.app",
          deployed_at: "2026-11-17T12:00:00.000Z",
          status: "deployed",
        }),
        getLatestPreviewDeployment: vi.fn().mockResolvedValue({
          id: "prev-1",
          environment: "preview",
          commit_sha: "e9f8a7b6c5d40000000000000000000000000000",
          preview_url: "https://jarvis-preview-e9f8a7b.vercel.app",
          status: "deployed",
        }),
      }),
      requestProductionPromotion: vi.fn().mockResolvedValue({
        deployment: {
          id: "dep-prod-req-1",
          commit_sha: "e9f8a7b6c5d40000000000000000000000000000",
          status: "pending_approval",
        },
        approval: {
          id: "appr-tele-001",
          status: "pending",
        },
      }),
    };
  });

  it("lists /deploy in /start command help output", async () => {
    const response = await handleTelegramCommand("/start");
    expect(response).toContain("/deploy");
  });

  it("returns active production and preview status on /deploy", async () => {
    const response = await handleTelegramCommand("/deploy", {
      deploymentManager: mockDeploymentManager,
    });

    expect(response).toContain("Production Environment");
    expect(response).toContain("c1a2b3d");
    expect(response).toContain("https://jarvis\\.app");
    expect(response).toContain("Latest Preview Environment");
    expect(response).toContain("e9f8a7b");
    expect(response).toContain("https://jarvis\\-preview\\-e9f8a7b\\.vercel\\.app");
  });

  it("initiates production promotion approval on /deploy prod <sha>", async () => {
    const response = await handleTelegramCommand(
      "/deploy prod aabbccd1234567890aabbccd1234567890aabbcc",
      {
        deploymentManager: mockDeploymentManager,
        userId: "usr-owner",
      }
    );

    expect(mockDeploymentManager.requestProductionPromotion).toHaveBeenCalledWith(
      "usr-owner",
      expect.objectContaining({
        commitSha: "aabbccd1234567890aabbccd1234567890aabbcc",
      })
    );

    expect(response).toContain("PRODUCTION PROMOTION DISPATCHED");
    expect(response).toContain("appr-tele-001");
    expect(response).toContain("/approve appr-tele-001");
  });

  it("falls back to latest preview commit SHA when /deploy prod has no sha argument", async () => {
    const response = await handleTelegramCommand("/deploy prod", {
      deploymentManager: mockDeploymentManager,
      userId: "usr-owner",
    });

    expect(mockDeploymentManager.requestProductionPromotion).toHaveBeenCalledWith(
      "usr-owner",
      expect.objectContaining({
        commitSha: "e9f8a7b6c5d40000000000000000000000000000",
      })
    );

    expect(response).toContain("PRODUCTION PROMOTION DISPATCHED");
    expect(response).toContain("e9f8a7b");
  });

  it("returns missing commit prompt when no preview or argument is provided", async () => {
    mockDeploymentManager.getRepository().getLatestPreviewDeployment.mockResolvedValue(null);

    const response = await handleTelegramCommand("/deploy prod", {
      deploymentManager: mockDeploymentManager,
      userId: "usr-owner",
    });

    expect(response).toContain("Missing Commit SHA");
    expect(response).toContain("/deploy prod <commit_sha>");
  });
});
