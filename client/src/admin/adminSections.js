import { parseAdminRoute } from "./adminRouteState";

export const ADMIN_SECTIONS = [
  {
    id: "resources",
    path: "/admin/resources",
    enabled: true,
    labelKey: "admin.navigation.resources",
    descriptionKey: "admin.navigation.resourcesDescription",
  },
  {
    id: "scenarios",
    path: "/admin/scenarios",
    enabled: true,
    labelKey: "admin.navigation.scenarios",
    descriptionKey: "admin.navigation.scenariosDescription",
  },
  {
    id: "assessments",
    path: "/admin/assessments",
    enabled: false,
    labelKey: "admin.navigation.assessments",
    descriptionKey: "admin.navigation.assessmentsDescription",
  },
  {
    id: "faq-guidance",
    path: "/admin/faq-guidance",
    enabled: false,
    labelKey: "admin.navigation.faqGuidance",
    descriptionKey: "admin.navigation.faqGuidanceDescription",
  },
  {
    id: "ai-agentic",
    path: "/admin/ai-agentic",
    enabled: true,
    labelKey: "admin.navigation.aiAgentic",
    descriptionKey: "admin.navigation.aiAgenticDescription",
  },
];

export function getAdminSectionFromHash(hashValue = typeof window !== "undefined" ? window.location.hash : "") {
  const route = parseAdminRoute(hashValue);
  return ADMIN_SECTIONS.find(section => section.id === route.section && section.enabled) || ADMIN_SECTIONS[0];
}

export function getAdminResourceEditorIdFromHash(hashValue = typeof window !== "undefined" ? window.location.hash : "") {
  const route = parseAdminRoute(hashValue);
  return route.section === "resources" && route.view === "edit" ? route.resourceId : null;
}

export function isAdminResourceCreateRoute(hashValue = typeof window !== "undefined" ? window.location.hash : "") {
  const route = parseAdminRoute(hashValue);
  return route.section === "resources" && route.view === "new";
}

export function getAdminResourceMetadataIdFromHash(hashValue = typeof window !== "undefined" ? window.location.hash : "") {
  const route = parseAdminRoute(hashValue);
  return route.section === "resources" && route.view === "metadata" ? route.resourceId : null;
}

export function getAdminResourceGovernanceIdFromHash(hashValue = typeof window !== "undefined" ? window.location.hash : "") {
  const normalized = String(hashValue || "").replace(/^#\/?/, "");
  const [page, sectionId, resourceId, action] = normalized.split("/");
  if (page !== "admin" || sectionId !== "resources" || action !== "governance") return null;
  const numericId = Number(resourceId);
  return Number.isInteger(numericId) && numericId > 0 ? numericId : null;
}

export function getAdminScenarioEditorIdFromHash(hashValue = typeof window !== "undefined" ? window.location.hash : "") {
  const route = parseAdminRoute(hashValue);
  return route.section === "scenarios" && route.view === "edit" ? route.scenarioId : null;
}

export function isAdminScenarioCreateRoute(hashValue = typeof window !== "undefined" ? window.location.hash : "") {
  const route = parseAdminRoute(hashValue);
  return route.section === "scenarios" && route.view === "new";
}

export function isAdminAiAgenticRoute(hashValue = typeof window !== "undefined" ? window.location.hash : "") {
  const route = parseAdminRoute(hashValue);
  return route.section === "ai-agentic";
}
