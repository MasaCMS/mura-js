import React,{ useEffect } from 'react';
import { getMura } from '@murasoftware/next-core';

const Embed = function(props) {
  const Mura = props.Mura || getMura();
  let objectparams=Object.assign({},props);
  objectparams.source=objectparams.source || '';
  const containerid='source-contianer-' + objectparams.instanceid;

  useEffect(() => {
    Mura('#'  + containerid).html(objectparams.source);
  }, []);

  return (
    <div id={containerid}/>
  )
}

export default Embed;
