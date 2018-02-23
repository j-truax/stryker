import * as path from 'path';
import * as fs from 'mz/fs';
import { exec } from 'mz/child_process';
import { getLogger } from 'log4js';
import { File } from 'stryker-api/core';
import { glob } from './utils/fileUtils';
import StrictReporter from './reporters/StrictReporter';
import { SourceFile } from 'stryker-api/report';
import StrykerError from './utils/StrykerError';

function toReportSourceFile(file: File): SourceFile {
  return {
    path: file.name,
    content: file.textContent
  };
}

export interface InputFileResolverResult {
  files: File[];
  mutateFileNames: string[];
}

export default class InputFileResolver {

  private readonly log = getLogger(InputFileResolver.name);
  private fileResolver: PatternResolver | undefined;
  private mutateResolver: PatternResolver;

  constructor(mutate: string[], files: string[] | undefined, private reporter: StrictReporter) {
    this.mutateResolver = PatternResolver.parse(mutate || []);
    if (files) {
      this.fileResolver = PatternResolver.parse(files);
    }
  }

  public async resolve(): Promise<InputFileResolverResult> {
    const [inputFileNames, mutateFiles] = await Promise.all([this.resolveInputFiles(), this.mutateResolver.resolve()]);
    const files: File[] = await this.readFiles(inputFileNames);
    const mutateFileNames = this.filterFilesToMutate(files, mutateFiles);
    this.logFiles(files, mutateFileNames);
    this.reportAllSourceFilesRead(files);
    return {
      files,
      mutateFileNames
    };
  }

  private resolveInputFiles() {
    if (this.fileResolver) {
      return this.fileResolver.resolve();
    } else {
      return this.resolveFilesUsingGit();
    }
  }

  private resolveFilesUsingGit(): Promise<string[]> {
    return exec('git ls-files --others --exclude-standard --cached', { maxBuffer: 10 * 1000 * 1024 })
      .then(([stdout]) => stdout.toString())
      .then(output => output.split('\n').map(fileName => fileName.trim()))
      .then(fileNames => fileNames.filter(fileName => fileName).map(fileName => path.resolve(fileName)))
      .catch(error => {
        throw new StrykerError(`Cannot determine input files. Either specify a \`files\` array in your stryker configuration, or make sure "${process.cwd()}" is located inside a git repository`, error);
      });
  }

  private filterFilesToMutate(allInputFiles: File[], mutateFiles: string[]) {
    return mutateFiles.filter(mutateFile => allInputFiles.some(inputFile => inputFile.name === mutateFile));
  }

  private logFiles(allInputFiles: File[], mutateFiles: string[]) {
    if (mutateFiles.length) {
      this.log.info(`Found ${mutateFiles.length} of ${allInputFiles.length} file(s) to be mutated.`);
    } else {
      this.log.warn(`No files marked to be mutated, stryker will perform a dry-run without actually mutating anything.`);
    }
    if (this.log.isDebugEnabled) {
      this.log.debug(`All input files: ${JSON.stringify(allInputFiles.map(file => file.name), null, 2)}`);
      this.log.debug(`Files to mutate: ${JSON.stringify(mutateFiles, null, 2)}`);
    }
  }

  private reportAllSourceFilesRead(allFiles: File[]) {
    this.reporter.onAllSourceFilesRead(allFiles.map(toReportSourceFile));
  }

  private reportSourceFilesRead(textFile: File) {
    this.reporter.onSourceFileRead(toReportSourceFile(textFile));
  }

  private readFiles(files: string[]): Promise<File[]> {
    return Promise.all(files.map(fileName => this.readFile(fileName)));
  }

  private readFile(fileName: string): Promise<File> {
    return fs.readFile(fileName).then(content => new File(fileName, content))
      .then(file => {
        this.reportSourceFilesRead(file);
        return file;
      });
  }
}

class PatternResolver {

  private readonly log = getLogger(InputFileResolver.name);
  private ignore = false;
  private globExpression: string;

  constructor(globExpression: string, private previous?: PatternResolver) {
    this.ignore = globExpression.indexOf('!') === 0;
    if (this.ignore) {
      this.globExpression = globExpression.substring(1);
    } else {
      this.globExpression = globExpression;
    }
  }

  async resolve(): Promise<string[]> {
    // When the first expression starts with an '!', we skip that one
    if (this.ignore && !this.previous) {
      return Promise.resolve([]);
    } else {
      // Start the globbing task for the current descriptor
      const globbingTask = this.resolveGlobbingExpression(this.globExpression);

      // If there is a previous globbing expression, resolve that one as well
      if (this.previous) {
        const results = await Promise.all([this.previous.resolve(), globbingTask]);
        const previousFiles = results[0];
        const currentFiles = results[1];
        // If this expression started with a '!', exclude current files
        if (this.ignore) {
          return previousFiles.filter(previousFile => currentFiles.every(currentFile => previousFile !== currentFile));
        } else {
          // Only add files which were not already added
          return previousFiles.concat(currentFiles.filter(currentFile => !previousFiles.some(file => file === currentFile)));
        }
      } else {
        return globbingTask;
      }
    }
  }

  static empty(): PatternResolver {
    const emptyResolver = new PatternResolver('');
    emptyResolver.ignore = true;
    return emptyResolver;
  }

  static parse(inputFileExpressions: string[]): PatternResolver {
    const expressions = inputFileExpressions.map(i => i); // work on a copy as we're changing the array state
    let current = PatternResolver.empty();
    let expression = expressions.shift();
    while (expression) {
      current = new PatternResolver(expression, current);
      expression = expressions.shift();
    }
    return current;
  }

  private async resolveGlobbingExpression(pattern: string): Promise<string[]> {
    let files = await glob(pattern);
    if (files.length === 0) {
      this.reportEmptyGlobbingExpression(pattern);
    }
    return files.map((f) => path.resolve(f));
  }

  private reportEmptyGlobbingExpression(expression: string) {
    this.log.warn(`Globbing expression "${expression}" did not result in any files.`);
  }

}