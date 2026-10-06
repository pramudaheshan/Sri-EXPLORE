// @ts-nocheck
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

// Simple model caching service
const downloadPromises: Map<string, Promise<string>> = new Map();

async function hashString(input: string) {
  return await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, input);
}

export async function getCachedModelPath(url: string, relicId?: string) {
  if (!url) {
    console.log('❌ [CACHE] Empty URL provided');
    return null;
  }

  try {
    console.log(`📍 [CACHE] Processing URL: ${url}`);
    const extMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
    const ext = extMatch ? `.${extMatch[1]}` : '.glb';
    console.log(`📍 [CACHE] Detected extension: ${ext}`);
    
    const hash = relicId ? await hashString(relicId) : await hashString(url);
    const filename = `${hash}${ext}`;
    const FS: any = FileSystem as any;
    const cacheDir = FS.cacheDirectory || FS.documentDirectory || '';
    const dir = `${cacheDir}models/`;
    const filepath = `${dir}${filename}`;

    console.log(`📍 [CACHE] Cache directory: ${cacheDir}`);
    console.log(`📍 [CACHE] Full cache path: ${filepath}`);

    const info = await FileSystem.getInfoAsync(filepath);
    if (info.exists) {
      console.log(`✅ [CACHE HIT] Relic loaded from cache: ${relicId || filename}`);
      return filepath;
    }

    // Download once per URL/hashing
    if (!downloadPromises.has(filepath)) {
      const promise = (async () => {
        try {
          console.log(`📥 [CACHE MISS] Downloading relic model: ${relicId || filename}`);
          console.log(`📥 [CACHE MISS] From URL: ${url}`);
          // Ensure dir exists
          const dirInfo = await FileSystem.getInfoAsync(dir);
          if (!dirInfo.exists) {
            console.log(`📁 Creating cache directory: ${dir}`);
            await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
          }

          console.log(`⬇️  Downloading to: ${filepath}`);
          const res = await FileSystem.downloadAsync(url, filepath);
          console.log(`💾 [CACHED] Download SUCCESS - Relic saved to cache: ${relicId || filename}`);
          console.log(`💾 [CACHED] Local URI: ${res.uri}`);
          return res.uri;
        } catch (err) {
          console.error(`❌ [CACHE ERROR] Failed to cache relic ${relicId || filename}:`, err);
          // Clean up possible partial file
          try {
            const cleanup = await FileSystem.getInfoAsync(filepath);
            if (cleanup.exists) await FileSystem.deleteAsync(filepath);
          } catch (e) {
            // ignore
          }
          throw err;
        } finally {
          downloadPromises.delete(filepath);
        }
      })();

      downloadPromises.set(filepath, promise);
    }

    // Wait for download to finish
    const localUri = await downloadPromises.get(filepath) as string;
    return localUri;
  } catch (err) {
    console.warn('❌ [CACHE FAILED] getCachedModelPath failed:', err);
    return null;
  }
}

export async function preloadModel(url: string, relicId?: string) {
  // returns local uri or null
  if (!url) return null;
  console.log(`🔄 [PRELOAD] Starting preload for: ${relicId || url.substring(0, 30)}...`);
  return await getCachedModelPath(url, relicId);
}

export default {
  getCachedModelPath,
  preloadModel,
};
