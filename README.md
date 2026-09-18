# ERC-20 Relayer

## Purpose

This project is a REST API server which accepts requests to transfer some tokens, saving it to PostgreSQL.
Worker is queueing requests, signing transactions from hot service wallet and sending them into SepoliaA

### Goals to learn

- Managing nonce with parallel sending
- Gas price assignment, replacement-transactions
- Idempotency on API-level
- Recovery after process failed

### Stack

- TypeScript 5, NodeJS
- Express 5
- Docker & Docker Compose, PostgreSQL, Drizzle
- Viem
- Vitest
- Zod, Pino
- Sepolia (test network)
