/**
 * Twitch APIクライアント
 * Twitch APIを使用してユーザー情報を取得する
 */

interface TwitchUser {
  id: string
  login: string
  display_name: string
  profile_image_url: string
  email?: string
}

export async function getTwitchUser(accessToken: string): Promise<TwitchUser | null> {
  try {
    const clientId = process.env.NEXT_PUBLIC_TWITCH_CLIENT_ID
    
    if (!clientId) {
      console.error('NEXT_PUBLIC_TWITCH_CLIENT_ID is not set')
      return null
    }
    
    console.log('Fetching Twitch user with Client-ID:', clientId)
    
    const response = await fetch('https://api.twitch.tv/helix/users', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Client-Id': clientId,
      },
    })

    if (!response.ok) {
      console.error('Failed to fetch Twitch user:', response.status, await response.text())
      return null
    }

    const data = await response.json()
    console.log('Twitch API response:', data)
    return data.data[0] as TwitchUser
  } catch (error) {
    console.error('Error fetching Twitch user:', error)
    return null
  }
}