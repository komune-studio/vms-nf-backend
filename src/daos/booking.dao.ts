import PrismaService from "../services/prisma.service";
import {Prisma} from "../prisma/nfvisionaire";
const prisma = PrismaService.getVisionaire();
const booking = prisma.booking;

export default class BookingDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.booking (
    id BIGSERIAL PRIMARY KEY,
    identity_number character varying(200) NOT NULL,
    name character varying(200) NOT NULL,
    gender character varying(200),
    birth_place character varying(220),
    birth_date date,
    plate_number character varying(100),
    image bytea NOT NULL,
    site_id bigint NOT NULL,
    location_id integer NOT NULL,
    employee_id integer,
    purpose character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
`
    }

    static async getCount(id: string) {
        const sql = `SELECT count(id) FROM booking ${id ? ` WHERE cast(id as text) like '%${id}%' ` : ''};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getById(id : number) {
        return booking.findFirst({
            where: {id}
        });
    }

    static async getAll(idNo: string, page: number, limit: number) {
        const sql = `SELECT * FROM booking ${idNo ? ` WHERE cast(id as text) like '%${idNo}%' ` : ''} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${limit * (page - 1)};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async create(obj : any) {
        return booking.create({
            data: obj
        });
    }
}
