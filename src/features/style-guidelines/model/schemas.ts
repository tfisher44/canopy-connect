import { z } from "zod";

export const styleGuidelineCheckResultSchema = z.object({
  checkId: z.string().min(1),
  checkName: z.string().min(1),
  checkDescription: z.string().min(1),
  passedAt: z.iso.datetime(),
  reviewedBy: z.string().min(1),
});

export const componentRecordSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    intendedUse: z.string().min(1),
    category: z.string().min(1).optional(),
    complianceStatus: z.enum(["compliant", "non_compliant", "unreviewed"]),
    lastReviewDate: z.iso.datetime(),
    reviewCadenceDays: z.number().int().positive(),
    checksPassed: z.array(styleGuidelineCheckResultSchema),
  })
  .superRefine((record, context) => {
    if (record.complianceStatus === "compliant" && record.checksPassed.length === 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Compliant components must include at least one passed guideline check.",
        path: ["checksPassed"],
      });
    }
  });

export const componentRecordListSchema = z.array(componentRecordSchema);

