// Shared genre color map — flat solid colors used by HomePage, SearchPage, LibraryPage, GenrePage

export const GENRE_GRADIENTS: Record<string, string> = {
  Electronic: '#4A4490',
  Rock:       '#7A2040',
  Jazz:       '#8A5A20',
  Classical:  '#2A3A4A',
  Pop:        '#8A3058',
  'Hip-Hop':  '#2A3050',
  'Hip Hop':  '#2A3050',
  Metal:      '#3A4048',
  Folk:       '#2A7A5A',
  Soul:       '#8A5038',
  Blues:      '#2A6090',
  Ambient:    '#6A4090',
  Indie:      '#8A5040',
  Dance:      '#1A6860',
  Country:    '#7A6020',
  Punk:       '#8A2040',
  Reggae:     '#3A7028',
  'R&B':      '#4A3878',
};

const FALLBACK_GRADIENTS = [
  '#4A4490',
  '#2A7A5A',
  '#8A5A20',
  '#2A6090',
  '#8A5038',
  '#6A4090',
];

export function genreGradient(name: string, idx: number): string {
  return GENRE_GRADIENTS[name] ?? FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length];
}
