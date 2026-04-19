import fs from "node:fs/promises";

import { StatusCodes } from "http-status-codes";

import { AppError } from "shared/errors/app-error";

import { GoogleVisionService, VisionLabel } from "./google-vision.service";
import { compareImageFiles } from "./utils/image-comparison";

type VerifyTaskInput = {
  beforeImage: Express.Multer.File;
  afterImage: Express.Multer.File;
  latitude?: number;
  longitude?: number;
};

type VerificationStatus =
  | "Likely Completed"
  | "Needs Review"
  | "Rejected"
  | "Rejected (Same Image)";

type VerificationResult = {
  similarityScore: number;
  beforeLabels: string[];
  afterLabels: string[];
  confidenceScore: number;
  status: VerificationStatus;
  message?: string;
  analysis: {
    summary: string;
    sameImageRejected: boolean;
    pHashDistance: number;
    pixelDiffPercent: number;
    issueTagsRemoved: string[];
    issueTagsStillVisible: string[];
    beforeLabelAnnotations: VisionLabel[];
    afterLabelAnnotations: VisionLabel[];
    vision: {
      available: boolean;
      provider: string;
      errorMessage?: string | null;
    };
  };
  components: Record<"imageDifference" | "objectRemoval" | "locationMatch", WeightedComponent>;
};

type WeightedComponent = {
  label: string;
  score: number | null;
  weight: number;
  weightedScore: number;
  details: string;
  available: boolean;
};

type IssueGroupDefinition = {
  name: string;
  keywords: string[];
};

const ISSUE_GROUPS: IssueGroupDefinition[] = [
  { name: "Garbage", keywords: ["garbage", "trash", "waste", "litter", "rubbish", "debris", "dumpster", "junk"] },
  { name: "Road Damage", keywords: ["pothole", "road", "asphalt", "crack", "damaged road"] },
  { name: "Waterlogging", keywords: ["flood", "water", "waterlogging", "drainage", "sewage", "stagnant water"] },
  { name: "Streetlight", keywords: ["street light", "streetlight", "lamp", "lighting", "light pole"] },
  { name: "Encroachment", keywords: ["encroachment", "obstruction", "blockage", "barrier"] },
  { name: "Graffiti", keywords: ["graffiti", "vandalism", "poster", "billboard"] },
  { name: "Vegetation", keywords: ["tree", "branch", "bush", "overgrowth", "vegetation"] }
];

const IMAGE_DIFFERENCE_WEIGHT = 30;
const OBJECT_REMOVAL_WEIGHT = 50;
const LOCATION_MATCH_WEIGHT = 20;

export class VerificationService {
  constructor(
    private readonly googleVisionService: GoogleVisionService = new GoogleVisionService()
  ) {}

