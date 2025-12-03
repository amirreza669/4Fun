// import Crawler from "crawler";
import youtube from "./youtubeApi.mjs";
import fs from "fs";
import dotenv from "dotenv"
import db  from "./sqldb.mjs"

dotenv.config();

import TelegramBot from "node-telegram-bot-api";

const token = process.env.TELEGRAM_BOT_TOKEN;
const administrator_Username = process.env.TELEGRAM_ADMIN_ID



db.initDb();

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true, });

// Listen for any message
bot.on('channel_post', async (msg) => {
    const chatId = msg.chat.id;
    console.log(chatId);
    
    // Respond to the message
    // bot.sendMessage(chatId, `Hello, ${msg.from.first_name}! You said: "${msg.text}"`);
});

bot.on('my_chat_member', async (msg) => {
    const{chat, old_chat_member, new_chat_member } = msg;
	const channelAdminId = msg.from.id;
	
    
    if (chat.type == "channel" && new_chat_member.status == "administrator") {
        console.log("added to :", chat); 
        db.addChannel({channelAdminId, chatId: chat.id, title: chat.title});

    } else if (chat.type == "channel" && new_chat_member.status == "left") {
        console.log("kicked from :", chat); 
        db.deleteChannelId(chat.id) 
    }

});

let botMemory = {};

bot.on("message", async (message)=>{
	const chatId = message.chat.id;
	const username = message.from.username;
	const text     =  message.text;


	if (username == administrator_Username) {
		//process command.
		switch (text) {
			case "/start":
				bot.sendMessage(chatId,"Hello Boss");
				break;
			case "/set_playlist":
				bot.sendMessage(chatId,"wait for YouTube PlayList ID \n Format: [PlayList]");
				botMemory[chatId] = "GetPlayListID";
				break
		
			default:

				// if wait for a planed message
				if(botMemory[chatId])
					switch (botMemory[chatId]) {
						case "GetPlayListID":
							// TODO : validate playlist Id
							const playListId = text
							db.setPlayList(chatId,playListId);
							console.log(text);
							botMemory[chatId] = null;
							break;
					}else {
						botMemory[chatId] = null;
						bot.sendMessage(chatId, "undefined Command");
					}
					
				break; // end of command switch
		}

		// do some thing
	} else {
		bot.sendMessage(chatId, "your not access to this bot pleas message to @" + administrator_Username)
	} 
})

bot.on('polling_error', (error) => {
    console.log(error);  // => 'EFATAL'
});

console.log("Bot is running...");



async function poll () {

	const allChannelId = await db.getAllChannelId();

	if (allChannelId.length == 0) {
		console.log("dont any channel exist");
		return;
	}

	if (!Array.isArray(allChannelId)) 
		return;

	let promises = [];
	
	allChannelId.forEach(channel => {

		const {channelAdminId, chatId}  = channel;

		// for youtube
		
		const youTubeTreadHolder = new Promise(async (resolve, reject) => {
			
			const playlist_id = await db.getPlayListIdByAdminId(channelAdminId);

			if(playlist_id == null){
				console.log("cant find PlayList");
				
				resolve();
				return;
			}

	
			const yt_PlayList = await youtube.getPlaylistItems(playlist_id);
			const LocalPlayList = await db.getVideoIds(playlist_id, channelAdminId);
	
			if (!LocalPlayList) {
				resolve();
				return;

			}

			const notDownloadedVideos = yt_PlayList.filter(value => {
				return !LocalPlayList.includes(value)
			});
			
			if(notDownloadedVideos.length > 0)
				console.log("detect a new not downloaded pin");
			else{
				resolve(); // not need to continue
				return;
			}

			
			for (let index = 0; index < notDownloadedVideos.length; index++) {
	
				const notDownloadedVideo = notDownloadedVideos[index];

				const youTube_dl_result = await youtube.youTube_dl(notDownloadedVideo, chatId);
				
				// if (!youTube_dl_result) {
				// 	console.log("cant download music ignore this video");
				// 	await db.putVideoId(channelAdminId, playlistId, [notDownloadedVideo]);	
				// }

				const path = await youtube.findFileByIdRecursive(notDownloadedVideo, chatId);

				try {

					//upload telegram
					if (path != null) {

						const readStream = fs.createReadStream(path);
						
						const fileOptions = {
							// Explicitly specify the MIME type.
							contentType: 'audio/mpeg',
						};

						await bot.sendAudio(chatId, readStream,fileOptions);

						db.putVideoId(channelAdminId, playlist_id, notDownloadedVideo);	

					} else {
						console.log("don't find music for upload");
					}

				} catch (error) {
					console.error('cant upload music');
				}
			}

			resolve();
			return;
		});

		// add new Promise
		promises.push(youTubeTreadHolder);

	});
	
	// this is for concurrency for all channel
	return Promise.all(promises);
}

async function StartCheckBoards(interval) {
	let lock = false;

	setInterval(() => {
		if (lock) 
			return
		
		lock = true;
			poll().then(()=>{

			}).finally(()=>{
				lock = false;
			}).catch((error) => {
				 console.error(error);
			})
			console.log("poll");

	}, interval);
}

StartCheckBoards(10000)
