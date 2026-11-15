# JARVIS — UI/UX Product Specification
Version: 1.0  
Status: Approved design direction; detailed implementation decisions remain subject to validation  
Product: Personal AI command system and autonomous software-building assistant

## 1. Product experience

Jarvis is a personal AI command system whose primary responsibility is helping the owner build and manage software projects. The interface should feel like a cinematic, futuristic AI command centre—not a generic administration template—while remaining readable, accessible, fast and practical.

The interface must communicate:
- What Jarvis is doing.
- Which projects and agents are active.
- What has completed, failed or needs attention.
- Which decisions require the owner's approval.
- How much time and money work is consuming.
- How to stop, pause or inspect an operation.

The visual experience must never obscure safety, status, cost, or approval information.

## 2. Confirmed design decisions

| Area | Approved direction |
|---|---|
| Overall visual identity | Futuristic Jarvis / cinematic AI command centre |
| Main palette | Ice blue + cyan on deep midnight navy |
| Dashboard concept | AI-first interface |
| Home screen | Combined overview: central AI core plus projects, agents, approvals and system health |
| Information density | Adaptive: essential information first, details on demand |
| Device strategy | Adaptive responsive experience for desktop, tablet and mobile |
| Navigation | Futuristic interactive navigation; labels and conventional keyboard access remain available |
| AI core | Glowing holographic orb |
| AI core placement | Centre stage on the home screen |
| Conversation | Adaptive workspace that expands for chat, coding, research and approvals |
| Message presentation | Hybrid: conversational text plus structured cards, tables, charts, code and reports |
| Coding workspace | AI-first coding workspace |
| Agent monitoring | Combined agent cards, network visualization and activity timeline |
| Project browsing | Cards, Kanban, list and timeline views |
| Project detail | Adaptive workspace: overview first, specialist tools when needed |
| Approvals | Immediate alerts + dedicated approval centre + detailed confirmation panels |
| Analytics | Adaptive summaries with detailed charts and tables on demand |
| Notifications | Toast alerts + notification centre + live activity feed |
| Customization | Advanced: themes, colours, panels, widgets, presets, orb appearance and shortcuts |
| Motion | Cinematic visual effects, with reduced-motion and performance modes |

## 3. Visual design system

### 3.1 Colour foundations

Use semantic design tokens rather than hard-coded colours.

Suggested starting tokens:
- `--background`: `#07111F` (midnight navy)
- `--surface-1`: `#0B1728`
- `--surface-2`: `#101D30`
- `--surface-3`: `#17263A`
- `--border-subtle`: cool blue-grey with low opacity
- `--text-primary`: `#EAF4FF`
- `--text-secondary`: `#9FB0C5`
- `--accent-cyan`: `#22D3EE`
- `--accent-ice`: `#60A5FA`
- `--accent-violet`: optional restrained secondary accent, not dominant
- `--success`: `#34D399`
- `--warning`: `#FBBF24`
- `--danger`: `#FB7185`
- `--info`: `#60A5FA`

Cyan and ice blue identify active AI states and primary interactions. Green indicates verified success. Amber indicates warnings or pending decisions. Red indicates errors or dangerous conditions. Never communicate status by colour alone; always include labels or icons.

### 3.2 Typography

Use a highly readable modern sans-serif for interface text. Use a monospace font only for code, logs, identifiers and terminal output.

Hierarchy:
- Page title: clear and restrained.
- Section title: compact and scannable.
- Body: comfortable reading size and line height.
- Metadata: smaller but still legible.
- Code/logs: monospace with syntax highlighting.

Avoid excessive all-caps, tiny labels, low-contrast text and decorative sci-fi fonts for important information.

### 3.3 Surfaces and effects

Use:
- Deep navy backgrounds.
- Layered dark panels.
- Subtle cyan edge highlights.
- Restrained glass-like surfaces where they improve hierarchy.
- Soft shadows and controlled glow.
- Clear borders and focus rings.

