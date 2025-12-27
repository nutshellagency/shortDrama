import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import { z } from "zod";
import { prisma } from "./db";
import { getEnv } from "./config";
import { adminHtml, appHtml } from "./pages";
import { presignPutUrl, publicObjectUrl } from "./s3";
import { HeadObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createS3 } from "./s3";
// NOTE: Avoid importing Prisma enums from "@prisma/client" at runtime.
// In some dev/editor environments (and occasionally during container restarts),
// enum exports can appear missing/stale and crash the server on access.
// Prisma accepts string values for enum fields, so we use string constants here.
const EpisodeLockType = {
  FREE: "FREE",
  COINS: "COINS",
  AD: "AD"
} as const;

const EpisodeStatus = {
  DRAFT: "DRAFT",
  PROCESSING: "PROCESSING",
  READY: "READY",
  PUBLISHED: "PUBLISHED",
  FAILED: "FAILED"
} as const;

const AiJobStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED"
} as const;

const TransactionType = {
  AD_UNLOCK: "AD_UNLOCK",
  COIN_SPEND: "COIN_SPEND",
  COIN_GRANT: "COIN_GRANT"
} as const;

const AiJobKind = {
  ENCODE_ONE: "ENCODE_ONE",
  SPLIT_SERIES: "SPLIT_SERIES"
} as const;
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { pipeline } from "stream/promises";

const env = getEnv();

// Debug: confirm environment loading (masked)
console.log(`[Server] Admin Email Loaded: ${env.ADMIN_EMAIL.substring(0, 3)}...`);
console.log(`[Server] Database Host: ${env.DATABASE_URL.split('@')[1]?.split(':')[0] || 'unknown'}`);

export const app = Fastify({ logger: true });

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { userId: string };
    user: { userId: string };
  }
}

app.register(cors, { origin: true });
app.register(jwt, { secret: env.JWT_SECRET });
// Allow large video uploads in local POC (default multipart limits can truncate uploads).
app.register(multipart, { limits: { fileSize: 2 * 1024 * 1024 * 1024 } }); // 2GB

app.register(fastifyStatic, {
  root: path.join(__dirname, '..', '..', 'content'),
  prefix: '/content/',
  decorateReply: false
});

app.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/public/',
});

// Separate JWT signer/verifier for admin routes.
// With @fastify/jwt namespace option, the generated methods are:
//   req.<namespace>JwtVerify()
//   app.<namespace>JwtSign()
app.register(jwt, { secret: env.ADMIN_JWT_SECRET, namespace: "admin" });

function ensureAuth(req: any, reply: any) {
  return req.jwtVerify().catch(() => reply.code(401).send({ error: "unauthorized" }));
}

async function ensureAdmin(req: any, reply: any) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!token) return reply.code(401).send({ error: "admin_unauthorized" });
  try {
    await (req as any).adminJwtVerify();
  } catch {
    return reply.code(401).send({ error: "admin_unauthorized" });
  }
}

function ensureWorker(req: any, reply: any, done: any) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (token !== env.WORKER_TOKEN) {
    // Important: return the reply so Fastify stops the lifecycle here.
    reply.code(401).send({ error: "worker_unauthorized" });
    return;
  }
  done();
}

app.get("/health", async () => ({ ok: true }));

// Debug endpoint: Test Supabase S3 connectivity
app.get("/debug/storage-check", { preHandler: ensureAdmin }, async (req, reply) => {
  try {
    const s3 = createS3();
    const { ListBucketsCommand } = await import("@aws-sdk/client-s3");
    const buckets = await s3.send(new ListBucketsCommand({}));
    return {
      ok: true,
      buckets: buckets.Buckets?.map(b => b.Name),
      env: {
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        bucketRaw: env.S3_BUCKET_RAW,
        bucketProcessed: env.S3_BUCKET_PROCESSED
      }
    };
  } catch (err: any) {
    return reply.code(500).send({
      ok: false,
      error: err.message,
      stack: err.stack,
      hint: "Check S3_ACCESS_KEY and S3_SECRET_KEY in your .env"
    });
  }
});

// Debug endpoint (temporary): show episode data and generated URLs
app.get("/debug/episodes", async () => {
  const episodes = await prisma.episode.findMany({
    where: { status: EpisodeStatus.PUBLISHED },
    include: { series: true },
    take: 10
  });
  return {
    publicS3BaseUrl: env.PUBLIC_S3_BASE_URL,
    bucket: env.S3_BUCKET_PROCESSED,
    episodes: episodes.map(ep => ({
      id: ep.id,
      seriesTitle: ep.series.title,
      episodeNumber: ep.episodeNumber,
      status: ep.status,
      lockType: ep.lockType,
      rawKey: ep.rawKey,
      videoKey: ep.videoKey,
      thumbnailKey: ep.thumbnailKey,
      generatedVideoUrl: ep.videoKey ? publicObjectUrl(env.S3_BUCKET_PROCESSED, ep.videoKey) : null,
      generatedThumbnailUrl: ep.thumbnailKey ? publicObjectUrl(env.S3_BUCKET_PROCESSED, ep.thumbnailKey) : null
    }))
  };
});

// Debug endpoint (temporary): show feed response
app.get("/debug/feed", async () => {
  // Create a test user view of the feed (simulate guest)
  const testUser = await prisma.user.findFirst({ orderBy: { createdAt: "desc" } });
  if (!testUser) return { error: "no_users" };

  const episodes = await prisma.episode.findMany({
    where: { status: EpisodeStatus.PUBLISHED },
    include: { series: true }
  });
  const progress = await prisma.userEpisodeProgress.findMany({ where: { userId: testUser.id } });
  const progressMap = new Map(progress.map((p) => [p.episodeId, p]));

  const items = episodes
    .sort((a, b) => (a.seriesId === b.seriesId ? a.episodeNumber - b.episodeNumber : a.seriesId.localeCompare(b.seriesId)))
    .map((ep) => {
      const p = progressMap.get(ep.id);
      const unlocked = ep.lockType === EpisodeLockType.FREE ? true : p?.unlocked ?? false;
      return {
        series: { id: ep.series.id, title: ep.series.title },
        episode: {
          id: ep.id,
          episodeNumber: ep.episodeNumber,
          lockType: ep.lockType,
          videoKey: ep.videoKey,
          videoUrl: unlocked && ep.videoKey ? publicObjectUrl(env.S3_BUCKET_PROCESSED, ep.videoKey) : null,
          thumbnailUrl: ep.thumbnailKey ? publicObjectUrl(env.S3_BUCKET_PROCESSED, ep.thumbnailKey) : null,
        },
        viewer: {
          unlocked,
          userId: testUser.id
        }
      };
    });

  return { items };
});

