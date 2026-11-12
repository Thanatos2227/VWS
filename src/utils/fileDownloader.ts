
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface FileSaveResult {
  success: boolean;
  path?: string;
  error?: string;
}

export async function saveFileToDevice(
  fileName: string,
  data: Blob | string | ArrayBuffer,
  mimeType: string
): Promise<FileSaveResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      let base64Data: string;

      if (typeof data === 'string') {
        base64Data = btoa(unescape(encodeURIComponent(data)));
      } else {
        const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;
        let binary = '';
        const bytes = new Uint8Array(arrayBuffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        base64Data = btoa(binary);
      }

      const result = await Filesystem.writeFile({
        path: `VWS_Backups/${fileName}`,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true
      });

      return {
        success: true,
        path: result.uri
      };
    } catch (err: any) {
      console.warn('Native Filesystem write failed, falling back to browser download:', err);
    }
  }

  try {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (err: any) {
    console.error('File download failed:', err);
    return {
      success: false,
      error: err.message || 'Unknown download failure'
    };
  }
}

