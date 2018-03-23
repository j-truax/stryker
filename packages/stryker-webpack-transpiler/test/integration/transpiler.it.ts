import * as path from 'path';
import * as fs from 'fs';
import WebpackTranspiler, { StrykerWebpackConfig } from '../../src/WebpackTranspiler';
import { Config } from 'stryker-api/config';
import { expect } from 'chai';
import { File } from 'stryker-api/core';

describe('Webpack transpiler', () => {

  function createSut() {
    const config = new Config();
    const strykerWebpackConfig: Partial<StrykerWebpackConfig> = {
      configFile: path.resolve(__dirname, '..', '..', 'testResources', 'gettingStarted', 'webpack.config.js')
    };
    config.set({
      webpack: strykerWebpackConfig
    });
    return new WebpackTranspiler({ produceSourceMaps: false, config });
  }

  function readFiles(): File[] {
    const dir = path.resolve(__dirname, '..', '..', 'testResources', 'gettingStarted', 'src');
    const files = fs.readdirSync(dir);
    return files.map(fileName => new File(path.resolve(dir, fileName), fs.readFileSync(path.resolve(dir, fileName))));
  }

  it('should be able to transpile the "gettingStarted" sample', async () => {
    const sut = createSut();
    const files = readFiles();
    const transpiledFiles = await sut.transpile(files);
    expect(transpiledFiles.error).null;
    expect(transpiledFiles.outputFiles).lengthOf(1);
  });

});

