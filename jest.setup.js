import '@testing-library/jest-dom'

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