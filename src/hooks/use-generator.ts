import { useMutation } from "@tanstack/react-query";
import { api } from "@/shared/routes";
import { type GenerateLinkRequest, type GenerateLinkResponse } from "@/shared/schema";
import { trackEvent } from "@/lib/gtm";

export function useGenerateLink() {
  return useMutation({
    mutationFn: async (data: GenerateLinkRequest) => {
      // Client-side validation using the schema
      const validated = api.generate.input.parse(data);

      const res = await fetch(api.generate.path, {
        method: api.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errorData = await res.json();
          // Try to parse as the response schema first
          try {
            const parsedError = api.generate.responses[400].parse(errorData);
            throw new Error(parsedError.error || "Validation failed");
          } catch {
             throw new Error("Failed to generate link");
          }
        }
        throw new Error("Server error");
      }

      return api.generate.responses[200].parse(await res.json());
    },
    onSuccess: (data, variables) => {
      if (data.ok) {
        trackEvent("generate_link", { 
          platform: variables.platform, 
          mode: variables.extra?.mode || 'default',
          input_type: variables.input.startsWith('http') ? 'url' : 'text'
        });
      }
    },
    onError: (error, variables) => {
      trackEvent("generate_error", { 
        platform: variables.platform, 
        reason: error.message 
      });
    }
  });
}
