/**
 * src/utils/fileDownloader.ts
 * 
 * Unified File Download & Export Handler for Vetri Water Solutions.
 * Supports both Web Browsers (Blob URLs / standard anchor click) and 
 * Native Android via Capacitor Filesystem (writing directly to Documents directory).
 */

import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface FileSaveResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Saves binary or text data to the device storage.
 * - On Native Android: Writes to the Documents directory under VWS_Backups/
 * - On Web Browser: Creates an ephemeral Blob download via DOM anchor
 */
export async function saveFileToDevice(
  fileName: string,
  data: Blob | string | ArrayBuffer,
  mimeType: string
): Promise<FileSaveResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      let base64Data: string;

      if (typeof data === 'string') {
        // UTF-8 string encoding to base64
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
      // Fall through to browser download as fallback
    }
  }

  // Web Browser Download
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

