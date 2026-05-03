import { supabase } from './supabase';
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

function dataURLtoBlob(dataurl: string): Blob {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Invalid base64 Data URI");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
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
    
    const blob = dataURLtoBlob(compressedImage);

    // 3. Upload Compressed Image to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(filename, blob, {
        contentType: 'image/jpeg'
      });
      
    if (uploadError) {
      console.error("Storage upload error", uploadError);
      throw uploadError;
    }
    
    // 4. Get Download URL
    const { data: publicURLData } = supabase.storage
      .from('screenshots')
      .getPublicUrl(filename);
    const downloadURL = publicURLData.publicUrl;
    
    // 5. Save metadata to Supabase 'setups' table
    const setupData: Record<string, any> = {
      userId,
      dayType: analysis.dayType,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence,
      imageURL: downloadURL,
      tags: analysis.tags || [],
      suggestedEntry: analysis.suggestedEntry || 0,
      suggestedStop: analysis.suggestedStop || 0,
      suggestedTarget: analysis.suggestedTarget || 0
    };
    
    if (ocrData) {
      setupData.ocrText = JSON.stringify(ocrData);
    }
    Object.keys(setupData).forEach(key => setupData[key] === undefined && delete setupData[key]);
    
    const { data: docData, error: dbError } = await supabase
      .from('setups')
      .insert([setupData])
      .select('id')
      .single();
      
    if (dbError) {
      console.error("Error saving setup to db", dbError);
      throw dbError;
    }
    
    console.log("Analysis saved to cloud with ID: ", docData.id);
    return { id: docData.id, url: downloadURL };
  } catch (error) {
    console.error("Supabase Error uploading screenshot", error);
  }
}
