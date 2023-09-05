let slave = ["b", "c", "d"]
let master = ["a", "f", "g"]
let deleteFromDB = []
let pushToDB = []

slave.forEach(slaveId => {
    if(!master.includes(slaveId)) {
        pushToDB.push(slaveId)
    }
})

master.forEach(masterId => {
    if(!slave.includes(masterId)) {
        deleteFromDB.push(masterId)
    }
})

console.log('deleteFromDB', deleteFromDB)
console.log('pushToDB', pushToDB)
