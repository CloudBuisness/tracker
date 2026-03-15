import fs from "fs"
import fetch from "node-fetch"

const updatesFile="updates.json"

function load(){
try{return JSON.parse(fs.readFileSync(updatesFile))}
catch{return[]}
}

function save(d){
fs.writeFileSync(updatesFile,JSON.stringify(d,null,2))
}

function push(list,event){
if(list.find(e=>e.id===event.id))return
list.push(event)
if(list.length>300)list.shift()
}

function severity(text){

text=text.toLowerCase()

if(text.includes("anti")||text.includes("cheat")||text.includes("security"))return"high"

if(text.includes("weapon")||text.includes("balance")||text.includes("update"))return"mid"

return"low"
}

async function steamNews(appid){

let r=await fetch(`https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appid}&count=1`)
let j=await r.json()

if(!j.appnews.newsitems.length)return null

let n=j.appnews.newsitems[0]

let text=(n.title+" "+n.contents).replace(/<[^>]+>/g,"")

return{
id:n.gid,
text:text,
time:new Date(n.date*1000).toISOString()
}

}

async function playerCount(){

let r=await fetch("https://api.steampowered.com/ISteamUserStats/GetNumberOfCurrentPlayers/v1/?appid=730")
let j=await r.json()

return j.response.player_count
}

async function run(){

let updates=load()

let games=JSON.parse(fs.readFileSync("games.json"))

for(let g of games){

try{

let news=await steamNews(g.appid)

if(news){

push(updates,{
id:g.appid+news.id,
type:"PATCH",
title:g.name+" update",
description:news.text.slice(0,250),
severity:severity(news.text),
time:news.time
})

}

}catch{}

}

try{

let players=await playerCount()

let last=updates.filter(e=>e.type==="VAC SPIKE").pop()

if(!last||Math.abs(players-last.players)>80000){

push(updates,{
id:"vac"+Date.now(),
type:"VAC SPIKE",
title:"possible VAC ban wave",
description:"CS2 player count spike "+players,
players:players,
severity:"high",
time:new Date().toISOString()
})

}

}catch{}

save(updates)

}

run()
