import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getListingImageUrls } from "./listing-images.ts";

test("uses resolved API image URLs and falls back when none are available", () => {
  assert.deepEqual(
    getListingImageUrls(
      [
        { id: "image-1", storageId: "storage-1", sortOrder: 1, cover: false },
        { id: "image-2", storageId: "storage-2", sortOrder: 2, cover: true },
      ],
      { "storage-1": "https://cdn.test/one.jpg", "storage-2": "https://cdn.test/two.jpg" },
      "/area/hcm-1.jpg",
    ),
    ["https://cdn.test/one.jpg", "https://cdn.test/two.jpg"],
  );

  assert.deepEqual(
    getListingImageUrls(
      [{ id: "image-1", storageId: "storage-1", sortOrder: 1, cover: true }],
      {},
      "/area/hcm-1.jpg",
    ),
    ["/area/hcm-1.jpg"],
  );
});
