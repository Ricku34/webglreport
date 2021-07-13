/*jslint browser: true, vars: true, white: true, nomen: true*/
/*jshint white: false, nomen: false*/
/*global $, _*/
$(function() {
    "use strict";

    var template = _.template($('#reportTemplate').html());
    
    if(window.location.hash.length) {
        var id = window.location.hash.substr(1);
        fetch('/data/'+id+'.json')
        .then(response => {
            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }
            return response.json();
        })
        .then(report => {
            var webglVersion = report.webglVersion;  
    

            if (webglVersion === 2) {
                $('body').addClass('webgl2');
            }

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

            
    
            if (window.externalHost) {
                // Tab is running with Chrome Frame
                renderReport($('#webglSupportedChromeFrameTemplate').html());
            }
            else {
                renderReport($('#webglSupportedTemplate').html());
            }

            var pipeline = $('.pipeline')
            var background = $('.background')[0];

            background.width = pipeline.width();
            background.height = pipeline.height();

            var hasVertexTextureUnits = report.maxTextureImageUnits > 0;

            var context = background.getContext('2d');
            context.shadowOffsetX = 3;
            context.shadowOffsetY = 3;
            context.shadowBlur = 7;
            context.shadowColor = 'rgba(0, 0, 0, 0.5)';
            context.strokeStyle = 'black';

            var boxPadding = 4;

            function drawBox(element, fill) {
                var pos = element.position();
                var x = pos.left - boxPadding;
                var y = pos.top - boxPadding;
                var width = element.outerWidth() + (boxPadding * 2);
                var height = element.outerHeight() + (boxPadding * 2);
                var radius = 10;

                context.fillStyle = fill;
                context.lineWidth = 2;
                context.beginPath();
                context.moveTo(x + radius, y);
                context.lineTo(x + width - radius, y);
                context.quadraticCurveTo(x + width, y, x + width, y + radius);
                context.lineTo(x + width, y + height - radius);
                context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                context.lineTo(x + radius, y + height);
                context.quadraticCurveTo(x, y + height, x, y + height - radius);
                context.lineTo(x, y + radius);
                context.quadraticCurveTo(x, y, x + radius, y);
                context.closePath();
                context.stroke();
                context.fill();

                return { x: x, y: y, width: width, height: height };
            }

            function drawLeftHead(x, y) {
                context.beginPath();
                context.moveTo(x + 5, y + 15);
                context.lineTo(x - 10, y);
                context.lineTo(x + 5, y - 15);
                context.quadraticCurveTo(x, y, x + 5, y + 15);
                context.fill();
            }

            function drawRightHead(x, y) {
                context.beginPath();
                context.moveTo(x - 5, y + 15);
                context.lineTo(x + 10, y);
                context.lineTo(x - 5, y - 15);
                context.quadraticCurveTo(x, y, x - 5, y + 15);
                context.fill();
            }

            function drawDownHead(x, y) {
                context.beginPath();
                context.moveTo(x + 15, y - 5);
                context.lineTo(x, y + 10);
                context.lineTo(x - 15, y - 5);
                context.quadraticCurveTo(x, y, x + 15, y - 5);
                context.fill();
            }

            function drawDownArrow(topBox, bottomBox) {
                context.beginPath();

                var arrowTopX = topBox.x + topBox.width / 2;
                var arrowTopY = topBox.y + topBox.height;
                var arrowBottomX = bottomBox.x + bottomBox.width / 2;
                var arrowBottomY = bottomBox.y - 15;
                context.moveTo(arrowTopX, arrowTopY);
                context.lineTo(arrowBottomX, arrowBottomY);
                context.stroke();

                drawDownHead(arrowBottomX, arrowBottomY);
            }

            function drawRightArrow(leftBox, rightBox, factor) {
                context.beginPath();

                var arrowLeftX = leftBox.x + leftBox.width;
                var arrowRightX = rightBox.x - 15;
                var arrowRightY = rightBox.y + rightBox.height * factor;
                context.moveTo(arrowLeftX, arrowRightY);
                context.lineTo(arrowRightX, arrowRightY);
                context.stroke();

                drawRightHead(arrowRightX, arrowRightY);
            }

            var webgl2color = (webglVersion > 1) ? '#02AFCF' : '#aaa';

            var vertexShaderBox = drawBox($('.vertexShader'), '#ff6700');
            var transformFeedbackBox = drawBox($('.transformFeedback'), webgl2color);
            var rasterizerBox = drawBox($('.rasterizer'), '#3130cb');
            var fragmentShaderBox = drawBox($('.fragmentShader'), '#ff6700');
            var framebufferBox = drawBox($('.framebuffer'), '#7c177e');
            var texturesBox = drawBox($('.textures'), '#3130cb');
            var uniformBuffersBox = drawBox($('.uniformBuffers'), webgl2color);

            var arrowRightX = texturesBox.x;
            var arrowRightY = texturesBox.y + (texturesBox.height / 2);
            var arrowMidX = (texturesBox.x + vertexShaderBox.x + vertexShaderBox.width) / 2;
            var arrowMidY = arrowRightY;
            var arrowTopMidY = texturesBox.y - 15;
            var arrowBottomMidY = fragmentShaderBox.y + (fragmentShaderBox.height * 0.55);
            var arrowTopLeftX = vertexShaderBox.x + vertexShaderBox.width + 15;
            var arrowTopLeftY = arrowTopMidY;
            var arrowBottomLeftX = fragmentShaderBox.x + fragmentShaderBox.width + 15;
            var arrowBottomLeftY = arrowBottomMidY;

            if (hasVertexTextureUnits) {
                context.fillStyle = context.strokeStyle = 'black';
                context.lineWidth = 10;
            } else {
                context.fillStyle = context.strokeStyle = '#FFF';
                context.shadowColor = '#000';
                context.shadowOffsetX = context.shadowOffsetY = 0;
                context.lineWidth = 8;
            }

            context.beginPath();
            context.moveTo(arrowMidX, arrowMidY);
            context.lineTo(arrowMidX, arrowTopMidY);
            if (hasVertexTextureUnits) {
                context.lineTo(arrowTopLeftX, arrowTopMidY);
                context.stroke();
                drawLeftHead(arrowTopLeftX, arrowTopLeftY);
            } else {
                context.stroke();
                context.shadowColor = '#000';
                context.font = 'bold 14pt arial, Sans-Serif';
                context.fillText('No vertex textures available.', arrowMidX - 8, arrowTopMidY - 8);
            }

            context.lineWidth = 10;
            context.fillStyle = context.strokeStyle = 'black';
            context.shadowColor = 'rgba(0, 0, 0, 0.5)';
            context.shadowOffsetX = context.shadowOffsetY = 3;
            context.beginPath();

            context.moveTo(arrowRightX, arrowRightY);

            context.lineTo(arrowMidX - context.lineWidth * 0.5, arrowMidY);
            context.moveTo(arrowMidX, arrowMidY);
            context.lineTo(arrowMidX, arrowBottomMidY);
            context.lineTo(arrowBottomLeftX, arrowBottomLeftY);

            var uniformBuffersMidY = uniformBuffersBox.y + uniformBuffersBox.height / 2;
            context.moveTo(arrowMidX, uniformBuffersMidY);
            context.lineTo(arrowRightX, uniformBuffersMidY);

            context.stroke();

            drawLeftHead(arrowBottomLeftX, arrowBottomLeftY);

            drawRightArrow(vertexShaderBox, transformFeedbackBox, 0.5);
            drawDownArrow(vertexShaderBox, rasterizerBox);
            drawDownArrow(rasterizerBox, fragmentShaderBox);
            if (webglVersion === 1) {
                drawDownArrow(fragmentShaderBox, framebufferBox);
            } else {
                drawRightArrow(fragmentShaderBox, framebufferBox, 0.7);
            }
        })
    }
});
