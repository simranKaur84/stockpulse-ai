import test from "node:test";
import assert from "node:assert/strict";
import {forecast,features,headlineTone} from "../src/lib/market/model.ts";
const rows=Array.from({length:290},(_,i)=>({date:new Date(Date.UTC(2025,0,1+i)).toISOString().slice(0,10),close:100+i/5+Math.sin(i/12)*4,volume:1000}));
test("historical model evaluates holdout metrics",()=>{for(const h of [5,20]){const x=forecast(rows,h);assert.ok(x.sampleSize>70);assert.ok(x.testSize>=20);assert.ok(x.brierScore!==null);assert.equal(x.signalInputs.length,2)}});
test("future headlines cannot change past features",()=>{const c={companyNewsCoverage:{from:"2025-01-01",to:"2026-01-01"},companyNews:[{publishedAt:"2025-03-10",title:"Profits surge"}]};assert.deepEqual(features(rows,50,c),features(rows,50,{...c,companyNews:[{publishedAt:"2026-01-01",title:"Losses"}]}))});
test("historic market proxies included when supplied",()=>{const x=forecast(rows,5,{market:rows,safeHaven:rows});assert.ok(x.signalInputs.includes("historical broad-market returns"));assert.ok(!x.signalInputs.some(s=>s.includes("geopolitical")))});
test("sparse recent headlines fall back safely",()=>{const c={companyNewsCoverage:{from:"2025-10-01",to:"2025-10-05"},companyNews:[{publishedAt:"2025-10-03",title:"growth"}]};const x=forecast(rows,5,c);assert.equal(x.signalInputs.length,2)});
test("headline tone distinguishes positive and negative",()=>{assert.ok(headlineTone("Profits beat estimates")>0);assert.ok(headlineTone("Lawsuit and losses")<0)});
