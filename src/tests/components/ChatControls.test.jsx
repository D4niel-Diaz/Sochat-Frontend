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
  it("Next stranger goes through findNewMatch with the chosen topic", async () => {
    const preferences = { role: "learner", subject: "Music", availability: [] };
    render(<ChatControls nickname="Quiet Butanding" preferences={preferences} />);
    await userEvent.click(screen.getByRole("button", { name: /next stranger/i }));
    expect(state.findNewMatch).toHaveBeenCalledWith(preferences);
  });

  it("needs a reason before a report can be sent, then sends it", async () => {
    const onReported = vi.fn();
    render(<ChatControls nickname="Quiet Butanding" onReported={onReported} />);
    await userEvent.click(screen.getByRole("button", { name: /report quiet butanding/i }));

    expect(screen.getByRole("dialog", { name: /report quiet butanding/i })).toBeInTheDocument();
    const submit = screen.getByRole("button", { name: /send report/i });
    expect(submit).toBeDisabled();

    await userEvent.click(screen.getByLabelText("Spam or selling"));
    expect(submit).toBeEnabled();
    await userEvent.click(submit);

    expect(reportService.submitReport).toHaveBeenCalledWith("token", 3, "Spam or selling");
    expect(onReported).toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the report dialog with Escape", async () => {
    render(<ChatControls />);
    await userEvent.click(screen.getByRole("button", { name: /report/i }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders nothing outside an active chat", () => {
    useChat.mockReturnValue({ ...state, status: "waiting" });
    const { container } = render(<ChatControls />);
    expect(container).toBeEmptyDOMElement();
  });
});
