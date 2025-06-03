/**
 * ログインページのテスト
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import LoginPage from './page'
import { createClient } from '@/utils/supabase/client'

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(),
}))

describe('LoginPage', () => {
  const mockSignInWithOAuth = jest.fn()
  
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue({
      auth: {
        signInWithOAuth: mockSignInWithOAuth,
      },
    })
  })

  test('Twitchログインボタンが表示される', () => {
    render(<LoginPage />)
    
    expect(screen.getByText('WeighCast')).toBeInTheDocument()
    expect(screen.getByText('Twitchアカウントでログイン')).toBeInTheDocument()
    expect(screen.getByText('Twitchでログイン')).toBeInTheDocument()
    expect(screen.getByText('WeighCastを利用するには、Twitchアカウントでログインしてください。')).toBeInTheDocument()
  })

  test('Twitchログインボタンをクリックすると認証が開始される', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: null })
    
    render(<LoginPage />)
    
    const loginButton = screen.getByText('Twitchでログイン')
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'twitch',
        options: {
          redirectTo: `${location.origin}/auth/callback`,
        },
      })
    })
  })

  test('ログイン中は処理中と表示される', async () => {
    mockSignInWithOAuth.mockImplementation(() => new Promise(() => {}))
    
    render(<LoginPage />)
    
    const loginButton = screen.getByText('Twitchでログイン')
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('処理中...')).toBeInTheDocument()
    })
  })

  test('ログインエラー時にエラーメッセージが表示される', async () => {
    mockSignInWithOAuth.mockResolvedValue({ error: new Error('認証エラー') })
    
    render(<LoginPage />)
    
    const loginButton = screen.getByText('Twitchでログイン')
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('ログインに失敗しました。もう一度お試しください。')).toBeInTheDocument()
    })
  })
})