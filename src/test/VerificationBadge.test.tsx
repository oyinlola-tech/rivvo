import { render, screen } from "@testing-library/react";
import { VerificationBadge } from "../app/components/VerificationBadge";

describe("VerificationBadge", () => {
  it("renders staff badge with title", () => {
    render(<VerificationBadge type="staff" size="md" />);
    const badge = screen.getByTitle("Staff");
    expect(badge).toBeInTheDocument();
  });
});
