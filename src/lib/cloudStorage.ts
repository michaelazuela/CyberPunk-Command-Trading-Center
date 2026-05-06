import { supabase } from './supabase';
import { AnalysisResult, ScreenshotRole, AnalysisType } from '../types';

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

export async function uploadScreenshot(
  userId: string,
  tradeDate: string,
  analysisType: AnalysisType,
  screenshotRole: ScreenshotRole,
  base64Image: string
): Promise<{ storagePath: string; url: string; screenshotRole: ScreenshotRole; timeframe: "5m" | "15m" }> {
  try {
    const compressedImage = await compressImage(base64Image);
    const timestamp = new Date().getTime();
    
    const filename = `${userId}/${tradeDate}/${analysisType}/${screenshotRole}/${timestamp}.jpg`;
    
    const blob = dataURLtoBlob(compressedImage);

    const { error: uploadError } = await supabase.storage
      .from('analysis-screenshots')
      .upload(filename, blob, {
        contentType: 'image/jpeg'
      });
      
    if (uploadError) {
      console.error("Storage upload error", uploadError);
      throw uploadError;
    }
    
    const { data: signedURLData, error: signError } = await supabase.storage
      .from('analysis-screenshots')
      .createSignedUrl(filename, 60 * 60);
      
    if (signError || !signedURLData) {
      console.error("Error creating signed URL for analysis", signError);
      throw signError;
    }
    
    const timeframe = screenshotRole === '15m_eth_context' ? '15m' : '5m';

    return {
      storagePath: filename,
      url: signedURLData.signedUrl,
      screenshotRole,
      timeframe
    };
  } catch (error) {
    console.error("Supabase Error uploading screenshot", error);
    throw error;
  }
}

// Deprecated in favor of the workflow that uses uploadScreenshot first then saves setup later
export async function uploadScreenshotAndSaveSetup(
  userId: string,
  base64Image: string,
  analysis: AnalysisResult,
  imageType: 'morning' | 'lunch',
  ocrData?: any
) {
  // Existing logic for backwards compat...
  // Just return the standard one
  const dateStr = new Date().toISOString().split('T')[0];
  const { url, storagePath } = await uploadScreenshot(userId, dateStr, imageType, '5m_execution', base64Image);
  
  // Create setup record 
  const setupData: Record<string, any> = {
    userId,
    dayType: analysis.dayType,
    reasoning: analysis.reasoning,
    confidence: analysis.confidence,
    imageURL: storagePath,
    tags: analysis.tags || [],
    suggestedEntry: analysis.suggestedEntry || 0,
    suggestedStop: analysis.suggestedStop || 0,
    suggestedTarget: analysis.suggestedTarget || 0,
  };
  
  const { data: docData, error: dbError } = await supabase
    .from('setups')
    .insert([setupData])
    .select('id')
    .single();
    
  if (dbError) throw dbError;
  return { id: docData.id, url };
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

export async function uploadTradeProof(userId: string, dataUrl: string, tradeId: string, tradeDate: string): Promise<string> {
  const timestamp = new Date().getTime();
  const filename = `${userId}/${tradeDate}/${tradeId}/${timestamp}.jpg`;
  
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
