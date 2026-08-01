export function getResourceRowActions() {
  return [
    { id: "quickReview", labelKey: "admin.resourceGovernance.quickReviewAction", variant: "secondary" },
    { id: "edit", labelKey: "common.edit", variant: "primary" },
  ];
}

export function getPublicationStatusDisplay(status) {
  const value = status || "draft";
  return {
    labelKey: `admin.resourceGovernance.publicationStatus.${value}`,
    tone: `publication-${value}`,
  };
}

export function getReviewStatusDisplay(status) {
  const value = status || "draft";
  return {
    labelKey: `admin.resourceGovernance.reviewStatus.${value}`,
    tone: `review-${value}`,
  };
}

export function getCyberGuardStatusDisplay(enabled) {
  return {
    labelKey: enabled
      ? "admin.resourceGovernance.flags.cyberGuardEnabled"
      : "admin.resourceGovernance.flags.cyberGuardDisabled",
    tone: enabled ? "cyberguard-enabled" : "cyberguard-disabled",
  };
}
