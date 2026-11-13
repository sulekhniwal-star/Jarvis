/**
 * Project Jarvis — Frontend API Client
 * Connects the Stark Industries HUD to the live FastAPI backend with JWT session management.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

const DEFAULT_CREDENTIALS = {
  username: "jarvis_owner",
  password: "JarvisOwnerSecret123!",
};

let cachedToken: string | null = null;

export async function getAuthToken(): Promise<string | null> {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("jarvis_access_token");
    if (stored) {
      cachedToken = stored;
      return stored;
    }
  }

  if (cachedToken) return cachedToken;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(DEFAULT_CREDENTIALS),
    });

    if (res.ok) {
      const data = await res.json();
      cachedToken = data.access_token;
      if (typeof window !== "undefined" && cachedToken) {
        localStorage.setItem("jarvis_access_token", cachedToken);
      }
      return cachedToken;
    }
  } catch (err) {
    console.warn("API login failed, operating in offline/demo mode:", err);
  }

  return null;
}

export async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, { ...options, headers });

  if (response.status === 401 && token) {
    // Token may have expired, retry once with fresh login
    if (typeof window !== "undefined") {
      localStorage.removeItem("jarvis_access_token");
    }
    cachedToken = null;
    const newToken = await getAuthToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      const retryResponse = await fetch(url, { ...options, headers });
      if (!retryResponse.ok) {
        throw new Error(`API error ${retryResponse.status}: ${await retryResponse.text()}`);
      }
      return retryResponse.json();
    }
  }

  if (!response.ok) {
    throw new Error(`API error ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

export interface TelemetryData {
  status: string;
  hardware: {
    cpu_percent: number;
    cpu_cores: number;
    ram_total_gb: number;
    ram_used_gb: number;
    ram_percent: number;
    network: {
      kb_sent: number;
      mb_recv: number;
    };
  };
  database: {
    status: string;
    total_tasks: number;
    active_tasks: number;
    pending_approvals: number;
  };
  budget: {
    current_inr: number;
    monthly_limit_inr: number;
    currency: string;
  };
  ai_provider: {
    name: string;
    model: string;
    status: string;
  };
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  created_at?: string;
  stepsCount: number;
  completedSteps: number;
  steps?: Array<{
    id: string;
    sequence: number;
    name: string;
    tool_name: string;
    status: string;
  }>;
  logs: string[];
}

export async function fetchTelemetry(): Promise<TelemetryData | null> {
  try {
    const res = await fetch(`${API_BASE}/system/telemetry`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.debug("Telemetry endpoint unreachable, using fallback telemetry:", err);
  }
  return null;
}

export async function fetchTasks(): Promise<TaskItem[]> {
  try {
    const data = await apiRequest("/tasks?page=1&page_size=20");
    const items = data.items || [];
    return items.map((t: any) => {
      const steps = t.steps || [];
      const completed = steps.filter((s: any) => s.status === "COMPLETED").length;
      return {
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        created_at: t.created_at,
        stepsCount: steps.length || 4,
        completedSteps: completed || (t.status === "COMPLETED" ? steps.length || 4 : 1),
        steps: steps,
        logs: steps.map(
          (s: any) => `[Step ${s.sequence}] ${s.name} (${s.tool_name}) -> Status: ${s.status}`
        ),
      };
    });
  } catch (err) {
    console.debug("Tasks endpoint unreachable:", err);
    return [];
  }
}

export async function createTaskApi(title: string, description: string, priority: string): Promise<TaskItem | null> {
  try {
    const payload = {
      title,
      description,
      priority: priority.includes("CRITICAL") ? "CRITICAL" : priority.includes("HIGH") ? "HIGH" : "MEDIUM",
    };
    const t = await apiRequest("/tasks", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const steps = t.steps || [];
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      created_at: t.created_at,
      stepsCount: steps.length || 4,
      completedSteps: 0,
      steps: steps,
      logs: steps.map(
        (s: any) => `[Step ${s.sequence}] ${s.name} (${s.tool_name}) -> Status: ${s.status}`
      ),
    };
  } catch (err) {
    console.error("Failed to create task on backend:", err);
    throw err;
  }
}

export async function fetchApprovals(): Promise<any[]> {
  try {
    const res = await apiRequest("/approvals?status=PENDING");
    return Array.isArray(res) ? res : res.items || [];
  } catch (err) {
    console.debug("Approvals endpoint unreachable:", err);
    return [];
  }
}

export async function evaluateApprovalApi(id: string, decision: "APPROVED" | "REJECTED"): Promise<any> {
  return await apiRequest(`/approvals/${id}/decision`, {
    method: "POST",
    body: JSON.stringify({
      decision,
      reason: `Decided via Stark HUD Interface (${decision})`,
    }),
  });
}

export async function emergencyStopApi(): Promise<any> {
  return await apiRequest("/system/emergency-stop", {
    method: "POST",
  });
}

export interface FleetRepo {
  name: string;
  full_name: string;
  is_private: boolean;
  language: string;
  description: string;
  default_branch: string;
  priority_tier: string;
  priority_weight: number;
  updated_at?: string;
  open_issues: number;
  html_url?: string;
  health_score: number;
  estimated_completion: number;
}

export async function fetchFleetRepos(): Promise<FleetRepo[]> {
  try {
    const res = await apiRequest("/projects/repos");
    return Array.isArray(res) ? res : [];
  } catch (err) {
    console.debug("Failed to fetch fleet repos:", err);
    return [];
  }
}

export async function fetchRepoAudit(repoName: string): Promise<any> {
  return await apiRequest(`/projects/audit/${repoName}`);
}

export async function improveProjectApi(repoName: string): Promise<any> {
  return await apiRequest(`/projects/improve/${repoName}`, {
    method: "POST",
  });
}

export async function selfImproveJarvisApi(): Promise<any> {
  return await apiRequest("/projects/self-improve", {
    method: "POST",
  });
}

