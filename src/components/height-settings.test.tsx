/**
 * 身長設定コンポーネントのテスト
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { HeightSettings } from "./height-settings";

// fetchのモック
global.fetch = jest.fn();

describe("HeightSettings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("身長を取得して表示する", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ height: 170.5 }),
    });

    render(<HeightSettings />);

    await waitFor(() => {
      const input = screen.getByLabelText("身長 (cm)") as HTMLInputElement;
      expect(input.value).toBe("170.5");
    });
  });

  it("身長が設定されていない場合は空欄で表示", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ height: null }),
    });

    render(<HeightSettings />);

    await waitFor(() => {
      const input = screen.getByLabelText("身長 (cm)") as HTMLInputElement;
      expect(input.value).toBe("");
    });
  });

  it("有効な身長で更新に成功する", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ height: null }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ height: 175 }),
      });

    render(<HeightSettings />);

    const input = screen.getByLabelText("身長 (cm)");
    const button = screen.getByText("保存");

    fireEvent.change(input, { target: { value: "175" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("身長を更新しました")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith("/api/user/height", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ height: 175 }),
    });
  });

  it("無効な身長でエラーメッセージを表示", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ height: null }),
    });

    render(<HeightSettings />);

    const input = screen.getByLabelText("身長 (cm)");
    const button = screen.getByText("保存");

    // 0以下の値
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.submit(button.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText("身長は1〜300cmの範囲で入力してください")).toBeInTheDocument();
    });

    // 300より大きい値
    fireEvent.change(input, { target: { value: "301" } });
    fireEvent.submit(button.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText("身長は1〜300cmの範囲で入力してください")).toBeInTheDocument();
    });
  });

  it("サーバーエラー時にエラーメッセージを表示", async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ height: null }),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

    render(<HeightSettings />);

    const input = screen.getByLabelText("身長 (cm)");
    const button = screen.getByText("保存");

    fireEvent.change(input, { target: { value: "170" } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("更新に失敗しました")).toBeInTheDocument();
    });
  });
});