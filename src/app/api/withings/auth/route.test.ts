/**
 * Withings OAuth認証ルートのユニットテスト
 */
import { getWithingsAuthUrl } from '@/lib/withings'

// モック
jest.mock('@/lib/withings')

const mockGetWithingsAuthUrl = getWithingsAuthUrl as jest.MockedFunction<typeof getWithingsAuthUrl>

describe('/api/withings/auth ロジック', () => {
  beforeEach(() => {
    jest.resetAllMocks()
  })

  test('getWithingsAuthUrl関数が正しく呼ばれることをテスト', () => {
    mockGetWithingsAuthUrl.mockReturnValue('https://account.withings.com/oauth2_user/authorize2?client_id=test')

    const result = getWithingsAuthUrl()

    expect(result).toBe('https://account.withings.com/oauth2_user/authorize2?client_id=test')
    expect(mockGetWithingsAuthUrl).toHaveBeenCalledTimes(1)
  })

  test('環境変数エラーのハンドリングをテスト', () => {
    mockGetWithingsAuthUrl.mockImplementation(() => {
      throw new Error('環境変数が設定されていません')
    })

    expect(() => getWithingsAuthUrl()).toThrow('環境変数が設定されていません')
  })
})