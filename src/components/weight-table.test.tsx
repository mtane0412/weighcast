/**
 * WeightTableコンポーネントのテスト
 */

import { render, screen, waitFor } from "@testing-library/react";
import { WeightTable } from "./weight-table";

// fetch のモック
global.fetch = jest.fn();

const mockWeights = [
  {
    date: "2023-01-01",
    datetime: "2023-01-01T09:30:00.000Z",
    value: 70.5,
    source: "manual",
  },
  {
    date: "2023-01-02",
    datetime: "2023-01-02T08:15:00.000Z",
    value: 71.0,
    source: "withings",
  },
];

describe("WeightTable", () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  test("体重データを正しく表示する", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ weights: mockWeights }),
    });

    render(<WeightTable />);

    // 読み込み状態を確認
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();

    // データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText("2023/01/01")).toBeInTheDocument();
      expect(screen.getByText("18:30")).toBeInTheDocument(); // UTCから日本時間に変換
      expect(screen.getByText("70.5")).toBeInTheDocument();
      expect(screen.getByText("2023/01/02")).toBeInTheDocument();
      expect(screen.getByText("17:15")).toBeInTheDocument(); // UTCから日本時間に変換
      expect(screen.getByText("71.0")).toBeInTheDocument();
      expect(screen.getByText("手動入力")).toBeInTheDocument();
      expect(screen.getByText("Withings")).toBeInTheDocument();
    });
  });

  test("データがない場合は適切なメッセージを表示する", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ weights: [] }),
    });

    render(<WeightTable />);

    await waitFor(() => {
      expect(screen.getByText("記録がありません")).toBeInTheDocument();
    });
  });

  test("APIエラー時に適切に処理する", async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

    // コンソールエラーをモック
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    render(<WeightTable />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to fetch weights:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  test("refreshTriggerが変更されるとデータを再取得する", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ weights: mockWeights }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          weights: [
            ...mockWeights,
            {
              date: "2023-01-03",
              datetime: "2023-01-03T10:00:00.000Z",
              value: 69.5,
              source: "manual",
            },
          ],
        }),
      });

    const { rerender } = render(<WeightTable refreshTrigger={0} />);

    await waitFor(() => {
      expect(screen.getByText("70.5")).toBeInTheDocument();
    });

    // refreshTriggerを変更
    rerender(<WeightTable refreshTrigger={1} />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  test("データソースが正しく表示される", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ weights: mockWeights }),
    });

    render(<WeightTable />);

    await waitFor(() => {
      // 手動入力のバッジがグレー
      const manualBadge = screen.getByText("手動入力");
      expect(manualBadge).toHaveClass("bg-gray-100", "text-gray-800");
      
      // Withingsのバッジがブルー
      const withingsBadge = screen.getByText("Withings");
      expect(withingsBadge).toHaveClass("bg-blue-100", "text-blue-800");
    });
  });

  test("日時が正しくフォーマットされて表示される", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ weights: mockWeights }),
    });

    render(<WeightTable />);

    await waitFor(() => {
      // 日付と時刻が分けて表示されることを確認
      expect(screen.getByText("2023/01/01")).toBeInTheDocument();
      expect(screen.getByText("18:30")).toBeInTheDocument(); // UTCから日本時間に変換
      expect(screen.getByText("2023/01/02")).toBeInTheDocument();
      expect(screen.getByText("17:15")).toBeInTheDocument(); // UTCから日本時間に変換
    });
  });
});