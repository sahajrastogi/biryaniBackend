//require('dotenv').config()
import {} from 'dotenv/config'
import express from 'express';
import cors from 'cors';
const app = express()
app.use(express.json())
app.use(cors())
import axios from 'axios';
// const axios = require('axios');

import OpenAI from "openai";

const openai = new OpenAI();

import pg from 'pg';
const Client = pg.Client;
 
const client = new Client(process.env.DATABASE_URL);

// (async () => {
//   await client.connect();
//   try {
//     var values = ['example@email.com', '3-2x=7', 'conceptual']
//     const results = await client.query("INSERT INTO records (userEmail, problemStatement, errorType) VALUES ($1,$2,$3)",values);
//     console.log(results);
//   } catch (err) {
//     console.error("error executing query:", err);
//   } finally {
//     client.end();
//   }
// })();

async function insertRecord(a,b,c){
  try {
    var d = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
    var values = [a,b,c,d];
    const results = await client.query("INSERT INTO records (userEmail, problemStatement, errorType, timeRecorded) VALUES ($1,$2,$3,$4)",values);
    console.log(results);
  } catch (err) {
    console.error("error executing query:", err);
  } finally {
    //client.end();
  }
}
client.connect().then(() =>{
    console.log("Connected to cockDB");
    app.listen(8080, () => console.log('Server started'))
});

app.get('/userFeedback/:emailID/', async (req, res) => {
    const {emailID} = req.params;
    var recordsList = await getRecords(emailID);
    res.status(200).json(recordsList);
})
var url = "https://i.ibb.co/HP1F6rw/Note-Oct-28-2023.jpg";

console.log(encodeURIComponent("https://i.ibb.co/SQKSyRq/Note-Oct-28-2023-2.jpg"));
console.log(decodeURIComponent(encodeURIComponent("https://i.ibb.co/SQKSyRq/Note-Oct-28-2023-2.jpg")));

app.post('/processRecord/:emailID/:url', async (request,result) => {
    var resJSON = {};
    const emailID = request.params["emailID"];
    const u = request.params["url"];
    console.log(emailID);
    console.log(url);
    url = decodeURIComponent(u);
    //url = u;
    console.log(url);
    //url = "https://i.ibb.co/HP1F6rw/Note-Oct-28-2023.jpg";
    var solveString = "x^2-3x%2B1%3D1";
    var userSolution = "";
    var resString = "";
    var resultMath = mathPixQuery();
    resultMath.then((res) =>{ 
        res = res["data"];
        console.log(res);
        var i=0;
        var currString = "";
        var latexString = "";
        for(i=0;i<res.length;i++){
            if(res[i]["type"] == "asciimath"){
                if(res[i]["value"].length > currString.length){
                    currString = res[i]["value"];
                }
            }

            if(res[i]["type"] == "latex"){
                if(res[i]["value"].length  > latexString.length){
                    latexString = res[i]["value"];
                }
            }
        }
        var str = currString;
        var problemString = "";
        userSolution = currString;
        console.log(userSolution);
        resJSON["userLatexSolution"] = latexString;
        var on = false;
        
        for(i=0;i<str.length;i++){
            var char = str.charAt(i);
            if(char == "]"){
                break;
            }
            if(on){
                var addString = "";
                switch(char){
                    case "+":
                        addString = "%2B";
                        break;
                    case "=":
                        addString = "%3D";
                        break;
                    case "!":
                        addSting = "%21";
                        break;
                    case "#":
                        addSting = "%23";
                        break;
                    case "%":
                        addSting = "%25";
                        break;
                    case "*":
                        addSting = "%2A";
                        break;
                    case "{":
                        addString = "(";
                        break;
                    case "}":
                        addString = ")";
                        break;
                    case "&": case ";": case ":": case "@": case "$": case ",": case "?": case "[": case "]":
                        addString = "";
                        break;
                    
                    default:
                        addString = char;
                }
                resString += addString;   
                problemString += char;
            }

            if(char == "["){
                on = true;
            }
            
            
        }
        resString = resString.replaceAll("theta","\\theta");
        console.log(resString);
        solveString = resString;

        var resu =  wolframQuery(solveString);
        resu.then((res) => {
        res = res["queryresult"]["pods"];
        console.log(res);
        i=0;
        for(i=0;i<res.length;i++){
            if(res[i]["title"] == "Results"){
                break;
            }
        }
        var j=0;
        for(j=0;i<res[i]["subpods"].length;j++){
            if(res[i]["subpods"][j]["title"] == "Possible intermediate steps"){
                break;
            }
        }
        var wolframSolution = res[i]["subpods"][j]["plaintext"]
        console.log(wolframSolution);
        resJSON["wolframSolution"] = wolframSolution;

        var wolframLatexText= "$";
        var wolframArray = wolframSolution.split("\n").join(" \n ").split(" ");
        console.log(wolframArray);
        for(var i = 0; i < wolframArray.length; i++){
            var s = wolframArray[i];
            if(isWord(s)){
                wolframLatexText += "$ " + s + " $";
            } else {
                wolframLatexText += s + " ";
            }
        }
        wolframLatexText += "$";
        resJSON["wolframLatexText"] = wolframLatexText;
        console.log(wolframLatexText);


        var prompt = "Find the step where I made a mistake with my solution or determine that my solution is correct: " + userSolution + " given that the correct solution is: " + wolframSolution;
        var promptResult = main(prompt);
        promptResult.then((res) => {
            console.log(res);
            resJSON["chatGPTComparison"] = res;
            // var messageJSON = [
            //     {role: "user", content: prompt},
            //     {role: "assistant", content: res},
            //     {role: "user", content: "Are you sure that's the mistake that I made? I got something else"}
            // ]    
            // main2(messageJSON);
            prompt = "If the original problem is " + problemString + ", would you say this error is a calculation error, conceptual error, or no error at all " + res;
            main(prompt).then((r) =>{
                var errType = "";
                if(r.includes("no error")){
                    errType = "no error";
                } else if(r.includes("conceptual")){
                    errType = "conceptual";
                } else {
                    errType = "calculation";
                }
                resJSON["errorType"] = errType;
                result.setHeader("Access-Control-Allow-Origin", "*");
                result.setHeader("Access-Control-Allow-Methods", "POST, GET, PUT");
                result.setHeader("Access-Control-Allow-Headers", "Content-Type");
                result.status(200).json(resJSON);
                insertRecord(emailID,problemString,errType);
            })

            })

        })
        
    })

})

