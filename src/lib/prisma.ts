import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const prismaClientSingleton = () => {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    })
    const adapter = new PrismaPg(pool)
    return new PrismaClient({ adapter })
}

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton> | undefined;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma;

/**
 * BIGINT SERIALIZATION FIX
 * ------------------------
 * Since PostgreSQL primary keys use BIGINT, Prisma returns them as JavaScript BigInt.
 * JSON.stringify() fails by default on BigInt. 
 * This adds a global toJSON method to BigInt to convert them to strings automatically.
 */
(BigInt.prototype as any).toJSON = function () {
    return this.toString();
};
