import { Transpiler, TranspilerOptions, TranspileResult } from 'stryker-api/transpile';
import { File } from 'stryker-api/core';
import * as babel from 'babel-core';
import * as path from 'path';
import { EOL } from 'os';
import BabelConfigReader from './BabelConfigReader';
import { CONFIG_KEY_FILE } from './helpers/keys';
import { toJSFileName } from './helpers/helpers';
import { setGlobalLogLevel } from 'log4js';

const KNOWN_EXTENSIONS = Object.freeze([
  '.es6',
  '.js',
  '.es',
  '.jsx'
  // => TODO in Babel 7 this list gets even bigger (and is exported from @babel/core: https://github.com/babel/babel/blob/master/packages/babel-core/src/index.js#L41)
  // Also: you can add custom extensions if your using the babel cli, maybe we should also support that use case
]);

class BabelTranspiler implements Transpiler {
  private babelOptions: babel.TransformOptions;
  private projectRoot: string;

  public constructor(options: TranspilerOptions) {
    setGlobalLogLevel(options.config.logLevel);
    this.babelOptions = new BabelConfigReader().readConfig(options.config);
    this.projectRoot = this.determineProjectRoot(options);
    if (options.produceSourceMaps) {
      throw new Error(`Invalid \`coverageAnalysis\` "${options.config.coverageAnalysis}" is not supported by the stryker-babel-transpiler. Not able to produce source maps yet. Please set it to "off".`);
    }
  }

  public transpile(files: File[]): Promise<TranspileResult> {
    const errors: string[] = [];
    const transpiledFiles = files.map(file => {
      try {
        return this.transpileFileIfNeeded(file);
      } catch (error) {
        errors.push(`Error while transpiling "${file.name}": ${error.stack || error.message}`);
        return file;
      }
    });
    return Promise.resolve(this.createResult(transpiledFiles, errors));
  }

  private transpileFileIfNeeded(file: File): File {
    if (KNOWN_EXTENSIONS.some(ext => ext === path.extname(file.name))) {
      return this.transpileFile(file);
    } else {
      return file; // pass through
    }
  }

  private transpileFile(file: File) {
    const options = Object.assign({}, this.babelOptions, {
      filename: file.name,
      filenameRelative: path.relative(this.projectRoot, file.name)
    });
    const result = babel.transform(file.textContent, options);
    if ((result as any).ignored) {
      // Ignored will be true if the file was not transpiled (because it was ignored)
      // TODO: Babel 7 will change this (according to a conversation I had on Slack).
      //  => it will return a `null` value in that case
      return file;
    } else if (typeof result.code === 'undefined') {
      throw new Error(`Could not transpile file "${file.name}". Babel transform function delivered \`undefined\`.`);
    } else {
      return new File(toJSFileName(file.name), result.code);
    }
  }

  private determineProjectRoot(options: TranspilerOptions): string {
    const configFile = options.config[CONFIG_KEY_FILE];
    if (configFile) {
      return path.dirname(configFile);
    } else {
      return process.cwd();
    }
  }

  private createResult(results: File[], errorResults: string[]): TranspileResult {
    if (errorResults.length > 0) {
      return this.createErrorResult(errorResults.join(EOL));
    }
    return this.createSuccessResult(results);
  }

  private createErrorResult(error: string): TranspileResult {
    return {
      error,
      outputFiles: []
    };
  }

  private createSuccessResult(outputFiles: File[]): TranspileResult {
    return {
      error: null,
      outputFiles
    };
  }
}

export default BabelTranspiler;