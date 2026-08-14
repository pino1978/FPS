'use client';
import React,{useState}from'react';
import MobileHomeV4 from'../../mobile/src/MobileHomeV4';
import DataFreshnessBar from'../../mobile/src/DataFreshnessBar';
import'../../mobile/src/provider-fetch-guard';
import'../../mobile/src/mobile-v2.css';
import'../../mobile/src/mobile-v2-filters.css';
import'../../mobile/src/mobile-v2-release.css';
import'../../mobile/src/mobile-v4.css';
import'../../mobile/src/mobile-v4-refresh.css';

export default function Page(){const[key,setKey]=useState(0);return <><DataFreshnessBar onRefresh={()=>setKey(x=>x+1)}/><MobileHomeV4 key={key}/></>}
