module.exports = function (config) {
  config.set({
    // files: [
    //   // Exclude files so we can include only particular files later on
    //   '!./**/*.ts',
    //   '!./**/*.js',

    //   // Include source files and flag them for mutation
    //   { pattern: './src/**/*.ts', included: false, mutated: true },

    //   // Exclude test files to later include them again without the mutated flag set to true
    //   '!./src/**/*.spec.ts',
    //   '!./src/test.ts',
    //   { pattern: './src/**/*.spec.ts', included: false, mutated: false },
    //   { pattern: './src/test.ts', included: false, mutated: false },

    //   // Ignore environment configuration files
    //   '!./src/environments/*.ts',

    //   // Other assets (HTML and CSS for the browser)
    //   './src/**/*.html',
    //   './src/**/*.css',
    // ],
    mutate: [
      'src/**/*.ts',
      '!src/**/*.d.ts',
      '!src/**/*.spec.ts',
      '!src/test.ts',
      '!src/environments/*.ts'
    ],
    testRunner: 'karma',
    mutator: 'typescript',
    port: 9336,
    transpilers: [
      'webpack'
    ],
    karmaConfig: {
      frameworks: ['jasmine'],
      customContextFile: require.resolve('@angular/cli/plugins/karma-context.html'),
      customDebugFile: require.resolve('@angular/cli/plugins/karma-debug.html'),
      plugins: [
        require.resolve('karma-jasmine'),
        require.resolve('karma-chrome-launcher'),
      ],
      proxies: {
        "/_karma_webpack_/": "/base/_karma_webpack_/"
      },
      files: [
        { pattern: './_karma_webpack_/*.js', included: false }
      ],
      browsers: ['ChromeHeadless']
    },
    reporter: ['html', 'clear-text', 'progress'],
    testFramework: 'jasmine',
    coverageAnalysis: 'off',
    tsconfigFile: './src/tsconfig.spec.json',
    maxConcurrentTestRunners: 1,
    webpack: {
      configFile: 'webpack-stryker.config.js'
    },
    logLevel: 'trace'
  });
};
