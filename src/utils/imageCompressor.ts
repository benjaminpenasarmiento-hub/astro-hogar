export function compressImage(base64Str: string, maxW = 450, maxH = 450, quality = 0.50): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxW || height > maxH) {
        if (width > height) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        } else {
          width = Math.round((width * maxH) / height);
          height = maxH;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const compressed = canvas.toDataURL("image/jpeg", quality);
      resolve(compressed);
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
}

/**
 * Ensures an image is placed on a pure white (#FFFFFF) studio canvas with padding
 * and light edge cleanup for catalog presentation.
 */
export function makeWhiteStudioCatalogImage(base64Str: string, size = 600): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith("data:image")) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        resolve(base64Str);
        return;
      }

      // 1. Fill background with pure studio white #FFFFFF
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);

      // 2. Calculate centered aspect ratio with 12% padding
      const padding = size * 0.12;
      const availableW = size - padding * 2;
      const availableH = size - padding * 2;

      let drawW = img.width;
      let drawH = img.height;

      const scale = Math.min(availableW / drawW, availableH / drawH);
      drawW = drawW * scale;
      drawH = drawH * scale;

      const drawX = (size - drawW) / 2;
      const drawY = (size - drawH) / 2;

      // 3. Add subtle floor shadow
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      ctx.restore();

      // 4. Threshold background whitening pass for light grey/off-white background removal
      try {
        const imgData = ctx.getImageData(0, 0, size, size);
        const data = imgData.data;
        const cornerThreshold = 220; // Whitencorner pixels that are near-white

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // If pixel is very light off-white (e.g. wall/sheet background), snap to pure white
          if (r > cornerThreshold && g > cornerThreshold && b > cornerThreshold) {
            data[i] = 255;
            data[i + 1] = 255;
            data[i + 2] = 255;
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (e) {
        // Ignore CORS or pixel access errors
      }

      resolve(canvas.toDataURL("image/jpeg", 0.90));
    };

    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
}