  async verifyTask(input: VerifyTaskInput): Promise<VerificationResult> {
    this.ensureFilePresent(input.beforeImage, "beforeImage");
    this.ensureFilePresent(input.afterImage, "afterImage");

    if (this.isManualReviewFile(input.beforeImage) || this.isManualReviewFile(input.afterImage)) {
      const fileNames = [input.beforeImage.originalname, input.afterImage.originalname]
        .filter(Boolean)
        .join(", ");

      try {
        return this.buildManualReviewResult(
          "PDF detected - manual verification is required because AI comparison only supports image files.",
          `Manual review required for: ${fileNames}`
        );
      } finally {
        await this.cleanupFiles([input.beforeImage.path, input.afterImage.path]);
      }
    }

    this.ensureImageFile(input.beforeImage, "beforeImage");
    this.ensureImageFile(input.afterImage, "afterImage");

    try {
      const [imageComparison, beforeDetection, afterDetection] = await Promise.all([
        compareImageFiles(input.beforeImage.path, input.afterImage.path),
        this.googleVisionService.detectLabels(input.beforeImage.path),
        this.googleVisionService.detectLabels(input.afterImage.path)
      ]);

      const beforeLabels = beforeDetection.labels.map((label) => label.description);
      const afterLabels = afterDetection.labels.map((label) => label.description);
      const objectRemovalAnalysis = this.buildObjectRemovalAnalysis(
        beforeDetection.labels,
        afterDetection.labels
      );
      const locationAnalysis = this.buildLocationAnalysis(input.latitude, input.longitude);
      const weightedComponents = this.buildWeightedComponents({
        imageDifferenceScore: imageComparison.imageDifferenceScore,
        similarityScore: imageComparison.similarityScore,
        pixelDiffPercent: imageComparison.pixelDiffPercent,
        objectRemovalAnalysis,
        locationAnalysis
      });
      const confidenceScore = this.calculateConfidenceScore(weightedComponents);
      const status = this.resolveStatus(imageComparison.similarityScore, confidenceScore);

      return {
        similarityScore: imageComparison.similarityScore,
        beforeLabels,
        afterLabels,
        confidenceScore,
        status,
        analysis: {
          summary: this.buildSummary({
            status,
            similarityScore: imageComparison.similarityScore,
            objectRemovalAnalysis,
            locationAnalysis,
            visionAvailable: beforeDetection.visionAvailable || afterDetection.visionAvailable
          }),
          sameImageRejected: imageComparison.sameImageRejected,
          pHashDistance: imageComparison.pHashDistance,
          pixelDiffPercent: imageComparison.pixelDiffPercent,
          issueTagsRemoved: objectRemovalAnalysis.issueTagsRemoved,
          issueTagsStillVisible: objectRemovalAnalysis.issueTagsStillVisible,
          beforeLabelAnnotations: beforeDetection.labels,
          afterLabelAnnotations: afterDetection.labels,
          vision: {
            available: beforeDetection.visionAvailable || afterDetection.visionAvailable,
            provider:
              beforeDetection.provider === "google-vision" || afterDetection.provider === "google-vision"
                ? "google-vision"
                : "fallback",
            errorMessage: beforeDetection.errorMessage ?? afterDetection.errorMessage ?? null
          }
        },
        components: weightedComponents
      };
    } finally {
      await this.cleanupFiles([input.beforeImage.path, input.afterImage.path]);
    }
  }

  private ensureFilePresent(
    file: Express.Multer.File | undefined,
    fieldName: string
  ): asserts file is Express.Multer.File {
    if (!file) {
      throw new AppError(`${fieldName} file is required`, StatusCodes.BAD_REQUEST, "FILE_REQUIRED");
    }
  }

  private ensureImageFile(file: Express.Multer.File | undefined, fieldName: string) {
    this.ensureFilePresent(file, fieldName);

    if (!file.mimetype.startsWith("image/")) {
      throw new AppError(
        `${fieldName} must be an image`,
        StatusCodes.BAD_REQUEST,
        "INVALID_IMAGE_FILE"
      );
    }
  }

  private isManualReviewFile(file: Express.Multer.File) {
    return file.mimetype === "application/pdf";
  }

  private buildObjectRemovalAnalysis(beforeLabels: VisionLabel[], afterLabels: VisionLabel[]) {
    const beforeIssueGroups = this.collectIssueGroups(beforeLabels);
    const afterIssueGroups = this.collectIssueGroups(afterLabels);
    const totalIssueWeight = [...beforeIssueGroups.values()].reduce(
      (sum, value) => sum + value.score,
      0
    );
    const removedGroups = [...beforeIssueGroups.entries()]
      .filter(([group]) => !afterIssueGroups.has(group))
      .map(([group]) => group);
    const persistentGroups = [...beforeIssueGroups.entries()]
      .filter(([group]) => afterIssueGroups.has(group))
      .map(([group]) => group);

    if (totalIssueWeight > 0) {
      const removedWeight = removedGroups.reduce(
        (sum, group) => sum + (beforeIssueGroups.get(group)?.score ?? 0),
        0
      );
      const persistentWeight = persistentGroups.reduce(
        (sum, group) => sum + (afterIssueGroups.get(group)?.score ?? 0),
        0
      );
      const removalRatio = removedWeight / totalIssueWeight;
      const persistencePenalty = Math.min(0.45, persistentWeight / totalIssueWeight);
      const objectRemovalScore = this.roundPercentage(
        Math.max(0, (removalRatio - persistencePenalty * 0.5) * 100)
      );

      return {
        score: objectRemovalScore,
        issueTagsRemoved: removedGroups,
        issueTagsStillVisible: persistentGroups,
        details:
          removedGroups.length > 0
            ? `Issue markers removed: ${removedGroups.join(", ")}`
            : "Issue-related objects still appear in the after image"
      };
    }

    const overlapScore = this.calculateLabelOverlap(beforeLabels, afterLabels);
    const objectRemovalScore = this.roundPercentage((1 - overlapScore) * 100);

    return {
      score: objectRemovalScore,
      issueTagsRemoved: [],
      issueTagsStillVisible: [],
      details:
        objectRemovalScore >= 65
          ? "Scene labels changed substantially between before and after images"
          : "Scene labels remain similar and may require manual review"
    };
  }

