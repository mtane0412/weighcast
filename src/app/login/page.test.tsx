/**
 * ログインページのテスト
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import LoginPage from './page'

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  })),
}))

describe('LoginPage', () => {
  const mockPush = jest.fn()
  const mockRefresh = jest.fn()

  beforeEach(() => {
    ;(useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  test('ログインフォームが表示される', () => {
    render(<LoginPage />)
    
    expect(screen.getByText('WeighCast')).toBeInTheDocument()
    expect(screen.getByLabelText('メールアドレス')).toBeInTheDocument()
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
    expect(screen.getByText('ログイン')).toBeInTheDocument()
  })

  test('サインアップモードに切り替えができる', () => {
    render(<LoginPage />)
    
    const toggleButton = screen.getByText('アカウントを作成')
    fireEvent.click(toggleButton)
    
    expect(screen.getByText('新規アカウントを作成')).toBeInTheDocument()
    expect(screen.getByText('登録')).toBeInTheDocument()
  })

  test('フォーム入力ができる', () => {
    render(<LoginPage />)
    
    const emailInput = screen.getByLabelText('メールアドレス')
    const passwordInput = screen.getByLabelText('パスワード')
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    
    expect(emailInput).toHaveValue('test@example.com')
    expect(passwordInput).toHaveValue('password123')
  })
})