import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminResourceLifecycleDialog from "./AdminResourceLifecycleDialog";
import {
  getAdminResourceLifecycle,
  permanentlyDeleteAdminResource,
} from "./adminApi";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, options = {}) => options.defaultValue || key,
  }),
}));

jest.mock("./adminApi", () => ({
  archiveAdminResource: jest.fn(),
  getAdminResourceLifecycle: jest.fn(),
  permanentlyDeleteAdminResource: jest.fn(),
  restoreAdminResource: jest.fn(),
}));

const resource = {
  id: 7,
  slug: "phishing",
  title: "Phishing",
};

function lifecycle(overrides = {}) {
  return {
    loaded: true,
    canArchive: false,
    canRestore: false,
    canPermanentlyDelete: true,
    counts: {
      translations: 1,
      ragDocuments: 0,
      ragChunks: 0,
      chatSourceReferences: 0,
      contentRelationships: 0,
    },
    blockingReasons: [],
    ...overrides,
  };
}

describe("AdminResourceLifecycleDialog", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    permanentlyDeleteAdminResource.mockResolvedValue({ ok: true });
  });

  test("resource change clears previous lifecycle while loading the next resource", async () => {
    getAdminResourceLifecycle
      .mockResolvedValueOnce({ ok: true, lifecycle: lifecycle() })
      .mockReturnValueOnce(new Promise(() => {}));

    const { rerender } = render(
      <AdminResourceLifecycleDialog resource={resource} resourceId={resource.id} onCancel={jest.fn()} />
    );

    expect(await screen.findByLabelText("admin.resourceLifecycle.confirmSlugLabel")).toHaveValue("");

    rerender(
      <AdminResourceLifecycleDialog
        resource={{ ...resource, id: 8, slug: "passwords", title: "Passwords" }}
        resourceId={8}
        onCancel={jest.fn()}
      />
    );

    expect(screen.getByText("admin.resourceLifecycle.loadingInformation")).toBeInTheDocument();
    expect(screen.queryByLabelText("admin.resourceLifecycle.confirmSlugLabel")).not.toBeInTheDocument();
  });

  test("lifecycle load error renders retry state without archive or delete controls", async () => {
    getAdminResourceLifecycle.mockResolvedValue({ ok: false, error: "Unable to load lifecycle information." });

    render(<AdminResourceLifecycleDialog resource={resource} resourceId={resource.id} onCancel={jest.fn()} />);

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load lifecycle information.");
    expect(screen.getByRole("button", { name: "common.retry" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "admin.resourceLifecycle.deleteButton" })).not.toBeInTheDocument();
  });

  test("eligible delete starts with an empty slug input and requires exact equality", async () => {
    getAdminResourceLifecycle.mockResolvedValue({ ok: true, lifecycle: lifecycle() });

    render(<AdminResourceLifecycleDialog resource={resource} resourceId={resource.id} onCancel={jest.fn()} />);

    const input = await screen.findByLabelText("admin.resourceLifecycle.confirmSlugLabel");
    const deleteButton = screen.getByRole("button", { name: "admin.resourceLifecycle.deleteButton" });

    expect(input).toHaveValue("");
    expect(deleteButton).toBeDisabled();

    fireEvent.change(input, { target: { value: " phishing " } });
    expect(deleteButton).toBeDisabled();

    fireEvent.change(input, { target: { value: "phishing" } });
    expect(deleteButton).toBeEnabled();
  });

  test("blocked delete shows reasons and no slug input", async () => {
    getAdminResourceLifecycle.mockResolvedValue({
      ok: true,
      lifecycle: lifecycle({
        canArchive: true,
        canPermanentlyDelete: false,
        counts: {
          translations: 3,
          ragDocuments: 1,
          ragChunks: 5,
          chatSourceReferences: 2,
          contentRelationships: 1,
        },
        blockingReasons: [{ code: "rag_documents_exist", count: 1 }],
      }),
    });

    render(<AdminResourceLifecycleDialog resource={resource} resourceId={resource.id} onCancel={jest.fn()} />);

    expect(await screen.findByText("rag_documents_exist")).toBeInTheDocument();
    expect(screen.queryByLabelText("admin.resourceLifecycle.confirmSlugLabel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "admin.resourceLifecycle.archiveButton" })).toBeInTheDocument();
  });
});
