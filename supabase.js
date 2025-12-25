const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require("@google/generative-ai");
const dialogflow = require('@google-cloud/dialogflow');
const { WebhookClient, Payload } = require('dialogflow-fulfillment');
const express = require("express");
const { createClient } = require('@supabase/supabase-js');
const MODEL_NAME = "gemini-2.5-flash-lite";
const API_KEY = "AIzaSyBG4bU8yJIyCdNqYDpR_vyPokhkGUEX74Q";


// Replace with your actual Supabase project URL and anon key
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    async function order(agent) {
        console.log(`intent  =>  OrderPizza`);
        const { food, email, city, country } = agent.parameters;
        try {
            const { error } = await supabase
                .from('tickets')
                .insert([
                    { food, email, city, country, created_at: new Date().toISOString() }
                ]);
            if (error) {
                console.error('Supabase Error:', error);
                agent.add('Sorry, there was an error booking your ticket. Please try again later.');
            } else {
                agent.add(
                    `Your order for ${food} has been placed. It will be delivered to you at ${city}, ${country}. A confirmation email has been sent to ${email}. Thank you for choosing our service!`
                );
            }
        } catch (err) {
            console.error('Unexpected Error:', err);
            agent.add('Sorry, there was an error booking your ticket. Please try again later.');
        }
    }

    let intentMap = new Map();
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('Default Welcome Intent', hi);
    intentMap.set('order', order);
    agent.handleRequest(intentMap);
});

app.listen(PORT, () => {
    console.log(`Server is up and running at http://localhost:${PORT}/`);
});