import { CELL_WIDTH, ROW_HEIGHT } from '../nav';

const LOGO = `███████  ██████  ███    ██  ██████  ██████   █████
██      ██    ██ ████   ██ ██    ██ ██   ██ ██   ██
███████ ██    ██ ██ ██  ██ ██    ██ ██████  ███████
     ██ ██    ██ ██  ██ ██ ██    ██ ██   ██ ██   ██
███████  ██████  ██   ████  ██████  ██   ██ ██   ██`;

/** Each character becomes a cell-shaped block. */
const CELL_HEIGHT = ROW_HEIGHT / CELL_WIDTH;

/**
 * The logo in block characters, like a figlet banner. Drawn as shapes rather than typed, because the
 * web font has no block characters and fallback fonts leave seams between them.
 */
export function Logo() {
  const rows = LOGO.split('\n');
  const columns = Math.max(...rows.map(row => row.length));
  return (
    <svg className="t-logo" viewBox={`0 0 ${columns} ${rows.length * CELL_HEIGHT}`} role="img" aria-label="Sonora">
      {rows.flatMap((row, y) =>
        [...row.matchAll(/█+/g)].map(run => (
          <rect key={`${run.index}:${y}`} x={run.index} y={y * CELL_HEIGHT} width={run[0].length} height={CELL_HEIGHT} />
        )),
      )}
    </svg>
  );
}