app.get("/admin", async (_req, reply) => reply.type("text/html").send(adminHtml()));

// --- Production Sync ---
app.post("/admin/sync/push", { preHandler: ensureAdmin }, async (_req, reply) => {
  try {
    const { execSync } = await import("child_process");
    const output = execSync("python ../scripts/push_to_live.py", { encoding: "utf8" });
    return { ok: true, output };
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err.message, output: err.stdout });
  }
});

app.post("/admin/sync/pull", { preHandler: ensureAdmin }, async (_req, reply) => {
  try {
    const { execSync } = await import("child_process");
    const output = execSync("python ../scripts/pull_from_live.py", { encoding: "utf8" });
    return { ok: true, output };
  } catch (err: any) {
    return reply.code(500).send({ ok: false, error: err.message, output: err.stdout });
  }
});

// Redirect root traffic to the Viewer
app.get("/", async (req, reply) => {
  const host = req.headers.host || "";
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const target = isLocal ? "http://localhost:3001" : "https://shortdrama-viewer.vercel.app";
  return reply.redirect(target);
});

app.get("/app", async (req, reply) => {
  const host = req.headers.host || "";
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1');
  const target = isLocal ? "http://localhost:3001" : "https://shortdrama-viewer.vercel.app";
  return reply.redirect(target);
});

// --- Auth (POC: guest mode) ---
app.post("/auth/guest", async (_req, reply) => {
  const guestKey = crypto.randomBytes(16).toString("hex");
  const user = await prisma.user.create({
    data: {
      isGuest: true,
      guestKey,
      coins: 50
    }
  });
  const token = app.jwt.sign({ userId: user.id });
  return reply.send({ token, user: { id: user.id, coins: user.coins } });
});

// --- Admin auth (POC: env-based) ---
app.post("/admin/login", async (req, reply) => {
  const body: any = req.body ?? {};
  console.log(`[Admin] Login attempt for: ${body.email}`);
  
  if (body.email !== env.ADMIN_EMAIL || body.password !== env.ADMIN_PASSWORD) {
    console.warn(`[Admin] Login failed for: ${body.email}. Expected: ${env.ADMIN_EMAIL}`);
    return reply.code(401).send({ error: "invalid_credentials" });
  }
  
  // With @fastify/jwt + namespace, the sign method is decorated on reply/request.
  // @ts-expect-error namespace typing
  const token = await reply.adminJwtSign({ role: "admin" });
  console.log(`[Admin] Login success for: ${body.email}`);
  return reply.send({ token });
});

// Debug endpoint (POC): list recent jobs/episodes to help diagnose stuck processing.
app.get("/admin/debug/recent", { preHandler: ensureAdmin }, async () => {
  const jobs = await prisma.aiJob.findMany({ orderBy: { createdAt: "desc" }, take: 10 });
  const episodes = await prisma.episode.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { series: true } });
  return {
    jobs,
    episodes: episodes.map((e) => ({
      id: e.id,
      status: e.status,
      seriesTitle: e.series.title,
      episodeNumber: e.episodeNumber,
      lockType: e.lockType,
      rawKey: e.rawKey,
      videoKey: e.videoKey,
      createdAt: e.createdAt
    }))
  };
});

// Admin helper: view job progress/status (used by POC admin UI).
app.get("/admin/jobs/:id/status", { preHandler: ensureAdmin }, async (req: any, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const job = await prisma.aiJob.findUnique({ where: { id }, include: { episode: { include: { series: true } } } });
  if (!job) return reply.code(404).send({ error: "job_not_found" });

  // If user is looking at a queued SPLIT_SERIES job but another split job is currently processing
  // for the same episode anchor, surface it so the UI can "follow" the real active job.
  let activeSplit: any = null;
  if ((job as any).kind === AiJobKind.SPLIT_SERIES && job.status === AiJobStatus.PENDING) {
    const j = await prisma.aiJob.findFirst({
      where: {
        episodeId: job.episodeId,
        kind: AiJobKind.SPLIT_SERIES as any,
        status: AiJobStatus.PROCESSING as any
      },
      orderBy: { startedAt: "asc" }
    });
    if (j) {
      activeSplit = {
        id: j.id,
        status: j.status,
        progressPct: j.progressPct,
        stage: j.stage,
        lastHeartbeat: j.lastHeartbeat,
        startedAt: j.startedAt
      };
    }
  }
  return {
    job: {
      id: job.id,
      kind: (job as any).kind ?? AiJobKind.ENCODE_ONE,
      status: job.status,
      attempts: job.attempts,
      error: job.error,
      progressPct: job.progressPct,
      stage: job.stage,
      lastHeartbeat: job.lastHeartbeat,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt
    },
    activeSplitJob: activeSplit,
    episode: {
      id: job.episode.id,
      episodeNumber: job.episode.episodeNumber,
      status: job.episode.status,
      rawKey: job.episode.rawKey
    },
    series: {
      id: job.episode.series.id,
      title: job.episode.series.title,
      freeEpisodes: job.episode.series.freeEpisodes,
      episodeDurationSec: job.episode.series.episodeDurationSec,
      defaultCoinCost: job.episode.series.defaultCoinCost
    }
  };
});

// Admin helper: list episodes in a series (used by POC admin UI).
app.get("/admin/series/:id/episodes", { preHandler: ensureAdmin }, async (req: any, reply) => {
  const { id: seriesId } = z.object({ id: z.string().uuid() }).parse(req.params);
  const series = await prisma.series.findUnique({ where: { id: seriesId } });
  if (!series) return reply.code(404).send({ error: "series_not_found" });
  const episodes = await prisma.episode.findMany({
    where: { seriesId },
    orderBy: { episodeNumber: "asc" }
  });
  return {
    series: {
      id: series.id,
      title: series.title,
      freeEpisodes: series.freeEpisodes,
      episodeDurationSec: series.episodeDurationSec,
      defaultCoinCost: series.defaultCoinCost
    },
    episodes: episodes.map((e) => ({
      id: e.id,
      episodeNumber: e.episodeNumber,
      status: e.status,
      lockType: e.lockType,
      coinCost: e.coinCost,
      durationSec: e.durationSec,
      videoKey: e.videoKey,
      thumbnailKey: e.thumbnailKey
    }))
  };
});

