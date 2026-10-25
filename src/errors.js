/** Wrong command line usage, the message is shown together with a hint to the help. */
export class UsageError extends Error {
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}
