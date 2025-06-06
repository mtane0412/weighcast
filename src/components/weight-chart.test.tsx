/**
 * 体重推移チャートコンポーネントのテスト
 */
import { render, screen, waitFor } from '@testing-library/react'
import { WeightChart } from './weight-chart'

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('WeightChart', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('読み込み中の状態を表示する', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    render(<WeightChart />)
    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
  })

  it('エラーメッセージを表示する', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
    })
  })

  it('データがない場合のメッセージを表示する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ weights: [] }),
    })
    
    render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText('データがありません')).toBeInTheDocument()
    })
  })

  it('体重データを正しく表示する', async () => {
    const mockWeights = [
      { date: '2024-01-01', value: 70.5 },
      { date: '2024-01-02', value: 70.3 },
      { date: '2024-01-03', value: 70.1 },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ weights: mockWeights }),
    })
    
    render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText('体重推移')).toBeInTheDocument()
      expect(screen.getByText('過去7日間の体重変化')).toBeInTheDocument()
    })
  })

  it('増加トレンドを正しく表示する', async () => {
    const mockWeights = [
      { date: '2024-01-01', value: 70.0 },
      { date: '2024-01-07', value: 71.0 },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ weights: mockWeights }),
    })
    
    render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText(/1\.4% 増加/)).toBeInTheDocument()
      expect(screen.getByText('70kg → 71kg（+1.0kg）')).toBeInTheDocument()
    })
  })

  it('減少トレンドを正しく表示する', async () => {
    const mockWeights = [
      { date: '2024-01-01', value: 71.0 },
      { date: '2024-01-07', value: 70.0 },
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ weights: mockWeights }),
    })
    
    render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText(/1\.4% 減少/)).toBeInTheDocument()
      expect(screen.getByText('71kg → 70kg（-1.0kg）')).toBeInTheDocument()
    })
  })

  it('指定された日数でデータを取得する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ weights: [] }),
    })
    
    render(<WeightChart days={30} />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/weights?days=30')
      expect(screen.getByText('過去30日間の体重変化')).toBeInTheDocument()
    })
  })

  it('APIエラーを適切に処理する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })
    
    render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument()
    })
  })
})