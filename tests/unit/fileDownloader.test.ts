
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveFileToDevice } from '../../src/utils/fileDownloader';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(),
    isPluginAvailable: vi.fn()
  }
}));

vi.mock('@capacitor/filesystem', () => ({
  Filesystem: {
    writeFile: vi.fn()
  },
  Directory: {
    Documents: 'DOCUMENTS',
    Cache: 'CACHE'
  }
}));

describe('Unified File Downloader (saveFileToDevice)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  it('triggers browser DOM download when running on web platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const removeChildSpy = vi.spyOn(document.body, 'removeChild');

    const result = await saveFileToDevice('test.json', '{"hello":"world"}', 'application/json');

    expect(result.success).toBe(true);
    expect(appendChildSpy).toHaveBeenCalled();
    expect(removeChildSpy).toHaveBeenCalled();
    expect(Filesystem.writeFile).not.toHaveBeenCalled();
  });

  it('writes to Capacitor Filesystem when running on native platform', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Filesystem.writeFile).mockResolvedValue({ uri: 'file:///storage/emulated/0/Documents/VWS_Backups/test.xlsx' });

    const dummyBuffer = new Uint8Array([1, 2, 3, 4]).buffer;
    const result = await saveFileToDevice('test.xlsx', dummyBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    expect(result.success).toBe(true);
    expect(result.path).toBe('file:///storage/emulated/0/Documents/VWS_Backups/test.xlsx');
    expect(Filesystem.writeFile).toHaveBeenCalledWith(expect.objectContaining({
      path: 'VWS_Backups/test.xlsx',
      directory: Directory.Documents,
      recursive: true
    }));
  });

  it('gracefully falls back to browser download if native Filesystem write throws', async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.mocked(Filesystem.writeFile).mockRejectedValue(new Error('Permission denied'));

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');

    const result = await saveFileToDevice('test.json', '{"backup":"data"}', 'application/json');

    expect(result.success).toBe(true);
    expect(appendChildSpy).toHaveBeenCalled();
  });
});
