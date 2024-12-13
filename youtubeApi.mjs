
import { youtube } from "@googleapis/youtube";

const API_KEY = 'AIzaSyDcgOMHrT8GCP37X2zdxPZLmacBV6IS5yg'; // youtube

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
  
      console.log(`Found ${items.length} items in the playlist:`);
      items.forEach((item, index) => {
        videoIdList.push(item.snippet.resourceId.videoId)
      });
  
      return videoIdList;
    } catch (error) {
      console.error('Error fetching playlist items:', error.response?.data || error.message);
    }
}

export {
    getPlaylistItems
}