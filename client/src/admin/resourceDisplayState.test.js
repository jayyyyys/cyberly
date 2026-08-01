import {
  getCyberGuardStatusDisplay,
  getPublicationStatusDisplay,
  getResourceRowActions,
  getReviewStatusDisplay,
} from "./resourceDisplayState";
import { RESOURCE_SECTION_TABS } from "./resourceFormState";

describe("admin resource display state", () => {
  test("editable Resource pages expose Content and Metadata tabs only", () => {
    expect(RESOURCE_SECTION_TABS.map(tab => tab.id)).toEqual(["content", "metadata"]);
  });

  test("Resource list rows expose exactly Quick Review and Edit", () => {
    expect(getResourceRowActions().map(action => action.id)).toEqual(["quickReview", "edit"]);
    expect(getResourceRowActions().map(action => action.labelKey)).toEqual([
      "admin.resourceGovernance.quickReviewAction",
      "common.edit",
    ]);
  });

  test("publication status draft maps to Draft with publication tone", () => {
    expect(getPublicationStatusDisplay("draft")).toEqual({
      labelKey: "admin.resourceGovernance.publicationStatus.draft",
      tone: "publication-draft",
    });
  });

  test("review draft maps to Draft review with review tone", () => {
    expect(getReviewStatusDisplay("draft")).toEqual({
      labelKey: "admin.resourceGovernance.reviewStatus.draft",
      tone: "review-draft",
    });
  });

  test("CyberGuard disabled maps separately from eligibility", () => {
    expect(getCyberGuardStatusDisplay(false)).toEqual({
      labelKey: "admin.resourceGovernance.flags.cyberGuardDisabled",
      tone: "cyberguard-disabled",
    });
  });
});
