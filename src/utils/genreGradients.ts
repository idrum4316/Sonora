// Shared genre gradient map — used by HomePage, SearchPage, LibraryPage, GenrePage

export const GENRE_GRADIENTS: Record<string, string> = {
  Electronic: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  Rock:       'linear-gradient(135deg, #6a0572 0%, #e01a4f 100%)',
  Jazz:       'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  Classical:  'linear-gradient(135deg, #2c3e50 0%, #4ca1af 100%)',
  Pop:        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'Hip-Hop':  'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
  'Hip Hop':  'linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%)',
  Metal:      'linear-gradient(135deg, #485563 0%, #29323c 100%)',
  Folk:       'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  Soul:       'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  Blues:      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  Ambient:    'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)',
  Indie:      'linear-gradient(135deg, #E07A5F 0%, #F2CC8F 100%)',
  Dance:      'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  Country:    'linear-gradient(135deg, #f7971e 0%, #E07A5F 100%)',
  Punk:       'linear-gradient(135deg, #e01a4f 0%, #485563 100%)',
  Reggae:     'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)',
  'R&B':      'linear-gradient(135deg, #5b247a 0%, #1bcedf 100%)',
};

const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #f7971e 0%, #ffd200 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)',
];

export function genreGradient(name: string, idx: number): string {
  return GENRE_GRADIENTS[name] ?? FALLBACK_GRADIENTS[idx % FALLBACK_GRADIENTS.length];
}
