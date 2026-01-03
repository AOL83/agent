# Replicator AI Terminal  
**Full-Stack Systems Engineering, Graph Debugging & Product Vision**

---

## Overview

This repository documents a **real-world full-stack engineering assessment**, treated as a production incident rather than a toy problem.  

The project started with a broken execution graph (`graph.html`) and evolved into a validated **multi-agent orchestration system** with clear plans to become a full AI-driven task execution platform.

This README covers:
- What the system is
- What went wrong
- How it was debugged
- What has been fixed
- Where the project is going
- What remains to be built

---

## Purpose of This Repository

This repo represents a **staged full-stack engineering exercise** focused on:

- Diagnosing complex runtime failures
- Instrumenting a live system **without refactors**
- Validating data contracts across pages
- Debugging DOM, layout, state, and render pipelines
- Applying **minimal, correct fixes** instead of rewrites

The system runs in **real browser conditions**:
- No mocks
- No test harness
- No framework abstractions hiding failures

---

## What This System Is

**Replicator AI Terminal** is a **multi-agent orchestration interface** designed to let a user:

1. Describe a mission or task
2. Receive intelligent agent recommendations
3. Assign agents to work
4. Watch execution unfold visually
5. Track progress until completion

It has **two primary surfaces**:

---

## Page 1 — Dashboard (`index.html`)

### Purpose
Mission intake, planning, and agent assignment.

### Capabilities
- Task / mission description
- Brief definition:
  - Objectives
  - Constraints
  - Success criteria
- Agent compatibility analysis
- Agent highlighting (recommended vs optional vs missing)
- Manual drag-and-drop **or**
- One-click **Push / Pull assignment buttons**
- Run creation & persistence

### Intended User Experience
A non-technical user should be able to:
- Describe *what they want done*
- Be told *which agents are best*
- See *what skills are missing*
- Assign agents with confidence
- Launch execution without knowing how the system works internally

---

## Page 2 — Execution Graph (`graph.html`)

### Purpose
Visual execution and coordination.

### Capabilities
- Task nodes
- Agent nodes
- Links between agents and tasks
- Compatibility warnings
- Bottleneck detection
- Workspace team staging
- Fit-to-view & auto-arrange
- Reset & re-layout
- Debug snapshots

### Intended User Experience
The user should be able to:
- See work happening
- Understand who is doing what
- Observe dependencies and contention
- Track execution visually until completion

---

## Original Problem (Incident)

### Symptom
- `graph.html` loaded UI chrome
- **No nodes**
- **No edges**
- **Blank canvas**
- No obvious errors surfaced

### Constraints
- No refactor allowed
- Must debug the *actual* runtime pipeline
- Must produce evidence, not guesses

---

## What Was Implemented

### 1) Runtime Debug Pack (Non-Invasive)

A comprehensive diagnostic layer was added behind a single flag:


This logs and validates every critical stage of the render pipeline:

#### Run Resolution
- URL `runId`
- Fallback to `replicator_latest_run`
- LocalStorage key selection

#### Storage & Parsing
- JSON parse success/failure
- Payload shape verification
- Required keys presence

#### Data Contract Validation
- Task count
- Agent count
- Link count
- Sample IDs logged for sanity

#### DOM & Layout Truth
- Canvas size
- Viewport size
- World size
- Visibility state
- Scroll size checks
- Detection of `0x0` layouts

#### Render Pipeline
- Node creation counts
- Edge creation counts
- Post-render DOM child count

#### Camera & Transform State
- Pan values
- Zoom values
- Invalid transforms auto-reset to safe defaults

#### Post-Render Snapshot
- `requestAnimationFrame` snapshot after render
- Confirms final DOM state

---

### 2) Manual Debug Trigger

A **Debug Snapshot** button was added to `graph.html`.

It invokes:


This allows on-demand inspection of the entire render state without reloading.

---

### 3) On-Screen Failure Messaging

Instead of silent failure, the UI now shows:

#### Error Banner
- “Graph render failed: <reason>”

#### Placeholder Cards
- No data loaded
- Zero-size viewport
- Render pipeline failure

This ensures failures are visible to non-developers.

---

### 4) Root Cause Fix — TDZ Crash

#### Problem
`clampState` was referenced before initialization, causing:


This completely aborted rendering.

#### Fix
- Hoisted `clampState` into a proper **function declaration**
- Placed it **before** `createNode`
- Removed duplicate later definition

#### Result
- Crash eliminated
- Graph renders correctly
- Nodes and edges appear as expected

---

## Current State (Where We Are Now)

- Execution graph renders successfully
- Tasks and agents appear
- Compatibility panel works
- Bottlenecks detected
- Workspace staging functional
- Debug instrumentation remains available
- System is stable and observable

This stage represents a **successful incident resolution and stabilization milestone**.

---

## Product Vision (Where This Is Going)

### End Goal

A user should be able to:

1. Load *any task* into Page 1
2. Choose from:
   - Built-in agents
   - API-connected agents (OpenAI, Claude, Gemini, etc.)
3. See:
   - Recommended agents
   - Missing skill layers
   - Optimal pairings
4. Assign agents manually **or automatically**
5. Launch execution
6. Move to Page 2
7. **Watch work happen until completion**

---

## Planned Capabilities

### Agent Sources
- Built-in agents
- External AI APIs
- Tool-specific agents
- Human-in-the-loop agents

### Execution Feedback
- Animated edges showing communication direction
- Activity pulses while agents work
- Time-remaining indicators per task
- Progress states (idle / active / blocked / complete)

### Intelligence Layer
- Automatic agent selection
- Dynamic re-assignment
- Bottleneck mitigation
- Skill gap detection

---

## What It Will Take To Get There

### Technical Work Remaining
- Execution state engine
- Agent lifecycle states
- Task completion callbacks
- Real async execution hooks
- Progress tracking model

### Infrastructure
- API abstraction layer
- Secure credential handling
- Agent permission sandboxing
- Persistence beyond LocalStorage

### UX Enhancements
- Animations for execution flow
- Timeline indicators
- Status badges
- Completion summaries

### Testing (Future)
- Playwright for visual regression
- Contract tests for run payloads
- Execution simulation tests

---

## Why This Repo Matters

This was not just about fixing a graph.

It demonstrates:
- Real debugging discipline
- Full-stack reasoning
- Safe instrumentation
- Minimal, correct fixes
- Product thinking beyond the bug

This repository shows **how a system should be debugged, stabilized, and evolved** — the same way it would be done in production.

---

## Status

**✔ Debugging phase complete**  
**✔ Rendering restored**  
**✔ Instrumentation in place**  
**➡ Execution intelligence & automation next**

---

*This was treated as a real incident — not a contrived bug.*
