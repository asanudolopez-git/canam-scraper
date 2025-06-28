export const config = {
  roots: ['./', '../__tests__/'],
  // testRegex: '^.+.test\.js$',
  testEnvironment: 'jsdom',
  globals: {
    Uint8Array: Uint8Array,
  },
  setupFiles: ['./setup.jest.js'],
  transform: {
    '^.+.test\.js$': [
      'babel-jest',
    ],
  },
}
export default config;