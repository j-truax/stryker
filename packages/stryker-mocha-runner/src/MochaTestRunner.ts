import { getLogger } from 'log4js';
import { TestRunner, RunResult, RunStatus, RunnerOptions, RunOptions } from 'stryker-api/test_runner';
import LibWrapper from './LibWrapper';
import StrykerMochaReporter from './StrykerMochaReporter';
import MochaRunnerOptions, { mochaOptionsKey } from './MochaRunnerOptions';
import RequireCacheRecorder from './RequireCacheRecorder';

const DEFAULT_TEST_PATTERN = 'test/*.js';

export default class MochaTestRunner implements TestRunner {
  private fileNames: string[];
  private log = getLogger(MochaTestRunner.name);
  private mochaRunnerOptions: MochaRunnerOptions;

  constructor(runnerOptions: RunnerOptions) {
    this.mochaRunnerOptions = runnerOptions.strykerOptions[mochaOptionsKey];
    this.additionalRequires();
  }

  init(): Promise<void> {
    const globPatterns = this.mochaRunnerOptions.files || [DEFAULT_TEST_PATTERN];
    return LibWrapper.glob(globPatterns)
      .then(fileNames => {
        if (fileNames.length) {
          this.fileNames = fileNames;
        } else {
          throw new Error(`No files discovered (tried pattern(s) ${JSON.stringify(globPatterns, null, 2)}). Please specify the files (glob patterns) containing your tests in ${mochaOptionsKey}.files in your stryker.conf.js file.`);
        }
      });
  }

  run(options: RunOptions): Promise<RunResult> {
    return new Promise<RunResult>((resolve, reject) => {
      try {
        const mocha = new LibWrapper.Mocha({ reporter: StrykerMochaReporter as any, bail: true });
        const requireCacheRecorder = new RequireCacheRecorder();
        if (options.testHooks) {
          LibWrapper.eval(options.testHooks);
        }
        this.addFiles(mocha);
        this.configure(mocha);
        try {
          mocha.run((failures: number) => {
            requireCacheRecorder.purge();
            const reporter = StrykerMochaReporter.CurrentInstance;
            if (reporter) {
              const result: RunResult = reporter.runResult;
              resolve(result);
            } else {
              const errorMsg = 'The StrykerMochaReporter was not instantiated properly. Could not retrieve the RunResult.';
              this.log.error(errorMsg);
              resolve({
                tests: [],
                errorMessages: [errorMsg],
                status: RunStatus.Error
              });
            }
          });
        } catch (error) {
          requireCacheRecorder.purge();
          resolve({
            status: RunStatus.Error,
            tests: [],
            errorMessages: [error]
          });
        }
      } catch (error) {
        this.log.error(error);
        reject(error);
      }
    });
  }

  private addFiles(mocha: Mocha) {
    this.fileNames.forEach(fileName => {
      mocha.addFile(fileName);
    });
  }

  private configure(mocha: Mocha) {
    const options = this.mochaRunnerOptions;

    function setIfDefined<T>(value: T | undefined, operation: (input: T) => void) {
      if (typeof value !== 'undefined') {
        operation.apply(mocha, [value]);
      }
    }

    if (options) {
      setIfDefined(options.asyncOnly, mocha.asyncOnly);
      setIfDefined(options.timeout, mocha.timeout);
      setIfDefined(options.ui, mocha.ui);
    }
  }

  private additionalRequires() {
    if (this.mochaRunnerOptions.require) {
      this.mochaRunnerOptions.require.forEach(LibWrapper.require);
    }
  }
}