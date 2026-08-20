import type { Area } from "react-easy-crop";

const AVATAR_SIZE = 512;
const AVATAR_QUALITY = 0.85;

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Không thể đọc ảnh đã chọn."));
    image.src = source;
  });
}

export async function createCroppedAvatar(
  imageSource: string,
  crop: Area,
  originalFileName: string,
): Promise<File> {
  const image = await loadImage(imageSource);
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    AVATAR_SIZE,
    AVATAR_SIZE,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", AVATAR_QUALITY),
  );
  if (!blob) throw new Error("Không thể tạo ảnh đại diện.");

  const baseName = originalFileName.replace(/\.[^.]+$/, "") || "avatar";
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
