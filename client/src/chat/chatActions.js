const ALLOWED_TYPES = new Set(["resource", "scenario", "progress", "assessment", "resources", "scenarios"]);
const ALLOWED_PAGES = new Set(["resources", "scenarios", "progress", "assessment"]);
const ALLOWED_SOURCE_PAGES = new Set(["resources"]);
const ALLOWED_TARGET_FIELDS = new Set([
  "page",
  "resourceId",
  "resourceSlug",
  "scenarioId",
  "scenarioSlug",
  "sectionId",
]);
const ALLOWED_SOURCE_TARGET_FIELDS = new Set(["page", "resourceId", "resourceSlug"]);

export function resolveChatActionTarget(target = {}) {
  if (!target || typeof target !== "object" || !ALLOWED_PAGES.has(target.page)) return null;
  const safeTarget = {};
  Object.entries(target).forEach(([key, value]) => {
    if (ALLOWED_TARGET_FIELDS.has(key) && value !== undefined && value !== null && value !== "") {
      safeTarget[key] = value;
    }
  });
  if (safeTarget.page === "scenarios") {
    if (!safeTarget.scenarioId && target.id !== undefined && target.id !== null && target.id !== "") {
      safeTarget.scenarioId = target.id;
    }
    if (!safeTarget.scenarioSlug && target.slug) {
      safeTarget.scenarioSlug = target.slug;
    }
  }
  return safeTarget.page ? safeTarget : null;
}

export function buildProposalPayloadForChatAction(action = {}) {
  const target = resolveChatActionTarget(action?.target);
  if (!target) return null;
  if (target.page === "resources") {
    return {
      actionType: "open_resource",
      arguments: {
        ...(target.resourceId ? { resourceId: target.resourceId } : {}),
        ...(target.resourceSlug ? { resourceSlug: target.resourceSlug } : {}),
      },
    };
  }
  if (target.page === "scenarios") {
    return {
      actionType: "open_scenario",
      arguments: {
        ...(target.scenarioId ? { scenarioId: target.scenarioId } : {}),
        ...(target.scenarioSlug ? { scenarioSlug: target.scenarioSlug } : {}),
      },
    };
  }
  if (target.page === "progress" && action?.recommendationId) {
    return {
      actionType: "open_recommendation",
      arguments: { recommendationId: action.recommendationId },
    };
  }
  return null;
}

export function resolveChatSourceTarget(target = {}) {
  if (!target || typeof target !== "object" || !ALLOWED_SOURCE_PAGES.has(target.page)) return null;
  const safeTarget = {};
  Object.entries(target).forEach(([key, value]) => {
    if (ALLOWED_SOURCE_TARGET_FIELDS.has(key) && value !== undefined && value !== null && value !== "") {
      safeTarget[key] = value;
    }
  });
  return safeTarget.page ? safeTarget : null;
}

export function resolveSafeSourceUrl(sourceUrl = "") {
  if (!sourceUrl || typeof sourceUrl !== "string") return "";
  try {
    const parsed = new URL(sourceUrl);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed.href : "";
  } catch {
    return "";
  }
}

