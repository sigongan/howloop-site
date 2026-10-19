import test from 'node:test';
import assert from 'node:assert/strict';
import {createPlayMusic, PLAY_MUSIC} from '../web/music.js';

function musicWindow({rejectResume = false, deferResume = false} = {}) {
  const instances = [], intervals = new Map();
  let nextInterval = 0;
  const parameter = () => ({
    value:0, events:[],
    setValueAtTime(value,time) { this.value=value; this.events.push(['set',value,time]); },
    cancelScheduledValues(time) { this.events.push(['cancel',time]); },
    linearRampToValueAtTime(value,time) { this.value=value; this.events.push(['linear',value,time]); },
    exponentialRampToValueAtTime(value,time) { this.value=value; this.events.push(['exponential',value,time]); },
  });
  const node = () => ({disconnected:false, connect(){}, disconnect(){this.disconnected=true;}});
  class AudioContext {
    constructor() { this.currentTime=0; this.state='suspended'; this.destination={}; this.sources=[]; this.gains=[]; instances.push(this); }
    createGain() { const gain={...node(),gain:parameter()}; this.gains.push(gain); return gain; }
    createOscillator() {
      const source={...node(),frequency:parameter(),starts:[],stops:[],finished:false,
        start(time){this.starts.push(time);},stop(time){this.stops.push(time);}};
      this.sources.push(source); return source;
    }
    async resume() {
      if(rejectResume)throw new Error('Gesture required');
      if(deferResume)await new Promise(resolve=>{this.finishResume=resolve;});
      this.state='running';
    }
    async close() { this.state='closed'; }
  }
  const win={AudioContext,
    setInterval(callback,delay){assert.equal(delay,100);const id=nextInterval++;intervals.set(id,callback);return id;},
    clearInterval(id){intervals.delete(id);},
  };
  function advance(seconds) {
    for(const context of instances) {
      context.currentTime+=seconds;
      for(const source of context.sources)if(!source.finished&&source.stops.at(-1)<=context.currentTime){source.finished=true;source.onended?.();}
    }
    for(const tick of [...intervals.values()])tick();
  }
  return {win,instances,intervals,advance};
}

test('music is opt-in and changing its controls while off allocates no audio or timers', async () => {
  const env=musicWindow(), music=createPlayMusic(env.win);
  assert.equal(music.available,true); assert.equal(music.enabled,false); assert.equal(music.playing,false);
  assert.equal(music.setMood('puzzle'),true); assert.equal(music.setVolume(.3),.3);
  assert.equal(env.instances.length,0); assert.equal(env.intervals.size,0);
  assert.equal(await music.setEnabled(true),true);
  assert.equal(env.instances.length,1); assert.equal(env.intervals.size,1);
  assert.equal(music.enabled,true); assert.equal(music.playing,true);
  assert.equal(await music.setEnabled(true),true);
  assert.equal(env.intervals.size,1,'repeated enable does not create duplicate sequencers');
  music.destroy();
});

test('pausing cancels a pending user activation and requires another enable', async () => {
  const env=musicWindow({deferResume:true}), music=createPlayMusic(env.win);
  const enabling=music.setEnabled(true);
  music.pause(); env.instances[0].finishResume();
  assert.equal(await enabling,false); assert.equal(music.enabled,false);
  assert.equal(env.intervals.size,0); assert.equal(env.instances[0].sources.length,0);
  assert.equal(await music.setEnabled(true),true);
  assert.equal(music.playing,true);
  music.destroy();
});

test('unsupported, rejected and closed audio sessions do not leave a running timer', async () => {
  const unsupported=createPlayMusic({});
  assert.equal(unsupported.available,false); assert.equal(await unsupported.setEnabled(true),false);
  const rejectedEnv=musicWindow({rejectResume:true}), rejected=createPlayMusic(rejectedEnv.win);
  assert.equal(await rejected.setEnabled(true),false); assert.equal(rejected.enabled,false); assert.equal(rejectedEnv.intervals.size,0);
  const env=musicWindow(), music=createPlayMusic(env.win);
  await music.setEnabled(true);
  env.instances[0].state='closed'; env.advance(.1);
  assert.equal(music.enabled,false); assert.equal(env.intervals.size,0);
  assert.equal(await music.setEnabled(true),true); assert.equal(env.instances.length,2);
  music.destroy(); rejected.destroy();
});

