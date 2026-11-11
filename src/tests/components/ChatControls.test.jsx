import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatControls from "../../components/chat/ChatControls";
import { useChat } from "../../contexts/ChatContext";
import { reportService } from "../../api/services/reportService";

vi.mock("../../contexts/ChatContext", () => ({ useChat: vi.fn() }));
vi.mock("../../contexts/GuestContext", () => ({ useGuest: () => ({ sessionToken: "token" }) }));
vi.mock("../../api/services/reportService", () => ({
  reportService: { submitReport: vi.fn().mockResolvedValue({ data: { data: { auto_banned: false } } }) },
}));

let state;

beforeEach(() => {
  vi.clearAllMocks();
  state = {
    status: "matched",
    chatId: 3,
    isLoading: false,
    endChat: vi.fn(),
    findNewMatch: vi.fn().mockResolvedValue(undefined),
  };
  useChat.mockReturnValue(state);
});

describe("ChatControls", () => {
  it("New Match goes through findNewMatch (ends the current chat first)", async () => {
    render(<ChatControls />);
    await userEvent.click(screen.getByRole("button", { name: /find new match/i }));
    expect(state.findNewMatch).toHaveBeenCalled();
  });

  it("requires a 10-character reason before a report can be submitted", async () => {
    render(<ChatControls />);
    await userEvent.click(screen.getByRole("button", { name: /report user/i }));

    const reason = screen.getByLabelText(/describe what happened/i);
    const submit = screen.getByRole("button", { name: /submit report/i });

    await userEvent.type(reason, "short");
    expect(submit).toBeDisabled();

    await userEvent.type(reason, " but now long enough");
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    expect(reportService.submitReport).toHaveBeenCalledWith("token", 3, "short but now long enough");
  });

  it("renders nothing outside an active chat", () => {
    useChat.mockReturnValue({ ...state, status: "waiting" });
    const { container } = render(<ChatControls />);
    expect(container).toBeEmptyDOMElement();
  });
});
