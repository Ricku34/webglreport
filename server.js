const express = require('express');
const path = require('path');
const fs = require('fs');
const PORT = process.env.PORT || 8080;



express()
  .use("/",express.static(__dirname,{
    index: "index.html"
  }))
  .listen(PORT, () => { console.log(`Listening on ${ PORT }`); } );
