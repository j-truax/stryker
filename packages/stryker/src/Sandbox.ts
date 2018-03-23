import { Config } from 'stryker-api/config';
import * as path from 'path';
import { getLogger } from 'log4js';
import * as mkdirp from 'mkdirp';
import { RunResult } from 'stryker-api/test_runner';
import { File } from 'stryker-api/core';
import { TestFramework } from 'stryker-api/test_framework';
import { wrapInClosure } from './utils/objectUtils';
import TestRunnerDecorator from './isolated-runner/TestRunnerDecorator';
import ResilientTestRunnerFactory from './isolated-runner/ResilientTestRunnerFactory';
import IsolatedRunnerOptions from './isolated-runner/IsolatedRunnerOptions';
import { TempFolder } from './utils/TempFolder';
import * as fileUtils from './utils/fileUtils';
import TestableMutant, { TestSelectionResult } from './TestableMutant';
import TranspiledMutant from './TranspiledMutant';

interface FileMap {
  [sourceFile: string]: string;
}

const TEST_HOOKS_FILE_NAME = '___testHooksForStryker.js';

export default class Sandbox {

  private readonly log = getLogger(Sandbox.name);
  private testRunner: TestRunnerDecorator;
  private fileMap: FileMap;
  private files: File[];
  private workingFolder: string;
  private testHooksFile = path.resolve(TEST_HOOKS_FILE_NAME);

  private constructor(private options: Config, private index: number, files: ReadonlyArray<File>, private testFramework: TestFramework | null) {
    this.workingFolder = TempFolder.instance().createRandomFolder('sandbox');
    this.log.debug('Creating a sandbox for files in %s', this.workingFolder);
    this.files = files.slice(); // Create a copy
    if (testFramework) {
      this.files.unshift(new File(this.testHooksFile, ''));
    }
  }

  private async initialize(): Promise<void> {
    await this.fillSandbox();
    return this.initializeTestRunner();
  }

  public static create(options: Config, index: number, files: ReadonlyArray<File>, testFramework: TestFramework | null)
    : Promise<Sandbox> {
    const sandbox = new Sandbox(options, index, files, testFramework);
    return sandbox.initialize().then(() => sandbox);
  }

  public run(timeout: number): Promise<RunResult> {
    return this.testRunner.run({ timeout });
  }

  public dispose(): Promise<void> {
    return this.testRunner.dispose() || Promise.resolve();
  }

  public async runMutant(transpiledMutant: TranspiledMutant): Promise<RunResult> {
    const mutantFiles = transpiledMutant.transpileResult.outputFiles;
    if (transpiledMutant.mutant.testSelectionResult === TestSelectionResult.Failed) {
      this.log.warn(`Failed find coverage data for this mutant, running all tests. This might have an impact on performance: ${transpiledMutant.mutant.toString()}`);
    }
    await Promise.all(mutantFiles.map(mutatedFile => this.writeFileInSandbox(mutatedFile)).concat(this.filterTests(transpiledMutant.mutant)));
    const runResult = await this.run(this.calculateTimeout(transpiledMutant.mutant));
    await this.reset(mutantFiles);
    return runResult;
  }

  private reset(mutatedFiles: ReadonlyArray<File>) {
    const originalFiles = this.files.filter(originalFile => mutatedFiles.some(mutatedFile => mutatedFile.name === originalFile.name));

    return Promise.all(originalFiles.map(file => fileUtils.writeFile(this.fileMap[file.name], file.content)));
  }

  private writeFileInSandbox(file: File): Promise<void> {
    const fileNameInSandbox = this.fileMap[file.name];
    return fileUtils.writeFile(fileNameInSandbox, file.content);
  }

  private fillSandbox(): Promise<void[]> {
    this.fileMap = Object.create(null);
    let copyPromises = this.files
      .map(file => this.fillFile(file));
    return Promise.all(copyPromises);
  }

  private fillFile(file: File): Promise<void> {
    const relativePath = path.relative(process.cwd(), file.name);
    const folderName = path.join(this.workingFolder, path.dirname(relativePath));
    mkdirp.sync(folderName);
    const targetFile = path.join(folderName, path.basename(relativePath));
    this.fileMap[file.name] = targetFile;
    return fileUtils.writeFile(targetFile, file.content);
  }

  private initializeTestRunner(): void | Promise<any> {
    const settings: IsolatedRunnerOptions = {
      strykerOptions: this.options,
      port: this.options.port + this.index,
      sandboxWorkingFolder: this.workingFolder
    };
    this.log.debug(`Creating test runner %s using settings {port: %s}`, this.index, settings.port);
    this.testRunner = ResilientTestRunnerFactory.create(settings.strykerOptions.testRunner || '', settings);
    return this.testRunner.init();
  }

  private calculateTimeout(mutant: TestableMutant) {
    const baseTimeout = mutant.timeSpentScopedTests;
    return (this.options.timeoutFactor * baseTimeout) + this.options.timeoutMs;
  }

  private filterTests(mutant: TestableMutant) {
    if (this.testFramework) {
      let fileContent = wrapInClosure(this.testFramework.filter(mutant.selectedTests));
      return fileUtils.writeFile(this.fileMap[this.testHooksFile], fileContent);
    } else {
      return Promise.resolve(void 0);
    }
  }
}