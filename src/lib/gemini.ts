/* Kallet til Gemini gjennom Firebase AI Logic. Lastes først når noen laster opp en oppskrift. */
import { MAX_PARTS } from "./clean";
import { firebaseApp } from "./firebaseApp";
import { ReadError, buildPrompt, checkFile, parseReading, type Reading } from "./readPattern";

/** Modellen som leser. Byttes her hvis Google pensjonerer den. */
const MODEL = "gemini-3.8-flash";

function toBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new ReadError("failed"));
    reader.readAsDataURL(file);
  });
}

/** Send PDF-en til modellen og få delene tilbake. Kaster ReadError med en melding som kan vises. */
export async function readPatternPdf(file: File, size: string): Promise<Reading> {
  checkFile(file);
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new ReadError("offline");

  const [app, ai, data] = await Promise.all([firebaseApp(), import("firebase/ai"), toBase64(file)]);
  const { Schema } = ai;
  const part = Schema.object({
    properties: {
      name: Schema.string(),
      type: Schema.enumString({ enum: ["inc", "dec", "plain", "measure"] }),
      by: Schema.integer(),
      every: Schema.integer(),
      target: Schema.integer(),
      rows: Schema.integer(),
      cm: Schema.integer(),
      note: Schema.string(),
    },
    optionalProperties: ["by", "every", "target", "rows", "cm", "note"],
  });
  const responseSchema = Schema.object({
    properties: {
      isPattern: Schema.boolean(),
      name: Schema.string(),
      sizes: Schema.array({ items: Schema.string() }),
      size: Schema.string(),
      castOn: Schema.integer(),
      parts: Schema.array({ items: part, maxItems: MAX_PARTS }),
      warnings: Schema.array({ items: Schema.string() }),
    },
  });

  const model = ai.getGenerativeModel(
    ai.getAI(app, { backend: new ai.GoogleAIBackend() }),
    { model: MODEL, generationConfig: { responseMimeType: "application/json", responseSchema } },
    { timeout: 120_000 },
  );

  let answer: string;
  try {
    const result = await model.generateContent([
      buildPrompt(size),
      { type: "inlineData", inlineData: { data, mimeType: "application/pdf" } },
    ]);
    answer = result.response.text();
  } catch (e) {
    const status = e instanceof ai.AIError ? e.customErrorData?.status : undefined;
    if (status === 429 || status === 503) throw new ReadError("busy");
    if (status === 401 || status === 403 || status === 404) throw new ReadError("refused");
    if (status === 413) throw new ReadError("too-big");
    if (typeof navigator !== "undefined" && navigator.onLine === false) throw new ReadError("offline");
    throw new ReadError("failed");
  }
  return parseReading(answer);
}
