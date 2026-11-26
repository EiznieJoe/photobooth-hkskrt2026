/**
 * Photobooth Hari Keusahawanan SK Rugading 2026
 * Terima gambar JPEG dari app dan simpan ke folder Google Drive anda.
 *
 * Deploy > New deployment > Web app
 *   Execute as : Me
 *   Who has access : Anyone
 */

// ID folder Drive = bahagian selepas /folders/ dalam link folder anda.
const FOLDER_ID = '1lz4Pt4hQJ_ia04OHtNzfcxleGAp0vqqF';

const NAME_RE = /^HKSKRT2026_[a-z0-9]+_(potret|landskap)_\d{8}_\d{6}\.jpg$/;
const MAX_BYTES = 15 * 1024 * 1024;

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const name = String(body.name || '');
    if (!NAME_RE.test(name)) return out_({ ok: false, error: 'bad name' });
    if (body.mimeType !== 'image/jpeg') return out_({ ok: false, error: 'not jpeg' });

    const bytes = Utilities.base64Decode(String(body.data || ''));
    if (bytes.length < 1000 || bytes.length > MAX_BYTES) return out_({ ok: false, error: 'bad size' });
    // Semak "tandatangan" fail JPEG (FF D8 FF) — fail lain ditolak
    if ((bytes[0] & 255) !== 0xFF || (bytes[1] & 255) !== 0xD8 || (bytes[2] & 255) !== 0xFF) {
      return out_({ ok: false, error: 'not jpeg' });
    }

    const lock = LockService.getScriptLock();
    lock.tryLock(20000);
    try {
      const folder = DriveApp.getFolderById(FOLDER_ID);
      // Elak gambar berganda jika app hantar semula gambar yang sama
      const same = folder.getFilesByName(name);
      while (same.hasNext()) {
        const f = same.next();
        if (f.getSize() === bytes.length) return out_({ ok: true, duplicate: true, id: f.getId() });
      }
      const file = folder.createFile(Utilities.newBlob(bytes, 'image/jpeg', name));
      return out_({ ok: true, id: file.getId() });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

// Buka link /exec dalam browser untuk semak skrip hidup
function doGet() {
  return out_({ ok: true, message: 'Photobooth HKSKRT2026 aktif' });
}

// Jalankan fungsi ini SEKALI dalam editor untuk beri kebenaran Drive
function ujiSetup() {
  const folder = DriveApp.getFolderById(FOLDER_ID);
  Logger.log('Folder dijumpai: ' + folder.getName());
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
