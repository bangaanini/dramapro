import { NextRequest, NextResponse } from "next/server";

import {
  assertPartnerDownloadAvailable,
  consumePartnerDownloadQuota,
  getPartnerDownloadBotForOwner,
  PartnerDownloadError,
} from "@/lib/partner-downloads";
import { signPromoDownloadUrl } from "@/lib/promo-download-links";
import { getPromoDownloadSubtitleInfo } from "@/lib/promo-download-rendering";
import { resolveDramaStreamSources, toStreamErrorResponse } from "@/lib/stream-access";
import { getCurrentUser } from "@/lib/user-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseEpisodeIndex(value: string | null) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function buildPartnerRenderUrl(input: {
  episodeIndex: number;
  internalDramaId: string;
  partnerBotId: string;
  partnerUserId: string;
  qualityIndex: number;
  qualityKind: "mp4" | "hls";
}) {
  const searchParams = new URLSearchParams({
    internalDramaId: input.internalDramaId,
    episodeIndex: String(input.episodeIndex),
    qualityKind: input.qualityKind,
    qualityIndex: String(input.qualityIndex),
    partnerBotId: input.partnerBotId,
    partnerUserId: input.partnerUserId,
  });

  return signPromoDownloadUrl(
    `/api/partner/promo-download/render?${searchParams.toString()}`,
  );
}

function buildMessage({
  hasMp4,
  hasHls,
  hasSubtitle,
}: {
  hasMp4: boolean;
  hasHls: boolean;
  hasSubtitle: boolean;
}) {
  if (!hasMp4 && !hasHls) {
    return "Episode ini belum menyediakan source yang bisa diunduh.";
  }

  const subtitleMessage = hasSubtitle
    ? "Subtitle Indonesia akan dibakar permanen ke file MP4."
    : "Subtitle Indonesia tidak tersedia; video tetap bisa diunduh tanpa subtitle.";

  if (hasMp4) {
    return hasSubtitle
      ? `MP4 tersedia. Server akan menjalankan FFmpeg untuk burn-in subtitle. ${subtitleMessage}`
      : `MP4 tersedia. Server akan menjalankan FFmpeg untuk menormalkan audio agar kompatibel. ${subtitleMessage}`;
  }

  return `Episode ini memakai HLS. Server akan menjalankan FFmpeg untuk menyatukan .m3u8 menjadi MP4 dan menormalkan audio. ${subtitleMessage}`;
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botUsername = request.nextUrl.searchParams.get("botUsername") ?? "";
  const internalDramaId = request.nextUrl.searchParams.get("internalDramaId");
  const episodeIndex = parseEpisodeIndex(
    request.nextUrl.searchParams.get("episodeIndex"),
  );

  if (!botUsername || !internalDramaId || !episodeIndex) {
    return NextResponse.json(
      {
        error:
          "Query params `botUsername`, `internalDramaId`, dan `episodeIndex` wajib diisi.",
      },
      { status: 400 },
    );
  }

  const partnerBot = await getPartnerDownloadBotForOwner({
    botUsername,
    ownerUserId: user.id,
  });

  if (!partnerBot) {
    return NextResponse.json(
      { error: "Bot partner tidak ditemukan untuk akun ini." },
      { status: 404 },
    );
  }

  try {
    await assertPartnerDownloadAvailable({
      bot: partnerBot,
      userId: user.id,
    });

    const resolved = await resolveDramaStreamSources({
      internalDramaId,
      episodeIndex,
      bypassVipLock: true,
    });

    const mp4Qualities = resolved.stream.qualities.filter(
      (quality) => quality.mimeType === "video/mp4",
    );
    const hlsQualities = resolved.stream.qualities.filter(
      (quality) => quality.mimeType === "application/x-mpegURL",
    );
    const bestMp4 = mp4Qualities[0] ?? null;
    const bestHls = hlsQualities[0] ?? null;
    const subtitle = getPromoDownloadSubtitleInfo(resolved.stream.subtitles);
    const shouldBurnSubtitle = subtitle.status === "available";

    if (!bestMp4 && !bestHls) {
      return NextResponse.json(
        { error: "Episode ini belum menyediakan source yang bisa diunduh." },
        { status: 404 },
      );
    }

    const quota = await consumePartnerDownloadQuota({
      bot: partnerBot,
      episodeIndex,
      seriesId: resolved.drama.id,
      userId: user.id,
    });

    return NextResponse.json({
      dramaId: resolved.drama.id,
      title: resolved.drama.title,
      provider: resolved.drama.platformId,
      episodeIndex,
      sourceType: bestMp4 ? "mp4" : "hls",
      downloadable: Boolean(bestMp4 || bestHls),
      quota,
      subtitle,
      message: buildMessage({
        hasMp4: Boolean(bestMp4),
        hasHls: Boolean(bestHls),
        hasSubtitle: shouldBurnSubtitle,
      }),
      bestDownload: bestMp4
        ? {
            label: shouldBurnSubtitle
              ? `${bestMp4.label} + subtitle burn-in`
              : bestMp4.label,
            mimeType: bestMp4.mimeType,
            sourceUrl: bestMp4.url,
            downloadUrl: buildPartnerRenderUrl({
              internalDramaId,
              episodeIndex,
              qualityKind: "mp4",
              qualityIndex: 0,
              partnerBotId: partnerBot.id,
              partnerUserId: user.id,
            }),
          }
        : bestHls
          ? {
              label: shouldBurnSubtitle
                ? `${bestHls.label} HLS -> MP4 + subtitle burn-in`
                : `${bestHls.label} HLS -> MP4`,
              mimeType: bestHls.mimeType,
              sourceUrl: bestHls.url,
              downloadUrl: buildPartnerRenderUrl({
                internalDramaId,
                episodeIndex,
                qualityKind: "hls",
                qualityIndex: 0,
                partnerBotId: partnerBot.id,
                partnerUserId: user.id,
              }),
            }
          : null,
      mp4Qualities: mp4Qualities.map((quality, index) => ({
        label: shouldBurnSubtitle
          ? `${quality.label} + subtitle burn-in`
          : quality.label,
        mimeType: quality.mimeType,
        sourceUrl: quality.url,
        downloadUrl: buildPartnerRenderUrl({
          internalDramaId,
          episodeIndex,
          qualityKind: "mp4",
          qualityIndex: index,
          partnerBotId: partnerBot.id,
          partnerUserId: user.id,
        }),
      })),
      hlsQualities: hlsQualities.map((quality, index) => ({
        label: shouldBurnSubtitle
          ? `${quality.label} HLS -> MP4 + subtitle burn-in`
          : `${quality.label} HLS -> MP4`,
        mimeType: quality.mimeType,
        sourceUrl: quality.url,
        downloadUrl: buildPartnerRenderUrl({
          internalDramaId,
          episodeIndex,
          qualityKind: "hls",
          qualityIndex: index,
          partnerBotId: partnerBot.id,
          partnerUserId: user.id,
        }),
      })),
    });
  } catch (error) {
    if (error instanceof PartnerDownloadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const resolvedError = toStreamErrorResponse(error);
    return NextResponse.json(resolvedError.body, { status: resolvedError.status });
  }
}
