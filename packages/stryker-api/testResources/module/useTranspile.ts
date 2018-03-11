import { Config } from 'stryker-api/config';
import { Transpiler, TranspileResult, TranspilerFactory, TranspilerOptions } from 'stryker-api/transpile';
import { File } from 'stryker-api/core';

class MyTranspiler implements Transpiler {

  constructor(private transpilerOptions: TranspilerOptions) { }

  transpile(files: ReadonlyArray<File>): Promise<TranspileResult> {
    return Promise.resolve({
      outputFiles: [new File('foo/bar.js', Buffer.from('bar.js'))],
      error: null
    });
  }
}

TranspilerFactory.instance().register('my-transpiler', MyTranspiler);
const transpiler = TranspilerFactory.instance().create('my-transpiler', { produceSourceMaps: true, config: new Config() });

transpiler.transpile([new File('foo/bar.ts', Buffer.from('foobar'))]).then((transpileResult) => {
  console.log(JSON.stringify(transpileResult));
});