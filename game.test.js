import test from 'node:test';
import assert from 'node:assert/strict';
import {ANSWERS,formatTime,validName,isCorrect,escapeHtml} from './public/game.js';
test('20 original answers map to exactly one slot',()=>{assert.equal(new Set(ANSWERS.flat()).size,20);assert.deepEqual(ANSWERS[1],[11,12,13,14,15]);assert.deepEqual(ANSWERS[3],[6,7,8,9,10]);assert.equal(isCorrect(0,0,2),false);assert.equal(isCorrect(2,4,20),true)});
test('time formatting carries minutes and preserves long sessions',()=>{assert.equal(formatTime(59999),'00:59');assert.equal(formatTime(60000),'01:00');assert.equal(formatTime(3600000),'60:00')});
test('names validate and displayed input is escaped',()=>{assert.equal(validName('   '),false);assert.equal(validName('가'.repeat(21)),false);assert.equal(validName('민준'),true);assert.equal(escapeHtml('<script>'),'&lt;script&gt;')});

