import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db, handleFirestoreError, OperationType } from './firebase';
import { AnalysisResult } from '../types';

export async function compressImage(dataUrl: string, maxWidth = 1600, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      if (width > maxWidth) {
        const ratio = maxWidth / width;
        width = maxWidth;
        height = height * ratio;
      }
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      // Compress as JPEG to significantly reduce file size
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function uploadScreenshotAndSaveSetup(
  userId: string,
  base64Image: string,
  analysis: AnalysisResult,
  imageType: 'morning' | 'lunch',
  ocrData?: any
) {
  try {
    // 1. Compress Image
    const compressedImage = await compressImage(base64Image);

    // 2. Convert timestamp for unique filename
    const timestamp = new Date().getTime();
    // Using .jpg since we compress to JPEG
    const filename = `screenshots/${userId}/${timestamp}_${imageType}.jpg`;
    const storageRef = ref(storage, filename);
    
    // 3. Upload Compressed Image to Firebase Storage
    await uploadString(storageRef, compressedImage, 'data_url');
    
    // 4. Get Download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    // 5. Save metadata to Firestore 'setups' collection
    const setupData: Record<string, any> = {
      userId,
      dayType: analysis.dayType,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence,
      imageURL: downloadURL,
      tags: analysis.tags || [],
      suggestedEntry: analysis.suggestedEntry || 0,
      suggestedStop: analysis.suggestedStop || 0,
      suggestedTarget: analysis.suggestedTarget || 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    if (ocrData) {
      setupData.ocrText = JSON.stringify(ocrData);
    }
    Object.keys(setupData).forEach(key => setupData[key] === undefined && delete setupData[key]);
    
    const docRef = await addDoc(collection(db, 'setups'), setupData);
    console.log("Analysis saved to cloud with ID: ", docRef.id);
    return { id: docRef.id, url: downloadURL };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPLOAD, 'setups/storage');
  }
}
