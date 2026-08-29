import { strict as assert } from "node:assert";
import { test } from "node:test";
import { getListingDisplayImages } from "./listing-images.ts";

test("uses listing image URLs directly and falls back when empty", () => {
  assert.deepEqual(
    getListingDisplayImages(
      { imageUrls: ["https://cdn.test/one.jpg", "https://cdn.test/two.jpg"] },
      "/area/hcm-1.jpg",
    ),
    ["https://cdn.test/one.jpg", "https://cdn.test/two.jpg"],
  );

  assert.deepEqual(
    getListingDisplayImages({ imageUrls: [] }, "/area/hcm-1.jpg"),
    ["/area/hcm-1.jpg"],
  );
});
