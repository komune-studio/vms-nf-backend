import { PrismaClient } from "@prisma/client";

export default class PrismaService {

    private static instance : PrismaClient;

    static getInstance() {
        if (this.instance === undefined) {
            console.log("Initializing new Prisma Client instance.");            
            this.instance = new PrismaClient();
            console.log("Prisma Client instance initialized.");            
        }

        return this.instance;
    }

}