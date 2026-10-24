import type { FieldValues, Resolver } from "react-hook-form";
import type { ZodType } from "zod";

/**
 * Minimal Zod resolver so react-hook-form can consume Zod issues without the
 * extra @hookform/resolvers dependency.
 */
export function zodResolver<T extends FieldValues>(
  schema: ZodType<T>
): Resolver<T> {
  return async (values) => {
    const result = schema.safeParse(values);

    if (result.success) {
      return { values: result.data, errors: {} };
    }

    const errors: Record<string, unknown> = {};

    for (const issue of result.error.issues) {
      const path = issue.path.length > 0 ? issue.path : ["root"];
      let cursor = errors;

      for (let index = 0; index < path.length - 1; index += 1) {
        const key = String(path[index]);
        const existing = cursor[key];

        if (existing === undefined || typeof existing !== "object") {
          cursor[key] = typeof path[index + 1] === "number" ? [] : {};
        }

        cursor = cursor[key] as Record<string, unknown>;
      }

      const last = String(path[path.length - 1]);

      if (cursor[last] === undefined) {
        cursor[last] = { type: issue.code, message: issue.message };
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { values: {} as T, errors: errors as any };
  };
}
