const DEBUG_GRAPH = true;

const sizeCaps = {
  S: 1,
  M: 3,
  L: 5,
  XL: 8,
};

const coordinationMultiplier = (count) => {
  if (count <= 1) return 1.0;
  if (count === 2) return 1.12;
  if (count === 3) return 1.18;
  return 0.95;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const debugLog = (...args) => {
  if (!DEBUG_GRAPH) return;
  console.log(...args);
};

const debugGroupCollapsed = (label) => {
  if (!DEBUG_GRAPH) return null;
  console.groupCollapsed(label);
  return label;
};

const debugGroupEnd = (label) => {
  if (!DEBUG_GRAPH || !label) return;
  console.groupEnd();
};

const formatRect = (rect) =>
  rect
    ? {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      }
    : null;

const getDatasetIds = (nodes) =>
  nodes
    .map((node) => node?.dataset?.id)
    .filter(Boolean)
    .slice(0, 5);

const debugSnapshot = (stage, run) => {
  if (!DEBUG_GRAPH) return;
  const params = new URLSearchParams(window.location.search);
  const urlRunId = params.get("runId");
  const latestRunId = localStorage.getItem("replicator_latest_run");
  const chosenRunId = urlRunId || latestRunId;
  const storageKey = chosenRunId ? `replicator_run_${chosenRunId}` : null;
  const graphCanvas = document.getElementById("graphCanvas");
  const graphViewport = document.getElementById("graphViewport");
  const graphWorld = document.getElementById("graphWorld");
  const rectCanvas = graphCanvas?.getBoundingClientRect();
  const rectViewport = graphViewport?.getBoundingClientRect();
  const rectWorld = graphWorld?.getBoundingClientRect();
  const computedCanvas = graphCanvas ? window.getComputedStyle(graphCanvas) : null;
  const computedViewport = graphViewport ? window.getComputedStyle(graphViewport) : null;
  const computedWorld = graphWorld ? window.getComputedStyle(graphWorld) : null;
  const children = graphWorld ? Array.from(graphWorld.children) : [];
  const childDatasetIds = getDatasetIds(children);
  const keys = run ? Object.keys(run) : [];
  const tasksLength = Array.isArray(run?.tasks) ? run.tasks.length : 0;
  const agentsLength = Array.isArray(run?.agents) ? run.agents.length : 0;
  const links = run?.links || {};
  const linkCounts = {
    agentToTask: Array.isArray(links.agentToTask) ? links.agentToTask.length : 0,
    agentToAgent: Array.isArray(links.agentToAgent) ? links.agentToAgent.length : 0,
  };
  const edgesLength = linkCounts.agentToTask + linkCounts.agentToAgent;
  const taskIds = Array.isArray(run?.tasks) ? run.tasks.map((task) => task.id).filter(Boolean) : [];
  const agentIds = Array.isArray(run?.agents) ? run.agents.map((agent) => agent.id).filter(Boolean) : [];

  const taskPositions = Array.isArray(run?.tasks) ? run.tasks.map((task) => task.pos).filter(Boolean) : [];
  const agentPositions = Array.isArray(run?.agents) ? run.agents.map((agent) => agent.pos).filter(Boolean) : [];
  const positions = [...taskPositions, ...agentPositions];
  const positionBounds =
    positions.length > 0
      ? positions.reduce(
          (acc, pos) => {
            const x = Number.isFinite(pos?.x) ? pos.x : null;
            const y = Number.isFinite(pos?.y) ? pos.y : null;
            if (x === null || y === null) return acc;
            acc.minX = acc.minX === null ? x : Math.min(acc.minX, x);
            acc.maxX = acc.maxX === null ? x : Math.max(acc.maxX, x);
            acc.minY = acc.minY === null ? y : Math.min(acc.minY, y);
            acc.maxY = acc.maxY === null ? y : Math.max(acc.maxY, y);
            return acc;
          },
          { minX: null, maxX: null, minY: null, maxY: null }
        )
      : null;
  const worldBounds = formatRect(rectWorld);
  const positionsInsideWorld =
    positionBounds && worldBounds
      ? {
          withinX:
            positionBounds.minX !== null &&
            positionBounds.maxX !== null &&
            positionBounds.minX >= 0 &&
            positionBounds.maxX <= worldBounds.width,
          withinY:
            positionBounds.minY !== null &&
            positionBounds.maxY !== null &&
            positionBounds.minY >= 0 &&
            positionBounds.maxY <= worldBounds.height,
        }
      : null;

  const groupLabel = debugGroupCollapsed("POST-RENDER CHECK");
  debugLog("stage", stage);
  debugLog("runId", { urlRunId, latestRunId, chosenRunId });
  debugLog("storageKey", storageKey);
  debugLog("run keys", keys);
  debugLog("counts", { tasksLength, agentsLength, edgesLength, linkCounts });
  debugLog("sample ids", { taskIds: taskIds.slice(0, 5), agentIds: agentIds.slice(0, 5) });
  debugLog("graphWorld children", {
    count: children.length,
    childDatasetIds,
  });
  debugLog("rects", {
    canvas: formatRect(rectCanvas),
    viewport: formatRect(rectViewport),
    world: formatRect(rectWorld),
  });
  debugLog("styles", {
    canvas: computedCanvas ? { display: computedCanvas.display, visibility: computedCanvas.visibility } : null,
    viewport: computedViewport ? { display: computedViewport.display, visibility: computedViewport.visibility } : null,
    world: computedWorld ? { display: computedWorld.display, visibility: computedWorld.visibility } : null,
  });
  debugLog("positions", { positionBounds, positionsInsideWorld });
  debugGroupEnd(groupLabel);
};

const showGraphErrorBanner = (message) => {
  const graphCanvas = document.getElementById("graphCanvas");
  if (!graphCanvas) return;
  let banner = graphCanvas.querySelector(".graph-error-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.className = "graph-error-banner";
    banner.style.position = "absolute";
    banner.style.top = "12px";
    banner.style.left = "12px";
    banner.style.right = "12px";
    banner.style.padding = "12px 16px";
    banner.style.background = "rgba(210, 70, 70, 0.95)";
    banner.style.color = "#fff";
    banner.style.fontWeight = "600";
    banner.style.borderRadius = "12px";
    banner.style.zIndex = "40";
    banner.style.boxShadow = "0 16px 40px rgba(0,0,0,0.25)";
    graphCanvas.appendChild(banner);
  }
  banner.textContent = message;
};

const loadRun = () => {
  const groupLabel = debugGroupCollapsed("RUN LOAD");
  const params = new URLSearchParams(window.location.search);
  const urlRunId = params.get("runId");
  const latestRunId = localStorage.getItem("replicator_latest_run");
  const runId = urlRunId || latestRunId;
  const storageKey = runId ? `replicator_run_${runId}` : null;
  debugLog("runId source", { urlRunId, latestRunId, chosenRunId: runId });
  debugLog("storageKey", storageKey);
  const raw = storageKey ? localStorage.getItem(storageKey) : null;
  debugLog("storageValueType", raw ? "json" : "null");
  let parsed = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
      debugLog("parseSuccess", true);
      debugLog("payloadKeys", Object.keys(parsed || {}));
      debugLog("tasksLength", Array.isArray(parsed.tasks) ? parsed.tasks.length : "missing");
      debugLog("agentsLength", Array.isArray(parsed.agents) ? parsed.agents.length : "missing");
      debugLog("sampleTaskIds", Array.isArray(parsed.tasks) ? parsed.tasks.map((task) => task.id).slice(0, 5) : []);
      debugLog("sampleAgentIds", Array.isArray(parsed.agents) ? parsed.agents.map((agent) => agent.id).slice(0, 5) : []);
    } catch (error) {
      debugLog("parseSuccess", false, error);
    }
  }
  debugGroupEnd(groupLabel);
  if (!runId) {
    debugLog("RUN LOAD abort", "missing runId");
    return null;
  }
  if (!raw || !parsed) {
    debugLog("RUN LOAD abort", "missing or unparsable storage");
    return null;
  }
  return { runId, data: parsed };
};

const saveRun = (run) => {
  localStorage.setItem(`replicator_run_${run.runId}`, JSON.stringify(run));
};

const getInitials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const setGauge = (gauge, value) => {
  if (!gauge) return;
  const clamped = clamp(value, 0, 100);
  gauge.style.setProperty("--gauge-value", clamped);
  const valueEl = gauge.querySelector(".gauge-value");
  if (valueEl) valueEl.textContent = `${Math.round(clamped)}`;
};