// --- Content ---
app.get("/feed/home", { preHandler: ensureAuth }, async (req: any) => {
  const userId = req.user.userId;
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const episodes = await prisma.episode.findMany({
    where: { status: EpisodeStatus.PUBLISHED },
    include: { series: true }
  });
  const progress = await prisma.userEpisodeProgress.findMany({ where: { userId } });
  const progressMap = new Map(progress.map((p) => [p.episodeId, p]));

  const items = episodes
    .sort((a, b) => (a.seriesId === b.seriesId ? a.episodeNumber - b.episodeNumber : a.seriesId.localeCompare(b.seriesId)))
    .map((ep) => {
      const p = progressMap.get(ep.id);
      const unlocked = ep.lockType === EpisodeLockType.FREE ? true : p?.unlocked ?? false;
      return {
        series: {
          id: ep.series.id,
          title: ep.series.title,
          language: ep.series.language,
          genres: ep.series.genres,
          defaultCoinCost: ep.series.defaultCoinCost
        },
        episode: {
          id: ep.id,
          episodeNumber: ep.episodeNumber,
          status: ep.status,
          lockType: ep.lockType,
          coinCost: ep.coinCost,
          videoUrl: unlocked && ep.videoKey ? publicObjectUrl(env.S3_BUCKET_PROCESSED, ep.videoKey) : null,
          thumbnailUrl: ep.thumbnailKey ? publicObjectUrl(env.S3_BUCKET_PROCESSED, ep.thumbnailKey) : null,
          subtitlesUrl: unlocked && ep.subtitlesKey ? publicObjectUrl(env.S3_BUCKET_PROCESSED, ep.subtitlesKey) : null
        },
        viewer: {
          coins: user.coins,
          unlocked,
          watched: p?.watched ?? false,
          lastSeriesId: user.lastSeriesId ?? null,
          lastEpisodeId: user.lastEpisodeId ?? null
        }
      };
    });

  return { items };
});

app.get("/feed/series", { preHandler: ensureAuth }, async (req: any) => {
  const series = await prisma.series.findMany({
    include: {
      episodes: {
        where: { episodeNumber: 1 },
        select: {
          thumbnailKey: true
        }
      }
    }
  });

  return {
    items: series.map(s => ({
      id: s.id,
      title: s.title,
      language: s.language,
      genres: s.genres,
      episodeCount: 0, // aggregate if needed, or query separate
      coverUrl: s.episodes[0]?.thumbnailKey ? publicObjectUrl(env.S3_BUCKET_PROCESSED, s.episodes[0].thumbnailKey) : null
    }))
  };
});

app.get("/series/:id", { preHandler: ensureAuth }, async (req: any) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const series = await prisma.series.findUnique({ where: { id } });
  if (!series) return { error: "not_found" };
  return series;
});

app.get("/series/:id/episodes", { preHandler: ensureAuth }, async (req: any) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const episodes = await prisma.episode.findMany({ where: { seriesId: id, status: EpisodeStatus.PUBLISHED }, orderBy: { episodeNumber: "asc" } });
  return { episodes };
});

// --- Unlock / progress ---
app.post("/episode/:id/unlock", { preHandler: ensureAuth }, async (req: any, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = z.object({ method: z.enum(["ad", "coins"]) }).parse(req.body ?? {});
  const userId = req.user.userId;

  const episode = await prisma.episode.findUnique({ where: { id }, include: { series: true } });
  if (!episode || episode.status !== EpisodeStatus.PUBLISHED) return reply.code(404).send({ error: "episode_not_found" });
  if (episode.lockType === EpisodeLockType.FREE) return { unlocked: true };

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  if (body.method === "ad") {
    // ALWAYS reward the user for watching an ad
    const rewardAmount = 5; // Configurable?
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Give coins
      const u = await tx.user.update({ where: { id: userId }, data: { coins: { increment: rewardAmount } } });

      // 2. Record transaction
      await tx.transaction.create({ data: { userId, episodeId: id, type: TransactionType.COIN_GRANT, amount: rewardAmount } });

      // 3. Ensure episode is unlocked (if not already)
      await tx.userEpisodeProgress.upsert({
        where: { userId_episodeId: { userId, episodeId: id } },
        update: { unlocked: true, adUnlocked: true },
        create: { userId, episodeId: id, unlocked: true, adUnlocked: true, watched: false },
      });

      return u;
    });

    return { unlocked: true, coins: updatedUser.coins, granted: rewardAmount };
  } else if (body.method === "coins") {
    // POC: allow coin unlock for any locked episode (AD or COINS), using coinCost or series default.
    const cost = episode.coinCost > 0 ? episode.coinCost : episode.series.defaultCoinCost;
    if (cost > 0 && user.coins < cost) return reply.code(400).send({ error: "insufficient_coins" });

    const updatedUser = await prisma.$transaction(async (tx) => {
      let u = user;
      if (cost > 0) {
        u = await tx.user.update({ where: { id: userId }, data: { coins: { decrement: cost } } });
      }
      await tx.userEpisodeProgress.upsert({
        where: { userId_episodeId: { userId, episodeId: id } },
        update: { unlocked: true },
        create: { userId, episodeId: id, unlocked: true, watched: false }
      });
      if (cost > 0) await tx.transaction.create({ data: { userId, episodeId: id, type: TransactionType.COIN_SPEND, amount: cost } });
      return u;
    });
    return { unlocked: true, coins: updatedUser.coins, spent: cost };
  }

  return reply.code(400).send({ error: "invalid_method" });
});

