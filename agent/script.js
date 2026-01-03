const agents = [
  { id: "a1", name: "Nova", role: "Research" },
  { id: "a2", name: "Atlas", role: "Planning" },
  { id: "a3", name: "Lumen", role: "Data" },
  { id: "a4", name: "Kestrel", role: "QA" },
  { id: "a5", name: "Echo", role: "UX" },
  { id: "a6", name: "Sol", role: "Deployment" },
  { id: "a7", name: "Cipher", role: "Security" },
  { id: "a8", name: "Vera", role: "Ops" },
];

const agentCompatProfiles = {
  a1: {
    tags: ["backend", "data", "research"],
    conflictsWithTags: ["frontend"],
  },
  a2: {
    tags: ["backend", "orchestration", "api"],
    conflictsWithTags: ["security"],
  },
  a3: {
    tags: ["data", "db", "backend"],
  },
  a4: {
    tags: ["security", "qa", "testing"],
    conflictsWithTags: ["frontend"],
  },
  a5: {
    tags: ["frontend", "ui", "ux"],
  },
  a6: {
    tags: ["devops", "infra", "backend"],
  },
  a7: {
    tags: ["backend", "systems", "security"],
    conflictsWithTags: ["frontend"],
  },
  a8: {
    tags: ["ops", "monitoring", "backend"],
  },
};

const agentStacks = {
  a1: ["Python + FastAPI", "Postgres + Redis"],
  a2: ["Node + Express", "Postgres + Redis"],
  a3: ["Python + Airflow", "BigQuery + dbt"],
  a4: ["OWASP tooling", "Snyk + CI"],
  a5: ["React + Vite", "Tailwind + Storybook"],
  a6: ["Terraform + AWS", "Docker + Kubernetes"],
  a7: ["Rust + Axum", "Postgres + NATS"],
  a8: ["Grafana + Prometheus", "Kubernetes + Helm"],
};

const sizeCaps = {
  S: 1,
  M: 3,
  L: 5,
  XL: 8,
};

const tasks = [
  {
    id: "t1",
    title: "Synthesize requirement brief",
    size: "M",
    desc: "Turn user goals into an execution plan and success criteria.",
    agents: [],
  },
  {
    id: "t2",
    title: "Prototype dashboard interface",
    size: "L",
    desc: "Build ergonomic UI layout and interaction flows.",
    agents: [],
  },
];

const agentPool = document.getElementById("agentPool");
const taskBoard = document.getElementById("taskBoard");
const poolDrop = document.getElementById("poolDrop");
const taskForm = document.getElementById("taskForm");
const taskCount = document.getElementById("taskCount");
const activeCount = document.getElementById("activeCount");
const transmitBtn = document.getElementById("transmitBtn");
const deployBtn = document.getElementById("deployBtn");
const saveBriefBtn = document.getElementById("saveBriefBtn");
const briefStatus = document.getElementById("briefStatus");
const briefInsights = document.getElementById("briefInsights");
const riskSlider = document.getElementById("risk");
const tempoSlider = document.getElementById("tempo");

const state = {
  assignments: {},
  compatibility: {},
  suggestedLinks: {
    agentToTask: [],
    agentToAgent: [],
  },
};

const sizeComplexity = {
  S: 1,
  M: 2,
  L: 3,
  XL: 5,
};

const updateStats = () => {
  const activeAgents = Object.keys(state.assignments).length;
  taskCount.textContent = tasks.length;
  activeCount.textContent = activeAgents;
};

const computeCompatibility = (sourceAgentId) => {
  const sourceProfile = agentCompatProfiles[sourceAgentId];
  if (!sourceProfile) return { good: [], bad: [], neutral: [] };
  const sourceTags = sourceProfile.tags || [];
  const conflicts = sourceProfile.conflictsWithTags || [];

  const results = { good: [], bad: [], neutral: [] };
  agents.forEach((agent) => {
    if (agent.id === sourceAgentId) return;
    const targetProfile = agentCompatProfiles[agent.id] || { tags: [], conflictsWithTags: [] };
    const targetTags = targetProfile.tags || [];
    const targetConflicts = targetProfile.conflictsWithTags || [];
    const conflictHit =
      conflicts.some((tag) => targetTags.includes(tag)) ||
      targetConflicts.some((tag) => sourceTags.includes(tag));

    const complementHit =
      (sourceTags.includes("frontend") && targetTags.includes("backend")) ||
      (sourceTags.includes("backend") && targetTags.includes("devops")) ||
      (sourceTags.includes("data") && targetTags.includes("backend")) ||
      (sourceTags.includes("security") && targetTags.includes("backend"));

    const sharedTag = sourceTags.some((tag) => targetTags.includes(tag));
    if (conflictHit) {
      results.bad.push(agent.id);
    } else if (complementHit || sharedTag) {
      results.good.push(agent.id);
    } else {
      results.neutral.push(agent.id);
    }
  });

  return results;
};

