import TranspilingLanguageService, * as transpilingLanguageService from '../../src/transpiler/TranspilingLanguageService';
import * as log4js from 'log4js';
import { expect } from 'chai';
import { Mock, mock } from '../helpers/producers';
import TypescriptTranspiler from '../../src/TypescriptTranspiler';
import { Config } from 'stryker-api/config';
import { File } from 'stryker-api/core';
import { EmitOutput } from '../../src/transpiler/TranspilingLanguageService';

describe('TypescriptTranspiler', () => {

  let languageService: Mock<TranspilingLanguageService>;
  let sut: TypescriptTranspiler;
  let config: Config;

  beforeEach(() => {
    config = new Config();
    languageService = mock(TranspilingLanguageService);
    sandbox.stub(transpilingLanguageService, 'default').returns(languageService);
    sandbox.stub(log4js, 'setGlobalLogLevel');
  });

  it('set global log level', () => {
    config.logLevel = 'foobar';
    sut = new TypescriptTranspiler({ config, produceSourceMaps: true });
    expect(log4js.setGlobalLogLevel).calledWith('foobar');
  });

  describe('transpile', () => {
    let singleFileOutputEnabled: boolean;

    function makeOutputFile(file: File): EmitOutput {
      const copy = Object.assign({}, file);
      if (singleFileOutputEnabled) {
        const singleFileOutput = new File('allOutput.js', 'single output');
        return { singleResult: singleFileOutputEnabled, outputFiles: [singleFileOutput] };
      } else if (file.name.endsWith('.ts') || file.name.endsWith('.js')) {
        const copy = new File(file.name.replace('.ts', '.js'), file.content);
        return { singleResult: singleFileOutputEnabled, outputFiles: [copy] };
      } else {
        throw new Error(`Could not transpile "${file.name}"`);
      }
    }

    beforeEach(() => {
      singleFileOutputEnabled = false;
      languageService.getSemanticDiagnostics.returns([]); // no errors by default
      languageService.emit.callsFake(makeOutputFile);
      sut = new TypescriptTranspiler({ config, produceSourceMaps: true });
    });

    it('should transpile given files', async () => {
      const result = await sut.transpile([
        new File('foo.ts', ''),
        new File('bar.ts', '')
      ]);
      expect(result.error).eq(null);
      expect(result.outputFiles).deep.eq([
        new File('foo.ts', ''),
        new File('bar.ts', '')
      ]);
    });

    it('should keep file order', async () => {
      const input = [
        new File('file1.js', ''),
        new File('file2.ts', ''),
        new File('file3.bin', ''),
        new File('file4.ts', ''),
        new File('file5.d.ts', '')
      ];
      const result = await sut.transpile(input);
      expect(result.error).eq(null);
      expect(result.outputFiles).deep.eq([
        new File('file1.js', ''),
        new File('file2.js', ''),
        new File('file3.bin', ''),
        new File('file4.js', '')
      ]);
    });

    it('should keep order if single output result file', async () => {
      singleFileOutputEnabled = true;
      const input = [
        new File('file1.ts', ''),
        new File('file2.ts', ''),
        new File('file3.bin', ''),
        new File('file4.ts', ''),
        new File('file5.ts', '')
      ];
      const output = await sut.transpile(input);
      expect(output.error).eq(null);
      expect(output.outputFiles).deep.eq([
        new File('file1.ts', ''),
        new File('allOutput.js', 'single output'),
        new File('file3.bin', ''),
        new File('file5.ts', '')
      ]);
    });

    it('should only emit valid typescript files', () => {
      const input = [
        new File('file1.ts', ''), // OK
        new File('file2.ts', ''), // NOK: transpiled: false
        new File('file3.ts', ''), // NOK: binary file
        new File('file4.d.ts', ''), // NOK: *.d.ts file
        new File('file5.js', ''), // NOK: transpiled: false
        new File('file6.js', '') // OK, transpiled JS file
      ];
      sut.transpile(input);
      expect(languageService.emit).calledWith(textFile({ name: 'file1.ts', transpiled: true }));
      expect(languageService.emit).calledWith(textFile({ name: 'file6.js', transpiled: true }));
    });

    it('should return errors when there are diagnostic messages', async () => {
      languageService.getSemanticDiagnostics.returns('foobar');
      const input = [textFile({ name: 'file1.ts' }), textFile({ name: 'file2.ts' })];
      const result = await sut.transpile(input);
      expect(result.error).eq('foobar');
      expect(result.outputFiles).lengthOf(0);
    });
  });
});