app.post("/episode/:id/progress", { preHandler: ensureAuth }, async (req: any) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = z.object({ watched: z.boolean() }).parse(req.body ?? {});
  const userId = req.user.userId;

  const episode = await prisma.episode.findUnique({ where: { id }, include: { series: true } });
  if (!episode) return { ok: true };

  // Upsert watched + also update resume pointers.
  const now = new Date();
  await prisma.user.update({ where: { id: userId }, data: { lastSeriesId: episode.seriesId, lastEpisodeId: id, lastSeenAt: now } });

  // On completion: POC coin deduction (only once per episode).
  if (body.watched) {
    await prisma.$transaction(async (tx: any) => {
      const p = await tx.userEpisodeProgress.upsert({
        where: { userId_episodeId: { userId, episodeId: id } },
        update: { watched: true, watchedAt: now },
        create: { userId, episodeId: id, watched: true, watchedAt: now, unlocked: false, charged: false }
      });

      if (episode.lockType === EpisodeLockType.FREE) return;
      if (p.charged) return;

      const cost = episode.coinCost > 0 ? episode.coinCost : episode.series.defaultCoinCost;
      if (cost <= 0) {
        await tx.userEpisodeProgress.update({ where: { userId_episodeId: { userId, episodeId: id } }, data: { charged: true } });
        return;
      }

      const u = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      const newCoins = Math.max(0, u.coins - cost);
      await tx.user.update({ where: { id: userId }, data: { coins: newCoins } });
      await tx.transaction.create({ data: { userId, episodeId: id, type: TransactionType.COIN_SPEND, amount: cost } });
      await tx.userEpisodeProgress.update({ where: { userId_episodeId: { userId, episodeId: id } }, data: { charged: true } });
    });
  } else {
    await prisma.userEpisodeProgress.upsert({
      where: { userId_episodeId: { userId, episodeId: id } },
      update: { watched: false, watchedAt: null },
      create: { userId, episodeId: id, watched: false, watchedAt: null, unlocked: false, charged: false }
    });
  }

  return { ok: true };
});

// POC: mark "currently viewing" for resume (episode-level).
app.post("/episode/:id/viewed", { preHandler: ensureAuth }, async (req: any, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const userId = req.user.userId;
  const episode = await prisma.episode.findUnique({ where: { id } });
  if (!episode) return reply.send({ ok: true });
  await prisma.user.update({
    where: { id: userId },
    data: { lastSeriesId: episode.seriesId, lastEpisodeId: id, lastSeenAt: new Date() }
  });
  return reply.send({ ok: true });
});

// --- POC monetization helpers ---
// DEPRECATED: This endpoint is deprecated in favor of the new logic in POST /episode/:id/unlock with method "ad".
// Mock "rewarded ad" coin grant (ties the grant to an episodeId so Transaction schema stays simple).
app.post("/episode/:id/reward", { preHandler: ensureAuth }, async (req: any, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = z.object({ amount: z.number().int().min(1).max(50).default(10) }).parse(req.body ?? {});
  const userId = req.user.userId;

  const episode = await prisma.episode.findUnique({ where: { id } });
  if (!episode || episode.status !== EpisodeStatus.PUBLISHED) return reply.code(404).send({ error: "episode_not_found" });

  const updatedUser = await prisma.$transaction(async (tx: any) => {
    const u = await tx.user.update({ where: { id: userId }, data: { coins: { increment: body.amount } } });
    await tx.transaction.create({ data: { userId, episodeId: id, type: TransactionType.COIN_GRANT, amount: body.amount } });
    return u;
  });

  return { ok: true, coins: updatedUser.coins, granted: body.amount };
});

// --- Admin APIs ---
app.post("/admin/series", { preHandler: ensureAdmin }, async (req: any) => {
  const body = z
    .object({
      title: z.string().min(1),
      language: z.string().min(1),
      genres: z.array(z.string()).default([]),
      description: z.string().default(""),
      freeEpisodes: z.number().int().min(0).max(20).default(3),
      episodeDurationSec: z.number().int().min(30).max(600).default(180),
      defaultCoinCost: z.number().int().min(0).max(999).default(5),
      maxEpisodes: z.number().int().min(1).max(100).default(50)
    })
    .parse(req.body ?? {});
  const series = await prisma.series.create({
    data: {
      title: body.title,
      language: body.language,
      genres: body.genres,
      description: body.description,
      freeEpisodes: body.freeEpisodes,
      episodeDurationSec: body.episodeDurationSec,
      defaultCoinCost: body.defaultCoinCost
    }
  });
  return series;
});

// List all series with episode counts
app.get("/admin/series", { preHandler: ensureAdmin }, async () => {
  const series = await prisma.series.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { episodes: true } },
      episodes: { where: { status: EpisodeStatus.PUBLISHED }, select: { id: true } }
    }
  });
  return {
    series: series.map(s => ({
      id: s.id,
      title: s.title,
      language: s.language,
      genres: s.genres,
      description: s.description,
      freeEpisodes: s.freeEpisodes,
      episodeDurationSec: s.episodeDurationSec,
      defaultCoinCost: s.defaultCoinCost,
      maxEpisodes: (s as any).maxEpisodes ?? 50,
      totalEpisodes: s._count.episodes,
      publishedEpisodes: s.episodes.length,
      createdAt: s.createdAt
    }))
  };
});

// Update series metadata
app.put("/admin/series/:id", { preHandler: ensureAdmin }, async (req: any, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = z
    .object({
      title: z.string().min(1).optional(),
      language: z.string().min(1).optional(),
      genres: z.array(z.string()).optional(),
      description: z.string().optional(),
      freeEpisodes: z.number().int().min(0).max(20).optional(),
      episodeDurationSec: z.number().int().min(30).max(600).optional(),
      defaultCoinCost: z.number().int().min(0).max(999).optional(),
      maxEpisodes: z.number().int().min(1).max(100).optional()
    })
    .parse(req.body ?? {});

  const existing = await prisma.series.findUnique({ where: { id } });
  if (!existing) return reply.code(404).send({ error: "series_not_found" });

  const updated = await prisma.series.update({
    where: { id },
    data: body
  });
  return updated;
});