const renderCompatibilitySuggestions = (taskId, sourceAgentId, container) => {
  if (!container) return;
  const compat = state.compatibility[taskId]?.[sourceAgentId];
  if (!compat) {
    container.innerHTML = "";
    return;
  }
  const assignedAgentIds = tasks.find((task) => task.id === taskId)?.agents || [];
  const assignedTags = assignedAgentIds.flatMap((agentId) => agentCompatProfiles[agentId]?.tags || []);
  const missingLayers = ["frontend", "backend", "db", "devops"].filter(
    (layer) => !assignedTags.includes(layer)
  );
  const warnings = missingLayers.length ? `Missing: ${missingLayers.join(", ")}` : "";
  const stackSet = new Set(
    assignedAgentIds.flatMap((agentId) => agentStacks[agentId] || [])
  );
  const stacks = [...stackSet].slice(0, 4);
  const goodChips = compat.good
    .map((id) => agents.find((agent) => agent.id === id))
    .filter(Boolean)
    .map((agent) => `<span class="suggestion-chip good" data-agent-id="${agent.id}">${agent.name}</span>`)
    .join("");
  const badChips = compat.bad
    .map((id) => agents.find((agent) => agent.id === id))
    .filter(Boolean)
    .map((agent) => `<span class="suggestion-chip bad" data-agent-id="${agent.id}">${agent.name}</span>`)
    .join("");
  container.innerHTML = `
    <p class="muted">Link suggestions:</p>
    <div>${goodChips || ""} ${badChips || ""}</div>
    <div class="compat-block">
      <div><strong>Best stacks:</strong> ${stacks.join(", ") || "—"}</div>
      ${warnings ? `<div class="compat-warn">${warnings}</div>` : ""}
    </div>
  `;
};

const createAgentCard = (agent) => {
  const card = document.createElement("div");
  card.className = "agent-card";
  card.setAttribute("draggable", "true");
  card.dataset.agentId = agent.id;
  card.id = agent.id;
  card.innerHTML = `
    <div>
      <strong>${agent.name}</strong>
      <div><span>${agent.role}</span></div>
    </div>
    <span class="agent-tag">${agent.role}</span>
  `;

  card.addEventListener("dragstart", (event) => {
    event.dataTransfer.setData("text/plain", agent.id);
  });

  return card;
};

const renderAgentPool = () => {
  agentPool.innerHTML = "";
  const available = agents.filter((agent) => !state.assignments[agent.id]);
  available.forEach((agent) => agentPool.appendChild(createAgentCard(agent)));
  if (available.length === 0) {
    agentPool.innerHTML = "<p class=\"muted\">All agents assigned. Drag back to release.</p>";
  }
};

const taskCapacityLabel = (size) => `${sizeCaps[size]} slots`;

const renderTasks = () => {
  taskBoard.innerHTML = "";
  tasks.forEach((task) => {
    const card = document.createElement("div");
    card.className = "task-card";

    const capacity = sizeCaps[task.size];
    const used = task.agents.length;
    const filledPercent = Math.min((used / capacity) * 100, 100);

    card.innerHTML = `
      <div class="task-head">
        <div>
          <strong>${task.title}</strong>
          <div class="task-meta">
            <span>Size: ${task.size}</span>
            <span>${taskCapacityLabel(task.size)}</span>
          </div>
        </div>
        <span class="agent-tag">${task.desc}</span>
      </div>
      <div class="capacity">
        <span>${used}/${capacity} assigned</span>
        <div class="capacity-bar"><span style="width: ${filledPercent}%"></span></div>
      </div>
      <div class="task-drop" data-task-id="${task.id}">
        ${task.agents.length === 0 ? "<span class=\"muted\">Drop agents here</span>" : ""}
      </div>
      <div class="suggestions" data-suggestions="${task.id}"></div>
    `;

    const dropZone = card.querySelector(".task-drop");

    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
    });

    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      const agentId = event.dataTransfer.getData("text/plain");
      assignAgentToTask(agentId, task.id);
    });

    const slotContainer = card.querySelector(".task-drop");
    slotContainer.innerHTML = "";
    task.agents.forEach((agentId) => {
      const agent = agents.find((item) => item.id === agentId);
      if (!agent) return;
      const pill = document.createElement("div");
      pill.className = "assigned-agent";
      pill.innerHTML = `
        <span>${agent.name}</span>
        <button type="button" aria-label="Remove">✕</button>
      `;
      pill.querySelector("button").addEventListener("click", () => {
        unassignAgent(agentId);
      });
      slotContainer.appendChild(pill);
    });

    if (task.agents.length === 0) {
      const placeholder = document.createElement("span");
      placeholder.className = "muted";
      placeholder.textContent = "Drop agents here";
      slotContainer.appendChild(placeholder);
    }

    if (task.agents.length > 0) {
      const suggestionTarget = card.querySelector(`[data-suggestions="${task.id}"]`);
      renderCompatibilitySuggestions(task.id, task.agents[0], suggestionTarget);
      suggestionTarget?.querySelectorAll(".suggestion-chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          document.getElementById(chip.dataset.agentId)?.scrollIntoView({ behavior: "smooth" });
        });
      });
    }

    taskBoard.appendChild(card);
  });

  updateStats();
};

