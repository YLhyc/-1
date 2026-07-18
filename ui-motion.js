(function(global) {
  'use strict';
  var animations = new WeakMap();
  var reduceMotion = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getTranslateX(el) {
    if (!el) return 0;
    var t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 0;
    try { return new DOMMatrixReadOnly(t).m41 || 0; } catch(e) {
      var m = t.match(/matrix(?:3d)?\(([^)]+)\)/); if (!m) return 0;
      var p = m[1].split(',').map(Number); return p.length === 16 ? p[12] || 0 : p[4] || 0;
    }
  }
  function setX(el, x, rotate) {
    if (!el) return;
    el.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)' + (rotate ? ' rotate(' + (x / 20).toFixed(2) + 'deg)' : '');
  }
  function stop(el) {
    var running = animations.get(el); if (!running) return getTranslateX(el);
    running.cancelled = true; animations.delete(el); return getTranslateX(el);
  }
  function spring(el, target, velocity, options) {
    if (!el) return;
    var opts = options || {}, state = { cancelled:false }, x = getTranslateX(el), v = (Number(velocity) || 0) * 1000;
    stop(el); animations.set(el, state); el.style.transition = 'none';
    if (reduceMotion) { setX(el, target, opts.rotate); animations.delete(el); if (opts.onRest) opts.onRest(); return; }
    var previous = performance.now();
    function frame(now) {
      if (state.cancelled) return;
      var dt = Math.min(32, Math.max(1, now - previous)) / 1000; previous = now;
      var a = (target - x) * 500 - v * 40; v += a * dt; x += v * dt;
      setX(el, x, opts.rotate);
      if (Math.abs(target - x) < .35 && Math.abs(v) < 6) {
        setX(el, target, opts.rotate); animations.delete(el); if (opts.onRest) opts.onRest(); return;
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  function rubber(value, limit, constant) {
    var c = constant || .55, over = Math.abs(value) - limit;
    if (over <= 0) return value;
    var resisted = (over * limit * c) / (limit + c * over);
    return Math.sign(value) * (limit + resisted);
  }
  function velocity(history) {
    if (!history || history.length < 2) return 0;
    var end = history[history.length - 1], start = end;
    for (var i = history.length - 2; i >= 0; i--) { start = history[i]; if (end.t - start.t >= 70) break; }
    var elapsed = Math.max(1, end.t - start.t); return (end.x - start.x) / elapsed;
  }
  function bindCardSwipe(el, options) {
    if (!el || !global.PointerEvent) return function() {};
    var opts = options || {}, drag = null, revealCalled = false;
    el.style.touchAction = opts.touchAction || 'pan-y';
    el.style.userSelect = 'none';
    function resetClasses() { el.classList.remove(opts.leftClass || 'swipe-left', opts.rightClass || 'swipe-right'); }
    function settleHome() {
      resetClasses();
      el.style.transition = reduceMotion ? 'none' : 'transform .18s cubic-bezier(.23,1,.32,1)';
      setX(el, 0, true);
      setTimeout(function() { if (!drag) el.style.transition = ''; }, 180);
    }
    function down(e) {
      if (!e.isPrimary || drag || e.button > 0 || e.clientX <= (opts.edgeReserve == null ? 22 : opts.edgeReserve)) return;
      var current = stop(el); setX(el, current, true); revealCalled = false;
      el.style.transition = 'none';
      drag = { id:e.pointerId, pointerStartX:e.clientX, pointerStartY:e.clientY, originX:current, axis:'', x:current, captured:false };
      try { el.setPointerCapture(e.pointerId); drag.captured = true; } catch(err) {}
    }
    function move(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var rawDx = e.clientX - drag.pointerStartX, rawDy = e.clientY - drag.pointerStartY;
      if (!drag.axis && Math.max(Math.abs(rawDx), Math.abs(rawDy)) >= 6) {
        drag.axis = Math.abs(rawDx) > Math.abs(rawDy) * 1.05 ? 'x' : 'y';
        if (drag.axis === 'x') e.preventDefault();
      }
      if (drag.axis !== 'x') return;
      e.preventDefault();
      var limit = opts.limit || 120, x = Math.max(-limit, Math.min(limit, drag.originX + rawDx));
      drag.x = x;
      if (!revealCalled && Math.abs(x) > 12) { revealCalled = true; if (opts.onReveal) opts.onReveal(); }
      setX(el, x, true);
      var cue = opts.cue || 70;
      el.classList.toggle(opts.leftClass || 'swipe-left', x < -cue); el.classList.toggle(opts.rightClass || 'swipe-right', x > cue);
    }
    function finish(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var active = drag; drag = null;
      if (active.captured) { try { el.releasePointerCapture(e.pointerId); } catch(err) {} }
      if (e.type === 'pointercancel' || active.axis !== 'x') { settleHome(); return; }
      var threshold = opts.threshold || 80;
      if (Math.abs(active.x) < threshold) { settleHome(); return; }
      var left = active.x < 0;
      resetClasses(); el.style.transition = 'none'; setX(el, 0, true);
      if (left && opts.onLeft) opts.onLeft(); else if (!left && opts.onRight) opts.onRight();
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move, {passive:false});
    el.addEventListener('pointerup', finish); el.addEventListener('pointercancel', finish);
    return function() { stop(el); el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', finish); el.removeEventListener('pointercancel', finish); };
  }
  function bindRevealList(options) {
    if (!global.PointerEvent) return;
    var opts = options || {}, root = opts.root || document, drag = null, opened = null;
    function contentOf(item) { return item && item.querySelector(opts.contentSelector); }
    function widthOf(item) { return typeof opts.width === 'function' ? opts.width(item) : Number(opts.width) || 100; }
    function close(item, v) {
      if (!item) item = opened; if (!item) return;
      var content = contentOf(item); item.classList.remove('swiped'); spring(content, 0, v || 0); if (opened === item) opened = null;
    }
    root.addEventListener('pointerdown', function(e) {
      if (!e.isPrimary || e.button > 0 || e.clientX <= (opts.edgeReserve == null ? 22 : opts.edgeReserve)) return;
      var item = e.target.closest(opts.itemSelector);
      if (!item) { close(); return; }
      if (opened && opened !== item) close(opened);
      var content = contentOf(item); if (!content) return;
      var current = stop(content), now = performance.now();
      drag = { id:e.pointerId,item:item,content:content,startX:e.clientX-current,startY:e.clientY,axis:'',x:current,history:[{x:e.clientX,t:now}] };
    });
    root.addEventListener('pointermove', function(e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX-drag.startX, dy=e.clientY-drag.startY;
      if (!drag.axis && Math.max(Math.abs(dx),Math.abs(dy)) >= 9) {
        drag.axis = Math.abs(dx)>Math.abs(dy)*1.08 ? 'x' : 'y';
        if (drag.axis === 'x') { try { drag.content.setPointerCapture(e.pointerId); } catch(err) {} }
      }
      if (drag.axis !== 'x') return; e.preventDefault();
      var w=widthOf(drag.item), x=Math.min(0, rubber(dx,w,.46)); drag.x=x; drag.item.dataset.wordsSwiped='1';
      drag.history.push({x:e.clientX,t:performance.now()}); if(drag.history.length>8)drag.history.shift(); setX(drag.content,x);
    }, {passive:false});
    function end(e) {
      if (!drag || e.pointerId !== drag.id) return; var d=drag; drag=null;
      if (d.axis !== 'x') { close(d.item); return; }
      var v=velocity(d.history),w=widthOf(d.item),open=Math.abs(d.x)>w*.34 || (v<-.4 && d.x<0);
      if(open){d.item.classList.add('swiped');opened=d.item;spring(d.content,-w,v);}else close(d.item,v);
      setTimeout(function(){delete d.item.dataset.wordsSwiped;},0);
    }
    root.addEventListener('pointerup',end); root.addEventListener('pointercancel',end);
    root.addEventListener('click',function(e){var item=e.target.closest(opts.itemSelector);if(item&&item.dataset.wordsSwiped){e.preventDefault();e.stopImmediatePropagation();delete item.dataset.wordsSwiped;return;}if(!item)close();});
  }
  function installEdgeBack(options) {
    if (!global.PointerEvent) return;
    var opts=options||{},drag=null,indicator=opts.indicator||null;
    document.addEventListener('pointerdown',function(e){
      if(!e.isPrimary||e.button>0||e.clientX>(opts.edge||22)||!opts.canGoBack||!opts.canGoBack())return;
      var surface=opts.getSurface&&opts.getSurface(); if(!surface)return; stop(surface);
      drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,axis:'',x:0,surface:surface,history:[{x:e.clientX,t:performance.now()}]};
    },true);
    document.addEventListener('pointermove',function(e){
      if(!drag||e.pointerId!==drag.id)return;var dx=Math.max(0,e.clientX-drag.startX),dy=e.clientY-drag.startY;
      if(!drag.axis&&Math.max(dx,Math.abs(dy))>=8){drag.axis=dx>Math.abs(dy)*1.05?'x':'y';if(drag.axis==='x'){try{drag.surface.setPointerCapture(e.pointerId)}catch(err){}}}
      if(drag.axis!=='x')return;e.preventDefault();drag.x=rubber(dx,innerWidth*.78,.48);drag.history.push({x:e.clientX,t:performance.now()});if(drag.history.length>8)drag.history.shift();setX(drag.surface,drag.x);drag.surface.style.opacity=String(Math.max(.84,1-drag.x/innerWidth*.16));if(indicator)indicator.classList.toggle('show',drag.x>12);
    },{passive:false,capture:true});
    function end(e){
      if(!drag||e.pointerId!==drag.id)return;var d=drag;drag=null;if(indicator)indicator.classList.remove('show');
      var v=velocity(d.history),commit=d.axis==='x'&&(d.x>Math.min(96,innerWidth*.27)||v>.48);
      if(commit)spring(d.surface,innerWidth,v,{onRest:function(){d.surface.style.opacity='';d.surface.style.transform='';if(opts.onBack)opts.onBack();}});
      else spring(d.surface,0,v,{onRest:function(){d.surface.style.opacity='';d.surface.style.transform='';}});
    }
    document.addEventListener('pointerup',end,true);document.addEventListener('pointercancel',end,true);
  }
  global.WordsMotion={bindCardSwipe:bindCardSwipe,bindRevealList:bindRevealList,installEdgeBack:installEdgeBack,spring:spring,stop:stop,rubber:rubber,reduced:reduceMotion};
})(window);