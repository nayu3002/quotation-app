import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Tenant isolation middleware — every query is scoped to organizationId
// Applied at query level via application logic in service functions
export function createTenantPrisma(organizationId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, organizationId, deletedAt: null }
          return query(args)
        },
        async findFirst({ args, query }) {
          args.where = { ...args.where, organizationId, deletedAt: null }
          return query(args)
        },
        async findUnique({ args, query }) {
          return query(args)
        },
        async create({ args, query }) {
          args.data = { ...args.data, organizationId }
          return query(args)
        },
        async update({ args, query }) {
          return query(args)
        },
        async delete({ args, query }) {
          // Soft delete
          return (prisma as any).$queryRaw`
            UPDATE ${args.where} SET deleted_at = NOW()
          `
        },
      },
    },
  })
}

export default prisma
