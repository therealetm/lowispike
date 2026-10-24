/* LOWiSPIKE Community room, pure rules. ONE room for everyone (Oct 24 2026, Emmanuel: "nuke Circle, because nobody is using it,
   so that we just have one chat ... Nuke everything that has to do with being able to open multiple rooms").
   Before this, phones were split into support rooms of 30 (Room 1 = 'all', then r2, r3 ...) with a room list, knock and let-in.
   That is gone: every phone is in the one shared room, id 'all' (the id older installed apps already talk in), with one chat
   and one Raum. No network, no DOM here: community-rooms.js does the realtime part. */
(function(root){
'use strict';
const ROOM='all';
/* DRAW: how many recent chat writers who are not here right now the Raum still draws (community-chat.js roster). It is no longer
   a room size: nobody is ever moved or turned away. */
const DRAW=30;
function channelName(){return 'lowi-room-'+ROOM;}
/* Presence payloads carry nothing personal: the account id (already public in chat) and the join time. */
function flatten(state){const out=[];for(const k in state||{}){const arr=state[k]||[];const p=arr[arr.length-1]||{};out.push({k,at:+p.at||0});}return out;}
const api={ROOM,DRAW,channelName,flatten};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LowiRoomsCore=api;
})(typeof window==='object'?window:globalThis);
