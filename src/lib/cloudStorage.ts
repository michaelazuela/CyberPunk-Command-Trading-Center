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
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `${userId}/${dateStr}/${timestamp}_${imageType}.jpg`;
    
    const blob = dataURLtoBlob(compressedImage);

    // 3. Upload Compressed Image to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('analysis-screenshots')
      .upload(filename, blob, {
        contentType: 'image/jpeg'
      });
      
    if (uploadError) {
      console.error("Storage upload error", uploadError);
      throw uploadError;
    }
    
    // 4. Get Signed URL for temporary display
    const { data: signedURLData, error: signError } = await supabase.storage
      .from('analysis-screenshots')
      .createSignedUrl(filename, 60 * 60); // 1 hour expiry
      
    if (signError || !signedURLData) {
      console.error("Error creating signed URL for analysis", signError);
      throw signError;
    }
    
    // 5. Save metadata to Supabase 'setups' table
    const setupData: Record<string, any> = {
      userId,
      dayType: analysis.dayType,
      reasoning: analysis.reasoning,
      confidence: analysis.confidence,
      imageURL: filename, // Store the path, not the expiring signed URL
      tags: analysis.tags || [],
      suggestedEntry: analysis.suggestedEntry || 0,
      suggestedStop: analysis.suggestedStop || 0,
      suggestedTarget: analysis.suggestedTarget || 0,
      
      // Midnight Open Options
      midnight_open_source: analysis.midnightOpenSource,
      midnight_open_override: analysis.midnightOpenOverride,
      midnight_open_price: analysis.midnightOpenPrice,
      midnight_open_visible: analysis.midnightOpenVisible,
      rth_vs_midnight: analysis.rthVsMidnight,
      retrace_probability: analysis.retraceProbability,
      midnight_open_note: analysis.midnightOpenNote,
      is_target_today: analysis.isTargetToday,

      // OCR Timing
      ocr_timestamp_status: analysis.ocrTimestampStatus,
      ocr_timestamp_delta: analysis.ocrTimestampDelta,
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
    return { id: docData.id, url: signedURLData.signedUrl };
  } catch (error) {
    console.error("Supabase Error uploading screenshot", error);
  }
}

export async function getAnalysisScreenshotSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('analysis-screenshots')
    .createSignedUrl(path, 60 * 60);
    
  if (error || !data) {
    console.error("Error creating signed URL for analysis screenshot", error);
    return null;
  }
  return data.signedUrl;
}

export async function uploadTradeProof(userId: string, dataUrl: string, originalFilename: string): Promise<string> {
  const timestamp = new Date().getTime();
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${userId}/${dateStr}/${timestamp}_${originalFilename.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
  
  const blob = dataURLtoBlob(dataUrl);

  const { error: uploadError } = await supabase.storage
    .from('trade-proofs')
    .upload(filename, blob);
    
  if (uploadError) {
    console.error("Trade proof upload error", uploadError);
    throw uploadError;
  }
  
  return filename;
}

export async function getTradeProofSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('trade-proofs')
    .createSignedUrl(path, 60 * 60);
    
  if (error || !data) {
    console.error("Error creating signed URL", error);
    return null;
  }
  return data.signedUrl;
}