Avoid:
- Excessive blur that reduces readability.
- Glow around every component.
- Constant particle effects behind dense text.
- Heavy 3D rendering that harms performance.
- Decorative effects that look like status indicators but have no functional meaning.

## 4. Global application shell

### 4.1 Desktop shell

The desktop experience should include:
- Futuristic navigation that can collapse to icons, with persistent text labels available.
- Main workspace.
- Optional contextual side panel.
- Global command/search entry point.
- Notification access.
- Profile and settings.
- System connectivity/health indicator.
- Keyboard shortcuts, including a command palette shortcut such as `Ctrl/Cmd + K`.

The user chose futuristic navigation, not an inaccessible radial-only menu. Use a distinctive visual treatment while retaining predictable navigation, readable labels, focus order and keyboard support.

### 4.2 Mobile shell

Mobile must not simply shrink the desktop UI. Recompose it around:
- Conversation and voice input.
- Active tasks and agent status.
- Approval requests.
- Notifications.
- Project summaries.
- Emergency pause/kill controls, protected against accidental activation.

Use a compact navigation pattern with clear labels. Ensure approval details and destructive-action consequences are readable without horizontal scrolling.

### 4.3 Tablet

Use an intermediate layout:
- Two-column workspace where practical.
- Collapsible contextual panels.
- Touch-friendly controls.
- Adaptive project and agent views.

## 5. Navigation and information architecture

Proposed primary destinations:
1. Home — central Jarvis command centre.
2. Conversations — chat history and AI interactions.
3. Projects — project portfolio and project workspaces.
4. Agents — agent status, runs, permissions and activity.
5. Approvals — pending decisions and approval history.
6. Idea Lab — idea discovery, validation and backlog (when implemented).
7. Memory — saved preferences, project knowledge and decisions.
8. Analytics — cost, usage, productivity and reliability.
9. Activity — notifications, event history and audit activity.
10. Settings — profile, integrations, autonomy, security and appearance.

Navigation must hide or label modules that are not yet implemented. Do not show non-functional navigation items as if they work. Future modules may be displayed as clearly marked “planned” only if that is useful and not misleading.

## 6. Home screen specification

The home screen is an AI-first combined overview.

### 6.1 Central AI core

A large holographic orb is the visual focal point. It must be implemented efficiently (CSS/SVG/canvas/WebGL only if justified) and must not block essential content.

States:
- Idle: slow, subtle pulse.
- Listening: reacts to microphone input only when permission is granted and capture is active.
- Thinking: animated rings or light movement.
- Speaking: audio-reactive motion when audio data is available.
- Coding: controlled flowing energy effect.
- Waiting for approval: amber status treatment plus a visible text label.
- Error/offline: clear warning state and explanatory text.

The orb is decorative/status visualization, not the only way to understand state. Always provide textual status and accessible labels.

### 6.2 Surrounding information

Show adaptive panels for:
- Active projects and milestone progress.
- Running agents and their current tasks.
- Pending approvals.
- Recent completed work.
- System health and connectivity.
- Current AI usage and budget status.
- Important alerts.

The initial view should not become overcrowded. Prioritize active work and decisions that require attention.

### 6.3 Command composer

Provide:
- Text input.
- Voice-note/voice input control, with explicit recording state and permission.
- File attachment where supported.
- Send control.
- Clear indication of selected project/context.
- Keyboard submission behaviour.
- Accessible labels and error handling.

Do not imply voice calling or continuous listening is implemented until it is actually integrated.

## 7. Conversation workspace

The conversation workspace expands when the user begins a task.

Support:
- Conversation history.
- Clear user/assistant distinction.
- Streaming responses where supported.
- Rich response cards.
- Code blocks with copy controls.
- Tables and charts.
- Source links and citations for research.
- File attachments and generated artifacts.
- Task references and project context.
- Approval cards.
- Retry/regenerate only where safe.
- Search and conversation organization.

