import { describe, it, expect, vi } from "vitest";
import { SignJWT } from "jose";
import { createHmac } from "node:crypto";

vi.mock("server-only", () => ({}));

describe("Demo Session Integration", () => {
  it("authenticates demo user and reads full memberships", async () => {
    process.env.APP_SESSION_SECRET = "BJ85RetJyuH0D8aAIHS-zEtkiPeLB3VRY7mTra7v59A";
    process.env.PRIVY_APP_ID = "cmtyz4pso00nh0djs5xvfow0x";
    process.env.PGLITE_PATH = "./.pglite/agrichain.db";

    const { readAppSession } = await import("@/server/auth/app-session");

    const secretKey = new TextEncoder().encode("agrichain-demo-showcase-secret-key-32b");
    const jwt = await new SignJWT({ sub: "did:privy:seed:producer-admin", role: "PRODUCER_ADMIN" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secretKey);

    const appSecret = process.env.APP_SESSION_SECRET;
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    const envelope = { accessToken: jwt, expiresAt };
    const payload = Buffer.from(JSON.stringify(envelope)).toString("base64url");
    const signature = createHmac("sha256", appSecret).update(payload).digest("base64url");
    const token = payload + "." + signature;

    const session = await readAppSession(token);
    expect(session).not.toBeNull();
    expect(session?.user.displayName).toBe("Budi Pratama (Admin Produsen)");
    expect(session?.user.status).toBe("ACTIVE");
    expect(session?.memberships.length).toBeGreaterThan(0);
    expect(session?.memberships[0].role).toBe("PRODUCER_ADMIN");

    // Test dashboard metrics query for PRODUCER_ADMIN
    const {
      getDashboardMetrics,
      listBatches,
      listDistributionPoints,
      listMyAssignedPoints,
      getReportMetrics,
    } = await import("@/server/queries/internal");
    const { getDbAdapter } = await import("@/server/db/adapter");
    const db = await getDbAdapter();
    const metrics = await getDashboardMetrics(db, session!);

    expect(metrics.activeBatches).toBeGreaterThanOrEqual(6);
    expect(metrics.compliant).toBeGreaterThan(0);
    expect(metrics.atRisk).toBeGreaterThan(0);
    expect(metrics.sahAttempts).toBeGreaterThan(0);
    expect(metrics.conditionTrend.length).toBe(14);
    expect(metrics.conditionAlerts.length).toBeGreaterThan(0);

    const producerPoints = await listDistributionPoints(db, session!);
    expect(producerPoints.length).toBeGreaterThanOrEqual(2);

    const producerAssigned = await listMyAssignedPoints(db, session!);
    expect(producerAssigned.length).toBeGreaterThanOrEqual(2);

    const producerReports = await getReportMetrics(db, session!);
    expect(producerReports.monitoredBatches).toBeGreaterThanOrEqual(8);
  });

  it("authenticates DISTRIBUTOR_ADMIN and provides full operational data", async () => {
    const { readAppSession } = await import("@/server/auth/app-session");
    const secretKey = new TextEncoder().encode("agrichain-demo-showcase-secret-key-32b");
    const jwt = await new SignJWT({
      sub: "did:privy:seed:distributor-admin",
      role: "DISTRIBUTOR_ADMIN",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secretKey);

    const appSecret =
      process.env.APP_SESSION_SECRET || "BJ85RetJyuH0D8aAIHS-zEtkiPeLB3VRY7mTra7v59A";
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    const envelope = { accessToken: jwt, expiresAt };
    const payload = Buffer.from(JSON.stringify(envelope)).toString("base64url");
    const signature = createHmac("sha256", appSecret).update(payload).digest("base64url");
    const token = payload + "." + signature;

    const session = await readAppSession(token);
    expect(session).not.toBeNull();
    expect(session?.user.displayName).toBe("Siti Rahma (Logistik Distributor)");

    const {
      getDashboardMetrics,
      listBatches,
      listDistributionPoints,
      listMyAssignedPoints,
      getReportMetrics,
    } = await import("@/server/queries/internal");
    const { getDbAdapter } = await import("@/server/db/adapter");
    const db = await getDbAdapter();

    const batches = await listBatches(db, session!);
    expect(batches.length).toBeGreaterThanOrEqual(4); // batches in custody + own

    const metrics = await getDashboardMetrics(db, session!);
    expect(metrics.activeBatches).toBeGreaterThanOrEqual(3);
    expect(metrics.sahAttempts).toBeGreaterThan(0);

    const points = await listDistributionPoints(db, session!);
    expect(points.length).toBeGreaterThanOrEqual(3);

    const assigned = await listMyAssignedPoints(db, session!);
    expect(assigned.length).toBeGreaterThanOrEqual(3);

    const reports = await getReportMetrics(db, session!);
    expect(reports.monitoredBatches).toBeGreaterThanOrEqual(4);
  });

  it("authenticates RETAILER_ADMIN and provides full operational data", async () => {
    const { readAppSession } = await import("@/server/auth/app-session");
    const secretKey = new TextEncoder().encode("agrichain-demo-showcase-secret-key-32b");
    const jwt = await new SignJWT({
      sub: "did:privy:seed:retailer-admin",
      role: "RETAILER_ADMIN",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secretKey);

    const appSecret =
      process.env.APP_SESSION_SECRET || "BJ85RetJyuH0D8aAIHS-zEtkiPeLB3VRY7mTra7v59A";
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    const envelope = { accessToken: jwt, expiresAt };
    const payload = Buffer.from(JSON.stringify(envelope)).toString("base64url");
    const signature = createHmac("sha256", appSecret).update(payload).digest("base64url");
    const token = payload + "." + signature;

    const session = await readAppSession(token);
    expect(session).not.toBeNull();
    expect(session?.user.displayName).toBe("Hendra Wijaya (Store Manager Retailer)");

    const {
      getDashboardMetrics,
      listBatches,
      listDistributionPoints,
      listMyAssignedPoints,
      getReportMetrics,
    } = await import("@/server/queries/internal");
    const { getDbAdapter } = await import("@/server/db/adapter");
    const db = await getDbAdapter();

    const batches = await listBatches(db, session!);
    expect(batches.length).toBeGreaterThanOrEqual(3);

    const metrics = await getDashboardMetrics(db, session!);
    expect(metrics.activeBatches).toBeGreaterThanOrEqual(2);

    const points = await listDistributionPoints(db, session!);
    expect(points.length).toBeGreaterThanOrEqual(2);

    const assigned = await listMyAssignedPoints(db, session!);
    expect(assigned.length).toBeGreaterThanOrEqual(2);

    const reports = await getReportMetrics(db, session!);
    expect(reports.monitoredBatches).toBeGreaterThanOrEqual(3);
  });

  it("authenticates FACTORY_STAFF and provides assigned point data", async () => {
    const { readAppSession } = await import("@/server/auth/app-session");
    const secretKey = new TextEncoder().encode("agrichain-demo-showcase-secret-key-32b");
    const jwt = await new SignJWT({
      sub: "did:privy:seed:factory-staff",
      role: "FACTORY_STAFF",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("24h")
      .sign(secretKey);

    const appSecret =
      process.env.APP_SESSION_SECRET || "BJ85RetJyuH0D8aAIHS-zEtkiPeLB3VRY7mTra7v59A";
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    const envelope = { accessToken: jwt, expiresAt };
    const payload = Buffer.from(JSON.stringify(envelope)).toString("base64url");
    const signature = createHmac("sha256", appSecret).update(payload).digest("base64url");
    const token = payload + "." + signature;

    const session = await readAppSession(token);
    expect(session).not.toBeNull();
    expect(session?.user.displayName).toBe("Ahmad Fauzi (Petugas Pabrik)");

    const { listBatches, listMyAssignedPoints } = await import("@/server/queries/internal");
    const { getDbAdapter } = await import("@/server/db/adapter");
    const db = await getDbAdapter();

    const batches = await listBatches(db, session!);
    expect(batches.length).toBeGreaterThanOrEqual(6);

    const assigned = await listMyAssignedPoints(db, session!);
    expect(assigned.length).toBeGreaterThanOrEqual(2);
  });
});
