

export default class RequireCacheRecorder {

  private cacheBefore: string[];

  constructor() {
    this.cacheBefore = Object.keys(require.cache);
  }

  purge() {
    Object.keys(require.cache)
      .filter(file => !this.cacheBefore.some(fileBefore => fileBefore === file))
      .forEach(file => delete require.cache[file]);
  }
}