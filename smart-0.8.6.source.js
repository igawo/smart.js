// smart.js 0.8.6.130725a
//
// http://smartjs.net/
// (c) 2011-2013 akira igarashi (UNIZONBEX)
// License : www.opensource.org/licenses/mit-license.php



// Rev.0.8.6.130725a Android4.0 一部端末で移動変形不具合対策
//                   Androidボタン枠非表示
//                   Binder不具合修正
// Rev.0.8.5.121013a Android2.1 drawImage対策
// Rev.0.8.4.121012a Assetsバグ調整 / Viewバグ調整
// Rev.0.8.3.120925a Stage調整 / regX,regY 0で初期化実装 / Canvas drawImageバグ修正(Android)
// Rev.0.8.2.120911a Canvasのw,h省略可に変更 / window.onloadをaddEventListenerへ変更
// Rev.0.8.1.120908a Timetable追加 / Vire.matrix追加(仮)
// Rev.0.8.0.120902a Viewにz(zIndex)追加 / Binderバグ修正
// Rev.0.8.0.120901b 余分なコード削除 / Tween修正
// Rev.0.7.0.120829a バグFIX
// Rev.0.7.0.120826a Border追加 / バグFIX
// Rev.0.6.0.120819b カーソル制御 / バグFIX
// Rev.0.5.0.120819a タッチイベント対応 / 幅高さ管理方法変更 / バグFIX
// Rev.0.4.0.120816b バグ調整
// Rev.0.4.0.120816a リサイズに対応 / Stage引数にID指定可能に
// Rev.0.3.0.120815a readyをリスト管理化
// Rev.0.3.0.120814a マウス操作関連対応
// Rev.0.3.0.120727a Text追加
// Rev.0.2.0.120726a 関数群を大幅改正 / Animation追加
// Rev.0.2.0.111215a View に scale を追加
// Rev.0.1.0.111103a 試作


// TODO : Android4.1- canvas clear不具合対策


