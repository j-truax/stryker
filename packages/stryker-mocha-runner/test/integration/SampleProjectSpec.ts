import * as chai from 'chai';
import MochaTestRunner from '../../src/MochaTestRunner';
import { TestResult, RunResult, TestStatus, RunStatus, RunnerOptions } from 'stryker-api/test_runner';
import * as chaiAsPromised from 'chai-as-promised';
import * as path from 'path';
chai.use(chaiAsPromised);
const expect = chai.expect;

const countTests = (runResult: RunResult, predicate: (result: TestResult) => boolean) =>
  runResult.tests.filter(predicate).length;

const countSucceeded = (runResult: RunResult) =>
  countTests(runResult, t => t.status === TestStatus.Success);
const countFailed = (runResult: RunResult) =>
  countTests(runResult, t => t.status === TestStatus.Failed);

function resolve(fileName: string) {
  return path.resolve(__dirname, '..', '..', fileName);
}

describe('Running a sample project', function () {

  let sut: MochaTestRunner;
  this.timeout(10000);

  describe('when tests pass', () => {

    beforeEach(() => {
      const testRunnerOptions: RunnerOptions = {
        strykerOptions: {
          mochaOptions: {
            files: [
              resolve('./testResources/sampleProject/MyMath.js'),
              resolve('./testResources/sampleProject/MyMathSpec.js')
            ]
          }
        },
        port: 1234
      };
      sut = new MochaTestRunner(testRunnerOptions);
      return sut.init();
    });

    it('should report completed tests', async () => {
      const runResult = await sut.run({ timeout: 0 });
      expect(countSucceeded(runResult)).to.be.eq(5, 'Succeeded tests did not match');
      expect(countFailed(runResult)).to.be.eq(0, 'Failed tests did not match');
      runResult.tests.forEach(t => expect(t.timeSpentMs).to.be.greaterThan(-1).and.to.be.lessThan(1000));
      expect(runResult.status).to.be.eq(RunStatus.Complete, 'Test result did not match');
      expect(runResult.coverage).to.not.be.ok;
    });

    it('should be able to run 2 times in a row', async () => {
      await sut.run({ timeout: 0 });
      const runResult = await sut.run({ timeout: 0 });
      expect(countSucceeded(runResult)).to.be.eq(5);
    });
  });

  describe('with an error in an un-included input file', () => {
    beforeEach(() => {
      let options = {
        strykerOptions: {
          mochaOptions: {
            files: [
              resolve('testResources/sampleProject/MyMath.js'),
              resolve('testResources/sampleProject/MyMathSpec.js'),
            ]
          }
        },
        port: 1234
      };
      sut = new MochaTestRunner(options);
      return sut.init();
    });

    it('should report completed tests without errors', async () => {
      const runResult = await sut.run({ timeout: 0 });
      expect(runResult.status).to.be.eq(RunStatus.Complete, 'Test result did not match');
    });
  });

  describe('with multiple failed tests', () => {

    before(() => {
      sut = new MochaTestRunner({
        strykerOptions: {
          mochaOptions: {
            files: [
              resolve('testResources/sampleProject/MyMath.js'),
              resolve('testResources/sampleProject/MyMathFailedSpec.js')],
          }
        },
        port: 1234
      });
      return sut.init();
    });

    it('should only report the first failure', async () => {
      const runResult = await sut.run({ timeout: 0 });
      expect(countFailed(runResult)).to.be.eq(1);
    });
  });

  describe('when no tests are executed', () => {

    beforeEach(() => {
      const testRunnerOptions = {
        strykerOptions: {
          mochaOptions: {
            files: [resolve('./testResources/sampleProject/MyMath.js')],
          }
        },
        port: 1234
      };
      sut = new MochaTestRunner(testRunnerOptions);
      return sut.init();
    });

    it('should report no completed tests', async () => {
      const runResult = await sut.run({ timeout: 0 });
      expect(countSucceeded(runResult)).to.be.eq(0, 'Succeeded tests did not match');
      expect(countFailed(runResult)).to.be.eq(0, 'Failed tests did not match');
      runResult.tests.forEach(t => expect(t.timeSpentMs).to.be.greaterThan(-1).and.to.be.lessThan(1000));
      expect(runResult.status).to.be.eq(RunStatus.Complete, 'Test result did not match');
      expect(runResult.coverage).to.not.be.ok;
    });
  });
});