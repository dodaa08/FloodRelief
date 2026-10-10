-- PostGIS is required by the Unsupported("geography(...)") columns below.
CREATE EXTENSION IF NOT EXISTS postgis;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CITIZEN', 'VOLUNTEER', 'NGO_COORDINATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ResponderType" AS ENUM ('GOVERNMENT', 'NGO', 'COMMUNITY_GROUP', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "FloodStatus" AS ENUM ('NORMAL', 'WATCH', 'WARNING', 'FLOODED');

-- CreateEnum
CREATE TYPE "StatusSource" AS ENUM ('API_READING', 'GROUND_REPORTS', 'MANUAL');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('ACTIVE', 'CLOSED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NeedType" AS ENUM ('FOOD', 'WATER', 'MEDICAL', 'RESCUE', 'SHELTER', 'EVACUATION');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('SUBMITTED', 'NEEDS_CHECK', 'VERIFIED', 'CLAIMED', 'IN_PROGRESS', 'FULFILLED', 'NOT_GENUINE', 'REJECTED');

-- CreateEnum
CREATE TYPE "Channel" AS ENUM ('APP', 'VOLUNTEER_ENTRY', 'HELPLINE', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "VerificationMethod" AS ENUM ('PHONE_CALL', 'FIELD_VISIT', 'OFFICIAL', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationOutcome" AS ENUM ('VERIFIED', 'REJECTED', 'NOT_GENUINE');

-- CreateEnum
CREATE TYPE "ClaimType" AS ENUM ('SELF_CLAIMED', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'FAILED', 'RELEASED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CampType" AS ENUM ('SHELTER', 'MEDICAL', 'FOOD_POINT', 'OTHER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('SMS', 'WHATSAPP', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "authId" UUID,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CITIZEN',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'APPROVED',
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_profiles" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "responderType" "ResponderType" NOT NULL DEFAULT 'INDIVIDUAL',
    "isAvailable" BOOLEAN NOT NULL DEFAULT false,
    "homeDistrictId" UUID,
    "skills" TEXT[],
    "lastLocation" geography(Point,4326),
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "volunteer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ResponderType" NOT NULL DEFAULT 'NGO',
    "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "contactPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_districts" (
    "organizationId" UUID NOT NULL,
    "districtId" UUID NOT NULL,

    CONSTRAINT "organization_districts_pkey" PRIMARY KEY ("organizationId","districtId")
);

-- CreateTable
CREATE TABLE "districts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "boundary" geography(MultiPolygon,4326),
    "centroid" geography(Point,4326),

    CONSTRAINT "districts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_statuses" (
    "id" UUID NOT NULL,
    "districtId" UUID NOT NULL,
    "source" "StatusSource" NOT NULL,
    "status" "FloodStatus" NOT NULL,
    "reason" TEXT,
    "eventId" UUID,
    "setById" UUID,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "district_statuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "flood_events" (
    "id" UUID NOT NULL,
    "districtId" UUID NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "StatusSource" NOT NULL,
    "reason" TEXT,
    "declaredById" UUID NOT NULL,
    "isReplay" BOOLEAN NOT NULL DEFAULT false,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "flood_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readings" (
    "id" UUID NOT NULL,
    "districtId" UUID NOT NULL,
    "rainfallMm24h" DOUBLE PRECISION,
    "riverDischarge" DOUBLE PRECISION,
    "source" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isReplay" BOOLEAN NOT NULL DEFAULT false,
    "replayRunId" TEXT,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "relief_camps" (
    "id" UUID NOT NULL,
    "districtId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CampType" NOT NULL,
    "location" geography(Point,4326),
    "capacity" INTEGER,
    "contact" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relief_camps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_clusters" (
    "id" UUID NOT NULL,
    "districtId" UUID NOT NULL,
    "centroid" geography(Point,4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requests" (
    "id" UUID NOT NULL,
    "clientId" TEXT NOT NULL,
    "requesterId" UUID,
    "districtId" UUID,
    "eventId" UUID,
    "clusterId" UUID,
    "needType" "NeedType" NOT NULL,
    "details" TEXT,
    "peopleCount" INTEGER NOT NULL DEFAULT 1,
    "location" geography(Point,4326),
    "locationText" TEXT,
    "status" "RequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "channel" "Channel" NOT NULL DEFAULT 'APP',
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "outsideKnownFloodArea" BOOLEAN NOT NULL DEFAULT false,
    "contactPhone" TEXT NOT NULL,
    "reportedForSomeoneElse" BOOLEAN NOT NULL DEFAULT false,
    "reporterName" TEXT,
    "reporterPhone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_photos" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "verifierId" UUID NOT NULL,
    "outcome" "VerificationOutcome" NOT NULL,
    "method" "VerificationMethod" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "volunteerId" UUID NOT NULL,
    "assignedById" UUID,
    "claimType" "ClaimType" NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "failureReason" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "requestId" UUID,
    "toPhone" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "template" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_authId_key" ON "users"("authId");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_approvalStatus_idx" ON "users"("role", "approvalStatus");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_profiles_userId_key" ON "volunteer_profiles"("userId");

-- CreateIndex
CREATE INDEX "volunteer_profiles_isAvailable_idx" ON "volunteer_profiles"("isAvailable");

-- CreateIndex
CREATE INDEX "volunteer_profiles_lastLocation_idx" ON "volunteer_profiles" USING GIST ("lastLocation");

-- CreateIndex
CREATE INDEX "districts_boundary_idx" ON "districts" USING GIST ("boundary");

-- CreateIndex
CREATE UNIQUE INDEX "districts_state_name_key" ON "districts"("state", "name");

-- CreateIndex
CREATE UNIQUE INDEX "district_statuses_districtId_source_key" ON "district_statuses"("districtId", "source");

-- CreateIndex
CREATE INDEX "flood_events_districtId_status_idx" ON "flood_events"("districtId", "status");

-- CreateIndex
CREATE INDEX "readings_districtId_observedAt_idx" ON "readings"("districtId", "observedAt");

-- CreateIndex
CREATE INDEX "relief_camps_districtId_isActive_idx" ON "relief_camps"("districtId", "isActive");

-- CreateIndex
CREATE INDEX "relief_camps_location_idx" ON "relief_camps" USING GIST ("location");

-- CreateIndex
CREATE UNIQUE INDEX "requests_clientId_key" ON "requests"("clientId");

-- CreateIndex
CREATE INDEX "requests_districtId_status_idx" ON "requests"("districtId", "status");

-- CreateIndex
CREATE INDEX "requests_status_priorityScore_idx" ON "requests"("status", "priorityScore");

-- CreateIndex
CREATE INDEX "requests_clusterId_idx" ON "requests"("clusterId");

-- CreateIndex
CREATE INDEX "requests_location_idx" ON "requests" USING GIST ("location");

-- CreateIndex
CREATE INDEX "request_photos_requestId_idx" ON "request_photos"("requestId");

-- CreateIndex
CREATE INDEX "verifications_requestId_idx" ON "verifications"("requestId");

-- CreateIndex
CREATE INDEX "assignments_requestId_status_idx" ON "assignments"("requestId", "status");

-- CreateIndex
CREATE INDEX "assignments_volunteerId_status_idx" ON "assignments"("volunteerId", "status");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "notifications_status_createdAt_idx" ON "notifications"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_profiles" ADD CONSTRAINT "volunteer_profiles_homeDistrictId_fkey" FOREIGN KEY ("homeDistrictId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_districts" ADD CONSTRAINT "organization_districts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_districts" ADD CONSTRAINT "organization_districts_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_statuses" ADD CONSTRAINT "district_statuses_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district_statuses" ADD CONSTRAINT "district_statuses_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "flood_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flood_events" ADD CONSTRAINT "flood_events_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "flood_events" ADD CONSTRAINT "flood_events_declaredById_fkey" FOREIGN KEY ("declaredById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relief_camps" ADD CONSTRAINT "relief_camps_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_clusters" ADD CONSTRAINT "request_clusters_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "flood_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requests" ADD CONSTRAINT "requests_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "request_clusters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_photos" ADD CONSTRAINT "request_photos_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_verifierId_fkey" FOREIGN KEY ("verifierId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_volunteerId_fkey" FOREIGN KEY ("volunteerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
