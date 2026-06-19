import { createExportSchema, youtubeImportSchema } from "@/features/video-editor/schema";

describe("video editor validation", () => {
  it("accepts a valid YouTube import URL", () => {
    expect(
      youtubeImportSchema.parse({
        url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      }),
    ).toEqual({
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
  });

  it("rejects inverted clip ranges", () => {
    expect(() =>
      createExportSchema.parse({
        videoAssetId: "11111111-1111-1111-1111-111111111111",
        transition: "CUT",
        transitionDuration: 0.6,
        clips: [{ id: "clip-1", startMs: 5000, endMs: 4000 }],
      }),
    ).toThrow();
  });
});
