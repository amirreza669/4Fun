import { Db, MongoClient } from "mongodb";
import dotenv from "dotenv"


dotenv.config();


const conString = process.env.MONGODB_URI

const client = new MongoClient(conString);

await client.connect();

let _db = client.db(process.env.MONGODB_NAME);

async function initDb(dbName) {
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
async function putPinId(channelAdminId,boardId, pins) {
    if (!channelAdminId) {
        throw "chat id not found";
    }

    if (!pins) {
        throw "pins not found";
    }

    const collection = _db.collection("pinIdList");


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

    const data = await collection.findOne({channelAdminId});

    // if not exist a pinList create it
    if (data == null) {
        const insertResult = await collection.insertOne({channelAdminId, username, boardId, pins:[]})
        return;
    }

    await collection.updateOne({channelAdminId}, {$set: {boardId, username}});
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

async function setPlayList(channelAdminId, playlistId) {
    const collection = _db.collection("playList");
    const data = await collection.findOne({playlistId});

    // if not exist a pinList create it
    if (data == null) {
        const insertResult = await collection.insertOne({channelAdminId, playlistId, videoIds:[]})
        return;
    }

    await collection.updateOne({channelAdminId}, {$set: {playlistId}});
}

async function getPlayListByAdminId(channelAdminId) {
    const collection = _db.collection("playList");
    const result = await collection.findOne({channelAdminId})
    
    return result;
    
}

async function putVideoId(channelAdminId,playlistId, videoIds) {
    if (!channelAdminId) {
        throw "chat id not found";
    }

    if (!videoIds) {
        throw "videoIds not found";
    }

    const collection = _db.collection("playList");


    const filter = {
        channelAdminId,
        playlistId
    }

    const update = {
        $addToSet:{
            videoIds: {
                $each:videoIds
            }
        }
    }

    try {
        await collection.updateOne(filter, update)
    } catch (error) {
        console.error(error);
    }
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
    getBoardByAdminId,
    setPlayList,
    getPlayListByAdminId,
    putVideoId
}

export default db;

export {
    _db,
    client
}
