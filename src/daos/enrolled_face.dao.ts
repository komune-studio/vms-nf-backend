import PrismaService from "../services/prisma.service"
import moment from "moment";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const enrolledFace = prisma.enrolled_face;

export default class EnrolledFaceDAO {
    static async getAll(limit : number, page : number, search : string, status : string, active : boolean = true, ids? : number[], startDate? : string, endDate? : string, startTime? : string, endTime? : string, gender? : string, age? : string, formId?: string) {
        const enumerateDaysBetweenDates = (startDate : String, endDate : String) => {
            let date = []

            // @ts-ignore
            while(moment(startDate) <= moment(endDate)){
                date.push(startDate);
                // @ts-ignore
                startDate = moment(startDate).add(1, 'days').format("YYYY-MM-DD");
            }
            return date;
        }

        let whereDateClause = {}

        if(startDate && endDate) {
            whereDateClause = {
                OR: enumerateDaysBetweenDates(startDate, endDate).map(date => {
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

        if(age) {
            const year = moment().subtract(parseInt(age), 'year').format('YYYY');

            whereDOBClause = {
                AND: [
                    {birth_date: {gte: `${year}-01-01T00:00:00Z`}},
                    {birth_date: {lte: `${year}-12-31T23:59:59Z`}},
                ]
            }
        }

        let whereFormIdClause = {};

        if(formId) {
            whereFormIdClause = {
                additional_info: {
                    path: ['form_id'],
                    equals: parseInt(formId)
                }
            }
        }

        let result = enrolledFace.findMany({
            orderBy: {
                created_at: 'desc'
            },
            skip: page && limit ? (page - 1) * limit : undefined,
            take: limit ? limit : undefined,
            where: {
                id: ids ? {in: ids} : undefined,
                name: {
                    contains: search,
                    mode: 'insensitive'
                },
                status: {
                    equals: status
                },
                deleted_at: {equals: null},
                gender: gender ? gender : undefined,
                ...whereDateClause,
                ...whereDOBClause,
                ...whereFormIdClause

            },
        });

        return result;
    }

    static async getCount(search : string, status : string, active : boolean = true, ids? : number[], startDate? : string, endDate? : string, startTime? : string, endTime? : string, gender? : string, age? : string, formId? : string) {
        const enumerateDaysBetweenDates = (startDate : String, endDate : String) => {
            let date = []

            // @ts-ignore
            while(moment(startDate) <= moment(endDate)){
                date.push(startDate);
                // @ts-ignore
                startDate = moment(startDate).add(1, 'days').format("YYYY-MM-DD");
            }
            return date;
        }

        let whereDateClause = {}

        if(startDate && endDate) {
            whereDateClause = {
                OR: enumerateDaysBetweenDates(startDate, endDate).map(date => {
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

        if(age) {
            const year = moment().subtract(parseInt(age), 'year').format('YYYY');

            whereDOBClause = {
                AND: [
                    {birth_date: {gte: `${year}-01-01T00:00:00Z`}},
                    {birth_date: {lte: `${year}-12-31T23:59:59Z`}},
                ]
            }
        }

        let whereFormIdClause = {};

        if(formId) {
            whereFormIdClause = {
                additional_info: {
                    path: ['form_id'],
                    equals: parseInt(formId)
                }
            }
        }

        let result = enrolledFace.aggregate({
            _count: {id: true},
            where: {
                id: ids ? {in: ids} : undefined,
                name: {
                    contains: search,
                    mode: 'insensitive'
                },
                status: {
                    equals: status
                },
                deleted_at:  {equals: null},
                gender: gender ? gender : undefined,
                ...whereDateClause,
                ...whereDOBClause,
                ...whereFormIdClause
            },
        });

        return result;
    }

    static async getByFaceId(id : string) {
        const faceId = BigInt(id);

        let result = enrolledFace.findFirst({
            where: {
                face_id: faceId
            }
        });

        return result;
    }

    static async getByIdentityNumber(identityNo : string) {
        let result = enrolledFace.findFirst({
            where: {
                identity_number: identityNo
            }
        });

        return result;
    }

    static async getExpiredFaceId() {
        //enrollment only valid in the same day when they register
        const sql = `SELECT id FROM enrolled_face WHERE deleted_at IS NULL AND created_at < current_date AND status != 'BLACKLIST' ORDER BY id ASC;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async recover(id : number) {
        let result = enrolledFace.update({
            where: {
                id
            },
            data: {deleted_at: null}
        });

        return result;
    }

    static async whitelist(id : number) {
        let result = enrolledFace.update({
            where: {
                id
            },
            data: {status: 'WHITELIST', deleted_at: null}
        });

        return result;
    }

    static async blacklist(id : number) {
        let result = enrolledFace.update({
            where: {
                id
            },
            data: {status: 'BLACKLIST', deleted_at: null}
        });

        return result;
    }
    static async unblacklist(id : number) {
        let result = enrolledFace.update({
            where: {
                id
            },
            data: {status: 'VISITOR', deleted_at: null}
        });

        return result;
    }

    static async addAdditionalInfoColumn() {
        //enrollment only valid in the same day when they register
        const sql = `ALTER TABLE enrolled_face ADD COLUMN IF NOT EXISTS additional_info JSONB default '{}';`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAdditionaInfo(id : number) {
        let result = enrolledFace.findFirst({
            select: {
                additional_info: true
            },
            where: {
                id
            },
        });

        return result;
    }

    static async updateAdditionalInfo(id : number, additionalInfo: any) {
        let result = enrolledFace.update({
            where: {
                id
            },
            data: {additional_info: JSON.parse(additionalInfo)}
        });

        return result;
    }
}
