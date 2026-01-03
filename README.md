# Replicator AI Terminal  
**Full-Stack Systems Engineering & Graph Debugging Assessment**

---

## Purpose of This Repository

This repository represents a **staged full-stack engineering exercise** focused on:

- Diagnosing complex runtime failures
- Instrumenting a live system without refactors
- Validating data contracts across pages
- Restoring functionality through **minimal, correct fixes**

The project intentionally runs in **real browser conditions** (no mocks, no test harness at first) to simulate production-style debugging rather than academic examples.

---

## What This System Is

Replicator AI Terminal is a **multi-agent orchestration interface** designed to let a human coordinate, monitor, and reason about complex work executed by multiple AI agents.

It has two primary surfaces:

### Page 1 — Dashboard (`index.html`)
- Task / mission intake
- Brief definition (objectives, constraints, success criteria)
- Agent recommendations
- Agent assignment (manual + assisted)
- Task orchestration
- Run creation and persistence

### Page 2 — Execution Graph (`graph.html`)
- Visual workflow graph
- Task and agent nodes
- Dependency edges
- Pan / zoom / auto-arrange
- Real-time execution feedback
- Debuggable execution surface

---

## Starting Point (Initial State)

- Static HTML + CSS + vanilla JavaScript
- Rich but fragile `graph.js` renderer
- No automated tests
- No runtime diagnostics
- Symptom: **`graph.html` loaded UI chrome but rendered no nodes or edges**
- Canvas appeared blank with no obvious error cause

This was treated as a **real incident**, not a contrived bug.

---

## Graph Debugging Assessment (Core Exercise)

### Objective
Instrument the runtime pipeline (without refactors) to **conclusively determine where graph rendering fails** and surface actionable evidence.

---

## What Was Implemented

### 1) Runtime Debug Pack (Non-Invasive)

A comprehensive diagnostic layer was added behind a single flag:

```js
DEBUG_GRAPH
