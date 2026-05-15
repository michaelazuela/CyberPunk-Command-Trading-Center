export type AnalysisRoute = "morning" | "lunch" | "ocr" | "deep_review" | "strategy_insights" | "trade_validation" | "trade_confirmation" | "proof_review";
export type ModelMode = "testing" | "live";
export type AIProviderMode = "gemini_only" | "gemini_openai_validation" | "openai_fallback";
export type WorkflowSpeedMode = "fast" | "balanced" | "audit";

export interface ModelConfig {
  configVersion?: number;
  testingMode: boolean;
  flashFirst: boolean;
  proFallback: boolean;
  providerMode: AIProviderMode;
  workflowSpeedMode: WorkflowSpeedMode;
  morningModel: string;
  lunchModel: string;
  ocrModel: string;
  deepReviewModel: string;
  openaiValidationModel: string;
}

export const FLASH_MODEL = "gemini-3-flash-preview";
export const PRO_MODEL = "gemini-3-pro-preview";
export const OPENAI_VALIDATION_MODEL = "gpt-4o-mini";

export function getDefaultModelConfig(): ModelConfig {
  return {
    configVersion: 2,
    testingMode: true,
    flashFirst: true,
    proFallback: true,
    providerMode: "openai_fallback",
    workflowSpeedMode: "fast",
    morningModel: FLASH_MODEL,
    lunchModel: FLASH_MODEL,
    ocrModel: FLASH_MODEL,
    deepReviewModel: PRO_MODEL,
    openaiValidationModel: OPENAI_VALIDATION_MODEL
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
      const parsed = JSON.parse(data);
      const merged = { ...getDefaultModelConfig(), ...parsed };
      const isLegacyFastGeminiOnly = !parsed.configVersion &&
        merged.workflowSpeedMode === "fast" &&
        merged.providerMode === "gemini_only";

      if (isLegacyFastGeminiOnly) {
        return {
          ...merged,
          configVersion: 2,
          providerMode: "openai_fallback",
        };
      }

      return merged;
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
    case "trade_confirmation":
    case "proof_review":
      return config.deepReviewModel; // Or fallback to PRO_MODEL
    default:
      return FLASH_MODEL;
  }
}

export function formatModelLabel(model: string): string {
  if (model === FLASH_MODEL) return "Flash 3";
  if (model === PRO_MODEL) return "Pro 3";
  if (model === OPENAI_VALIDATION_MODEL) return "OpenAI Validator";
  return model;
}

export function applyWorkflowSpeedMode(config: ModelConfig, workflowSpeedMode: WorkflowSpeedMode): ModelConfig {
  if (workflowSpeedMode === "fast") {
    return {
      ...config,
      workflowSpeedMode,
      testingMode: true,
      flashFirst: true,
      proFallback: false,
      providerMode: "openai_fallback",
      morningModel: FLASH_MODEL,
      lunchModel: FLASH_MODEL,
    };
  }

  if (workflowSpeedMode === "balanced") {
    return {
      ...config,
      workflowSpeedMode,
      testingMode: true,
      flashFirst: true,
      proFallback: true,
      providerMode: "openai_fallback",
      morningModel: FLASH_MODEL,
      lunchModel: FLASH_MODEL,
    };
  }

  return {
    ...config,
    workflowSpeedMode,
    testingMode: false,
    flashFirst: false,
    proFallback: true,
    providerMode: "gemini_openai_validation",
    morningModel: PRO_MODEL,
    lunchModel: PRO_MODEL,
  };
}
