import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
// @ts-ignore TS5097/TS6059 — generated client lives outside voice-service rootDir
// with a .ts source. Resolved at runtime via tsx (dev) and tsc's own emit (build).
import { PrismaClient } from '../../../generated/prisma/client.ts';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export default prisma;
