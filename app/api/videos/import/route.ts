import { NextResponse } from "next/server";

import { handleRouteError } from "@/lib/http";
import { toVideoAssetDto } from "@/services/dto-mappers";
import { importYoutubeVideo } from "@/services/video-import-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const video = await importYoutubeVideo(body);
    return NextResponse.json({ video: toVideoAssetDto(video) });
  } catch (error) {
    return handleRouteError(error);
  }
}
