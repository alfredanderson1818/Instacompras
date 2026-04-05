// ═══ FIREBASE — Auth + Firestore helpers ═══
// Config loaded from config.js (FB, GOOGLE_CLIENT_ID)

// Guardar/recuperar sesión en localStorage
function fbSaveSession(token,uid){
  try{localStorage.setItem('fb_token',token);localStorage.setItem('fb_uid',uid);}catch(e){}
}
function fbClearSession(){
  try{localStorage.removeItem('fb_token');localStorage.removeItem('fb_uid');localStorage.removeItem('fb_user');}catch(e){}
}
function fbCacheUser(data){
  try{localStorage.setItem('fb_user',JSON.stringify(data));}catch(e){}
}
function fbGetCachedUser(){
  try{const d=localStorage.getItem('fb_user');return d?JSON.parse(d):null;}catch(e){return null;}
}

// ═══ FIRESTORE HELPERS — CRUD genérico ═══
function toFSVal(v){
  if(v===null||v===undefined)return{nullValue:null};
  if(typeof v==='boolean')return{booleanValue:v};
  if(typeof v==='number')return Number.isInteger(v)?{integerValue:String(v)}:{doubleValue:v};
  if(typeof v==='string')return{stringValue:v};
  if(Array.isArray(v))return{arrayValue:{values:v.map(toFSVal)}};
  if(typeof v==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(v).map(([k,val])=>[k,toFSVal(val)]))}};
  return{stringValue:String(v)};
}
function toFS(obj){
  const fields={};
  for(const[k,v]of Object.entries(obj))fields[k]=toFSVal(v);
  return{fields};
}
function fromFSVal(v){
  if(!v)return null;
  if('stringValue'in v)return v.stringValue;
  if('integerValue'in v)return parseInt(v.integerValue);
  if('doubleValue'in v)return v.doubleValue;
  if('booleanValue'in v)return v.booleanValue;
  if('nullValue'in v)return null;
  if('arrayValue'in v)return(v.arrayValue.values||[]).map(fromFSVal);
  if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,val])=>[k,fromFSVal(val)]));
  return null;
}
function fromFS(doc){
  if(!doc||!doc.fields)return{};
  const obj=Object.fromEntries(Object.entries(doc.fields).map(([k,v])=>[k,fromFSVal(v)]));
  if(doc.name)obj._id=doc.name.split('/').pop();
  return obj;
}
function fsHeaders(){
  const h={'Content-Type':'application/json'};
  if(window.fbToken)h['Authorization']='Bearer '+window.fbToken;
  return h;
}
async function fsSet(col,docId,data){
  try{
    const keys=Object.keys(data);
    const mask=keys.map(k=>'updateMask.fieldPaths='+encodeURIComponent(k)).join('&');
    const r=await fetch(`${FB.dbUrl}/${col}/${docId}?${mask}`,{method:'PATCH',headers:fsHeaders(),body:JSON.stringify(toFS(data))});
    if(!r.ok)return null;
    return fromFS(await r.json());
  }catch(e){console.warn('fsSet:',e);return null;}
}
async function fsGet(col,docId){
  try{
    const r=await fetch(`${FB.dbUrl}/${col}/${docId}`,{headers:fsHeaders()});
    if(!r.ok)return null;
    return fromFS(await r.json());
  }catch(e){return null;}
}
async function fsAdd(col,data){
  try{
    const r=await fetch(`${FB.dbUrl}/${col}`,{method:'POST',headers:fsHeaders(),body:JSON.stringify(toFS(data))});
    if(!r.ok)return null;
    return fromFS(await r.json());
  }catch(e){return null;}
}
async function fsQuery(col,filters=[]){
  try{
    const url='https://firestore.googleapis.com/v1/projects/'+FB.projectId+'/databases/(default)/documents:runQuery';
    const makeFilter=f=>({fieldFilter:{field:{fieldPath:f.field},op:f.op||'EQUAL',value:toFSVal(f.value)}});
    const where=filters.length===0?undefined:filters.length===1?makeFilter(filters[0]):{compositeFilter:{op:'AND',filters:filters.map(makeFilter)}};
    const q={structuredQuery:{from:[{collectionId:col}],...(where?{where}:{}),limit:100}};
    const r=await fetch(url,{method:'POST',headers:fsHeaders(),body:JSON.stringify(q)});
    if(!r.ok)return[];
    const res=await r.json();
    return res.filter(x=>x.document).map(x=>fromFS(x.document));
  }catch(e){return[];}
}
function fsId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7);}

