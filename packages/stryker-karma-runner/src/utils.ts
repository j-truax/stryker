import * as fs from 'fs';

export function requireModule(name: string): any {
  return require(name);
}

/**
 * Creates an empty file if it did not exist
 * @param fileName the name of the file
 */
export function touchSync(fileName: string) {
  try {
    const handle = fs.openSync(fileName, 'wx');
    fs.closeSync(handle);
  } catch {

  }
}