test('the long-running loop keeps a short scheduling horizon and a bounded voice count', async () => {
  const env=musicWindow(), music=createPlayMusic(env.win);
  await music.setEnabled(true);
  const context=env.instances[0];
  for(let index=0;index<1800;index++) {
    env.advance(.1);
    const active=context.sources.filter(source=>!source.finished);
    assert.ok(active.length<=12,`${active.length} active voices`);
    assert.ok(active.every(source=>source.starts[0]<=context.currentTime+.28001));
  }
  const previous=context.sources.length;
  env.advance(120);
  assert.ok(context.sources.length-previous<=9,'a delayed timer cannot schedule a backlog');
  assert.equal(env.intervals.size,1);
  music.pause();
  assert.equal(music.enabled,false); assert.equal(music.playing,false); assert.equal(env.intervals.size,0);
  for(const gain of context.gains) {
    for(const [kind,value,time] of gain.gain.events) {
      if(kind==='cancel') { assert.ok(Number.isFinite(value)); continue; }
      assert.ok(Number.isFinite(value)&&value>=0,'gain levels remain finite and non-negative');
      assert.ok(Number.isFinite(time)&&time>=0,'envelope times remain finite');
    }
  }
  assert.ok(context.sources.filter(source=>!source.finished).every(source=>source.stops.at(-1)<=context.currentTime+.03));
  env.advance(.04);
  assert.ok(context.sources.every(source=>source.disconnected));
  assert.ok(context.gains.slice(1).every(gain=>gain.disconnected));
  const stoppedCount=context.sources.length; env.advance(20);
  assert.equal(context.sources.length,stoppedCount);
  music.destroy();
});

test('mood changes cancel old notes, volume is bounded, and destruction is terminal', async () => {
  const env=musicWindow(), music=createPlayMusic(env.win);
  await music.setEnabled(true);
  const context=env.instances[0], before=context.sources.length;
  assert.equal(context.gains[0].gain.events.at(-1)[1],.14300000000000002,'default mix matches the visible 65% control');
  const mainEnvelope=context.gains[1].gain.events;
  assert.ok(mainEnvelope.some(event=>event[0]==='linear'&&event[1]===.32));
  assert.ok(mainEnvelope.some(event=>event[0]==='exponential'&&event[1]===.128));
  assert.ok(mainEnvelope.some(event=>event[0]==='exponential'&&event[1]===.0001&&Math.abs(event[2]-.64)<1e-9));
  assert.equal(music.setVolume(5),1);
  assert.equal(context.gains[0].gain.events.at(-1)[1],.22);
  assert.equal(music.setVolume(-1),0);
  assert.equal(context.gains[0].gain.events.at(-1)[1],0);
  assert.equal(music.setVolume(NaN),false); assert.equal(music.setVolume(Infinity),false);
  assert.equal(music.setMood('toString'),false);
  assert.equal(music.setMood('puzzle'),true);
  assert.ok(context.sources.length>before);
  assert.ok(context.sources.slice(0,before).every(source=>source.stops.at(-1)<=.03));
  assert.equal(env.intervals.size,1);
  assert.equal(music.setVolume(.65),.65);
  assert.equal(context.gains[0].gain.events.at(-1)[1],.14300000000000002);
  music.destroy(); music.destroy();
  assert.equal(context.state,'closed'); assert.equal(context.gains[0].disconnected,true);
  assert.equal(music.available,false); assert.equal(music.enabled,false); assert.equal(music.playing,false);
  assert.equal(env.intervals.size,0); assert.equal(await music.setEnabled(true),false);
  assert.equal(music.setMood('orchard'),false); assert.equal(music.setVolume(.2),false);
});

test('both original scores form sixteen complete bars with distinct pentatonic melodies', () => {
  for(const score of Object.values(PLAY_MUSIC)) {
    assert.equal(score.bars.length,16); assert.equal(score.bass.length,16);
    assert.ok(score.bpm>=90&&score.bpm<=100);
    for(const bar of score.bars) {
      assert.equal(bar.length,8);
      assert.ok(bar.every(pitch=>Number.isInteger(pitch)&&pitch>=-1&&pitch<=5));
    }
    assert.ok(Object.isFrozen(score.bars));
  }
  assert.notDeepEqual(PLAY_MUSIC.orchard.bars,PLAY_MUSIC.puzzle.bars);
});
