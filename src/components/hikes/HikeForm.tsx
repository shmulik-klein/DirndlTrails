import dynamic from "next/dynamic";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import {
  Field,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui/Field";
import { WeatherIcon } from "@/components/ui/WeatherIcon";
import { difficultyMeta } from "@/lib/format";
import {
  hikeFormSchema,
  hikeInputSchema,
  type Hike,
  type HikeFormValues,
} from "@/lib/hikeSchema";
import { weatherMeta } from "@/lib/weather";
import { zodResolver } from "@/lib/zodResolver";

import { PhotosRepeater } from "./PhotosRepeater";

const CoordinatePicker = dynamic(() => import("./CoordinatePicker"), {
  ssr: false,
  loading: () => (
    <div className="h-52 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
  ),
});

type Props = {
  onCreated: (hike: Hike) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
};

const DEFAULT_CENTER: [number, number] = [
  48.04872322130709, 11.507710066839964,
];

function todayISO(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function optionalNumber(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

const DEFAULT_VALUES: HikeFormValues = {
  name: "",
  date: todayISO(),
  difficulty: "moderate",
  weather: undefined,
  description: "",
  distanceKm: undefined,
  elevationGainM: undefined,
  durationMin: undefined,
  position: DEFAULT_CENTER,
  photos: [],
};

const WEATHER_OPTIONS = Object.entries(weatherMeta) as [
  keyof typeof weatherMeta,
  (typeof weatherMeta)[keyof typeof weatherMeta],
][];

export function HikeForm({ onCreated, onCancel, onDirtyChange }: Props) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<HikeFormValues>({
    resolver: zodResolver(hikeFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  const description = useWatch({ control, name: "description" }) ?? "";

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  const onSubmit = handleSubmit(async (values) => {
    const payload = hikeInputSchema.safeParse({
      ...values,
      description: values.description?.trim() ? values.description.trim() : undefined,
      photos: values.photos.map((photo) => photo.url.trim()),
    });

    if (!payload.success) {
      setError("root", { message: "Please check the form for errors." });
      return;
    }

    try {
      const response = await fetch("/api/hikes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload.data),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Could not save hike");
      }

      const { hike } = (await response.json()) as { hike: Hike };
      reset(DEFAULT_VALUES);
      onCreated(hike);
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error ? error.message : "Could not save hike",
      });
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 space-y-7 overflow-y-auto px-6 py-5">
        <section className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            Trail details
          </h3>

          <Field
            label="Name"
            htmlFor="hike-name"
            required
            error={errors.name?.message}
          >
            <input
              id="hike-name"
              type="text"
              autoComplete="off"
              placeholder="e.g. Riederstein"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "hike-name-error" : undefined}
              className={inputClass(Boolean(errors.name))}
              {...register("name")}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Date hiked"
              htmlFor="hike-date"
              required
              error={errors.date?.message}
            >
              <input
                id="hike-date"
                type="date"
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? "hike-date-error" : undefined}
                className={inputClass(Boolean(errors.date))}
                {...register("date")}
              />
            </Field>

            <Field label="Difficulty" htmlFor="hike-difficulty">
              <Controller
                control={control}
                name="difficulty"
                render={({ field }) => (
                  <div
                    id="hike-difficulty"
                    role="radiogroup"
                    aria-label="Difficulty"
                    className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
                  >
                    {Object.entries(difficultyMeta).map(([value, meta]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={field.value === value}
                        onClick={() =>
                          field.onChange(value as HikeFormValues["difficulty"])
                        }
                        className={
                          field.value === value
                            ? "rounded-lg bg-white px-1 py-2 text-xs font-semibold text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                            : "rounded-lg px-1 py-2 text-xs font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                        }
                      >
                        {meta.label}
                      </button>
                    ))}
                  </div>
                )}
              />
            </Field>
          </div>

          <Field label="Conditions" htmlFor="hike-weather">
            <Controller
              control={control}
              name="weather"
              render={({ field }) => (
                <div className="space-y-2">
                  <div
                    role="radiogroup"
                    aria-label="Weather conditions"
                    className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
                  >
                    {WEATHER_OPTIONS.map(([value, meta]) => {
                      const isActive = field.value === value;

                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          title={meta.label}
                          onClick={() => field.onChange(isActive ? undefined : value)}
                          className={
                            isActive
                              ? `flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold shadow-sm ${meta.badge}`
                              : "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-medium text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100"
                          }
                        >
                          <WeatherIcon weather={value} className="h-4 w-4" title={false} />
                          <span className="truncate">{meta.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Optional — leave unselected if not recorded.
                  </p>
                </div>
              )}
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field
              label="Distance (km)"
              htmlFor="hike-distance"
              error={errors.distanceKm?.message}
            >
              <input
                id="hike-distance"
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                placeholder="8.5"
                aria-invalid={Boolean(errors.distanceKm)}
                aria-describedby={
                  errors.distanceKm ? "hike-distance-error" : undefined
                }
                className={inputClass(Boolean(errors.distanceKm))}
                {...register("distanceKm", { setValueAs: optionalNumber })}
              />
            </Field>

            <Field
              label="Ascent (m)"
              htmlFor="hike-elevation"
              error={errors.elevationGainM?.message}
            >
              <input
                id="hike-elevation"
                type="number"
                step="1"
                min="0"
                inputMode="numeric"
                placeholder="620"
                aria-invalid={Boolean(errors.elevationGainM)}
                aria-describedby={
                  errors.elevationGainM ? "hike-elevation-error" : undefined
                }
                className={inputClass(Boolean(errors.elevationGainM))}
                {...register("elevationGainM", { setValueAs: optionalNumber })}
              />
            </Field>

            <Field
              label="Duration (min)"
              htmlFor="hike-duration"
              error={errors.durationMin?.message}
            >
              <input
                id="hike-duration"
                type="number"
                step="1"
                min="0"
                inputMode="numeric"
                placeholder="210"
                aria-invalid={Boolean(errors.durationMin)}
                aria-describedby={
                  errors.durationMin ? "hike-duration-error" : undefined
                }
                className={inputClass(Boolean(errors.durationMin))}
                {...register("durationMin", { setValueAs: optionalNumber })}
              />
            </Field>
          </div>

          <Field
            label="Description"
            htmlFor="hike-description"
            error={errors.description?.message}
            hint={`${description.length}/2000 characters`}
          >
            <textarea
              id="hike-description"
              rows={3}
              placeholder="What made this hike memorable?"
              aria-invalid={Boolean(errors.description)}
              aria-describedby={
                errors.description ? "hike-description-error" : undefined
              }
              className={`${inputClass(Boolean(errors.description))} resize-none`}
              {...register("description")}
            />
          </Field>
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            Location
          </h3>

          <Controller
            control={control}
            name="position"
            render={({ field }) => (
              <CoordinatePicker
                value={field.value}
                onChange={(next) => field.onChange(next)}
              />
            )}
          />

          {errors.position ? (
            <p role="alert" className="text-xs font-medium text-rose-600 dark:text-rose-400">
              Pick a valid location on the map.
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
            Photos
          </h3>

          <PhotosRepeater control={control} register={register} errors={errors} />
        </section>
      </div>

      <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-800">
        {errors.root?.message ? (
          <p
            role="alert"
            className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
          >
            {errors.root.message}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className={secondaryButtonClass}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={primaryButtonClass}
          >
            {isSubmitting ? (
              <>
                <span
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                />
                Saving…
              </>
            ) : (
              "Save hike"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
