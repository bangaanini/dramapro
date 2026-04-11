export type VipLockConfig = {
  isEnabled: boolean;
  lockFromEpisode: number;
} | null;

export function isVipActive(vipExpiresAt: Date | null | undefined) {
  return Boolean(vipExpiresAt && vipExpiresAt.getTime() > Date.now());
}

export function getVipLockStartEpisode(config: VipLockConfig) {
  if (!config?.isEnabled) {
    return null;
  }

  return config.lockFromEpisode > 0 ? config.lockFromEpisode : null;
}

export function isEpisodeVipLocked(
  episodeIndex: number,
  lockFromEpisode: number | null,
) {
  return Boolean(lockFromEpisode && episodeIndex >= lockFromEpisode);
}

export function getLastUnlockedEpisode(
  episodeCount: number,
  lockFromEpisode: number | null,
) {
  if (!lockFromEpisode) {
    return Math.max(episodeCount, 0);
  }

  return Math.max(0, Math.min(episodeCount, lockFromEpisode - 1));
}

export function clampEpisodeForVipAccess(
  requestedEpisode: number,
  episodeCount: number,
  lockFromEpisode: number | null,
) {
  const lastUnlockedEpisode = getLastUnlockedEpisode(
    episodeCount,
    lockFromEpisode,
  );

  if (lastUnlockedEpisode < 1) {
    return 1;
  }

  return Math.min(Math.max(1, requestedEpisode), lastUnlockedEpisode);
}
