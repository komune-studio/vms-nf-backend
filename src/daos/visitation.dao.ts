import PrismaService from "../services/prisma.service";

const prisma = PrismaService.getVisionaire();
const visitation = PrismaService.getVisionaire().visitation;

export default class VisitationDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS visitation (
            id SERIAL PRIMARY KEY,
            enrolled_face_id bigint NOT NULL,
            employee_id int NOT NULL,
            location_id int NOT NULL,
            allowed_sites bigint[] NOT NULL,
            purpose VARCHAR(100) NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()           
        );`
    }

    static async createVisit(data : any) {
        return visitation.create({
            data: {
                purpose: data.purpose,
                enrolled_face: {
                    connect: {id: data.enrolled_face_id}
                },
                employee: {
                    connect: {id: data.employee_id}
                },
                location: {
                    connect: {id: data.location_id}
                },
                created_at: new Date(),
                allowed_sites: data.allowed_sites
            }
        })
    }

    static async getAllVisits(limit : number, page : number, search? : string, searchBy? : string) {
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
                enrolled_face: {
                    select: {id: true, name: true, identity_number: true}
                },
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
                    select: {name: true}
                },
                location: {
                    select: {name: true}
                },
                allowed_sites: true,
                created_at: true,
            }
        });
    }

    static async getByEnrolledFaceId(id : number) {
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
                created_at: true,
            }
        })
    }
}