const assignAgentToTask = (agentId, taskId) => {
  if (state.assignments[agentId] === taskId) return;
  const task = tasks.find((item) => item.id === taskId);
  if (!task) return;
  const capacity = sizeCaps[task.size];
  if (task.agents.length >= capacity) {
    alert("This task is at capacity. Increase size for more agent slots.");
    return;
  }

  if (state.assignments[agentId]) {
    const currentTask = tasks.find((item) => item.id === state.assignments[agentId]);
    if (currentTask) {
      currentTask.agents = currentTask.agents.filter((id) => id !== agentId);
    }
  }

  task.agents.push(agentId);
  state.assignments[agentId] = taskId;
  const existingLink = state.suggestedLinks.agentToTask.find(
    (link) => link.agentId === agentId && link.taskId === taskId
  );
  if (!existingLink) {
    state.suggestedLinks.agentToTask.push({
      agentId,
      taskId,
      createdAt: new Date().toISOString(),
      assignOnConnect: true,
    });
  }
  const compat = computeCompatibility(agentId);
  state.compatibility[taskId] = {
    ...(state.compatibility[taskId] || {}),
    [agentId]: { good: compat.good, bad: compat.bad },
  };
  renderAgentPool();
  renderTasks();
};

const unassignAgent = (agentId) => {
  const taskId = state.assignments[agentId];
  const task = tasks.find((item) => item.id === taskId);
  if (task) {
    task.agents = task.agents.filter((id) => id !== agentId);
  }
  delete state.assignments[agentId];
  renderAgentPool();
  renderTasks();
};

poolDrop.addEventListener("dragover", (event) => {
  event.preventDefault();
});

poolDrop.addEventListener("drop", (event) => {
  event.preventDefault();
  const agentId = event.dataTransfer.getData("text/plain");
  unassignAgent(agentId);
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.getElementById("taskTitle").value.trim();
  const size = document.getElementById("taskSize").value;
  const desc = document.getElementById("taskDesc").value.trim() || "No description";
  if (!title) return;
  tasks.push({
    id: `t${Date.now()}`,
    title,
    size,
    desc,
    agents: [],
  });
  taskForm.reset();
  renderTasks();
});

renderAgentPool();
renderTasks();

const collectBrief = () => {
  const briefText = document.getElementById("broadcast").value.trim();
  const chips = Array.from(document.querySelectorAll(".chip"));
  const chipText = chips.map((chip) => chip.textContent.trim());
  const priority = chipText.find((text) => text.startsWith("Priority"))?.split(":")[1]?.trim() || "High";
  const mode = chipText.find((text) => text.startsWith("Mode"))?.split(":")[1]?.trim() || "Autonomous";
  const reviewRequired =
    (chipText.find((text) => text.startsWith("Review"))?.split(":")[1]?.trim() || "Required") === "Required";
  return {
    text: briefText,
    priority,
    mode,
    reviewRequired,
  };
};

const saveBriefDraft = (brief) => {
  localStorage.setItem("replicator_latest_brief", JSON.stringify(brief));
};

const broadcastBrief = (brief) => {
  saveBriefDraft(brief);
  localStorage.setItem("replicator_last_transmit", new Date().toISOString());
};

// BRIEF INSIGHTS
const analyzeBrief = (text) => {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const objective = (lines[0] || text.split(".")[0] || "").slice(0, 120);
  const constraintKeywords = ["must", "don't", "no", "require", "approval", "budget", "id", "email", "timeline"];
  const constraints = lines.filter((line) =>
    constraintKeywords.some((keyword) => line.toLowerCase().includes(keyword))
  );
  const softwareKeywords = ["build", "app", "dashboard", "website", "frontend", "backend", "api", "deploy", "ci/cd", "database"];
  const opsKeywords = ["buy", "rent", "land", "notary", "email", "contact", "outreach", "schedule", "negotiate", "fees", "legal"];
  const dataKeywords = ["scrape", "list", "dedupe", "spreadsheet", "dataset"];
  const verifyKeywords = ["verify", "validate", "proof", "risk", "check"];

  const lower = text.toLowerCase();
  const isSoftware = softwareKeywords.some((kw) => lower.includes(kw));
  const isOps = opsKeywords.some((kw) => lower.includes(kw));
  const hasData = dataKeywords.some((kw) => lower.includes(kw));
  const hasVerify = verifyKeywords.some((kw) => lower.includes(kw));

  const recommendedAgents = new Set();
  if (isOps) {
    recommendedAgents.add("Nova");
    recommendedAgents.add("Atlas");
    recommendedAgents.add("Vera");
    recommendedAgents.add("Cipher");
    if (hasData) recommendedAgents.add("Lumen");
    if (hasVerify) recommendedAgents.add("Kestrel");
  }
  if (isSoftware) {
    recommendedAgents.add("Echo");
    recommendedAgents.add("Atlas");
    recommendedAgents.add("Nova");
    recommendedAgents.add("Lumen");
    recommendedAgents.add("Sol");
    recommendedAgents.add("Cipher");
  }

  const pairings = [];
  if (isOps) {
    pairings.push("Nova + Atlas (research → plan)");
    pairings.push("Vera + Cipher (outreach + compliance)");
  }
  if (hasData) {
    pairings.push("Nova + Lumen (sources → structured shortlist)");
  }
  if (hasVerify) {
    pairings.push("Cipher + Kestrel (compliance + validation)");
  }
  if (isSoftware) {
    pairings.push("Echo + Atlas (UX + planning)");
    pairings.push("Lumen + Nova (data + research)");
    pairings.push("Sol + Cipher (deploy + security)");
  }

  const missingLayers = [];
  if (isSoftware) {
    const hasFrontend = recommendedAgents.has("Echo");
    const hasBackend = recommendedAgents.has("Atlas") || recommendedAgents.has("Nova") || recommendedAgents.has("Lumen");
    const hasDb = recommendedAgents.has("Lumen");
    const hasDevops = recommendedAgents.has("Sol") || recommendedAgents.has("Vera");
    if (!hasFrontend) missingLayers.push("frontend");
    if (!hasBackend) missingLayers.push("backend");
    if (!hasDb) missingLayers.push("db");
    if (!hasDevops) missingLayers.push("devops");
  }

  return {
    objective: objective || "No objective detected",
    constraints,
    recommendedAgents: [...recommendedAgents],
    pairings,
    missingLayers,
    timestamp: new Date().toISOString(),
  };
};

