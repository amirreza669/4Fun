import dotenv from "dotenv"
import Database from 'better-sqlite3';



dotenv.config();


const conString = process.env.SQL_LITE_CON

const _db = new Database("telegram_bot_db.db", {verbose: (message, ...additionalArgs) => console.log('[DBlog]', message, ...additionalArgs)});


//create tables if not exist
async function initDb() {

    _db.exec(`
        CREATE TABLE IF NOT EXISTS "channel_member" (
        "chatId"	TEXT,
        "channelAdminId"	TEXT,
        "title"	TEXT)
        `);

    _db.exec(`
        CREATE TABLE IF NOT EXISTS "playList" (
            "yt_playlist_id"	TEXT,
            "channelAdminId"	TEXT,
            "videoIds"	TEXT)
        `);

        _db.exec(`
            CREATE TABLE IF NOT EXISTS "yt_playList" (
                "yt_playlist_id"	TEXT,
                "id"	INTEGER NOT NULL UNIQUE,
                "channelAdminId"	TEXT,
            PRIMARY KEY("id" AUTOINCREMENT))
        `);

}

async function channelExist(channelId) {
    const stm = _db.prepare("SELECT * from channel_member WHERE chatId = '?';");
    const rows = stm.all(channelId);
    
    if (rows.length == 0) {
        return true;

    } else {
        return false;

    }
}

async function addChannel({channelAdminId, chatId, title}){
    const stm = _db.prepare("INSERT INTO channel_member(channelAdminId, chatId, title) VALUES(?,?,?);");
    stm.run(channelAdminId, chatId, title);
}

async function getAllChannelId() {
    const stm = _db.prepare("SELECT * from channel_member;");
    const rows = stm.all();

    return rows;
}

async function deleteChannelId(db, chatId) {
  if (!chatId) {
    console.log("[sqldb]", "chat id channel id is null");
    return;
  }

  try {
    const result = await runAsync(
      db,
      `DELETE FROM channel_member WHERE chat_id = ?`,
      [chatId]
    );

    // Optional: check if something was deleted
    // result.changes shows how many rows were removed
    if (result.changes === 0) {
      console.warn(`No channel_member row found for chatId=${chatId}`);
    }
  } catch (error) {
    console.error("Failed to delete channel_member:", error);
    throw error;
  }
}

async function getPins(channelAdminId) {
    const collection = _db.collection("pinIdList");
    const result = await collection.findOne({channelAdminId});

    const pinIdList = result.pins;

    return pinIdList;
}

async function setPlayList(channelAdminId, playlistId) {

    const stm_update = _db.prepare("UPDATE yt_playList SET yt_playlist_id=? WHERE channelAdminId=?;");
    const stm_insert = _db.prepare("INSERT INTO yt_playList(yt_playList_id, channelAdminId) VALUES(?,?);");
    const stm_select = _db.prepare("SELECT * FROM yt_playList WHERE yt_playlist_id=?;");
    const stm_find_channel_admin = _db.prepare("SELECT * FROM channel_member WHERE channelAdminId=?;");


    const data = await stm_select.get(playlistId);
    let chatIds = await stm_find_channel_admin.get(channelAdminId);

    console.log(chatIds);
    

    if (!chatIds) {
        console.error("this user not found")
        return;
    }

    if (chatIds.length == 0) {
        console.error("this user not found")
        return;
    }
    

    // if not exist a pinList create it
    if (!data) {
        stm_insert.run(playlistId, channelAdminId);  
        return;
    }

    stm_update.run(playlistId, channelAdminId);
    
}

async function getPlayListIdByAdminId(channelAdminId) {
    const stm = _db.prepare("SELECT (yt_playlist_id) FROM yt_playList WHERE channelAdminId=?");

    if (!channelAdminId) {
        console.log('[sqldb]', 'channelAdminId is invalid');
        return undefined;
    }

    const result = stm.get(channelAdminId);
    
    if (result) {
        return result.yt_playlist_id;
    }

    return null;
}

async function getVideoIds(yt_playList_id, channel_admin_id) {
    const stm = _db.prepare("SELECT * FROM playList WHERE channelAdminId=? and yt_playlist_id=?")
    const result = stm.all(channel_admin_id ,yt_playList_id);
    if (result) {
        return result.map((item)=> item.videoIds);
    }
    
    return null;
}


async function putVideoId(channelAdminId, playlistId, videoId) {
  if (!channelAdminId) {
    console.log("channelAdminId not found");
    return;
  }

  if (!playlistId) {
    console.log("playlistId not found");
    return;

  }

  if (!videoId) {
    console.log("videoIds not found");
    return;
  }

  // Ensure we always work with an array

  const stm = _db.prepare('INSERT OR IGNORE INTO playList (channelAdminId, yt_playlist_id, videoIds) VALUES (?, ?, ?)');

 
    stm.run(channelAdminId, playlistId, videoId);

}


const db = {
    initDb,
    addChannel,
    channelExist,
    getAllChannelId,
    deleteChannelId,
    getPins,
    setPlayList,
    getPlayListIdByAdminId,
    putVideoId,
    getVideoIds
}

export default db;

export {
    _db
}
