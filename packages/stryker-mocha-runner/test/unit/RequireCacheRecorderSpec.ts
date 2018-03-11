import { expect } from 'chai';
import RequireCacheRecorder from '../../src/RequireCacheRecorder';

describe('RequireCacheRecorder', () => {
  it('should clear any newly required files when `purge` is called', () => {
    require.cache['foo.js'] = 'bar';
    const sut = new RequireCacheRecorder();
    require.cache['baz.js'] = 'to be deleted';
    sut.purge();
    expect(require.cache['baz.js']).undefined;
    expect(require.cache['foo.js']).eq('bar');
    delete require.cache['foo.js'];    
  });
});