# JARVIS — Screen Inventory and Interaction Map
Version: 1.0

## Primary navigation

| Screen | Purpose | Primary content |
|---|---|---|
| Home | Main AI command centre | Orb, command composer, projects, agents, approvals, health |
| Conversations | Chat and task history | Threads, rich responses, attachments, sources |
| Projects | Portfolio management | Cards, Kanban, list, timeline |
| Project workspace | Project-level operations | Overview, tasks, repository, agents, tests, activity |
| Agents | Agent operations | Agent cards, network, timeline, run details |
| Coding workspace | AI-assisted development | Conversation, files, diffs, tests, logs |
| Approvals | Human decision centre | Pending requests, risk, scope, cost, decision history |
| Idea Lab | Product discovery | Ideas, scoring, competitor research, briefs, backlog |
| Memory | Persistent knowledge | Preferences, project memory, decisions, searchable records |
| Analytics | Performance and cost | Spend, model use, task success, reliability |
| Notifications | Alerts and history | Toasts, notification centre, activity feed |
| Settings | Personalization and controls | Integrations, autonomy, security, theme, accessibility |

## Key user journeys

### Journey 1: Start a coding task
1. Open Home or Conversations.
2. Enter task text or attach a specification.
3. Select project/repository context.
4. Jarvis clarifies missing requirements.
5. User approves the task plan where required.
6. Coding workspace opens.
7. User monitors progress, files, tests and logs.
8. Jarvis presents the verified result and GitHub status.

### Journey 2: Review an approval
1. Notification arrives.
2. User opens Approval Centre.
3. Review action, target, scope, consequences, risks and cost.
4. Inspect supporting evidence.
5. Approve, reject or request changes.
6. UI waits for backend confirmation.
7. Decision appears in audit history.

### Journey 3: Monitor agents
1. Open Agents.
2. Review cards and status.
3. Inspect network handoffs.
4. Open activity timeline.
5. Select an agent run to inspect logs and artifacts.
6. Pause/cancel only if backend confirms support and authorization.

### Journey 4: Review project health
1. Open Projects.
2. Choose cards, Kanban, list or timeline.
3. Open a project.
4. Review executive overview.
5. Expand tasks, agents, repository, tests or activity.
6. Inspect blockers and next actions.

### Journey 5: Review costs
1. Open Analytics.
2. Review monthly spend and daily usage.
3. Filter by project, model, agent or task.
4. Distinguish actual charges from estimates.
5. Review budget threshold and reserve approval status.

## Responsive behaviour

### Desktop
- Full navigation and multi-panel workspace.
- Central orb on Home.
- Expandable right/left context panels.
- Detailed coding and analytics views.

### Tablet
- Collapsible navigation.
- Two-panel layout where possible.
- Drawer or tabs for secondary panels.
- Touch-friendly action controls.

### Mobile
- Compact labelled navigation.
- Conversation, approvals, active tasks and notifications prioritized.
- Project and agent details displayed as stacked panels.
- Approval review must remain fully readable.
- Emergency controls require confirmation.

## Global states

Every data-backed screen must define:
- Initial loading.
- Empty state.
- Partial data.
- Error state.
- Offline state.
- Reconnecting state.
- Permission denied.
- Stale data.
- Successful action.
- Action pending confirmation.

## Control behaviour requirements

- No dead buttons.
- No misleading status indicators.
- No optimistic success for approvals or external actions.
- Disable duplicate submission while an action is processing.
- Show clear failure feedback.
- Keep audit-sensitive actions traceable.
