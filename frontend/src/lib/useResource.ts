import {useEffect,useState} from 'react';
export function useResource<T>(loader:(signal:AbortSignal)=>Promise<T>,key:string){
 const [state,setState]=useState<{data:T|null;error:Error|null;loading:boolean}>({data:null,error:null,loading:true});const [attempt,setAttempt]=useState(0);
 useEffect(()=>{const controller=new AbortController();setState({data:null,error:null,loading:true});loader(controller.signal).then(data=>{if(!controller.signal.aborted)setState({data,error:null,loading:false})}).catch(error=>{if(!controller.signal.aborted)setState({data:null,error,loading:false})});return()=>controller.abort()},[key,attempt]);
 return {...state,retry:()=>setAttempt(v=>v+1)};
}
