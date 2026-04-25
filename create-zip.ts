import fs from 'fs';
import JSZip from 'jszip';
import path from 'path';

async function main() {
  const geminiCode = fs.readFileSync(path.join(process.cwd(), 'src/lib/gemini.ts'), 'utf8');

  const extractAgent = (regex: RegExp) => {
    const match = geminiCode.match(regex);
    if (match) return match[1].trim();
    return "Could not extract instructions.";
  };

  const observerRules = extractAgent(/const prompt = \`([\s\S]*?)\`;/);
  const specialistRules = extractAgent(/const systemInstruction = \`([\s\S]*?)\`;/);
  const insightRules = extractAgent(/const systemInstruction = \`([\s\S]*?)\`;\s*const response = await ai.models.generateContent\(\{\s*model: "gemini-3-flash-preview",\s*contents: \`Current Rules:/);
  const validateRules = extractAgent(/export async function validateTrade[\s\S]*?const systemInstruction = \`([\s\S]*?)\`;/);

  const zip = new JSZip();
  zip.file("chart_observer_rules.md", observerRules);
  zip.file("strategy_specialist_rules.md", specialistRules);
  zip.file("quantitative_analyst_rules.md", insightRules);
  zip.file("trade_validator_rules.md", validateRules);

  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir);
  }

  const content = await zip.generateAsync({ type: "nodebuffer" });
  fs.writeFileSync(path.join(publicDir, 'agents_and_rules.zip'), content);
  console.log("Zip generated in public/agents_and_rules.zip");
}

main().catch(console.error);
