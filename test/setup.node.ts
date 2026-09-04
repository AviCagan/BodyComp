/**
 * `node:sqlite` prints an ExperimentalWarning on every import. The API we use
 * (DatabaseSync/StatementSync) is stable enough for tests, and the warning would
 * otherwise appear in every CI log, so it is filtered here and only here.
 */
const originalEmitWarning = process.emitWarning.bind(process);

process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const message = typeof warning === 'string' ? warning : (warning?.message ?? '');
  if (message.includes('SQLite is an experimental feature')) return;
  return (originalEmitWarning as (...args: unknown[]) => void)(warning, ...rest);
}) as typeof process.emitWarning;
