/** An error caused by invalid input or stamps, its message is meant to be shown to the user. */
export class StampError extends Error {
  constructor(message) {
    super(message);
    this.name = 'StampError';
  }
}
