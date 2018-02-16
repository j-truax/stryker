
/** 
 * Represents a file within Stryker. Could be a strictly in-memory file.
*/
export default class File {

  private _textContent: string | undefined;
  private _content: Buffer;

  /**
   * Creates a new File to be used within Stryker.
   * @param name The full name of the file (inc path)
   * @param content The buffered content of the file
   */
  constructor(public readonly name: string, content: Buffer) {
    this._content = content;
  }

  /**
   * Gets the underlying content as buffer.
   */
  get content(): Buffer {
    return this._content;
  }

  /**
   * Sets the underlying content as buffer.
   */
  set content(value: Buffer) {
    this._textContent = undefined; // clear cache
    this._content = value;
  }

  /**
   * Gets the underlying content as string using utf8 encoding.
   */
  get textContent(): string {
    if (!this._textContent) {
      this._textContent = this.content.toString();
    }
    return this._textContent;
  }

  /**
   * Gets the underlying content as string.
   */
  set textContent(value: string) {
    this.content = Buffer.from(value);
    this._textContent = value;
  }
}
