getUrlEncodedKey = function(key, query) {
    if (!query)
        query = window.location.hash;    
    var re = new RegExp("[#|&]" + key + "=(.*?)&");
    var matches = re.exec(query + "&");
    if (!matches || matches.length < 2)
        return "";
    return decodeURIComponent(matches[1].replace("+", " "));
}

setUrlEncodedKey = function(key, value, query) {
   
    query = query || window.location.hash;
    var q = query + "&";
    var re = new RegExp("[?|&]" + key + "=.*?&");
    if (!re.test(q))
        q += key + "=" + encodeURI(value);
    else
        q = q.replace(re, "&" + key + "=" + encodeURIComponent(value) + "&");
    // q = q.trimStart("&").trimEnd("&");
    q = q.replace(/^&+/,'').replace(/&+$/,'');
    var queryString = q[0]=="#" ? q : q = "#" + q;
	if (query == window.location.hash) {
		window.location.hash = queryString;
	}
	return queryString;
}

var Dabblet = {
	version: '1.0.6',
	
	pages: {
		css: window['css-page'],
		html: window['html-page'], 
		result: result
	},
	
	title: function(code) {
		return (code && code.match(/^\/\*[\s\*\r\n]+(.+?)($|\*\/)/m) || [,''/* when a title is empty, this will be used */])[1];
	},
	
	wipe: function() {
		var question = 'Are you sure? You will lose ' +
						(gist.saved? '' : 'unsaved changes and ') +
						'your local draft.';
						
		if(confirm(question)) {
			localStorage.removeItem('dabblet.css');
			localStorage.removeItem('dabblet.html');
			window.onbeforeunload = null;
			return true;
		}
		
		return false;
	},
	
	get popup() {
		return popup.src;
	},
	
	set popup(url) {
		if(url) {
			popup.src = url;
			popup.parentNode.style.display = 'block';
		}
		else {
			popup.src = '';
			popup.parentNode.style.display = '';
		}
	},
	
	update: {
		CSS: function(code) {
			if(!result.contentWindow.style) {
				return;
			}
			
			setUrlEncodedKey('css', code);
			
			var style = result.contentWindow.style;
			
			if(style) {
				code = code || css.textContent;
				
				var title = Dabblet.title(code),
					raw = code.indexOf('{') > -1;
			
				result.contentWindow.document.title = title + ' ✿ CSS Hat preview (powered by dabblet)';
				
				if(!raw) {
					code = 'html{' + code + '}';
				}
				
				var prefixfree = !!Dabblet.settings.cached.prefixfree;
				
				style.textContent = prefixfree? StyleFix.fix(code, raw) : code;
			}
		},
		
		HTML: function(code) {
			setUrlEncodedKey('html', code);
			if(result.contentDocument.body) {
				result.contentDocument.body.innerHTML = code;
			}
		}
	},
	
	settings: {
		cached: {},
		
		handlers: {
			page: function(page) {
				var currentid = document.body.getAttribute('data-page'),
					current = window[currentid],
					input = window['page-' + page],
					pre = window[page] || css;
		
				if(currentid == page) {
					return;
				} 
					
				if(current) {
					var ss = current.selectionStart,
						se = current.selectionEnd;
					
					ss && current.setAttribute('data-ss', ss);
					se && current.setAttribute('data-se', se);
				}
		
				if(input && input.value != page || input.checked === false) {
					input.click();
				}

				document.body.setAttribute('data-page', page);
				
				self.Previewer && Previewer.hideAll();
				
				pre.focus && pre.focus();
				
				var ss = pre.getAttribute('data-ss'),
					se = pre.getAttribute('data-se');
					
				if((ss || se) && pre.setSelectionRange) {
					setTimeout(function(){
						pre.setSelectionRange(ss, se);
					}, 2);
				}
			},
			
			fontsize: function(size) {
				size = size || 100;
				
				$$('.editor.page').forEach(function(editor) {
					editor.style.fontSize = size + '%';
				});
			},
			
			prefixfree: function(enabled) {
				Dabblet.settings.cached.prefixfree = enabled;
				
				if(result.contentWindow.style) {
					Dabblet.update.CSS();
				}
			}
		},
		
		current: function(name, scope) {
			var settings = {};
			
			var selector = 'input[data-scope' +
							(scope? '="' + scope + '"' : '') + ']' +
							(name? '[name="' + name + '"]' : '');
			
			$$(selector).forEach(function(input){
				var name = input.name,
				    isToggle = input.type === 'radio' || input.type === 'checkbox';
				
				if(!(name in settings)) {
					// Assign default value
					settings[name] = input.hasAttribute('checked') || !isToggle? input.value : '';
				}
				
				if(isToggle) {
					if(input.checked) {
						settings[name] = input.value; 
					}
					else if(input.type === 'checkbox') {
						settings[name] = ''; 
					}
				}
				else {
					settings[name] = input.value;
				}
			});
			
			return name? settings[name] : settings;
		},
		
		apply: function() {
			var settings;
			
			if(arguments.length === 0) {
				settings = this.current();
			}
			else if(arguments.length === 1) {
				settings = arguments[0];
			}
			else {
				settings = {};
				settings[arguments[0]] = arguments[1];
			}
			
			for(var name in settings) {
				this.applyOne(name, settings[name]);
			}
			
			// Set body classes for each setting
			$$('input[data-scope]').forEach(function(input){
				var name = input.name;
				
				if (input.type === 'radio') {
					(input.onclick = function(evt){
						if(this.checked) {
							Dabblet.settings.applyOne(name, this.value);
						}
					}).call(input);
				}
				else if (input.type === 'checkbox') {
					(input.onclick = function(evt){
						Dabblet.settings.applyOne(name, this.checked? this.value : '');
					}).call(input);
				}
				else {
					(input['oninput' in input? 'oninput' : 'onclick'] = function(evt){
						Dabblet.settings.applyOne(name, this.value);
					}).call(input);
				}
			});
			
			// Update cached settings
			this.cached = this.current();
		},
		
		applyOne: function(name, value) {			
			var current = this.current(name),
				controls = document.getElementsByName(name);

			for(var i=0; i<controls.length; i++) {
				var control = controls[i];
				
				if(control.type === 'checkbox' || control.type === 'radio') {
					control.checked = control.value == value;
				}
				else {
					control.value = value;
				}
			}
			
			if(name in this.handlers) {
				this.handlers[name](value);
			}
			else {
				var attribute = 'data-' + name;
				
				if(value === '') {
					document.body.removeAttribute(attribute);
				}
				else {
					document.body.setAttribute(attribute, value);
				}
			}
			
			// Super-dirty fix for Safari bug. See issue #7. Gonna wash hands now, kthxbai
			if(PrefixFree.Prefix === 'Webkit') {
				document.body.style.WebkitAnimation = 'bugfix infinite 1s';
				setTimeout(function(){
					document.body.style.WebkitAnimation = '';
				},1);
			}
			
			// Update localStorage if not in gist
			if(!gist.id) {
				var stored = localStorage.settings? JSON.parse(localStorage.settings) : {};
				
				if(!(name in stored) || stored[name] != value) {
					stored[name] = value;
					localStorage.settings = JSON.stringify(stored);
				}
			}
			
			// Update cached settings
			this.cached[name] = value;
		}
	}
};

