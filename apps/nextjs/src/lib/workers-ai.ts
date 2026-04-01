import { env } from "~/env";

interface WorkersAIResponse {
  result: {
    response: string;
  };
  success: boolean;
  errors: { message: string }[];
}

export async function runVisionModel(
  imageBase64: string,
  prompt: string,
): Promise<string> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        image: imageBase64,
        max_tokens: 1024,
        temperature: 0.1,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Workers AI request failed: ${response.status} ${text}`);
  }

  const data = (await response.json()) as WorkersAIResponse;
  if (!data.success) {
    throw new Error(
      `Workers AI error: ${data.errors.map((e) => e.message).join(", ")}`,
    );
  }

  return data.result.response;
}
