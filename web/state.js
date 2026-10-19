export const initialState=()=>({fruit:'lemon',view:'tree',yaw:-.18,pitch:-.08,split:0,foundSeeds:new Set()});
export function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
export function updateState(state,action){
 const next={...state,foundSeeds:new Set(state.foundSeeds)};
 if(action.type==='fruit'){if(!['apple','lemon','watermelon','orange','pear'].includes(action.fruit))return next;return {...initialState(),fruit:action.fruit};}
 if(action.type==='inspect'){next.view='fruit';}
 if(action.type==='back'){next.view='tree';}
 if(action.type==='reset'){return {...initialState(),fruit:state.fruit,view:state.view};}
 if(action.type==='turn'&&Number.isFinite(action.dx)&&Number.isFinite(action.dy)){next.yaw+=action.dx*.008;next.pitch=clamp(next.pitch+action.dy*.006,-.9,.9);}
 if(action.type==='split'&&Number.isFinite(action.value)){next.split=clamp(action.value,0,1);if(action.recenter){next.yaw=-.08;next.pitch=-.06;}}
 if(action.type==='seed'&&state.view==='fruit'&&state.split>.12&&Number.isInteger(action.id)&&action.id>=0&&action.id<5){next.foundSeeds.add(action.id);}
 return next;
}
