module.exports = {
  // Preset de TypeScript
  preset: 'ts-jest',
  
  // Entorno de ejecución
  testEnvironment: 'node',
  
  // Directorios de tests
  roots: ['<rootDir>/tests'],
  
  // Patrones de archivos de test
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // Transformación de TypeScript (sintaxis actualizada)
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      //isolatedModules: true,
      diagnostics: {
        warnOnly: true  // No fallar por warnings de TS
      }
    }]
  },
  
  // Cobertura de código
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/index.ts',
    '!src/types/**'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  
  // Umbrales de cobertura (opcional)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },
  
  // Extensiones de archivo
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Paths aliases (si usas @ en imports)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Configuración de tests
  verbose: true,
  testTimeout: 30000,  // 30 segundos para tests con navegador
  
  // Limpiar mocks entre tests
  clearMocks: true,
  restoreMocks: true,
  
  // Performance
  maxWorkers: '50%',
  
  // Detectar memory leaks
  detectOpenHandles: false,  // true para debugging
  forceExit: true,  // Forzar exit después de tests
  
  // Setup files (descomentar si creas setup.ts)
  // setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Ignorar transformaciones
  transformIgnorePatterns: [
    'node_modules/(?!(playwright|cheerio)/)'
  ],
  
  // Test path ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/'
  ],
  
  // Globals disponibles en tests
  globals: {
    // Puedes agregar variables globales aquí
  }
};