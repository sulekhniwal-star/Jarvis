import { createJarvisDbClient } from './client.js';
import type { Database } from './types.js';

console.log('--- Testing @jarvis/database Client Factory & Types ---');

// Test 1: Verify client factory instantiation with mock credentials
const client = createJarvisDbClient({
  supabaseUrl: 'http://localhost:54321',
  supabaseKey: 'mock-service-role-key-for-unit-testing',
});

if (!client) {
  throw new Error('Client creation failed');
}
console.log('✓ Supabase client created successfully with custom options.');

// Test 2: Verify type definitions compile and structure correctly
type ProjectRow = Database['public']['Tables']['projects']['Row'];
type TaskRow = Database['public']['Tables']['tasks']['Row'];
type AgentRunRow = Database['public']['Tables']['agent_runs']['Row'];
type BudgetLedgerRow = Database['public']['Tables']['budget_ledgers']['Row'];

const mockProject: ProjectRow = {
  id: '11111111-1111-1111-1111-111111111111',
  user_id: '00000000-0000-0000-0000-000000000001',
  name: 'Test Project',
  slug: 'test-project',
  github_repo_full_name: 'test/repo',
  github_installation_id: 12345,
  default_branch: 'main',
  status: 'ACTIVE',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockTask: TaskRow = {
  id: '33333333-3333-3333-3333-333333333333',
  project_id: mockProject.id,
  milestone_id: null,
  user_id: mockProject.user_id,
  title: 'Test Task Title',
  prompt_raw: 'Test prompt description',
  specification: { userStories: ['As an architect, I want verified types'] },
  implementation_plan: { steps: [] },
  status: 'COMPLETED',
  priority: 'HIGH',
  retry_count: 0,
  max_retries: 3,
  target_branch: 'jarvis/task-test',
  pr_number: 101,
  version: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

console.log('✓ Strongly typed entity models validated: Project and Task.');
console.log('--- All @jarvis/database verification assertions passed! ---');
