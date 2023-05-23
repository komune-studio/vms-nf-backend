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
            enrolled_face_id bigint,
            employee_id int,
            security_id int,
            location_id int NOT NULL,
            allowed_sites bigint[] NOT NULL,
            approved boolean NOT NULL default false,
            purpose VARCHAR(100) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()           
        );`
    }

    static async createVisit(data : any) {
        let enrolledFaceData = {};

        if(data.enrolled_face_id) {
            enrolledFaceData = {
                enrolled_face: {
                    connect: {id: data.enrolled_face_id}
                }
            }
        }

        let locationData = {}

        if(data.location_id) {
            locationData = {
                location: {
                    connect: {id: data.location_id}
                }
            }
        }

        return visitation.create({
            data: {
                security_id: data.security_id,
                purpose: data.purpose,
                ...enrolledFaceData,
                employee: {
                    connect: {id: data.employee_id}
                },
                ...locationData,
                created_at: new Date(),
                allowed_sites: data.allowed_sites
            }
        })
    }

    static async getAllVisits(limit? : number, page? : number, search? : string, searchBy? : string, distinct? : boolean) {
        return visitation.findMany({
            orderBy: {
                created_at: 'desc'
            },
            skip: page && limit ? (page - 1) * limit : undefined,
            take: limit ? limit : undefined,
            where: {
                purpose: searchBy === 'purpose' ? { contains: search, mode: 'insensitive' } : undefined,
                enrolled_face: {
                    identity_number: searchBy === 'identity_number' ? { contains: search, mode: 'insensitive' } : undefined,
                    name: searchBy === 'name' ? { contains: search, mode: 'insensitive' } : undefined,
                },
                location: {
                    name: searchBy === 'location' ? { contains: search, mode: 'insensitive' } : undefined
                },
                employee: {
                    name: searchBy === 'employee' ? { contains: search, mode: 'insensitive' } : undefined
                },
            },
            select: {
                id: true,
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
            },
            distinct: distinct ? ['enrolled_face_id'] : undefined
        });
    }

    static async getVisitCount(search? : string, searchBy? : string) {
        return visitation.aggregate({
            _count: {id: true},
            where: {
                purpose: searchBy === 'purpose' ? { contains: search, mode: 'insensitive' } : undefined,
                enrolled_face: {
                    identity_number: searchBy === 'identity_number' ? { contains: search, mode: 'insensitive' } : undefined,
                    name: searchBy === 'name' ? { contains: search, mode: 'insensitive' } : undefined,
                },
                location: {
                    name: searchBy === 'location' ? { contains: search, mode: 'insensitive' } : undefined
                },
                employee: {
                    name: searchBy === 'employee' ? { contains: search, mode: 'insensitive' } : undefined
                },
            }
        });
    }

    static async getById(id : number) {
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

    static async getByEnrolledFaceId(id : number) {
        return visitation.findMany({
            where: {enrolled_face_id: id, approved: true},
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
                created_at: true,
            }
        })
    }

    static async updateVisit(id : number, data : any) {
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

    static async approve(id : number) {
        return visitation.update({
            where: {id: id},
            data: {
                approved: true
            }
        })
    }

    static async getCountGroupByTime() {
        const sql = `select count(*), to_timestamp(floor((extract('epoch' from created_at) / 3600 )) * 3600) as interval_alias from visitation where created_at >= '${moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z')}' GROUP BY interval_alias ORDER BY interval_alias ASC`

        return prisma.$queryRaw(Prisma.raw(sql))
    }
}