// Delete series and all its episodes
app.delete("/admin/series/:id", { preHandler: ensureAdmin }, async (req: any, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);

  const existing = await prisma.series.findUnique({ where: { id } });
  if (!existing) return reply.code(404).send({ error: "series_not_found" });

  // Delete related records first (cascade)
  const episodes = await prisma.episode.findMany({ where: { seriesId: id }, select: { id: true } });
  const episodeIds = episodes.map(e => e.id);

  // Delete AI jobs for these episodes
  await prisma.aiJob.deleteMany({ where: { episodeId: { in: episodeIds } } });
  // Delete user progress for these episodes
  await prisma.userEpisodeProgress.deleteMany({ where: { episodeId: { in: episodeIds } } });
  // Delete transactions for these episodes
  await prisma.transaction.deleteMany({ where: { episodeId: { in: episodeIds } } });
  // Delete episodes
  await prisma.episode.deleteMany({ where: { seriesId: id } });
  // Finally delete series
  await prisma.series.delete({ where: { id } });

  return { ok: true, deleted: { seriesId: id, episodeCount: episodeIds.length } };
});

// Auto-generate episodes by splitting a long raw video into 3-minute (default) episodes.
// Worker will create/publish episodes 1..N based on duration.
app.post("/admin/series/:id/auto-split", { preHandler: ensureAdmin }, async (req: any, reply) => {
  const { id: seriesId } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = z
    .object({
      rawKey: z.string().min(1),
      episodeDurationSec: z.number().int().min(30).max(600).default(180),
      freeEpisodes: z.number().int().min(0).max(20).default(3),
      defaultCoinCost: z.number().int().min(0).max(999).default(5),
      maxEpisodes: z.number().int().min(1).max(100).default(50)
    })
    .parse(req.body ?? {});

  const rawKey = body.rawKey.trim();
  const isUrl = rawKey.startsWith("http://") || rawKey.startsWith("https://");
  if (!isUrl && (rawKey === "-" || rawKey.length < 3 || !rawKey.startsWith("raw/"))) {
    return reply.code(400).send({ error: "invalid_raw_key", hint: "Upload first; rawKey must start with raw/ or be a valid URL" });
  }

  await prisma.series.update({
    where: { id: seriesId },
    data: {
      freeEpisodes: body.freeEpisodes,
      episodeDurationSec: body.episodeDurationSec,
      defaultCoinCost: body.defaultCoinCost,
      maxEpisodes: body.maxEpisodes
    }
  });

  // Ensure episode 1 exists as the "anchor" for the split job.
  let ep1 = await prisma.episode.findFirst({ where: { seriesId, episodeNumber: 1 } });
  if (!ep1) {
    ep1 = await prisma.episode.create({
      data: {
        seriesId,
        episodeNumber: 1,
        rawKey,
        lockType: EpisodeLockType.FREE as any,
        coinCost: 0,
        status: EpisodeStatus.PROCESSING
      }
    });
  }

  // If there is already an active split job, return it (prevents confusion & prevents changing rawKey mid-run).
  const existingActive = await prisma.aiJob.findFirst({
    where: {
      episodeId: ep1.id,
      kind: AiJobKind.SPLIT_SERIES as any,
      status: { in: [AiJobStatus.PENDING, AiJobStatus.PROCESSING] as any }
    },
    orderBy: { createdAt: "desc" }
  });
  if (existingActive) {
    return { ok: true, reused: true, jobId: existingActive.id, episodeId: ep1.id, seriesId };
  }

  // No active job: now it's safe to update the rawKey.
  await prisma.episode.update({
    where: { id: ep1.id },
    data: { rawKey, status: EpisodeStatus.PROCESSING, lockType: EpisodeLockType.FREE as any, coinCost: 0 }
  });

  // Sanity-check the raw object size to catch truncated uploads early.
  try {
    const s3 = createS3();
    const head = await s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET_RAW, Key: rawKey }));
    const size = Number(head.ContentLength ?? 0);
    if (size > 0 && size < 10 * 1024 * 1024) {
      return reply.code(400).send({
        error: "raw_too_small",
        hint: `Raw object is only ${size} bytes. Re-upload the full video (multipart limit increased in API).`
      });
    }
  } catch {
    // best-effort; continue
  }

  const job = await prisma.aiJob.create({
    data: {
      episodeId: ep1.id,
      kind: AiJobKind.SPLIT_SERIES as any,
      status: AiJobStatus.PENDING,
      attempts: 0,
      progressPct: 0,
      stage: "queued_split"
    }
  });

  return { ok: true, jobId: job.id, episodeId: ep1.id, seriesId };
});

app.post("/admin/import-from-url", { preHandler: ensureAdmin }, async (req: any, reply) => {
  const body = z.object({
    url: z.string().url(),
    seriesTitle: z.string().min(1),
    language: z.string().min(1),
    episodeDurationSec: z.number().int().min(30).max(600).default(180),
    freeEpisodes: z.number().int().min(0).max(20).default(3),
    defaultCoinCost: z.number().int().min(0).max(999).default(5),
    maxEpisodes: z.number().int().min(1).max(100).default(50)
  }).parse(req.body ?? {});

  const series = await prisma.series.create({
    data: {
      title: body.seriesTitle,
      language: body.language,
      episodeDurationSec: body.episodeDurationSec,
      freeEpisodes: body.freeEpisodes,
      defaultCoinCost: body.defaultCoinCost,
      maxEpisodes: body.maxEpisodes
    }
  });

  const episode = await prisma.episode.create({
    data: {
      seriesId: series.id,
      episodeNumber: 1,
      rawKey: body.url, // Using the URL as the rawKey for the worker to download
      lockType: EpisodeLockType.FREE as any,
      coinCost: 0,
      status: EpisodeStatus.PROCESSING
    }
  });

  const job = await prisma.aiJob.create({
    data: {
      episodeId: episode.id,
      kind: AiJobKind.SPLIT_SERIES as any,
      status: AiJobStatus.PENDING,
      attempts: 0,
      progressPct: 0,
      stage: "queued_import"
    }
  });

  return { ok: true, jobId: job.id, episodeId: episode.id, seriesId: series.id };
});

app.post("/admin/upload", { preHandler: ensureAdmin }, async (req: any) => {
  const body = z.object({ filename: z.string().min(1), contentType: z.string().optional() }).parse(req.body ?? {});
  const key = `raw/${Date.now()}_${body.filename.replace(/[^\w.\-]+/g, "_")}`;
  const uploadUrl = await presignPutUrl({ bucket: env.S3_BUCKET_RAW, key, contentType: body.contentType });
  return { bucket: env.S3_BUCKET_RAW, key, uploadUrl };
});

