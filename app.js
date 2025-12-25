const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require("@google/generative-ai");
const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient, Payload } = require('dialogflow-fulfillment');
const express = require("express");
const MODEL_NAME = "gemini-2.5-flash-lite";
const API_KEY = "AIzaSyBG4bU8yJIyCdNqYDpR_vyPokhkGUEX74Q";

async function runChat(queryText) {
    const genAI = new GoogleGenerativeAI(API_KEY);
    // console.log(genAI)
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    const generationConfig = {
        temperature: 1,
        topK: 0,
        topP: 0.95,
        maxOutputTokens: 100,
    };

    const chat = model.startChat({
        generationConfig,
        history: [
        ],
    });

    const result = await chat.sendMessage(queryText);
    const response = result.response;
    return response.text();
}

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.urlencoded({
    extended: true
}));
app.use(express.json());
app.use((req, res, next) => {
    console.log(`Path ${req.path} with Method ${req.method}`);
    next();
});
app.get('/', (req, res) => {
    res.send("Status Okay")
});

app.post('/dialogflow', async (req, res) => {

    var id = (res.req.body.session).substr(43);
    console.log(id)
    const agent = new WebhookClient({
        request: req,
        response: res
    });



    async function fallback() {
        let action = req.body.queryResult.action;
        let queryText = req.body.queryResult.queryText;

        if (action === 'input.unknown') {
            let result = await runChat(queryText);
            agent.add(result);
            console.log(result)
        }else{
            agent.add(result);
            console.log(result)
        }
    }


    function hi(agent) {
        console.log(`intent  =>  hi`);
        agent.add('Hi, I am your virtual assistant, Tell me how can I help you')
    }

    let intentMap = new Map();
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('Default Welcome Intent', hi);
    agent.handleRequest(intentMap);
});

app.listen(PORT, () => {
    console.log(`Server is up and running at http://localhost:${PORT}/`);
});