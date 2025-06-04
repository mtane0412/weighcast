/**
 * Twitch APIクライアントのテスト
 */
import { getTwitchUser } from './twitch'

// fetchのモック
global.fetch = jest.fn()

describe('getTwitchUser', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 環境変数のモック
    process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID = 'test-client-id'
  })

  it('正常にTwitchユーザー情報を取得できる', async () => {
    const mockUser = {
      id: '123456789',
      login: 'testuser',
      display_name: 'TestUser',
      profile_image_url: 'https://example.com/avatar.jpg',
      email: 'test@example.com',
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [mockUser] }),
    })

    const result = await getTwitchUser('test-access-token')

    expect(result).toEqual(mockUser)
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.twitch.tv/helix/users',
      {
        headers: {
          'Authorization': 'Bearer test-access-token',
          'Client-Id': 'test-client-id',
        },
      }
    )
  })

  it('APIエラー時はnullを返す', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    })

    const result = await getTwitchUser('invalid-token')

    expect(result).toBeNull()
  })

  it('ネットワークエラー時はnullを返す', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(
      new Error('Network error')
    )

    const result = await getTwitchUser('test-token')

    expect(result).toBeNull()
  })
})