// Browser-friendly upload endpoint (avoids presigned URL host/CORS issues in local POC).
app.post("/admin/upload-file", { preHandler: ensureAdmin }, async (req: any, reply) => {
  const file = await req.file();
  if (!file) return reply.code(400).send({ error: "missing_file" });

  const safeName = String(file.filename || "upload.mp4").replace(/[^\w.\-]+/g, "_");
  const key = `raw/${Date.now()}_${safeName}`;

  // Important: AWS SDK S3 PutObject with streaming body requires a known content length for some S3-compatible backends.
  // For a robust local POC (large files), we spool to a temp file to compute ContentLength, then upload.
  const tmpPath = path.join(os.tmpdir(), `shortdrama_${Date.now()}_${Math.random().toString(16).slice(2)}_${safeName}`);
  let byteCount = 0;
  const out = fs.createWriteStream(tmpPath);
  file.file.on("data", (chunk: Buffer) => {
    byteCount += chunk.length;
  });
  await pipeline(file.file, out);

  const s3 = createS3();
  const bodyStream = fs.createReadStream(tmpPath);
  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET_RAW,
        Key: key,
        Body: bodyStream,
        ContentLength: byteCount,
        ContentType: file.mimetype || "application/octet-stream"
      })
    );
  } finally {
    bodyStream.destroy();
    fs.promises.unlink(tmpPath).catch(() => undefined);
  }

  return reply.send({ bucket: env.S3_BUCKET_RAW, key, sizeBytes: byteCount });
});

app.post("/admin/episodes", { preHandler: ensureAdmin }, async (req: any, reply) => {
  const body = z
    .object({
      seriesId: z.string().uuid(),
      episodeNumber: z.number().int().positive(),
      rawKey: z.string().min(1),
      lockType: z.enum(["FREE", "AD", "COINS"]).default("FREE"),
      coinCost: z.number().int().nonnegative().default(0)
    })
    .parse(req.body ?? {});

  const rawKey = body.rawKey.trim();
  if (rawKey === "-" || rawKey.length < 3 || !rawKey.startsWith("raw/")) {
    return reply.code(400).send({ error: "invalid_raw_key", hint: "Upload first; rawKey must start with raw/..." });
  }

  const ep = await prisma.episode
    .create({
      data: {
        seriesId: body.seriesId,
        episodeNumber: body.episodeNumber,
        rawKey,
        lockType: body.lockType as any,
        coinCost: body.coinCost,
        status: EpisodeStatus.DRAFT
      }
    })
    .catch((e) => {
      if (String(e).includes("Unique constraint")) return null;
      throw e;
    });

  if (!ep) return reply.code(400).send({ error: "episode_number_already_exists" });
  return ep;
});

app.post("/admin/episodes/:id/raw", { preHandler: ensureAdmin }, async (req: any, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = z.object({ rawKey: z.string().min(1) }).parse(req.body ?? {});
  const rawKey = body.rawKey.trim();
  if (rawKey === "-" || rawKey.length < 3 || !rawKey.startsWith("raw/")) {
    return reply.code(400).send({ error: "invalid_raw_key", hint: "rawKey must start with raw/..." });
  }
  await prisma.episode.update({ where: { id }, data: { rawKey, status: EpisodeStatus.DRAFT } });
  return { ok: true };
});

app.post("/admin/trigger-ai", { preHandler: ensureAdmin }, async (req: any) => {
  const body = z.object({ episodeId: z.string().uuid() }).parse(req.body ?? {});
  const episode = await prisma.episode.findUniqueOrThrow({ where: { id: body.episodeId } });
  if (!episode.rawKey || episode.rawKey === "-" || !episode.rawKey.startsWith("raw/")) return { error: "missing_raw" };

  const job = await prisma.aiJob.create({
    data: {
      episodeId: episode.id,
      kind: AiJobKind.ENCODE_ONE as any,
      status: AiJobStatus.PENDING,
      attempts: 0,
      progressPct: 0,
      stage: "queued"
    }
  });
  await prisma.episode.update({ where: { id: episode.id }, data: { status: EpisodeStatus.PROCESSING } });
  return job;
});

// Requeue AI for an episode (useful when a job gets stuck in PROCESSING).
app.post("/admin/episodes/:id/retry-ai", { preHandler: ensureAdmin }, async (req: any) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const episode = await prisma.episode.findUniqueOrThrow({ where: { id } });
  if (!episode.rawKey) return { error: "missing_raw" };
  const job = await prisma.aiJob.create({
    data: { episodeId: episode.id, kind: AiJobKind.ENCODE_ONE as any, status: AiJobStatus.PENDING, attempts: 0, progressPct: 0, stage: "queued" }
  });
  await prisma.episode.update({ where: { id: episode.id }, data: { status: EpisodeStatus.PROCESSING } });
  return job;
});

app.post("/admin/episodes/:id/publish", { preHandler: ensureAdmin }, async (req: any, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = z.object({ published: z.boolean() }).parse(req.body ?? {});
  const episode = await prisma.episode.findUniqueOrThrow({ where: { id } });
  if (body.published) {
    if (episode.status !== EpisodeStatus.READY && episode.status !== EpisodeStatus.PUBLISHED) {
      const job = await prisma.aiJob.findFirst({ where: { episodeId: id }, orderBy: { createdAt: "desc" } });
      return reply.code(400).send({
        error: "episode_not_ready",
        episodeStatus: episode.status,
        jobStatus: job?.status ?? null,
        jobError: job?.error ?? null
      });
    }
    await prisma.episode.update({ where: { id }, data: { status: EpisodeStatus.PUBLISHED } });
  } else {
    await prisma.episode.update({ where: { id }, data: { status: EpisodeStatus.READY } });
  }
  return { ok: true };
});

