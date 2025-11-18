/**
 * Calculates the Intersection over Union (IoU) of two bounding boxes.
 * IoU is a measure of the extent of overlap between two boxes.
 *
 * @param boxA - The first bounding box, with { x, y, width, height }.
 * @param boxB - The second bounding box, with { x, y, width, height }.
 * @returns The IoU value, a float between 0.0 and 1.0.
 */
export const calculateIoU = (
  boxA: { x: number; y: number; width: number; height: number },
  boxB: { x: number; y: number; width: number; height: number }
): number => {
  // Determine the coordinates of the intersection rectangle
  const xA = Math.max(boxA.x, boxB.x);
  const yA = Math.max(boxA.y, boxB.y);
  const xB = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
  const yB = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

  // Compute the area of intersection
  const intersectionArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);

  if (intersectionArea === 0) {
    return 0;
  }

  // Compute the area of both bounding boxes
  const boxAArea = boxA.width * boxA.height;
  const boxBArea = boxB.width * boxB.height;

  // Compute the area of the union
  const unionArea = boxAArea + boxBArea - intersectionArea;

  // Compute the Intersection over Union
  const iou = intersectionArea / unionArea;

  return iou;
};
