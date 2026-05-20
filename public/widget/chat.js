"use strict";var QueueUpWidget=(()=>{var K,m,me,Ge,P,fe,ve,ye,Z,j,L,xe,oe,ee,te,Xe,B={},V=[],Ye=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,J=Array.isArray;function q(e,t){for(var n in t)e[n]=t[n];return e}function re(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function Ze(e,t,n){var o,s,r,u={};for(r in t)r=="key"?o=t[r]:r=="ref"?s=t[r]:u[r]=t[r];if(arguments.length>2&&(u.children=arguments.length>3?K.call(arguments,2):n),typeof e=="function"&&e.defaultProps!=null)for(r in e.defaultProps)u[r]===void 0&&(u[r]=e.defaultProps[r]);return O(e,u,o,s,null)}function O(e,t,n,o,s){var r={type:e,props:t,key:n,ref:o,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:s??++me,__i:-1,__u:0};return s==null&&m.vnode!=null&&m.vnode(r),r}function E(e){return e.children}function W(e,t){this.props=e,this.context=t}function T(e,t){if(t==null)return e.__?T(e.__,e.__i+1):null;for(var n;t<e.__k.length;t++)if((n=e.__k[t])!=null&&n.__e!=null)return n.__e;return typeof e.type=="function"?T(e):null}function et(e){if(e.__P&&e.__d){var t=e.__v,n=t.__e,o=[],s=[],r=q({},t);r.__v=t.__v+1,m.vnode&&m.vnode(r),_e(e.__P,r,t,e.__n,e.__P.namespaceURI,32&t.__u?[n]:null,o,n??T(t),!!(32&t.__u),s),r.__v=t.__v,r.__.__k[r.__i]=r,Ce(o,r,s),t.__e=t.__=null,r.__e!=n&&be(r)}}function be(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),be(e)}function de(e){(!e.__d&&(e.__d=!0)&&P.push(e)&&!Q.__r++||fe!=m.debounceRendering)&&((fe=m.debounceRendering)||ve)(Q)}function Q(){try{for(var e,t=1;P.length;)P.length>t&&P.sort(ye),e=P.shift(),t=P.length,et(e)}finally{P.length=Q.__r=0}}function we(e,t,n,o,s,r,u,a,l,i,p){var _,f,c,v,k,b,g,d=o&&o.__k||V,U=t.length;for(l=tt(n,t,d,l,U),_=0;_<U;_++)(c=n.__k[_])!=null&&(f=c.__i!=-1&&d[c.__i]||B,c.__i=_,b=_e(e,c,f,s,r,u,a,l,i,p),v=c.__e,c.ref&&f.ref!=c.ref&&(f.ref&&se(f.ref,null,c),p.push(c.ref,c.__c||v,c)),k==null&&v!=null&&(k=v),(g=!!(4&c.__u))||f.__k===c.__k?(l=ke(c,l,e,g),g&&f.__e&&(f.__e=null)):typeof c.type=="function"&&b!==void 0?l=b:v&&(l=v.nextSibling),c.__u&=-7);return n.__e=k,l}function tt(e,t,n,o,s){var r,u,a,l,i,p=n.length,_=p,f=0;for(e.__k=new Array(s),r=0;r<s;r++)(u=t[r])!=null&&typeof u!="boolean"&&typeof u!="function"?(typeof u=="string"||typeof u=="number"||typeof u=="bigint"||u.constructor==String?u=e.__k[r]=O(null,u,null,null,null):J(u)?u=e.__k[r]=O(E,{children:u},null,null,null):u.constructor===void 0&&u.__b>0?u=e.__k[r]=O(u.type,u.props,u.key,u.ref?u.ref:null,u.__v):e.__k[r]=u,l=r+f,u.__=e,u.__b=e.__b+1,a=null,(i=u.__i=nt(u,n,l,_))!=-1&&(_--,(a=n[i])&&(a.__u|=2)),a==null||a.__v==null?(i==-1&&(s>p?f--:s<p&&f++),typeof u.type!="function"&&(u.__u|=4)):i!=l&&(i==l-1?f--:i==l+1?f++:(i>l?f--:f++,u.__u|=4))):e.__k[r]=null;if(_)for(r=0;r<p;r++)(a=n[r])!=null&&(2&a.__u)==0&&(a.__e==o&&(o=T(a)),Ue(a,a));return o}function ke(e,t,n,o){var s,r;if(typeof e.type=="function"){for(s=e.__k,r=0;s&&r<s.length;r++)s[r]&&(s[r].__=e,t=ke(s[r],t,n,o));return t}e.__e!=t&&(o&&(t&&e.type&&!t.parentNode&&(t=T(e)),n.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function nt(e,t,n,o){var s,r,u,a=e.key,l=e.type,i=t[n],p=i!=null&&(2&i.__u)==0;if(i===null&&a==null||p&&a==i.key&&l==i.type)return n;if(o>(p?1:0)){for(s=n-1,r=n+1;s>=0||r<t.length;)if((i=t[u=s>=0?s--:r++])!=null&&(2&i.__u)==0&&a==i.key&&l==i.type)return u}return-1}function he(e,t,n){t[0]=="-"?e.setProperty(t,n??""):e[t]=n==null?"":typeof n!="number"||Ye.test(t)?n:n+"px"}function $(e,t,n,o,s){var r,u;e:if(t=="style")if(typeof n=="string")e.style.cssText=n;else{if(typeof o=="string"&&(e.style.cssText=o=""),o)for(t in o)n&&t in n||he(e.style,t,"");if(n)for(t in n)o&&n[t]==o[t]||he(e.style,t,n[t])}else if(t[0]=="o"&&t[1]=="n")r=t!=(t=t.replace(xe,"$1")),u=t.toLowerCase(),t=u in e||t=="onFocusOut"||t=="onFocusIn"?u.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+r]=n,n?o?n[L]=o[L]:(n[L]=oe,e.addEventListener(t,r?te:ee,r)):e.removeEventListener(t,r?te:ee,r);else{if(s=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=n??"";break e}catch{}typeof n=="function"||(n==null||n===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&n==1?"":n))}}function ge(e){return function(t){if(this.l){var n=this.l[t.type+e];if(t[j]==null)t[j]=oe++;else if(t[j]<n[L])return;return n(m.event?m.event(t):t)}}}function _e(e,t,n,o,s,r,u,a,l,i){var p,_,f,c,v,k,b,g,d,U,w,S,H,D,I,C=t.type;if(t.constructor!==void 0)return null;128&n.__u&&(l=!!(32&n.__u),r=[a=t.__e=n.__e]),(p=m.__b)&&p(t);e:if(typeof C=="function")try{if(g=t.props,d=C.prototype&&C.prototype.render,U=(p=C.contextType)&&o[p.__c],w=p?U?U.props.value:p.__:o,n.__c?b=(_=t.__c=n.__c).__=_.__E:(d?t.__c=_=new C(g,w):(t.__c=_=new W(g,w),_.constructor=C,_.render=rt),U&&U.sub(_),_.state||(_.state={}),_.__n=o,f=_.__d=!0,_.__h=[],_._sb=[]),d&&_.__s==null&&(_.__s=_.state),d&&C.getDerivedStateFromProps!=null&&(_.__s==_.state&&(_.__s=q({},_.__s)),q(_.__s,C.getDerivedStateFromProps(g,_.__s))),c=_.props,v=_.state,_.__v=t,f)d&&C.getDerivedStateFromProps==null&&_.componentWillMount!=null&&_.componentWillMount(),d&&_.componentDidMount!=null&&_.__h.push(_.componentDidMount);else{if(d&&C.getDerivedStateFromProps==null&&g!==c&&_.componentWillReceiveProps!=null&&_.componentWillReceiveProps(g,w),t.__v==n.__v||!_.__e&&_.shouldComponentUpdate!=null&&_.shouldComponentUpdate(g,_.__s,w)===!1){t.__v!=n.__v&&(_.props=g,_.state=_.__s,_.__d=!1),t.__e=n.__e,t.__k=n.__k,t.__k.some(function(M){M&&(M.__=t)}),V.push.apply(_.__h,_._sb),_._sb=[],_.__h.length&&u.push(_);break e}_.componentWillUpdate!=null&&_.componentWillUpdate(g,_.__s,w),d&&_.componentDidUpdate!=null&&_.__h.push(function(){_.componentDidUpdate(c,v,k)})}if(_.context=w,_.props=g,_.__P=e,_.__e=!1,S=m.__r,H=0,d)_.state=_.__s,_.__d=!1,S&&S(t),p=_.render(_.props,_.state,_.context),V.push.apply(_.__h,_._sb),_._sb=[];else do _.__d=!1,S&&S(t),p=_.render(_.props,_.state,_.context),_.state=_.__s;while(_.__d&&++H<25);_.state=_.__s,_.getChildContext!=null&&(o=q(q({},o),_.getChildContext())),d&&!f&&_.getSnapshotBeforeUpdate!=null&&(k=_.getSnapshotBeforeUpdate(c,v)),D=p!=null&&p.type===E&&p.key==null?Se(p.props.children):p,a=we(e,J(D)?D:[D],t,n,o,s,r,u,a,l,i),_.base=t.__e,t.__u&=-161,_.__h.length&&u.push(_),b&&(_.__E=_.__=null)}catch(M){if(t.__v=null,l||r!=null)if(M.then){for(t.__u|=l?160:128;a&&a.nodeType==8&&a.nextSibling;)a=a.nextSibling;r[r.indexOf(a)]=null,t.__e=a}else{for(I=r.length;I--;)re(r[I]);ne(t)}else t.__e=n.__e,t.__k=n.__k,M.then||ne(t);m.__e(M,t,n)}else r==null&&t.__v==n.__v?(t.__k=n.__k,t.__e=n.__e):a=t.__e=ot(n.__e,t,n,o,s,r,u,l,i);return(p=m.diffed)&&p(t),128&t.__u?void 0:a}function ne(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(ne))}function Ce(e,t,n){for(var o=0;o<n.length;o++)se(n[o],n[++o],n[++o]);m.__c&&m.__c(t,e),e.some(function(s){try{e=s.__h,s.__h=[],e.some(function(r){r.call(s)})}catch(r){m.__e(r,s.__v)}})}function Se(e){return typeof e!="object"||e==null||e.__b>0?e:J(e)?e.map(Se):e.constructor!==void 0?null:q({},e)}function ot(e,t,n,o,s,r,u,a,l){var i,p,_,f,c,v,k,b=n.props||B,g=t.props,d=t.type;if(d=="svg"?s="http://www.w3.org/2000/svg":d=="math"?s="http://www.w3.org/1998/Math/MathML":s||(s="http://www.w3.org/1999/xhtml"),r!=null){for(i=0;i<r.length;i++)if((c=r[i])&&"setAttribute"in c==!!d&&(d?c.localName==d:c.nodeType==3)){e=c,r[i]=null;break}}if(e==null){if(d==null)return document.createTextNode(g);e=document.createElementNS(s,d,g.is&&g),a&&(m.__m&&m.__m(t,r),a=!1),r=null}if(d==null)b===g||a&&e.data==g||(e.data=g);else{if(r=d=="textarea"&&g.defaultValue!=null?null:r&&K.call(e.childNodes),!a&&r!=null)for(b={},i=0;i<e.attributes.length;i++)b[(c=e.attributes[i]).name]=c.value;for(i in b)c=b[i],i=="dangerouslySetInnerHTML"?_=c:i=="children"||i in g||i=="value"&&"defaultValue"in g||i=="checked"&&"defaultChecked"in g||$(e,i,null,c,s);for(i in g)c=g[i],i=="children"?f=c:i=="dangerouslySetInnerHTML"?p=c:i=="value"?v=c:i=="checked"?k=c:a&&typeof c!="function"||b[i]===c||$(e,i,c,b[i],s);if(p)a||_&&(p.__html==_.__html||p.__html==e.innerHTML)||(e.innerHTML=p.__html),t.__k=[];else if(_&&(e.innerHTML=""),we(t.type=="template"?e.content:e,J(f)?f:[f],t,n,o,d=="foreignObject"?"http://www.w3.org/1999/xhtml":s,r,u,r?r[0]:n.__k&&T(n,0),a,l),r!=null)for(i=r.length;i--;)re(r[i]);a&&d!="textarea"||(i="value",d=="progress"&&v==null?e.removeAttribute("value"):v!=null&&(v!==e[i]||d=="progress"&&!v||d=="option"&&v!=b[i])&&$(e,i,v,b[i],s),i="checked",k!=null&&k!=e[i]&&$(e,i,k,b[i],s))}return e}function se(e,t,n){try{if(typeof e=="function"){var o=typeof e.__u=="function";o&&e.__u(),o&&t==null||(e.__u=e(t))}else e.current=t}catch(s){m.__e(s,n)}}function Ue(e,t,n){var o,s;if(m.unmount&&m.unmount(e),(o=e.ref)&&(o.current&&o.current!=e.__e||se(o,null,t)),(o=e.__c)!=null){if(o.componentWillUnmount)try{o.componentWillUnmount()}catch(r){m.__e(r,t)}o.base=o.__P=null}if(o=e.__k)for(s=0;s<o.length;s++)o[s]&&Ue(o[s],t,n||typeof e.type!="function");n||re(e.__e),e.__c=e.__=e.__e=void 0}function rt(e,t,n){return this.constructor(e,n)}function Me(e,t,n){var o,s,r,u;t==document&&(t=document.documentElement),m.__&&m.__(e,t),s=(o=typeof n=="function")?null:n&&n.__k||t.__k,r=[],u=[],_e(t,e=(!o&&n||t).__k=Ze(E,null,[e]),s||B,B,t.namespaceURI,!o&&n?[n]:s?null:t.firstChild?K.call(t.childNodes):null,r,!o&&n?n:s?s.__e:t.firstChild,o,u),Ce(r,e,u)}K=V.slice,m={__e:function(e,t,n,o){for(var s,r,u;t=t.__;)if((s=t.__c)&&!s.__)try{if((r=s.constructor)&&r.getDerivedStateFromError!=null&&(s.setState(r.getDerivedStateFromError(e)),u=s.__d),s.componentDidCatch!=null&&(s.componentDidCatch(e,o||{}),u=s.__d),u)return s.__E=s}catch(a){e=a}throw e}},me=0,Ge=function(e){return e!=null&&e.constructor===void 0},W.prototype.setState=function(e,t){var n;n=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=q({},this.state),typeof e=="function"&&(e=e(q({},n),this.props)),e&&q(n,e),e!=null&&this.__v&&(t&&this._sb.push(t),de(this))},W.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),de(this))},W.prototype.render=E,P=[],ve=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,ye=function(e,t){return e.__v.__b-t.__v.__b},Q.__r=0,Z=Math.random().toString(8),j="__d"+Z,L="__a"+Z,xe=/(PointerCapture)$|Capture$/i,oe=0,ee=ge(!1),te=ge(!0),Xe=0;var R,y,ie,qe,X=0,Ne=[],x=m,Ee=x.__b,Pe=x.__r,Ae=x.diffed,He=x.__c,De=x.unmount,Te=x.__;function ae(e,t){x.__h&&x.__h(y,e,X||t),X=0;var n=y.__H||(y.__H={__:[],__h:[]});return e>=n.__.length&&n.__.push({}),n.__[e]}function A(e){return X=1,_t(Re,e)}function _t(e,t,n){var o=ae(R++,2);if(o.t=e,!o.__c&&(o.__=[n?n(t):Re(void 0,t),function(a){var l=o.__N?o.__N[0]:o.__[0],i=o.t(l,a);l!==i&&(o.__N=[i,o.__[1]],o.__c.setState({}))}],o.__c=y,!y.__f)){var s=function(a,l,i){if(!o.__c.__H)return!0;var p=o.__c.__H.__.filter(function(f){return f.__c});if(p.every(function(f){return!f.__N}))return!r||r.call(this,a,l,i);var _=o.__c.props!==a;return p.some(function(f){if(f.__N){var c=f.__[0];f.__=f.__N,f.__N=void 0,c!==f.__[0]&&(_=!0)}}),r&&r.call(this,a,l,i)||_};y.__f=!0;var r=y.shouldComponentUpdate,u=y.componentWillUpdate;y.componentWillUpdate=function(a,l,i){if(this.__e){var p=r;r=void 0,s(a,l,i),r=p}u&&u.call(this,a,l,i)},y.shouldComponentUpdate=s}return o.__N||o.__}function F(e,t){var n=ae(R++,3);!x.__s&&Le(n.__H,t)&&(n.__=e,n.u=t,y.__H.__h.push(n))}function Y(e){return X=5,st(function(){return{current:e}},[])}function st(e,t){var n=ae(R++,7);return Le(n.__H,t)&&(n.__=e(),n.__H=t,n.__h=e),n.__}function it(){for(var e;e=Ne.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(G),t.__h.some(ue),t.__h=[]}catch(n){t.__h=[],x.__e(n,e.__v)}}}x.__b=function(e){y=null,Ee&&Ee(e)},x.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),Te&&Te(e,t)},x.__r=function(e){Pe&&Pe(e),R=0;var t=(y=e.__c).__H;t&&(ie===y?(t.__h=[],y.__h=[],t.__.some(function(n){n.__N&&(n.__=n.__N),n.u=n.__N=void 0})):(t.__h.some(G),t.__h.some(ue),t.__h=[],R=0)),ie=y},x.diffed=function(e){Ae&&Ae(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(Ne.push(t)!==1&&qe===x.requestAnimationFrame||((qe=x.requestAnimationFrame)||ut)(it)),t.__H.__.some(function(n){n.u&&(n.__H=n.u),n.u=void 0})),ie=y=null},x.__c=function(e,t){t.some(function(n){try{n.__h.some(G),n.__h=n.__h.filter(function(o){return!o.__||ue(o)})}catch(o){t.some(function(s){s.__h&&(s.__h=[])}),t=[],x.__e(o,n.__v)}}),He&&He(e,t)},x.unmount=function(e){De&&De(e);var t,n=e.__c;n&&n.__H&&(n.__H.__.some(function(o){try{G(o)}catch(s){t=s}}),n.__H=void 0,t&&x.__e(t,n.__v))};var Ie=typeof requestAnimationFrame=="function";function ut(e){var t,n=function(){clearTimeout(o),Ie&&cancelAnimationFrame(t),setTimeout(e)},o=setTimeout(n,35);Ie&&(t=requestAnimationFrame(n))}function G(e){var t=y,n=e.__c;typeof n=="function"&&(e.__c=void 0,n()),y=t}function ue(e){var t=y;e.__c=e.__(),y=t}function Le(e,t){return!e||e.length!==t.length||t.some(function(n,o){return n!==e[o]})}function Re(e,t){return typeof t=="function"?t(e):t}var at=0;function h(e,t,n,o,s,r){t||(t={});var u,a,l=t;if("ref"in l)for(a in l={},t)a=="ref"?u=t[a]:l[a]=t[a];var i={type:e,props:l,key:n,ref:u,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:--at,__i:-1,__u:0,__source:s,__self:r};if(typeof e=="function"&&(u=e.defaultProps))for(a in u)l[a]===void 0&&(l[a]=u[a]);return m.vnode&&m.vnode(i),i}function Fe({onAccept:e,onDecline:t}){return h("div",{class:"queueup-consent",children:[h("p",{children:"This chat is handled by an AI assistant. Your data is processed per GDPR. By continuing, you consent to AI-assisted processing of your inquiry."}),h("div",{class:"queueup-consent-actions",children:[h("button",{class:"queueup-btn-primary",onClick:e,children:"Accept"}),h("button",{class:"queueup-btn-secondary",onClick:t,children:"Decline"})]})]})}function ze({messages:e,streamingContent:t}){let n=Y(null);return F(()=>{n.current&&(n.current.scrollTop=n.current.scrollHeight)},[e.length,t]),h("div",{class:"queueup-messages",ref:n,children:[e.map((o,s)=>h("div",{class:o.role==="user"?"queueup-msg-user":"queueup-msg-ai",children:o.content},s)),t&&h("div",{class:"queueup-msg-ai",children:t})]})}async function $e(e,t,n,o,s){let r=await fetch(e.replace(/\/+$/,"")+"/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shopId:t,sessionId:n,message:o,consentGranted:!0})});if(!r.ok)throw new Error("Chat request failed: "+r.status);let u=r.body?.getReader();if(!u)throw new Error("No response body");let a=new TextDecoder,l="";for(;;){let{done:i,value:p}=await u.read();if(i)break;l+=a.decode(p,{stream:!0});let _=l.split(`
`);l=_.pop()||"";for(let f of _)if(f.startsWith("data: "))try{let c=JSON.parse(f.slice(6));if(c.type==="text"&&s(c.delta),c.type==="done")return}catch{}}}var z="queueup_session_";function le(e){try{return sessionStorage.getItem(e)}catch{return null}}function ce(e,t){try{sessionStorage.setItem(e,t)}catch{}}function lt(){return typeof crypto<"u"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():"sess-"+Math.random().toString(36).slice(2)+Date.now().toString(36)}function je(e){let t=z+e,n=le(t);if(n)return n;let o=lt();return ce(t,o),o}function Oe(e){let t=le(z+e+"_messages");if(!t)return[];try{let n=JSON.parse(t);return Array.isArray(n)?n.filter(o=>o!=null&&typeof o=="object"&&(o.role==="user"||o.role==="assistant")&&typeof o.content=="string"):[]}catch{return[]}}function pe(e,t){ce(z+e+"_messages",JSON.stringify(t))}function We(e){return le(z+e+"_consent")==="true"}function Be(e){ce(z+e+"_consent","true")}function Ve({shopId:e}){let[t,n]=A(!1),[o,s]=A(!1),[r,u]=A([]),[a,l]=A(""),[i,p]=A(!1),[_,f]=A(null),[c,v]=A(""),k=Y(null);F(()=>{let w=window.QUEUEUP_API_URL||window.location.origin;fetch(`${w}/api/widget/config?shopId=${encodeURIComponent(e)}`).then(S=>S.json()).then(S=>f(S)).catch(()=>f({shopName:"Chat",primaryColor:"#6366f1",slug:e})),u(Oe(e)),s(We(e))},[e]),F(()=>{t&&o&&k.current&&k.current.focus()},[t,o]);let b=()=>{s(!0),Be(e)},g=()=>{n(!1)},d=async()=>{let w=a.trim();if(!w||i)return;let S={role:"user",content:w},H=[...r,S];u(H),l(""),p(!0),v("");let D=je(e),I=window.QUEUEUP_CHAT_API_URL||"https://voice.queueup.com",C="";try{await $e(I,e,D,w,Je=>{C+=Je,v(C)});let M={role:"assistant",content:C},N=[...H,M];u(N),pe(e,N)}catch{let M={role:"assistant",content:"Sorry, something went wrong. Please try again."},N=[...H,M];u(N),pe(e,N)}p(!1),v("")},U=w=>{w.key==="Enter"&&!w.shiftKey&&(w.preventDefault(),d())};return _?h(E,{children:[h("button",{class:"queueup-bubble",onClick:()=>n(!t),"aria-label":"Open chat",children:h("svg",{width:"28",height:"28",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:h("path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"})})}),t&&h("div",{class:"queueup-panel",children:[h("div",{class:"queueup-header",children:[h("span",{children:_.shopName}),h("button",{onClick:()=>n(!1),"aria-label":"Close chat",children:"\xD7"})]}),o?h(E,{children:[h(ze,{messages:r,streamingContent:i?c:""}),h("div",{class:"queueup-input-area",children:[h("input",{ref:k,class:"queueup-input",type:"text",placeholder:"Type a message...",value:a,onInput:w=>l(w.target.value),onKeyDown:U,disabled:i}),h("button",{class:"queueup-send",onClick:d,disabled:i,children:"Send"})]})]}):h(Fe,{onAccept:b,onDecline:g})]})]}):null}function Qe(e){return`
    * { box-sizing: border-box; margin: 0; padding: 0; }

    .queueup-bubble {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${e};
      color: white;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      border: none;
      transition: transform 0.2s;
    }
    .queueup-bubble:hover { transform: scale(1.1); }

    .queueup-panel {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 380px;
      max-height: 520px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      background: white;
      overflow: hidden;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .queueup-header {
      background: ${e};
      color: white;
      padding: 16px;
      font-size: 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .queueup-header button {
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0 4px;
    }

    .queueup-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 340px;
    }

    .queueup-msg-user {
      align-self: flex-end;
      background: ${e};
      color: white;
      padding: 8px 12px;
      border-radius: 12px 12px 0 12px;
      max-width: 80%;
      font-size: 14px;
      line-height: 1.4;
    }

    .queueup-msg-ai {
      align-self: flex-start;
      background: #f1f3f5;
      color: #1a1a2e;
      padding: 8px 12px;
      border-radius: 12px 12px 12px 0;
      max-width: 80%;
      font-size: 14px;
      line-height: 1.4;
    }

    .queueup-input-area {
      display: flex;
      padding: 12px;
      border-top: 1px solid #e5e7eb;
      gap: 8px;
    }

    .queueup-input {
      flex: 1;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 14px;
      outline: none;
      font-family: inherit;
    }
    .queueup-input:focus { border-color: ${e}; }

    .queueup-send {
      background: ${e};
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
    }
    .queueup-send:disabled { opacity: 0.5; cursor: not-allowed; }

    .queueup-consent {
      padding: 24px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .queueup-consent p {
      font-size: 14px;
      color: #4a5568;
      line-height: 1.5;
    }

    .queueup-consent-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .queueup-btn-primary {
      background: ${e};
      color: white;
      border: none;
      border-radius: 8px;
      padding: 10px 24px;
      cursor: pointer;
      font-size: 14px;
    }

    .queueup-btn-secondary {
      background: #e5e7eb;
      color: #374151;
      border: none;
      border-radius: 8px;
      padding: 10px 24px;
      cursor: pointer;
      font-size: 14px;
    }

    .queueup-typing {
      align-self: flex-start;
      color: #9ca3af;
      font-size: 13px;
      padding: 4px 12px;
    }

    .queueup-hidden { display: none; }
  `}var ct=document.currentScript;function Ke(){let e=ct||document.querySelector("script[data-shop-id]");if(!e){console.error("QueueUp widget: could not find script tag");return}let t=e.dataset.shopId||e.getAttribute("data-shop-id");if(!t){console.error("QueueUp widget: data-shop-id attribute required");return}e.dataset.apiUrl&&(window.QUEUEUP_CHAT_API_URL=e.dataset.apiUrl),e.dataset.appUrl&&(window.QUEUEUP_API_URL=e.dataset.appUrl);let n=document.createElement("div");n.id="queueup-widget-host",document.body.appendChild(n);let o=n.attachShadow({mode:"open"}),s=document.createElement("style"),r=e.dataset.color||"#6366f1";s.textContent=Qe(r),o.appendChild(s);let u=document.createElement("div");o.appendChild(u),Me(h(Ve,{shopId:t}),u)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Ke):Ke();})();
