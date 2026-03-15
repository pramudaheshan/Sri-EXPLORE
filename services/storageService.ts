import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import app from '../firebaseConfig';

const storage = getStorage(app);

/**
 * Get download URL for a 3D model from Firebase Storage
 * @param model3dPath - The path stored in Firestore (e.g., 'Galle-Lighthouse.glb')
 * @returns Promise<string> - The downloadable URL
 */
export async function getModel3DUrl(model3dPath: string): Promise<string> {
  try {
    const fileRef = ref(storage, model3dPath);
    const downloadUrl = await getDownloadURL(fileRef);
    return downloadUrl;
  } catch (error) {
    console.error(`Error getting download URL for ${model3dPath}:`, error);
    throw error;
  }
}

/**
 * Get download URL with custom folder path
 * @param model3dPath - Just the filename (e.g., 'Galle-Lighthouse.glb')
 * @param folderPath - Optional folder (e.g., 'models') - defaults to root
 */
export async function getModel3DUrlWithFolder(
  model3dPath: string,
  folderPath: string = '',
): Promise<string> {
  const fullPath = folderPath ? `${folderPath}/${model3dPath}` : model3dPath;
  return getModel3DUrl(fullPath);
}
