import { describe, it, expect } from 'vitest';
import { ALLOWED_FILE_EXTENSIONS, isAllowedFileExtension } from '@/lib/file-validation';

describe('file upload type allowlist', () => {
  it('allows common document types', () => {
    expect(isAllowedFileExtension('report.pdf')).toBe(true);
    expect(isAllowedFileExtension('data.xlsx')).toBe(true);
    expect(isAllowedFileExtension('document.docx')).toBe(true);
    expect(isAllowedFileExtension('notes.doc')).toBe(true);
    expect(isAllowedFileExtension('sheet.xls')).toBe(true);
    expect(isAllowedFileExtension('slides.pptx')).toBe(true);
    expect(isAllowedFileExtension('text.txt')).toBe(true);
    expect(isAllowedFileExtension('data.csv')).toBe(true);
    expect(isAllowedFileExtension('script.inp')).toBe(true);
  });

  it('allows image types', () => {
    expect(isAllowedFileExtension('photo.jpg')).toBe(true);
    expect(isAllowedFileExtension('photo.jpeg')).toBe(true);
    expect(isAllowedFileExtension('image.png')).toBe(true);
    expect(isAllowedFileExtension('graphic.webp')).toBe(true);
    expect(isAllowedFileExtension('icon.gif')).toBe(true);
  });

  it('allows video/audio types', () => {
    expect(isAllowedFileExtension('clip.mp4')).toBe(true);
    expect(isAllowedFileExtension('recording.mp3')).toBe(true);
    expect(isAllowedFileExtension('voice.ogg')).toBe(true);
  });

  it('rejects executable and script types', () => {
    expect(isAllowedFileExtension('virus.exe')).toBe(false);
    expect(isAllowedFileExtension('script.sh')).toBe(false);
    expect(isAllowedFileExtension('page.html')).toBe(false);
    expect(isAllowedFileExtension('xss.svg')).toBe(false);
    expect(isAllowedFileExtension('macro.bat')).toBe(false);
    expect(isAllowedFileExtension('code.js')).toBe(false);
    expect(isAllowedFileExtension('code.ts')).toBe(false);
    expect(isAllowedFileExtension('payload.php')).toBe(false);
  });

  it('rejects files with no extension', () => {
    expect(isAllowedFileExtension('noext')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isAllowedFileExtension('FILE.PDF')).toBe(true);
    expect(isAllowedFileExtension('FILE.EXE')).toBe(false);
  });

  it('exports the allowlist for visibility', () => {
    expect(Array.isArray(ALLOWED_FILE_EXTENSIONS)).toBe(true);
    expect(ALLOWED_FILE_EXTENSIONS.length).toBeGreaterThan(0);
  });
});
