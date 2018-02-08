'use strict';
var _ = rootRequire('node_modules/lodash-compat');
var cHelpers = rootRequire('node_modules/swagger-tools/lib/helpers');
var debug = rootRequire('node_modules/debug')('swagger-tools:middleware:router');
var fs = require('fs');
var mHelpers = rootRequire('node_modules/swagger-tools/middleware/helpers');
var path = require('path');
var util = require('util');

var getMockValue = rootRequire('mock/mock_data',true).getMockValue;
var getHtmlTextPromise = rootRequire('mock/html_data',true).getHtmlTextPromise;

//覆盖全局mock配置参数
var mock_config = {
    /*
    maximum: 100,//最大数值
    minimum: 1, //最小数值
    decmax: 4,//小数点最大位数
    decmin: 1,//小数点最小位数
    maxLength: 50, //字符最大长度
    minLength: 4,//字符最小长度
    maxItems: 20,//数组最大长度
    minItems: 1//数组最小长度
    */
};
var save_data={};
var htmlResponse = function (req, res, next, handlerName) {
    var method = req.method.toLowerCase();
    var operation = req.swagger.operation;
    var sendResponse = function (err, response) {
        if (err) {
            return next(err);
        } else {

            // Explicitly set the response status to 200 if not present (Issue #269)
            //if (_.isUndefined(req.statusCode)) {
                res.statusCode = 200;
            //}

            // Mock mode only supports JSON right now
            res.setHeader('Content-Type', 'text/html');

            //新增保存机制
            var _resp;

            if (_.isUndefined(save_data[req.swagger.apiPath])) {
                save_data[req.swagger.apiPath] = response;
            }

            if(!!req.query && !_.isUndefined(req.query.mock) && req.query.mock.toLowerCase() == "save"){
                _resp = save_data[req.swagger.apiPath];
            } else {
                _resp = response;
                save_data[req.swagger.apiPath] = response;
            }
            res.end(_resp);
            res.resolve && res.resolve();
            return res;
        }
    };
    var spec = cHelpers.getSpec(req.swagger.swaggerVersion);
    var stubResponse = 'Stubbed response for ' + handlerName;
    var apiDOrSO;
    var responseType;

    switch (req.swagger.swaggerVersion) {
        case '1.2':
            apiDOrSO = req.swagger.apiDeclaration;
            responseType = operation.type;

            break;

        case '2.0':
            apiDOrSO = req.swagger.swaggerObject;

            if (method === 'post' && operation.responses['201']) {
                responseType = operation.responses['201'];

                res.statusCode = 201;
            } else if (method === 'delete' && operation.responses['204']) {
                responseType = operation.responses['204'];

                res.statusCode = 204;
            } else if (operation.responses['200']) {
                responseType = operation.responses['200'];
            } else if (operation.responses['default']) {
                responseType = operation.responses['default'];
            } else {
                responseType = 'void';
            }

            break;
    }

    var _mock_data;
    if (_.isPlainObject(responseType) || mHelpers.isModelType(spec, responseType)) {
        _mock_data = JSON.stringify(getMockValue(req.swagger.swaggerVersion, responseType.schema || responseType, mock_config));
        getHtmlTextPromise(req, req.swagger, responseType.schema || responseType, _mock_data).then(result => {
            sendResponse(undefined, result);
        }).catch(e => {
            sendResponse(e,undefined);
        });

    } else {
        _mock_data = getMockValue(req.swagger.swaggerVersion, responseType, mock_config);
        getHtmlTextPromise(req, req.swagger, responseType, _mock_data).then(result => {
            sendResponse(undefined, result);
        }).catch(e => {
            sendResponse(e,undefined);
        });

    }
    return true;
};
function html(req, res, next) {
    return htmlResponse(req, res, next, "html");
}

module.exports = {
    html: html
};