Responses should adapt to the task:
- Normal questions: readable conversational answer.
- Planning: milestone and task cards.
- Coding: code diffs, changed files, tests and PR/commit status.
- Research: sources, evidence, comparisons and conclusions.
- Reports: summary, charts, details and downloadable outputs.
- Approval: action, target, consequences, cost, risks and explicit controls.

## 8. Coding workspace

The coding workspace is AI-first, not a full clone of VS Code.

Recommended layout:
- Left: repository/project file tree and changed-file list.
- Centre: Jarvis conversation and task instructions.
- Right: current task, agent status, plan and code-change summary.
- Bottom expandable area: logs, terminal output, test results and execution details.

Provide views or tabs for:
- Task brief.
- Plan and milestones.
- Files changed.
- Diff viewer.
- Test results.
- Agent activity.
- Execution logs.
- Commit and GitHub status.

Clearly distinguish:
- Proposed changes.
- Locally applied changes.
- Committed changes.
- Pushed changes.
- Deployed changes.

Never display “deployed” merely because a build succeeded.

## 9. Agent monitoring

Provide three complementary views:
1. Agent cards: agent identity/type, task, status, start time, elapsed time and progress.
2. Network visualization: relationships and handoffs between agents; use only real task relationships, not decorative invented links.
3. Activity timeline: chronological events with timestamps and outcomes.

Statuses should include:
- Queued.
- Starting.
- Running.
- Waiting for input.
- Waiting for approval.
- Testing.
- Completed.
- Failed.
- Cancelled.
- Paused.

Provide inspect, pause, resume and cancel actions only when the backend supports them and the action is authorized. Explain whether an action stops a process, prevents new work or merely changes its display state.

## 10. Project management

Support four synchronized views:
- Cards.
- Kanban.
- List/table.
- Timeline.

Keep filters, sorting and selected project context consistent when switching views.

Project cards should show:
- Name and short description.
- Status and health.
- Current milestone.
- Progress derived from actual completed work.
- Active agents.
- Next deadline, if configured.
- Budget/usage summary where available.
- Last activity.

Do not invent percentages. Define progress calculations and display unknown values honestly.

### Project detail workspace

Default to an executive overview:
- Project purpose.
- Health/status.
- Current milestone.
- Completed and remaining work.
- Risks and blockers.
- Recent activity.
- Budget and resource use.

Expand specialist tools on demand:
- Tasks.
- Agents.
- Repository.
- Code changes.
- Tests.
- Deployments.
- Activity.
- Settings.

## 11. Approval centre

Approval requests are safety-critical UI.

Each request must clearly show:
- What action is requested.
- Which system/account/repository/environment is affected.
- Why Jarvis wants to do it.
- Exact scope of the action.
- Expected outcome.
- Risks and reversibility.
- Estimated cost, if any.
- Relevant test/review evidence.
- Expiration or timeout, if applicable.

Controls:
- Approve.
- Reject.
- Request changes / ask Jarvis to revise.

High-risk actions require deliberate confirmation and, where appropriate, re-authentication. Do not use ambiguous button labels such as “OK” for dangerous actions.

The UI must never imply approval was successful until the backend confirms it. Prevent replay, duplicate approval and approval of stale requests.

## 12. Analytics

Use adaptive analytics:
- Summary cards first.
- Detailed charts and tables on demand.
- Filters by project, model, agent, date and task.
- Export where appropriate.

Metrics may include:
- AI spend (actual vs estimated).
- Token usage.
- Requests by provider/model.
- Task completion and failure rates.
- Time per task.
- Agent utilization.
- Test outcomes.
- Queue wait time.
- System uptime/availability where measured.

Clearly label estimated, provider-reported and measured values. Never invent uptime or cost data.

## 13. Notifications and activity

Use:
1. Temporary toast alerts.
2. Searchable notification centre.
3. Chronological live activity feed.

