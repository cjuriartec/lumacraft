import { DomainError, fail, ok, Result } from "@/shared/domain/result";

import { AIProviderPort } from "../../domain/ports/ai-provider.port";
import { type AITone } from "../../domain/types/ai-tone";

export interface ImproveTextParams {
  text: string;
  tone: AITone;
  provider: AIProviderPort;
}

const TONE_PROMPTS: Record<AITone, string> = {
  tecnico:
    "Mejora el siguiente texto utilizando un lenguaje altamente técnico, preciso y profesional. Utiliza terminología especializada de IT e ingeniería cuando sea apropiado. El resultado debe ser riguroso y exacto.",
  elegante:
    "Mejora el siguiente texto con un estilo sofisticado, fluido y elegante. Utiliza un vocabulario rico y una estructura armoniosa, ideal para una marca de lujo o una comunicación de alto nivel.",
  formal:
    "Mejora el siguiente texto utilizando un tono corporativo, serio y estrictamente profesional. Ideal para comunicaciones oficiales o informes de negocios institucionales.",
  legal:
    "Mejora el siguiente texto utilizando terminología legal rigurosa y formal. Debe sonar como una cláusula o declaración jurídica profesional, siguiendo los estándares del lenguaje de derecho.",
};

export class ImproveTextUseCase {
  public async execute(params: ImproveTextParams): Promise<Result<string, DomainError>> {
    const { text, tone, provider } = params;

    if (!text || text.trim().length === 0) {
      return fail(new DomainError("El texto a mejorar no puede estar vacío", "INVALID_INPUT"));
    }

    const toneInstruction = TONE_PROMPTS[tone];
    if (!toneInstruction) {
      return fail(new DomainError(`Tono no soportado: ${tone}`, "INVALID_INPUT"));
    }

    const prompt = `${toneInstruction}\n\nTEXTO ORIGINAL:\n${text}\n\nREDACTA MEJOR EL TEXTO. IMPORTANTE: Responde ÚNICAMENTE con el texto mejorado en formato de texto plano. NO uses Markdown, NO uses negritas (**), NO uses bloques de código, ni ningún otro formato especial. Solo el texto crudo:`;

    const response = await provider.generate({
      prompt,
      temperature: 0.7,
      maxTokens: 1000,
    });

    if (!response.ok) {
      return fail(response.error);
    }

    // Clean any accidental markdown leftovers
    const improvedText = response.value.text
      .replace(/```[a-z]*\n?/gi, "") // Remove code blocks
      .replace(/```/g, "")
      .replace(/`/g, "") // Remove inline code
      .replace(/\*\*/g, "") // Remove bold
      .replace(/__/g, "") // Remove alternative bold
      .trim();
    if (!improvedText) {
      return fail(new DomainError("La IA devolvió un resultado vacío", "AI_EMPTY_RESPONSE"));
    }

    return ok(improvedText);
  }
}
