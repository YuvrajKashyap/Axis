import {
  type DomainCommitmentRequirementValue,
  type DomainDriftModeValue,
  getEffectiveDriftThresholdHours,
  getEffectiveDriftThresholdMs,
} from "@/lib/domain-settings";

type DriftComputationInput = {
  status: "ALIGNED" | "NEUTRAL" | "DRIFTING" | "ARCHIVED";
  driftMode: DomainDriftModeValue;
  driftThresholdHours: number;
  commitmentRequirement: DomainCommitmentRequirementValue;
  lastCommitmentAt: Date | null;
  lastPassiveAlignmentAt: Date | null;
  disableAutoDrift?: boolean;
  nowMs?: number;
};

export function getLastRelevantActivityAt(input: {
  commitmentRequirement: DomainCommitmentRequirementValue;
  lastCommitmentAt: Date | null;
  lastPassiveAlignmentAt: Date | null;
}): Date | null {
  if (input.commitmentRequirement !== "PASSIVE_ALIGNMENT") {
    return input.lastCommitmentAt;
  }

  if (!input.lastCommitmentAt) return input.lastPassiveAlignmentAt;
  if (!input.lastPassiveAlignmentAt) return input.lastCommitmentAt;

  return input.lastPassiveAlignmentAt > input.lastCommitmentAt
    ? input.lastPassiveAlignmentAt
    : input.lastCommitmentAt;
}

export function computeDriftState(input: DriftComputationInput) {
  const disableAutoDrift = input.disableAutoDrift ?? false;
  const nowMs = input.nowMs ?? Date.now();
  const lastRelevantActivityAt = getLastRelevantActivityAt(input);
  const driftThresholdHours = getEffectiveDriftThresholdHours({
    driftMode: input.driftMode,
    driftThresholdHours: input.driftThresholdHours,
  });
  const driftThresholdMs = getEffectiveDriftThresholdMs({
    driftMode: input.driftMode,
    driftThresholdHours: input.driftThresholdHours,
  });
  const nextDriftAt =
    driftThresholdMs === null || lastRelevantActivityAt === null
      ? null
      : new Date(lastRelevantActivityAt.getTime() + driftThresholdMs);
  const isStale =
    driftThresholdMs === null
      ? false
      : !lastRelevantActivityAt ||
        nowMs - lastRelevantActivityAt.getTime() > driftThresholdMs;

  const autoDrifted =
    !disableAutoDrift &&
    input.status !== "DRIFTING" &&
    input.status !== "ARCHIVED" &&
    isStale;

  const effectiveStatus = autoDrifted ? "DRIFTING" : input.status;

  return {
    driftThresholdHours,
    driftThresholdMs,
    lastRelevantActivityAt,
    nextDriftAt,
    isStale,
    autoDrifted,
    effectiveStatus,
  };
}
