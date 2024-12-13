import { expect } from "chai";
import db from "../db.mjs";
import { _db, client } from "../db.mjs";
import { faker } from "@faker-js/faker";

const testChannelData = {
    
    chatId: Number(faker.number.int()),
    title: faker.person.firstName()
}

db.initDb("telegram_bot_test")
const test_db = _db 


describe("chat member test",async ()=>{

    it("should write correct channel data from data base", async () => {

        expect(await db.addChannel(testChannelData));

        const coll = test_db.collection("channel_member");
        const {chatId,title} = await coll.findOneAndDelete(testChannelData);
        
        expect({chatId,title}).to.deep.equals(testChannelData);

    })

    it("return true if exist channel", async () => {
        
        expect(await db.addChannel(testChannelData));
        expect(await db.channelExist(testChannelData.chatId)).to.be.true;
        
        //remove test data
        const coll = test_db.collection("channel_member");
        await coll.deleteOne(testChannelData);
    })

    it("return a list of all channel id", async () => {
        await db.addChannel(testChannelData)
        const result = await db.getAllChannelId();

        result.forEach(element => {
            expect(element).to.be.an("object")
            expect(element).to.include.keys(["chatId","title"])
        });

        const coll = test_db.collection("channel_member");
        await coll.deleteOne(testChannelData);
    })

    it("test delete channel id from dataBase ", async () => {
        await db.addChannel(testChannelData)

        expect(await db.channelExist(testChannelData.chatId)).to.be.true;
        
        expect(await db.deleteChannelId(testChannelData.chatId));

        expect(await db.channelExist(testChannelData.chatId)).to.be.false;

        const coll = test_db.collection("channel_member");
        await coll.deleteOne(testChannelData);

    })
})

const pinIdList_testData = []

for (let index = 0; index < 100; index++) {
    pinIdList_testData[index] = faker.number.int();
}

describe("pins Id list test", async () =>{
    it("add pin id list and check this list for duplicate id",async ()=>{
    
        expect(await db.putPinId( testChannelData.chatId, pinIdList_testData))

        let test_data = []

        for (let index = 0; index < 99; index++) {
            test_data[Math.round(Math.random() * 99)] = pinIdList_testData[index] 
        }

        expect(await db.putPinId( testChannelData.chatId, test_data))
        expect(await db.putPinId( testChannelData.chatId, test_data))
        expect(await db.putPinId( testChannelData.chatId, test_data))
        expect(await db.putPinId( testChannelData.chatId, test_data))
        expect(await db.putPinId( testChannelData.chatId, test_data))


        const coll = _db.collection("pinIdList");

        let readData = {chatId: testChannelData.chatId, pins:[]}

        readData = await coll.find({chatId:testChannelData.chatId}).toArray()

        expect(readData.length).to.be.lessThanOrEqual(1)

        coll.deleteMany({}); //delete test data
    })

    it("check exist pinIds in collection", async () =>{
        expect(await db.putPinId( testChannelData.chatId, pinIdList_testData))
        const result = await db.IsPinIdExist(testChannelData.chatId, pinIdList_testData.slice(12,22))
        expect(result).to.be.true

        const coll = _db.collection("pinIdList");

        coll.deleteMany({});
    })
})
