
import { youtube } from "@googleapis/youtube";
import fs from "fs";
import path from "path";
import {spawn} from 'child_process'
import dotenv from "dotenv"

dotenv.config();

const API_KEY = process.env.YOUTUBE_API_KEY // youtube
const music_dir = './music_Download'

const YouTube = youtube({version:'v3', auth:API_KEY})

async function getPlaylistItems(playlistId) {
    try {
      const response = await YouTube.playlistItems.list({
        part: 'snippet',
        playlistId: playlistId,
        maxResults: 50, // Fetch up to 50 items in one request
      });
  
      const items = response.data.items;
      let videoIdList=[]
  
      items.forEach((item, index) => {
        videoIdList.push(item.snippet.resourceId.videoId)
      });
  
      return videoIdList;
    } catch (error) {
      console.error('Error fetching playlist items:', error.response?.data || error.message);
    }
}

function youTube_dl(video_id, chatId) {

  return new Promise((resolve)=>{
    const child = spawn('yt-dlp', [video_id , '-x', '-P', music_dir, '--audio-format', 'mp3', '-o', `%(title)s [%(id)s] [${chatId}].%(ext)s`]);

    child.stdout.on('data', (data) => console.log(data.toString('utf-8')));
    child.stderr.on('data', (data) => console.error(data.toString('utf-8')));
    
    child.on('close', (code) => {
      if (code != 0) 
        resolve(false);
      else
        resolve(true);
    });

  })

}

async function findFileByIdRecursive(id, chatId) {
  let result = null; // Variable to store the file path
  const files = fs.readdirSync(music_dir); // Read all items in the directory

  for (const file of files) {
      const fullPath = path.join(music_dir, file);

      if (file.includes(id) && file.includes(chatId.toString())) {
          // If the file contains the ID, return its path
          result = fullPath;
          break;
      }
  }

  return result;
}

export default {
    getPlaylistItems,
    youTube_dl,
    findFileByIdRecursive
}