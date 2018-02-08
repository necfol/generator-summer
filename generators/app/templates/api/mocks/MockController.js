'use strict';
var _ = rootRequire('node_modules/lodash-compat');
var cHelpers = rootRequire('node_modules/swagger-tools/lib/helpers');
var debug = rootRequire('node_modules/debug')('swagger-tools:middleware:router');
var fs = require('fs');
var mHelpers = rootRequire('node_modules/swagger-tools/middleware/helpers');
var path = require('path');
var util = require('util');
var getMockValue = rootRequire('mock/mock_data',true).getMockValue;

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
var mockResponse = function (req, res, next, handlerName) {
    var method = req.method.toLowerCase();
    var operation = req.swagger.operation;
    
    var sendResponse = function (err, response) {
        if (err) {
            debug('next with error: %j', err);
            return next(err);
        } else {
            debug('send mock response: %s', response);

            // Explicitly set the response status to 200 if not present (Issue #269)
            //if (_.isUndefined(req.statusCode)) {
                res.statusCode = 200;
            //}

            // Mock mode only supports JSON right now
            res.setHeader('Content-Type', 'application/json');


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

    if (_.isPlainObject(responseType) || mHelpers.isModelType(spec, responseType)) {
        if (req.swagger.swaggerVersion === '1.2') {
            spec.composeModel(apiDOrSO, responseType, function (err, result) {
                if (err) {
                    return sendResponse(undefined, err);
                } else {
                    // Should we handle this differently as undefined typically means the model doesn't exist
                    return sendResponse(undefined, _.isUndefined(result) ?
                        stubResponse :
                        JSON.stringify(getMockValue(req.swagger.swaggerVersion, result, mock_config)));
                }
            });
        } else {
            return sendResponse(undefined, JSON.stringify(getMockValue(req.swagger.swaggerVersion, responseType.schema || responseType, mock_config)));
        }
    } else {
        return sendResponse(undefined, getMockValue(req.swagger.swaggerVersion, responseType, mock_config));
    }
};
function mock(req, res, next) {
    return mockResponse(req, res, next, "mock");
}

module.exports = {
    mock: mock
};
