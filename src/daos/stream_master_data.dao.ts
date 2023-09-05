import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const streamMasterData = prisma.stream_master_data;

export default class StreamMasterDataDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.stream_master_data (
        id                  BIGSERIAL     PRIMARY KEY,
        stream_id           text  NOT NULL,
        address             text  NOT NULL,
        name                text  NOT NULL,
        node_num            integer NOT NULL,
        latitude            double precision,
        longitude           double precision,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        patrol_car_id       BigInt NOT NULL
);`
    }

    static async create(obj : any) {
        return streamMasterData.create({
            data: obj
        });
    }

    static async deleteAll() {
        return streamMasterData.deleteMany();
    }
}
