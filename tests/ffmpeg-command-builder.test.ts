import { buildTransitionCommandArgs, buildTrimCommandArgs } from "@/services/ffmpeg-command-builder";

describe("ffmpeg command builder", () => {
  it("builds trim arguments for a clip", () => {
    const args = buildTrimCommandArgs("input.mp4", { id: "c1", startMs: 2000, endMs: 7000 }, "clip.mp4");

    expect(args).toContain("input.mp4");
    expect(args).toContain("clip.mp4");
    expect(args).toContain("2");
    expect(args).toContain("7");
  });

  it("builds transition arguments with xfade and acrossfade", () => {
    const args = buildTransitionCommandArgs(
      ["clip-0.mp4", "clip-1.mp4"],
      [
        { id: "c1", startMs: 0, endMs: 4000 },
        { id: "c2", startMs: 5000, endMs: 9000 },
      ],
      "output.mp4",
      "FADE",
      0.6,
    );

    const filter = args[args.indexOf("-filter_complex") + 1];

    expect(filter).toContain("xfade=transition=fade");
    expect(filter).toContain("acrossfade=d=0.6");
    expect(args).toContain("output.mp4");
  });
});
