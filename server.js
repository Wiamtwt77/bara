
const http=require('http'),fs=require('fs'),path=require('path');
const port=process.env.PORT||3000;
http.createServer((req,res)=>{
  if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true}))}
  const file=path.join(__dirname,'index.html');
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(500);return res.end('Server error')}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(data)})
}).listen(port,()=>console.log(`Bara game running on http://localhost:${port}`));
