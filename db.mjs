import { Db, MongoClient } from "mongodb";

const conString = "mongodb://localhost:27017"

const client = new MongoClient(conString);

await client.connect();

let _db = client.db("telegram_bot");

async function initDb(dbName = "telegram_bot") {
    _db =  client.db(dbName);
}

async function channelExist(channelId) {
    const collection = _db.collection("channel_member");
    
    let filter = new Object();
    filter.chatId = channelId;

    const result  = await collection.findOne({chatId: channelId});
    
    if (result?.chatId == channelId) 
        return true;
    else 
        return false;
}

async function addChannel({channelAdminId, chatId, title}){
    const collection = _db.collection("channel_member");
    await collection.insertOne({
        channelAdminId,
        chatId,
        title
    });
}

async function getAllChannelId() {
    const collection = _db.collection("channel_member");
    return collection.find({}).toArray();
}

async function deleteChannelId(chatId) {
    const collection = _db.collection("channel_member");
    collection.deleteOne({chatId})
}

//TODO: separate tow function 1. add pin 2. add board
async function putPinId(channelAdminId, username, boardId, pins) {
    if (!channelAdminId) {
        throw "chat id not found";
        
    }

    if (!pins) {
        throw "pins not found";
        
    }

    const collection = _db.collection("pinIdList");

    const data = await collection.findOne({channelAdminId});

    if (data == null) {
        const insertResult = await collection.insertOne({channelAdminId, username, boardId, pins})
    }

    const filter = {
        channelAdminId,
        boardId
    }

    const update = {
        $addToSet:{
            pins: {
                $each:pins
            }
        }
    }

    try {
        await collection.updateOne(filter, update)
    } catch (error) {
        console.error(error);
    }

}
async function setBoardId(channelAdminId, username, boardId) {
    const collection = _db.collection("pinIdList");

    //delete old board for this chat id
    await collection.deleteMany({channelAdminId});

    putPinId(channelAdminId, username, boardId, [/*empty pins*/])
}

async function IsPinIdExist(channelAdminId, pinIds){
    const collection = _db.collection("pinIdList");
    const result = collection.findOne({channelAdminId, pins:{$in:pinIds}})

    if (result) 
        return true;
    return false;
}

async function getBoardIds() {
    const collection = _db.collection("pinIdList");
    const result = await collection.find({}).toArray();
    
    return result;
}
async function getBoardByAdminId(channelAdminId) {
    const collection = _db.collection("pinIdList");
    const result = await collection.findOne({channelAdminId})
    
    return result;
}

async function getPins(channelAdminId) {
    const collection = _db.collection("pinIdList");
    const result = await collection.findOne({channelAdminId});

    const pinIdList = result.pins;

    return pinIdList;
}

const db = {
    initDb,
    addChannel,
    channelExist,
    getAllChannelId,
    deleteChannelId,
    putPinId,
    IsPinIdExist,
    setBoardId,
    getBoardIds,
    getPins,
    getBoardByAdminId
}

export default db;

export {
    _db,
    client
}
