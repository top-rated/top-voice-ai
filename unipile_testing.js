const { UnipileClient } = require("unipile-node-sdk")
const dotenv = require("dotenv")
const fs = require('fs')
const {processLinkedInQuery} = require("./src/chatbot/linkedin_chatbot")


dotenv.config()
const BASE_URL = process.env.UNIPILE_BASE_URL
const ACCESS_TOKEN = process.env.UNIPILE_ACCESS_TOKEN
clearTimeout
async function getAllAccounts() {
    try {
        const client = new UnipileClient(BASE_URL, ACCESS_TOKEN)
        const response = await client.account.getAll()
        
        
        console.log(JSON.stringify(response, null, 2))
        //save to accounts outputs json file
        await fs.writeFileSync('accounts.json', JSON.stringify(response, null, 2))
        console.log('Accounts saved to accounts.json')
    } catch (error) {
        console.error('Error:', error)
    }
}

async function listAllChats() {
    try {
        const client = new UnipileClient(BASE_URL, ACCESS_TOKEN)
    
        const response = await client.messaging.getAllChats()
        console.log(JSON.stringify(response, null, 2))

        await fs.writeFileSync('chats.json', JSON.stringify(response, null, 2))
        console.log('Chats saved to chats.json')
    } catch (error) {
        console.error('Error:', error)
    }
}
    
async function listAllMessagesFromChat(chat_id) {
    try {
        const client = new UnipileClient(BASE_URL, ACCESS_TOKEN)
    
        const response = await client.messaging.getAllMessagesFromChat({
            chat_id,
        })
        console.log(JSON.stringify(response, null, 2))
        await fs.writeFileSync('messages.json', JSON.stringify(response, null, 2))
        console.log('Messages saved to messages.json')
    } catch (error) {
        console.error('Error:', error)
    }
    
}


async function sendMessageInChat(chat_id, text){
    try {
        const client = new UnipileClient(BASE_URL, ACCESS_TOKEN)
    
        const response = await client.messaging.sendMessage({
            chat_id,
            text,
        })
        console.log(JSON.stringify(response, null, 2))
        await fs.writeFileSync('messages.json', JSON.stringify(response, null, 2))
        console.log('Messages saved to messages.json')
    } catch (error) {
        console.error('Error:', error)
    }
    
}


// getAllAccounts()
// listAllChats()
// listAllChats()
// listAllMessagesFromChat("vWIqdTEbUjCRg7nincYhcA")

sendMessageInChat("zP17i55xVRmFWP2mquvyNw", "Hello, This is Test Message")



// async function processLinkedInQueryTest() {
//     await processLinkedInQuery("42", "Hello")

// }

// processLinkedInQueryTest()