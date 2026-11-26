import test from "node:test";
import assert from "node:assert/strict";
import {forecast,headlineTone,features} from "../src/lib/market/model.ts";
const prices=Array.from({length:250},(_,i)=>({date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),close:100+i*.11+Math.sin(i/8)*3,volume:1000}));
test("headline heuristics limit tone range and distinguish direction",()=>{assert.ok(headlineTone("Profit beats forecasts")>0);assert.ok(headlineTone("Lawsuit and losses trigger downgrade")<0);assert.equal(headlineTone("Company announces report"),0)});
test("features require a historical lookback",()=>{assert.equal(features(prices,5),null);assert.equal(features(prices,21)?.length,4)});
test("forecasts report holdout evaluation without guaranteeing direction",()=>{for(const days of [5,20]){const x=forecast(prices,days);assert.ok(x.testSize>0);assert.ok(x.sampleSize>=70);assert.ok(["up","down","uncertain"].includes(x.direction));if(x.brierScore!==null)assert.ok(x.brierScore>=0&&x.brierScore<=1)}});
test("no data means no fabricated probability",()=>{const x=forecast([],5);assert.equal(x.probabilityUp,null);assert.equal(x.direction,"uncertain")});
