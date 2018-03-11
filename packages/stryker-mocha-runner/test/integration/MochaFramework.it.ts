import * as path from 'path';
import { TestSelection } from 'stryker-api/test_framework';
import MochaTestFramework from 'stryker-mocha-framework/src/MochaTestFramework';
import { expect } from 'chai';
import MochaTestRunner from '../../src/MochaTestRunner';
import { TestStatus } from 'stryker-api/test_runner';
import Mocha = require('mocha');

const test0: Readonly<TestSelection> = Object.freeze({
  name: 'MyMath should be able to add two numbers',
  id: 0,
});
const test3: Readonly<TestSelection> = Object.freeze({
  name: 'MyMath should be able to recognize a negative number',
  id: 3,
});


export function wrapInClosure(codeFragment: string) {
  return `
    (function (window) {
      ${codeFragment}
    })((Function('return this'))());`;
}


describe('Integration with stryker-mocha-framework', () => {
  let sut: MochaTestRunner;
  let testFramework: MochaTestFramework;
  let realAddTest: any;

  beforeEach(() => {
    realAddTest = (Mocha as any).Suite.prototype.addTest;
    testFramework = new MochaTestFramework();
    sut = new MochaTestRunner({
      port: 0,
      strykerOptions: {
        mochaOptions: {
          files: [
            path.resolve(__dirname, '..', '..', 'testResources', 'sampleProject', 'MyMathSpec.js')
          ]
        }
      }
    });
  });

  afterEach(() => {
    // addTest could have been overridden by the specs
    (Mocha as any).Suite.prototype.addTest = realAddTest;
  });

  it('should be able to select only test 0 and 3 to run', async () => {
    const testHooks = wrapInClosure(testFramework.filter([test0, test3]));
    await sut.init();
    const result = await sut.run({ timeout: 0, testHooks });
    expect(result.tests.map(test => ({ name: test.name, status: test.status }))).deep.eq([{
      name: 'MyMath should be able to add two numbers',
      status: TestStatus.Success
    }, {
      name: 'MyMath should be able to recognize a negative number',
      status: TestStatus.Success
    }]);
  });
});