// POC helper: seed a full "episodic" series using an already-processed episode as a template.
// This enables testing binge + locks + monetization without running AI N times.
app.post("/admin/series/:id/seed-demo", { preHandler: ensureAdmin }, async (req: any, reply) => {
  const { id: seriesId } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = z
    .object({
      totalEpisodes: z.number().int().min(1).max(50).default(10),
      freeEpisodes: z.number().int().min(0).max(20).default(4),
      coinCost: z.number().int().min(0).max(999).default(5)
    })
    .parse(req.body ?? {});

  const template = await prisma.episode.findFirst({
    where: { seriesId, status: EpisodeStatus.PUBLISHED, videoKey: { not: null } },
    orderBy: { episodeNumber: "asc" }
  });
  if (!template?.videoKey) {
    return reply.code(400).send({
      error: "missing_template_episode",
      hint: "Publish at least 1 episode in this series (with processed videoKey) before seeding."
    });
  }

  const pickLock = (episodeNumber: number) => {
    if (episodeNumber <= body.freeEpisodes) return { lockType: EpisodeLockType.FREE, coinCost: 0 };
    // After free episodes: alternate AD / COINS for POC testing.
    const isAd = (episodeNumber - body.freeEpisodes) % 2 === 1;
    return isAd ? { lockType: EpisodeLockType.AD, coinCost: 0 } : { lockType: EpisodeLockType.COINS, coinCost: body.coinCost };
  };

  let created = 0;
  let updated = 0;
  for (let episodeNumber = 1; episodeNumber <= body.totalEpisodes; episodeNumber++) {
    const lock = pickLock(episodeNumber);
    const existing = await prisma.episode.findFirst({ where: { seriesId, episodeNumber } });
    if (existing) {
      await prisma.episode.update({
        where: { id: existing.id },
        data: {
          status: EpisodeStatus.PUBLISHED,
          lockType: lock.lockType as any,
          coinCost: lock.coinCost,
          rawKey: template.rawKey,
          videoKey: template.videoKey,
          thumbnailKey: template.thumbnailKey,
          subtitlesKey: template.subtitlesKey,
          metadataKey: template.metadataKey,
          durationSec: template.durationSec
        }
      });
      updated++;
    } else {
      await prisma.episode.create({
        data: {
          seriesId,
          episodeNumber,
          status: EpisodeStatus.PUBLISHED,
          lockType: lock.lockType as any,
          coinCost: lock.coinCost,
          rawKey: template.rawKey,
          videoKey: template.videoKey,
          thumbnailKey: template.thumbnailKey,
          subtitlesKey: template.subtitlesKey,
          metadataKey: template.metadataKey,
          durationSec: template.durationSec
        }
      });
      created++;
    }
  }

  return { ok: true, seriesId, totalEpisodes: body.totalEpisodes, freeEpisodes: body.freeEpisodes, created, updated };
});

app.get("/admin/episodes/:id/status", { preHandler: ensureAdmin }, async (req: any) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const episode = await prisma.episode.findUniqueOrThrow({ where: { id }, include: { series: true } });
  const job = await prisma.aiJob.findFirst({ where: { episodeId: id }, orderBy: { createdAt: "desc" } });
  return {
    episode: {
      id: episode.id,
      status: episode.status,
      episodeNumber: episode.episodeNumber,
      lockType: episode.lockType,
      coinCost: episode.coinCost,
      rawKey: episode.rawKey,
      videoKey: episode.videoKey,
      thumbnailKey: episode.thumbnailKey,
      subtitlesKey: episode.subtitlesKey,
      durationSec: episode.durationSec
    },
    series: { id: episode.series.id, title: episode.series.title },
    job: job
      ? {
        id: job.id,
        status: job.status,
        attempts: job.attempts,
        error: job.error,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        progressPct: job.progressPct,
        stage: job.stage,
        lastHeartbeat: job.lastHeartbeat
      }
      : null
  };
});

// --- Worker APIs ---
app.post("/worker/jobs/claim", { preHandler: ensureWorker }, async (req: any) => {
  // Keep this endpoint lightweight (worker polls frequently).
  // Helper: requeue a stale PROCESSING job (claimed but no heartbeat for a while).
  const staleCutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes
  const requeueOneStale = async () => {
    const stale = await prisma.aiJob.findFirst({
      where: {
        status: AiJobStatus.PROCESSING,
        OR: [{ lastHeartbeat: null }, { lastHeartbeat: { lt: staleCutoff } }]
      },
      orderBy: { startedAt: "asc" }
    });
    if (!stale) return false;
    await prisma.aiJob.update({
      where: { id: stale.id },
      data: { status: AiJobStatus.PENDING, stage: "requeued", progressPct: 0 }
    });
    app.log.info({ reqId: req.id, requeuedId: stale.id }, "worker_claim:stale_requeued");
    return true;
  };

  // Find a valid PENDING job (skip broken ones with missing/invalid rawKey).
  for (let i = 0; i < 5; i++) {
    let job = await prisma.aiJob.findFirst({ where: { status: AiJobStatus.PENDING }, orderBy: { createdAt: "asc" } });
    if (!job) {
      const requeued = await requeueOneStale();
      if (!requeued) break;
      job = await prisma.aiJob.findFirst({ where: { status: AiJobStatus.PENDING }, orderBy: { createdAt: "asc" } });
      if (!job) break;
    }

    const episode = await prisma.episode.findUnique({ where: { id: job.episodeId }, include: { series: true } });
    const rawKey = episode?.rawKey ?? null;
    const isUrl = rawKey?.startsWith("http://") || rawKey?.startsWith("https://");
    const rawKeyValid = Boolean(rawKey && rawKey !== "-" && (isUrl || rawKey.startsWith("raw/")));
    if (!rawKeyValid) {
      await prisma.aiJob.update({
        where: { id: job.id },
        data: {
          status: AiJobStatus.FAILED,
          error: "missing_or_invalid_rawKey",
          finishedAt: new Date(),
          stage: "invalid_raw"
        }
      });
      if (episode) {
        await prisma.episode.update({ where: { id: episode.id }, data: { status: EpisodeStatus.FAILED } }).catch(() => { });
      }
      app.log.warn({ reqId: req.id, jobId: job.id, rawKey }, "worker_claim:skipping_invalid_raw");
      continue;
    }

    const updated = await prisma.aiJob.update({
      where: { id: job.id },
      data: {
        status: AiJobStatus.PROCESSING,
        attempts: { increment: 1 },
        startedAt: new Date(),
        lastHeartbeat: new Date(),
        stage: "claimed",
        progressPct: 0
      }
    });
    app.log.info({ reqId: req.id, jobId: updated.id }, "worker_claim:job_marked_processing");

    return {
      job: {
        id: updated.id,
        episodeId: updated.episodeId,
        kind: (updated as any).kind ?? AiJobKind.ENCODE_ONE,
        seriesId: episode!.seriesId,
        seriesFreeEpisodes: episode!.series.freeEpisodes,
        seriesEpisodeDurationSec: episode!.series.episodeDurationSec,
        seriesDefaultCoinCost: episode!.series.defaultCoinCost,
        seriesMaxEpisodes: (episode!.series as any).maxEpisodes ?? 50,
        rawBucket: env.S3_BUCKET_RAW,
        rawKey: rawKey
      }
    };
  }

  return { job: null };
});

