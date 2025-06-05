import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'

// グローバルなRequestとResponseを定義
global.Request = jest.fn().mockImplementation((url, options) => ({
  url,
  headers: new Map(),
  ...options,
}))

global.Response = jest.fn().mockImplementation((body, options) => ({
  body,
  headers: new Map(),
  ...options,
}))

// Web Crypto API のモック
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// crypto.subtle のモック
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'mock-uuid-1234-5678',
    subtle: {
      importKey: jest.fn().mockResolvedValue('mock-key'),
      sign: jest.fn().mockResolvedValue(new ArrayBuffer(32))
    }
  }
})

// btoa のモック
global.btoa = jest.fn().mockReturnValue('mock-base64-signature')