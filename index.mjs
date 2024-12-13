// import Crawler from "crawler";
import TelegramBot from "node-telegram-bot-api";
import db from "./db.mjs";
import { faker } from '@faker-js/faker';
import axios, { all } from "axios";
import { getPlaylistItems } from "./youtubeApi.mjs";
import ytdl from 'ytdl-core';
import fs from "fs";
import { spawn } from "child_process";
import pinterest from "./Pinterest.mjs";
import { ChangeStream } from "mongodb";
import { resolve } from "path";
import { promises } from "dns";


// Replace 'YOUR_API_TOKEN' with the token you got from BotFather
const token = "7750721310:AAGOhlZCDjbbkkbBD2x8vcqkaME0FB_xeiA"; // telegram token
const administrator_Username = "amirrezadev"
const playlistId = 'PL1COQt23iaay_amY3yhRxS5od1ElhLDWM'; // Replace with the YouTube playlist ID
const pintrest_key = 'pina_AMARABYXAD7L4AIAGDAFMCSVRMG2FEYBQBIQCDM6PDR7VDPT6PWX6GB47TDKPFDCK5BOUHMFGST3SI2B55Y7R5UQ7RUWIWQA'




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
		//process command
		switch (text) {
			case "/start":
				bot.sendMessage(chatId,"Hello Boss");
				break;
			case "/set_board":
				bot.sendMessage(chatId,"wait for Pinterest Board ID \n Format: [Username] [BoardId]");
				botMemory[chatId] = "GetBoardID";
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
					}
				else {
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


async function youTube_dl(video_id) {
  const child = spawn('youtube-dl.exe', [video_id]);

  child.stdout.on('data', (data)=> console.log(data.toString('utf-8')));
  child.stderr.on('data',  (data)=> console.log(data.toString('utf-8')));

  child.on('exit',()=>{
    if (index) {
      dl(videoIdList[index--])
    }
  })
}

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

		const temp = new Promise(async (resolve, reject) => {

			const {channelAdminId, chatId}  = channel;

			const {username /*pinterest username*/, boardId, pins} = await db.getBoardByAdminId(channelAdminId);
	
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
				
	
				try {
					await bot.sendPhoto(chatId, pin_Path);
					// add not downloaded pin to Downloaded list
					db.putPinId(channelAdminId, username, boardId, [notDownloadedPin]); 
				} catch (error) {
					console.error("cant upload photo to telegram", error);
				}
			}

			resolve();
		});

		// add new Promise
		promises.push(temp);

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
			}).catch(() => {throw("error in polling")})
			console.log("poll");
			
		
	}, interval);

	
}

StartCheckBoards(10000)

// const pinIds = await getPinListId('special');
// for (let index = 0; index < pinIds.length; index++) {
// 	const pinAddress = await getPhotoAddress(pinIds[index], 'special');
// 	downloadImage(pinAddress, `./pins_Download/${pinIds[index]}.png`)
// }

// const channels = await db.getAllChannelId();

// bot.sendPhoto(channels[0].chatId,"./pins_Download/744993963392567534.png")
