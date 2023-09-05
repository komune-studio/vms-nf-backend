import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
// const eventMasterData = prisma.event_master_data;

export default class StreamMasterDataDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.stream_master_data (
        id                  text          PRIMARY KEY,
        address             text  NOT NULL,
        name                text  NOT NULL,
        node_num            integer NOT NULL,
        latitude            double precision,
        longitude           double precision,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        patrol_car_id       BigInt NOT NULL
);`
    }
}
