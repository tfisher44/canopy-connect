import { zodResolver } from "@hookform/resolvers/zod";
import * as Label from "@radix-ui/react-label";
import { useForm } from "react-hook-form";
import { useStory } from "../model/StoryContext";
import { intakeSchema, type IntakeFormValues } from "../schema";

export function IntakeForm() {
  const { submitStory, latestStory } = useStory();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<IntakeFormValues>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      story: "",
    },
  });

  const onSubmit = (values: IntakeFormValues) => {
    submitStory(values);
    reset({ story: "" });
  };

  return (
    <section className="panel stack" aria-labelledby="intake-title">
      <h2 id="intake-title">Story Intake</h2>
      <p className="muted">Enter a story now. Map editing integration comes next.</p>
      <form className="stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="field">
          <Label.Root htmlFor="story">Story</Label.Root>
          <textarea
            id="story"
            className="textarea"
            aria-invalid={errors.story ? "true" : "false"}
            {...register("story")}
          />
          {errors.story ? (
            <p className="error" role="alert">
              {errors.story.message}
            </p>
          ) : null}
        </div>
        <button type="submit" className="button" disabled={isSubmitting}>
          Save story locally
        </button>
      </form>
      {latestStory ? <p className="muted">Latest story saved to local app state.</p> : null}
    </section>
  );
}
