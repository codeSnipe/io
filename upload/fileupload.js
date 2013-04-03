/*
 * 	FileUpload.init(input, {
 *		// url: '/web/servlet/FileUpload',
 *		url: '/upload',
 *		fileType: /(?:png|jpg|jpeg|gif)/,
 * 		credential: 跨域请求时是否带证书(默认false，不带http认证信息如cookie) 
 *		params: {
 *			name: 'aaa',
 *			age: 33
 *		},
 *		success: function() {
 *			console.log('success')
 *		},
 *		progress: function(position, totalSize) {
 *			console.log('progress' + position)
 *			console.log('progress' + totalSize)
 *			//pp.width =  position+'%';
 *		},
 *		failure: function() {
 *			console.log('error')
 *		}
 *	}) 
 *
 */
FileUpload = function() {

var guid = 0
function noop() {}

var exports = {
	init: function(input, options) {
		var me = this;
		if (!input || input.nodeName !== 'INPUT') {
			return
		}
		options || (options = {});
		// 上传按钮
		this.input = input;
		// 上传url
		this.url = options.url;
		// 请求参数，JS对象类型
		this.params = options.params;
		// 允许的单个文件大小 10M
		this.maximize = options.maximize || 10 * 1024 * 1024;
		// 允许一次上传的文件数量
		this.maximum  = options.maximum || 5;
		// 允许上传的文件类型 正则
		this.fileType = options.fileType || /\S/;
		// 跨域带证书
		this.credential = options.credential;
		// 进度函数
		this.progress = options.progress || noop;
		// 成功函数
		this.success  = options.success || noop;
		// 失败函数
		this.failure  = options.failure || noop;

		this.checkMaximize = options.checkMaximize || noop;

		this.checkMaximun  = options.checkMaximun || noop;

		this.checkFileType = options.checkFileType || noop;
		
		this.fileQueued = options.fileQueued || noop;

		input.onchange = function(e) {
			var i = 0,
				files = this.files;
				
			if (files.length > me.maximum) {
				me.checkMaximun()
				return
			}
			var filter = me.preprocess(files)
			if (filter.sizes.length > 0) {
				me.checkMaximize(filter.sizes)
				return
			}
			if (filter.types.length > 0) {
				me.checkFileType(filter.types)
				return
			}
			
			// 不要一个循环一次全部提交，间隔100ms，性能考虑，一次提交N多请求容易alort
			var timer = setInterval(sched, 100);
			function sched() {
				var file = files[i],
					xhr = new XMLHttpRequest();
					
				if (!file) {
					clearInterval(timer);
					input.value = '';
				} else {
					file.id = guid++;
					me.fileQueued(file, xhr);
					me.request(file, xhr);
				}
				i++;
			}
		}
		return this
	},
	preprocess: function(files) {
		var file,
			a1 = [],
			a2 = [],
			len = files.length
		for (var i=0; i<len; i++) {
			file = files[i]
			if (file.size > this.maximize) {
				a1.push(file)
			}
			if (!this.fileType.test(file.type)) {
				a2.push(file)
			}
		}
		return {sizes: a1, types: a2}
	},
	request: function(file, xhr) {
		var me = this, 
			params = me.params;
			
		xhr.upload.onprogress = function(e) {
			if (e.lengthComputable) {
				me.progress(file, e.loaded, e.total)
			}
		}
		xhr.addEventListener('readystatechange', function() {
			if (xhr.readyState === 4) {
				if (xhr.status === 200) {
					var data = JSON.parse(xhr.responseText)
					me.success(file, data)
				} else {
					me.failure()
				}
			}
		}, false)
		xhr.addEventListener('error', function(e) {
			me.failure()
		}, false)
		
		if (this.credential) {
			xhr.withCredentials = true
		}
		xhr.open('POST', me.url, true)
		
		var key, data = new FormData()
		data.append('file', file)
		// params
		for (key in params) {
			data.append(key, params[key])
		}
		xhr.send(data)
	}
}

return exports
};