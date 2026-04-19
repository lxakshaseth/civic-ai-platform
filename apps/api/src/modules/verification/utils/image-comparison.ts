import { Jimp, compareHashes, diff } from "jimp";

const COMPARISON_SIZE = 256;
const SAME_IMAGE_SIMILARITY_THRESHOLD = 90;

export type ImageComparisonMetrics = {
  similarityScore: number;
  imageDifferenceScore: number;
  pixelDiffPercent: number;
  pHashDistance: number;
  sameImageRejected: boolean;
};

export async function compareImageFiles(
  beforeImagePath: string,
  afterImagePath: string
): Promise<ImageComparisonMetrics> {
  const [beforeImage, afterImage] = await Promise.all([
    readComparableImage(beforeImagePath),
    readComparableImage(afterImagePath)
  ]);

  const beforeHash = beforeImage.pHash();
  const afterHash = afterImage.pHash();
  const pHashDistance = compareHashes(beforeHash, afterHash);
  const similarityScore = clampPercentage((1 - pHashDistance) * 100);
  const diffResult = diff(beforeImage, afterImage, 0.12);
  const pixelDiffPercent = clampPercentage(diffResult.percent * 100);
  const imageDifferenceScore = clampPercentage(
    diffResult.percent * 70 + (100 - similarityScore) * 0.5
  );

  return {
    similarityScore,
    imageDifferenceScore,
    pixelDiffPercent,
    pHashDistance: round(pHashDistance, 4),
    sameImageRejected: similarityScore > SAME_IMAGE_SIMILARITY_THRESHOLD
  };
}

async function readComparableImage(imagePath: string) {
  const image = await Jimp.read(imagePath);

  return image.cover({ w: COMPARISON_SIZE, h: COMPARISON_SIZE }).greyscale();
}

function clampPercentage(value: number) {
  return round(Math.max(0, Math.min(100, value)), 2);
}

function round(value: number, precision: number) {
  return Number(value.toFixed(precision));
}
