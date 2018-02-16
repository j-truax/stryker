import { StrykerOptions } from '../../core';

/**
 * Represents an options object to configure a TestRunner.
 */
interface RunnerOptions {

  /**
   * Represents a free port which the test runner can choose to use
   */
  port: number;

  /**
   * The underlying strykerOptions
   */
  strykerOptions: StrykerOptions;
}

export default RunnerOptions; 