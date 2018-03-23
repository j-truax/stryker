import * as Mocha from 'mocha';
import MochaTestRunner from '../../src/MochaTestRunner';
import LibWrapper from '../../src/LibWrapper';
import * as utils from '../../src/utils';
import { Mock, mock, logger, runnerOptions } from '../helpers/mockHelpers';
import { expect } from 'chai';
import MochaRunnerOptions from '../../src/MochaRunnerOptions';
import RequireCacheRecorder, * as requireCacheRecorderModule from '../../src/RequireCacheRecorder';
import * as log4js from 'log4js';
import { RunOptions } from 'stryker-api/test_runner';

describe('MochaTestRunner', () => {

  let MochaStub: sinon.SinonStub;
  let mocha: Mock<Mocha>;
  let sut: MochaTestRunner;
  let requireStub: sinon.SinonStub;
  let globStub: sinon.SinonStub;
  let log: Mock<log4js.Logger>;
  let requireCacheRecorderMock: Mock<RequireCacheRecorder>;

  beforeEach(() => {
    MochaStub = sandbox.stub(LibWrapper, 'Mocha');
    requireStub = sandbox.stub(LibWrapper, 'require');
    globStub = sandbox.stub(LibWrapper, 'glob');
    sandbox.stub(utils, 'evalGlobal');
    requireCacheRecorderMock = mock(RequireCacheRecorder);
    sandbox.stub(requireCacheRecorderModule, 'default').returns(requireCacheRecorderMock);
    mocha = mock(Mocha);
    MochaStub.returns(mocha);
    log = logger();
    sandbox.stub(log4js, 'getLogger').returns(log);
  });

  it('should should add all included files on run()', async () => {
    globStub.resolves(['foo.js', 'bar.js', 'foo2.js']);
    sut = new MochaTestRunner(runnerOptions({
      strykerOptions: {
        mochaOptions: {
          files: [
            'foo.js',
            'foo2.js'
          ]
        }
      }
    }));
    await sut.init();
    await actRun();
    expect(mocha.addFile).calledThrice;
    expect(mocha.addFile).calledWith('foo.js');
    expect(mocha.addFile).calledWith('foo2.js');
    expect(mocha.addFile).calledWith('bar.js');
  });

  it('should pass along supported options to mocha', async () => {
    // Arrange
    globStub.resolves(['foo.js', 'bar.js', 'foo2.js']);
    const mochaOptions: MochaRunnerOptions = {
      require: [],
      asyncOnly: true,
      opts: 'opts',
      timeout: 2000,
      ui: 'assert'
    };
    sut = new MochaTestRunner(runnerOptions({ strykerOptions: { mochaOptions } }));
    await sut.init();

    // Act
    await actRun();

    // Assert
    expect(mocha.asyncOnly).calledWith(true);
    expect(mocha.timeout).calledWith(2000);
    expect(mocha.ui).calledWith('assert');
  });

  it('should pass require additional require options when constructed', () => {
    const mochaOptions: MochaRunnerOptions = { require: ['ts-node', 'babel-register'] };
    new MochaTestRunner(runnerOptions({ strykerOptions: { mochaOptions } }));
    expect(requireStub).calledTwice;
    expect(requireStub).calledWith('ts-node');
    expect(requireStub).calledWith('babel-register');
  });

  it('should evaluate additional testHooks if required', async () => {
    globStub.resolves(['']);
    sut = new MochaTestRunner(runnerOptions());
    await sut.init();
    await actRun({ timeout: 0, testHooks: 'foobar();' });
    expect(utils.evalGlobal).calledWith('foobar();');
  });

  it('should create the require cache recorder before adding the files', async () => {
    globStub.resolves(['foo.js', 'bar.js']);
    sut = new MochaTestRunner(runnerOptions());
    await sut.init();
    await actRun();
    expect(requireCacheRecorderModule.default).calledWithNew;
    expect(requireCacheRecorderMock.purge).calledBefore(requireStub);
  });

  it('should purge the require cache after the test run', async () => {
    globStub.resolves(['foo.js', 'bar.js']);
    sut = new MochaTestRunner(runnerOptions());
    await sut.init();
    await actRun();
    expect(requireCacheRecorderMock.purge).calledAfter(mocha.run);
  });

  it('should also purge if mocha errorred', async () => {
    globStub.resolves(['foo.js', 'bar.js']);
    sut = new MochaTestRunner(runnerOptions());
    mocha.run.throwsException('Error');
    await sut.init();
    await sut.run({});
    expect(requireCacheRecorderMock.purge).called;
  });

  it('should throw an error if no files could be discovered', () => {
    globStub.resolves([]);
    sut = new MochaTestRunner(runnerOptions());
    return expect(sut.init()).rejectedWith(`No files discovered (tried pattern(s) ${JSON.stringify(['test/*.js'], null, 2)
      }). Please specify the files (glob patterns) containing your tests in mochaOptions.files in your stryker.conf.js file.`);
  });

  async function actRun(options: RunOptions = { timeout: 0 }) {
    mocha.run.callsArg(0);
    return sut.run(options);
  }
});
