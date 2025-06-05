/**
 * WithingsSyncButtonコンポーネントのテスト
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WithingsSyncButton } from './withings-sync-button'

// fetch APIをモック
global.fetch = jest.fn()

describe('WithingsSyncButton', () => {
  beforeEach(() => {
    jest.resetAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  it('初期状態でボタンが表示される', () => {
    render(<WithingsSyncButton />)
    
    const button = screen.getByRole('button', { name: /Withingsデータを同期/ })
    expect(button).toBeInTheDocument()
    expect(button).not.toBeDisabled()
  })

  it('同期成功時に成功メッセージを表示する', async () => {
    const mockOnSyncComplete = jest.fn()
    
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: '同期が完了しました',
        syncedCount: 5
      })
    })

    render(<WithingsSyncButton onSyncComplete={mockOnSyncComplete} />)
    
    const button = screen.getByRole('button', { name: /Withingsデータを同期/ })
    fireEvent.click(button)

    // ローディング状態をチェック
    expect(screen.getByText('同期中...')).toBeInTheDocument()
    expect(button).toBeDisabled()

    // 成功メッセージを待つ
    await waitFor(() => {
      expect(screen.getByText('同期が完了しました（5件の新しいデータを取得）')).toBeInTheDocument()
    })

    // ボタンが再度有効になる
    expect(button).not.toBeDisabled()
    expect(screen.getByText(/Withingsデータを同期/)).toBeInTheDocument()

    // コールバックが呼ばれる
    expect(mockOnSyncComplete).toHaveBeenCalledTimes(1)

    // fetch APIが正しく呼ばれる
    expect(fetch).toHaveBeenCalledWith('/api/withings/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

  it('同期失敗時にエラーメッセージを表示する', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Withings連携が必要です'
      })
    })

    render(<WithingsSyncButton />)
    
    const button = screen.getByRole('button', { name: /Withingsデータを同期/ })
    fireEvent.click(button)

    // エラーメッセージを待つ
    await waitFor(() => {
      expect(screen.getByText('Withings連携が必要です')).toBeInTheDocument()
    })

    // ボタンが再度有効になる
    expect(button).not.toBeDisabled()
  })

  it('ネットワークエラー時にエラーメッセージを表示する', async () => {
    ;(fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<WithingsSyncButton />)
    
    const button = screen.getByRole('button', { name: /Withingsデータを同期/ })
    fireEvent.click(button)

    // エラーメッセージを待つ
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })

    expect(button).not.toBeDisabled()
  })

  it('同期中は再度クリックできない', async () => {
    // 長時間かかるリクエストをシミュレート
    ;(fetch as jest.Mock).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ message: '完了', syncedCount: 0 })
      }), 1000))
    )

    render(<WithingsSyncButton />)
    
    const button = screen.getByRole('button', { name: /Withingsデータを同期/ })
    
    fireEvent.click(button)
    expect(button).toBeDisabled()
    expect(screen.getByText('同期中...')).toBeInTheDocument()

    // 再度クリックしても何も起こらない
    fireEvent.click(button)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('0件同期時も正常にメッセージを表示する', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        message: '同期するデータがありません',
        syncedCount: 0
      })
    })

    render(<WithingsSyncButton />)
    
    const button = screen.getByRole('button', { name: /Withingsデータを同期/ })
    fireEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('同期するデータがありません（0件の新しいデータを取得）')).toBeInTheDocument()
    })
  })
})