  private buildLocationAnalysis(latitude?: number, longitude?: number) {
    if (latitude == null || longitude == null) {
      return {
        score: null,
        details: "Location context was not provided for this verification request",
        available: false
      };
    }

    return {
      score: null,
      details:
        "Reference coordinates were supplied, but GPS comparison is unavailable for these uploads",
      available: false
    };
  }

  private buildWeightedComponents(input: {
    imageDifferenceScore: number;
    similarityScore: number;
    pixelDiffPercent: number;
    objectRemovalAnalysis: {
      score: number;
      details: string;
      issueTagsRemoved: string[];
      issueTagsStillVisible: string[];
    };
    locationAnalysis: {
      score: number | null;
      details: string;
      available: boolean;
    };
  }): Record<"imageDifference" | "objectRemoval" | "locationMatch", WeightedComponent> {
    return {
      imageDifference: {
        label: "Visual change",
        score: input.imageDifferenceScore,
        weight: IMAGE_DIFFERENCE_WEIGHT,
        weightedScore: this.roundPercentage(
          (input.imageDifferenceScore / 100) * IMAGE_DIFFERENCE_WEIGHT
        ),
        details: `${input.pixelDiffPercent}% pixel-level change detected with ${input.similarityScore}% visual similarity`,
        available: true
      },
      objectRemoval: {
        label: "Object removal",
        score: input.objectRemovalAnalysis.score,
        weight: OBJECT_REMOVAL_WEIGHT,
        weightedScore: this.roundPercentage(
          (input.objectRemovalAnalysis.score / 100) * OBJECT_REMOVAL_WEIGHT
        ),
        details: input.objectRemovalAnalysis.details,
        available: true
      },
      locationMatch: {
        label: "Location match",
        score: input.locationAnalysis.score,
        weight: LOCATION_MATCH_WEIGHT,
        weightedScore:
          input.locationAnalysis.score == null
            ? 0
            : this.roundPercentage((input.locationAnalysis.score / 100) * LOCATION_MATCH_WEIGHT),
        details: input.locationAnalysis.details,
        available: input.locationAnalysis.available
      }
    };
  }

  private calculateConfidenceScore(
    components: Record<"imageDifference" | "objectRemoval" | "locationMatch", WeightedComponent>
  ) {
    const availableComponents = Object.values(components).filter(
      (component) => component.available !== false
    );
    const totalWeight = availableComponents.reduce((sum, component) => sum + component.weight, 0);
    const weightedScore = availableComponents.reduce(
      (sum, component) => sum + component.weightedScore,
      0
    );

    if (totalWeight === 0) {
      return 0;
    }

    return this.roundPercentage((weightedScore / totalWeight) * 100);
  }

  private resolveStatus(similarityScore: number, confidenceScore: number): VerificationStatus {
    if (similarityScore > 90) {
      return "Rejected (Same Image)";
    }

    if (confidenceScore >= 80) {
      return "Likely Completed";
    }

    if (confidenceScore >= 50) {
      return "Needs Review";
    }

    return "Rejected";
  }

