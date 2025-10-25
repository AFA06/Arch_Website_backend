module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '**/tests/**/*.test.js',
    '**/__tests__/**/*.js'
  ],
  collectCoverageFrom: [
    'admin/controllers/**/*.js',
    'admin/routes/**/*.js',
    'models/**/*.js'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true
};
