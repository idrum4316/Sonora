const LOGO = `███████  ██████  ███    ██  ██████  ██████   █████
██      ██    ██ ████   ██ ██    ██ ██   ██ ██   ██
███████ ██    ██ ██ ██  ██ ██    ██ ██████  ███████
     ██ ██    ██ ██  ██ ██ ██    ██ ██   ██ ██   ██
███████  ██████  ██   ████  ██████  ██   ██ ██   ██`;

/** Text cells are twice as tall as they're wide, so each one becomes two square dots. */
const DOTS_PER_CELL = 2;
const DOT_SIZE = 0.8;
const MARGIN = 1;

/**
 * The logo as lit dots on a dot-matrix panel, in the same style as the spectrum: the unlit ones stay
 * faintly visible, and the lit ones warm up from left to right. Drawn as shapes, so block characters
 * can't show seams in any font.
 */
export function Logo({ animated = false }: { animated?: boolean }) {
  const rows = LOGO.split('\n');
  const columns = Math.max(...rows.map(row => row.length));
  const height = rows.length * DOTS_PER_CELL;
  const dots: JSX.Element[] = [];
  for (let x = -MARGIN; x < columns + MARGIN; x++) {
    for (let y = -MARGIN; y < height + MARGIN; y++) {
      const lit = rows[Math.floor(y / DOTS_PER_CELL)]?.[x] === '█';
      dots.push(
        <rect
          key={`${x}:${y}`}
          className={lit ? 'is-lit' : undefined}
          x={x + (1 - DOT_SIZE) / 2}
          y={y + (1 - DOT_SIZE) / 2}
          width={DOT_SIZE}
          height={DOT_SIZE}
          rx={0.1}
          style={lit && animated ? { animationDelay: `${x * 9 + y * 7}ms` } : undefined}
        />,
      );
    }
  }
  return (
    <svg
      className={`t-logo${animated ? ' is-animated' : ''}`}
      viewBox={`${-MARGIN} ${-MARGIN} ${columns + MARGIN * 2} ${height + MARGIN * 2}`}
      role="img"
      aria-label="Sonora"
    >
      {dots}
    </svg>
  );
}
