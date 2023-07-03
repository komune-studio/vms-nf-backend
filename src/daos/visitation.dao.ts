import PrismaService from "../services/prisma.service";
import {vi} from "date-fns/locale";
import moment from "moment";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const visitation = PrismaService.getVisionaire().visitation;

export default class VisitationDAO {
    static async getCount(condition: any) {
        let result = visitation.aggregate({
            _count: {id: true},
            where: condition
        });

        return result;
    }

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS visitation (
            id SERIAL PRIMARY KEY,
            image bytea NOT NULL,
            enrolled_face_id bigint,
            employee_id int,
            security_id int,
            registered_by int,
            approved_by int,
            approved_at TIMESTAMPTZ,
            check_out_by int,
            check_out_at TIMESTAMPTZ,
            location_id int,
            allowed_sites bigint[] NOT NULL default '{}',
            approved boolean NOT NULL default false,
            purpose VARCHAR(100) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()      
        );`
    }

    static async createVisit(data: any) {
        let enrolledFaceData = {};

        if (data.enrolled_face_id) {
            enrolledFaceData = {
                enrolled_face: {
                    connect: {id: data.enrolled_face_id}
                }
            }
        }

        let locationData = {}

        if (data.location_id) {
            locationData = {
                location: {
                    connect: {id: data.location_id}
                }
            }
        }

        let employeeData = {}

        if (data.employee_id) {
            employeeData = {
                employee: {
                    connect: {id: data.employee_id}
                }
            }
        }

        return visitation.create({
            data: {
                registered_by: data.registered_by,
                security_id: data.security_id,
                purpose: data.purpose,
                ...enrolledFaceData,
                ...employeeData,
                ...locationData,
                created_at: new Date(),
                allowed_sites: data.allowed_sites,
                image: data.image
            }
        })
    }

    static async getAllVisits(limit?: number, page?: number, search?: string, searchBy?: string, distinct?: boolean, startDate?: string, endDate?: string, startTime?: string, endTime?: string, gender?: string, age?: string, formId?: string) {
        const enumerateDaysBetweenDates = (startDate: String, endDate: String) => {
            let date = []

            // @ts-ignore
            while (moment(startDate) <= moment(endDate)) {
                date.push(startDate);
                // @ts-ignore
                startDate = moment(startDate).add(1, 'days').format("YYYY-MM-DD");
            }
            return date;
        }

        let whereDateClause = {}

        if (startDate && endDate) {
            whereDateClause = {
                OR: enumerateDaysBetweenDates(startDate, endDate).map(date => {
                    console.log([
                        {created_at: {gte: `${date}T${startTime}:00+07:00`}},
                        {created_at: {lte: `${date}T${endTime}:59+07:00`}},
                    ])

                    return (
                        {
                            AND: [
                                {created_at: {gte: `${date}T${startTime}:00+07:00`}},
                                {created_at: {lte: `${date}T${endTime}:59+07:00`}},
                            ]
                        }
                    )
                })
            }
        }

        let whereDOBClause = {};

        if (age) {
            const year = moment().subtract(parseInt(age), 'year').format('YYYY');

            whereDOBClause = {
                AND: [
                    {birth_date: {gte: `${year}-01-01T00:00:00Z`}},
                    {birth_date: {lte: `${year}-12-31T23:59:59Z`}},
                ]
            }
        }

        let whereFormIdClause = {};

        if (formId) {
            whereFormIdClause = {
                additional_info: {
                    path: ['form_id'],
                    equals: parseInt(formId)
                }
            }
        }

        return visitation.findMany({
            orderBy: {
                created_at: 'desc'
            },
            skip: page && limit ? (page - 1) * limit : undefined,
            take: limit ? limit : undefined,
            where: {
                ...whereDateClause,
                purpose: searchBy === 'purpose' ? {contains: search, mode: 'insensitive'} : undefined,
                enrolled_face: {
                    identity_number: searchBy === 'identity_number' ? {
                        contains: search,
                        mode: 'insensitive'
                    } : undefined,
                    name: searchBy === 'name' ? {contains: search, mode: 'insensitive'} : undefined,
                    gender: gender ? gender : undefined,
                    ...whereDOBClause,
                    ...whereFormIdClause
                },
                location: {
                    name: searchBy === 'location' ? {contains: search, mode: 'insensitive'} : undefined
                },
                employee: {
                    name: searchBy === 'employee' ? {contains: search, mode: 'insensitive'} : undefined
                },
            },
            select: {
                id: true,
                image: !!limit,
                registered_by: true,
                security_id: true,
                enrolled_face: {
                    select: {id: true, name: true, identity_number: true}
                },
                purpose: true,
                employee: {
                    select: {id: true, name: true}
                },
                location: {
                    select: {id: true, name: true}
                },
                approved: true,
                allowed_sites: true,
                created_at: true,
                check_out_at: true,
                approved_at:true,
                approved_by: true
            },
            distinct: distinct ? ['enrolled_face_id'] : undefined
        });
    }

    static async getVisitCount(search?: string, searchBy?: string, startDate?: string, endDate?: string, startTime?: string, endTime?: string, gender?: string, age?: string, formId?: string) {
        const enumerateDaysBetweenDates = (startDate: String, endDate: String) => {
            let date = []

            // @ts-ignore
            while (moment(startDate) <= moment(endDate)) {
                date.push(startDate);
                // @ts-ignore
                startDate = moment(startDate).add(1, 'days').format("YYYY-MM-DD");
            }
            return date;
        }

        let whereDateClause = {}

        if (startDate && endDate) {
            whereDateClause = {
                OR: enumerateDaysBetweenDates(startDate, endDate).map(date => {
                    console.log([
                        {created_at: {gte: `${date}T${startTime}:00+07:00`}},
                        {created_at: {lte: `${date}T${endTime}:59+07:00`}},
                    ])

                    return (
                        {
                            AND: [
                                {created_at: {gte: `${date}T${startTime}:00+07:00`}},
                                {created_at: {lte: `${date}T${endTime}:59+07:00`}},
                            ]
                        }
                    )
                })
            }
        }

        let whereDOBClause = {};

        if (age) {
            const year = moment().subtract(parseInt(age), 'year').format('YYYY');

            whereDOBClause = {
                AND: [
                    {birth_date: {gte: `${year}-01-01T00:00:00Z`}},
                    {birth_date: {lte: `${year}-12-31T23:59:59Z`}},
                ]
            }
        }

        let whereFormIdClause = {};

        if (formId) {
            whereFormIdClause = {
                additional_info: {
                    path: ['form_id'],
                    equals: parseInt(formId)
                }
            }
        }

        return visitation.aggregate({
            _count: {id: true},
            where: {
                ...whereDateClause,
                purpose: searchBy === 'purpose' ? {contains: search, mode: 'insensitive'} : undefined,
                enrolled_face: {
                    identity_number: searchBy === 'identity_number' ? {
                        contains: search,
                        mode: 'insensitive'
                    } : undefined,
                    name: searchBy === 'name' ? {contains: search, mode: 'insensitive'} : undefined,
                    gender: gender ? gender : undefined,
                    ...whereDOBClause,
                    ...whereFormIdClause
                },
                location: {
                    name: searchBy === 'location' ? {contains: search, mode: 'insensitive'} : undefined
                },
                employee: {
                    name: searchBy === 'employee' ? {contains: search, mode: 'insensitive'} : undefined
                },
            }
        });
    }

    static async getById(id: number) {
        return visitation.findFirst({
            where: {id: id},
            select: {
                enrolled_face: {
                    select: {id: true, name: true, identity_number: true}
                },
                purpose: true,
                employee: {
                    select: {id: true, name: true}
                },
                location: {
                    select: {id: true, name: true}
                },
                allowed_sites: true,
                created_at: true,
            }
        });
    }

    static async getLatestByEnrolledFaceId(id: number) {
        return visitation.findFirst({
            where: {enrolled_face_id: id},
            orderBy: {created_at: 'desc'},
            select: {
                id: true,
                purpose: true,
                employee: {
                    select: {name: true}
                },
                location: {
                    select: {name: true}
                },
                allowed_sites: true,
                location_id: true,
                created_at: true,
                check_out_at: true,
                check_out_by: true,
                approved: true,
                security_id: true,
                registered_by: true
            }
        })
    }

    static async getByEnrolledFaceId(id: number) {
        return visitation.findMany({
            where: {enrolled_face_id: id},
            orderBy: {created_at: 'desc'},
            select: {
                id: true,
                purpose: true,
                employee: {
                    select: {name: true}
                },
                location: {
                    select: {name: true}
                },
                allowed_sites: true,
                location_id: true,
                created_at: true,
                check_out_at: true,
                check_out_by: true,
                approved: true,
                security_id: true,
                registered_by: true,
                image: true
            }
        })
    }

    static async updateVisit(id: number, data: any) {
        return visitation.update({
            where: {id: id},
            data: {
                purpose: data.purpose,
                employee: {
                    connect: {id: data.employee_id}
                },
                location: {
                    connect: {id: data.location_id}
                },
                allowed_sites: data.allowed_sites
            }
        })
    }

    static async approve(id: number, adminId : number) {
        return visitation.update({
            where: {id: id},
            data: {
                approved: true,
                approved_by: adminId,
                approved_at: new Date()
            }
        })
    }

    static async getCountGroupByTime() {
        const sql = `select count(*), to_timestamp(floor((extract('epoch' from created_at) / 3600 )) * 3600) as interval_alias from visitation where created_at >= '${moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z')}' GROUP BY interval_alias ORDER BY interval_alias ASC`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async checkOut(id: number, adminId : number) {
        return visitation.update({
            where: {id: id},
            data: {
                check_out_at: new Date(),
                check_out_by: adminId
            }
        })
    }
}