const renderBriefInsights = (insights) => {
  if (!briefInsights) return;
  briefInsights.innerHTML = `
    <h4>Brief transmitted</h4>
    <div><strong>Objective:</strong> ${insights.objective}</div>
    <div><strong>Last transmitted:</strong> ${new Date(insights.timestamp).toLocaleTimeString()}</div>
    <div><strong>Recommended agents:</strong> ${insights.recommendedAgents.join(", ") || "—"}</div>
    <div><strong>Recommended pairings:</strong></div>
    <ul>${insights.pairings.map((pair) => `<li>${pair}</li>`).join("") || "<li>—</li>"}</ul>
    <div><strong>Constraints:</strong></div>
    <ul>${insights.constraints.map((c) => `<li>${c}</li>`).join("") || "<li>—</li>"}</ul>
    ${
      insights.missingLayers.length
        ? `<div><strong>Missing layers:</strong> ${insights.missingLayers.join(", ")}</div>`
        : ""
    }
  `;
};

const highlightAgents = (recommendedNames) => {
  const recommendedSet = new Set(recommendedNames);
  document.querySelectorAll(".agent-card").forEach((card) => {
    const name = card.querySelector("strong")?.textContent?.trim();
    if (name && recommendedSet.has(name)) {
      card.classList.add("recommended");
      card.classList.remove("dimmed");
    } else if (name) {
      card.classList.remove("recommended");
      card.classList.add("dimmed");
    }
  });
};

const setBriefStatus = (message) => {
  if (!briefStatus) return;
  briefStatus.textContent = message;
  setTimeout(() => {
    if (briefStatus.textContent === message) {
      briefStatus.textContent = "";
    }
  }, 3000);
};

const normalizePairKey = (a, b) => {
  return [a, b].sort().join("-");
};

const mergeUniqueLinks = (listA, listB, keyFn) => {
  const map = new Map();
  listA.forEach((item) => map.set(keyFn(item), item));
  listB.forEach((item) => map.set(keyFn(item), item));
  return [...map.values()];
};

const createRun = () => {
  const runId = `run_${Date.now()}`;
  const createdAt = new Date().toISOString();
  const savedBrief = localStorage.getItem("replicator_latest_brief");
  const brief = savedBrief ? JSON.parse(savedBrief) : collectBrief();
  const riskValue = localStorage.getItem("replicator_risk") || riskSlider?.value || "3";
  const tempoValue = localStorage.getItem("replicator_tempo") || tempoSlider?.value || "4";

  const runTasks = tasks.map((task, index) => ({
    ...task,
    complexity: sizeComplexity[task.size] ?? 1,
    status: "queued",
    pos: { x: 140 + index * 240, y: 160 + (index % 2) * 180 },
    agents: [],
  }));

  const agentProfiles = {
    a1: {
      codeBadge: "PY",
      tags: ["backend", "data", "research"],
      strengths: ["Rapid prototyping", "Data synthesis", "Summarization"],
      recommendedStacks: ["Python + FastAPI", "Postgres + Redis"],
      conflictsWithTags: ["frontend"],
    },
    a2: {
      codeBadge: "NODE",
      tags: ["backend", "orchestration", "api"],
      strengths: ["Workflow automation", "API design", "System planning"],
      recommendedStacks: ["Node + Express", "Postgres + Redis"],
      conflictsWithTags: ["security"],
    },
    a3: {
      codeBadge: "PY",
      tags: ["data", "db", "backend"],
      strengths: ["ETL pipelines", "Metrics instrumentation", "Data modeling"],
      recommendedStacks: ["Python + Airflow", "BigQuery + dbt"],
    },
    a4: {
      codeBadge: "SEC",
      tags: ["security", "qa", "testing"],
      strengths: ["Threat modeling", "Compliance checks", "Test automation"],
      recommendedStacks: ["OWASP tooling", "Snyk + CI"],
      conflictsWithTags: ["frontend"],
    },
    a5: {
      codeBadge: "REACT",
      tags: ["frontend", "ui", "ux"],
      strengths: ["Interface systems", "UX research", "Design systems"],
      recommendedStacks: ["React + Vite", "Tailwind + Storybook"],
    },
    a6: {
      codeBadge: "DEVOPS",
      tags: ["devops", "infra", "backend"],
      strengths: ["CI/CD pipelines", "Infrastructure automation", "Observability"],
      recommendedStacks: ["Terraform + AWS", "Docker + Kubernetes"],
    },
    a7: {
      codeBadge: "RUST",
      tags: ["backend", "systems", "security"],
      strengths: ["Low-latency services", "Secure systems", "Performance tuning"],
      recommendedStacks: ["Rust + Axum", "Postgres + NATS"],
      conflictsWithTags: ["frontend"],
    },
    a8: {
      codeBadge: "DEVOPS",
      tags: ["ops", "monitoring", "backend"],
      strengths: ["Incident response", "Monitoring", "Reliability engineering"],
      recommendedStacks: ["Grafana + Prometheus", "Kubernetes + Helm"],
    },
  };

  const runAgents = agents.map((agent, index) => ({
    ...agent,
    ...agentProfiles[agent.id],
    skill: Number((0.6 + Math.random() * 0.4).toFixed(2)),
    status: "ready",
    pos: { x: 80 + (index % 2) * 140, y: 120 + index * 70 },
  }));

  const runAssignments = { ...state.assignments };
  Object.entries(runAssignments).forEach(([agentId, taskId]) => {
    const task = runTasks.find((item) => item.id === taskId);
    if (task) {
      task.agents.push(agentId);
    }
  });

  const edges = runTasks.map((task, index) => ({
    from: task.id,
    to: runTasks[index + 1]?.id ?? null,
  })).filter((edge) => edge.to);

  const mergedAgentTaskLinks = mergeUniqueLinks(
    [],
    state.suggestedLinks.agentToTask,
    (link) => `${link.agentId}-${link.taskId}`
  );
  const mergedAgentAgentLinks = mergeUniqueLinks(
    [],
    state.suggestedLinks.agentToAgent,
    (link) => normalizePairKey(link.a, link.b)
  );

  const run = {
    runId,
    createdAt,
    brief,
    settings: {
      risk: riskValue,
      tempo: tempoValue,
    },
    version: 2,
    ui: {
      riskAppetite: riskValue,
      executionTempo: tempoValue,
    },
    agents: runAgents,
    tasks: runTasks,
    edges,
    assignments: runAssignments,
    compatibility: JSON.parse(JSON.stringify(state.compatibility)),
    workspaceAgentIds: [],
    links: {
      agentToTask: mergedAgentTaskLinks,
      agentToAgent: mergedAgentAgentLinks,
    },
    metrics: {
      efficiencyScore: 0,
      activeAgents: Object.keys(runAssignments).length,
      idleAgents: agents.length - Object.keys(runAssignments).length,
      bottleneckTaskId: null,
    },
  };

  localStorage.setItem(`replicator_run_${runId}`, JSON.stringify(run));
  localStorage.setItem("replicator_latest_run", runId);
  return runId;
};

