import PrismaService from "../services/prisma.service";
import {NextFunction, Request, Response} from "express";
import UserDAO from "./user.dao";
import {ConflictError} from "../utils/error.utils";
import SecurityUtils from "../utils/security.utils";
import fs from "fs";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const detection = prisma.detection;

export default class DetectionDAO {
    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS detection (
            id SERIAL PRIMARY KEY,
             enrollment_id int NOT NULL,
              latitude decimal(10,7) NOT NULL,
              longitude decimal(10,7) NOT NULL,
              address varchar(500) DEFAULT NULL,
              report text,
              image bytea NOT NULL,
              user_id int,
              emotion varchar(50) DEFAULT NULL,
              associate_id int DEFAULT NULL,
              emotion_count json DEFAULT NULL,
              emotion_analysis json DEFAULT NULL,
              stream_name text,
              created_at timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );`
    }

    static async create(obj: any) {
        return detection.create({
            data: obj
        });
    }

    static async getAll(enrollmentId?: string, caseId?: string, search? : string, userId? : string, startDate? : string, endDate? : string, id? : string, page? : string, limit? : string) {
        return detection.findMany({
            skip: page && limit ? parseInt(page) * parseInt(limit) : undefined,
            take: limit ? parseInt(limit) : undefined,
            include: {
                enrolled_face: {
                    select: {name: true, identity_number: true, additional_info: true}
                },
                user: {
                    select: {name: true}
                }
            },
            where: {
                id: id ? parseInt(id) : undefined,
                created_at: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined
                },
                user_id: userId ? parseInt(userId) : undefined,
                enrollment_id: enrollmentId ? parseInt(enrollmentId) : undefined,
                enrolled_face: {
                    name: {
                      contains: search,
                      mode: 'insensitive'
                    },
                    additional_info: caseId ? {
                        path: ['case_id'],
                        equals: parseInt(caseId)
                    } : undefined
                }
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    }

    static async getCount(enrollmentId?: string, caseId?: string, search? : string, userId? : string, startDate? : string, endDate? : string, id? : string) {
        return detection.aggregate({
            _count: {id: true},
            where: {
                id: id ? parseInt(id) : undefined,
                created_at: {
                    gte: startDate ? new Date(startDate) : undefined,
                    lte: endDate ? new Date(endDate) : undefined
                },
                user_id: userId ? parseInt(userId) : undefined,
                enrollment_id: enrollmentId ? parseInt(enrollmentId) : undefined,
                enrolled_face: {
                    name: {
                        contains: search,
                        mode: 'insensitive'
                    },
                    additional_info: caseId ? {
                        path: ['case_id'],
                        equals: parseInt(caseId)
                    } : undefined
                }
            }
        });
    }

    static async getTopAssociates(enrollmentId : string) {
        return detection.groupBy({
            by: ['associate_id'],
            _count: {
                associate_id: true
            },
            where: {
              enrollment_id: parseInt(enrollmentId),
                associate_id: {not: null}
            },
            orderBy: {
                _count: {
                    associate_id: 'desc',
                }
            },
            take: 1
        });
    }

    static async getTopTarget() {
        return detection.groupBy({
            by: ['enrollment_id'],
            _count: {
                enrollment_id: true
            },
            orderBy: {
                _count: {
                    enrollment_id: 'desc',
                }
            },
            take: 5
        });
    }

    static async getDetectionDistribution() {
        const sql = `select DATE(created_at) as timestamp, count(*) as count from detection group by DATE(created_at) order by DATE(created_at) ASC LIMIT 10`

        return prisma.$queryRaw(Prisma.raw(sql))
    }
}
