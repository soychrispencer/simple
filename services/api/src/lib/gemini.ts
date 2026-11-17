const GEMINI_TEXT_MODEL = 'gemini-3.8-flash';

type GeminiGenerateContentResponse = {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

export async function generateGeminiText(
    prompt: string,
    apiKey: string,
    options: { responseSchema?: Record<string, unknown> } = {},
): Promise<string> {
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey,
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                ...(options.responseSchema ? {
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: options.responseSchema,
                    },
                } : {}),
            }),
            signal: AbortSignal.timeout(30_000),
        },
    );

    if (!response.ok) {
        throw new Error(`Gemini request failed with status ${response.status}.`);
    }

    const result = await response.json() as GeminiGenerateContentResponse;
    const text = result.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim() ?? '';
    if (!text) throw new Error('Gemini returned an empty response.');
    return text;
}
