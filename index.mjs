// import Crawler from "crawler";
import TelegramBot from "node-telegram-bot-api";
import db from "./db.mjs";
import youtube from "./youtubeApi.mjs";
import fs from "fs";
import dotenv from "dotenv"
import pinterest from "./Pinterest.mjs";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const administrator_Username = process.env.TELEGRAM_ADMIN_ID




// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(token, { polling: true });

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
			case "/set_board":
				bot.sendMessage(chatId,"wait for Pinterest Board ID \n Format: [Username] [BoardId]");
				botMemory[chatId] = "GetBoardID";
				break
			case "/set_playlist":
				bot.sendMessage(chatId,"wait for YouTube PlayList ID \n Format: [PlayList]");
				botMemory[chatId] = "GetPlayListID";
				break
		
			default:

				// if wait for a planed message
				if(botMemory[chatId])
					switch (botMemory[chatId]) {
						case "GetBoardID":
							// TODO : validate Board Id
							const [username, boardId] = text.split(" ");
							db.setBoardId(chatId, username, boardId)
							console.log(text);
							botMemory[chatId] = null;
							break;
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

		const {channelAdminId, username, chatId}  = channel;


		const pinterestTreadHolder = new Promise(async (resolve, reject) => {

			const getBoardsResult = await db.getBoardByAdminId(channelAdminId);

			if(getBoardsResult == null){
				console.log("cant find Board");
				
				resolve();
				return;
			}

			const {boardId, pins} = getBoardsResult;
	
			const responsePinList = await pinterest.getPinListByBoardId(boardId);
			const dataBasePinList = pins;
	
			const notDownloadedPins = responsePinList.filter(value => !dataBasePinList.includes(value));
			
			if(notDownloadedPins.length > 0)
				console.log("detect a new not downloaded pin");
			else
				resolve(); // not need to continue
			
			for (let index = 0; index < notDownloadedPins.length; index++) {
	
				const notDownloadedPin = notDownloadedPins[index];
	
				const imageAddress = await pinterest.getPhotoAddress(notDownloadedPin, boardId);
	
				const pin_Path = `pins_Download/${notDownloadedPin}.png`;
				try {
					await pinterest.downloadPinImage(imageAddress, pin_Path);
				} catch (error) {
					console.error("cant download photo from pinterest", error);
				}
				
				https://uk.pinterest.com/pin/308355905754983027/
				try {
					await bot.sendPhoto(chatId, pin_Path, {caption:`[📌Pinterest](https://pinterest.com/pin/${notDownloadedPin}`, parse_mode:"Markdown"});
					// add not downloaded pin to Downloaded list
					db.putPinId(channelAdminId, boardId, [notDownloadedPin]); 
				} catch (error) {
					console.error("cant upload photo to telegram", error);
				}
			}

			resolve();
		});

		// add new Promise
		promises.push(pinterestTreadHolder);

		// for youtube
		
		const youTubeTreadHolder = new Promise(async (resolve, reject) => {
			
			const getPlayListResult = await db.getPlayListByAdminId(channelAdminId);

			if(getPlayListResult == null){
				console.log("cant find PlayList");
				
				resolve();
				return;
			}

			const {playlistId, videoIds} = getPlayListResult;
	
			const responseList = await youtube.getPlaylistItems(playlistId);
			const dataBaseList = videoIds;
	
			const notDownloadedVideos = responseList.filter(value => !dataBaseList.includes(value));
			
			if(notDownloadedVideos.length > 0)
				console.log("detect a new not downloaded pin");
			else	
				resolve(); // not need to continue
			
			for (let index = 0; index < notDownloadedVideos.length; index++) {
	
				const notDownloadedVideo = notDownloadedVideos[index];

				const youTube_dl_result = await youtube.youTube_dl(notDownloadedVideo, chatId);
				
				// if (!youTube_dl_result) {
				// 	console.log("cant download music ignore this video");
				// 	await db.putVideoId(channelAdminId, playlistId, [notDownloadedVideo]);	
				// }

				const path = await youtube.findFileByIdRecursive(notDownloadedVideo, chatId);

				try {
					if (path != null) {

						const readStream = fs.createReadStream(path);
						
						await bot.sendAudio(chatId, readStream);
						await db.putVideoId(channelAdminId, playlistId, [notDownloadedVideo]);	
					} else {
						console.log("don't find music");
					}
				} catch (error) {
					console.error('cant upload music');
				}
			}

			resolve();
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
			}).catch(() => { throw("error in polling") })
			console.log("poll");

	}, interval);
}

StartCheckBoards(10000)
