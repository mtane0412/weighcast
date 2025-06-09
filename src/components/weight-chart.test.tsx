/**
 * 体重推移チャートコンポーネントのテスト
 */
import { render, screen, waitFor } from '@testing-library/react'
import { WeightChart } from './weight-chart'

// fetchは既にjest.setup.jsでモックされている
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

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
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('データがない場合のメッセージを表示する', async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/weights')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ weights: [] }),
        })
      }
      if (url.includes('/api/user/height')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ height: null }),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
    
    render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText('データがありません')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('体重データを正しく表示する', async () => {
    const mockWeights = [
      { date: '2024-01-01', value: 70.5 },
      { date: '2024-01-02', value: 70.3 },
      { date: '2024-01-03', value: 70.1 },
    ]

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/weights')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ weights: mockWeights }),
        })
      }
      if (url.includes('/api/user/height')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ height: null }),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
    
    render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText('体重推移')).toBeInTheDocument()
      expect(screen.getByText('過去7日間の体重変化')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('増加トレンドを正しく表示する', async () => {
    const mockWeights = [
      { date: '2024-01-01', value: 70.0 },
      { date: '2024-01-07', value: 71.0 },
    ]

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/weights')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ weights: mockWeights }),
        })
      }
      if (url.includes('/api/user/height')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ height: null }),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
    
    render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText(/1\.4% 増加/)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // 分割されたテキストをチェック
    expect(screen.getByText(/70kg → 71kg/)).toBeInTheDocument()
    expect(screen.getByText(/\+1\.0kg/)).toBeInTheDocument()
  })

  it('減少トレンドを正しく表示する', async () => {
    const mockWeights = [
      { date: '2024-01-01', value: 71.0 },
      { date: '2024-01-07', value: 70.0 },
    ]

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/weights')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ weights: mockWeights }),
        })
      }
      if (url.includes('/api/user/height')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ height: null }),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
    
    render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText(/1\.4% 減少/)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    // 分割されたテキストをチェック
    expect(screen.getByText(/71kg → 70kg/)).toBeInTheDocument()
    expect(screen.getByText(/-1\.0kg/)).toBeInTheDocument()
  })

  it('指定された日数でデータを取得する', async () => {
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/weights')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ weights: [
            { date: '2024-01-01', value: 70.0 },
            { date: '2024-01-30', value: 71.0 },
          ] }),
        })
      }
      if (url.includes('/api/user/height')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ height: null }),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
    
    render(<WeightChart days={30} />)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/weights?days=30')
    })
    
    await waitFor(() => {
      expect(screen.getByText('過去30日間の体重変化')).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('APIエラーを適切に処理する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
    })
    
    render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText('体重データの取得に失敗しました')).toBeInTheDocument()
    })
  })

  it('身長が設定されている場合はBMIを表示する', async () => {
    const mockWeights = [
      { date: '2024-01-01', value: 70.0 },
      { date: '2024-01-07', value: 71.0 },
    ]

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/weights')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ weights: mockWeights }),
        })
      }
      if (url.includes('/api/user/height')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ height: 170 }),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
    
    render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText(/現在のBMI: 24\.6/)).toBeInTheDocument()
      expect(screen.getByText(/\(標準\)/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  it('BMIの判定を正しく表示する', async () => {
    // 低体重のケース（トレンド表示のため2つ以上のデータ点が必要）
    const mockWeights = [
      { date: '2024-01-01', value: 45.0 },
      { date: '2024-01-02', value: 45.0 }
    ]

    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/weights')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ weights: mockWeights }),
        })
      }
      if (url.includes('/api/user/height')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ height: 170 }),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
    
    const { rerender } = render(<WeightChart />)
    
    await waitFor(() => {
      expect(screen.getByText(/現在のBMI: 15\.6/)).toBeInTheDocument()
      expect(screen.getByText(/\(低体重\)/)).toBeInTheDocument()
    }, { timeout: 3000 })

    // 過体重のケース
    mockFetch.mockImplementation((url) => {
      if (url.includes('/api/weights')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ weights: [
            { date: '2024-01-01', value: 80.0 },
            { date: '2024-01-02', value: 80.0 }
          ] }),
        })
      }
      if (url.includes('/api/user/height')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ height: 170 }),
        })
      }
      return Promise.reject(new Error('Unknown URL'))
    })
    
    rerender(<WeightChart refreshTrigger={1} />)
    
    await waitFor(() => {
      expect(screen.getByText(/現在のBMI: 27\.7/)).toBeInTheDocument()
      expect(screen.getByText(/\(過体重\)/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })
})