# Unit 16 spec: Redis queue and worker

## Goal

Redis is the pilot cache and job list. A CommandBox worker pops work so OCR and model jobs do not run on the officer’s HTTP request. PostgreSQL remains the system of record. Kafka and other brokers are not added.

## Design

Ingest writes `ingest_jobs` and LPUSHes `idochive:jobs`. Priority start uses `idochive:jobs:next`. The worker BRPOPs those lists, honors `job_controls`, and calls the existing workers. `POST /api/jobs/tick.cfm` stays as a degraded drain when Redis is down.

## In scope

- Redis env, health, optional Compose service
- Enqueue on ingest; worker off the HTTP thread
- Control actions update Redis payloads
- setup-dev detects Redis and does not fail the whole bootstrap if it is missing

## Out of scope

- Kafka, RabbitMQ, NATS
- SSE / pub-sub live UI
- Office unpack, threat scan

## Verify when this unit is done

- [x] Upload appears in Redis and `GET /api/jobs.cfm`
- [x] Worker advances state without Process next when Redis is up
- [x] Pause is not popped; Start is processed next
- [x] Cancel and remove drop the Redis payload; blob remains
- [x] Health reports Redis without requiring a public AI API

When Redis is down, PostgreSQL `SKIP LOCKED` plus `job_controls` still apply. Health reports `queue.available: false` and the UI keeps Process next.
