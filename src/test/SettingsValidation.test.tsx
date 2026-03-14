import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Settings from "../app/pages/Settings";

const { mockLogout, mockRefreshProfile } = vi.hoisted(() => ({
  mockLogout: vi.fn(),
  mockRefreshProfile: vi.fn()
}));

vi.mock("../app/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      name: "Alex Doe",
      email: "alex@example.com",
      phone: "+1234567890",
      username: "alex",
      isVerifiedBadge: false,
      isModerator: false,
      isAdmin: false,
      verified: true,
      verifiedBadgeExpiresAt: null,
      avatar: null,
      usernameUpdatedAt: null
    },
    logout: mockLogout,
    refreshProfile: mockRefreshProfile
  })
}));

vi.mock("react-router", () => ({
  useNavigate: () => vi.fn()
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    theme: "light",
    setTheme: vi.fn()
  })
}));

vi.mock("../app/lib/api", () => ({
  api: {
    getVerificationPricing: vi.fn(async () => ({ success: true, data: { amount: 1000, currency: "NGN", active: true } })),
    getVerificationEligibility: vi.fn(async () => ({ success: true, data: { eligible: true, eligibleAt: null } })),
    getVerificationStatus: vi.fn(async () => ({ success: true, data: { latestPending: null, latestDecision: null, currentStatus: "none" } })),
    updateProfile: vi.fn(async () => ({ success: true, data: { message: "ok" } })),
    createVerificationCheckout: vi.fn(async () => ({ success: true, data: { link: "https://pay" } })),
    uploadAvatar: vi.fn(async () => ({ success: true, data: { avatar: "/uploads/avatars/a.png" } })),
    createUserInvite: vi.fn(async () => ({ success: true, data: { token: "abc" } }))
  }
}));

vi.mock("sonner", () => ({
  toast: vi.fn()
}));

describe("Settings", () => {
  it("shows a validation error for invalid usernames", async () => {
    const intervalSpy = vi.spyOn(window, "setInterval").mockReturnValue(0 as unknown as number);
    const clearSpy = vi.spyOn(window, "clearInterval").mockImplementation(() => {});
    const { unmount } = render(<Settings />);
    try {
      const usernameInput = await screen.findByPlaceholderText("@username");
      await userEvent.clear(usernameInput);
      await userEvent.type(usernameInput, "bad!name");

      await userEvent.click(screen.getByRole("button", { name: /save profile/i }));
      expect(
        await screen.findByText(
          "Username must be 3-32 characters and use letters, numbers, dots, or underscores"
        )
      ).toBeInTheDocument();
    } finally {
      unmount();
      intervalSpy.mockRestore();
      clearSpy.mockRestore();
    }
  });
});
