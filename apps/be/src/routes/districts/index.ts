import { Router } from "express";
import { z } from "zod";
import { prisma, type RequestStatus } from "@repo/db";
import { setDistrictStatusSchema } from "@repo/common/types";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { isApprovedResponder } from "../../lib/responder.js";
import { effectiveFloodStatus } from "../../lib/flood.js";

const router = Router();
const UUID = z.uuid();

// A request is "open" until it reaches one of these.
const RESOLVED_STATUSES: RequestStatus[] = ["FULFILLED", "REJECTED", "NOT_GENUINE"];

router.use(requireAuth);

function pathParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// All districts with their effective flood status and open-request count.
router.get("/", async (_req, res) => {
  try {
    const [districts, openCounts] = await Promise.all([
      prisma.district.findMany({
        include: { statuses: true },
        orderBy: [{ state: "asc" }, { name: "asc" }],
      }),
      prisma.request.groupBy({
        by: ["districtId"],
        where: { districtId: { not: null }, status: { notIn: RESOLVED_STATUSES } },
        _count: { _all: true },
      }),
    ]);

    const countByDistrict = new Map(
      openCounts.map((row) => [row.districtId as string, row._count._all]),
    );

    return res.status(200).json({
      districts: districts.map((district) => {
        const effective = effectiveFloodStatus(district.statuses);
        return {
          id: district.id,
          name: district.name,
          state: district.state,
          status: effective.status,
          statusSource: effective.source,
          openRequests: countByDistrict.get(district.id) ?? 0,
        };
      }),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// One district with all raw status rows + the computed effective one.
router.get("/:id", async (req, res) => {
  try {
    const districtId = pathParam(req.params.id);
    if (!districtId || !UUID.safeParse(districtId).success) {
      return res.status(404).json({ error: "District not found" });
    }

    const district = await prisma.district.findUnique({
      where: { id: districtId },
      include: { statuses: true },
    });
    if (!district) {
      return res.status(404).json({ error: "District not found" });
    }

    return res.status(200).json({
      district: {
        id: district.id,
        name: district.name,
        state: district.state,
        statuses: district.statuses,
        effectiveStatus: effectiveFloodStatus(district.statuses),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// The "briefing": flood status + what the district currently needs.
router.get("/:id/briefing", async (req, res) => {
  try {
    const districtId = pathParam(req.params.id);
    if (!districtId || !UUID.safeParse(districtId).success) {
      return res.status(404).json({ error: "District not found" });
    }

    const district = await prisma.district.findUnique({
      where: { id: districtId },
      include: { statuses: true },
    });
    if (!district) {
      return res.status(404).json({ error: "District not found" });
    }

    const openWhere = { districtId, status: { notIn: RESOLVED_STATUSES } } as const;

    const [byNeed, open, unassigned, activeCamps, availableVolunteers] = await Promise.all([
      prisma.request.groupBy({
        by: ["needType"],
        where: openWhere,
        _count: { _all: true },
      }),
      prisma.request.count({ where: openWhere }),
      prisma.request.count({
        where: { ...openWhere, assignments: { none: { status: "ACTIVE" } } },
      }),
      prisma.reliefCamp.count({ where: { districtId, isActive: true } }),
      prisma.volunteerProfile.count({ where: { homeDistrictId: districtId, isAvailable: true } }),
    ]);

    const byNeedType: Record<string, number> = {};
    for (const row of byNeed) {
      byNeedType[row.needType] = row._count._all;
    }

    return res.status(200).json({
      district: { id: district.id, name: district.name, state: district.state },
      flood: effectiveFloodStatus(district.statuses),
      requests: { open, unassigned, byNeedType },
      camps: { active: activeCamps },
      volunteers: { available: availableVolunteers },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Set (or replace) the manual status. Coordinators and admins only.
router.post(
  "/:id/status",
  requireRole("NGO_COORDINATOR", "ADMIN"),
  async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (!isApprovedResponder(user)) {
        return res.status(403).json({ error: "Responder account is not approved" });
      }

      const districtId = pathParam(req.params.id);
      if (!districtId || !UUID.safeParse(districtId).success) {
        return res.status(404).json({ error: "District not found" });
      }

      const parsed = setDistrictStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues });
      }

      const district = await prisma.district.findUnique({ where: { id: districtId } });
      if (!district) {
        return res.status(404).json({ error: "District not found" });
      }

      const status = await prisma.districtStatus.upsert({
        where: { districtId_source: { districtId, source: "MANUAL" } },
        create: {
          districtId,
          source: "MANUAL",
          status: parsed.data.status,
          reason: parsed.data.reason,
          setById: user.id,
        },
        update: {
          status: parsed.data.status,
          reason: parsed.data.reason,
          setById: user.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: user.id,
          action: "district.status_set",
          entityType: "District",
          entityId: districtId,
          metadata: { status: parsed.data.status, source: "MANUAL" },
        },
      });

      return res.status(200).json({ status });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

// Drop the manual override so the district falls back to automatic signals.
router.delete(
  "/:id/status",
  requireRole("NGO_COORDINATOR", "ADMIN"),
  async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (!isApprovedResponder(user)) {
        return res.status(403).json({ error: "Responder account is not approved" });
      }

      const districtId = pathParam(req.params.id);
      if (!districtId || !UUID.safeParse(districtId).success) {
        return res.status(404).json({ error: "District not found" });
      }

      const result = await prisma.districtStatus.deleteMany({
        where: { districtId, source: "MANUAL" },
      });

      return res.status(200).json({ removed: result.count });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

export default router;
