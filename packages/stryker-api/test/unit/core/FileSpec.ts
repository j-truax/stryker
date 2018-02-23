import { expect } from 'chai';
import { File } from '../../../core';
import { serialize, deserialize } from 'surrial';

describe('File', () => {

  it('should allow utf8 encoded string content in the constructor', () => {
    const actual = new File('foobar.js', 'string-content');
    expect(actual.content).deep.eq(Buffer.from('string-content'));
  });

  it('should allow buffered content in the constructor', () => {
    const actual = new File('foobar.js', Buffer.from('string-content'));
    expect(actual.textContent).deep.eq('string-content');
  });

  it('should update textContent if content is changed', () => {
    const file = new File('foobar.js', Buffer.from('test'));
    expect(file.textContent).eq('test');
    file.content = Buffer.from('altered content');
    expect(file.textContent).eq('altered content');
  });

  it('should update content if text content is changed', () => {
    const file = new File('foobar.js', Buffer.from('test'));
    expect(file.textContent).eq('test');
    file.textContent = 'altered content';
    expect(file.content).deep.eq(Buffer.from('altered content'));
    expect(file.textContent).eq('altered content');
  });

  it('should be serializable', () => {
    const expected = new File('foo', Buffer.from('bar'));
    const serialized = serialize(expected);
    const actual = deserialize(serialized, [File]);
    expect(actual).deep.eq(expected);
  });
});