function normalizeSourceKeyPart(value = "") {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function getSourceDedupeKey(source = {}) {
  const resourceSlug = source.internalTarget?.resourceSlug;
  if (resourceSlug) return `resource:${normalizeSourceKeyPart(resourceSlug)}`;
  if (source.sourceUrl) return `url:${normalizeSourceKeyPart(source.sourceUrl)}`;
  const label = source.sourceLabel || source.sourceOrganisation || "";
  return [
    "title",
    normalizeSourceKeyPart(source.title),
    normalizeSourceKeyPart(label),
    normalizeSourceKeyPart(source.locale),
  ].join(":");
}

function getUsefulSnippet(source = {}) {
  return String(source.snippet || "").trim();
}

function choosePreferredSource(current, next) {
  if (!current) return next;
  if (next.citationOrder < current.citationOrder) return next;
  if (next.citationOrder > current.citationOrder) return current;
  const currentSnippet = getUsefulSnippet(current);
  const nextSnippet = getUsefulSnippet(next);
  if (nextSnippet && (!currentSnippet || nextSnippet.length < currentSnippet.length)) return next;
  return current.id <= next.id ? current : next;
}

export function dedupeChatSources(sources = []) {
  if (!Array.isArray(sources)) return [];
  const byKey = new Map();
  sources.forEach(source => {
    if (!source?.title || !source?.snippet) return;
    const key = getSourceDedupeKey(source);
    byKey.set(key, choosePreferredSource(byKey.get(key), source));
  });
  return Array.from(byKey.values()).sort((a, b) => {
    if (a.citationOrder !== b.citationOrder) return a.citationOrder - b.citationOrder;
    return a.id - b.id;
  });
}

export function mapServerActions(actions = []) {
  if (!Array.isArray(actions)) return [];
  return actions
    .map(action => {
      if (!action || !ALLOWED_TYPES.has(action.type)) return null;
      const target = resolveChatActionTarget(action.target);
      if (!target) return null;
      return {
        id: Number(action.id),
        type: action.type,
        labelKey: action.labelKey || "chat.actions.continueLearning",
        title: action.title || "",
        description: action.description || "",
        target,
        displayOrder: Number(action.displayOrder || 0),
      };
    })
    .filter(action => action && Number.isInteger(action.id) && action.id > 0)
    .sort((a, b) => {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder;
      return a.id - b.id;
    });
}

export function mapServerSources(sources = []) {
  if (!Array.isArray(sources)) return [];
  const mappedSources = sources
    .map(source => {
      if (!source || !source.title || !source.snippet) return null;
      const internalTarget = resolveChatSourceTarget(source.internalTarget);
      return {
        id: Number(source.id),
        title: String(source.title || ""),
        sourceLabel: source.sourceLabel || "",
        sourceOrganisation: source.sourceOrganisation || "",
        sourceUrl: resolveSafeSourceUrl(source.sourceUrl || ""),
        locale: source.locale || "",
        snippet: String(source.snippet || ""),
        internalTarget,
        citationOrder: Number(source.citationOrder || 0),
      };
    })
    .filter(source => (
      source &&
      Number.isInteger(source.id) &&
      source.id > 0 &&
      source.title &&
      source.snippet
    ))
    .sort((a, b) => {
      if (a.citationOrder !== b.citationOrder) return a.citationOrder - b.citationOrder;
      return a.id - b.id;
    });
  return dedupeChatSources(mappedSources);
}

export function mapServerProposal(proposal = null) {
  if (!proposal || typeof proposal !== "object") return null;
  const proposalId = String(proposal.proposalId || "").trim();
  const actionType = String(proposal.actionType || "").trim();
  if (!proposalId || !actionType) return null;
  const target = proposal.target && typeof proposal.target === "object"
    ? {
        type: String(proposal.target.type || ""),
        ...(proposal.target.id ? { id: Number(proposal.target.id) } : {}),
        ...(proposal.target.label ? { label: String(proposal.target.label) } : {}),
      }
    : null;
  if (!target?.type) return null;
  return {
    proposalId,
    actionType,
    title: String(proposal.title || ""),
    explanation: String(proposal.explanation || ""),
    consequence: String(proposal.consequence || ""),
    mode: String(proposal.mode || ""),
    riskLevel: String(proposal.riskLevel || ""),
    target,
    requiresConfirmation: Boolean(proposal.requiresConfirmation),
    status: proposal.status || "pending",
    createdAt: proposal.createdAt || null,
    expiresAt: proposal.expiresAt || null,
    confirmationToken: proposal.confirmationToken || "",
  };
}

export function withMessageProposal(message, proposal = null) {
  if (!message || message.role !== "ai") return message;
  return {
    ...message,
    proposal: mapServerProposal(proposal),
  };
}

function actionMatchesProposal(action = {}, proposal = null) {
  if (!proposal?.target) return false;
  if (proposal.actionType === "open_resource" && action.target?.page === "resources" && proposal.target.type === "resource") {
    return Number(action.target.resourceId) === Number(proposal.target.id);
  }
  if (proposal.actionType === "open_scenario" && action.target?.page === "scenarios" && proposal.target.type === "scenario") {
    return Number(action.target.scenarioId) === Number(proposal.target.id);
  }
  return false;
}

export function dedupeActionsAgainstProposal(actions = [], proposal = null) {
  if (!Array.isArray(actions) || !proposal) return Array.isArray(actions) ? actions : [];
  return actions.filter(action => !actionMatchesProposal(action, proposal));
}

export function attachActionGroupsToMessages(messages = [], actionGroups = []) {
  if (!Array.isArray(messages) || !Array.isArray(actionGroups)) return messages;
  const actionsByMessageId = new Map();
  actionGroups.forEach(group => {
    const messageId = Number(group?.messageId);
    if (!messageId) return;
    actionsByMessageId.set(messageId, mapServerActions(group.actions || []));
  });

  return messages.map(message => {
    if (message.role !== "ai") return message;
    return {
      ...message,
      actions: actionsByMessageId.get(Number(message.id)) || [],
    };
  });
}

export function attachSourceGroupsToMessages(messages = [], sourceGroups = []) {
  if (!Array.isArray(messages) || !Array.isArray(sourceGroups)) return messages;
  const sourcesByMessageId = new Map();
  sourceGroups.forEach(group => {
    const messageId = Number(group?.messageId);
    if (!messageId) return;
    sourcesByMessageId.set(messageId, mapServerSources(group.sources || []));
  });

  return messages.map(message => {
    if (message.role !== "ai") return message;
    return {
      ...message,
      sources: sourcesByMessageId.get(Number(message.id)) || [],
    };
  });
}

export function withMessageActions(message, actions = []) {
  if (!message || message.role !== "ai") return message;
  return {
    ...message,
    actions: mapServerActions(actions),
  };
}

export function withMessageSources(message, sources = []) {
  if (!message || message.role !== "ai") return message;
  return {
    ...message,
    sources: mapServerSources(sources),
  };
}

export function getScenarioActionSlug(target = {}, scenarios = []) {
  if (target.scenarioSlug) return target.scenarioSlug;
  if (!target.scenarioId) return null;
  const match = scenarios.find(scenario => Number(scenario.id) === Number(target.scenarioId));
  return match?.slug || null;
}

export function isScenarioHighlightMatch(highlight = null, scenario = {}) {
  if (!highlight || !scenario) return false;
  const highlightSlug = highlight.scenarioSlug || highlight.slug || null;
  const highlightId = Number(highlight.scenarioId || highlight.id || 0);
  if (highlightSlug && scenario.slug === highlightSlug) return true;
  return Boolean(highlightId && Number(scenario.id) === highlightId);
}

function isSafeScenarioSlug(value = "") {
  return /^[a-z0-9][a-z0-9_-]{0,159}$/i.test(String(value || "").trim());
}

const RECOMMENDED_SCENARIO_TARGET_KEY = "cyberly.recommendedScenarioTarget";
const ALLOWED_RECOMMENDED_SCENARIO_SOURCES = new Set(["dashboard", "progress", "cyberguard", "legacy"]);

function getScenarioStorage() {
  if (typeof window === "undefined" || !window.sessionStorage) return null;
  return window.sessionStorage;
}

function normalizeRecommendedScenarioTarget(target = {}, source = "unknown") {
  const scenarioSlug = String(target.scenarioSlug || target.slug || "").trim();
  const scenarioId = Number(target.scenarioId || target.id || 0);
  if (scenarioSlug && isSafeScenarioSlug(scenarioSlug)) {
    return {
      slug: scenarioSlug,
      source: ALLOWED_RECOMMENDED_SCENARIO_SOURCES.has(source) ? source : "unknown",
      createdAt: new Date().toISOString(),
    };
  }
  if (Number.isInteger(scenarioId) && scenarioId > 0) {
    return {
      id: scenarioId,
      source: ALLOWED_RECOMMENDED_SCENARIO_SOURCES.has(source) ? source : "unknown",
      createdAt: new Date().toISOString(),
    };
  }
  return null;
}

export function clearRecommendedScenarioTarget() {
  try {
    getScenarioStorage()?.removeItem(RECOMMENDED_SCENARIO_TARGET_KEY);
  } catch {}
}

export function readRecommendedScenarioTarget() {
  try {
    const raw = getScenarioStorage()?.getItem(RECOMMENDED_SCENARIO_TARGET_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeRecommendedScenarioTarget(parsed, parsed.source);
  } catch {
    clearRecommendedScenarioTarget();
    return null;
  }
}

export function consumeRecommendedScenarioTarget() {
  const target = readRecommendedScenarioTarget();
  clearRecommendedScenarioTarget();
  return target;
}

export function buildRecommendedScenarioNavigation(target = {}, source = "unknown") {
  const safeTarget = normalizeRecommendedScenarioTarget(target, source);
  clearRecommendedScenarioTarget();
  if (safeTarget) {
    try {
      getScenarioStorage()?.setItem(RECOMMENDED_SCENARIO_TARGET_KEY, JSON.stringify(safeTarget));
    } catch {}
  }
  return "#/scenarios";
}

export function buildScenarioHighlightLink(target = {}) {
  const scenarioSlug = String(target.scenarioSlug || "").trim();
  if (scenarioSlug && isSafeScenarioSlug(scenarioSlug)) {
    return `#/scenarios?highlight=${encodeURIComponent(scenarioSlug)}`;
  }
  const scenarioId = Number(target.scenarioId);
  if (Number.isInteger(scenarioId) && scenarioId > 0) {
    return `#/scenarios?highlight=${scenarioId}`;
  }
  return "#/scenarios";
}

export function parseScenarioHighlightTargetFromHash(hashValue = "") {
  const raw = String(hashValue || "");
  if (!raw.startsWith("#/scenarios")) return null;
  const queryIndex = raw.indexOf("?");
  if (queryIndex < 0) return null;
  const query = raw.slice(queryIndex + 1).split("#")[0];
  const params = new URLSearchParams(query);
  const highlightValue = String(params.get("highlight") || "").trim();
  const legacyScenarioValue = String(params.get("scenario") || "").trim();
  const legacy = !highlightValue && Boolean(legacyScenarioValue);
  const scenarioValue = highlightValue || legacyScenarioValue;
  if (!scenarioValue) return null;
  if (/^\d+$/.test(scenarioValue)) {
    const scenarioId = Number(scenarioValue);
    return Number.isInteger(scenarioId) && scenarioId > 0
      ? { scenarioSlug: null, scenarioId, legacy }
      : null;
  }
  if (!isSafeScenarioSlug(scenarioValue)) return null;
  return { scenarioSlug: scenarioValue, scenarioId: null, legacy };
}
