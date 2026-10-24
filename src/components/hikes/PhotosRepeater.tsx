import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { useFieldArray, useWatch } from "react-hook-form";

import { inputClass } from "@/components/ui/Field";
import type { HikeFormValues } from "@/lib/hikeSchema";

type Props = {
  control: Control<HikeFormValues>;
  register: UseFormRegister<HikeFormValues>;
  errors: FieldErrors<HikeFormValues>;
};

export function PhotosRepeater({ control, register, errors }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: "photos" });
  const photoValues = useWatch({ control, name: "photos" });
  const photoErrors = Array.isArray(errors.photos) ? errors.photos : [];

  return (
    <div className="space-y-3">
      {fields.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Optional — add links to photo albums or images.
        </p>
      ) : null}

      {fields.map((field, index) => {
        const url = photoValues?.[index]?.url ?? "";
        const error = photoErrors[index]?.url?.message;

        return (
          <div key={field.id} className="flex items-start gap-2">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              {url && !error ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.visibility = "hidden";
                  }}
                  onLoad={(event) => {
                    event.currentTarget.style.visibility = "visible";
                  }}
                />
              ) : (
                <span aria-hidden="true">📷</span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <input
                {...register(`photos.${index}.url`)}
                type="url"
                inputMode="url"
                placeholder="https://photos.app.goo.gl/…"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? `photo-${index}-error` : undefined}
                className={inputClass(Boolean(error))}
              />
              {error ? (
                <p
                  id={`photo-${index}-error`}
                  role="alert"
                  className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400"
                >
                  {error}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove photo ${index + 1}`}
              className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-rose-500/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => append({ url: "" })}
        disabled={fields.length >= 10}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:border-emerald-400 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:border-emerald-500 dark:hover:text-emerald-300"
      >
        <span aria-hidden="true">+</span>
        Add photo
      </button>
    </div>
  );
}
