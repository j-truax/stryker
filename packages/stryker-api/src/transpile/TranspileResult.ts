import { File } from '../../core';

export default interface TranspileResult {
  outputFiles: ReadonlyArray<File>;
  error: string | null;
}