// Auth: Registrar usuario
async function fbSignUp(email,password){
  const r=await fetch(`${FB.authUrl}:signUp?key=${FB.apiKey}`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email,password,returnSecureToken:true})
  });
  const d=await r.json();
  if(!r.ok)throw{code:d.error?.message||'ERROR',message:d.error?.message||'Error desconocido'};
  return d; // {idToken, localId, email}
}

// Auth: Login
async function fbSignIn(email,password){
  const r=await fetch(`${FB.authUrl}:signInWithPassword?key=${FB.apiKey}`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email,password,returnSecureToken:true})
  });
  const d=await r.json();
  if(!r.ok)throw{code:d.error?.message||'ERROR',message:d.error?.message||'Error desconocido'};
  return d;
}

// Firestore: Guardar usuario
async function fbSaveUser(uid,data,token){
  const r=await fetch(`${FB.dbUrl}/users/${uid}?updateMask.fieldPaths=${Object.keys(data).join('&updateMask.fieldPaths=')}`,{
    method:'PATCH',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},
    body:JSON.stringify(toFS(data))
  });
  return r.json();
}

// Firestore: Leer usuario
async function fbGetUser(uid,token){
  const r=await fetch(`${FB.dbUrl}/users/${uid}`,{
    headers:{'Authorization':'Bearer '+token}
  });
  if(!r.ok)return null;
  const d=await r.json();
  return fromFS(d);
}

// Google Sign-In con Firebase REST
async function fbGoogleSignIn(){
  return new Promise((resolve,reject)=>{
    if(typeof google==='undefined'){
      reject({message:'Google Sign-In no disponible. Intenta de nuevo.'});return;
    }
    const client=google.accounts.oauth2.initTokenClient({
      client_id:GOOGLE_CLIENT_ID,
      scope:'email profile openid',
      callback:async(resp)=>{
        if(resp.error){reject({message:resp.error});return;}
        try{
          // Exchange Google access token with Firebase
          const r=await fetch(`${FB.authUrl}:signInWithIdp?key=${FB.apiKey}`,{
            method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              postBody:`access_token=${resp.access_token}&providerId=google.com`,
              requestUri:'https://alfredanderson1818.github.io/Instacompras',
              returnSecureToken:true,returnIdpCredential:true
            })
          });
          const d=await r.json();
          if(!r.ok)throw{message:d.error?.message||'Error Google'};
          resolve(d);
        }catch(e){reject(e);}
      }
    });
    client.requestAccessToken({prompt:'select_account'});
  });
}

// Verificar token guardado al cargar
async function fbRestoreSession(){
  try{
    const token=localStorage.getItem('fb_token');
    const uid=localStorage.getItem('fb_uid');
    if(!token||!uid)return false;
    // Use cached user data for instant load
    const cached=fbGetCachedUser();
    if(cached&&cached.uid===uid){
      window.fbUser={...cached};
      window.fbToken=token;
      // Refresh silently in background
      fbGetUser(uid,token).then(d=>{
        if(d){window.fbUser={uid,...d};fbCacheUser({uid,...d});}
      }).catch(()=>{});
      return true;
    }
    // No cache: fetch with 5s timeout
    const userData=await Promise.race([
      fbGetUser(uid,token),
      new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),5000))
    ]);
    if(userData){
      window.fbUser={uid,...userData};
      window.fbToken=token;
      fbCacheUser({uid,...userData});
      return true;
    }
  }catch(e){}
  fbClearSession();
  return false;
}