(function(w)
{

	if(w.smart) return;


	var smart = w.smart = {};


	var canvasSupport = (function() // -- 120901
	{
		var cvs = document.createElement("canvas");
		return (cvs && typeof cvs.getContext === "function");
	})();
	if(!canvasSupport)
	{
		smart.ready = function(a,b){};
		return;
	}



	if(typeof Object.defineProperty !== "function")
	{
		Object.defineProperty = function(obj, prop, desc)
		{
			if ("value" in desc) obj[prop] =  desc.value;
			if ("get"   in desc) obj.__defineGetter__(prop, desc.get);
			if ("set"   in desc) obj.__defineSetter__(prop, desc.set);
			return obj;
		};
	}
	if(typeof Object.defineProperties !== "function")
	{
		Object.defineProperties = function(obj, descs)
		{
			for (var prop in descs) if (descs.hasOwnProperty(prop))
			{
				Object.defineProperty(obj, prop, descs[prop]);
			}
			return obj;
		};
	}
	if(typeof Object.create !== "function")
	{
		Object.create = function(prototype, descs)
		{
			function F() {};
			F.prototype = prototype;
			var obj = new F();
			if (descs != null) Object.defineProperties(obj, descs);
			return obj;
		};
	}
	if(typeof Object.getPrototypeOf !== "function")
	{
		Object.getPrototypeOf = function(obj){
			return obj.__proto__;
		};
	}




	smart.guid = 0;
	smart.defaultFont  = "";
	smart.touchEnabled = (function()
	{
		var div = document.createElement("div");
		div.setAttribute("ontouchstart","return");
		return typeof div.ontouchstart === "function";
	})();
	smart.online = (location.href.substr(0,4) === "http");

	smart.isAndroid40 = (/Android\s4\.0/.test(navigator.userAgent)); // -- 130129
	smart.isAndroid41 = (/Android\s4\.[1|2]/.test(navigator.userAgent)); // -- 130130
	smart.oldAndroid  = (/Android\s2\.[0|1]/.test(navigator.userAgent)); // -- 121013


	var SMART       = "smart";
	var PARAM_ERROR = " param error";
	var DEFAULT_FPS = 30;

	var PREFIX = (function()
	{
		var ua = navigator.userAgent;
		if (ua.indexOf("Opera") != -1)         return "O";
		else if (ua.indexOf("MSIE") != -1)     return "ms";
		else if (ua.indexOf("WebKit") != -1)   return "webkit";
		else if (navigator.product == "Gecko") return "Moz";
		else return "";
	})();



	smart.error = function(message) // -- 130130
	{
		throw "smart.js error : " + message;
	};


	smart.extend = function(superclass, definition)
	{
		if(arguments.length == 1)
		{
			definition = superclass;
			superclass = Object;
		}
		for (var prop in definition) if (definition.hasOwnProperty(prop))
		{
			if(typeof(definition[prop]) === "function")
			{
				definition[prop] = {value:definition[prop],writable:true,enumerable:true};
			}
			else if(!('enumerable' in definition[prop]))
			{
				definition[prop].enumerable = true;
			}
		}
		var subclass = function (){subclass.prototype.init.apply(this, arguments)};
		subclass.prototype = Object.create(superclass.prototype, definition);
		return subclass;
	};




	var uiEvents = ["click","mouseover","mouseout","mousedown","mouseup","mousemove","touchstart","touchmove","touchend","touchcancel","gesturestart","gesturechange","gestureend"];
	var events = uiEvents.concat(["enterframe","change","lastframe","complete","progress","resize"]); // -- 130130


	// イベント登録 / 発行
	smart.Binder = smart.extend({
		init:function()
		{
			this.name = "Binder";
			this._listable = {};
			this._callbacks = {};

			this._enabled = true; // -- 120818
		},
		enabled:{
			get :function( ) {return this._enabled},
			set :function(b) {this._enabled = b}
		},
		bind:function(type, listener)
		{
			if(events.indexOf(type) == -1)
			{
				alert(SMART + ".bind" + PARAM_ERROR);
				return;
			}

			var listeners = this._listable[type];

			if (listeners == null)
			{
				this._listable[type] = [listener];
			}
			else if(listeners.indexOf(listener) == -1)
			{
				listeners.push(listener); // unshift > push -- 130130
			}
			else
			{
				return; // -- 120902
			}

			// elementリスナー への登録 -- 調整 -- 120902
			if(uiEvents.indexOf(type) > -1 && this.element && !this._callbacks[type]) // -- 130129
			{
				var instance = this;
				var fn = this._callbacks[type] = function(e)
				{
					if(e.currentTarget == instance.element) // -- 130129
					{
						var mouseObject = e; // イベント情報をそのまま設定 -- 120818

						mouseObject.mouseX = e.layerX != undefined ? e.layerX : e.offsetX;
						mouseObject.mouseY = e.layerY != undefined ? e.layerY : e.offsetY;
						mouseObject.smartTarget = instance; // -- 130129

						instance.trigger(type,mouseObject);
					}

					// ネイティブイベントのコントロール
					// e.stopPropagation();
					// e.preventDefault();
				};
				this.element.addEventListener(type,fn);
			}
		},
		unbind:function(type, listener)
		{
			var listeners = this._listable[type];

			if (listeners != null)
			{
				var i = listeners.indexOf(listener);

				if (i != -1) listeners.splice(i, 1);
				if(listeners.length == 0)
				{
					listeners[type] = null;

					// elementリスナー から削除
					if(uiEvents.indexOf(type) > -1 && this.element && this._callbacks[type]) // -- 130129
					{
						this.element.removeEventListener(type,this._callbacks[type]);
						this._callbacks[type] = null;
					}
				}
			}
		},
		trigger:function(type,data)
		{
			if(!this._enabled) return; // -- 120818

			if(!data) data = {};
			data.target = this;
			data.type = type;

			var listeners = this._listable[type];
			if(listeners != undefined)
			{
				for(var i = 0, len = listeners.length; i < len; i++)
				{
					if(listeners[i] != null) listeners[i].call(this,data); // -- 120816
				}
			}
		}
	});





	// 画像コレクション --------------------------------------------------
	smart.Assets = smart.extend(smart.Binder,{
		init:function()
		{
			smart.Binder.apply(this);

			this.name = "Assets";
			this._total = 0;
			this._count = 0;
			this._data  = {};
			this._complete = null;
		},
		load :function(files,callback)
		{
			if(typeof callback === "function")
			{
				this._complete = callback;
			}

			for(var key in files) if (files.hasOwnProperty(key)) // -- 121012
			{
				this._total++;
				this._load(key,files[key],function(key_,img,file,success)
				{
					this._data[key_] = img; // this[key] = Image
					this._count++;

					this.trigger("progress");
					if(this._count == this._total)
					{
						this.trigger("complete");
						if(typeof this._complete === "function")
						{
							var fn = this._complete;
							this._complete = null;
							fn(this._data);
						}
					}
				});
			}
		},
		total :{
			get:function(){return this._total}
		},
		count :{
			get:function(){return this._count}
		},
		data  :{
			get:function(){return this._data}
		},
		_load :function(key,file,callback)
		{
			var img = new Image();
			var instance = this;
			img.onload = function()
			{
				callback.call(instance,key,img,file,true);
			};
			img.onerror = function() // -- 111202
			{
				callback.call(instance,key,img,file,false);
			};
			img.src = file;
		}
	});













	// 表示オブジェクトの基 ----------------------------------------------------
	//
	//
	//
	smart.View = smart.extend(smart.Binder,{

		init:function()
		{
			smart.Binder.apply(this);

			this.name     = "View";
			this._id       = "";

			this._parent   = null;
			this._element  = document.createElement("div");
			this._visible  = true;
			this._x        = 0;
			this._y        = 0;
			this._alpha    = 1;
			this._rotation = 0;
			this._regX     = 0; // -- 120531
			this._regY     = 0;
			this._scaleX   = 1; // -- 120115
			this._scaleY   = 1;
			this._cursor   = "auto"; // -- 120819
			this._z        = 0;    // -- 120902
			this._bg       = null; // -- Box,Textから移動 -- 120821
			this._border   = null;
		},
		element:{
			get:function(){return this._element}
		},
		id: {
			get: function( ) {return this._id},
			set: function(s)
			{
				this._id = s;
				if(this._element) this._element.id = s;
			}
		},
		bg: {
			get: function() {
				if(!this._bg) this._bg = new smart.Background(this._element);
				return this._bg;
			}
		},
		border: {
			get: function() {
				if(!this._border) this._border = new smart.Border(this._element);
				return this._border;
			}
		},
		parent:{
			get :function( ) {return this._parent}
		},
		visible:{
			get :function( ) {return this._visible},
			set :function(b) {this._element.style.display = (this._visible = b) ? "block" : "none"}
		},
		x: {
			get: function( ) {return this._x},
			set: function(n) {
				this._x = n;
				this._transform();
			}
		},
		y: {
			get: function( ) {return this._y},
			set: function(n) {
				this._y = n;
				this._transform();
			}
		},
		z:{ // -- 120902
			get :function( ) {return this._z},
			set :function(n)
			{
				this._element.style.zIndex = (this._z = n);
			}
		},
		alpha:{
			get :function( ) {return this._alpha},
			set :function(n) {this._element.style.opacity = this._alpha = n}
		},
		scale : {
			get :function( ) {return this._scaleX}, // x 優先
			set :function(n) {
				this._scaleX = this._scaleY = n;
				this._transform();
			}
		},
		scaleX : {
			get :function( ) {return this._scaleX},
			set :function(n) {
				this._scaleX = n;
				this._transform();
			}
		},
		scaleY : {
			get :function( ) {return this._scaleY},
			set :function(n) {
				this._scaleY = n;
				this._transform();
			}
		},
		regX: {
			get: function( ) {return this._regX},
			set: function(n) {
				this._regX = n;
				this._transOrigin();
			}
		},
		regY: {
			get: function( ) {return this._regY},
			set: function(n) {
				this._regY = n;
				this._transOrigin();
			}
		},
		rotation:{
			get :function( ) {return this._rotation},
			set :function(n) {
				this._rotation = n;
				this._transform();
			}
		},
		matrix:{ // -- 120908
			set :function(arr)
			{
				this._element.style[PREFIX + "Transform"] = "matrix(" + arr.join(",") + ")";
			}
		},
		_transReset:function() // -- 130130
		{
			this._element.style[PREFIX + "TransformOrigin"] = "0 0";
			this._element.style[PREFIX + "Transform"] = "translate(0,0) rotate(0) scale(1,1)";
		},
		_transOrigin:function()
		{
			this._element.style[PREFIX + "TransformOrigin"] = this._regX + "px " + this._regY + "px";
		},
		_transform:function()
		{
			this._element.style[PREFIX + "Transform"] = "translate(" + this._x + "px," + this._y + "px) " + "rotate(" + this._rotation + "deg)" + "scale(" + this._scaleX + "," + this._scaleY + ")";
		},
		stage :{
			get :function()
			{
				var instance = this;
				while(!instance.isStage)
				{
					if(instance.parent) instance = instance.parent;
					else return null;
				}
				return instance;
			}
		},
		cursor:{ // -- 120819
			get :function( ) {return this._cursor},
			set :function(s)
			{
				if(!s) s = "auto";
				this._element.style.cursor = (this._cursor = s);
			}
		},
		click:function(fn)
		{
			this.bind("click",fn);
		},
		mouseover:function(fn)
		{
			this.bind("mouseover",fn);
		},
		mouseout:function(fn)
		{
			this.bind("mouseout",fn);
		},
		mousedown:function(fn)
		{
			this.bind("mousedown",fn);
		},
		mouseup:function(fn)
		{
			this.bind("mouseup",fn);
		},
		mousemove:function(fn)
		{
			this.bind("mousemove",fn);
		},
		touchstart:function(fn) // -- 121012
		{
			this.bind("touchstart",fn);
		},
		touchmove:function(fn)
		{
			this.bind("touchmove",fn);
		},
		touchend:function(fn)
		{
			this.bind("touchend",fn);
		}
	});


	// コンテナ <div>をラップ ------------------------------------------
	//
	smart.Box = smart.extend(smart.View,{
		init:function(w_ ,h_)
		{
			smart.View.apply(this);

			this.name = "Box";

			this._mask     = false;
			this._children = [];
			this._element  = document.createElement("div");
			this._element.style.position = "absolute";
			this.id = SMART + "-box" + smart.guid++;

			if(w_ != undefined) this.bg.width  = w_;
			if(h_ != undefined) this.bg.height = h_;

			this._transOrigin(); // -- 120925
		},
		mask:{
			get: function( ) {return this._mask},
			set: function(b) {this._element.style.overflow = (this._mask = b) ? "hidden" : "visible"}
		},
		width: {
			get: function( ) {return this.bg.width},
			set: function(n) {this.bg.width = n}
		},
		height: {
			get: function( ) {return this.bg.height},
			set: function(n) {this.bg.height = n}
		},
		children: // -- 120815
		{
			get:function()
			{
				return this._children;
			}
		},
		addChild :function(instance)
		{
			instance._parent = this;
			this._children.push(instance);
			this._element.appendChild(instance.element);
			return instance;
		},
		removeChild :function(instance)
		{
			for(var i = this._children.length;i--;)
			{
				if(instance == this._children[i])
				{
					this._children.slice(i,1);
					this._element.removeChild(instance.element);
					instance._parent = null;
					return instance;
				}
			}
		}
	});


	// コンテナの背景要素 ---------------------------------------------
	//
	// TODO:グラデーション
	//
	smart.Background = smart.extend({
		init:function(element)
		{
			this.name      = "Background";
			this._color    = "";
			this._image    = "";
			this._repeat   = "";
			this._position = "";
			this._width    = "auto";
			this._height   = "auto";
			this._element  = element;
		},
		color: {
			get: function( ) {return this._color},
			set: function(s) {this._element.style.backgroundColor = (this._color = s)}
		},
		image: {
			get: function( ) {return this._image},
			set: function(s) {
				this._image = s;
				this._element.style.backgroundImage = s ? "url(" + (s) + ")" : "";
			}
		},
		width: {
			get: function( ) {return (typeof this._width == "number") ? this._width : this._element.offsetWidth}, // -- 120818
			set: function(n) {this._element.style.width = (typeof (this._width = n) == "number") ? (n + "px") : n}
		},
		height: {
			get: function( ) {return (typeof this._height == "number") ? this._height : this._element.offsetHeight}, // -- 120818
			set: function(n) {this._element.style.height = (typeof (this._height = n) == "number") ? (n + "px") : n}
		},
		repeat: {
			get: function( ) {return this._repeat},
			set: function(s) {this._element.style.backgroundRepeat = (this._repeat = s)}
		},
		position: {
			get: function( ) {return this._position},
			set: function(s) {this._element.style.backgroundPosition = (this._position = s)}
		}
	});



	// コンテナの境界線要素 ---------------------------------------------
	smart.Border = smart.extend({
		init:function(element)
		{
			this.name     = "Border";

			this._element  = element;
			this.color = this._color = ["#000"];
			this.style = this._style = ["solid"];
			this._width  = [0];
			this._radius = [0];
		},
		color: {
			get: function( ) {return this._color.length == 1 ? this._color[0] : this._color},
			set: function(s)
			{
				this._color = valueToArray(s);
				this._element.style.borderColor = arrayToCSS(this._color);
			}
		},
		width: {
			get: function( ) {return this._width.length == 1 ? this._width[0] : this._width},
			set: function(n)
			{
				this._width = valueToArray(n);
				this._element.style.borderWidth = arrayToCSS(this._width);
			}
		},
		style: {
			get: function( ) {return this._style.length == 1 ? this._style[0] : this._style},
			set: function(s)
			{
				this._style = valueToArray(s);
				this._element.style.borderStyle = arrayToCSS(this._style);
			}
		},
		radius: {
			get: function( ) {return this._radius.length == 1 ? this._radius[0] : this._radius},
			set: function(s)
			{
				this._radius = valueToArray(s);
				this._element.style[PREFIX + "BorderRadius"] = arrayToCSS(this._radius);
			}
		}
	});

	function valueToArray(s) // -- 120821
	{
		if(typeof s == "string")
		{
			s = s.split(" ");
		}
		else if(typeof s == "number")
		{
			s = [s];
		}
		for(var i=s.length-1;i>-1;i--)
		{
			if(s[i] === "") s.splace(i,0);
			else if(typeof s[i] == "string" && s[i].indexOf("px") > -1) s[i] = parseInt(s[i],10);
		}
		return s;
	}
	function arrayToCSS(a) // -- 120821
	{
		var ar = [];
		for(var i=0;i<a.length;i++)
		{
			ar.push( (typeof a[i] == "number") ? a[i] + "px" : a[i]);
		}
		return ar.join(" ");
	}





	// ステージ <div>をラップ ------------------------------------------
	smart.Stage = smart.extend(smart.Box,{
		init:function(targetElement,w_ ,h_)
		{
			smart.Box.apply(this);
			this.name = "Stage";

			if(typeof targetElement == "string") // -- 120816
			{
				targetElement = document.getElementById(targetElement);
			}

			this.bg.width  = w_ || parseInt(targetElement.offsetWidth ,10); // ピクセルで取得 -- 120816 -- 120821 -- 121013
			this.bg.height = h_ || parseInt(targetElement.offsetHeight,10);

			this._mouseX = 0;
			this._mouseY = 0;

			targetElement.innerHTML = "";
			targetElement.style.textAlign = "left"; // -- 120821
			targetElement.style.webkitTapHighlightColor = "rgba(0,0,0,0)"; // 枠を出さないように-- 130129
			targetElement.appendChild(this._element);

			this.id = SMART + "-stage" + smart.guid++;
			this.mask = true;

			var instance = this;
			var touch = smart.touchEnabled;
			this.bind(touch ? "touchmove" : "mousemove",function(e)
			{
				instance._mouseX = e.mouseX; // -- 120814
				instance._mouseY = e.mouseY;
			});
			this.bind(touch ? "touchstart" : "click",function(e)
			{
				instance._mouseX = e.mouseX; // -- 120815
				instance._mouseY = e.mouseY;
			});

			window.addEventListener("resize",function() // -- 120816 -- 120925
			{
				// TODO:スケールの変更に対応させるか？
				// 現状はスケール調整なし
				var w = parseInt(targetElement.offsetWidth ,10);
				var h = parseInt(targetElement.offsetHeight,10);

				instance.trigger("resize",{width:w,height:h});
			});
		},
		mouseX:{
			get :function( ) {return this._mouseX}
		},
		mouseY:{
			get :function( ) {return this._mouseY}
		},
		isStage:{
			get :function( ) {return true}
		},
		resize:function(fn)
		{
			this.bind("resize",fn);
		}
	});


	// テキストフィールド <div>をラップ ------------------------------------------
	//
	// TODO: padding の制御（配列で）
	//
	smart.Text = smart.extend(smart.View,{
		init:function(text_)
		{
			smart.View.apply(this);

			this.name = "Text";

			this._element = document.createElement("span"); //override
			this._element.style.position = "absolute";

			this._text       = text_ || "";
			this._color      = "";
			this._size       = 14;
			this._font       = smart.defaultFont;
			this._bold       = false;
			this._underline  = false;
			this._italic     = false;
			this._align      = "left";
			this._lineHeight = "1em";

			this._element.style.fontFamily = this._font;
			this._element.style.padding    = "3px";
			this._element.style.fontSize   = this._size + "px";
			this._element.style.lineHeight = this._lineHeight;

			this.id = SMART + "-text" + smart.guid++;
			this.text = this._text; // -- 120815


			this._transOrigin(); // -- 120925
		},
		text: {
			get: function( ) {return this._text},
			set: function(s)
			{
				this._element.innerHTML = (this._text = s);
			}
		},
		width: {
			get: function( ) {return this.bg.width}, // -- 120818
			set: function(n) {this.bg.width = n}
		},
		height: {
			get: function( ) {return this.bg.height},
			set: function(n) {this.bg.height = n}
		},
		color: {
			get: function( ) {return this._color},
			set: function(s) {this._element.style.color = (this._color = s)}
		},
		bold: {
			get: function( ) {return this._bold},
			set: function(b) {this._element.style.fontWeight = (this._bold = b) ? "bold" : "normal"}
		},
		underline:{
			get: function( ) {return this._underline},
			set: function(b) {this._element.style.textDecoration = (this._underline = b) ? "underline" : "none"}
		},
		italic:{
			get: function( ) {return this._italic},
			set: function(b) {this._element.style.fontStyle = (this._italic = b) ? "italic" : "normal"}
		},
		align: {
			get: function( ) {return this._align},
			set: function(s) {this._element.style.textAlign = (this._align = s)}
		},
		size :{
			get: function( ) {return this._size},
			set: function(n) {this._element.style.fontSize = (this._size = n) + "px"}
		},
		lineHeight: {
			get: function( ) {return this._lineHeight},
			set: function(n) {
				this._lineHeight = n;
				this._element.style.lineHeight = (typeof n == "number") ? n + "px" : n; // -- 120829
			}
		}
	});




	// キャンバスオブジェクト <canvas>をラップ ----------------------------------------------
	smart.Canvas = smart.extend(smart.View,{
		init:function(w_, h_ ,img_) // w,h 追加 -- 120531
		{
			smart.View.apply(this);

			this.name = "Canvas";

			if(typeof w_ == "object" && w_.nodeType == 1) // w,h,省略可に変更 -- 120911
			{
				img_ = w_;
				w_ = img_.width;
				h_ = img_.height;
			}

//			this._drawTasks = [];

			this._element = document.createElement("canvas"); //override
			this._element.style.position = "absolute";
			this._element.width  = this._width  = w_;
			this._element.height = this._height = h_;

			this._ctx = this._element.getContext('2d');

			this.id = SMART + "-canvas" + smart.guid++;

			this._transOrigin(); // -- 120531

			// 画像描画だけでなくなった場合、タイミングの調整が必要 -- 121013
			// ctx.save();
			// ctx.restore();
			if(smart.oldAndroid)
			{
				var rate = Math.sqrt(320 / w.screen.width);
       			this._ctx.scale(rate,rate);
			}
			if(img_)
			{
				this.draw(img_);

//				// Android4.0 drawしたものが変形されない不具合調整 -- 130130
				if(smart.isAndroid40)
				{
					var that = this;
					setTimeout(function()
					{
						that._transReset();
						setTimeout(function()
						{
							that._transOrigin();
							that._transform();
						},0);
					},0);
				}
			}
		},
		width: {
			get: function( ) {return this._width * this._scaleX},
			set: function(n) {this.scaleX = n / this._width} // エレメントに直接指定が必要？
		},
		height: {
			get: function( ) {return this._height * this._scaleY},
			set: function(n) {this.scaleY = n / this._height}
		},
		draw :function(img, sx, sy, sw, sh, dx, dy, dw, dh)
		{
			if(sx == undefined) sx = 0; // -- 130129
			if(sy == undefined) sy = 0;
			if(sw == undefined) sw = img.width;
			if(sh == undefined) sh = img.height;
			if(dx == undefined) dx = 0;
			if(dy == undefined) dy = 0;
			if(dw == undefined) dw = this._width;
			if(dh == undefined) dh = this._height;

			this._ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
		},
		clear :function()
		{
			this._ctx.clearRect(0,0,this._width+1,this._height+1); // Android対策 1px大きく -- 120924
		},
		context :{
			get:function(){return this._ctx}
		}
	});



	// スプライトシートをアニメさせる ----------------------------------------------
	smart.Animation = smart.extend(smart.Canvas,{
		init:function(w_ , h_ ,img_ ,fps_ ) // w h 追加 -- 120531
		{
			smart.Canvas.apply(this, [w_, h_ ]);

			this.name = "Animation";
			this.id = SMART + "-animation" + smart.guid++;
			this._source = null;
			this._cols = 1;
			this._total = 1;

			var instance = this;
			this._timeline = new smart.Timeline(fps_);
			this._timeline.enterframe(function(e)
			{
				if(instance._source)
				{
					instance._render(e.target.frame-1);
				}
				instance.trigger(e.type,e); // -- 120818
			});
			this._timeline.lastframe(function(e)
			{
				instance.trigger(e.type,e); // -- 120818
			});
			if(img_) this.source = img_;
		},
		fps:{
			set:function(n){
				var active = this._timeline.active;
				this._timeline.stop();
				this._timeline.fps = n;
				if(active) this._timeline.play();
			},
			get:function() {return this._timeline.fps}
		},
		source:{
			set:function(img_)
			{
				this._source = img_;
				this._index = 0;
				this._cols = Math.floor(this._source.width  / this._width);
				this._timeline.total = this._cols * Math.floor(this._source.height / this._height);

				// this._render(this.frame = 0);
			}
		},
		_render:function(index)
		{
			index = index % this._timeline.total;

			var u = (index % this._cols ) * this._width;
			var v = Math.floor(index / this._cols) * this._height;

			this.clear();
			// this.draw(this._source, 0 ,0 ,0 ,0 ,0 ,0 ,0 ,0); // -- 130130
			this.draw(this._source, u, v, this._width ,this._height ,0 ,0 ,this._width ,this._height);
		},
		play:function(fr_)
		{
			this._timeline.play(fr_);
		},
		frame:{
			get:function()  {return this._timeline.frame},
			set:function(n) {this._timeline.frame = n}
		},
		total:{
			get:function()  {return this._timeline.total} // -- 120816
		},
		stop:function(fr_)
		{
			this._timeline.stop(fr_);
		},
		toggle:function()
		{
			this._timeline.toggle();
		},
		repeat:{
			get:function()  {return this._timeline.repeat},
			set:function(b) {this._timeline.repeat = b}
		},
		enterframe:function(listener)
		{
			this.bind("enterframe",listener);
		},
		lastframe:function(listener)
		{
			this.bind("lastframe",listener);
		}
	});



	smart.Timeline = smart.extend(smart.Binder,{
		init:function(fps_)
		{
			smart.Binder.apply(this);

			this.name = "Timeline";
			this._fps      = fps_ || ( smart.timeline ? smart.timeline.fps : DEFAULT_FPS ); // -- 120829
			this._frame    = 0;
			this._total    = 0; // -- 120814
			this._timerID  = 0;
			this._repeat   = true; // -- 120814
		},
		fps:{
			get :function( ) {return this._fps},
			set:function(n){
				var active_ = this.active;
				this.stop();
				this._fps = n;
				if(active_) this.play();
			}
		},
		frame:{
			get:function()  {return this._frame},
			set:function(n)
			{
				if(this._frame != n) // -- 120819
				{
					this.trigger("enterframe",{frame:(this._frame = n),total:this._total});
				}
			}
		},
		total:{
			get:function()  {return this._total},
			set:function(n) {this._total = n}
		},
		repeat:{
			get:function()  {return this._repeat},
			set:function(b) {this._repeat = b}
		},
		play:function(fr_)
		{
			if(fr_ != undefined) this._frame = fr_;

			if(!this._timerID)
			{
				var instance = this;
				this._timerID = setInterval(function()
				{
					instance._frame++;
					instance.trigger("enterframe",{frame:instance._frame,total:instance._total});

					if(instance._total > 0 && instance._frame == instance._total) // -- 120814
					{
						instance.trigger("lastframe",{frame:instance._frame,total:instance._total}); // -- 120818
						if(instance._repeat)
						{
							instance._frame = 0;
						}
						else
						{
							instance.stop();
						}
					}
				},(1000 / this._fps));
			}
		},
		stop:function(fr_)
		{
			if(fr_ != undefined) this.frame = fr_;
			if(this._timerID)
			{
				clearInterval(this._timerID);
				this._timerID = null;
			}
		},
		active:{
			get:function(){ return Boolean(this._timerID); }
		},
		toggle:function()
		{
			if(this.active)
			{
				this.stop();
			}
			else
			{
				this.play();
			}
		},
		enterframe:function(listener)
		{
			this.bind("enterframe",listener);
		},
		lastframe:function(listener) // -- 120818
		{
			this.bind("lastframe",listener);
		}
	});



	// タイムテーブル (フレーム毎にパラメータを変更する仕組み) --------- 120908
	smart.Timetable = smart.extend(smart.Timeline,{
		init:function(fps_)
		{
			smart.Timeline.apply(this,[fps_]);
			this.name = "Timetable";
			this._table    = [];

			this.enterframe(function(e)
			{
				var table = this._table[e.frame -1];
				if(table)
				{
					for(var k in table)
					{
						var target;
						if(typeof table[k] == "function")
						{
							table[k].call(this);
						}
						else if(target = table[k][0]) // -- 120911
						{
							var values = table[k][1]; // -- 120911
							for(var l in values)
							{
								target[l] = values[l];
							}
						}
					}
				}
			});
		},
		frames:{
			set:function(arr){
				this._table = arr;
				this.total = arr.length;
				this.frame = 1;
			}
		}
	});





	// トゥイーン ---------------------------------------------------------
	smart.Tween = smart.extend(smart.Binder,{
		init:function()
		{
			smart.Binder.apply(this);

			this.name    = "Tween";
			this._list    = [];
			this._active  = false;
		},
		active:{
			get :function(){return this._active}
		},
		_toFrame:function(sec)
		{
			return Math.ceil(smart.timeline.fps * sec);
		},
		start :function(tar,params,ease,sec,delay,cb)
		{
			var tars = this._list;
			var newlist = [];

			if(!ease) ease = "linear";
			if(sec == undefined) sec = 0.5;
			if(delay == undefined) delay = 0;
			if(typeof cb != "function") cb = null;

			for(var prop in params) if (params.hasOwnProperty(prop))
			{
				var stt = tar[prop];
				var end = params[prop];
				var totalfrm = this._toFrame(sec);
				var delayfrm = this._toFrame(delay);

				newlist.push(new TweenObject(tar,prop,stt,end,ease,totalfrm,delayfrm));
			}
			if(cb) newlist[newlist.length-1].cb = cb;//コールバックは一回のみ

			for(var j = newlist.length;j--;)
			{
				var hit = 0;
				for(var i = tars.length;i--;) // ターゲット検索
				{
					if(newlist[j].tar == tars[i].tar && newlist[j].prop == tars[i].prop)
					{
						if(tars[i].cb) tars[i].cb(tars[i].tar); // ** コールバック実行 -- 111108
						tars[i] = newlist[j];
						hit = 1;
						break;
					}
				}
				if(!hit) tars.push(newlist[j]);
			}

			if(!this._active)
			{
				this._active = true;
				var instance = this;
				smart.timeline.bind("enterframe",function(e)
				{
					var tars = instance._list;
					var obj;

					for(var i = tars.length;i--;)
					{
						obj = tars[i];

						if(obj.delay > 0) obj.delay--;
						else
						{
							obj.tar[obj.prop] = obj.ease(++obj.time ,obj.stt ,obj.diff ,obj.total);
						}
						if(obj.time >= obj.total) // 終了処理
						{
							if(obj.tar[obj.param] != obj.end) obj.tar[obj.param] = obj.end;
							tars.splice(i,1);
							if(obj.cb) obj.cb(obj.tar);
							obj.cb = null;
							obj.tar = null;
							obj.ease = null;
							obj = null;
						}
					}
					instance.trigger("change"); // -- 120818
					if(tars.length == 0)
					{
						smart.timeline.unbind("enterframe",arguments.callee);
						instance._active = false;
						instance.trigger("complete"); // -- 120818
					}
				});
			}
		},
		stop :function(tar,prop)
		{
			var tars = this._list;
			var obj;
			for(var i = tars.length;i--;)
			{
				obj = tars[i];
				if(!tar || obj.tar == tar)
				{
					if(!prop || obj.prop == prop)
					{
						tars.splice(i,1);
						// obj.finalize();
					}
				}
			}
		}
	});
	var TweenObject = function(tar_,prop_,stt_,end_,ease_,tfrm_,dfrm_) // 単純化 -- 120831
	{
		this.tar    = tar_;
		this.prop   = prop_;
		this.stt    = stt_;
		this.diff   = end_ - stt_;
		this.end    = end_;
		this.ease   = easelist[ease_];
		this.time   = 0;
		this.total  = tfrm_;
		this.delay  = dfrm_;
		this.cb     = null;

		if(!this.ease) alert(SMART + ".ease" + PARAM_ERROR); // -- 120818
	}


	var easelist = {
		linear :function(t, b, c, d)
		{
			return c * t / d + b;
		},
		easeInSine :function(t, b, c, d)
		{
			return -c * Math.cos(t/d * (Math.PI/2)) + c + b;
		},
		easeOutSine :function(t, b, c, d)
		{
			return c * Math.sin(t/d * (Math.PI/2)) + b;
		},
		easeInOutSine :function(t, b, c, d)
		{
			return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b;
		},
		easeInQuad :function(t, b, c, d)
		{
			return c*(t /= d)*t+b;
		},
		easeOutQuad :function(t, b, c, d)
		{
			return -c*(t /= d)*(t-2)+b;
		},
		easeInOutQuad :function(t, b, c, d)
		{
			if ((t/=d/2) < 1) return c/2*t*t + b;
			return -c/2 * ((--t)*(t-2) - 1) + b;
		},
		easeInCubic :function(t, b, c, d)
		{
			return c*(t/=d)*t*t + b;
		},
		easeOutCubic :function(t, b, c, d)
		{
			return c*((t=t/d-1)*t*t + 1) + b;
		},
		easeInOutCubic :function(t, b, c, d)
		{
			if ((t/=d/2) < 1) return c/2*t*t*t + b;
			return c/2*((t-=2)*t*t + 2) + b;
		},
		easeInQuart :function(t, b, c, d)
		{
			return c*(t /= d)*t*t*t+b;
		},
		easeOutQuart :function(t, b, c, d)
		{
			return -c*((t=t/d-1)*t*t*t-1)+b;
		},
		easeInOutQuart :function(t, b, c, d)
		{
			if ((t/=d/2) < 1) return c/2*t*t*t*t + b;
			return -c/2 * ((t-=2)*t*t*t - 2) + b;
		},
		easeInExpo :function(t, b, c, d)
		{
			return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b - c * 0.001;
		},
		easeOutExpo :function(t, b, c, d)
		{
			return (t==d) ? b+c : c * 1.001 * (-Math.pow(2, -10 * t/d) + 1) + b;
		},
		easeInOutExpo :function(t, b, c, d)
		{
			if (t==0) return b;
			if (t==d) return b+c;
			if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b - c * 0.0005;
			return c/2 * 1.0005 * (-Math.pow(2, -10 * --t) + 2) + b;
		},
		easeInBack :function  (t, b, c, d)
		{
			var s = 1.70158;
			return c * (t /= d) * t * ((s + 1) * t - s) + b;
		},
		easeOutBack :function(t, b, c, d)
		{
			var s = 1.70158;
			return c * ((t = t / d - 1) * t * ((s + 1) * t + s) + 1) + b;
		},
		easeInOutBack :function  (t, b, c, d)
		{
			var s = 1.70158;
			if ((t /= d / 2) < 1) return c / 2 * (t * t * (((s *= (1.525)) + 1) * t - s)) + b;
			return c / 2 * ((t -= 2) * t * (((s *= (1.525)) + 1) * t + s) + 2) + b;
		},
		easeOutBounce :function(t, b, c, d)
		{
			if ((t /= d) < (1 / 2.75))
			{
				return c * (7.5625 * t * t) + b;
			}
			else if (t < (2 / 2.75))
			{
				return c * (7.5625 * (t -= (1.5 / 2.75)) * t + .75) + b;
			}
			else if (t < (2.5 / 2.75))
			{
				return c * (7.5625 * (t -= (2.25 / 2.75)) * t + .9375) + b;
			}
			else
			{
				return c * (7.5625 * (t -= (2.625 / 2.75)) * t + .984375) + b;
			}
		},
		easeOutElastic :function(t, b, c, d)
		{
			p = 1.08;
			if (t==0) return b;
			if ((t/=d)==1) return b+c;
			if (!p) p=d*0.3;
			var s,a;
			if (!a || a < Math.abs(c))
			{
				a=c;
				s=p/4;
			}
			else s = p/(2*Math.PI) * Math.asin (c/a);
			return (a*Math.pow(2.5,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b);
		}
	};
















	// コアオブジェクトをインスタンス化 ----------------------------
	smart.timeline = new smart.Timeline();
	smart.timeline.play();
	smart.tween = new smart.Tween();
	smart.wait = function(sec,fn)
	{
		var that = this;
		smart.tween.start({i:0},{i:1},"linear",sec,0,function()
		{
			fn.call(that);
		});
	}

	// Ready管理 ----------------------------------------------------
	var readylist = [];
	var isReady   = 0;
	w.addEventListener("load",function() // -- 120911
	{
		w.removeEventListener("load",arguments.callee);
		isReady = 1;
		for(var i = 0, len = readylist.length; i < len; i++)
		{
			readylist[i].call(this);
		}
	});
	var isEmpty = function(obj) // -- 120906
	{
		for(var k in obj) return false;
		return true;
	}
	var doReady = function(filelist,callback)
	{
		if(typeof filelist === "function")
		{
			filelist(smart,null);
		}
		else if(typeof callback === "function")
		{
			if(isEmpty(filelist)) // -- 120906
			{
				callback(smart,null);
			}
			else
			{
				var assets = new smart.Assets();
				assets.load(filelist,function(d)
				{
					callback(smart,d);
				});
			}
		}
		else
		{
			alert(SMART + ".ready" + PARAM_ERROR);
		}
	};
	smart.ready = function(filelist,callback)
	{
		if(isReady)
		{
			doReady(filelist,callback);
		}
		else
		{
			readylist.push(function()
			{
				doReady(filelist,callback);
			});
		}
	};

})(window);










