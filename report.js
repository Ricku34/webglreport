/*jslint browser: true, vars: true, white: true, nomen: true*/
/*jshint white: false, nomen: false*/
/*global $, _*/
$(function() {
    "use strict";

    function getExtensionUrl(extension) {
        //special cases
        if (extension === 'WEBKIT_lose_context') {
            extension = 'WEBGL_lose_context';
        }
        else if (extension === 'WEBKIT_WEBGL_compressed_textures') {
            extension = '';
        }
        extension = extension.replace(/^WEBKIT_/, '');
        extension = extension.replace(/^MOZ_/, '');
        extension = extension.replace(/_EXT_/, '_');

        return 'https://www.khronos.org/registry/webgl/extensions/' + extension;
    }

    function renderReport(header) {
        var tabsTemplate = _.template($('#webglVersionTabs').html());
        var headerTemplate = _.template(header);
        $('#output').html(tabsTemplate({
            report: report,
        }) + headerTemplate({
            report: report,
        }) + template({
            report: report,
            getExtensionUrl: getExtensionUrl,
            getWebGL2ExtensionUrl: getWebGL2ExtensionUrl
        }));
    }

    function describeRange(value) {
        return '[' + value[0] + ', ' + value[1] + ']';
    }

    function getMaxAnisotropy() {
        var e = gl.getExtension('EXT_texture_filter_anisotropic')
                || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic')
                || gl.getExtension('MOZ_EXT_texture_filter_anisotropic');

        if (e) {
            var max = gl.getParameter(e.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
            // See Canary bug: https://code.google.com/p/chromium/issues/detail?id=117450
            if (max === 0) {
                max = 2;
            }
            return max;
        }
        return 'n/a';
    }

    function formatPower(exponent, verbose) {
        if (verbose) {
            return '' + Math.pow(2, exponent);
        } else {
            return '2<sup>' + exponent + '</sup>';
        }
    }

    function getPrecisionDescription(precision, verbose) {
        var verbosePart = verbose ? ' bit mantissa' : '';
        return '[-' + formatPower(precision.rangeMin, verbose) + ', ' + formatPower(precision.rangeMax, verbose) + '] (' + precision.precision + verbosePart + ')'
    }

    function getBestFloatPrecision(shaderType) {
        var high = gl.getShaderPrecisionFormat(shaderType, gl.HIGH_FLOAT);
        var medium = gl.getShaderPrecisionFormat(shaderType, gl.MEDIUM_FLOAT);
        var low = gl.getShaderPrecisionFormat(shaderType, gl.LOW_FLOAT);

        var best = high;
        if (high.precision === 0) {
            best = medium;
        }

        return '<span title="High: ' + getPrecisionDescription(high, true) + '\n\nMedium: ' + getPrecisionDescription(medium, true) + '\n\nLow: ' + getPrecisionDescription(low, true) + '">' +
            getPrecisionDescription(best, false) + '</span>';
    }

    function getFloatIntPrecision(gl) {
        var high = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
        var s = (high.precision !== 0) ? 'highp/' : 'mediump/';

        high = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_INT);
        s += (high.rangeMax !== 0) ? 'highp' : 'lowp';

        return s;
    }

    function isPowerOfTwo(n) {
        return (n !== 0) && ((n & (n - 1)) === 0);
    }

    function getAngle(gl) {
        var lineWidthRange = describeRange(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE));

        // Heuristic: ANGLE is only on Windows, not in IE, and not in Edge, and does not implement line width greater than one.
        var angle = ((navigator.platform === 'Win32') || (navigator.platform === 'Win64')) &&
            (gl.getParameter(gl.RENDERER) !== 'Internet Explorer') &&
            (gl.getParameter(gl.RENDERER) !== 'Microsoft Edge') &&
            (lineWidthRange === describeRange([1,1]));

        if (angle) {
            // Heuristic: D3D11 backend does not appear to reserve uniforms like the D3D9 backend, e.g.,
            // D3D11 may have 1024 uniforms per stage, but D3D9 has 254 and 221.
            //
            // We could also test for WEBGL_draw_buffers, but many systems do not have it yet
            // due to driver bugs, etc.
            if (isPowerOfTwo(gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)) && isPowerOfTwo(gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS))) {
                return 'Yes, D3D11';
            } else {
                return 'Yes, D3D9';
            }
        }

        return 'No';
    }

    function getMajorPerformanceCaveat(contextName) {
        // Does context creation fail to do a major performance caveat?
        var canvas = $('<canvas />', { width : '1', height : '1' }).appendTo('body');
        var gl = canvas[0].getContext(contextName, { failIfMajorPerformanceCaveat : true });
        canvas.remove();

        if (!gl) {
            // Our original context creation passed.  This did not.
            return 'Yes';
    }

        if (typeof gl.getContextAttributes().failIfMajorPerformanceCaveat === 'undefined') {
            // If getContextAttributes() doesn't include the failIfMajorPerformanceCaveat
            // property, assume the browser doesn't implement it yet.
            return 'Not implemented';
        }

    return 'No';
    }

    function getDraftExtensionsInstructions() {
        if (navigator.userAgent.indexOf('Chrome') !== -1) {
            return 'To see draft extensions in Chrome, browse to about:flags, enable the "Enable WebGL Draft Extensions" option, and relaunch.';
        } else if (navigator.userAgent.indexOf('Firefox') !== -1) {
            return 'To see draft extensions in Firefox, browse to about:config and set webgl.enable-draft-extensions to true.';
        }

        return '';
    }

    function getMaxColorBuffers(gl) {
        var maxColorBuffers = 1;
        var ext = gl.getExtension("WEBGL_draw_buffers");
        if (ext != null) 
            maxColorBuffers = gl.getParameter(ext.MAX_DRAW_BUFFERS_WEBGL);
        
        return maxColorBuffers;
    }

    function getUnmaskedInfo(gl) {
        var unMaskedInfo = {
            renderer: '',
            vendor: ''
        };
        
        var dbgRenderInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (dbgRenderInfo != null) {
            unMaskedInfo.renderer = gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL);
            unMaskedInfo.vendor   = gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL);
        }
        
        return unMaskedInfo;
    }

    function showNull(v) {
        return (v === null) ? 'n/a' : v;
    }
    
    var webglToEsNames = {
        'getInternalformatParameter' : 'getInternalformativ',
        'uniform1ui' : 'uniform',
        'uniform2ui' : 'uniform',
        'uniform3ui' : 'uniform',
        'uniform4ui' : 'uniform',
        'uniform1uiv' : 'uniform',
        'uniform2uiv' : 'uniform',
        'uniform3uiv' : 'uniform',
        'uniform4uiv' : 'uniform',
        'uniformMatrix2x3fv' : 'uniform',
        'uniformMatrix3x2fv' : 'uniform',
        'uniformMatrix2x4fv' : 'uniform',
        'uniformMatrix4x2fv' : 'uniform',
        'uniformMatrix3x4fv' : 'uniform',
        'uniformMatrix4x3fv' : 'uniform',
        'vertexAttribI4i' : 'vertexAttrib',
        'vertexAttribI4iv' : 'vertexAttrib',
        'vertexAttribI4ui' : 'vertexAttrib',
        'vertexAttribI4uiv' : 'vertexAttrib',
        'vertexAttribIPointer' : 'vertexAttribPointer',
        'vertexAttribDivisor' : 'vertexAttribDivisor',
        'createQuery' : 'genQueries',
        'deleteQuery' : 'deleteQueries',
        'endQuery' : 'beginQuery',
        'getQuery' : 'getQueryiv',
        'getQueryParameter' : 'getQueryObjectuiv',
        'samplerParameteri' : 'samplerParameter',
        'samplerParameterf' : 'samplerParameter',
        'clearBufferiv' : 'clearBuffer',
        'clearBufferuiv' : 'clearBuffer',
        'clearBufferfv' : 'clearBuffer',
        'clearBufferfi' : 'clearBuffer',
        'createSampler' : 'genSamplers',
        'deleteSampler' : 'deleteSamplers',
        'getSyncParameter' : 'getSynciv',
        'createTransformFeedback' : 'genTransformFeedbacks',
        'deleteTransformFeedback' : 'deleteTransformFeedbacks',
        'endTransformFeedback' : 'beginTransformFeedback',
        'getIndexedParameter' : 'get',
        'getActiveUniforms' : 'getActiveUniformsiv',
        'getActiveUniformBlockParameter' : 'getActiveUniformBlockiv',
        'createVertexArray' : 'genVertexArrays',
        'deleteVertexArray' : 'deleteVertexArrays'
    };

    function getWebGL2ExtensionUrl(name) {
        if (name === 'getBufferSubData') {
            return 'http://www.opengl.org/sdk/docs/man/docbook4/xhtml/glGetBufferSubData.xml';
        }

        if (webglToEsNames[name]) {
            name = webglToEsNames[name];
        }

        var filename = 'gl' + name[0].toUpperCase() + name.substring(1) + '.xhtml';
        return 'http://www.khronos.org/opengles/sdk/docs/man3/html/' + filename;
    }

    function getWebGL2Status(gl, contextName) {
        var webgl2Names = [
            'copyBufferSubData',
            'getBufferSubData',
            'blitFramebuffer',
            'framebufferTextureLayer',
            'getInternalformatParameter',
            'invalidateFramebuffer',
            'invalidateSubFramebuffer',
            'readBuffer',
            'renderbufferStorageMultisample',
            'texStorage2D',
            'texStorage3D',
            'texImage3D',
            'texSubImage3D',
            'copyTexSubImage3D',
            'compressedTexImage3D',
            'compressedTexSubImage3D',
            'getFragDataLocation',
            'uniform1ui',
            'uniform2ui',
            'uniform3ui',
            'uniform4ui',
            'uniform1uiv',
            'uniform2uiv',
            'uniform3uiv',
            'uniform4uiv',
            'uniformMatrix2x3fv',
            'uniformMatrix3x2fv',
            'uniformMatrix2x4fv',
            'uniformMatrix4x2fv',
            'uniformMatrix3x4fv',
            'uniformMatrix4x3fv',
            'vertexAttribI4i',
            'vertexAttribI4iv',
            'vertexAttribI4ui',
            'vertexAttribI4uiv',
            'vertexAttribIPointer',
            'vertexAttribDivisor',
            'drawArraysInstanced',
            'drawElementsInstanced',
            'drawRangeElements',
            'drawBuffers',
            'clearBufferiv',
            'clearBufferuiv',
            'clearBufferfv',
            'clearBufferfi',
            'createQuery',
            'deleteQuery',
            'isQuery',
            'beginQuery',
            'endQuery',
            'getQuery',
            'getQueryParameter',
            'createSampler',
            'deleteSampler',
            'isSampler',
            'bindSampler',
            'samplerParameteri',
            'samplerParameterf',
            'getSamplerParameter',
            'fenceSync',
            'isSync',
            'deleteSync',
            'clientWaitSync',
            'waitSync',
            'getSyncParameter',
            'createTransformFeedback',
            'deleteTransformFeedback',
            'isTransformFeedback',
            'bindTransformFeedback',
            'beginTransformFeedback',
            'endTransformFeedback',
            'transformFeedbackVaryings',
            'getTransformFeedbackVarying',
            'pauseTransformFeedback',
            'resumeTransformFeedback',
            'bindBufferBase',
            'bindBufferRange',
            'getIndexedParameter',
            'getUniformIndices',
            'getActiveUniforms',
            'getUniformBlockIndex',
            'getActiveUniformBlockParameter',
            'getActiveUniformBlockName',
            'uniformBlockBinding',
            'createVertexArray',
            'deleteVertexArray',
            'isVertexArray',
            'bindVertexArray'
        ];

        var webgl2 = (contextName.indexOf('webgl2') !== -1);

        var functions = [];
        var totalImplemented = 0;
        var length = webgl2Names.length;

        if (webgl2) {
            for (var i = 0; i < length; ++i) {
                var name = webgl2Names[i];
                var className = 'extension';
                if (webgl2 && gl[name]) {
                    ++totalImplemented;
                } else {
                    className += ' unsupported';
                }
                functions.push({ name: name, className: className });
            }
        }

        return {
            status : webgl2 ? (totalImplemented + ' of ' + length + ' new functions implemented.') :
                'webgl2 and experimental-webgl2 contexts not available.',
            functions : functions
        };
    }

    function verifyFloatTextures(gl,webgl2) {
		
        var res = {
            floatTextures : false,
            halfFloatTextures : false
        };

        if (webgl2) {
			gl.oestexturefloatlinear     = gl.getExtension("OES_texture_float_linear");
			gl.colorbufferfloat          = gl.getExtension("EXT_color_buffer_float");
			gl.floatblend                = gl.getExtension("EXT_float_blend");
			
			res.floatTextures           = !!(gl.colorbufferfloat && gl.floatblend && gl.oestexturefloatlinear);
			res.halfFloatTextures       = !!(gl.colorbufferfloat && gl.floatblend && gl.oestexturefloatlinear);
		} else {
			gl.mrt                       = gl.getExtension("WEBGL_draw_buffers");
			gl.oestexturefloat           = gl.getExtension("OES_texture_float");
			gl.oestexturehalffloat       = gl.getExtension("OES_texture_half_float");
			gl.oestexturefloatlinear     = gl.getExtension("OES_texture_float_linear");
			gl.oestexturehalffloatlinear = gl.getExtension("OES_texture_half_float_linear");
			gl.floatblend                = gl.getExtension("EXT_float_blend");
			gl.colorbufferfloat          = gl.getExtension("WEBGL_color_buffer_float");
			gl.colorbufferhalffloat      = gl.getExtension("EXT_color_buffer_half_float");
			

			res.floatTextures = !!(gl.oestexturefloat && gl.oestexturefloatlinear && gl.colorbufferfloat && gl.floatblend);
			res.halfFloatTextures = !!(gl.oestexturehalffloat && gl.oestexturehalffloatlinear && (gl.colorbufferfloat || gl.colorbufferhalffloat) && gl.floatblend);
			if (gl.oestexturehalffloat) {
				gl.HALF_FLOAT = gl.oestexturehalffloat.HALF_FLOAT_OES;
			}
		}

        if(!res.floatTextures && !res.halfFloatTextures) {
            return res;
        }

        // We got the floating point textures extensions, be we must check
		// if we can fully use them, because of some devices lying about
		// their implementation (e.g. iPad / iPhone).
		// So we create a float texture, write in it through a framebuffer,
		// and check the result color.

        var screenTransfMatrix = mat4.create();
		mat4.ortho(-1, 1, -1, 1, 0.5, 1.5, screenTransfMatrix);
		var screenViewMatrix = mat4.create();
		mat4.lookAt([0,0,1], [0,0,0], [0,1,0], screenViewMatrix);

 
        // vertices
        var vertexArray = [-1.0,1.0,0.0, -1.0,-1.0,0.0, 1.0,-1.0,0.0, 1.0,1.0,0.0];
        var vertexBufferScreen = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferScreen);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexArray), gl.STATIC_DRAW);
        // tex coords
        var uvBufferScreen = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBufferScreen);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0.0,1.0, 0.0,0.0, 1.0,0.0, 1.0,1.0]), gl.STATIC_DRAW);
        // element array buffer
        var index = [0,1,2,0,2,3];
        var elementsBufferScreen = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementsBufferScreen);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(index), gl.STATIC_DRAW);

            

		var shaderProgram =gl.createProgram();
		var vertexShader =gl.createShader(gl.VERTEX_SHADER);
		var fragmentShader =gl.createShader(gl.FRAGMENT_SHADER);

		if (!webgl2) {
            
            gl.RGBA32F = gl.RGBA;
            gl.RGBA16F = gl.RGBA;
           
			gl.shaderSource(vertexShader, "precision highp float;\n" +
				"attribute vec3 aVertexPosition;\n"+
				"uniform mat4 uViewMatrix;\n"+
				"uniform mat4 uPMatrix;\n"+
				"void main() {\n"+
				"	gl_Position = uPMatrix * uViewMatrix * vec4(aVertexPosition, 1.0);\n"+
				"}\n"
				);
			gl.shaderSource(fragmentShader, "precision highp float;\n" +
				"uniform sampler2D uTexture;\n"+
				"void main() {\n"+
				"	gl_FragColor = vec4(10.0,0.0,0.0,1.0);\n"+
				"}\n"
				);
		} else {
			gl.shaderSource(vertexShader, "#version 300 es\n" +
				"precision highp float;\n" +
				"in vec3 aVertexPosition;\n"+
				"uniform mat4 uViewMatrix;\n"+
				"uniform mat4 uPMatrix;\n"+
				"void main() {\n"+
				"	gl_Position = uPMatrix * uViewMatrix * vec4(aVertexPosition, 1.0);\n"+
				"}\n"
				);
			gl.shaderSource(fragmentShader, "#version 300 es\n" +
				"precision highp float;\n" +
				"uniform sampler2D uTexture;\n"+
				"out vec4 _gl_FragColor;\n"+
				"void main() {\n"+
				"	_gl_FragColor = vec4(10.0,0.0,0.0,1.0);\n"+
				"}\n"
				);
		}
		gl.compileShader(vertexShader);
		gl.compileShader(fragmentShader);
		gl.attachShader(shaderProgram, vertexShader);
		gl.attachShader(shaderProgram, fragmentShader);
		gl.linkProgram(shaderProgram);
		gl.bindAttribLocation(shaderProgram, 0, "aVertexPosition");

		var fb =gl.createFramebuffer();

		var text =gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, text);
		gl.texImage2D(gl.TEXTURE_2D, 0,gl.RGBA32F, 1, 1, 0,gl.RGBA,gl.FLOAT, null);
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
		if (gl.getError() !==gl.NO_ERROR) {
			gl.bindTexture(gl.TEXTURE_2D, null);
			res.floatTextures = false;
		} else {
			gl.bindTexture(gl.TEXTURE_2D, null);

			if (!gl.getShaderParameter(vertexShader,gl.COMPILE_STATUS)) {
				res.floatTextures = false;
			}
			if (!gl.getShaderParameter(fragmentShader,gl.COMPILE_STATUS)) {
				res.floatTextures = false;
			}
			if (!gl.getProgramParameter(shaderProgram,gl.LINK_STATUS)) {
				res.floatTextures = false;
			}

			if (res.floatTextures) {
				gl.useProgram(shaderProgram);

				gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
				gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D, text, 0);
				gl.viewport(0,0,1,1);
				gl.scissor(0,0,1,1);

				gl.enable(gl.SCISSOR_TEST);
				gl.disable(gl.DEPTH_TEST);
				gl.enable(gl.BLEND);
				gl.clearColor(1,0,0,1);
				gl.clear(gl.COLOR_BUFFER_BIT);

				gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uViewMatrix"), false, screenViewMatrix);
				gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uPMatrix"), false, screenTransfMatrix);

				gl.enableVertexAttribArray(0);
				gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferScreen);
				gl.vertexAttribPointer(0, 3,gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementsBufferScreen);

				gl.drawElements(gl.TRIANGLES, 6,gl.UNSIGNED_SHORT, 0);
				if (gl.getError() !==gl.NO_ERROR) {
					res.floatTextures = false;
				}

				var pix = new Float32Array(4);
				gl.readPixels(0, 0, 1, 1,gl.RGBA,gl.FLOAT, pix);
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				if (pix[0] !== 10.0 || pix[1] !== 0 || pix[2] !== 0 || pix[3] !== 1) {
					res.floatTextures = false;
				}

				gl.enable(gl.DEPTH_TEST);
			}
		}
		//while (gl.getError() !==gl.NO_ERROR && ++cpt < 10);

		gl.bindTexture(gl.TEXTURE_2D, text);
		gl.texImage2D(gl.TEXTURE_2D, 0,gl.RGBA16F, 1, 1, 0,gl.RGBA,gl.HALF_FLOAT, null);
		if (gl.getError() !==gl.NO_ERROR) {
			gl.bindTexture(gl.TEXTURE_2D, null);
			res.halfFloatTextures = false;
		} else {
			gl.bindTexture(gl.TEXTURE_2D, null);

			if (!gl.getShaderParameter(vertexShader,gl.COMPILE_STATUS)) {
				res.halfFloatTextures = false;
			}
			if (!gl.getShaderParameter(fragmentShader,gl.COMPILE_STATUS)) {
				res.halfFloatTextures = false;
			}
			if (!gl.getProgramParameter(shaderProgram,gl.LINK_STATUS)) {
				res.halfFloatTextures = false;
			}

			if (res.halfFloatTextures) {
				gl.useProgram(shaderProgram);

				gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
				gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D, text, 0);
				gl.viewport(0,0,1,1);
				gl.scissor(0,0,1,1);

				gl.enable(gl.SCISSOR_TEST);
				gl.disable(gl.DEPTH_TEST);
				gl.enable(gl.BLEND);
				gl.clearColor(1,0,0,1);
				gl.clear(gl.COLOR_BUFFER_BIT);

				gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uViewMatrix"), false, screenViewMatrix);
				gl.uniformMatrix4fv(gl.getUniformLocation(shaderProgram, "uPMatrix"), false, screenTransfMatrix);

				gl.enableVertexAttribArray(0);
				gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferScreen);
				gl.vertexAttribPointer(0, 3,gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementsBufferScreen);

				gl.drawElements(gl.TRIANGLES, 6,gl.UNSIGNED_SHORT, 0);
				if (gl.getError() !==gl.NO_ERROR) {
					res.halfFloatTextures = false;
				}

				if (navigator.userAgent.indexOf("Firefox")>=0 ) {
					var pix = new Float32Array(4);
					gl.readPixels(0, 0, 1, 1,gl.RGBA,gl.FLOAT, pix);
					gl.bindFramebuffer(gl.FRAMEBUFFER, null);
					if (pix[0] !== 10.0 || pix[1] !== 0 || pix[2] !== 0 || pix[3] !== 1) {
						res.halfFloatTextures = false;
					}
				} else {
					var pix = new Uint16Array(4);
					gl.readPixels(0, 0, 1, 1,gl.RGBA,gl.HALF_FLOAT, pix);
					gl.bindFramebuffer(gl.FRAMEBUFFER, null);
					// 18688 == 0x4900 == 10.0 in IEEE 16 bits
					// 15360 == 0x3C00 == 1.0 in IEEE 16 bits
					if (pix[0] !== 18688 || pix[1] !== 0 || pix[2] !== 0 || pix[3] !== 15360) {
						res.halfFloatTextures = false;
					}
				}

				gl.enable(gl.DEPTH_TEST);
			}
		}



		gl.deleteProgram(shaderProgram);
		gl.deleteFramebuffer(fb);
		gl.deleteTexture(text);
		var cpt = 0;
		// Loop on getError to remove all kind of warning and errors
		// which could have happened during the test. We do so to prevent
		// these errors to interfere with the error detection during the main
		// rendering loop (where an error will likely reset completely the renderer)
		while (gl.getError() !==gl.NO_ERROR && ++cpt < 10);

		// alert(res.floatTextures + "-" +res.halfFloatTextures);
        return res;
	};

    
    [1,2].forEach(function(webglVersion) {
        var report = {
            platform: navigator.platform,
            userAgent: navigator.userAgent,
            webglVersion: webglVersion
        };

        if ((webglVersion === 2 && !window.WebGL2RenderingContext) ||
            (webglVersion === 1 && !window.WebGLRenderingContext)) {
            // The browser does not support WebGL
            return;
        }

        var canvas = $('<canvas />', { width: '1', height: '1' }).appendTo('body');
        var gl;
        var possibleNames = (webglVersion === 2) ? ['webgl2', 'experimental-webgl2'] : ['webgl', 'experimental-webgl'];
        var contextName = _.find(possibleNames, function (name) {
            gl = canvas[0].getContext(name, { stencil: true });
            return !!gl;
        });
        canvas.remove();

        if (!gl) {
            // The browser supports WebGL, but initialization failed
            return;
        }
        window.gl = gl;


        var webgl2Status = getWebGL2Status(gl, contextName);

        report = _.extend(report, {
            contextName: contextName,
            glVersion: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            vendor: gl.getParameter(gl.VENDOR),
            renderer: gl.getParameter(gl.RENDERER),
            unMaskedVendor: getUnmaskedInfo(gl).vendor,
            unMaskedRenderer: getUnmaskedInfo(gl).renderer,
            antialias:  gl.getContextAttributes().antialias ? 'Available' : 'Not available',
            angle: getAngle(gl),
            majorPerformanceCaveat: getMajorPerformanceCaveat(contextName),
            maxColorBuffers: getMaxColorBuffers(gl),
            redBits: gl.getParameter(gl.RED_BITS),
            greenBits: gl.getParameter(gl.GREEN_BITS),
            blueBits: gl.getParameter(gl.BLUE_BITS),
            alphaBits: gl.getParameter(gl.ALPHA_BITS),
            depthBits: gl.getParameter(gl.DEPTH_BITS),
            stencilBits: gl.getParameter(gl.STENCIL_BITS),
            maxRenderBufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
            maxCombinedTextureImageUnits: gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS),
            maxCubeMapTextureSize: gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE),
            maxFragmentUniformVectors: gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS),
            maxTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxVaryingVectors: gl.getParameter(gl.MAX_VARYING_VECTORS),
            maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
            maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
            maxVertexUniformVectors: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS),
            aliasedLineWidthRange: describeRange(gl.getParameter(gl.ALIASED_LINE_WIDTH_RANGE)),
            aliasedPointSizeRange: describeRange(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)),
            maxViewportDimensions: describeRange(gl.getParameter(gl.MAX_VIEWPORT_DIMS)),
            maxAnisotropy: getMaxAnisotropy(),
            vertexShaderBestPrecision: getBestFloatPrecision(gl.VERTEX_SHADER),
            fragmentShaderBestPrecision: getBestFloatPrecision(gl.FRAGMENT_SHADER),
            fragmentShaderFloatIntPrecision: getFloatIntPrecision(gl),

            extensions: gl.getSupportedExtensions(),
            draftExtensionsInstructions: getDraftExtensionsInstructions(),

            webgl2Status : webgl2Status.status,
            webgl2Functions : webgl2Status.functions
        });

        if (webglVersion > 1) {
            report = _.extend(report, {
                maxVertexUniformComponents: showNull(gl.getParameter(gl.MAX_VERTEX_UNIFORM_COMPONENTS)),
                maxVertexUniformBlocks: showNull(gl.getParameter(gl.MAX_VERTEX_UNIFORM_BLOCKS)),
                maxVertexOutputComponents: showNull(gl.getParameter(gl.MAX_VERTEX_OUTPUT_COMPONENTS)),
                maxVaryingComponents: showNull(gl.getParameter(gl.MAX_VARYING_COMPONENTS)),
                maxFragmentUniformComponents: showNull(gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_COMPONENTS)),
                maxFragmentUniformBlocks: showNull(gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_BLOCKS)),
                maxFragmentInputComponents: showNull(gl.getParameter(gl.MAX_FRAGMENT_INPUT_COMPONENTS)),
                minProgramTexelOffset: showNull(gl.getParameter(gl.MIN_PROGRAM_TEXEL_OFFSET)),
                maxProgramTexelOffset: showNull(gl.getParameter(gl.MAX_PROGRAM_TEXEL_OFFSET)),
                maxDrawBuffers: showNull(gl.getParameter(gl.MAX_DRAW_BUFFERS)),
                maxColorAttachments: showNull(gl.getParameter(gl.MAX_COLOR_ATTACHMENTS)),
                maxSamples: showNull(gl.getParameter(gl.MAX_SAMPLES)),
                max3dTextureSize: showNull(gl.getParameter(gl.MAX_3D_TEXTURE_SIZE)),
                maxArrayTextureLayers: showNull(gl.getParameter(gl.MAX_ARRAY_TEXTURE_LAYERS)),
                maxTextureLodBias: showNull(gl.getParameter(gl.MAX_TEXTURE_LOD_BIAS)),
                maxUniformBufferBindings: showNull(gl.getParameter(gl.MAX_UNIFORM_BUFFER_BINDINGS)),
                maxUniformBlockSize: showNull(gl.getParameter(gl.MAX_UNIFORM_BLOCK_SIZE)),
                uniformBufferOffsetAlignment: showNull(gl.getParameter(gl.UNIFORM_BUFFER_OFFSET_ALIGNMENT)),
                maxCombinedUniformBlocks: showNull(gl.getParameter(gl.MAX_COMBINED_UNIFORM_BLOCKS)),
                maxCombinedVertexUniformComponents: showNull(gl.getParameter(gl.MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS)),
                maxCombinedFragmentUniformComponents: showNull(gl.getParameter(gl.MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS)),
                maxTransformFeedbackInterleavedComponents: showNull(gl.getParameter(gl.MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS)),
                maxTransformFeedbackSeparateAttribs: showNull(gl.getParameter(gl.MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS)),
                maxTransformFeedbackSeparateComponents: showNull(gl.getParameter(gl.MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS)),
                maxElementIndex: showNull(gl.getParameter(gl.MAX_ELEMENT_INDEX)),
                maxServerWaitTimeout: showNull(gl.getParameter(gl.MAX_SERVER_WAIT_TIMEOUT))
            });
        }
       report = _.extend(report, verifyFloatTextures(gl,webglVersion==2));

       // console.log(report);
        var xhr = new XMLHttpRequest(); 
        xhr.open("POST", "/report", true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(report,null,'\t'));

    });

   
});
