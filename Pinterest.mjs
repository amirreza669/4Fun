import { Pinterest } from '@pengoose/pinterest';
import fs from "fs";
import axios from "axios";

const pinterest = new Pinterest({
    id:"amirreza09306690524",
    boardIds:""
});

async function getPinListByBoardId (boardId)  {

	try {
		const Board = await pinterest.getMyBoard(boardId);

	
		const pinsid = Board.pins.map((value)=> {
			return value.id
		})
	
		return pinsid;
	} catch (error) {
		console.error(error);
		
		return [];
	}
}

async function getPhotoAddress(pinId, boardId) {
	const Board = await pinterest.getMyBoard(boardId);

	const pinsAddressList =	Board.pins.filter((value)=> {
		if (value.id == pinId) {
			return true;
		}
	})

	return (pinsAddressList[0].images['564x'].url);
}



//download Image from pinterest
async function downloadPinImage(url, outputPath) {
	return new Promise(async (resolve,reject) =>{
		try {
			const response = await axios({
			  url, // Image URL
			  method: 'GET',
			  responseType: 'stream', // Get the response as a stream
			});
		
			// Save the image to the specified output path
			const writer = fs.createWriteStream(outputPath);
		
			response.data.pipe(writer);
		
			writer.on('finish', () => {
			  console.log('Download completed!');
			  resolve();
			});
		
			writer.on('error', (error) => {
			  console.error('Error writing the file', error);
			  reject('Error writing the file', error);
			});
		  } catch (error) {
			console.error('Error downloading the image', error);
		  }
	});
}


export default {
    getPhotoAddress,
    getPinListByBoardId,
    downloadPinImage
}