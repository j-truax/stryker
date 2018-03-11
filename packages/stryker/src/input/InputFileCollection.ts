import { File } from 'stryker-api/core';
import { Logger } from 'log4js';

export default class InputFileCollection {
  public readonly filesToMutate: ReadonlyArray<File>;
  public readonly mutateFileNames: ReadonlyArray<string>;

  constructor(public readonly files: ReadonlyArray<File>, mutateGlobResult: ReadonlyArray<string>) {
    this.mutateFileNames = mutateGlobResult.filter(mutateFile => files.some(file => file.name === mutateFile));
    this.filesToMutate = files.filter(file => this.mutateFileNames.some(name => name === file.name));
  }

  logFiles(log: Logger) {
    if (this.mutateFileNames.length) {
      log.info(`Found ${this.mutateFileNames.length} of ${this.files.length} file(s) to be mutated.`);
    } else {
      log.warn(`No files marked to be mutated, stryker will perform a dry-run without actually mutating anything.`);
    }
    if (log.isDebugEnabled) {
      log.debug(`All input files: ${JSON.stringify(this.files.map(file => file.name), null, 2)}`);
      log.debug(`Files to mutate: ${JSON.stringify(this.mutateFileNames, null, 2)}`);
    }
  }
}
