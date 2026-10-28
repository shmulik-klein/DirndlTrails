import { z } from "zod";

export const difficultySchema = z.enum(["easy", "moderate", "hard"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const weatherSchema = z.enum([
  "sunny",
  "partly-cloudy",
  "cloudy",
  "fog",
  "drizzle",
  "rain",
  "snow",
  "storm",
]);
export type Weather = z.infer<typeof weatherSchema>;

export const hikeStatusSchema = z.enum(["done", "planned"]);
export type HikeStatus = z.infer<typeof hikeStatusSchema>;

export type Position = [number, number];

const positionSchema = z.tuple([
  z
    .number({ error: "Enter a valid latitude" })
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  z
    .number({ error: "Enter a valid longitude" })
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
]) as unknown as z.ZodType<Position>;

export const hikeInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Keep the name under 100 characters"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date")
    .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00`).getTime()), {
      message: "Pick a valid date",
    }),
  difficulty: difficultySchema,
  status: hikeStatusSchema.default("done"),
  weather: weatherSchema.optional(),
  description: z
    .string()
    .trim()
    .max(2000, "Keep the description under 2000 characters")
    .optional(),
  distanceKm: z
    .number({ error: "Enter a number" })
    .positive("Distance must be greater than 0")
    .max(1000, "That distance seems too large")
    .optional(),
  elevationGainM: z
    .number({ error: "Enter a number" })
    .int("Use whole metres")
    .nonnegative("Elevation cannot be negative")
    .max(10000, "That elevation seems too large")
    .optional(),
  durationMin: z
    .number({ error: "Enter a number" })
    .int("Use whole minutes")
    .positive("Duration must be greater than 0")
    .max(10000, "That duration seems too large")
    .optional(),
  position: positionSchema,
  photos: z
    .array(z.string().trim().url("Enter a valid URL"))
    .max(10, "Add up to 10 photos")
    .default([]),
});

export type HikeInput = z.infer<typeof hikeInputSchema>;

export const hikeSchema = hikeInputSchema.extend({
  id: z.string().min(1),
});

export type Hike = z.infer<typeof hikeSchema>;

export const hikeFormSchema = hikeInputSchema.extend({
  photos: z
    .array(
      z.object({
        url: z.string().trim().min(1, "Add a URL").url("Enter a valid URL"),
      })
    )
    .max(10, "Add up to 10 photos"),
});

export type HikeFormValues = z.infer<typeof hikeFormSchema>;
