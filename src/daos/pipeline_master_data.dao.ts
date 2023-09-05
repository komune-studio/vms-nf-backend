import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
// const eventMasterData = prisma.event_master_data;

export default class StreamMasterDataDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.pipeline_master_data (
        id                  bigint          PRIMARY KEY,
        stream_id           text  NOT NULL,
        analytic_id         text  NOT NULL,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        patrol_car_id       BigInt NOT NULL
);`
    }
}