  private buildSummary(input: {
    status: VerificationStatus;
    similarityScore: number;
    objectRemovalAnalysis: {
      issueTagsRemoved: string[];
      issueTagsStillVisible: string[];
    };
    locationAnalysis: {
      available: boolean;
    };
    visionAvailable: boolean;
  }) {
    if (input.status === "Rejected (Same Image)") {
      return `The before and after images appear ${input.similarityScore}% similar, which strongly suggests the same image or an unchanged scene.`;
    }

    if (input.status === "Likely Completed") {
      const removalDetail = input.objectRemovalAnalysis.issueTagsRemoved.length
        ? `Issue markers removed: ${input.objectRemovalAnalysis.issueTagsRemoved.join(", ")}.`
        : "Scene labels changed enough to suggest completion.";

      return `${removalDetail} ${input.visionAvailable ? "Google Vision labels support the completion assessment." : "Vision labels were unavailable, so the score leans more heavily on visual change."}`;
    }

    if (input.status === "Needs Review") {
      const persistentDetail = input.objectRemovalAnalysis.issueTagsStillVisible.length
        ? `Issue markers still visible: ${input.objectRemovalAnalysis.issueTagsStillVisible.join(", ")}.`
        : "The scene changed, but not enough to confirm completion confidently.";

      return `${persistentDetail} Manual review is recommended before approving the task.`;
    }

    return input.locationAnalysis.available
      ? "The issue still appears present, so the task should be rejected or reviewed again on-site."
      : "The issue still appears present, so the submitted proof should be rejected.";
  }

  private collectIssueGroups(labels: VisionLabel[]) {
    const groups = new Map<string, { score: number }>();

    labels.forEach((label) => {
      const normalizedLabel = this.normalizeLabel(label.description);

      ISSUE_GROUPS.forEach((group) => {
        const matchesGroup = group.keywords.some(
          (keyword) =>
            normalizedLabel.includes(keyword) || keyword.includes(normalizedLabel)
        );

        if (!matchesGroup) {
          return;
        }

        const current = groups.get(group.name);
        const nextScore = Math.max(current?.score ?? 0, label.score);
        groups.set(group.name, { score: nextScore });
      });
    });

    return groups;
  }

  private calculateLabelOverlap(beforeLabels: VisionLabel[], afterLabels: VisionLabel[]) {
    const beforeMap = new Map<string, number>();
    const afterMap = new Map<string, number>();

    beforeLabels.forEach((label) => {
      beforeMap.set(this.normalizeLabel(label.description), Math.max(beforeMap.get(this.normalizeLabel(label.description)) ?? 0, label.score));
    });
    afterLabels.forEach((label) => {
      afterMap.set(this.normalizeLabel(label.description), Math.max(afterMap.get(this.normalizeLabel(label.description)) ?? 0, label.score));
    });

    const allKeys = new Set([...beforeMap.keys(), ...afterMap.keys()]);
    let intersection = 0;
    let union = 0;

    allKeys.forEach((key) => {
      const beforeScore = beforeMap.get(key) ?? 0;
      const afterScore = afterMap.get(key) ?? 0;
      intersection += Math.min(beforeScore, afterScore);
      union += Math.max(beforeScore, afterScore);
    });

    if (union === 0) {
      return 0;
    }

    return intersection / union;
  }

  private normalizeLabel(label: string) {
    return label.trim().toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ");
  }

  private roundPercentage(value: number) {
    return Number(Math.max(0, Math.min(100, value)).toFixed(2));
  }

  private buildManualReviewResult(message: string, summary: string): VerificationResult {
    return {
      similarityScore: 0,
      beforeLabels: [],
      afterLabels: [],
      confidenceScore: 50,
      status: "Needs Review",
      message,
      analysis: {
        summary,
        sameImageRejected: false,
        pHashDistance: 0,
        pixelDiffPercent: 0,
        issueTagsRemoved: [],
        issueTagsStillVisible: [],
        beforeLabelAnnotations: [],
        afterLabelAnnotations: [],
        vision: {
          available: false,
          provider: "fallback",
          errorMessage: message
        }
      },
      components: {
        imageDifference: {
          label: "Visual change",
          score: null,
          weight: IMAGE_DIFFERENCE_WEIGHT,
          weightedScore: 0,
          details: message,
          available: false
        },
        objectRemoval: {
          label: "Object removal",
          score: null,
          weight: OBJECT_REMOVAL_WEIGHT,
          weightedScore: 0,
          details: message,
          available: false
        },
        locationMatch: {
          label: "Location match",
          score: null,
          weight: LOCATION_MATCH_WEIGHT,
          weightedScore: 0,
          details: "Location comparison was skipped during manual review fallback",
          available: false
        }
      }
    };
  }

  private async cleanupFiles(filePaths: string[]) {
    await Promise.allSettled(
      filePaths.filter(Boolean).map((filePath) => fs.rm(filePath, { force: true }))
    );
  }
}