const evaluateTeam = (workspaceAgentIds, agents) => {
  const selectedAgents = workspaceAgentIds
    .map((id) => agents.find((agent) => agent.id === id))
    .filter(Boolean);
  const pairStatus = {};
  const warnings = [];
  const coverage = new Set();
  const recommendedStacks = new Set();

  selectedAgents.forEach((agent) => {
    const tags = agent.tags || [];
    const stacks = agent.recommendedStacks || [];
    tags.forEach((tag) => coverage.add(tag));
    stacks.forEach((stack) => recommendedStacks.add(stack));
  });

  const countsByTag = selectedAgents.reduce((acc, agent) => {
    (agent.tags || []).forEach((tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {});

  const requiredTags = ["frontend", "backend", "db", "devops"];
  requiredTags.forEach((tag) => {
    if (!coverage.has(tag)) {
      warnings.push(`No ${tag} layer agent present.`);
    }
  });

  selectedAgents.forEach((agent) => {
    let score = 0;
    const reasons = [];
    const tags = agent.tags || [];
    if (tags.includes("frontend") && coverage.has("backend")) {
      score += 3;
      reasons.push("Frontend + backend pairing unlocked.");
    }
    if (tags.includes("backend") && coverage.has("devops")) {
      score += 2;
      reasons.push("Backend + DevOps alignment.");
    }
    if (tags.includes("ui") && (agent.codeBadge === "REACT" || agent.codeBadge === "NODE")) {
      score += 2;
      reasons.push("UI + JS/TS synergy.");
    }
    if (agent.conflictsWithTags) {
      const conflicts = agent.conflictsWithTags.filter((tag) => coverage.has(tag));
      if (conflicts.length) {
        score -= 4;
        reasons.push(`Conflict with ${conflicts.join(", ")} coverage.`);
      }
    }

    tags.forEach((tag) => {
      if (countsByTag[tag] > 2) {
        score -= 3;
        reasons.push(`Redundant ${tag} coverage.`);
      }
    });

    let status = "neutral";
    if (score >= 3) status = "good";
    if (score <= 0) status = "bad";

    pairStatus[agent.id] = { status, reasons };
  });

  const canBuild = [];
  if (coverage.has("frontend") && coverage.has("backend")) {
    canBuild.push("Customer-facing dashboards and portals");
  }
  if (coverage.has("backend") && coverage.has("data")) {
    canBuild.push("Data pipelines with analytics layers");
  }
  if (coverage.has("security")) {
    canBuild.push("Compliance-ready secure services");
  }
  if (coverage.has("devops")) {
    canBuild.push("Automated deployment and monitoring stacks");
  }

  return {
    pairStatus,
    teamReport: {
      canBuild,
      recommendedStacks: Array.from(recommendedStacks),
      warnings,
      coverage: Array.from(coverage),
    },
  };
};

const evaluateAgentPair = (agentA, agentB) => {
  if (!agentA || !agentB) return { status: "neutral", reasons: [] };
  const tags = new Set([...(agentA.tags || []), ...(agentB.tags || [])]);
  let score = 0;
  const reasons = [];
  if ((agentA.tags || []).includes("frontend") && tags.has("backend")) {
    score += 3;
    reasons.push("Frontend + backend pairing unlocked.");
  }
  if ((agentA.tags || []).includes("backend") && tags.has("devops")) {
    score += 2;
    reasons.push("Backend + DevOps alignment.");
  }
  if ((agentA.tags || []).includes("ui") && (agentA.codeBadge === "REACT" || agentA.codeBadge === "NODE")) {
    score += 2;
    reasons.push("UI + JS/TS synergy.");
  }
  const conflicts = [];
  (agentA.conflictsWithTags || []).forEach((tag) => {
    if (tags.has(tag)) conflicts.push(tag);
  });
  (agentB.conflictsWithTags || []).forEach((tag) => {
    if (tags.has(tag)) conflicts.push(tag);
  });
  if (conflicts.length) {
    score -= 4;
    reasons.push(`Conflict with ${[...new Set(conflicts)].join(", ")} coverage.`);
  }

  let status = "neutral";
  if (score >= 3) status = "good";
  if (score <= 0) status = "bad";
  return { status, reasons };
};

const normalizeAgentLink = (fromId, toId) => {
  return [fromId, toId].sort();
};

let graphListenersBound = false;
let activeDrag = null;
let graphContext = null;

const renderGraph = (run) => {
  const groupLabel = debugGroupCollapsed("RENDER PIPELINE");
  try {
    debugLog("renderGraph called", Boolean(run));
    debugLog("renderGraph runId", run?.runId);
    if (!run) {
      debugLog("renderGraph abort", "missing run");
      return;
    }
  const expectedContract = {
    tasks: "array",
    agents: "array",
    assignments: "object",
    links: "object",
  };
  const foundContract = {
    tasks: Array.isArray(run?.tasks) ? "array" : typeof run?.tasks,
    agents: Array.isArray(run?.agents) ? "array" : typeof run?.agents,
    assignments: run?.assignments === null ? "null" : typeof run?.assignments,
    links: run?.links === null ? "null" : typeof run?.links,
  };
  if (expectedContract.tasks !== foundContract.tasks || expectedContract.agents !== foundContract.agents) {
    debugLog("GRAPH data contract mismatch", { expected: expectedContract, found: foundContract });
  } else {
    debugLog("GRAPH data contract ok", { expected: expectedContract, found: foundContract });
  }
  debugLog("GRAPH data counts", {
    tasks: Array.isArray(run?.tasks) ? run.tasks.length : "missing",
    agents: Array.isArray(run?.agents) ? run.agents.length : "missing",
    assignments: run?.assignments ? Object.keys(run.assignments).length : "missing",
  });
  const runMeta = document.getElementById("runMeta");
  const efficiencyScore = document.getElementById("efficiencyScore");
  const overallGauge = document.getElementById("overallGauge");
  const graphCanvas = document.getElementById("graphCanvas");
  const graphViewport = document.getElementById("graphViewport");
  const graphWorld = document.getElementById("graphWorld");
  const graphEdges = document.getElementById("graphEdges");
  const workspaceList = document.getElementById("workspaceList");
  const teamReport = document.getElementById("teamReport");
  const compatibilityPanel = document.getElementById("compatibilityPanel");
  const fitViewBtn = document.getElementById("fitViewBtn");
  const autoArrangeBtn = document.getElementById("autoArrangeBtn");
  const resetGraphBtn = document.getElementById("resetGraphBtn");
  const debugSnapshotBtn = document.getElementById("debugSnapshotBtn");
  const connectHint = document.getElementById("connectHint");
  const connectHintText = document.getElementById("connectHintText");
  const cancelConnectBtn = document.getElementById("cancelConnectBtn");
  [
    ["#graphCanvas", graphCanvas],
    ["#graphViewport", graphViewport],
    ["#graphWorld", graphWorld],
    ["#graphEdges", graphEdges],
    ["#runMeta", runMeta],
    ["#efficiencyScore", efficiencyScore],
    ["#overallGauge", overallGauge],
    ["#workspaceList", workspaceList],
    ["#teamReport", teamReport],
    ["#compatibilityPanel", compatibilityPanel],
    ["#fitViewBtn", fitViewBtn],
    ["#autoArrangeBtn", autoArrangeBtn],
    ["#resetGraphBtn", resetGraphBtn],
    ["#debugSnapshotBtn", debugSnapshotBtn],
    ["#connectHint", connectHint],
    ["#cancelConnectBtn", cancelConnectBtn],
  ].forEach(([selector, node]) => {
    if (!node) {
      debugLog("DOM missing", selector);
    }
  });

  if (!graphCanvas || !graphViewport || !graphWorld || !graphEdges) {
    debugLog("renderGraph abort", "missing required DOM elements");
    showGraphErrorBanner("Graph render failed: missing required DOM elements.");
    return;
  }

  if (debugSnapshotBtn) {
    debugSnapshotBtn.addEventListener("click", () => window.__graphDebugSnapshot?.());
  }

  const domSizeGroup = debugGroupCollapsed("DOM SIZES");
  debugLog("graphCanvas rect", formatRect(graphCanvas?.getBoundingClientRect()));
  debugLog("graphViewport rect", formatRect(graphViewport?.getBoundingClientRect()));
  debugLog("graphWorld rect", formatRect(graphWorld?.getBoundingClientRect()));
  if (graphCanvas) {
    const styles = window.getComputedStyle(graphCanvas);
    debugLog("graphCanvas styles", { display: styles.display, visibility: styles.visibility });
    debugLog("graphCanvas scroll", {
      width: graphCanvas.scrollWidth,
      height: graphCanvas.scrollHeight,
    });
  }
  if (graphViewport) {
    const styles = window.getComputedStyle(graphViewport);
    debugLog("graphViewport styles", { display: styles.display, visibility: styles.visibility });
    debugLog("graphViewport scroll", {
      width: graphViewport.scrollWidth,
      height: graphViewport.scrollHeight,
    });
  }
  if (graphWorld) {
    const styles = window.getComputedStyle(graphWorld);
    debugLog("graphWorld styles", { display: styles.display, visibility: styles.visibility });
    debugLog("graphWorld scroll", {
      width: graphWorld.scrollWidth,
      height: graphWorld.scrollHeight,
    });
  }
  debugGroupEnd(domSizeGroup);

  window.__graphDebugSnapshot = () => debugSnapshot("manual", run);

  const migrateRun = (runData) => {
    runData.version = runData.version || 1;
    runData.workspaceAgentIds = runData.workspaceAgentIds || [];
    runData.links = runData.links || { agentToTask: [], agentToAgent: [] };
    runData.links.agentToTask = runData.links.agentToTask.map((link) => {
      if (link.fromAgentId) {
        return {
          agentId: link.fromAgentId,
          taskId: link.toTaskId,
          createdAt: link.createdAt || new Date().toISOString(),
          assignOnConnect: link.assignOnConnect ?? true,
        };
      }
      return link;
    });
    runData.links.agentToAgent = runData.links.agentToAgent.map((link) => {
      if (link.fromAgentId) {
        return {
          a: link.fromAgentId,
          b: link.toAgentId,
          createdAt: link.createdAt || new Date().toISOString(),
        };
      }
      return link;
    });
    runData.assignments = runData.assignments || {};
    return runData;
  };

  run = migrateRun(run);
  saveRun(run);

  runMeta.textContent = `Run: ${run.runId} • ${new Date(run.createdAt).toLocaleString()}`;

  const nodes = new Map();
  const nodeStates = new Map();
  const nodeSizes = new Map();
  const edgePaths = new Map();
  let rafPending = false;
  let expandedAgentId = null;
  let selectedNodeId = null;
  let selectedNodeType = null;
  let settleIterations = 0;
  let needsLayout = false;
  let measureNeeded = true;
  let pipelineAborted = false;

  const showPlaceholder = (message) => {
    if (!graphCanvas) return;
    let placeholder = graphCanvas.querySelector(".graph-placeholder");
    if (!placeholder) {
      placeholder = document.createElement("div");
      placeholder.className = "graph-placeholder";
      placeholder.style.position = "absolute";
      placeholder.style.top = "50%";
      placeholder.style.left = "50%";
      placeholder.style.transform = "translate(-50%, -50%)";
      placeholder.style.padding = "16px 20px";
      placeholder.style.background = "rgba(15, 23, 42, 0.9)";
      placeholder.style.color = "#fff";
      placeholder.style.borderRadius = "14px";
      placeholder.style.fontSize = "14px";
      placeholder.style.textAlign = "center";
      placeholder.style.zIndex = "30";
      graphCanvas.appendChild(placeholder);
    }
    placeholder.textContent = message;
  };

  // CONNECT MODE STATE
  const uiState = {
    mode: "idle",
    sourceAgentId: null,
  };

  const setConnectMode = (mode = "idle", sourceAgentId = null) => {
    uiState.mode = mode;
    uiState.sourceAgentId = sourceAgentId;
    graphCanvas.classList.toggle("connect-mode", mode !== "idle");
    if (connectHint) {
      connectHint.classList.toggle("hidden", mode === "idle");
      if (connectHintText) {
        connectHintText.textContent =
          mode === "connect-task"
            ? "Select a task to connect — ESC to cancel"
            : mode === "connect-agent"
              ? "Select an agent to connect — ESC to cancel"
              : "Connect mode";
      }
    }
    updateSelectableNodes();
    scheduleRender();
  };

  const cancelConnectMode = () => {
    setConnectMode("idle", null);
  };

  const updateSelectableNodes = () => {
    nodes.forEach((node) => node.classList.remove("selectable", "good", "bad"));
    if (uiState.mode !== "idle" && uiState.sourceAgentId) {
      const compat = computeCompatibility(uiState.sourceAgentId);
      nodes.forEach((node) => {
        if (node.dataset.type !== "agent") return;
        if (compat.good.includes(node.dataset.id)) node.classList.add("good");
        if (compat.bad.includes(node.dataset.id)) node.classList.add("bad");
      });
    }
    if (uiState.mode === "connect-task") {
      nodes.forEach((node) => {
        if (node.dataset.type === "task") node.classList.add("selectable");
      });
    }
    if (uiState.mode === "connect-agent") {
      nodes.forEach((node) => {
        if (node.dataset.type === "agent" && node.dataset.id !== uiState.sourceAgentId) {
          node.classList.add("selectable");
        }
      });
    }
  };

  const computeCompatibility = (sourceAgentId) => {
    const source = run.agents.find((agent) => agent.id === sourceAgentId);
    if (!source) return { good: [], bad: [], neutral: [], reasons: {} };
    const sourceTags = source.tags || [];
    const sourceConflicts = source.conflictsWithTags || [];
    const result = { good: [], bad: [], neutral: [], reasons: {} };
    run.agents.forEach((agent) => {
      if (agent.id === sourceAgentId) return;
      const targetTags = agent.tags || [];
      const targetConflicts = agent.conflictsWithTags || [];
      const conflictHit =
        sourceConflicts.some((tag) => targetTags.includes(tag)) ||
        targetConflicts.some((tag) => sourceTags.includes(tag));
      const complementHit =
        (sourceTags.includes("frontend") && targetTags.includes("backend")) ||
        (sourceTags.includes("backend") && targetTags.includes("devops")) ||
        (sourceTags.includes("data") && targetTags.includes("backend")) ||
        (sourceTags.includes("security") && targetTags.includes("backend"));
      const sharedTag = sourceTags.some((tag) => targetTags.includes(tag));
      if (conflictHit) {
        result.bad.push(agent.id);
        result.reasons[agent.id] = "Conflict in role coverage";
      } else if (complementHit || sharedTag) {
        result.good.push(agent.id);
      } else {
        result.neutral.push(agent.id);
      }
    });
    return result;
  };

  // RAF PIPELINE
  const scheduleRender = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(renderFrame);
  };

  const camera = {
    x: 0,
    y: 0,
    scale: 1,
    isPanning: false,
    startX: 0,
    startY: 0,
  };

  const setExpandedAgent = (agentId) => {
    expandedAgentId = expandedAgentId === agentId ? null : agentId;
    run.agents.forEach((agent) => {
      const node = nodes.get(agent.id);
      if (!node) return;
      node.classList.toggle("expanded", expandedAgentId === agent.id);
    });
    const node = nodes.get(agentId);
    if (node) {
      const width = node.offsetWidth || 180;
      const height = node.offsetHeight || 120;
      nodeSizes.set(agentId, { w: width, h: height });
      const state = nodeStates.get(agentId);
      if (state) {
        state.width = width;
        state.height = height;
      }
    }
    measureNeeded = true;
    scheduleRender();
  };

  const clearExpanded = () => {
    expandedAgentId = null;
    run.agents.forEach((agent) => {
      const node = nodes.get(agent.id);
      if (node) node.classList.remove("expanded");
    });
  };

  const setSelectedNode = (id, type) => {
    selectedNodeId = id;
    selectedNodeType = type;
    graphContext.selectedNodeId = id;
    graphContext.selectedNodeType = type;
  };

  const assignOnConnect = true;

  const normalizePair = (a, b) => normalizeAgentLink(a, b);

  const hasAgentAgentLink = (agentA, agentB) => {
    const [a, b] = normalizePair(agentA, agentB);
    return run.links.agentToAgent.some((link) => link.a === a && link.b === b);
  };

  const toggleAgentAgentLink = (agentA, agentB) => {
    const [a, b] = normalizePair(agentA, agentB);
    if (hasAgentAgentLink(a, b)) {
      run.links.agentToAgent = run.links.agentToAgent.filter((link) => !(link.a === a && link.b === b));
    } else {
      run.links.agentToAgent.push({ a, b, createdAt: new Date().toISOString() });
    }
    syncAll();
  };

  const hasAgentTaskLink = (agentId, taskId) =>
    run.links.agentToTask.some((link) => link.agentId === agentId && link.taskId === taskId);

  const toggleAgentTaskLink = (agentId, taskId) => {
    const existing = run.links.agentToTask.find(
      (link) => link.agentId === agentId && link.taskId === taskId
    );
    run.links.agentToTask = run.links.agentToTask.filter((link) => link.agentId !== agentId);
    if (!existing) {
      run.links.agentToTask.push({
        agentId,
        taskId,
        createdAt: new Date().toISOString(),
        assignOnConnect,
      });
      if (assignOnConnect) {
        run.assignments[agentId] = taskId;
      }
    } else if (existing.assignOnConnect) {
      delete run.assignments[agentId];
    }
    syncAll();
  };

  const clearAgentLinks = (agentId) => {
    run.links.agentToTask = run.links.agentToTask.filter((link) => link.agentId !== agentId);
    run.links.agentToAgent = run.links.agentToAgent.filter(
      (link) => link.a !== agentId && link.b !== agentId
    );
    delete run.assignments[agentId];
    syncAll();
  };

  const toggleWorkspace = (agentId) => {
    if (run.workspaceAgentIds.includes(agentId)) {
      run.workspaceAgentIds = run.workspaceAgentIds.filter((id) => id !== agentId);
    } else {
      run.workspaceAgentIds.push(agentId);
    }
    syncAll();
  };

  function clampState(state, padding = 32) {
    const canvasWidth = graphCanvas.clientWidth || 1200;
    const canvasHeight = graphCanvas.clientHeight || 700;
    const width = state.width || 180;
    const height = state.height || 120;
    state.x = clamp(state.x, padding, canvasWidth - width - padding);
    state.y = clamp(state.y, padding, canvasHeight - height - padding);
    state.tx = clamp(state.tx, padding, canvasWidth - width - padding);
    state.ty = clamp(state.ty, padding, canvasHeight - height - padding);
  }

  const createNode = (item, type) => {
    const node = document.createElement("div");
    node.className = `node ${type}`;
    node.dataset.id = item.id;
    node.dataset.type = type;

    if (type === "task") {
      const assigned = item.agents.length;
      node.innerHTML = `
        <div class="node-title">${item.title}</div>
        <div class="node-meta">Size ${item.size} • ${assigned}/${sizeCaps[item.size]} assigned</div>
        <div class="node-extra" data-bottleneck="${item.id}"></div>
      `;
    } else {
      const initials = getInitials(item.name);
      const badge = item.codeBadge || "AI";
      node.classList.add("agent-token");
      node.innerHTML = `
        <div class="token-ring">
          <span class="token-initials">${initials}</span>
          <span class="token-badge">${badge}</span>
          <span class="token-role">${item.role}</span>
        </div>
        <div class="agent-card">
          <div class="agent-card-header">
            <div>
              <div class="node-title">${item.name}</div>
              <div class="node-meta">${item.role} • Skill ${item.skill}</div>
            </div>
            <span class="status-dot"></span>
          </div>
          <div class="agent-card-task" data-agent-task>Unassigned</div>
          <div class="agent-links" data-agent-links></div>
          <div class="agent-card-list" data-agent-report></div>
          <div class="agent-actions">
            <button class="primary" data-action="connect-task">Connect to Task</button>
            <button data-action="link-agent">Link to Agent</button>
            <button data-action="toggle-workspace">Toggle Workspace</button>
            <button data-action="clear-links">Unassign Links</button>
          </div>
          <div class="gauge-row">
            <div class="gauge gauge-sm" data-gauge="load">
              <div class="gauge-arc"></div>
              <div class="gauge-needle"></div>
              <div class="gauge-value">0</div>
              <div class="gauge-label">Rev Meter</div>
            </div>
            <div class="gauge gauge-sm" data-gauge="boost">
              <div class="gauge-arc"></div>
              <div class="gauge-needle"></div>
              <div class="gauge-value">0</div>
              <div class="gauge-label">Boost</div>
            </div>
          </div>
        </div>
      `;
    }

    enableDrag(node, {
      run,
      graphCanvas,
      nodeStates,
      onSync: () => syncAll(),
      onAgentClick: (agentId) => setExpandedAgent(agentId),
      onDragEnd: () => {
        settleIterations = 16;
      },
      scheduleRender,
      clampState,
    });

    if (type === "agent") {
      node.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (!button) return;
        event.stopPropagation();
        const action = button.dataset.action;
        if (action === "connect-task") {
          setConnectMode("connect-task", item.id);
        }
        if (action === "link-agent") {
          setConnectMode("connect-agent", item.id);
        }
        if (action === "toggle-workspace") {
          toggleWorkspace(item.id);
        }
        if (action === "clear-links") {
          clearAgentLinks(item.id);
        }
      });
    }

    graphWorld.appendChild(node);
    nodes.set(item.id, node);

    const state = {
      x: item.pos?.x ?? 120,
      y: item.pos?.y ?? 120,
      tx: item.pos?.x ?? 120,
      ty: item.pos?.y ?? 120,
      pinned: false,
      type,
      width: 0,
      height: 0,
      isDocked: type === "agent" ? item.isDocked ?? true : false,
    };
    nodeStates.set(item.id, state);
    measureNeeded = true;
  };

  debugLog("Node creation pre", {
    existingNodes: graphWorld.querySelectorAll(".node").length,
  });
  graphWorld.querySelectorAll(".node").forEach((node) => node.remove());
  run.tasks.forEach((task) => createNode(task, "task"));
  run.agents.forEach((agent) => createNode(agent, "agent"));
  debugLog("Node creation post", {
    created: run.tasks.length + run.agents.length,
    currentNodes: graphWorld.querySelectorAll(".node").length,
  });

  // SIZE CACHE
  const measureNodes = () => {
    if (pipelineAborted) {
      debugLog("measureNodes aborted", "pipelineAborted");
      return;
    }
    nodes.forEach((node, id) => {
      const state = nodeStates.get(id);
      if (!state) return;
      const width = node.offsetWidth || 180;
      const height = node.offsetHeight || 120;
      state.width = width;
      state.height = height;
      nodeSizes.set(id, { w: width, h: height });
    });
  };

  const getPort = (state, side) => {
    const x = state.x;
    const y = state.y;
    const w = state.width || 160;
    const h = state.height || 100;
    if (side === "left") return { x, y: y + h / 2 };
    if (side === "right") return { x: x + w, y: y + h / 2 };
    if (side === "top") return { x: x + w / 2, y };
    if (side === "left-bottom") return { x, y: y + h * 0.75 };
    if (side === "right-offset") return { x: x + w, y: y + h * 0.35 };
    return { x: x + w / 2, y: y + h };
  };

  const computeTaskDepths = () => {
    const adjacency = new Map();
    const indegree = new Map();
    run.tasks.forEach((task) => {
      adjacency.set(task.id, []);
      indegree.set(task.id, 0);
    });
    run.edges.forEach((edge) => {
      if (!adjacency.has(edge.from) || !adjacency.has(edge.to)) return;
      adjacency.get(edge.from).push(edge.to);
      indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
    });

    const queue = [];
    indegree.forEach((value, key) => {
      if (value === 0) queue.push(key);
    });

    const depths = {};
    queue.forEach((id) => {
      depths[id] = 0;
    });

    while (queue.length) {
      const current = queue.shift();
      const depth = depths[current] ?? 0;
      (adjacency.get(current) || []).forEach((neighbor) => {
        depths[neighbor] = Math.max(depths[neighbor] ?? 0, depth + 1);
        indegree.set(neighbor, (indegree.get(neighbor) || 0) - 1);
        if (indegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }

    run.tasks.forEach((task) => {
      if (depths[task.id] === undefined) {
        depths[task.id] = 0;
      }
    });

    return depths;
  };

  const seedInitialLayout = () => {
    const canvasWidth = graphCanvas.clientWidth || 1200;
    const canvasHeight = graphCanvas.clientHeight || 700;
    const hasPositions = [...run.tasks, ...run.agents].some((item) => {
      const x = item.pos?.x;
      const y = item.pos?.y;
      if (x === undefined || y === undefined) return false;
      if (Number.isNaN(x) || Number.isNaN(y)) return false;
      return x !== 0 || y !== 0;
    });
    if (run.hasSeededLayout || hasPositions) {
      debugLog("seedInitialLayout skipped", {
        hasSeededLayout: run.hasSeededLayout,
        hasPositions,
      });
      return;
    }
    debugLog("seedInitialLayout start", { canvasWidth, canvasHeight });

    const depths = computeTaskDepths();
    const tasksByDepth = new Map();
    run.tasks.forEach((task) => {
      const depth = depths[task.id] || 0;
      if (!tasksByDepth.has(depth)) tasksByDepth.set(depth, []);
      tasksByDepth.get(depth).push(task.id);
    });

    let tasksBottom = 0;
    tasksByDepth.forEach((taskIds, depth) => {
      taskIds.forEach((taskId, index) => {
        const state = nodeStates.get(taskId);
        if (!state) return;
        const width = state.width || 180;
        const height = state.height || 120;
        state.x = clamp(200 + depth * 320, 32, canvasWidth - width - 32);
        state.y = clamp(140 + index * 160, 32, canvasHeight - height - 32);
        state.tx = state.x;
        state.ty = state.y;
        tasksBottom = Math.max(tasksBottom, state.y + height);
      });
    });

    run.agents.forEach((agent, index) => {
      const state = nodeStates.get(agent.id);
      if (!state) return;
      const width = state.width || 64;
      const height = state.height || 64;
      state.x = clamp(200 + (index % 6) * 160, 32, canvasWidth - width - 32);
      state.y = clamp(tasksBottom + 160 + Math.floor(index / 6) * 120, 32, canvasHeight - height - 32);
      state.tx = state.x;
      state.ty = state.y;
    });

    run.hasSeededLayout = true;
    saveRun(run);
    scheduleRender();
    debugLog("seedInitialLayout complete", { hasSeededLayout: run.hasSeededLayout });
  };

  const seedLayoutFromAssignments = () => {
    const canvasWidth = graphCanvas.clientWidth || 1200;
    const canvasHeight = graphCanvas.clientHeight || 700;
    const hasPositions = [...run.tasks, ...run.agents].some((item) => {
      const x = item.pos?.x;
      const y = item.pos?.y;
      if (x === undefined || y === undefined) return false;
      if (Number.isNaN(x) || Number.isNaN(y)) return false;
      return x !== 0 || y !== 0;
    });
    if (run.hasSeededLayout || hasPositions) {
      debugLog("seedLayoutFromAssignments skipped", {
        hasSeededLayout: run.hasSeededLayout,
        hasPositions,
      });
      return;
    }
    debugLog("seedLayoutFromAssignments start", { canvasWidth, canvasHeight });

    const depths = computeTaskDepths();
    const tasksByDepth = new Map();
    run.tasks.forEach((task) => {
      const depth = depths[task.id] || 0;
      if (!tasksByDepth.has(depth)) tasksByDepth.set(depth, []);
      tasksByDepth.get(depth).push(task.id);
    });

    let tasksBottom = 0;
    tasksByDepth.forEach((taskIds, depth) => {
      taskIds.forEach((taskId, index) => {
        const state = nodeStates.get(taskId);
        if (!state) return;
        const width = state.width || 180;
        const height = state.height || 120;
        state.x = clamp(200 + depth * 320, 32, canvasWidth - width - 32);
        state.y = clamp(140 + index * 160, 32, canvasHeight - height - 32);
        state.tx = state.x;
        state.ty = state.y;
        tasksBottom = Math.max(tasksBottom, state.y + height);
      });
    });

    const taskSlots = {};
    Object.entries(run.assignments || {}).forEach(([agentId, taskId]) => {
      const taskState = nodeStates.get(taskId);
      const agentState = nodeStates.get(agentId);
      if (!taskState || !agentState) return;
      const slot = taskSlots[taskId] || 0;
      taskSlots[taskId] = slot + 1;
      const width = agentState.width || 64;
      const height = agentState.height || 64;
      agentState.x = clamp(taskState.x + 40 + slot * 70, 32, canvasWidth - width - 32);
      agentState.y = clamp(taskState.y + (taskState.height || 120) + 40, 32, canvasHeight - height - 32);
      agentState.tx = agentState.x;
      agentState.ty = agentState.y;
    });

    run.agents.forEach((agent, index) => {
      const agentState = nodeStates.get(agent.id);
      if (!agentState) return;
      if (run.assignments[agent.id]) return;
      const width = agentState.width || 64;
      const height = agentState.height || 64;
      agentState.x = clamp(200 + (index % 6) * 160, 32, canvasWidth - width - 32);
      agentState.y = clamp(tasksBottom + 160 + Math.floor(index / 6) * 120, 32, canvasHeight - height - 32);
      agentState.tx = agentState.x;
      agentState.ty = agentState.y;
    });

    run.hasSeededLayout = true;
    saveRun(run);
    scheduleRender();
    debugLog("seedLayoutFromAssignments complete", { hasSeededLayout: run.hasSeededLayout });
  };

  const ensureAssignmentLinkConsistency = () => {
    Object.entries(run.assignments || {}).forEach(([agentId, taskId]) => {
      const exists = run.links.agentToTask.some(
        (link) => link.agentId === agentId && link.taskId === taskId
      );
      if (!exists) {
        run.links.agentToTask.push({
          agentId,
          taskId,
          createdAt: new Date().toISOString(),
          assignOnConnect: true,
        });
      }
    });
  };

  // AUTO ARRANGE LANES
  const computeLayoutTargets = () => {
    measureNodes();
    const canvasWidth = graphCanvas.clientWidth || 1200;
    const canvasHeight = graphCanvas.clientHeight || 700;
    const laneWidth = 260;
    const rowHeight = 140;
    const paddingX = 80;
    const paddingY = 80;

    const depths = computeTaskDepths();
    const tasksByDepth = new Map();
    run.tasks.forEach((task) => {
      const depth = depths[task.id] || 0;
      if (!tasksByDepth.has(depth)) tasksByDepth.set(depth, []);
      tasksByDepth.get(depth).push(task.id);
    });

    tasksByDepth.forEach((taskIds, depth) => {
      let currentY = paddingY;
      taskIds.forEach((taskId) => {
        const state = nodeStates.get(taskId);
        if (!state) return;
        const width = state.width || 180;
        const height = state.height || 120;
        const targetX = paddingX + depth * laneWidth;
        const targetY = currentY;
        state.tx = clamp(targetX, 0, canvasWidth - width);
        state.ty = clamp(targetY, 0, canvasHeight - height);
        currentY += Math.max(rowHeight, height + 20);
      });
    });

    const agentStripY = canvasHeight - 120;
    const agentSpacing = 120;
    run.agents.forEach((agent, index) => {
      const state = nodeStates.get(agent.id);
      if (!state || !state.isDocked) return;
      const width = state.width || 64;
      const height = state.height || 64;
      const targetX = paddingX + (index % 6) * agentSpacing;
      const targetY = agentStripY + Math.floor(index / 6) * 90;
      state.tx = clamp(targetX, 0, canvasWidth - width);
      state.ty = clamp(targetY, 0, canvasHeight - height);
    });
  };

  // NON-BOUNCY SETTLE + CLAMP
  const settleNodes = () => {
    if (settleIterations <= 0) return;
    const states = Array.from(nodeStates.values());
    for (let i = 0; i < states.length; i += 1) {
      const a = states[i];
      for (let j = i + 1; j < states.length; j += 1) {
        const b = states[j];
        if (a.pinned || b.pinned) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy) || 1;
        const radiusA = Math.max(a.width || 160, a.height || 100) / 2;
        const radiusB = Math.max(b.width || 160, b.height || 100) / 2;
        const minDist = radiusA + radiusB + 16;
        if (dist < minDist) {
          const push = (minDist - dist) / dist;
          a.x += dx * push * 0.2;
          a.y += dy * push * 0.2;
          b.x -= dx * push * 0.2;
          b.y -= dy * push * 0.2;
        }
      }
    }
    nodeStates.forEach((state) => {
      clampState(state);
    });
    settleIterations -= 1;
  };

  const glideNodes = () => {
    let needsMore = false;
    nodeStates.forEach((state, id) => {
      const node = nodes.get(id);
      if (!node) return;
      if (!state.pinned) {
        const dx = state.tx - state.x;
        const dy = state.ty - state.y;
        state.x += dx * 0.12;
        state.y += dy * 0.12;
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          needsMore = true;
        }
      }
      clampState(state);
      node.style.transform = `translate(${state.x}px, ${state.y}px)`;
      const runItem = run.agents.find((agent) => agent.id === id) || run.tasks.find((task) => task.id === id);
      if (runItem) {
        runItem.pos = { x: state.x, y: state.y };
        if (state.type === "agent") {
          runItem.isDocked = state.isDocked;
        }
      }
    });
    return needsMore;
  };

  // EDGE UPDATE (NO RECT READS IN MOVE)
  const updateEdges = () => {
    if (pipelineAborted) {
      debugLog("updateEdges aborted", "pipelineAborted");
      return;
    }
    if (!graphEdges) {
      debugLog("updateEdges aborted", "missing graphEdges");
      return;
    }
    graphEdges.setAttribute("width", graphCanvas.clientWidth || 0);
    graphEdges.setAttribute("height", graphCanvas.clientHeight || 0);
    const usedKeys = new Set();

    const drawCurve = (fromId, toId, className, key, ports = { from: "right", to: "left" }) => {
      const fromState = nodeStates.get(fromId);
      const toState = nodeStates.get(toId);
      if (!fromState || !toState) return;

      const fromPort = getPort(fromState, ports.from);
      const toPort = getPort(toState, ports.to);
      const delta = Math.max(Math.abs(toPort.x - fromPort.x) * 0.5, 80);
      const cx1 = fromPort.x + delta;
      const cy1 = fromPort.y;
      const cx2 = toPort.x - delta;
      const cy2 = toPort.y;

      const pathKey = key || `${fromId}-${toId}-${className}`;
      let path = edgePaths.get(pathKey);
      if (!path) {
        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.dataset.key = pathKey;
        graphEdges.appendChild(path);
        edgePaths.set(pathKey, path);
      }
      path.setAttribute(
        "d",
        `M ${fromPort.x} ${fromPort.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toPort.x} ${toPort.y}`
      );
      path.setAttribute("class", className);
      path.dataset.from = fromId;
      path.dataset.to = toId;
      usedKeys.add(pathKey);
    };

    run.edges.forEach((edge) =>
      drawCurve(edge.from, edge.to, "edge-path", `edge-${edge.from}-${edge.to}`, {
        from: "right",
        to: "left",
      })
    );
    run.links.agentToTask.forEach((link) => {
      drawCurve(
        link.agentId,
        link.taskId,
        "edge-link-task",
        `at-${link.agentId}-${link.taskId}`,
        { from: "right-offset", to: "left-bottom" }
      );
    });
    run.links.agentToAgent.forEach((link) => {
      const agentA = run.agents.find((agent) => agent.id === link.a);
      const agentB = run.agents.find((agent) => agent.id === link.b);
      const status = evaluateAgentPair(agentA, agentB).status;
      const className = status === "bad" ? "edge-link-agent edge-link-bad" : "edge-link-agent";
      drawCurve(link.a, link.b, className, `aa-${link.a}-${link.b}`, {
        from: "right-offset",
        to: "left",
      });
    });

    edgePaths.forEach((path, key) => {
      if (!usedKeys.has(key)) {
        path.remove();
        edgePaths.delete(key);
      }
    });
  };

  const updateCamera = () => {
    const transformGroup = debugGroupCollapsed("TRANSFORM");
    if (!graphWorld) {
      debugLog("updateCamera aborted", "missing graphWorld");
      debugGroupEnd(transformGroup);
      return;
    }
    const transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
    graphWorld.style.transform = transform;
    const invalidTransform =
      !Number.isFinite(camera.x) || !Number.isFinite(camera.y) || !Number.isFinite(camera.scale);
    if (invalidTransform) {
      debugLog("Invalid transform detected", { x: camera.x, y: camera.y, scale: camera.scale });
      camera.x = 0;
      camera.y = 0;
      camera.scale = 1;
      graphWorld.style.transform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`;
      debugLog("Transform reset to safe defaults", { x: camera.x, y: camera.y, scale: camera.scale });
    } else {
      debugLog("Transform", { x: camera.x, y: camera.y, scale: camera.scale });
    }
    debugGroupEnd(transformGroup);
  };

  const renderFrame = () => {
    rafPending = false;
    if (pipelineAborted) {
      debugLog("renderFrame aborted", "pipelineAborted");
      return;
    }
    if (measureNeeded) {
      measureNodes();
      measureNeeded = false;
    }
    if (needsLayout && !activeDrag) {
      computeLayoutTargets();
      needsLayout = false;
    }
    const needsMore = !activeDrag ? glideNodes() : false;
    if (!activeDrag) {
      settleNodes();
    }
    updateEdges();
    updateCamera();
    updateFocus();
    renderCompatibilityPanel();
    if (needsMore || settleIterations > 0) {
      scheduleRender();
    }
  };

  const fitToView = () => {
    const taskStates = run.tasks
      .map((task) => nodeStates.get(task.id))
      .filter(Boolean);
    if (!taskStates.length) return;
    const minX = Math.min(...taskStates.map((s) => s.x));
    const minY = Math.min(...taskStates.map((s) => s.y));
    const maxX = Math.max(...taskStates.map((s) => s.x + s.width));
    const maxY = Math.max(...taskStates.map((s) => s.y + s.height));

    const padding = 80;
    const canvasWidth = graphCanvas.clientWidth || 1200;
    const canvasHeight = graphCanvas.clientHeight || 700;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;
    const scale = Math.min(canvasWidth / contentWidth, canvasHeight / contentHeight, 1);

    camera.scale = clamp(scale, 0.5, 1.2);
    camera.x = (canvasWidth - contentWidth * camera.scale) / 2 - minX * camera.scale + padding * camera.scale;
    camera.y = (canvasHeight - contentHeight * camera.scale) / 2 - minY * camera.scale + padding * camera.scale;
    updateCamera();
  };

  const updateAssignments = () => {
    run.tasks.forEach((task) => {
      task.agents = [];
    });

    Object.entries(run.assignments).forEach(([agentId, taskId]) => {
      const task = run.tasks.find((item) => item.id === taskId);
      if (task) task.agents.push(agentId);
    });

    run.tasks.forEach((task) => {
      const node = nodes.get(task.id);
      if (!node) return;
      const meta = node.querySelector(".node-meta");
      if (meta) {
        meta.textContent = `Size ${task.size} • ${task.agents.length}/${sizeCaps[task.size]} assigned`;
      }
    });
  };

  const calculateAgentMetrics = (task, assignedAgents) => {
    const capacity = sizeCaps[task.size];
    const count = Math.min(assignedAgents.length, capacity);
    return assignedAgents.reduce((acc, agent) => {
      const base = (agent.skill / task.complexity) * 100;
      const load = clamp(base * 1.1, 0, 100);
      const boost = clamp(base * coordinationMultiplier(count), 0, 100);
      acc[agent.id] = { load, boost };
      return acc;
    }, {});
  };

  const calculateMetrics = () => {
    const agentMetrics = {};
    const taskSpeeds = run.tasks.map((task) => {
      const assignedAgents = task.agents
        .map((agentId) => run.agents.find((agent) => agent.id === agentId))
        .filter(Boolean);
      const capacity = sizeCaps[task.size];
      const capped = assignedAgents.slice(0, capacity);
      const totalSkill = capped.reduce((sum, agent) => sum + agent.skill, 0);
      const multiplier = coordinationMultiplier(capped.length);
      const speed = (totalSkill * multiplier) / task.complexity;
      Object.assign(agentMetrics, calculateAgentMetrics(task, capped));
      return { taskId: task.id, speed };
    });

    run.agents.forEach((agent) => {
      if (!agentMetrics[agent.id]) {
        agentMetrics[agent.id] = { load: 0, boost: 0 };
      }
    });

    const avgSpeed = taskSpeeds.length
      ? taskSpeeds.reduce((sum, item) => sum + item.speed, 0) / taskSpeeds.length
      : 0;

    const activeAgents = Object.keys(run.assignments).length;
    const idleAgents = run.agents.length - activeAgents;
    const efficiencyScoreValue = clamp((avgSpeed * 35) - (idleAgents * 3), 0, 100);
    const bottleneck = taskSpeeds.reduce(
      (lowest, current) => (current.speed < lowest.speed ? current : lowest),
      taskSpeeds[0] || { taskId: null, speed: 0 }
    );

    run.metrics = {
      efficiencyScore: Number(efficiencyScoreValue.toFixed(1)),
      activeAgents,
      idleAgents,
      bottleneckTaskId: bottleneck.taskId,
      agentMetrics,
    };

    efficiencyScore.textContent = `Efficiency ${run.metrics.efficiencyScore}`;
    setGauge(overallGauge, run.metrics.efficiencyScore);

    run.tasks.forEach((task) => {
      const node = nodes.get(task.id);
      if (!node) return;
      const label = node.querySelector(".node-extra");
      if (!label) return;
      label.textContent = task.id === run.metrics.bottleneckTaskId ? "Bottleneck" : "";
    });

    run.agents.forEach((agent) => {
      const node = nodes.get(agent.id);
      if (!node) return;
      const metrics = run.metrics.agentMetrics[agent.id];
      const taskName = run.assignments[agent.id]
        ? run.tasks.find((task) => task.id === run.assignments[agent.id])?.title
        : null;
      const taskInfo = node.querySelector("[data-agent-task]");
      if (taskInfo) {
        taskInfo.textContent = taskName ? `Assigned to: ${taskName}` : "Unassigned";
      }
      const loadGauge = node.querySelector('[data-gauge="load"]');
      const boostGauge = node.querySelector('[data-gauge="boost"]');
      setGauge(loadGauge, metrics?.load ?? 0);
      setGauge(boostGauge, metrics?.boost ?? 0);
    });
  };

  const updateWorkspace = () => {
    const { pairStatus, teamReport: report } = evaluateTeam(run.workspaceAgentIds, run.agents);

    workspaceList.innerHTML = "";
    run.workspaceAgentIds.forEach((agentId) => {
      const agent = run.agents.find((item) => item.id === agentId);
      if (!agent) return;
      const status = pairStatus[agentId]?.status || "neutral";
      const item = document.createElement("div");
      item.className = `workspace-agent ${status}`;
      item.innerHTML = `
        <div>
          <strong>${agent.name}</strong>
          <div class="muted">${agent.role}</div>
        </div>
        <span class="badge">${agent.codeBadge}</span>
      `;
      workspaceList.appendChild(item);
    });

    const allInWorkspace = run.workspaceAgentIds.length === run.agents.length;

    const linkStatusMap = run.links.agentToAgent.reduce((acc, link) => {
      const agentA = run.agents.find((agent) => agent.id === link.a);
      const agentB = run.agents.find((agent) => agent.id === link.b);
      const status = evaluateAgentPair(agentA, agentB).status;
      acc[link.a] = status;
      acc[link.b] = status;
      return acc;
    }, {});

    run.agents.forEach((agent) => {
      const node = nodes.get(agent.id);
      if (!node) return;
      node.classList.remove("agent-good", "agent-bad", "agent-neutral");
      const linkStatus = linkStatusMap[agent.id];
      const baseStatus = pairStatus[agent.id]?.status || "neutral";
      const status = linkStatus || baseStatus;
      node.classList.add(`agent-${status}`);
      if (allInWorkspace && status !== "good") {
        node.classList.add("agent-bad");
        node.classList.remove("agent-good");
      }

      const reportEl = node.querySelector("[data-agent-report]");
      if (reportEl) {
        const synergy = pairStatus[agent.id]?.reasons || [];
        const inWorkspace = run.workspaceAgentIds.includes(agent.id);
        const strengths = (agent.strengths || []).join(", ");
        const stacks = (agent.recommendedStacks || []).join(", ");
        const synergyHtml =
          inWorkspace && synergy.length
            ? `<div><span>Synergy:</span> ${synergy.join(" ")}</div>`
            : "";
        reportEl.innerHTML = `
          <div><span>Strengths:</span> ${strengths || "—"}</div>
          <div><span>Stacks:</span> ${stacks || "—"}</div>
          ${synergyHtml}
        `;
      }

      const linksEl = node.querySelector("[data-agent-links]");
      if (linksEl) {
        const taskLink = run.links.agentToTask.find((link) => link.agentId === agent.id);
        const taskTitle = taskLink
          ? run.tasks.find((task) => task.id === taskLink.taskId)?.title
          : null;
        const linkedAgents = run.links.agentToAgent
          .filter((link) => link.a === agent.id || link.b === agent.id)
          .map((link) => (link.a === agent.id ? link.b : link.a))
          .map((id) => run.agents.find((agentItem) => agentItem.id === id)?.name)
          .filter(Boolean);
        linksEl.innerHTML = `
          <div><strong>Linked:</strong></div>
          <div>Task: ${taskTitle || "—"}</div>
          <div>Agents: ${linkedAgents.length ? linkedAgents.join(", ") : "—"}</div>
        `;
      }
    });

    const canBuildList = report.canBuild || [];
    const ideas = canBuildList.length
      ? canBuildList
      : ["Targeted proofs of concept", "Focused MVPs", "Fast research sprints"];

    const recommended = (report.recommendedStacks || []).slice(0, 4);
    const warningList = report.warnings || [];

    let header = "Add agents to the workspace to see synergy insights.";
    if (run.workspaceAgentIds.length === 1) {
      header = "This agent is best for:";
    }
    if (run.workspaceAgentIds.length > 1) {
      header = "With these agents you can build:";
    }

    const content = [
      `<p>${header}</p>`,
      `<ul>${ideas.slice(0, 6).map((item) => `<li>${item}</li>`).join("")}</ul>`,
      recommended.length
        ? `<p>Recommended stacks:</p><ul>${recommended
            .map((stack) => `<li>${stack}</li>`)
            .join("")}</ul>`
        : "",
      warningList.length
        ? `<p class="warning">${warningList.join(" ")}</p>`
        : "",
    ].join("");

    teamReport.innerHTML = content;

    if (allInWorkspace && recommended.length) {
      const best = recommended[0];
      teamReport.innerHTML += `<p><strong>Best overall stack:</strong> ${best}</p>`;
    }
  };

  const updateFocus = () => {
    if (!selectedNodeId) {
      nodes.forEach((node) => node.classList.remove("dimmed", "highlighted"));
      edgePaths.forEach((path) => path.classList.remove("edge-dimmed", "edge-highlighted"));
      return;
    }
    const connectedIds = new Set([selectedNodeId]);
    edgePaths.forEach((path) => {
      const from = path.dataset.from;
      const to = path.dataset.to;
      if (from === selectedNodeId || to === selectedNodeId) {
        connectedIds.add(from);
        connectedIds.add(to);
      }
    });

    nodes.forEach((node, id) => {
      const isConnected = connectedIds.has(id);
      node.classList.toggle("highlighted", isConnected);
      node.classList.toggle("dimmed", !isConnected);
    });

    edgePaths.forEach((path) => {
      const from = path.dataset.from;
      const to = path.dataset.to;
      const isConnected = from === selectedNodeId || to === selectedNodeId;
      path.classList.toggle("edge-highlighted", isConnected);
      path.classList.toggle("edge-dimmed", !isConnected);
    });
  };

  const renderCompatibilityPanel = () => {
    if (!compatibilityPanel) return;
    if (!selectedNodeId) {
      compatibilityPanel.textContent = "Select an agent or task to see link suggestions.";
      return;
    }

    let good = [];
    let bad = [];
    if (selectedNodeType === "agent") {
      const compat = computeCompatibility(selectedNodeId);
      good = compat.good;
      bad = compat.bad;
    } else if (selectedNodeType === "task") {
      const taskCompat = run.compatibility?.[selectedNodeId] || {};
      const key = Object.keys(taskCompat)[0];
      if (key) {
        good = taskCompat[key].good || [];
        bad = taskCompat[key].bad || [];
      }
    }

    const renderChips = (ids, type) =>
      ids
        .map((id) => run.agents.find((agent) => agent.id === id))
        .filter(Boolean)
        .map((agent) => `<span class="suggestion-chip ${type}">${agent.name}</span>`)
        .join("");

    const goodChips = renderChips(good, "good");
    const badChips = renderChips(bad, "bad");
    compatibilityPanel.innerHTML = `
      <div>Recommended links:</div>
      <div>${goodChips || "<span class=\"muted\">None</span>"}</div>
      <div>Avoid linking:</div>
      <div>${badChips || "<span class=\"muted\">None</span>"}</div>
    `;
  };

  const syncAll = () => {
    if (pipelineAborted) {
      debugLog("syncAll aborted", "pipelineAborted");
      return;
    }
    updateAssignments();
    calculateMetrics();
    updateWorkspace();
    saveRun(run);
    scheduleRender();
  };

  // EVENT LISTENER SAFETY
  const bindListeners = () => {
    if (graphListenersBound) return;
    graphListenersBound = true;

    const handleWheel = (event) => {
      if (!graphContext) return;
      event.preventDefault();
      const delta = -event.deltaY * 0.001;
      const newScale = clamp(graphContext.camera.scale + delta, 0.5, 1.5);
      graphContext.camera.scale = newScale;
      graphContext.updateCamera();
    };

    const handlePanStart = (event) => {
      if (!graphContext) return;
      if (event.target.closest(".node")) return;
      graphContext.camera.isPanning = true;
      graphContext.camera.startX = event.clientX - graphContext.camera.x;
      graphContext.camera.startY = event.clientY - graphContext.camera.y;
    };

    const handlePanMove = (event) => {
      if (!graphContext || !graphContext.camera.isPanning) return;
      graphContext.camera.x = event.clientX - graphContext.camera.startX;
      graphContext.camera.y = event.clientY - graphContext.camera.startY;
      graphContext.updateCamera();
    };

    const handlePanEnd = () => {
      if (!graphContext) return;
      graphContext.camera.isPanning = false;
    };

    const handleCanvasClick = (event) => {
      if (!graphContext) return;
      if (event.target.closest("button")) return;
      const target = event.target.closest(".node");
      if (graphContext.uiState.mode !== "idle" && target) {
        const targetType = target.dataset.type;
        const targetId = target.dataset.id;
        if (graphContext.uiState.mode === "connect-task" && targetType === "task") {
          graphContext.toggleAgentTaskLink(graphContext.uiState.sourceAgentId, targetId);
          graphContext.cancelConnectMode();
          return;
        }
        if (
          graphContext.uiState.mode === "connect-agent" &&
          targetType === "agent" &&
          targetId !== graphContext.uiState.sourceAgentId
        ) {
          graphContext.toggleAgentAgentLink(graphContext.uiState.sourceAgentId, targetId);
          graphContext.cancelConnectMode();
          return;
        }
      }

      if (graphContext.uiState.mode !== "idle" && !target) {
        graphContext.cancelConnectMode();
      }

      if (target && graphContext.uiState.mode === "idle") {
        graphContext.setSelectedNode(target.dataset.id, target.dataset.type);
        graphContext.scheduleRender();
        return;
      }

      if (!event.target.closest(".agent-token")) {
        graphContext.clearExpanded();
        graphContext.setSelectedNode(null, null);
        graphContext.scheduleRender();
      }
    };

    graphViewport.addEventListener("wheel", handleWheel, { passive: false });
    graphViewport.addEventListener("mousedown", handlePanStart);
    window.addEventListener("mousemove", handlePanMove);
    window.addEventListener("mouseup", handlePanEnd);
    document.addEventListener("mousedown", handleCanvasClick);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (graphContext) {
          graphContext.cancelConnectMode();
          graphContext.setSelectedNode(null, null);
          graphContext.scheduleRender();
        }
      }
    });
  };

  fitViewBtn.addEventListener("click", () => {
    needsLayout = true;
    computeLayoutTargets();
    fitToView();
    settleIterations = 12;
    saveRun(run);
    scheduleRender();
  });

  autoArrangeBtn.addEventListener("click", () => {
    needsLayout = true;
    computeLayoutTargets();
    settleIterations = 16;
    saveRun(run);
    scheduleRender();
  });

  if (resetGraphBtn) {
    resetGraphBtn.addEventListener("click", () => {
      const confirmReset = confirm("Reset workspace links and assignments?");
      run.workspaceAgentIds = [];
      run.links.agentToTask = [];
      run.links.agentToAgent = [];
      if (confirmReset) {
        run.assignments = {};
      }
      run.hasSeededLayout = false;
      seedInitialLayout();
      syncAll();
    });
  }

  if (cancelConnectBtn) {
    cancelConnectBtn.addEventListener("click", cancelConnectMode);
  }

  graphContext = {
    run,
    nodes,
    nodeStates,
    uiState,
    camera,
    updateCamera,
    cancelConnectMode,
    toggleAgentTaskLink,
    toggleAgentAgentLink,
    clearExpanded,
    scheduleRender,
    selectedNodeId,
    selectedNodeType,
    setSelectedNode,
  };

  bindListeners();

  measureNodes();
  ensureAssignmentLinkConsistency();
  seedLayoutFromAssignments();

  scheduleRender();

  const worldRect = graphWorld?.getBoundingClientRect();
  const viewportRect = graphViewport?.getBoundingClientRect();
  if (run.tasks.length === 0 && run.agents.length === 0) {
    pipelineAborted = true;
    debugLog("RENDER abort", "tasks/agents empty");
    showPlaceholder("No graph data loaded (tasks/agents empty). Check run creation & localStorage key.");
  } else if (
    !worldRect ||
    worldRect.width === 0 ||
    worldRect.height === 0 ||
    !viewportRect ||
    viewportRect.width === 0 ||
    viewportRect.height === 0
  ) {
    pipelineAborted = true;
    debugLog("RENDER abort", "viewport/world has zero size");
    showPlaceholder("Graph viewport is 0x0 (CSS/layout issue).");
  }

  const observer = new ResizeObserver(() => {
    measureNeeded = true;
    fitToView();
    scheduleRender();
  });
  observer.observe(graphCanvas);

  syncAll();
  debugLog("renderGraph complete");
  requestAnimationFrame(() => debugSnapshot("raf-after-render", run));
  } catch (error) {
    debugLog("Graph render failed", error);
    if (DEBUG_GRAPH) {
      console.error("Graph render failed", error);
    }
    const message = error instanceof Error ? error.message : String(error);
    showGraphErrorBanner(`Graph render failed: ${message}`);
  } finally {
    debugGroupEnd(groupLabel);
  }
};

const enableDrag = (node, options) => {
  const { run, graphCanvas, nodeStates, onSync, onAgentClick, onDragEnd, scheduleRender, clampState } = options;
  let offsetX = 0;
  let offsetY = 0;

  const onPointerDown = (event) => {
    if (event.target.closest("button")) return;
    const state = nodeStates.get(node.dataset.id);
    if (!state) return;
    activeDrag = {
      id: node.dataset.id,
      type: node.dataset.type,
      startX: event.clientX,
      startY: event.clientY,
    };
    state.pinned = true;
    if (state.type === "agent") {
      state.isDocked = false;
    }
    const canvasRect = graphCanvas.getBoundingClientRect();
    offsetX = event.clientX - canvasRect.left - state.x;
    offsetY = event.clientY - canvasRect.top - state.y;
    node.classList.add("dragging");
    node.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!activeDrag || activeDrag.id !== node.dataset.id) return;
    const state = nodeStates.get(node.dataset.id);
    if (!state) return;
    const canvasRect = graphCanvas.getBoundingClientRect();
    state.x = event.clientX - canvasRect.left - offsetX;
    state.y = event.clientY - canvasRect.top - offsetY;
    state.tx = state.x;
    state.ty = state.y;
    node.style.transform = `translate(${state.x}px, ${state.y}px)`;
    if (scheduleRender) scheduleRender();
  };

  const onPointerUp = (event) => {
    if (!activeDrag || activeDrag.id !== node.dataset.id) return;
    const moved = Math.hypot(event.clientX - activeDrag.startX, event.clientY - activeDrag.startY) > 6;
    activeDrag = null;
    node.classList.remove("dragging");

    const type = node.dataset.type;
    const id = node.dataset.id;
    const state = nodeStates.get(id);
    if (state) {
      state.pinned = false;
      if (clampState) clampState(state);
    }

    if (type === "task") {
      const task = run.tasks.find((item) => item.id === id);
      if (task && state) task.pos = { x: state.x, y: state.y };
    }

    if (type === "agent") {
      const agent = run.agents.find((item) => item.id === id);
      if (agent && state) {
        agent.pos = { x: state.x, y: state.y };
        agent.isDocked = state.isDocked;
      }
      if (!moved && onAgentClick) {
        onAgentClick(id);
      }
    }

    if (onDragEnd) onDragEnd();
    if (state && clampState) {
      clampState(state);
    }
    if (scheduleRender) scheduleRender();
    if (onSync) onSync();
  };

  node.addEventListener("pointerdown", onPointerDown);
  node.addEventListener("pointermove", onPointerMove);
  node.addEventListener("pointerup", onPointerUp);
  node.addEventListener("pointercancel", onPointerUp);
};

const init = () => {
  const groupLabel = debugGroupCollapsed("GRAPH INIT");
  debugLog("init start");
  try {
    const loaded = loadRun();
    if (!loaded) {
      debugLog("init redirect", { reason: "missing run data" });
      debugGroupEnd(groupLabel);
      window.location.href = "index.html";
      return;
    }

    const backBtn = document.getElementById("backBtn");
    if (!backBtn) {
      debugLog("DOM missing", "#backBtn");
    }
    backBtn?.addEventListener("click", () => {
      window.location.href = "index.html";
    });

    debugLog("init calling renderGraph", { runId: loaded.runId });
    renderGraph(loaded.data);
  } catch (error) {
    debugLog("Graph init failed", error);
    if (DEBUG_GRAPH) {
      console.error("Graph render failed", error);
    }
    const message = error instanceof Error ? error.message : String(error);
    showGraphErrorBanner(`Graph render failed: ${message}`);
  } finally {
    debugGroupEnd(groupLabel);
  }
};

init();