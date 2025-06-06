/**
 * 体重入力フォームコンポーネントのテスト
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WeightForm } from './weight-form'

const mockFetch = jest.fn()
global.fetch = mockFetch

describe('WeightForm', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('体重入力フォームを表示する', () => {
    render(<WeightForm />)
    
    expect(screen.getByText('体重を記録')).toBeInTheDocument()
    expect(screen.getByLabelText('体重 (kg)')).toBeInTheDocument()
    expect(screen.getByLabelText('日付')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '体重を記録' })).toBeInTheDocument()
  })

  it('正常に体重データを送信する', async () => {
    const mockOnWeightAdded = jest.fn()
    
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ weight: { id: '1', value: 70.5, date: '2024-01-01' } }),
    })
    
    render(<WeightForm onWeightAdded={mockOnWeightAdded} />)
    
    const weightInput = screen.getByLabelText('体重 (kg)')
    const dateInput = screen.getByLabelText('日付')
    const submitButton = screen.getByRole('button', { name: '体重を記録' })
    
    fireEvent.change(weightInput, { target: { value: '70.5' } })
    fireEvent.change(dateInput, { target: { value: '2024-01-01' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/weights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          value: 70.5,
          date: '2024-01-01',
        }),
      })
    })
    
    await waitFor(() => {
      expect(screen.getByText('体重データを保存しました')).toBeInTheDocument()
      expect(mockOnWeightAdded).toHaveBeenCalled()
    })
  })

  it('無効な体重値でエラーメッセージを表示する', async () => {
    render(<WeightForm />)
    
    const weightInput = screen.getByLabelText('体重 (kg)')
    const submitButton = screen.getByRole('button', { name: '体重を記録' })
    
    fireEvent.change(weightInput, { target: { value: '-1' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('有効な体重を入力してください')).toBeInTheDocument()
    })
    
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('APIエラーを適切に処理する', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Unauthorized' }),
    })
    
    render(<WeightForm />)
    
    const weightInput = screen.getByLabelText('体重 (kg)')
    const submitButton = screen.getByRole('button', { name: '体重を記録' })
    
    fireEvent.change(weightInput, { target: { value: '70.5' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Unauthorized')).toBeInTheDocument()
    })
  })

  it('ネットワークエラーを適切に処理する', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    
    render(<WeightForm />)
    
    const weightInput = screen.getByLabelText('体重 (kg)')
    const submitButton = screen.getByRole('button', { name: '体重を記録' })
    
    fireEvent.change(weightInput, { target: { value: '70.5' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('送信中はボタンが無効化される', async () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    
    render(<WeightForm />)
    
    const weightInput = screen.getByLabelText('体重 (kg)')
    const submitButton = screen.getByRole('button', { name: '体重を記録' })
    
    fireEvent.change(weightInput, { target: { value: '70.5' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '保存中...' })).toBeDisabled()
    })
  })

  it('必須フィールドが空の場合はボタンが無効化される', () => {
    render(<WeightForm />)
    
    const submitButton = screen.getByRole('button', { name: '体重を記録' })
    expect(submitButton).toBeDisabled()
    
    const weightInput = screen.getByLabelText('体重 (kg)')
    fireEvent.change(weightInput, { target: { value: '70.5' } })
    
    expect(submitButton).not.toBeDisabled()
  })
})