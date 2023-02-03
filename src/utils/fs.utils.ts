import fs from "fs";

export async function fsUnlink(path : string) : Promise<boolean> {
    return new Promise((resolve, reject) => {
        fs.unlink(path, (err) => {
            if (err) reject(err);
            resolve(true)
        })
    })
}