window.ACCESS_TOKEN = localStorage['access_token'];

currentuser.onclick = function(){
	if(!this.hasAttribute('href')) {
		gist.oauth[0]();
	}
}

window.onbeforeunload = function(){
	if(!gist.saved) {
		html.onkeyup();
		css.onkeyup();
		
		css.onblur();
		html.onblur();
		
		//return 'You have unsaved changes.';
	}
};

result.onload = function(){
	if(!result.loaded 
		&& !result.contentWindow.document.body) {
		setTimeout(arguments.callee, 100);
		return;
	}
	
	result.loaded = true;
	
	if(!result.contentDocument) {
		result.contentDocument = result.contentWindow.document;
	}
	
	result.contentWindow.style = $('style', result.contentDocument);
	
	result.contentDocument.onkeydown = document.onkeydown;
	
	html.onkeyup();
	css.onkeyup();
};

// Fix Chrome bug
setTimeout(function(){
	if(!result.loaded) {
		result.onload();
	}
}, 500);

document.addEventListener('DOMContentLoaded', function() {
	function getUrlParameterByName(name)
	{
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regexS = "[\\?&]" + name + "=([^&#]*)";
		var regex = new RegExp(regexS);
		var results = regex.exec(window.location.search);
		if(results == null)
			return "";
		else
			return decodeURIComponent(results[1].replace(/\+/g, " "));
	}
	
	if(ACCESS_TOKEN) {
		gist.getUser();
	}
	
	var a = $('h1 > a');
	
	if(parent !== window) {
		document.body.setAttribute('data-embedded', '')
		
		a.href = '';
		a.target = '_blank';
		a.title = 'Go to full page dabblet';
	}
	else {
		a.onclick = Dabblet.wipe;
		a.title = 'New dabblet';
	}
	
	var path = location.pathname.slice(1);
	
	if(path) {
		// Viewing a gist?
		if(gist.id = (path.match(/\bgist\/([\da-f]+)/i) || [])[1]) {
			if('withCredentials' in new XMLHttpRequest) {
				gist.rev = (path.match(/\bgist\/[\da-f]+\/([\da-f]+)/i) || [])[1];
				css.textContent = html.textContent = '';
				gist.load();
			}
			else {
				// CORS not supported, redirect to full page result (see #162)
				location.href = location.href.replace('://', '://result.');
			}
		}
	}
	
	if(!gist.id) {	
		var paramCss, paramHtml;

		if ((paramCss = getUrlEncodedKey('css')) != '') {
			css.textContent = paramCss;
		} else if(typeof localStorage['dabblet.css'] === 'string') {
			css.textContent = localStorage['dabblet.css'];
		}
		
		if ((paramHtml = getUrlEncodedKey('html')) != '') {
			html.textContent = paramHtml;
		} else if(typeof localStorage['dabblet.html'] === 'string') {
			html.textContent = localStorage['dabblet.html'];
		}
		
		if(typeof localStorage.settings === 'string') {
			Dabblet.settings.apply(JSON.parse(localStorage.settings));
		}
		else {
			Dabblet.settings.apply();
		}
	}
});

