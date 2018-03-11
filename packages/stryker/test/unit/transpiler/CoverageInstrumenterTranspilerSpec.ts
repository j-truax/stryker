import { expect } from 'chai';
import { Config } from 'stryker-api/config';
import CoverageInstrumenterTranspiler from '../../../src/transpiler/CoverageInstrumenterTranspiler';
import { testFramework } from '../../helpers/producers';
import { File } from 'stryker-api/core';

describe('CoverageInstrumenterTranspiler', () => {
  let sut: CoverageInstrumenterTranspiler;
  let config: Config;

  beforeEach(() => {
    config = new Config();
  });

  it('should not instrument any code when coverage analysis is off', async () => {
    sut = new CoverageInstrumenterTranspiler({ config, produceSourceMaps: false }, null, ['foobar.js']);
    config.coverageAnalysis = 'off';
    const input = [new File('foobar.js', '')];
    const output = await sut.transpile(input);
    expect(output.error).null;
    expect(output.outputFiles).deep.eq(input);
  });

  describe('when coverage analysis is "all"', () => {

    beforeEach(() => {
      config.coverageAnalysis = 'all';
      sut = new CoverageInstrumenterTranspiler({ config, produceSourceMaps: false }, null, ['mutate.js']);
    });

    it('should instrument code of mutated files', async () => {
      const input = [
        new File('mutate.js', 'function something() {}'),
        new File('spec.js', '')
      ];
      const output = await sut.transpile(input);
      expect(output.error).null;
      const instrumentedContent = output.outputFiles[0].textContent;
      expect(instrumentedContent).to.contain('function something(){cov_').and.contain('.f[0]++');
    });

    it('should preserve source map comments', async () => {
      const input = [
        new File('mutate.js', 'function something() {} // # sourceMappingUrl="something.map.js"'),
      ];
      const output = await sut.transpile(input);
      expect(output.error).null;
      const instrumentedContent = output.outputFiles[0].textContent;
      expect(instrumentedContent).to.contain('sourceMappingUrl="something.map.js"');
    });

    it('should create a statement map for mutated files', () => {
      const input = [
        new File('mutate.js', 'function something () {}'),
        new File('foobar.js', 'console.log("foobar");')
      ];
      sut.transpile(input);
      expect(sut.fileCoverageMaps['mutate.js'].statementMap).deep.eq({});
      expect(sut.fileCoverageMaps['mutate.js'].fnMap[0]).deep.eq({ start: { line: 0, column: 22 }, end: { line: 0, column: 24 } });
      expect(sut.fileCoverageMaps['mutate.js'].fnMap[1]).undefined;
      expect(sut.fileCoverageMaps['foobar.js']).undefined;
    });

    it('should fill error message and not transpile input when the file contains a parse error', async () => {
      const invalidJavascriptFile = new File('mutate.js', 'function something {}');
      const output = await sut.transpile([invalidJavascriptFile]);
      expect(output.error).contains('Could not instrument "mutate.js" for code coverage. SyntaxError: Unexpected token');
    });
  });

  describe('when coverage analysis is "perTest" and there is a testFramework', () => {
    let input: File[];

    beforeEach(() => {
      config.coverageAnalysis = 'perTest';
      sut = new CoverageInstrumenterTranspiler({ config, produceSourceMaps: false }, testFramework(), ['mutate.js']);
      input = [new File('mutate.js', 'function something() {}')];
    });

    it('should use the coverage variable "__strykerCoverageCurrentTest__"', async () => {
      const output = await sut.transpile(input);
      expect(output.error).null;
      const instrumentedContent = output.outputFiles[1].textContent;
      expect(instrumentedContent).to.contain('__strykerCoverageCurrentTest__').and.contain('.f[0]++');
    });

    it('should also add a collectCoveragePerTest file', async () => {
      const output = await sut.transpile(input);
      expect(output.error).null;
      expect(output.outputFiles).lengthOf(2);
      const actualContent = output.outputFiles[0].textContent;
      expect(actualContent).to.have.length.greaterThan(30);
      expect(actualContent).to.contain('beforeEach()');
      expect(actualContent).to.contain('afterEach()');
    });
  });

  it('should result in an error if coverage analysis is "perTest" and there is no testFramework', async () => {
    config.coverageAnalysis = 'perTest';
    sut = new CoverageInstrumenterTranspiler({ config, produceSourceMaps: true }, null, ['mutate.js']);
    const output = await sut.transpile([new File('mutate.js', 'a + b')]);
    expect(output.error).eq('Cannot measure coverage results per test, there is no testFramework and thus no way of executing code right before and after each test.');
  });
});