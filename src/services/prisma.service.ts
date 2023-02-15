import { PrismaClient as Visionaire } from "../prisma/nfvisionaire"
import { PrismaClient as NFV4 } from "../prisma/nfv4"

export default class PrismaService {

    private static visionaireInstance : Visionaire;
    private static nfv4Instance : NFV4;

    static initialize() {
        if (this.visionaireInstance === undefined) {
            console.log("Initializing new Prisma Client (NF Visionaire) instance.");
            this.visionaireInstance = new Visionaire();
            console.log("Prisma Client (NF Visionaire) instance initialized.");
        }
        else {
            console.log("Prisma Client (NF Visionaire) instance already initialized.");
        }

        if (this.nfv4Instance === undefined) {
            console.log("Initializing new Prisma Client (NFV4) instance.");
            this.nfv4Instance = new NFV4();
            console.log("Prisma Client (NFV4) instance initialized.");
        }
        else {
            console.log("Prisma Client (NFV4) instance already initialized.");
        }
    }

    static getVisionaire() {
        if (this.visionaireInstance === undefined) {
            this.initialize()
        }
        return this.visionaireInstance;
    }
    
    static getNFV4() {
        if (this.nfv4Instance === undefined) {
            this.initialize()
        }
        return this.nfv4Instance;
    }

}