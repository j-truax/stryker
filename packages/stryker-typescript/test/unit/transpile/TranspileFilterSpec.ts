import { expect } from 'chai';
import * as path from 'path';
import { Config } from 'stryker-api/config';
import TranspileFilter, { DefaultFilter, TSConfigFilter } from '../../../src/transpiler/TranspileFilter';
import { File } from 'stryker-api/core';
import { serialize } from 'surrial';

describe('TranspileFilter', () => {

  describe('create', () => {
    it('should result in the default filter tsconfig is undefined', () => {
      const config = new Config();
      config['tsconfig'] = undefined;
      expect(TranspileFilter.create(config)).instanceof(DefaultFilter);
    });
    it('should result in the tsconfig filter if tsconfig is present with files', () => {
      const config = new Config();
      config['tsconfig'] = { fileNames: [] };
      expect(TranspileFilter.create(config)).instanceof(TSConfigFilter);
    });
  });

  describe('filterIsIncluded', () => {
    it('should correctly filter files', () => {
      class FoobarFilter extends TranspileFilter {
        public isIncluded(fileName: string): boolean {
          return fileName === 'foo' || fileName === 'bar';
        }
      }
      const foo = new File('foo', 'foo');
      const bar = new File('bar', 'bar');
      const baz = new File('baz', 'baz');
      const output = new FoobarFilter().filterIsIncluded([foo, baz, bar]);
      expect(serialize(output)).eq(serialize([foo, bar]));
    });
  });

});

describe('DefaultFilter', () => {
  it('should only include known typescript extensions', () => {
    const sut = new DefaultFilter();
    expect(sut.isIncluded('file1.ts')).eq(true);
    expect(sut.isIncluded('file2.bin')).eq(false);
    expect(sut.isIncluded('file3.d.ts')).eq(true);
    expect(sut.isIncluded('file5.tsx')).eq(true);
  });
});

describe('TSConfigFilter', () => {
  it('should only include known files', () => {
    const sut = new TSConfigFilter({ fileNames: ['include/this.file', 'foobar.ts'] });
    expect(sut.isIncluded(path.normalize('include/this.file'))).eq(true);
    expect(sut.isIncluded('foobar.ts')).eq(true);
    expect(sut.isIncluded('baz.ts')).eq(false);
  });
});