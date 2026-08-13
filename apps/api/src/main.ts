import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

type Bucket={windowStart:number;count:number};

export function classifyInternalError(exception:unknown){
  const error=exception as {code?:unknown;message?:unknown}|null;
  const code=typeof error?.code==='string'?error.code:'';
  const message=typeof error?.message==='string'?error.message.toLowerCase():'';
  const databaseNotReady=code==='P2021'||code==='P2022'||message.includes('no such table')||(message.includes('table')&&message.includes('does not exist'))||(message.includes('relation')&&message.includes('does not exist'));
  return databaseNotReady?{code:'DATABASE_NOT_READY',message:'Servizio dati in aggiornamento. Riprova tra poco.'}:{code:'INTERNAL_ERROR',message:'Errore temporaneo del servizio. Riprova.'};
}

@Catch()
class SafeHttpExceptionFilter implements ExceptionFilter{
  catch(exception:unknown,host:ArgumentsHost){
    const http=host.switchToHttp();
    const response=http.getResponse<any>();
    const request=http.getRequest<any>();
    const requestId=request?.requestId?String(request.requestId):undefined;
    if(exception instanceof HttpException){
      const statusCode=exception.getStatus();
      const source=exception.getResponse();
      const rawMessage=(source as any)?.message;
      const message=typeof source==='string'?source:typeof rawMessage==='string'?rawMessage:Array.isArray(rawMessage)?rawMessage.join('; '):exception.message;
      return response.status(statusCode).send({statusCode,error:HttpStatus[statusCode]||'HTTP_ERROR',message,...(requestId?{requestId}:{})});
    }
    const classification=classifyInternalError(exception);
    const error=exception as {name?:unknown;code?:unknown;message?:unknown}|null;
    console.error(JSON.stringify({event:'http_error',requestId,method:request?.method,path:String(request?.url||'').split('?')[0],classification:classification.code,errorName:typeof error?.name==='string'?error.name:'Error',errorCode:typeof error?.code==='string'?error.code:undefined,message:typeof error?.message==='string'?error.message:String(exception)}));
    return response.status(500).send({statusCode:500,error:classification.code,message:classification.message,...(requestId?{requestId}:{})});
  }
}

async function bootstrap(){
  const app=await NestFactory.create<NestFastifyApplication>(AppModule,new FastifyAdapter(),{bufferLogs:true});
  app.useGlobalFilters(new SafeHttpExceptionFilter());
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
  const buckets=new Map<string,Bucket>();
  const limit=Math.max(1,Number(process.env.API_RATE_LIMIT_PER_MINUTE||120));
  const windowMs=60_000;

  fastify.addHook('onRequest',async(request:any,reply:any)=>{
    const requestId=String(request.headers['x-request-id']||randomUUID());
    request.requestId=requestId;
    reply.header('x-request-id',requestId);
    request._fpsStartedAt=Date.now();

    const path=String(request.url).split('?')[0];
    if(path==='/health')return;
    const key=String(request.ip||request.socket?.remoteAddress||'unknown');
    const now=Date.now();
    const current=buckets.get(key);
    const bucket=!current||now-current.windowStart>=windowMs?{windowStart:now,count:0}:current;
    bucket.count+=1;buckets.set(key,bucket);
    const remaining=Math.max(0,limit-bucket.count);
    reply.header('x-ratelimit-limit',String(limit));
    reply.header('x-ratelimit-remaining',String(remaining));
    if(bucket.count>limit){
      reply.header('retry-after',String(Math.ceil((bucket.windowStart+windowMs-now)/1000)));
      return reply.code(429).send({statusCode:429,error:'Too Many Requests',message:'API rate limit exceeded',requestId});
    }
  });

  fastify.addHook('onResponse',async(request:any,reply:any)=>{
    const durationMs=Date.now()-Number(request._fpsStartedAt||Date.now());
    console.log(JSON.stringify({event:'http_request',requestId:request.requestId,method:request.method,path:String(request.url).split('?')[0],statusCode:reply.statusCode,durationMs}));
  });

  const cleanup=setInterval(()=>{const threshold=Date.now()-windowMs*2;for(const [key,bucket] of buckets)if(bucket.windowStart<threshold)buckets.delete(key);},windowMs);
  cleanup.unref();
  await app.listen(Number(process.env.PORT||4000),'0.0.0.0');
}
void bootstrap();
