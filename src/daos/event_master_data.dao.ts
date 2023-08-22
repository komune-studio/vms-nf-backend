import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const eventMasterData = prisma.event_master_data;

export default class EventMasterDataDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.event_master_data (
        id                  BIGSERIAL          PRIMARY KEY,
        type                character varying(200)  NOT NULL,
        stream_id           character varying(200)  NOT NULL,
        detection           jsonb                   NOT NULL DEFAULT '{}',
        primary_image       bytea,
        secondary_image     bytea,
        result              jsonb,
        status              character varying(200),
        latitude            double precision   NOT NULL,
        longitude           double precision   NOT NULL,
        event_time          TIMESTAMPTZ,
        created_at          TIMESTAMPTZ DEFAULT NOW()
);`
    }

    static async getAll() {
        return eventMasterData.findMany();
    }

    static async create(obj : any) {
        return eventMasterData.create({
            data: obj
        });
    }
}
