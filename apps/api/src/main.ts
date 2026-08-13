import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

async function bootstrap(){
  const app=await NestFactory.create<NestFastifyApplication>(AppModule,new FastifyAdapter(),{bufferLogs:true});
  const configured=(process.env.CORS_ORIGINS||'http://localhost:3000').split(',').map(x=>x.trim()).filter(Boolean);
  app.enableCors({
    origin:(origin,callback)=>{
      if(!origin||configured.includes(origin))return callback(null,true);
      return callback(new Error('Origin not allowed'),false);
    },
    credentials:false,
    methods:['GET','POST','OPTIONS'],
  });
  const fastify=app.getHttpAdapter().getInstance();
  fastify.addHook('onRequest',async(request:any,reply:any)=>{
    const requestId=String(request.headers['x-request-id']||randomUUID());
    request.requestId=requestId;
    reply.header('x-request-id',requestId);
    request._fpsStartedAt=Date.now();
  });
  fastify.addHook('onResponse',async(request:any,reply:any)=>{
    const durationMs=Date.now()-Number(request._fpsStartedAt||Date.now());
    console.log(JSON.stringify({event:'http_request',requestId:request.requestId,method:request.method,path:String(request.url).split('?')[0],statusCode:reply.statusCode,durationMs}));
  });
  await app.listen(Number(process.env.PORT||4000),'0.0.0.0');
}
void bootstrap();
