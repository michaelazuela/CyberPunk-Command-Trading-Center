export type AnalysisRoute = "morning" | "lunch" | "ocr" | "deep_review" | "strategy_insights" | "trade_validation";
export type ModelMode = "testing" | "live";

export interface ModelConfig {
  testingMode: boolean;
  flashFirst: boolean;
  proFallback: boolean;
  morningModel: string;
  lunchModel: string;
  ocrModel: string;
  deepReviewModel: string;
}

export const FLASH_MODEL = "gemini-3-flash-preview";
export const PRO_MODEL = "gemini-3-pro-preview";

export function getDefaultModelConfig(): ModelConfig {
  return {
    testingMode: true,
    flashFirst: true,
    proFallback: true,
    morningModel: FLASH_MODEL,
    lunchModel: FLASH_MODEL,
    ocrModel: FLASH_MODEL,
    deepReviewModel: PRO_MODEL
  };
}

export function saveModelConfig(config: ModelConfig) {
  try {
    localStorage.setItem("mnq_model_config", JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save model config", e);
  }
}

export function loadModelConfig(): ModelConfig {
  try {
    const data = localStorage.getItem("mnq_model_config");
    if (data) {
      return { ...getDefaultModelConfig(), ...JSON.parse(data) };
    }
  } catch (e) {
    console.error("Failed to load model config", e);
  }
  return getDefaultModelConfig();
}

export function getModelForRoute(route: AnalysisRoute, config: ModelConfig): string {
  switch (route) {
    case "ocr":
      return config.ocrModel; // Typically FLASH_MODEL
    case "morning":
      return config.testingMode ? FLASH_MODEL : config.morningModel;
    case "lunch":
      return config.testingMode ? FLASH_MODEL : config.lunchModel;
    case "deep_review":
      return config.deepReviewModel; // Typically PRO_MODEL
    case "strategy_insights":
      return PRO_MODEL;
    case "trade_validation":
      return PRO_MODEL;
    default:
      return FLASH_MODEL;
  }
}

export function formatModelLabel(model: string): string {
  if (model === FLASH_MODEL) return "Flash 3";
  if (model === PRO_MODEL) return "Pro 3";
  return model;
}
