-- CreateEnum
CREATE TYPE "DomainDriftMode" AS ENUM ('PRESET', 'CUSTOM', 'NEVER');

-- CreateEnum
CREATE TYPE "DomainCommitmentRequirement" AS ENUM ('STANDARD', 'PASSIVE_ALIGNMENT');

-- CreateEnum
CREATE TYPE "DomainOrbitSpeed" AS ENUM ('STILL', 'SLOW', 'STANDARD', 'FAST');

-- CreateEnum
CREATE TYPE "DomainVisualIntensity" AS ENUM ('SUBTLE', 'BALANCED', 'INTENSE');

-- CreateEnum
CREATE TYPE "DomainOrbitEccentricity" AS ENUM ('DEFAULT', 'SLIGHTLY_ELLIPTICAL', 'VERY_ELLIPTICAL');

-- AlterTable
ALTER TABLE "Domain" ADD COLUMN     "commitmentRequirement" "DomainCommitmentRequirement" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "driftMode" "DomainDriftMode" NOT NULL DEFAULT 'PRESET',
ADD COLUMN     "driftThresholdHours" INTEGER NOT NULL DEFAULT 72,
ADD COLUMN     "lastDriftWarningActivityAt" TIMESTAMP(3),
ADD COLUMN     "lastDriftWarningSentAt" TIMESTAMP(3),
ADD COLUMN     "lastPassiveAlignmentAt" TIMESTAMP(3),
ADD COLUMN     "orbitEccentricity" "DomainOrbitEccentricity" NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "orbitSpeed" "DomainOrbitSpeed" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "planetSizeScale" DOUBLE PRECISION NOT NULL DEFAULT 1,
ADD COLUMN     "visualIntensity" "DomainVisualIntensity" NOT NULL DEFAULT 'BALANCED';
