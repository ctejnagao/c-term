import fs from 'fs';
import path from 'path';

export const DEFAULT_PDF_STORAGE_DIR = '\\\\eggplant\\share\\Project\\CTEJ\\物件\\CTEJ\\JCC_WEB\\注文書';

export function getPdfStorageDir(): string {
  return process.env.PDF_STORAGE_DIR || DEFAULT_PDF_STORAGE_DIR;
}

/**
 * PDFファイルの絶対パスを検索・取得します。
 * 1. 共有ストレージ (\\eggplant\share\...) の fileName
 * 2. サーバーの public/uploads/ 内の fileUrl または fileName
 * 3. 共有ストレージ内の fileUrl ベースネーム
 */
export function resolvePdfFilePath(fileName?: string | null, fileUrl?: string | null): string | null {
  const storageDir = getPdfStorageDir();

  // 1. 共有ストレージ内の fileName
  if (fileName) {
    try {
      const networkPath = path.join(/*turbopackIgnore: true*/ storageDir, fileName);
      if (fs.existsSync(/*turbopackIgnore: true*/ networkPath)) {
        return networkPath;
      }
    } catch (e) {
      // ネットワークパスにアクセスできない環境の場合はスキップ
    }
  }

  // 2. サーバーローカルの public/uploads (fileUrl)
  if (fileUrl) {
    try {
      const cleanUrl = fileUrl.replace(/^\//, '');
      const localPath = path.join(process.cwd(), 'public', cleanUrl);
      if (fs.existsSync(localPath)) {
        return localPath;
      }
    } catch (e) {
      // スキップ
    }

    // 共有ストレージ内の basename (タイムスタンプ付きファイル名等)
    try {
      const baseName = path.basename(fileUrl);
      const networkBase = path.join(/*turbopackIgnore: true*/ storageDir, baseName);
      if (fs.existsSync(/*turbopackIgnore: true*/ networkBase)) {
        return networkBase;
      }
    } catch (e) {
      // スキップ
    }
  }

  // 3. サーバーローカルの public/uploads (fileName)
  if (fileName) {
    try {
      const localNamed = path.join(process.cwd(), 'public', 'uploads', fileName);
      if (fs.existsSync(localNamed)) {
        return localNamed;
      }
    } catch (e) {
      // スキップ
    }
  }

  return null;
}
