import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const pipelineMasterData = prisma.pipeline_master_data;

export default class PipelineMasterDataDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.pipeline_master_data (
        id                  BIGSERIAL          PRIMARY KEY,
        stream_id           text  NOT NULL,
        analytic_id         text  NOT NULL,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        patrol_car_id       BigInt NOT NULL
);`
    }

    static async create(obj : any) {
        return pipelineMasterData.create({
            data: obj
        });
    }

    static async deleteAll() {
        return pipelineMasterData.deleteMany();
    }
}
