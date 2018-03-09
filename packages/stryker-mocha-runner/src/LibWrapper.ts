import * as Mocha from 'mocha';
import * as glob from 'fast-glob';

/**
 * Wraps Mocha class and require for testability
 */
export default class LibWrapper {
  static Mocha = Mocha;
  static require = require;
  static glob = (patterns: string[]) => glob<string>(patterns);
}