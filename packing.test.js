import test from 'node:test';
import assert from 'node:assert/strict';
import {fits,complete,PIECES} from './public/packing-model.js';
const answer={1:{x:0,y:3},2:{x:4,y:0},3:{x:1,y:0},4:{x:0,y:1},5:{x:0,y:0},6:{x:2,y:3},7:{x:3,y:1}};
test('reference image covers all 25 cells using seven original pieces',()=>{assert.equal(PIECES.reduce((n,p)=>n+p.cells.length,0),25);assert.equal(complete(answer),true)});
test('reject overlap, missing piece, fractional and out-of-board positions',()=>{assert.equal(complete({...answer,2:{x:0,y:0}}),false);assert.equal(complete({...answer,2:undefined}),false);assert.equal(fits({},1,2,0),false);assert.equal(fits({},2,-1,0),false);assert.equal(fits({},2,.5,1),false)});
test('moving a placed piece ignores only its own occupied cells',()=>{assert.equal(fits(answer,1,0,3),true);assert.equal(fits(answer,1,0,2),false)});