// insertRecord("example@email.com","4-2x=11","computational");
// insertRecord("example@email.com","4-3x=11","computational");
// insertRecord("ananya@email.com","x^2-3x=4","conceptual");
// insertRecord("ananya@email.com","x^2 = 9","computational");


async function getRecords(userEmail){
    //await client.connect();
  try {
    var results = await client.query("Select * from records where userEmail = $1",[userEmail]);
    results = results["rows"];
    
    var comp = 0;
    var conc = 0;
    for(var i = 0;i<results.length;i++){
        if(results[i]["errortype"].includes("conceptual")){
            conc++;
        } else if(results[i]["errortype"].includes("computation")){
            comp++;
        }
    }
    results = {results};
    results["numConceptual"] = conc;
    results["numComputational"] = comp;
    results["percentConceptual"] = 100*conc/(conc+comp);
    results["percentComputational"] = 100*comp/(conc+comp);
    console.log(results);
    return results;
  } catch (err) {
    console.error("error executing query:", err);
    return {error: err};
  } 
}







async function mathPixQuery() {

    const data = {
        src: url,
        formats: ['text', 'data', 'html'],
        data_options: {
          include_asciimath: true,
          include_latex: true
        }
      };
      
      const headers = {
        'content-type': 'application/json',
        app_id: process.env.APP_ID,
        app_key: process.env.APP_KEY
      };
      
      const response = await fetch('https://api.mathpix.com/v3/text', {
        method: 'POST',
        body: JSON.stringify(data),
        headers
      })
      const result = await response.json();
      console.log(result);
      return result;
}

async function wolframQuery(str){
    const response = await fetch("http://api.wolframalpha.com/v2/query?appid=" + process.env.WOLFRAM_APP_ID + "&input=solve+" + str + "&podstate=Result__Step-by-step+solution&format=plaintext&output=json",{
        method:"POST"
    })

    const result = await response.json();
    console.log(result);
    return result;
}

async function main(prompt) {
    const completion = await openai.chat.completions.create({
        messages: [
        { role: "user", content: prompt },
        ],
        model: "gpt-4",
        temperature: 0.1
    });

    console.log(completion.choices[0]);
    return completion.choices[0]["message"]["content"];
    
}


async function main2(messageJSON) {
    const completion = await openai.chat.completions.create({
        messages: messageJSON,
        model: "gpt-4",
        temperature: 0.1
    });

    console.log(completion.choices[0]);
    console.log(completion.choices[1]);
}

function isWord(input) {
    if(input.length == 1 && input != "a"){
        return false;
    }
    if(input == "\n") return false;
  // Use a regular expression to test if the input contains only letters
  const wordPattern = /^[A-Za-z]+$/;
  return wordPattern.test(input);
}