/**
 * ホームページコンポーネントのテスト
 */
import { render } from '@testing-library/react'
import HomePage from './page'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

// モックの設定
jest.mock('@/utils/supabase/server')
jest.mock('@/lib/prisma')
jest.mock('next/navigation')
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} alt={props.alt} />
  },
}))

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>
const mockRedirect = redirect as jest.MockedFunction<typeof redirect>

// prismaモックの取得
const { prisma: mockPrisma } = jest.requireMock('@/lib/prisma')

describe('HomePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('未認証の場合はログインページにリダイレクトする', async () => {
    mockCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValueOnce({
          data: { user: null },
        }),
      },
    } as any)

    mockRedirect.mockImplementation(() => {
      throw new Error('Redirect called')
    })

    await expect(HomePage()).rejects.toThrow('Redirect called')
    expect(mockRedirect).toHaveBeenCalledWith('/login')
  })

  it('Twitchユーザー情報が存在する場合、アイコンとdisplay nameを表示する', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    }

    const mockDbUser = {
      id: 'user123',
      email: 'test@example.com',
      twitchId: '123456789',
      twitchUsername: 'testuser',
      twitchDisplayName: 'TestUser',
      twitchProfileImage: 'https://example.com/avatar.jpg',
    }

    mockCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValueOnce({
          data: { user: mockUser },
        }),
      },
    } as any)

    mockPrisma.user.findUnique.mockResolvedValueOnce(mockDbUser)

    const { container } = render(await HomePage())

    expect(container.textContent).toContain('TestUser')
    expect(container.textContent).toContain('@testuser')
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/avatar.jpg')
  })

  it('Twitchユーザー情報が存在しない場合、ゲストと表示する', async () => {
    const mockUser = {
      id: 'user123',
      email: 'test@example.com',
    }

    mockCreateClient.mockResolvedValueOnce({
      auth: {
        getUser: jest.fn().mockResolvedValueOnce({
          data: { user: mockUser },
        }),
      },
    } as any)

    mockPrisma.user.findUnique.mockResolvedValueOnce(null)

    const { container } = render(await HomePage())

    expect(container.textContent).toContain('ゲスト')
    expect(container.querySelector('img')).toBeNull()
  })
})