app.post("/worker/jobs/:id/progress", { preHandler: ensureWorker }, async (req: any, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = z
    .object({
      progressPct: z.number().int().min(0).max(100),
      stage: z.string().min(1),
      message: z.string().optional()
    })
    .parse(req.body ?? {});
  await prisma.aiJob.update({
    where: { id },
    data: {
      progressPct: body.progressPct,
      stage: body.stage,
      lastHeartbeat: new Date(),
      error: body.message ?? undefined
    }
  });
  return reply.send({ ok: true });
});

app.post("/worker/jobs/:id/complete", { preHandler: ensureWorker }, async (req: any, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = z
    .union([
      z.object({
        videoKey: z.string().min(1),
        thumbnailKey: z.string().min(1),
        subtitlesKey: z.string().optional(),
        metadataKey: z.string().optional(),
        durationSec: z.number().int().positive().optional()
      }),
      z.object({
        segments: z.array(
          z.object({
            episodeNumber: z.number().int().positive(),
            videoKey: z.string().min(1),
            thumbnailKey: z.string().min(1),
            subtitlesKey: z.string().optional(),
            metadataKey: z.string().optional(),
            durationSec: z.number().int().positive().optional()
          })
        )
      })
    ])
    .parse(req.body ?? {});

  const job = await prisma.aiJob.findUnique({ where: { id } });
  if (!job) return reply.code(404).send({ error: "job_not_found" });

  // SPLIT_SERIES job: worker sends segments[] and we publish episodes 1..N.
  if ((job as any).kind === AiJobKind.SPLIT_SERIES && "segments" in body) {
    const anchor = await prisma.episode.findUnique({ where: { id: job.episodeId }, include: { series: true } });
    if (!anchor) return reply.code(404).send({ error: "episode_not_found" });
    const seriesId = anchor.seriesId;
    const freeEpisodes = anchor.series.freeEpisodes;
    const defaultCoinCost = anchor.series.defaultCoinCost;

    const pickLock = (episodeNumber: number) => {
      if (episodeNumber <= freeEpisodes) return { lockType: EpisodeLockType.FREE, coinCost: 0 };
      const isAd = (episodeNumber - freeEpisodes) % 2 === 1;
      return isAd ? { lockType: EpisodeLockType.AD, coinCost: 0 } : { lockType: EpisodeLockType.COINS, coinCost: defaultCoinCost };
    };

    await prisma.$transaction(async (tx: any) => {
      for (const seg of body.segments) {
        const lock = pickLock(seg.episodeNumber);
        const existing = await tx.episode.findFirst({ where: { seriesId, episodeNumber: seg.episodeNumber } });
        if (existing) {
          await tx.episode.update({
            where: { id: existing.id },
            data: {
              status: EpisodeStatus.PUBLISHED,
              lockType: lock.lockType as any,
              coinCost: lock.coinCost,
              rawKey: anchor.rawKey,
              videoKey: seg.videoKey,
              thumbnailKey: seg.thumbnailKey,
              subtitlesKey: seg.subtitlesKey ?? null,
              metadataKey: seg.metadataKey ?? null,
              durationSec: seg.durationSec ?? null
            }
          });
        } else {
          await tx.episode.create({
            data: {
              seriesId,
              episodeNumber: seg.episodeNumber,
              status: EpisodeStatus.PUBLISHED,
              lockType: lock.lockType as any,
              coinCost: lock.coinCost,
              rawKey: anchor.rawKey,
              videoKey: seg.videoKey,
              thumbnailKey: seg.thumbnailKey,
              subtitlesKey: seg.subtitlesKey ?? null,
              metadataKey: seg.metadataKey ?? null,
              durationSec: seg.durationSec ?? null
            }
          });
        }
      }
      await tx.aiJob.update({ where: { id }, data: { status: AiJobStatus.SUCCEEDED, finishedAt: new Date(), error: null } });
    });

    return { ok: true, mode: "split", episodes: body.segments.length };
  }

  // Default: ENCODE_ONE.
  if (!("videoKey" in body)) return reply.code(400).send({ error: "invalid_payload" });

  await prisma.$transaction(async (tx: any) => {
    await tx.episode.update({
      where: { id: job.episodeId },
      data: {
        videoKey: body.videoKey,
        thumbnailKey: body.thumbnailKey,
        subtitlesKey: body.subtitlesKey ?? null,
        metadataKey: body.metadataKey ?? null,
        durationSec: body.durationSec ?? null,
        status: EpisodeStatus.READY
      }
    });
    await tx.aiJob.update({ where: { id }, data: { status: AiJobStatus.SUCCEEDED, finishedAt: new Date(), error: null } });
  });

  return { ok: true };
});

app.post("/worker/jobs/:id/fail", { preHandler: ensureWorker }, async (req: any, reply) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = z.object({ error: z.string().min(1) }).parse(req.body ?? {});
  const job = await prisma.aiJob.findUnique({ where: { id } });
  if (!job) return reply.code(404).send({ error: "job_not_found" });
  await prisma.$transaction(async (tx) => {
    await tx.aiJob.update({ where: { id }, data: { status: AiJobStatus.FAILED, finishedAt: new Date(), error: body.error } });
    await tx.episode.update({ where: { id: job.episodeId }, data: { status: EpisodeStatus.FAILED } });
  });
  return { ok: true };
});

const start = async () => {
  await app.listen({ port: env.API_PORT, host: "0.0.0.0" });
};

if (require.main === module) {
  start().catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
}


