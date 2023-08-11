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
    phone_num character varying(30),
    plate_number character varying(100),
    image bytea NOT NULL,
    employee_id integer,
    purpose character varying(100) NOT NULL,
    active boolean default true,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
`
    }

    static async getCount(id: string, history : boolean) {
        const sql = `SELECT count(id) FROM booking WHERE 1 = 1 ${id ? ` AND cast(id as text) like '%${id}%' ` : ''} ${!history ? ` AND active = true ` : ''};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getById(id : number) {
        return booking.findFirst({
            where: {id}
        });
    }

    static async getAll(idNo: string, page: number, limit: number, history : boolean) {
        const sql = `SELECT * FROM booking WHERE 1 = 1 ${idNo ? ` AND cast(id as text) like '%${idNo}%' ` : ''} ${!history ? ` AND active = true ` : ''} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${limit * (page - 1)};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async create(obj : any) {
        return booking.create({
            data: obj
        });
    }

    static async inactivate(id : number) {
        return booking.update({
            where: {id},
            data: {active: false}
        });
    }

    static async delete(id : number) {
        return booking.delete({
            where: {
                id
            }
        })
    }
}