$$('.editor.page > pre').forEach(function(pre){
	new Editor(pre);
	
	$u.event.bind(pre.parentNode, 'click', function(evt) {
		$('pre', this).focus();
		
		evt.stopPropagation();
	});
});

// Note: Has to be keydown to be able to cancel the event
document.onkeydown = function(evt) {
	var code = evt.keyCode,
		character = String.fromCharCode(code),
		cmdOrCtrl = evt.metaKey || evt.ctrlKey;
	
	if(cmdOrCtrl && !evt.altKey) {
		switch(character) {
			case 'S':
				gist.save();
				return false;
			case 'N':
				if(Dabblet.wipe()) {
					location.pathname = '/';	
				}
				return false;
			case '1':
				var page = 'css';
				break;
			case '2':
				var page = 'html';
				break;
			case '3':
				var page = 'all';
				break;
			case '4':
				var page = 'result';
				break;
		}
		
		var currentPage = Dabblet.settings.current('page');
		
		if(evt.shiftKey) {
			if(code === 219) {
				// Go to previous tab
				var page = ({
					'html': 'css',
					'all': 'html',
					'result': 'all'
				})[currentPage];
			}
			else if (character === ']' || code === 221) {
				// Go to next tab
				var page = ({
					'css': 'html',
					'html': 'all',
					'all': 'result'
				})[currentPage];
			}
		}
		
		if(page) {
			if(currentPage !== page) {
				Dabblet.settings.applyOne('page', page);
				
				evt.stopPropagation();
				return false;
			}
		}
		
		if([48, 187, 189].indexOf(code) > -1 // 0, +, -
			&& /^pre$/i.test(document.activeElement.nodeName)) { 
			var fontSize;

			if(code === 48) {
				fontSize = 100;
			}
			else {
				fontSize = (code == 187? 10 : -10) + +Dabblet.settings.current('fontsize');
			}

			Dabblet.settings.applyOne('fontsize', fontSize);
			
			return false;
		}
	}
	
	if(code == 27) { // Esc 
		var active = document.activeElement;
		
		if (active && active != document.body && active.blur) { 
			active.blur();
			return false;
		}
		else if (location.hash) {
			location.hash = '';
		}
	}
	
	if(code == 112) { // F1 
		location.hash = '#help';
		return false;
	}
};

// If only :focus and :checked bubbled...
(function() {
	function ancestorClass(action, className, element) {
		var ancestor = element;
		
		do {
			ancestor = ancestor.parentNode;
			ancestor.classList[action](className)
		} while(ancestor && ancestor != document.body);
	}
	
	$u.event.bind('header a, header input, header button, header [tabindex="0"], pre', {
		focus: function(){
			ancestorClass('add', 'focus', this);
		},
		
		blur: function() {
			ancestorClass('remove', 'focus', this);
		}
	});
})();

// Supports sliders?
(function(){
	var slider = $u.element.create('input', {
		prop: {
			type: 'range'
		}
	});

	if(slider.type === 'range') {
		document.documentElement.classList.add('supports-range');
	}
})();