Notification levels:
- Critical security.
- Approval required.
- Failure/blocker.
- Warning.
- Completion.
- Informational.

Allow read/unread, filtering and navigation to the related task/project. Critical alerts must not disappear without being retained in history.

## 14. Customization

Support:
- Theme and accent selection.
- Dashboard panel arrangement and sizing.
- Show/hide widgets.
- Saved workspace presets (Home, Coding, Research, Monitoring).
- Orb appearance options.
- Animation intensity.
- Keyboard shortcuts.
- Reset to default.

Persist user preferences safely. Provide sensible defaults and do not let customization break responsive layouts or accessibility.

## 15. Motion and performance

Default direction: cinematic animations.

Use:
- Orb animation.
- Energy rings.
- Ambient particles, sparingly.
- Smooth transitions.
- Live data indicators.
- Meaningful activity animations.

Requirements:
- Respect `prefers-reduced-motion`.
- Provide an in-app reduced-motion setting.
- Provide low-performance mode.
- Pause nonessential animations when the tab is hidden.
- Avoid continuous high-CPU/GPU effects.
- Never animate important text in a way that harms reading.
- Provide static fallbacks.

## 16. Accessibility and usability

Minimum requirements:
- Keyboard navigation across all interactive controls.
- Visible focus indicators.
- Semantic HTML.
- Screen-reader labels for icon-only controls.
- Adequate contrast.
- No status communicated by colour alone.
- Reduced motion.
- Touch targets suitable for mobile.
- Responsive text and layout.
- Clear empty, loading, offline, error and reconnecting states.

## 17. UI engineering and component standards

Use reusable components and design tokens. Prefer a consistent component system (for example shadcn/ui with Tailwind CSS) and document deviations.

Suggested component groups:
- AppShell
- FuturisticNavigation
- CommandPalette
- JarvisOrb
- CommandComposer
- ConversationThread
- RichResponseCard
- ProjectCard
- ProjectViewSwitcher
- ProjectOverview
- AgentCard
- AgentNetwork
- AgentTimeline
- ApprovalCard
- ApprovalDetailPanel
- NotificationCentre
- ActivityFeed
- AnalyticsCard
- ChartPanel
- CodeDiffViewer
- TestResultPanel
- ExecutionLogPanel
- ResponsiveWorkspace
- ThemeCustomizer
- AccessibilitySettings

Use server state and client state deliberately. Avoid duplicating authoritative backend state in multiple components.

## 18. UI acceptance criteria

The UI specification is implemented only when:
- Desktop, tablet and mobile layouts are usable.
- Home screen shows actual backend data or honest empty states.
- Orb states reflect real application state.
- Conversation workspace supports the implemented message types.
- Project views show consistent underlying data.
- Agent monitoring reflects actual runs and events.
- Approval details show exact action scope and risks.
- Approvals cannot be triggered accidentally or replayed.
- Notifications persist and link to relevant records.
- Analytics distinguish actual from estimated values.
- Customization persists and can be reset.
- Reduced-motion and low-performance modes work.
- Keyboard and screen-reader basics are tested.
- Loading, offline, error and empty states are implemented.
- No placeholder feature is presented as operational.

## 19. Implementation guidance

Before frontend implementation:
1. Inspect the existing product and architecture documentation.
2. Reconcile this specification with approved product requirements.
3. Create screen wireframes or low-fidelity layouts.
4. Create design tokens and component inventory.
5. Implement the application shell and responsive navigation.
6. Implement the home screen.
7. Implement conversation and coding workspaces.
8. Implement projects, agents and approvals.
9. Implement analytics, notifications and customization.
10. Run visual, accessibility, responsive and functional tests.

Do not build all screens as one giant component. Do not create decorative controls that do nothing. Any visible control must either work or be clearly marked as not yet available.

End result: a premium, cinematic, responsive AI command centre that remains trustworthy, accessible, understandable and safe.
