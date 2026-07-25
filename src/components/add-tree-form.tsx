import { zodResolver } from "@hookform/resolvers/zod";
import * as Label from "@radix-ui/react-label";
import { Controller, useForm } from "react-hook-form";
import { addTreeSchema, type AddTreeFormValues } from "../features/intake/schema";

type AddTreeFormProps = {
  locationLabel: string;
  submitting: boolean;
  onSubmit: (values: AddTreeFormValues) => Promise<void>;
};

export function AddTreeForm({ locationLabel, submitting, onSubmit }: AddTreeFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddTreeFormValues>({
    resolver: zodResolver(addTreeSchema),
    defaultValues: {
      isAlive: true,
    },
  });

  const submitHandler = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <form
      className="stack tree-story-flow__form"
      onSubmit={(event) => {
        void submitHandler(event);
      }}
      noValidate
    >
      <div className="tree-story-flow__location-chip">
        <span className="muted">Tree location</span>
        <strong>{locationLabel}</strong>
      </div>

      <div className="field">
        <Label.Root htmlFor="tree-image">Tree image</Label.Root>
        <Controller
          name="imageFile"
          control={control}
          render={({ field: { onChange, value } }) => {
            const selectedFileName = value instanceof File ? value.name : "No image selected";
            return (
              <div className="tree-story-flow__file-picker">
                <input
                  id="tree-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="tree-story-flow__file-input"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.item(0);
                    onChange(file ?? undefined);
                  }}
                  aria-invalid={errors.imageFile ? "true" : "false"}
                />
                <label htmlFor="tree-image" className="button button--ghost tree-story-flow__file-button">
                  Choose image
                </label>
                <p className="tree-story-flow__file-name" aria-live="polite">
                  {selectedFileName}
                </p>
              </div>
            );
          }}
        />
        {errors.imageFile ? (
          <p className="error" role="alert">
            {errors.imageFile.message}
          </p>
        ) : null}
        <p className="muted">Optional. Accepted formats: JPG, PNG, WEBP (max 10MB).</p>
      </div>

      <div className="field">
        <Label.Root>Tree status</Label.Root>
        <Controller
          name="isAlive"
          control={control}
          render={({ field: { value, onChange } }) => (
            <label className="tree-story-flow__status-toggle">
              <input
                type="checkbox"
                checked={value}
                onChange={(event) => onChange(event.currentTarget.checked)}
                aria-label="Tree status toggle"
              />
              <span className="tree-story-flow__status-track" aria-hidden="true">
                <span className="tree-story-flow__status-thumb" />
              </span>
              <span className="tree-story-flow__status-label">{value ? "Alive" : "Dead"}</span>
            </label>
          )}
        />
      </div>

      <button type="submit" className="button" disabled={submitting || isSubmitting}>
        Add tree
      </button>
    </form>
  );
}