if (transmitBtn) {
  transmitBtn.addEventListener("click", () => {
    const brief = collectBrief();
    broadcastBrief(brief);
    setBriefStatus(`Transmitted ${new Date().toLocaleTimeString()}`);
    const insights = analyzeBrief(brief.text);
    localStorage.setItem("replicator_brief_insights_latest", JSON.stringify(insights));
    renderBriefInsights(insights);
    highlightAgents(insights.recommendedAgents);
  });
}

if (saveBriefBtn) {
  saveBriefBtn.addEventListener("click", () => {
    const brief = collectBrief();
    saveBriefDraft(brief);
    setBriefStatus("Saved");
  });
}

if (deployBtn) {
  deployBtn.addEventListener("click", () => {
    const brief = collectBrief();
    broadcastBrief(brief);
    const runId = createRun();
    window.location.href = `graph.html?runId=${encodeURIComponent(runId)}`;
  });
}

if (riskSlider) {
  riskSlider.addEventListener("input", () => {
    localStorage.setItem("replicator_risk", riskSlider.value);
  });
}

if (tempoSlider) {
  tempoSlider.addEventListener("input", () => {
    localStorage.setItem("replicator_tempo", tempoSlider.value);
  });
}

const receptionist = (() => {
  const STORAGE_KEY = "replicator_receptionist_runs";
  const CONTACTS_KEY = "replicator_contacts";

  const form = document.getElementById("receptionistForm");
  const intentInput = document.getElementById("intentInput");
  const intentError = document.getElementById("intentError");
  const runsSelect = document.getElementById("receptionistRuns");
  const pushPlanBtn = document.getElementById("pushPlanBtn");
  const toastEl = document.getElementById("receptionistToast");

  const planEl = document.getElementById("receptionistPlan");
  const contactsEl = document.getElementById("receptionistContacts");
  const draftsEl = document.getElementById("receptionistDrafts");
  const auditEl = document.getElementById("receptionistAudit");

  const tabs = document.querySelectorAll(".receptionist .tab");
  const panels = document.querySelectorAll(".receptionist .tab-panel");
  let currentRun = null;

  const getRuns = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  };

  const saveRuns = (runs) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  };

  const getContacts = () => {
    const raw = localStorage.getItem(CONTACTS_KEY);
    return raw ? JSON.parse(raw) : [];
  };

  const saveRun = (run) => {
    const runs = getRuns();
    runs.unshift(run);
    saveRuns(runs);
  };

  const updateRun = (run) => {
    const runs = getRuns();
    const idx = runs.findIndex((item) => item.runId === run.runId);
    if (idx >= 0) {
      runs[idx] = run;
      saveRuns(runs);
    }
  };

  const logAudit = (run, type, message, meta = {}) => {
    run.auditLog.unshift({
      at: new Date().toISOString(),
      type,
      message,
      meta,
    });
  };

  const toTitleCase = (value) =>
    value
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ");

  const parseIntent = (text, fields) => {
    const lowered = text.toLowerCase();
    const objectiveKeywords = ["buy", "sell", "rent", "hire", "research", "build"];
    const objective = objectiveKeywords.find((key) => lowered.includes(key)) || "research";

    return {
      objective,
      country: fields.country ? toTitleCase(fields.country) : "",
      region: fields.region || "",
      budgetMin: fields.budgetMin || "",
      budgetMax: fields.budgetMax || "",
      assetType: fields.assetType || "",
      timeline: fields.timeline || "",
      language: fields.language || "",
      constraints: [],
    };
  };

  const mapSuggestedAgents = (roles) => {
    const roleMap = {
      Planning: ["Atlas"],
      Research: ["Nova"],
      Data: ["Lumen"],
      QA: ["Kestrel"],
      UX: ["Echo"],
      Deployment: ["Sol"],
      Ops: ["Vera"],
      Security: ["Cipher"],
    };
    return roles.flatMap((role) => roleMap[role] || []);
  };

  const generatePlan = (intentParsed, agentList) => {
    const baseTasks = [
      {
        title: "Define search criteria",
        rationale: "Confirm scope, requirements, and constraints.",
        deliverable: "Criteria checklist",
        suggestedAgentRoles: ["Planning", "Research"],
      },
      {
        title: "Identify listing sources",
        rationale: "Map public listing sources and local channels.",
        deliverable: "Source list",
        suggestedAgentRoles: ["Research", "Data"],
      },
      {
        title: "Shortlist viable options",
        rationale: "Evaluate options against criteria and budget.",
        deliverable: "Shortlist",
        suggestedAgentRoles: ["Data", "QA"],
      },
      {
        title: "Request legal process + fees",
        rationale: "Understand acquisition process and required filings.",
        deliverable: "Legal checklist",
        suggestedAgentRoles: ["Security", "Planning"],
      },
      {
        title: "Arrange viewings / calls",
        rationale: "Set up conversations with contacts and visits.",
        deliverable: "Call schedule",
        suggestedAgentRoles: ["Ops", "Planning"],
      },
      {
        title: "Draft offer / LOI checklist",
        rationale: "Prepare negotiation-ready materials.",
        deliverable: "Offer checklist",
        suggestedAgentRoles: ["QA", "Planning"],
      },
    ];

    const objectiveExtras = intentParsed.objective === "sell"
      ? [{
          title: "Prepare asset listing pack",
          rationale: "Compile marketing materials for sellers.",
          deliverable: "Listing package",
          suggestedAgentRoles: ["UX", "Research"],
        }]
      : intentParsed.objective === "hire"
        ? [{
            title: "Define hiring scorecard",
            rationale: "Align stakeholders on hiring criteria.",
            deliverable: "Scorecard",
            suggestedAgentRoles: ["Planning", "QA"],
          }]
        : [];

    const tasksList = [...baseTasks, ...objectiveExtras].slice(0, 8).map((task, index) => ({
      id: `plan_${Date.now()}_${index}`,
      status: "queued",
      ...task,
    }));

    return {
      tasks: tasksList,
      riskNotes: [
        "No automated outreach. Drafts require approval.",
        "Contacts only from provided sources.",
      ],
    };
  };

  const sizeRank = ["S", "M", "L", "XL"];

  const planTaskToOrchestratorTask = (planTask) => {
    const rationale = (planTask.rationale || "").toLowerCase();
    const deliverable = (planTask.deliverable || "").toLowerCase();
    let size = planTask.status === "queued" ? "M" : "S";
    if (rationale.includes("legal") || rationale.includes("compliance") || rationale.includes("security")) {
      size = "L";
    }
    if (deliverable.includes("shortlist") || deliverable.includes("pipeline") || deliverable.includes("automation")) {
      size = "L";
    }
    if (rationale.includes("automation") || deliverable.includes("automation")) {
      size = "XL";
    }
    if (!sizeRank.includes(size)) {
      size = "M";
    }

    return {
      title: planTask.title,
      size,
      desc: `${planTask.deliverable}${planTask.rationale ? ` — ${planTask.rationale}` : ""}`,
      agents: [],
      fromReceptionist: true,
    };
  };

  const pushReceptionistRunToOrchestrator = (receptionRun, options = {}) => {
    if (!receptionRun) return { count: 0 };
    const { mode = "append", tagPrefix = "[Receptionist]" } = options;

    if (mode === "replace") {
      tasks
        .filter((task) => task.fromReceptionist || task.title.startsWith(tagPrefix))
        .forEach((task) => {
          task.agents.forEach((agentId) => {
            delete state.assignments[agentId];
          });
          task.agents = [];
        });
      const remaining = tasks.filter(
        (task) => !task.fromReceptionist && !task.title.startsWith(tagPrefix)
      );
      tasks.length = 0;
      tasks.push(...remaining);
    }

    const created = receptionRun.plan.tasks.map((planTask, index) => {
      const mapped = planTaskToOrchestratorTask(planTask);
      let id = `rt_${receptionRun.runId}_${index}`;
      let suffix = 0;
      while (tasks.some((task) => task.id === id)) {
        suffix += 1;
        id = `rt_${receptionRun.runId}_${index}_${suffix}`;
      }
      return {
        ...mapped,
        id,
        title: `${tagPrefix} ${mapped.title}`,
      };
    });

    tasks.push(...created);
    return { count: created.length };
  };

  const buildContactPlan = (intentParsed, contacts) => {
    const groups = {
      brokers: [],
      notaries: [],
      lawFirms: [],
      sellers: [],
      other: [],
    };

    const filtered = contacts.filter((contact) => {
      if (!intentParsed.country) return true;
      return contact.country?.toLowerCase() === intentParsed.country.toLowerCase();
    });

    filtered.forEach((contact) => {
      const role = (contact.roleType || "").toLowerCase();
      if (role.includes("broker")) groups.brokers.push(contact.id);
      else if (role.includes("notary")) groups.notaries.push(contact.id);
      else if (role.includes("law")) groups.lawFirms.push(contact.id);
      else if (role.includes("seller")) groups.sellers.push(contact.id);
      else groups.other.push(contact.id);
    });

    return { groups };
  };

  const generateDrafts = (run, contacts) => {
    const groups = run.contactPlan.groups;
    const targetIds = [...groups.brokers, ...groups.notaries, ...groups.lawFirms];
    const drafts = [];

    targetIds.forEach((contactId) => {
      const contact = contacts.find((item) => item.id === contactId);
      if (!contact || contact.doNotContact) return;

      let subject = "";
      let body = "";
      if (groups.brokers.includes(contactId)) {
        subject = "Property search inquiry";
        body = `Hello ${contact.name},\n\nI'm looking for ${run.intentParsed.assetType || "a property"} in ${
          run.intentParsed.region || run.intentParsed.country || "your market"
        }. Could you share listings that match a budget of ${run.intentParsed.budgetMin || ""}-${
          run.intentParsed.budgetMax || ""
        }?\n\nThank you.`;
      } else if (groups.notaries.includes(contactId)) {
        subject = "Notary process + fees inquiry";
        body = `Hello ${contact.name},\n\nCould you outline the notary process and typical fees for acquiring ${
          run.intentParsed.assetType || "property"
        } in ${run.intentParsed.country || "your region"}?\n\nThanks.`;
      } else if (groups.lawFirms.includes(contactId)) {
        subject = "Due diligence support availability";
        body = `Hello ${contact.name},\n\nWe are planning a ${run.intentParsed.objective} and would like to confirm your availability for due diligence and compliance support.\n\nRegards.`;
      }

      drafts.push({
        id: `draft_${Date.now()}_${contactId}`,
        contactId,
        channel: "email",
        subject,
        body,
        status: "draft",
        createdAt: new Date().toISOString(),
      });
    });

    return drafts;
  };

  const exportDrafts = (run) => {
    const approved = run.draftsQueue.filter((draft) => draft.status === "approved");
    if (!approved.length) return;
    const blob = new Blob([JSON.stringify(approved, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receptionist_drafts_${run.runId}.json`;
    link.click();
    URL.revokeObjectURL(url);

    approved.forEach((draft) => {
      draft.status = "exported";
    });
    logAudit(run, "export", "Exported approved drafts", { count: approved.length });
    updateRun(run);
    renderReceptionist(run);
  };

  const showToast = (message) => {
    if (!toastEl) return;
    toastEl.textContent = message;
    setTimeout(() => {
      if (toastEl.textContent === message) {
        toastEl.textContent = "";
      }
    }, 3000);
  };

  const renderReceptionist = (run) => {
    if (!run) return;
    currentRun = run;
    planEl.innerHTML = run.plan.tasks
      .map(
        (task) => `
        <div class="plan-card">
          <h4>${task.title}</h4>
          <p class="muted">${task.rationale}</p>
          <p><strong>Deliverable:</strong> ${task.deliverable}</p>
          <p><strong>Agents:</strong> ${task.suggestedAgentRoles.join(", ")}</p>
          <p class="muted">Suggested: ${mapSuggestedAgents(task.suggestedAgentRoles).join(", ") || "—"}</p>
          <span class="status-chip">${task.status}</span>
        </div>
      `
      )
      .join("");

    const contacts = getContacts();
    const missingWarnings = [];
    const groups = run.contactPlan.groups;
    const renderGroup = (label, ids) => {
      if (!ids.length) {
        missingWarnings.push(`${label} contacts missing`);
      }
      const list = ids
        .map((id) => contacts.find((contact) => contact.id === id))
        .filter(Boolean)
        .map((contact) => `<li>${contact.name} (${contact.organization || ""})</li>`)
        .join("");
      return `
        <div class="contact-group">
          <h4>${label} (${ids.length})</h4>
          <ul>${list || "<li class=\"muted\">No contacts</li>"}</ul>
        </div>
      `;
    };

    contactsEl.innerHTML = [
      renderGroup("Brokers", groups.brokers),
      renderGroup("Notaries", groups.notaries),
      renderGroup("Law Firms", groups.lawFirms),
      renderGroup("Sellers", groups.sellers),
      renderGroup("Other", groups.other),
      missingWarnings.length
        ? `<div class="warning-chip">${missingWarnings.join(" · ")}</div>`
        : "",
    ].join("");

    draftsEl.innerHTML = run.draftsQueue
      .map((draft) => {
        const contact = contacts.find((item) => item.id === draft.contactId);
        return `
          <div class="draft-card">
            <h4>${contact?.name || "Unknown"} ${contact?.organization ? `(${contact.organization})` : ""}</h4>
            <p class="muted">${draft.subject}</p>
            <textarea data-draft-body="${draft.id}">${draft.body}</textarea>
            <div class="draft-actions">
              <span class="status-chip">${draft.status}</span>
              <button class="ghost" data-action="approve" data-id="${draft.id}">Approve</button>
              <button class="primary" data-action="export" data-id="${draft.id}">Export</button>
            </div>
          </div>
        `;
      })
      .join("");

    auditEl.innerHTML = run.auditLog
      .slice(0, 20)
      .map((entry) => `<li><strong>${entry.type}</strong> ${entry.message} <span class="muted">${entry.at}</span></li>`)
      .join("");

    draftsEl.querySelectorAll("textarea[data-draft-body]").forEach((textarea) => {
      textarea.addEventListener("input", (event) => {
        const id = event.target.dataset.draftBody;
        const target = run.draftsQueue.find((item) => item.id === id);
        if (target) {
          target.body = event.target.value;
          updateRun(run);
        }
      });
    });

    draftsEl.querySelectorAll("button[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const id = button.dataset.id;
        const draft = run.draftsQueue.find((item) => item.id === id);
        if (!draft) return;
        if (button.dataset.action === "approve") {
          draft.status = "approved";
          logAudit(run, "approve", `Approved draft ${id}`);
          updateRun(run);
          renderReceptionist(run);
        }
        if (button.dataset.action === "export") {
          exportDrafts(run);
        }
      });
    });
  };

  const loadRunsDropdown = () => {
    const runs = getRuns();
    runsSelect.innerHTML = runs
      .map((run) => `<option value="${run.runId}">${run.intentRaw.slice(0, 40) || run.runId}</option>`)
      .join("");
    if (!runs.length) {
      const option = document.createElement("option");
      option.textContent = "No runs";
      option.value = "";
      runsSelect.appendChild(option);
    }
  };

  const createRun = (intentRaw, fields) => {
    const intentParsed = parseIntent(intentRaw, fields);
    const plan = generatePlan(intentParsed, agents);
    const contacts = getContacts();
    const contactPlan = buildContactPlan(intentParsed, contacts);

    const run = {
      runId: `reception_${Date.now()}`,
      createdAt: new Date().toISOString(),
      intentRaw,
      intentParsed,
      plan,
      contactPlan,
      draftsQueue: [],
      auditLog: [],
    };

    logAudit(run, "plan", "Generated plan", { objective: intentParsed.objective });

    const drafts = generateDrafts(run, contacts);
    if (drafts.length) {
      run.draftsQueue = drafts;
      logAudit(run, "drafts", "Generated drafts", { count: drafts.length });
    } else {
      logAudit(run, "drafts", "No drafts generated", { count: 0 });
    }

    saveRun(run);
    return run;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    intentError.textContent = "";
    const intentRaw = intentInput.value.trim();
    if (!intentRaw) {
      intentError.textContent = "Intent is required.";
      return;
    }

    const fields = {
      country: document.getElementById("intentCountry").value.trim(),
      region: document.getElementById("intentRegion").value.trim(),
      budgetMin: document.getElementById("budgetMin").value.trim(),
      budgetMax: document.getElementById("budgetMax").value.trim(),
      assetType: document.getElementById("assetType").value,
      timeline: document.getElementById("timeline").value.trim(),
      language: document.getElementById("language").value.trim(),
    };

    const run = createRun(intentRaw, fields);
    loadRunsDropdown();
    runsSelect.value = run.runId;
    renderReceptionist(run);
  };

  const handleTabClick = (event) => {
    const tab = event.target.closest(".tab");
    if (!tab) return;
    const target = tab.dataset.tab;
    tabs.forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === target);
    });
  };

  const handleRunSelect = () => {
    const runId = runsSelect.value;
    const run = getRuns().find((item) => item.runId === runId);
    if (run) {
      renderReceptionist(run);
    }
  };

  const init = () => {
    if (!form) return;
    loadRunsDropdown();
    form.addEventListener("submit", handleSubmit);
    tabs.forEach((tab) => tab.addEventListener("click", handleTabClick));
    runsSelect.addEventListener("change", handleRunSelect);
    if (!pushPlanBtn && planEl) {
      const fallbackBtn = document.createElement("button");
      fallbackBtn.type = "button";
      fallbackBtn.id = "pushPlanBtn";
      fallbackBtn.className = "ghost";
      fallbackBtn.textContent = "Push plan to Task Orchestrator";
      planEl.prepend(fallbackBtn);
      fallbackBtn.addEventListener("click", () => {
        if (!currentRun) return;
        const result = pushReceptionistRunToOrchestrator(currentRun, { mode: "append" });
        renderTasks();
        renderAgentPool();
        updateStats();
        showToast(`✅ Pushed ${result.count} tasks to Task Orchestrator`);
        document.querySelector(".tasks")?.scrollIntoView({ behavior: "smooth" });
      });
    }
    if (pushPlanBtn) {
      pushPlanBtn.addEventListener("click", () => {
        if (!currentRun) return;
        const result = pushReceptionistRunToOrchestrator(currentRun, { mode: "append" });
        renderTasks();
        renderAgentPool();
        updateStats();
        showToast(`✅ Pushed ${result.count} tasks to Task Orchestrator`);
        document.querySelector(".tasks")?.scrollIntoView({ behavior: "smooth" });
      });
    }
  };

  init();
  return {
    parseIntent,
    generatePlan,
    buildContactPlan,
    generateDrafts,
  };
})();