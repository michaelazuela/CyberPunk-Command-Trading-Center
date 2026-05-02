import { supabase, handleSupabaseError, OperationType } from './supabase';
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
    const filename = `${userId}/${timestamp}_${imageType}.jpg`;
    
    // 3. Upload Compressed Image to Supabase Storage
    const file = await dataUrlToBlob(compressedImage);
    const { error: uploadError } = await supabase.storage
      .from('screenshots')
      .upload(filename, file, {
        contentType: 'image/jpeg',
        upsert: false
      });
    
    if (uploadError) throw uploadError;
    
    // 4. Create a time-limited signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('screenshots')
      .createSignedUrl(filename, 60 * 60 * 24 * 7);

    if (signedUrlError) throw signedUrlError;
    const downloadURL = signedUrlData.signedUrl;
    
    // 5. Save metadata to Supabase 'setups' table
    const setupData: Record<string, any> = {
      user_id: userId,
      day_type: analysis.dayType,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence,
      image_url: downloadURL,
      tags: analysis.tags || [],
      suggested_entry: analysis.suggestedEntry || 0,
      suggested_stop: analysis.suggestedStop || 0,
      suggested_target: analysis.suggestedTarget || 0
    };
    
    if (ocrData) {
      setupData.ocr_text = ocrData;
    }
    Object.keys(setupData).forEach(key => setupData[key] === undefined && delete setupData[key]);
    
    const { data, error: insertError } = await supabase
      .from('setups')
      .insert(setupData)
      .select('id')
      .single();

    if (insertError) throw insertError;
    console.log("Analysis saved to cloud with ID: ", data.id);
    return { id: data.id, url: downloadURL };
  } catch (error) {
    handleSupabaseError(error, OperationType.UPLOAD, 'setups/storage');
  }
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return response.blob();
}
