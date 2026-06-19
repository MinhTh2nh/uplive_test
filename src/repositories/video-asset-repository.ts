import { getPrisma } from "@/lib/prisma";

export const videoAssetRepository = {
  create(data: {
    sourceUrl: string;
    title: string;
    durationSeconds: number;
    sourceVideoId?: string | null;
    localPath: string;
    thumbnailUrl?: string | null;
  }) {
    return getPrisma().videoAsset.create({ data });
  },

  findById(id: string) {
    return getPrisma().videoAsset.findUnique({ where: { id } });
  },
};
