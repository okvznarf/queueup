"use strict";var QueueUpWidget=(()=>{var V,g,pe,Be,A,ue,fe,de,he,ee,Y,X,Ve,O={},W=[],Qe=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i,Q=Array.isArray;function M(e,t){for(var n in t)e[n]=t[n];return e}function te(e){e&&e.parentNode&&e.parentNode.removeChild(e)}function Ke(e,t,n){var r,s,o,u={};for(o in t)o=="key"?r=t[o]:o=="ref"?s=t[o]:u[o]=t[o];if(arguments.length>2&&(u.children=arguments.length>3?V.call(arguments,2):n),typeof e=="function"&&e.defaultProps!=null)for(o in e.defaultProps)u[o]===void 0&&(u[o]=e.defaultProps[o]);return $(e,u,r,s,null)}function $(e,t,n,r,s){var o={type:e,props:t,key:n,ref:r,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:s??++pe,__i:-1,__u:0};return s==null&&g.vnode!=null&&g.vnode(o),o}function E(e){return e.children}function j(e,t){this.props=e,this.context=t}function D(e,t){if(t==null)return e.__?D(e.__,e.__i+1):null;for(var n;t<e.__k.length;t++)if((n=e.__k[t])!=null&&n.__e!=null)return n.__e;return typeof e.type=="function"?D(e):null}function Je(e){if(e.__P&&e.__d){var t=e.__v,n=t.__e,r=[],s=[],o=M({},t);o.__v=t.__v+1,g.vnode&&g.vnode(o),ne(e.__P,o,t,e.__n,e.__P.namespaceURI,32&t.__u?[n]:null,r,n??D(t),!!(32&t.__u),s),o.__v=t.__v,o.__.__k[o.__i]=o,ye(r,o,s),t.__e=t.__=null,o.__e!=n&&ge(o)}}function ge(e){if((e=e.__)!=null&&e.__c!=null)return e.__e=e.__c.base=null,e.__k.some(function(t){if(t!=null&&t.__e!=null)return e.__e=e.__c.base=t.__e}),ge(e)}function ae(e){(!e.__d&&(e.__d=!0)&&A.push(e)&&!B.__r++||ue!=g.debounceRendering)&&((ue=g.debounceRendering)||fe)(B)}function B(){for(var e,t=1;A.length;)A.length>t&&A.sort(de),e=A.shift(),t=A.length,Je(e);B.__r=0}function me(e,t,n,r,s,o,u,a,l,i,p){var _,f,c,v,k,b,m,h=r&&r.__k||W,U=t.length;for(l=Ge(n,t,h,l,U),_=0;_<U;_++)(c=n.__k[_])!=null&&(f=c.__i!=-1&&h[c.__i]||O,c.__i=_,b=ne(e,c,f,s,o,u,a,l,i,p),v=c.__e,c.ref&&f.ref!=c.ref&&(f.ref&&oe(f.ref,null,c),p.push(c.ref,c.__c||v,c)),k==null&&v!=null&&(k=v),(m=!!(4&c.__u))||f.__k===c.__k?l=ve(c,l,e,m):typeof c.type=="function"&&b!==void 0?l=b:v&&(l=v.nextSibling),c.__u&=-7);return n.__e=k,l}function Ge(e,t,n,r,s){var o,u,a,l,i,p=n.length,_=p,f=0;for(e.__k=new Array(s),o=0;o<s;o++)(u=t[o])!=null&&typeof u!="boolean"&&typeof u!="function"?(typeof u=="string"||typeof u=="number"||typeof u=="bigint"||u.constructor==String?u=e.__k[o]=$(null,u,null,null,null):Q(u)?u=e.__k[o]=$(E,{children:u},null,null,null):u.constructor===void 0&&u.__b>0?u=e.__k[o]=$(u.type,u.props,u.key,u.ref?u.ref:null,u.__v):e.__k[o]=u,l=o+f,u.__=e,u.__b=e.__b+1,a=null,(i=u.__i=Ye(u,n,l,_))!=-1&&(_--,(a=n[i])&&(a.__u|=2)),a==null||a.__v==null?(i==-1&&(s>p?f--:s<p&&f++),typeof u.type!="function"&&(u.__u|=4)):i!=l&&(i==l-1?f--:i==l+1?f++:(i>l?f--:f++,u.__u|=4))):e.__k[o]=null;if(_)for(o=0;o<p;o++)(a=n[o])!=null&&(2&a.__u)==0&&(a.__e==r&&(r=D(a)),be(a,a));return r}function ve(e,t,n,r){var s,o;if(typeof e.type=="function"){for(s=e.__k,o=0;s&&o<s.length;o++)s[o]&&(s[o].__=e,t=ve(s[o],t,n,r));return t}e.__e!=t&&(r&&(t&&e.type&&!t.parentNode&&(t=D(e)),n.insertBefore(e.__e,t||null)),t=e.__e);do t=t&&t.nextSibling;while(t!=null&&t.nodeType==8);return t}function Ye(e,t,n,r){var s,o,u,a=e.key,l=e.type,i=t[n],p=i!=null&&(2&i.__u)==0;if(i===null&&a==null||p&&a==i.key&&l==i.type)return n;if(r>(p?1:0)){for(s=n-1,o=n+1;s>=0||o<t.length;)if((i=t[u=s>=0?s--:o++])!=null&&(2&i.__u)==0&&a==i.key&&l==i.type)return u}return-1}function le(e,t,n){t[0]=="-"?e.setProperty(t,n??""):e[t]=n==null?"":typeof n!="number"||Qe.test(t)?n:n+"px"}function z(e,t,n,r,s){var o,u;e:if(t=="style")if(typeof n=="string")e.style.cssText=n;else{if(typeof r=="string"&&(e.style.cssText=r=""),r)for(t in r)n&&t in n||le(e.style,t,"");if(n)for(t in n)r&&n[t]==r[t]||le(e.style,t,n[t])}else if(t[0]=="o"&&t[1]=="n")o=t!=(t=t.replace(he,"$1")),u=t.toLowerCase(),t=u in e||t=="onFocusOut"||t=="onFocusIn"?u.slice(2):t.slice(2),e.l||(e.l={}),e.l[t+o]=n,n?r?n.u=r.u:(n.u=ee,e.addEventListener(t,o?X:Y,o)):e.removeEventListener(t,o?X:Y,o);else{if(s=="http://www.w3.org/2000/svg")t=t.replace(/xlink(H|:h)/,"h").replace(/sName$/,"s");else if(t!="width"&&t!="height"&&t!="href"&&t!="list"&&t!="form"&&t!="tabIndex"&&t!="download"&&t!="rowSpan"&&t!="colSpan"&&t!="role"&&t!="popover"&&t in e)try{e[t]=n??"";break e}catch{}typeof n=="function"||(n==null||n===!1&&t[4]!="-"?e.removeAttribute(t):e.setAttribute(t,t=="popover"&&n==1?"":n))}}function ce(e){return function(t){if(this.l){var n=this.l[t.type+e];if(t.t==null)t.t=ee++;else if(t.t<n.u)return;return n(g.event?g.event(t):t)}}}function ne(e,t,n,r,s,o,u,a,l,i){var p,_,f,c,v,k,b,m,h,U,w,S,H,T,I,C=t.type;if(t.constructor!==void 0)return null;128&n.__u&&(l=!!(32&n.__u),o=[a=t.__e=n.__e]),(p=g.__b)&&p(t);e:if(typeof C=="function")try{if(m=t.props,h="prototype"in C&&C.prototype.render,U=(p=C.contextType)&&r[p.__c],w=p?U?U.props.value:p.__:r,n.__c?b=(_=t.__c=n.__c).__=_.__E:(h?t.__c=_=new C(m,w):(t.__c=_=new j(m,w),_.constructor=C,_.render=Ze),U&&U.sub(_),_.state||(_.state={}),_.__n=r,f=_.__d=!0,_.__h=[],_._sb=[]),h&&_.__s==null&&(_.__s=_.state),h&&C.getDerivedStateFromProps!=null&&(_.__s==_.state&&(_.__s=M({},_.__s)),M(_.__s,C.getDerivedStateFromProps(m,_.__s))),c=_.props,v=_.state,_.__v=t,f)h&&C.getDerivedStateFromProps==null&&_.componentWillMount!=null&&_.componentWillMount(),h&&_.componentDidMount!=null&&_.__h.push(_.componentDidMount);else{if(h&&C.getDerivedStateFromProps==null&&m!==c&&_.componentWillReceiveProps!=null&&_.componentWillReceiveProps(m,w),t.__v==n.__v||!_.__e&&_.shouldComponentUpdate!=null&&_.shouldComponentUpdate(m,_.__s,w)===!1){t.__v!=n.__v&&(_.props=m,_.state=_.__s,_.__d=!1),t.__e=n.__e,t.__k=n.__k,t.__k.some(function(q){q&&(q.__=t)}),W.push.apply(_.__h,_._sb),_._sb=[],_.__h.length&&u.push(_);break e}_.componentWillUpdate!=null&&_.componentWillUpdate(m,_.__s,w),h&&_.componentDidUpdate!=null&&_.__h.push(function(){_.componentDidUpdate(c,v,k)})}if(_.context=w,_.props=m,_.__P=e,_.__e=!1,S=g.__r,H=0,h)_.state=_.__s,_.__d=!1,S&&S(t),p=_.render(_.props,_.state,_.context),W.push.apply(_.__h,_._sb),_._sb=[];else do _.__d=!1,S&&S(t),p=_.render(_.props,_.state,_.context),_.state=_.__s;while(_.__d&&++H<25);_.state=_.__s,_.getChildContext!=null&&(r=M(M({},r),_.getChildContext())),h&&!f&&_.getSnapshotBeforeUpdate!=null&&(k=_.getSnapshotBeforeUpdate(c,v)),T=p!=null&&p.type===E&&p.key==null?xe(p.props.children):p,a=me(e,Q(T)?T:[T],t,n,r,s,o,u,a,l,i),_.base=t.__e,t.__u&=-161,_.__h.length&&u.push(_),b&&(_.__E=_.__=null)}catch(q){if(t.__v=null,l||o!=null)if(q.then){for(t.__u|=l?160:128;a&&a.nodeType==8&&a.nextSibling;)a=a.nextSibling;o[o.indexOf(a)]=null,t.__e=a}else{for(I=o.length;I--;)te(o[I]);Z(t)}else t.__e=n.__e,t.__k=n.__k,q.then||Z(t);g.__e(q,t,n)}else o==null&&t.__v==n.__v?(t.__k=n.__k,t.__e=n.__e):a=t.__e=Xe(n.__e,t,n,r,s,o,u,l,i);return(p=g.diffed)&&p(t),128&t.__u?void 0:a}function Z(e){e&&(e.__c&&(e.__c.__e=!0),e.__k&&e.__k.some(Z))}function ye(e,t,n){for(var r=0;r<n.length;r++)oe(n[r],n[++r],n[++r]);g.__c&&g.__c(t,e),e.some(function(s){try{e=s.__h,s.__h=[],e.some(function(o){o.call(s)})}catch(o){g.__e(o,s.__v)}})}function xe(e){return typeof e!="object"||e==null||e.__b>0?e:Q(e)?e.map(xe):M({},e)}function Xe(e,t,n,r,s,o,u,a,l){var i,p,_,f,c,v,k,b=n.props||O,m=t.props,h=t.type;if(h=="svg"?s="http://www.w3.org/2000/svg":h=="math"?s="http://www.w3.org/1998/Math/MathML":s||(s="http://www.w3.org/1999/xhtml"),o!=null){for(i=0;i<o.length;i++)if((c=o[i])&&"setAttribute"in c==!!h&&(h?c.localName==h:c.nodeType==3)){e=c,o[i]=null;break}}if(e==null){if(h==null)return document.createTextNode(m);e=document.createElementNS(s,h,m.is&&m),a&&(g.__m&&g.__m(t,o),a=!1),o=null}if(h==null)b===m||a&&e.data==m||(e.data=m);else{if(o=o&&V.call(e.childNodes),!a&&o!=null)for(b={},i=0;i<e.attributes.length;i++)b[(c=e.attributes[i]).name]=c.value;for(i in b)c=b[i],i=="dangerouslySetInnerHTML"?_=c:i=="children"||i in m||i=="value"&&"defaultValue"in m||i=="checked"&&"defaultChecked"in m||z(e,i,null,c,s);for(i in m)c=m[i],i=="children"?f=c:i=="dangerouslySetInnerHTML"?p=c:i=="value"?v=c:i=="checked"?k=c:a&&typeof c!="function"||b[i]===c||z(e,i,c,b[i],s);if(p)a||_&&(p.__html==_.__html||p.__html==e.innerHTML)||(e.innerHTML=p.__html),t.__k=[];else if(_&&(e.innerHTML=""),me(t.type=="template"?e.content:e,Q(f)?f:[f],t,n,r,h=="foreignObject"?"http://www.w3.org/1999/xhtml":s,o,u,o?o[0]:n.__k&&D(n,0),a,l),o!=null)for(i=o.length;i--;)te(o[i]);a||(i="value",h=="progress"&&v==null?e.removeAttribute("value"):v!=null&&(v!==e[i]||h=="progress"&&!v||h=="option"&&v!=b[i])&&z(e,i,v,b[i],s),i="checked",k!=null&&k!=e[i]&&z(e,i,k,b[i],s))}return e}function oe(e,t,n){try{if(typeof e=="function"){var r=typeof e.__u=="function";r&&e.__u(),r&&t==null||(e.__u=e(t))}else e.current=t}catch(s){g.__e(s,n)}}function be(e,t,n){var r,s;if(g.unmount&&g.unmount(e),(r=e.ref)&&(r.current&&r.current!=e.__e||oe(r,null,t)),(r=e.__c)!=null){if(r.componentWillUnmount)try{r.componentWillUnmount()}catch(o){g.__e(o,t)}r.base=r.__P=null}if(r=e.__k)for(s=0;s<r.length;s++)r[s]&&be(r[s],t,n||typeof e.type!="function");n||te(e.__e),e.__c=e.__=e.__e=void 0}function Ze(e,t,n){return this.constructor(e,n)}function we(e,t,n){var r,s,o,u;t==document&&(t=document.documentElement),g.__&&g.__(e,t),s=(r=typeof n=="function")?null:n&&n.__k||t.__k,o=[],u=[],ne(t,e=(!r&&n||t).__k=Ke(E,null,[e]),s||O,O,t.namespaceURI,!r&&n?[n]:s?null:t.firstChild?V.call(t.childNodes):null,o,!r&&n?n:s?s.__e:t.firstChild,r,u),ye(o,e,u)}V=W.slice,g={__e:function(e,t,n,r){for(var s,o,u;t=t.__;)if((s=t.__c)&&!s.__)try{if((o=s.constructor)&&o.getDerivedStateFromError!=null&&(s.setState(o.getDerivedStateFromError(e)),u=s.__d),s.componentDidCatch!=null&&(s.componentDidCatch(e,r||{}),u=s.__d),u)return s.__E=s}catch(a){e=a}throw e}},pe=0,Be=function(e){return e!=null&&e.constructor===void 0},j.prototype.setState=function(e,t){var n;n=this.__s!=null&&this.__s!=this.state?this.__s:this.__s=M({},this.state),typeof e=="function"&&(e=e(M({},n),this.props)),e&&M(n,e),e!=null&&this.__v&&(t&&this._sb.push(t),ae(this))},j.prototype.forceUpdate=function(e){this.__v&&(this.__e=!0,e&&this.__h.push(e),ae(this))},j.prototype.render=E,A=[],fe=typeof Promise=="function"?Promise.prototype.then.bind(Promise.resolve()):setTimeout,de=function(e,t){return e.__v.__b-t.__v.__b},B.__r=0,he=/(PointerCapture)$|Capture$/i,ee=0,Y=ce(!1),X=ce(!0),Ve=0;var L,y,re,ke,J=0,Ae=[],x=g,Ce=x.__b,Se=x.__r,Ue=x.diffed,qe=x.__c,Me=x.unmount,Ee=x.__;function se(e,t){x.__h&&x.__h(y,e,J||t),J=0;var n=y.__H||(y.__H={__:[],__h:[]});return e>=n.__.length&&n.__.push({}),n.__[e]}function P(e){return J=1,et(Te,e)}function et(e,t,n){var r=se(L++,2);if(r.t=e,!r.__c&&(r.__=[n?n(t):Te(void 0,t),function(a){var l=r.__N?r.__N[0]:r.__[0],i=r.t(l,a);l!==i&&(r.__N=[i,r.__[1]],r.__c.setState({}))}],r.__c=y,!y.__f)){var s=function(a,l,i){if(!r.__c.__H)return!0;var p=r.__c.__H.__.filter(function(f){return f.__c});if(p.every(function(f){return!f.__N}))return!o||o.call(this,a,l,i);var _=r.__c.props!==a;return p.some(function(f){if(f.__N){var c=f.__[0];f.__=f.__N,f.__N=void 0,c!==f.__[0]&&(_=!0)}}),o&&o.call(this,a,l,i)||_};y.__f=!0;var o=y.shouldComponentUpdate,u=y.componentWillUpdate;y.componentWillUpdate=function(a,l,i){if(this.__e){var p=o;o=void 0,s(a,l,i),o=p}u&&u.call(this,a,l,i)},y.shouldComponentUpdate=s}return r.__N||r.__}function R(e,t){var n=se(L++,3);!x.__s&&He(n.__H,t)&&(n.__=e,n.u=t,y.__H.__h.push(n))}function G(e){return J=5,tt(function(){return{current:e}},[])}function tt(e,t){var n=se(L++,7);return He(n.__H,t)&&(n.__=e(),n.__H=t,n.__h=e),n.__}function nt(){for(var e;e=Ae.shift();){var t=e.__H;if(e.__P&&t)try{t.__h.some(K),t.__h.some(_e),t.__h=[]}catch(n){t.__h=[],x.__e(n,e.__v)}}}x.__b=function(e){y=null,Ce&&Ce(e)},x.__=function(e,t){e&&t.__k&&t.__k.__m&&(e.__m=t.__k.__m),Ee&&Ee(e,t)},x.__r=function(e){Se&&Se(e),L=0;var t=(y=e.__c).__H;t&&(re===y?(t.__h=[],y.__h=[],t.__.some(function(n){n.__N&&(n.__=n.__N),n.u=n.__N=void 0})):(t.__h.some(K),t.__h.some(_e),t.__h=[],L=0)),re=y},x.diffed=function(e){Ue&&Ue(e);var t=e.__c;t&&t.__H&&(t.__H.__h.length&&(Ae.push(t)!==1&&ke===x.requestAnimationFrame||((ke=x.requestAnimationFrame)||ot)(nt)),t.__H.__.some(function(n){n.u&&(n.__H=n.u),n.u=void 0})),re=y=null},x.__c=function(e,t){t.some(function(n){try{n.__h.some(K),n.__h=n.__h.filter(function(r){return!r.__||_e(r)})}catch(r){t.some(function(s){s.__h&&(s.__h=[])}),t=[],x.__e(r,n.__v)}}),qe&&qe(e,t)},x.unmount=function(e){Me&&Me(e);var t,n=e.__c;n&&n.__H&&(n.__H.__.some(function(r){try{K(r)}catch(s){t=s}}),n.__H=void 0,t&&x.__e(t,n.__v))};var Pe=typeof requestAnimationFrame=="function";function ot(e){var t,n=function(){clearTimeout(r),Pe&&cancelAnimationFrame(t),setTimeout(e)},r=setTimeout(n,35);Pe&&(t=requestAnimationFrame(n))}function K(e){var t=y,n=e.__c;typeof n=="function"&&(e.__c=void 0,n()),y=t}function _e(e){var t=y;e.__c=e.__(),y=t}function He(e,t){return!e||e.length!==t.length||t.some(function(n,r){return n!==e[r]})}function Te(e,t){return typeof t=="function"?t(e):t}var rt=0;function d(e,t,n,r,s,o){t||(t={});var u,a,l=t;if("ref"in l)for(a in l={},t)a=="ref"?u=t[a]:l[a]=t[a];var i={type:e,props:l,key:n,ref:u,__k:null,__:null,__b:0,__e:null,__c:null,constructor:void 0,__v:--rt,__i:-1,__u:0,__source:s,__self:o};if(typeof e=="function"&&(u=e.defaultProps))for(a in u)l[a]===void 0&&(l[a]=u[a]);return g.vnode&&g.vnode(i),i}function De({onAccept:e,onDecline:t}){return d("div",{class:"queueup-consent",children:[d("p",{children:"This chat is handled by an AI assistant. Your data is processed per GDPR. By continuing, you consent to AI-assisted processing of your inquiry."}),d("div",{class:"queueup-consent-actions",children:[d("button",{class:"queueup-btn-primary",onClick:e,children:"Accept"}),d("button",{class:"queueup-btn-secondary",onClick:t,children:"Decline"})]})]})}function Ie({messages:e,streamingContent:t}){let n=G(null);return R(()=>{n.current&&(n.current.scrollTop=n.current.scrollHeight)},[e.length,t]),d("div",{class:"queueup-messages",ref:n,children:[e.map((r,s)=>d("div",{class:r.role==="user"?"queueup-msg-user":"queueup-msg-ai",children:r.content},s)),t&&d("div",{class:"queueup-msg-ai",children:t})]})}async function Ne(e,t,n,r,s){let o=await fetch(e+"/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({shopId:t,sessionId:n,message:r,consentGranted:!0})});if(!o.ok)throw new Error("Chat request failed: "+o.status);let u=o.body?.getReader();if(!u)throw new Error("No response body");let a=new TextDecoder,l="";for(;;){let{done:i,value:p}=await u.read();if(i)break;l+=a.decode(p,{stream:!0});let _=l.split(`
`);l=_.pop()||"";for(let f of _)if(f.startsWith("data: "))try{let c=JSON.parse(f.slice(6));if(c.type==="text"&&s(c.delta),c.type==="done")return}catch{}}}var F="queueup_session_";function Le(e){let t=F+e,n=sessionStorage.getItem(t);return n||(n=crypto.randomUUID(),sessionStorage.setItem(t,n)),n}function Re(e){try{let t=sessionStorage.getItem(F+e+"_messages");return t?JSON.parse(t):[]}catch{return[]}}function ie(e,t){sessionStorage.setItem(F+e+"_messages",JSON.stringify(t))}function Fe(e){return sessionStorage.getItem(F+e+"_consent")==="true"}function ze(e){sessionStorage.setItem(F+e+"_consent","true")}function $e({shopId:e}){let[t,n]=P(!1),[r,s]=P(!1),[o,u]=P([]),[a,l]=P(""),[i,p]=P(!1),[_,f]=P(null),[c,v]=P(""),k=G(null);R(()=>{let w=window.QUEUEUP_API_URL||window.location.origin;fetch(`${w}/api/widget/config?shopId=${encodeURIComponent(e)}`).then(S=>S.json()).then(S=>f(S)).catch(()=>f({shopName:"Chat",primaryColor:"#6366f1",slug:e})),u(Re(e)),s(Fe(e))},[e]),R(()=>{t&&r&&k.current&&k.current.focus()},[t,r]);let b=()=>{s(!0),ze(e)},m=()=>{n(!1)},h=async()=>{let w=a.trim();if(!w||i)return;let S={role:"user",content:w},H=[...o,S];u(H),l(""),p(!0),v("");let T=Le(e),I=window.QUEUEUP_CHAT_API_URL||"https://voice.queueup.com",C="";try{await Ne(I,e,T,w,We=>{C+=We,v(C)});let q={role:"assistant",content:C},N=[...H,q];u(N),ie(e,N)}catch{let q={role:"assistant",content:"Sorry, something went wrong. Please try again."},N=[...H,q];u(N),ie(e,N)}p(!1),v("")},U=w=>{w.key==="Enter"&&!w.shiftKey&&(w.preventDefault(),h())};return _?d(E,{children:[d("button",{class:"queueup-bubble",onClick:()=>n(!t),"aria-label":"Open chat",children:d("svg",{width:"28",height:"28",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",children:d("path",{d:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"})})}),t&&d("div",{class:"queueup-panel",children:[d("div",{class:"queueup-header",children:[d("span",{children:_.shopName}),d("button",{onClick:()=>n(!1),"aria-label":"Close chat",children:"\xD7"})]}),r?d(E,{children:[d(Ie,{messages:o,streamingContent:i?c:""}),d("div",{class:"queueup-input-area",children:[d("input",{ref:k,class:"queueup-input",type:"text",placeholder:"Type a message...",value:a,onInput:w=>l(w.target.value),onKeyDown:U,disabled:i}),d("button",{class:"queueup-send",onClick:h,disabled:i,children:"Send"})]})]}):d(De,{onAccept:b,onDecline:m})]})]}):null}function je(e){return`
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
  `}var _t=document.currentScript;function Oe(){let e=_t||document.querySelector("script[data-shop-id]");if(!e){console.error("QueueUp widget: could not find script tag");return}let t=e.dataset.shopId||e.getAttribute("data-shop-id");if(!t){console.error("QueueUp widget: data-shop-id attribute required");return}e.dataset.apiUrl&&(window.QUEUEUP_CHAT_API_URL=e.dataset.apiUrl),e.dataset.appUrl&&(window.QUEUEUP_API_URL=e.dataset.appUrl);let n=document.createElement("div");n.id="queueup-widget-host",document.body.appendChild(n);let r=n.attachShadow({mode:"open"}),s=document.createElement("style"),o=e.dataset.color||"#6366f1";s.textContent=je(o),r.appendChild(s);let u=document.createElement("div");r.appendChild(u),we(d($e,{shopId:t}),u)}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Oe):Oe();})();
