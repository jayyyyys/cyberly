import { fireEvent, render, screen } from "@testing-library/react";
import AdminResourceActions from "./AdminResourceActions";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options = {}) => options.defaultValue || key,
  }),
}));

jest.mock("./AdminResourceLifecycleDialog", () => function MockLifecycleDialog() {
  return <div data-testid="lifecycle-dialog" />;
});

const resource = {
  id: 12,
  slug: "phishing",
  title: "Phishing",
  publicationStatus: "published",
  reviewStatus: "approved",
  effectiveRagEligible: true,
};

describe("AdminResourceActions", () => {
  test("full-page actions render Back, Content, Metadata, and lifecycle icon only", () => {
    render(
      <AdminResourceActions
        currentSection="content"
        requestHashNavigation={jest.fn()}
        resource={resource}
        resourceId={resource.id}
      />
    );

    expect(screen.getByRole("button", { name: /common.back/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "admin.resourceLifecycle.tabs.content" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "admin.resourceLifecycle.tabs.metadata" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "admin.resourceLifecycle.archiveOrDelete" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "admin.resourceLifecycle.tabs.governance" })).not.toBeInTheDocument();
    expect(screen.queryByText("admin.resourceLifecycle.moreActions")).not.toBeInTheDocument();
  });

  test("clean Back navigation does not inject a false dirty guard", () => {
    const requestHashNavigation = jest.fn();
    render(
      <AdminResourceActions
        currentSection="content"
        requestHashNavigation={requestHashNavigation}
        resource={resource}
        resourceId={resource.id}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /common.back/ }));

    expect(requestHashNavigation).toHaveBeenCalledWith("/admin/resources");
  });

  test("clean tab navigation does not inject a false dirty guard", () => {
    const requestHashNavigation = jest.fn();
    render(
      <AdminResourceActions
        currentSection="content"
        requestHashNavigation={requestHashNavigation}
        resource={resource}
        resourceId={resource.id}
      />
    );

    fireEvent.click(screen.getByRole("tab", { name: "admin.resourceLifecycle.tabs.metadata" }));

    expect(requestHashNavigation).toHaveBeenCalledWith("/admin/resources/12/metadata");
  });
});
