import { describe, expect, it } from 'vitest';
import { generateQrMatrix, generateQrSvgPath } from './qr-code.util';

describe('QRCodeUtil (Pure TypeScript)', () => {
  it('generates a valid square boolean matrix for a standard URL', () => {
    const text = 'https://example.com/#spore=Theta-Scorching';
    const matrix = generateQrMatrix(text);

    expect(matrix.length).toBeGreaterThanOrEqual(21);
    expect(matrix[0].length).toBe(matrix.length);

    // Verify top-left finder pattern 7x7
    expect(matrix[0][0]).toBe(true);
    expect(matrix[0][6]).toBe(true);
    expect(matrix[6][0]).toBe(true);
    expect(matrix[6][6]).toBe(true);
    expect(matrix[1][1]).toBe(false);
    expect(matrix[3][3]).toBe(true);
  });

  it('generates an SVG path string containing rectangle move/line segments', () => {
    const text = 'Theta: Scorching Clockwork Catacombs';
    const matrix = generateQrMatrix(text);
    const path = generateQrSvgPath(matrix);

    expect(typeof path).toBe('string');
    expect(path).toContain('M0,0h1v1h-1z');
    expect(path.length).toBeGreaterThan(100);
  });
});
