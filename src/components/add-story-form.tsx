import { zodResolver } from "@hookform/resolvers/zod";
import * as Label from "@radix-ui/react-label";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { addStorySchema, type AddStoryFormValues } from "../features/intake/schema";

type AddStoryFormProps = {
  submitting: boolean;
  submitError?: string | null;
  onSubmit: (values: AddStoryFormValues) => Promise<void>;
};

export function AddStoryForm({ submitting, submitError, onSubmit }: AddStoryFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AddStoryFormValues>({
    resolver: zodResolver(addStorySchema),
    defaultValues: {
      title: "",
      details: "",
      name: "",
      email: "",
    },
  });
  const [detailCount, setDetailCount] = useState(0);

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
      <div className="field">
        <Label.Root htmlFor="story-title">Story title</Label.Root>
        <input
          id="story-title"
          className="tree-story-flow__search-input"
          type="text"
          placeholder="Give your story a short title"
          aria-invalid={errors.title ? "true" : "false"}
          {...register("title")}
        />
        {errors.title ? (
          <p className="error" role="alert">
            {errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="field">
        <Label.Root htmlFor="story-details">Description / details</Label.Root>
        <Controller
          name="details"
          control={control}
          render={({ field: { value, onChange } }) => (
            <textarea
              id="story-details"
              className="textarea"
              maxLength={2000}
              aria-invalid={errors.details ? "true" : "false"}
              placeholder="Share your story"
              value={value}
              onChange={(event) => {
                const nextValue = event.currentTarget.value;
                setDetailCount(nextValue.length);
                onChange(nextValue);
              }}
            />
          )}
        />
        <p className="tree-story-flow__counter muted">{detailCount}/2000</p>
        {errors.details ? (
          <p className="error" role="alert">
            {errors.details.message}
          </p>
        ) : null}
      </div>

      <div className="field">
        <Label.Root htmlFor="story-name">Name (optional)</Label.Root>
        <input
          id="story-name"
          className="tree-story-flow__search-input"
          type="text"
          placeholder="Your name"
          aria-invalid={errors.name ? "true" : "false"}
          {...register("name")}
        />
        {errors.name ? (
          <p className="error" role="alert">
            {errors.name.message}
          </p>
        ) : null}
      </div>

      <div className="field">
        <Label.Root htmlFor="story-email">Email (optional)</Label.Root>
        <input
          id="story-email"
          className="tree-story-flow__search-input"
          type="email"
          placeholder="you@example.com"
          aria-invalid={errors.email ? "true" : "false"}
          {...register("email")}
        />
        {errors.email ? (
          <p className="error" role="alert">
            {errors.email.message}
          </p>
        ) : null}
      </div>

      <button type="submit" className="button" disabled={submitting || isSubmitting}>
        {submitting || isSubmitting ? "Submitting story..." : "Add story"}
      </button>
      <p className="muted" role="status" aria-live="polite">
        {submitting || isSubmitting ? "Submitting story to the hosted table..." : ""}
      </p>
      {submitError ? (
        <p className="error" role="alert">
          {submitError}
        </p>
      ) : null}
    </form>
  );
}