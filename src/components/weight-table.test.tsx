/**
 * WeightTableコンポーネントのテスト
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WeightTable } from "./weight-table";

// fetch のモック
global.fetch = jest.fn();

const mockData = [
  {
    id: "1",
    date: "2023-01-01",
    datetime: "2023-01-01T09:30:00.000Z",
    type: "weight" as const,
    weight: 70.5,
    source: "manual",
  },
  {
    id: "2",
    date: "2023-01-02",
    datetime: "2023-01-02T08:15:00.000Z",
    type: "bodyComposition" as const,
    weight: 71.0,
    fatMass: 15.2,
    fatFreeMass: 55.0,
    muscleMass: 45.8,
    boneMass: 2.8,
    waterMass: 60.5,
    fatRatio: 21.4,
    heartRate: 75,
    pulseWaveVelocity: 8.5,
    vascularAge: 30,
    visceralFat: 5,
    basalMetabolicRate: 1800,
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
      json: async () => ({ data: mockData }),
    });

    render(<WeightTable />);

    // 読み込み状態を確認
    expect(screen.getByText("読み込み中...")).toBeInTheDocument();

    // データが表示されるまで待機
    await waitFor(() => {
      expect(screen.getByText("2023/01/01")).toBeInTheDocument();
      expect(screen.getByText("18:30")).toBeInTheDocument();
      expect(screen.getByText("70.5")).toBeInTheDocument();
      expect(screen.getByText("2023/01/02")).toBeInTheDocument();
      expect(screen.getByText("17:15")).toBeInTheDocument();
      expect(screen.getByText("71.0")).toBeInTheDocument();
      expect(screen.getByText("手動入力")).toBeInTheDocument();
      expect(screen.getByText("Withings")).toBeInTheDocument();
    });
  });

  test("体組成データが個別の列に正しく表示される", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockData }),
    });

    render(<WeightTable />);

    await waitFor(() => {
      // 体組成データが個別の列に表示されることを確認
      expect(screen.getByText("21.4")).toBeInTheDocument(); // 体脂肪率
      expect(screen.getByText("45.8")).toBeInTheDocument(); // 筋肉量  
      expect(screen.getByText("15.2")).toBeInTheDocument(); // 脂肪量
      
      // nullの値は"-"で表示されることを確認
      const cells = screen.getAllByText("-");
      expect(cells.length).toBeGreaterThan(0);
    });
  });

  test("データがない場合は適切なメッセージを表示する", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
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
        "Failed to fetch data:",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  test("refreshTriggerが変更されるとデータを再取得する", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            ...mockData,
            {
              id: "3",
              date: "2023-01-03",
              datetime: "2023-01-03T10:00:00.000Z",
              type: "weight" as const,
              weight: 69.5,
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
      json: async () => ({ data: mockData }),
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
      json: async () => ({ data: mockData }),
    });

    render(<WeightTable />);

    await waitFor(() => {
      // 日付と時刻が分けて表示されることを確認
      expect(screen.getByText("2023/01/01")).toBeInTheDocument();
      expect(screen.getByText("18:30")).toBeInTheDocument();
      expect(screen.getByText("2023/01/02")).toBeInTheDocument();
      expect(screen.getByText("17:15")).toBeInTheDocument();
    });
  });

  test("設定ボタンが表示される", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockData }),
    });

    render(<WeightTable />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /列設定/i })).toBeInTheDocument();
    });
  });

  test("列設定モーダルが開ける", async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockData }),
    });

    render(<WeightTable />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /列設定/i })).toBeInTheDocument();
    });

    const settingsButton = screen.getByRole("button", { name: /列設定/i });
    await user.click(settingsButton);

    expect(screen.getByText("表示列設定")).toBeInTheDocument();
  });

  test("隠れた列は表示されない", async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockData }),
    });

    render(<WeightTable />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /列設定/i })).toBeInTheDocument();
    });

    // 初期状態では隠れている列のヘッダーが表示されていないことを確認
    expect(screen.queryByText("除脂肪量 (kg)")).not.toBeInTheDocument();
    expect(screen.queryByText("心拍数 (bpm)")).not.toBeInTheDocument();

    // 設定モーダルを開いて列を表示状態にする
    const settingsButton = screen.getByRole("button", { name: /列設定/i });
    await user.click(settingsButton);

    const fatFreeMassCheckbox = screen.getByLabelText("除脂肪量 (kg)");
    await user.click(fatFreeMassCheckbox);

    const applyButton = screen.getByRole("button", { name: "適用" });
    await user.click(applyButton);

    // 列が表示されることを確認
    expect(screen.getByText("除脂肪量 (kg)")).toBeInTheDocument();
    expect(screen.getByText("55.0")).toBeInTheDocument();
  });
});