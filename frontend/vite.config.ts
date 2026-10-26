import {defineConfig,loadEnv} from 'vite';
import {mockApi} from './mock/server';
export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'');const mock=env.VITE_API_MODE!=='live';
 return {plugins:mock?[{name:'lang-moc-catalog-mock',configureServer(server){server.middlewares.use(mockApi)},configurePreviewServer(server){server.middlewares.use(mockApi)}}]:[],server:{host:'127.0.0.1',proxy:mock?undefined:{'/api':{target:env.API_PROXY_TARGET||'http://127.0.0.1:3000',changeOrigin:true}}}};
});
