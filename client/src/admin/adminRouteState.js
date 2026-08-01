export const ADMIN_CANONICAL_ROOT = "#/admin/resources";

function numericId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function adminNotFound(hashValue) {
  const canonicalHash = String(hashValue || "#/admin").startsWith("#")
    ? String(hashValue || "#/admin")
    : `#/${String(hashValue || "admin").replace(/^\/?/, "")}`;
  return {
    section: null,
    view: "notFound",
    resourceId: null,
    scenarioId: null,
    canonicalHash,
    shouldReplace: false,
    notFound: true,
  };
}

export function buildAdminHash({ section, view = "list", resourceId = null, scenarioId = null } = {}) {
  if (section === "resources") {
    if (view === "new") return "#/admin/resources/new";
    if (view === "edit" && numericId(resourceId)) return `#/admin/resources/${resourceId}/edit`;
    if (view === "metadata" && numericId(resourceId)) return `#/admin/resources/${resourceId}/metadata`;
    return ADMIN_CANONICAL_ROOT;
  }
  if (section === "scenarios") {
    if (view === "new") return "#/admin/scenarios/new";
    if (view === "edit" && numericId(scenarioId)) return `#/admin/scenarios/${scenarioId}/edit`;
    return "#/admin/scenarios";
  }
  if (section === "ai-agentic") return "#/admin/ai-agentic";
  return ADMIN_CANONICAL_ROOT;
}

export function parseAdminRoute(hashValue = typeof window !== "undefined" ? window.location.hash : "") {
  const raw = String(hashValue || "#/admin");
  const normalized = raw.replace(/^#\/?/, "").replace(/^\/+/, "");
  const parts = normalized.split("/").filter(Boolean);
  if (parts[0] !== "admin") return adminNotFound(raw);

  if (parts.length === 1) {
    return {
      section: "resources",
      view: "list",
      resourceId: null,
      scenarioId: null,
      canonicalHash: ADMIN_CANONICAL_ROOT,
      shouldReplace: true,
      notFound: false,
    };
  }

  const [, section, idOrAction, action] = parts;

  if (section === "resources") {
    if (parts.length === 2) {
      return { section, view: "list", resourceId: null, scenarioId: null, canonicalHash: ADMIN_CANONICAL_ROOT, shouldReplace: false, notFound: false };
    }
    if (idOrAction === "new" && parts.length === 3) {
      return { section, view: "new", resourceId: null, scenarioId: null, canonicalHash: "#/admin/resources/new", shouldReplace: false, notFound: false };
    }
    const resourceId = numericId(idOrAction);
    if (resourceId && (action === "edit" || action === "metadata") && parts.length === 4) {
      return {
        section,
        view: action,
        resourceId,
        scenarioId: null,
        canonicalHash: `#/admin/resources/${resourceId}/${action}`,
        shouldReplace: false,
        notFound: false,
      };
    }
    return adminNotFound(raw);
  }

  if (section === "scenarios") {
    if (parts.length === 2) {
      return { section, view: "list", resourceId: null, scenarioId: null, canonicalHash: "#/admin/scenarios", shouldReplace: false, notFound: false };
    }
    if (idOrAction === "new" && parts.length === 3) {
      return { section, view: "new", resourceId: null, scenarioId: null, canonicalHash: "#/admin/scenarios/new", shouldReplace: false, notFound: false };
    }
    const scenarioId = numericId(idOrAction);
    if (scenarioId && action === "edit" && parts.length === 4) {
      return {
        section,
        view: "edit",
        resourceId: null,
        scenarioId,
        canonicalHash: `#/admin/scenarios/${scenarioId}/edit`,
        shouldReplace: false,
        notFound: false,
      };
    }
    return adminNotFound(raw);
  }

  if (section === "ai-agentic" && parts.length === 2) {
    return {
      section,
      view: "list",
      resourceId: null,
      scenarioId: null,
      canonicalHash: "#/admin/ai-agentic",
      shouldReplace: false,
      notFound: false,
    };
  }

  return adminNotFound(raw);
}
