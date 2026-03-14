import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Status from "../app/pages/Status";

const { mockGetStatuses } = vi.hoisted(() => ({
  mockGetStatuses: vi.fn(async () => ({
    success: true,
    data: {
      unviewed: [
        {
          user: { id: "u1", name: "Morgan", avatar: null },
          statuses: [
            { id: "s1", text: "First story", createdAt: new Date().toISOString(), expiresAt: new Date().toISOString() },
            { id: "s2", text: "Second story", createdAt: new Date().toISOString(), expiresAt: new Date().toISOString() }
          ]
        }
      ],
      viewed: [],
      muted: []
    }
  }))
}));

vi.mock("../app/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "me",
      name: "Me",
      avatar: null,
      isVerifiedBadge: false,
      isModerator: false,
      isAdmin: false,
      verified: true
    }
  })
}));

vi.mock("../app/lib/api", () => ({
  api: {
    getStatuses: mockGetStatuses,
    createStatus: vi.fn(async () => ({ success: true })),
    markStatusViewed: vi.fn(async () => ({ success: true })),
    muteStatusUser: vi.fn(async () => ({ success: true })),
    unmuteStatusUser: vi.fn(async () => ({ success: true })),
  }
}));

describe("Status stories", () => {
  it("opens a story and navigates to next item", async () => {
    const { unmount } = render(<Status />);
    const viewButton = await screen.findByRole("button", { name: /view/i });
    await userEvent.click(viewButton);

    expect(await screen.findByText("First story")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Next status"));
    expect(await screen.findByText("Second story")).toBeInTheDocument();
    unmount();
  });
});
